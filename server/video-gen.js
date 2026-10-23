// ============================================================
// Vercel serverless: video generation from a prompt for the video studio in the content engine.
// POST { op, ... } from a signed in admin. Jobs are asynchronous because a video takes minutes:
//   op=start  { prompt, seconds (4|8|12), size ('720x1280' | '1280x720'), image? (data URL, first frame) } -> { id, status }
//   op=status { id } -> { status: queued | in_progress | completed | failed, progress, error }
//   op=finish { id } -> downloads the finished file from the provider, stores it in our media bucket, returns { url, bytes }
//   op=content { id } -> streams the finished file (fallback when the bucket cannot be written from the server)
//
// Provider: VIDEO_PROVIDER = openai (default, model OPENAI_VIDEO_MODEL or sora-2, uses OPENAI_API_KEY)
//                        or veo (Gemini API, model VEO_MODEL or veo-3.0-generate-001, uses GEMINI_API_KEY).
// Storage: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY write to the engine-media bucket. Keys live only in Vercel.
// ============================================================

async function adminUser(req) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || !SUPABASE_URL || !KEY) return null
  const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json().catch(() => null)
  return u && u.id ? u : null
}

// 8 new videos per hour per admin; status polls are not counted
const _rl = new Map()
function limited(key, max = 8, windowMs = 3_600_000) {
  const now = Date.now()
  const e = _rl.get(key) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(key, e)
  if (_rl.size > 1_000) _rl.clear()
  return e.n > max
}

const fail = (res, status, code, error, extra) => res.status(status).json(Object.assign({ error, code }, extra || {}))
const PROVIDER = (process.env.VIDEO_PROVIDER || 'openai').toLowerCase()
const SIZES = new Set(['720x1280', '1280x720'])
const SECS = new Set(['4', '8', '12'])

function providerKey() {
  if (PROVIDER === 'veo') return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || ''
  return process.env.OPENAI_API_KEY || ''
}
export function configured() { return !!providerKey() }
export function providerInfo() {
  return PROVIDER === 'veo'
    ? { provider: 'veo', model: process.env.VEO_MODEL || 'veo-3.0-generate-001', key: 'GEMINI_API_KEY', configured: configured() }
    : { provider: 'openai', model: process.env.OPENAI_VIDEO_MODEL || 'sora-2', key: 'OPENAI_API_KEY', configured: configured() }
}

// ---- OpenAI (Sora)
async function oaStart(KEY, b) {
  const model = process.env.OPENAI_VIDEO_MODEL || 'sora-2'
  let r
  if (b.image) {
    const m = String(b.image).match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
    if (!m) throw Object.assign(new Error('התמונה לפריים הראשון לא תקינה'), { code: 'bad_image', status: 400 })
    const fd = new FormData()
    fd.append('model', model); fd.append('prompt', b.prompt); fd.append('size', b.size); fd.append('seconds', b.seconds)
    fd.append('input_reference', new Blob([Buffer.from(m[2], 'base64')], { type: m[1] }), 'first.' + (m[1].split('/')[1] === 'jpeg' ? 'jpg' : m[1].split('/')[1]))
    r = await fetch('https://api.openai.com/v1/videos', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd })
  } else {
    r = await fetch('https://api.openai.com/v1/videos', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt: b.prompt, size: b.size, seconds: b.seconds }) })
  }
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw providerErr(r.status, d)
  return { id: d.id, status: norm(d.status), progress: +d.progress || 0 }
}
async function oaStatus(KEY, id) {
  const r = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${KEY}` } })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw providerErr(r.status, d)
  return { id, status: norm(d.status), progress: +d.progress || 0, error: d.error && (d.error.message || d.error.code) }
}
async function oaBytes(KEY, id) {
  const r = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}/content`, { headers: { Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw providerErr(r.status, await r.json().catch(() => ({})))
  return Buffer.from(await r.arrayBuffer())
}

// ---- Google Veo (Gemini API)
const GAPI = 'https://generativelanguage.googleapis.com/v1beta'
async function veoStart(KEY, b) {
  const model = process.env.VEO_MODEL || 'veo-3.0-generate-001'
  const inst = { prompt: b.prompt }
  if (b.image) { const m = String(b.image).match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/); if (!m) throw Object.assign(new Error('התמונה לפריים הראשון לא תקינה'), { code: 'bad_image', status: 400 }); inst.image = { bytesBase64Encoded: m[2], mimeType: m[1] } }
  const r = await fetch(`${GAPI}/models/${model}:predictLongRunning?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instances: [inst], parameters: { aspectRatio: b.size === '1280x720' ? '16:9' : '9:16', durationSeconds: Math.min(8, +b.seconds || 8), personGeneration: 'allow_adult' } }) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw providerErr(r.status, d)
  return { id: d.name, status: 'queued', progress: 0 }
}
async function veoStatus(KEY, id) {
  const r = await fetch(`${GAPI}/${id}?key=${KEY}`)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw providerErr(r.status, d)
  if (d.error) return { id, status: 'failed', progress: 0, error: d.error.message }
  if (!d.done) return { id, status: 'in_progress', progress: 0 }
  const uri = d.response && d.response.generateVideoResponse && d.response.generateVideoResponse.generatedSamples && d.response.generateVideoResponse.generatedSamples[0] && d.response.generateVideoResponse.generatedSamples[0].video && d.response.generateVideoResponse.generatedSamples[0].video.uri
  return { id, status: uri ? 'completed' : 'failed', progress: 100, uri, error: uri ? '' : 'Veo לא החזיר וידאו' }
}
async function veoBytes(KEY, id) {
  const s = await veoStatus(KEY, id)
  if (!s.uri) throw Object.assign(new Error('הסרטון עוד לא מוכן'), { code: 'not_ready', status: 409 })
  const r = await fetch(s.uri + (s.uri.includes('?') ? '&' : '?') + 'key=' + KEY)
  if (!r.ok) throw Object.assign(new Error('הורדת הסרטון מ-Google נכשלה'), { code: 'provider_error', status: 502 })
  return Buffer.from(await r.arrayBuffer())
}

function norm(s) { s = String(s || '').toLowerCase(); return s === 'completed' || s === 'succeeded' ? 'completed' : s === 'failed' || s === 'error' || s === 'cancelled' ? 'failed' : s === 'queued' ? 'queued' : 'in_progress' }
function providerErr(status, d) {
  const msg = (d && d.error && (d.error.message || d.error.code)) || (d && d.message) || 'שגיאה מספק הווידאו'
  const code = status === 400 ? (/moderation|safety|policy|blocked/i.test(msg) ? 'blocked' : 'bad_request') : status === 429 ? 'provider_busy' : status === 401 || status === 403 ? 'provider_auth' : 'provider_error'
  return Object.assign(new Error(msg), { code, status: status === 400 ? 400 : status === 429 ? 429 : 502 })
}

// store the finished file in our media bucket so it behaves like any uploaded video
async function toBucket(id, bytes) {
  const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const SK = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SK) return null
  const name = 'vg_' + String(id).replace(/[^a-z0-9_-]/gi, '').slice(-40) + '.mp4'
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/engine-media/blob/${name}`, { method: 'POST', headers: { Authorization: `Bearer ${SK}`, apikey: SK, 'Content-Type': 'video/mp4', 'x-upsert': 'true' }, body: bytes })
  if (!r.ok) return null
  return `${SUPABASE_URL}/storage/v1/object/public/engine-media/blob/${name}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { fail(res, 401, 'auth', 'צריך להתחבר לאדמין'); return }
  const KEY = providerKey()
  const info = providerInfo()
  if (!KEY) { fail(res, 503, 'not_configured', `יצירת וידאו עוד לא מוגדרת: צריך ${info.key} ב-Vercel > Settings > Environment Variables`, { provider: info.provider }); return }
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const op = String(body.op || 'start')
  const id = String(body.id || '').slice(0, 200)
  try {
    if (op === 'start') {
      const prompt = String(body.prompt || '').trim().slice(0, 2000)
      if (!prompt) { fail(res, 400, 'no_prompt', 'כתבו מה לצלם'); return }
      if (limited(user.id)) { fail(res, 429, 'rate_limited', 'נוצרו הרבה סרטונים בשעה האחרונה. נסו שוב מאוחר יותר'); return }
      const b = { prompt, size: SIZES.has(body.size) ? body.size : '720x1280', seconds: SECS.has(String(body.seconds)) ? String(body.seconds) : '8', image: body.image }
      const out = info.provider === 'veo' ? await veoStart(KEY, b) : await oaStart(KEY, b)
      res.status(200).json(Object.assign({ provider: info.provider, model: info.model }, out)); return
    }
    if (!id) { fail(res, 400, 'no_id', 'חסר מזהה'); return }
    if (op === 'status') { res.status(200).json(info.provider === 'veo' ? await veoStatus(KEY, id) : await oaStatus(KEY, id)); return }
    if (op === 'finish' || op === 'content') {
      const bytes = info.provider === 'veo' ? await veoBytes(KEY, id) : await oaBytes(KEY, id)
      if (op === 'finish') {
        const url = await toBucket(id, bytes)
        if (url) { res.status(200).json({ url, bytes: bytes.length }); return }
        res.status(200).json({ url: '', bytes: bytes.length, stream: true }); return
      }
      res.setHeader('Content-Type', 'video/mp4'); res.setHeader('Content-Length', String(bytes.length)); res.status(200).send(bytes); return
    }
    fail(res, 400, 'bad_op', 'פעולה לא מוכרת')
  } catch (e) {
    fail(res, e.status || 500, e.code || 'server', String((e && e.message) || e))
  }
}
