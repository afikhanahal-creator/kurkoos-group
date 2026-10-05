// ============================================================
// Vercel serverless: סטודיו התמונות של מנוע התוכן (ChatGPT / OpenAI Images).
// POST { prompt, size, quality, n, model, image? } ממנהל מחובר.
// image (לא חובה) הוא data URL של התמונה הנוכחית, ואז זו "שינוי של התמונה".
// מחזיר { images: [base64 JPEG, ...] }.
//
// משתמש באותו OPENAI_API_KEY שכבר מוגדר ב-Vercel לכריכות הכתבות.
// אופציונלי: OPENAI_ENGINE_IMAGE_MODEL (ברירת מחדל gpt-image-1).
// ============================================================

const _rl = new Map()
function limited(key, max = 40, windowMs = 600_000) {
  const now = Date.now()
  const e = _rl.get(key) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
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

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין' }); return }
  if (limited(user.id)) { res.status(429).json({ error: 'יותר מדי תמונות ברצף. נסו שוב בעוד כמה דקות' }); return }
  const KEY = process.env.OPENAI_API_KEY
  if (!KEY) { res.status(503).json({ error: 'מפתח OpenAI עוד לא הוגדר. מוסיפים OPENAI_API_KEY ב-Vercel > Settings > Environment Variables' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const prompt = String(body.prompt || '').trim().slice(0, 4000)
  if (!prompt) { res.status(400).json({ error: 'חסר תיאור לתמונה' }); return }
  const model = String(body.model || process.env.OPENAI_ENGINE_IMAGE_MODEL || 'gpt-image-1').slice(0, 40)
  const size = SIZES.has(body.size) ? body.size : '1024x1536'
  const quality = QUALS.has(body.quality) ? body.quality : 'medium'
  const n = Math.max(1, Math.min(4, parseInt(body.n, 10) || 1))

  try {
    let r
    if (body.image) {
      const m = String(body.image).match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
      if (!m) { res.status(400).json({ error: 'התמונה לשינוי לא תקינה' }); return }
      const fd = new FormData()
      fd.append('model', model); fd.append('prompt', prompt); fd.append('size', size); fd.append('quality', quality); fd.append('n', String(n))
      fd.append('output_format', 'jpeg'); fd.append('output_compression', '85')
      fd.append('image', new Blob([Buffer.from(m[2], 'base64')], { type: m[1] }), 'current.' + (m[1].split('/')[1] === 'jpeg' ? 'jpg' : m[1].split('/')[1]))
      r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd })
    } else {
      r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model, prompt, size, quality, n, output_format: 'jpeg', output_compression: 85 }),
      })
    }
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || 'שגיאה מ-OpenAI'
      res.status(r.status === 400 ? 400 : r.status === 429 ? 429 : r.status === 401 ? 502 : 502).json({ error: msg, status: r.status })
      return
    }
    const images = (data.data || []).map((d) => d.b64_json).filter(Boolean)
    if (!images.length) { res.status(502).json({ error: 'OpenAI לא החזיר תמונה' }); return }
    res.status(200).json({ images, format: 'jpeg' })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
