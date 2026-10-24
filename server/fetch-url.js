// ============================================================
// Vercel serverless: read a web page for the content engine (Social Carousel Studio, "קישור למקור מידע").
// POST /api/fetch-url { url }  (signed in admin)  -> { ok, title, text, url }
// The page is fetched server side (10 s, 2 MB), scripts, styles and navigation are stripped, the text is
// collapsed and cut to 15k characters. Only http(s) URLs; private and loopback hosts are refused.
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

function safeUrl(s) {
  let u
  try { u = new URL(String(s || '').trim()) } catch (e) { return null }
  if (!/^https?:$/.test(u.protocol)) return null
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.endsWith('.local') || h === '[::1]') return null
  return u.href
}

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(+n) } catch (e) { return '' } })
  .replace(/&#x([0-9a-f]+);/gi, (m, n) => { try { return String.fromCodePoint(parseInt(n, 16)) } catch (e) { return '' } })

function extract(html) {
  let s = String(html || '')
  const title = decode((s.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).replace(/\s+/g, ' ').trim().slice(0, 200)
  const og = (s.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) || s.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [, ''])[1]
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  s = s.replace(/<(script|style|noscript|svg|canvas|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
  s = s.replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, ' ')
  const main = (s.match(/<(main|article)[\s\S]*?<\/\1>/i) || [])[0]
  if (main && main.length > 800) s = main
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|br|section|blockquote|dt|dd)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, ' ')
  s = decode(s).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { title, description: decode(og).trim().slice(0, 400), text: s.slice(0, 15000) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'POST only' }) }
  const user = await adminUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'נדרשת התחברות של מנהל' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch (e) { body = {} } }
  const url = safeUrl(body && body.url)
  if (!url) return res.status(400).json({ ok: false, error: 'כתובת לא תקינה' })
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 10000)
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KurkoosEngine/1.0; +https://www.kurkoos-group.co.il)', Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5', 'Accept-Language': 'he,en;q=0.8' } })
    const type = r.headers.get('content-type') || ''
    if (!r.ok) return res.status(502).json({ ok: false, error: 'העמוד לא נטען (' + r.status + ')' })
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return res.status(415).json({ ok: false, error: 'הכתובת לא מחזירה עמוד טקסט' })
    const buf = Buffer.from(await r.arrayBuffer())
    const html = buf.subarray(0, 2 * 1024 * 1024).toString('utf8')
    const out = /text\/plain/i.test(type) ? { title: '', description: '', text: html.slice(0, 15000) } : extract(html)
    if (!out.text || out.text.length < 80) return res.status(422).json({ ok: false, error: 'לא נמצא טקסט לקריאה בעמוד' })
    return res.status(200).json(Object.assign({ ok: true, url: r.url || url }, out))
  } catch (e) {
    return res.status(504).json({ ok: false, error: e && e.name === 'AbortError' ? 'העמוד לא ענה בזמן' : 'הקריאה נכשלה' })
  } finally { clearTimeout(t) }
}
