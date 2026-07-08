// ============================================================
// Vercel serverless — יצירת תמונת כריכה לכתבה דרך AI (OpenAI Images).
// מקבל POST { prompt }, מחזיר { b64 } (PNG base64). הדפדפן מעלה אותה
// ל-Supabase Storage (uploadMedia) ושומר את הכתובת ככריכת הכתבה.
//
// דורש משתנה סביבה ב-Vercel: OPENAI_API_KEY (Settings > Environment Variables).
// אופציונלי: OPENAI_IMAGE_MODEL (ברירת מחדל 'dall-e-3').
// 🔐 את המפתח מגדירים רק ב-Vercel, לעולם לא בקוד.
// ============================================================

// Rate limiter — מגן מפני בזבוז קרדיטים (3 תמונות לכל IP כל 10 דקות)
const _rl = new Map()
function rateLimit(ip, max = 3, windowMs = 600_000) {
  const now = Date.now()
  const e = _rl.get(ip) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(ip, e)
  if (_rl.size > 1_000) _rl.clear()
  return e.n > max
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (rateLimit(ip, 3, 600_000)) { res.status(429).json({ error: 'יותר מדי בקשות — נסו שוב בעוד 10 דקות' }); return }

  // נקודת קצה זו נקראת רק ממסך האדמין — דורשת JWT תקף של Supabase
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const accessToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) {
    res.status(401).json({ error: 'Unauthorized — admin session required' })
    return
  }
  if (SUPABASE_URL && SERVICE_KEY) {
    const check = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
    }).catch(() => null)
    if (!check || !check.ok) {
      res.status(401).json({ error: 'Unauthorized — invalid or expired session' })
      return
    }
  }

  const KEY = process.env.OPENAI_API_KEY
  if (!KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY חסר. הגדירו אותו ב-Vercel > Settings > Environment Variables.' })
    return
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const prompt = (body && body.prompt ? String(body.prompt) : '').trim().slice(0, 3800)
  if (!prompt) { res.status(400).json({ error: 'missing prompt' }); return }

  const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3'
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model,
        prompt,
        size: '1792x1024',
        quality: 'hd',
        response_format: 'b64_json',
        n: 1,
      }),
    })
    const data = await r.json()
    if (!r.ok) {
      res.status(502).json({ error: (data && data.error && data.error.message) || 'שגיאת ספק ה-AI' })
      return
    }
    const b64 = data && data.data && data.data[0] && data.data[0].b64_json
    if (!b64) { res.status(502).json({ error: 'לא התקבלה תמונה' }); return }
    res.status(200).json({ b64 })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
