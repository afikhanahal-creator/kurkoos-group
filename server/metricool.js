// ============================================================
// Vercel serverless: Metricool למנוע התוכן שבאתר.
// ב-claude.ai המנוע מדבר עם Metricool דרך החיבור של claude.ai. כאן, באתר,
// אותן קריאות עוברות דרך השרת, והמפתח של Metricool נשאר רק ב-Vercel.
//
// POST { tool, args } ממנהל מחובר (אותו טוקן Supabase של עמוד האדמין).
//   status              האם המפתח מוגדר
//   getBrandSettings    המותג והערוצים המחוברים (פייסבוק, אינסטגרם, טיקטוק, יוטיוב, גוגל)
//   getScheduledPosts   הפוסטים המתוזמנים בטווח תאריכים
//   createScheduledPost פוסט חדש, תמיד כטיוטה: שום דבר לא מתפרסם בלי אישור ב-Metricool
//
// משתני סביבה ב-Vercel:
//   METRICOOL_USER_TOKEN  חובה. Metricool > Account settings > API
//   METRICOOL_USER_ID     לא חובה (ברירת מחדל: החשבון של קבוצת קורקוס)
//   METRICOOL_BLOG_ID     לא חובה (ברירת מחדל: המותג קבוצת קורקוס)
// ============================================================

const API = 'https://app.metricool.com/api'
const NETWORKS = new Set(['facebook', 'instagram', 'tiktok', 'youtube', 'gmb', 'linkedin', 'twitter', 'pinterest', 'threads', 'bluesky'])

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

function ids() {
  return {
    token: process.env.METRICOOL_USER_TOKEN || '',
    userId: process.env.METRICOOL_USER_ID || '5500195',
    blogId: process.env.METRICOOL_BLOG_ID || '7115159',
  }
}

async function mc(path, params, init) {
  const { token, userId, blogId } = ids()
  const q = new URLSearchParams({ userId, blogId, ...(params || {}) })
  const r = await fetch(`${API}${path}?${q}`, {
    ...(init || {}),
    headers: { 'X-Mc-Auth': token, 'Content-Type': 'application/json', Accept: 'application/json', ...((init && init.headers) || {}) },
  })
  const text = await r.text()
  let data = text
  try { data = JSON.parse(text) } catch { /* not JSON */ }
  if (!r.ok) {
    const msg = (data && (data.message || data.error || data.detail)) || String(text).slice(0, 300) || `HTTP ${r.status}`
    const e = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg).slice(0, 300))
    e.status = r.status
    throw e
  }
  return data
}

// "2026-10-20T10:00:00+03:00" or "2026-10-20T10:00" -> "2026-10-20T10:00:00"
const local = (s) => {
  const t = String(s || '').replace(/(\.\d+)?([+-]\d\d:?\d\d|Z)$/, '')
  return /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(t) ? t + ':00' : t.slice(0, 19)
}

function safeInfo(raw, date) {
  let info = raw
  if (typeof info === 'string') { try { info = JSON.parse(info) } catch { info = null } }
  if (!info || typeof info !== 'object') throw Object.assign(new Error('פרטי הפוסט חסרים'), { status: 400 })
  const providers = (Array.isArray(info.providers) ? info.providers : [])
    .map((p) => (typeof p === 'string' ? { network: p } : p))
    .filter((p) => p && NETWORKS.has(p.network))
  if (!providers.length) throw Object.assign(new Error('בחרו לפחות ערוץ אחד'), { status: 400 })
  const tz = (info.publicationDate && info.publicationDate.timezone) || 'Asia/Jerusalem'
  const dt = local((info.publicationDate && info.publicationDate.dateTime) || date)
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(dt)) throw Object.assign(new Error('תאריך לא תקין'), { status: 400 })
  return {
    ...info,
    text: String(info.text || '').slice(0, 63000),
    providers,
    publicationDate: { dateTime: dt, timezone: tz },
    media: (Array.isArray(info.media) ? info.media : []).filter((u) => /^https:\/\//.test(String(u))).slice(0, 10),
    // נשלח תמיד כטיוטה: הפרסום עצמו מאושר רק ב-Metricool
    draft: true,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין', code: 'not_signed_in' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const tool = String(body.tool || '')
  const args = body.args || {}
  const { token, blogId } = ids()

  if (tool === 'status') { res.status(200).json({ configured: !!token, blogId }); return }
  if (!token) {
    res.status(503).json({ code: 'server_not_connected', error: 'Metricool עוד לא מחובר לאתר. מוסיפים METRICOOL_USER_TOKEN ב-Vercel > Settings > Environment Variables' })
    return
  }

  try {
    if (tool === 'getBrandSettings') {
      const data = await mc('/admin/simpleProfiles', {})
      res.status(200).json({ data }); return
    }
    if (tool === 'getScheduledPosts') {
      const tz = String(args.timezone || 'Asia/Jerusalem')
      const data = await mc('/v2/scheduler/posts', { start: local(args.fromDate), end: local(args.toDate), timezone: tz })
      res.status(200).json(data); return
    }
    if (tool === 'createScheduledPost') {
      const info = safeInfo(args.info, args.date)
      const data = await mc('/v2/scheduler/posts', {}, { method: 'POST', body: JSON.stringify(info) })
      res.status(200).json(data); return
    }
    res.status(400).json({ error: 'פעולה לא מוכרת', code: 'unknown_tool' })
  } catch (e) {
    const st = e.status === 401 || e.status === 403 ? 502 : e.status && e.status < 500 ? e.status : 502
    res.status(st).json({ code: e.status === 401 || e.status === 403 ? 'needs_reauth' : 'tool_error', error: String(e.message || 'Metricool error').slice(0, 300) })
  }
}
