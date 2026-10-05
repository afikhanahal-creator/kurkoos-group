// ============================================================
// Vercel serverless: Claude למנוע התוכן ("בקשה לעורך", שיפור פרומפט לתמונה).
// מקבל POST { input, tier, json } ממנהל מחובר, מחזיר { text }.
// input הוא מחרוזת או רשימת תורות [{ role, content }] שמסתיימת ב-user.
//
// דורש משתנה סביבה ב-Vercel: ANTHROPIC_API_KEY (Settings > Environment Variables).
// אופציונלי: CLAUDE_MODEL_QUICK, CLAUDE_MODEL_DEFAULT, CLAUDE_MODEL_COMPLEX.
// 🔐 את המפתח מגדירים רק ב-Vercel, לעולם לא בקוד.
// ============================================================

const MODELS = {
  quick: process.env.CLAUDE_MODEL_QUICK || 'claude-haiku-4-5-20251001',
  default: process.env.CLAUDE_MODEL_DEFAULT || 'claude-sonnet-5-5',
  complex: process.env.CLAUDE_MODEL_COMPLEX || 'claude-opus-5-5',
}

// מגבלת קצב לכל משתמש: 60 בקשות ב-10 דקות
const _rl = new Map()
function limited(key, max = 60, windowMs = 600_000) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין' }); return }
  if (limited(user.id)) { res.status(429).json({ error: 'יותר מדי בקשות. נסו שוב בעוד כמה דקות' }); return }

  const KEY = process.env.ANTHROPIC_API_KEY
  if (!KEY) { res.status(503).json({ error: 'מפתח Claude עוד לא הוגדר. מוסיפים ANTHROPIC_API_KEY ב-Vercel > Settings > Environment Variables' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  let messages
  if (typeof body.input === 'string') messages = [{ role: 'user', content: body.input.slice(0, 120_000) }]
  else if (Array.isArray(body.input)) messages = body.input.filter((m) => m && (m.role === 'user' || m.role === 'assistant')).map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 60_000) })).slice(-30)
  if (!messages || !messages.length || messages[messages.length - 1].role !== 'user') { res.status(400).json({ error: 'missing input' }); return }

  const model = MODELS[body.tier] || MODELS.default
  const system = body.json ? 'Answer with one valid JSON value only. No prose before or after it, no code fences.' : undefined
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 8000, messages, ...(system ? { system } : {}) }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) { res.status(r.status === 429 ? 429 : 502).json({ error: (data && data.error && data.error.message) || 'שגיאה מ-Claude' }); return }
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
    res.status(200).json({ text, truncated: data.stop_reason === 'max_tokens' })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
