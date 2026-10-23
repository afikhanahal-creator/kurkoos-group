// ============================================================
// Vercel serverless: AI narration for the video studio in the content engine.
// POST { text, voice } from a signed in admin, returns { b64, type } (MP3). Text only, at most 3000 characters per request.
// The studio places the result on a narration track and labels it as AI narration; it never replaces the original audio by itself.
//
// Requires the Vercel env var OPENAI_API_KEY. Optional: TTS_MODEL (default gpt-4o-mini-tts).
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

const _rl = new Map()
function limited(key, max = 30, windowMs = 600_000) {
  const now = Date.now()
  const e = _rl.get(key) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(key, e)
  if (_rl.size > 1_000) _rl.clear()
  return e.n > max
}

const VOICES = new Set(['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'])

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין' }); return }
  if (limited(user.id)) { res.status(429).json({ error: 'יותר מדי בקשות קריינות. נסו שוב בעוד כמה דקות' }); return }
  const KEY = process.env.OPENAI_API_KEY
  if (!KEY) { res.status(503).json({ error: 'קריינות AI עוד לא מוגדרת: צריך OPENAI_API_KEY ב-Vercel > Settings > Environment Variables', code: 'not_configured' }); return }
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const text = String(body.text || '').trim().slice(0, 3000)
  if (!text) { res.status(400).json({ error: 'אין טקסט לקריינות' }); return }
  const voice = VOICES.has(body.voice) ? body.voice : 'alloy'
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.TTS_MODEL || 'gpt-4o-mini-tts', voice, input: text, response_format: 'mp3', instructions: 'Speak natural Israeli Hebrew, warm and clear, at a calm professional pace.' }),
    })
    if (!r.ok) { const d = await r.json().catch(() => ({})); res.status(r.status === 429 ? 429 : 502).json({ error: (d && d.error && d.error.message) || 'שגיאה משירות הקריינות' }); return }
    const buf = Buffer.from(await r.arrayBuffer())
    res.status(200).json({ b64: buf.toString('base64'), type: 'audio/mpeg' })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
