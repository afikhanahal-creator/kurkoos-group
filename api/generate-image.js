// ============================================================
// Vercel serverless — יצירת תמונת כריכה לכתבה דרך AI (OpenAI Images).
// מקבל POST { prompt }, מחזיר { b64 } (PNG base64). הדפדפן מעלה אותה
// ל-Supabase Storage (uploadMedia) ושומר את הכתובת ככריכת הכתבה.
//
// דורש משתנה סביבה ב-Vercel: OPENAI_API_KEY (Settings > Environment Variables).
// אופציונלי: OPENAI_IMAGE_MODEL (ברירת מחדל 'dall-e-3').
// 🔐 את המפתח מגדירים רק ב-Vercel, לעולם לא בקוד.
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
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
