// ============================================================
// Vercel serverless: speech to text for the video studio in the content engine.
// Receives POST { b64, type, offset, lang } from a signed in admin: one chunk of audio (16 kHz mono WAV, up to about 90 s),
// sends it to OpenAI Whisper and returns { segments: [{ t0, t1, text }] } in seconds from the start of the video
// (the chunk's offset is added here). The browser cuts the audio into chunks so each request stays under the body limit.
//
// Requires the Vercel env var OPENAI_API_KEY (Settings > Environment Variables). Optional: TRANSCRIBE_MODEL (default whisper-1).
// The key lives only in Vercel, never in code.
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

// 120 chunks in 10 minutes per user: about 3 hours of audio
const _rl = new Map()
function limited(key, max = 120, windowMs = 600_000) {
  const now = Date.now()
  const e = _rl.get(key) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(key, e)
  if (_rl.size > 1_000) _rl.clear()
  return e.n > max
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין' }); return }
  if (limited(user.id)) { res.status(429).json({ error: 'יותר מדי בקשות תמלול. נסו שוב בעוד כמה דקות' }); return }
  const KEY = process.env.OPENAI_API_KEY
  if (!KEY) { res.status(503).json({ error: 'התמלול עוד לא מוגדר: צריך להוסיף OPENAI_API_KEY ב-Vercel > Settings > Environment Variables', code: 'not_configured' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const b64 = typeof body.b64 === 'string' ? body.b64 : ''
  if (!b64 || b64.length > 5_500_000 || !/^[A-Za-z0-9+/=]+$/.test(b64)) { res.status(400).json({ error: 'קטע השמע חסר או גדול מדי' }); return }
  const type = ['audio/wav', 'audio/webm', 'audio/mpeg', 'audio/mp4'].includes(body.type) ? body.type : 'audio/wav'
  const offset = Math.max(0, Number(body.offset) || 0)
  const lang = /^[a-z]{2}$/.test(String(body.lang || '')) ? body.lang : 'he'

  try {
    const buf = Buffer.from(b64, 'base64')
    const fd = new FormData()
    fd.append('file', new Blob([buf], { type }), 'chunk.' + (type === 'audio/wav' ? 'wav' : type.split('/')[1]))
    fd.append('model', process.env.TRANSCRIBE_MODEL || 'whisper-1')
    fd.append('language', lang)
    fd.append('response_format', 'verbose_json')
    fd.append('timestamp_granularities[]', 'segment')
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) { res.status(r.status === 429 ? 429 : 502).json({ error: (data && data.error && data.error.message) || 'שגיאה משירות התמלול' }); return }
    const segments = (Array.isArray(data.segments) ? data.segments : []).map((s) => ({ t0: +(offset + (+s.start || 0)).toFixed(2), t1: +(offset + (+s.end || 0)).toFixed(2), text: String(s.text || '').trim() })).filter((s) => s.text && s.t1 > s.t0)
    if (!segments.length && data.text) segments.push({ t0: offset, t1: offset + (Number(body.dur) || 1), text: String(data.text).trim() })
    res.status(200).json({ segments })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
