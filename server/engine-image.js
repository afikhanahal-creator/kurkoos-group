// ============================================================
// Vercel serverless: סטודיו התמונות של מנוע התוכן (ChatGPT / OpenAI Images).
// POST { prompt, size, quality, n, model, image? } ממנהל מחובר.
// image (לא חובה) הוא data URL של התמונה הנוכחית, ואז זו "שינוי של התמונה".
// מחזיר { images: [base64 JPEG, ...], model, size, quality }, ובשגיאה { error, code }.
//
// משתמש באותו OPENAI_API_KEY שכבר מוגדר ב-Vercel לכריכות הכתבות.
// אופציונלי: OPENAI_ENGINE_IMAGE_MODEL (ברירת מחדל gpt-image-1).
// ============================================================

const _rl = new Map()
// counts images, not requests: 60 images in 10 minutes per admin
function limited(key, cost = 1, max = 60, windowMs = 600_000) {
  const now = Date.now()
  const e = _rl.get(key) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n += cost
  _rl.set(key, e)
  if (_rl.size > 1_000) _rl.clear()
  return e.n > max
}

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

const SIZES = new Set(['1024x1024', '1024x1536', '1536x1024', 'auto'])
const QUALS = new Set(['low', 'medium', 'high', 'auto'])
const MODELS = new Set(['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5'])
const fail = (res, status, code, error, extra) => res.status(status).json(Object.assign({ error, code }, extra || {}))

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { fail(res, 401, 'auth', 'צריך להתחבר לאדמין'); return }
  const KEY = process.env.OPENAI_API_KEY
  if (!KEY) { fail(res, 503, 'not_configured', 'מפתח OpenAI עוד לא הוגדר. מוסיפים OPENAI_API_KEY ב-Vercel > Settings > Environment Variables'); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const prompt = String(body.prompt || '').trim().slice(0, 4000)
  if (!prompt) { fail(res, 400, 'no_prompt', 'חסר תיאור לתמונה'); return }
  const envModel = process.env.OPENAI_ENGINE_IMAGE_MODEL || 'gpt-image-1'
  const model = MODELS.has(body.model) ? body.model : envModel
  const size = SIZES.has(body.size) ? body.size : '1024x1536'
  const quality = QUALS.has(body.quality) ? body.quality : 'medium'
  // high quality takes long: at most 2 at once so the answer fits the 60 s function limit
  const n = Math.max(1, Math.min(quality === 'high' ? 2 : 4, parseInt(body.n, 10) || 1))
  if (limited(user.id, n)) { fail(res, 429, 'rate_limited', 'יותר מדי תמונות ברצף. נסו שוב בעוד כמה דקות'); return }
  const signal = AbortSignal.timeout(54_000)

  try {
    let r
    if (body.image) {
      const m = String(body.image).match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
      if (!m) { fail(res, 400, 'bad_image', 'התמונה לשינוי לא תקינה'); return }
      const fd = new FormData()
      fd.append('model', model); fd.append('prompt', prompt); fd.append('size', size); fd.append('quality', quality); fd.append('n', String(n))
      fd.append('output_format', 'jpeg'); fd.append('output_compression', '85')
      fd.append('image', new Blob([Buffer.from(m[2], 'base64')], { type: m[1] }), 'current.' + (m[1].split('/')[1] === 'jpeg' ? 'jpg' : m[1].split('/')[1]))
      r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd, signal })
    } else {
      r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model, prompt, size, quality, n, output_format: 'jpeg', output_compression: 85 }),
        signal,
      })
    }
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || 'שגיאה מ-OpenAI'
      const code = r.status === 400 ? (/safety|moderation/i.test(msg) ? 'blocked' : 'bad_request') : r.status === 429 ? 'provider_busy' : r.status === 401 || r.status === 403 ? 'provider_auth' : 'provider_error'
      fail(res, r.status === 400 ? 400 : r.status === 429 ? 429 : 502, code, msg, { status: r.status })
      return
    }
    const images = (data.data || []).map((d) => d.b64_json).filter(Boolean)
    if (!images.length) { fail(res, 502, 'empty', 'OpenAI לא החזיר תמונה'); return }
    res.status(200).json({ images, format: 'jpeg', model, size, quality })
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) { fail(res, 504, 'timeout', 'יצירת התמונה לקחה יותר מדי זמן. נסו איכות רגילה או פחות אפשרויות'); return }
    fail(res, 500, 'server', String((e && e.message) || e))
  }
}
