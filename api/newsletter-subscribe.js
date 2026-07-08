// ============================================================
// Vercel serverless — הרשמה לניוזלטר + שיגור Webhook צד-שרת.
// מקבל POST { email, source? }, מכניס ל-newsletter_subscribers ב-Supabase,
// ומפעיל את ה-Webhook (כתובתו נשמרת ב-site_settings ולא נחשפת ללקוח).
//
// משתני סביבה נדרשים: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================

const _rl = new Map()
function rateLimit(ip, max = 10, windowMs = 60_000) {
  const now = Date.now()
  const e = _rl.get(ip) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(ip, e)
  if (_rl.size > 5_000) _rl.clear()
  return e.n > max
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (rateLimit(ip, 10, 60_000)) { res.status(429).json({ error: 'יותר מדי בקשות' }); return }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) { res.status(500).json({ error: 'Server configuration error' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
  const VALID_SOURCES = new Set(['site', 'popup', 'footer', 'contact'])
  const source = VALID_SOURCES.has(body.source) ? body.source : 'site'

  if (!email || !EMAIL_RE.test(email)) { res.status(400).json({ error: 'כתובת מייל לא תקינה' }); return }

  const supaUrl = SUPABASE_URL.replace(/\/$/, '')
  const sbHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }

  // הכנסה ל-Supabase (service role — עוקף RLS, מאפשר גם קריאת כפילויות)
  const insertRes = await fetch(`${supaUrl}/rest/v1/newsletter_subscribers`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({ email, source }),
  }).catch(() => null)

  if (insertRes && !insertRes.ok) {
    const txt = await insertRes.text()
    if (!txt.includes('23505')) {
      res.status(502).json({ error: 'שגיאת שרת — נסו שוב' })
      return
    }
    // 23505 = כפילות — נחשב כהצלחה שקטה
  }

  // Webhook — URL נשמר ב-site_settings ולא נחשף ללקוח
  try {
    const settRes = await fetch(`${supaUrl}/rest/v1/site_settings?key=eq.newsletter_webhook&select=value`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    if (settRes.ok) {
      const rows = await settRes.json()
      const webhookUrl = rows?.[0]?.value
      if (typeof webhookUrl === 'string' && webhookUrl.startsWith('https://')) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'newsletter_subscribe', email, source, ts: new Date().toISOString() }),
        }).catch(() => {})
      }
    }
  } catch { /* webhook אופציונלי */ }

  res.status(200).json({ ok: true })
}
