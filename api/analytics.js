// ============================================================
// Vercel serverless — שכבת ה-API של דשבורד האנליטיקס.
// מושך נתונים אמיתיים מ-Google Analytics 4 (Data API v1beta) בצד השרת,
// עם חשבון שירות (Service Account). שום Credential לא מגיע ללקוח.
//
// משתני סביבה נדרשים (Vercel → Settings → Environment Variables):
//   GA_SA_CLIENT_EMAIL   — האימייל של חשבון השירות (...@...iam.gserviceaccount.com)
//   GA_SA_PRIVATE_KEY    — המפתח הפרטי מה-JSON (כולל BEGIN/END; שורות עם \n)
//   GA4_PROPERTY_ID      — מזהה הנכס המספרי (אופציונלי — אפשר גם מהאדמין,
//                          מפתח site_settings בשם ga4_property_id)
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ VITE_SUPABASE_ANON_KEY) — קיימים כבר
//
// אבטחה: כל בקשה חייבת Bearer token של משתמש אדמין מחובר (Supabase Auth).
// מטמון: 5 דקות בזיכרון לכל שילוב דוח+טווח — חוסך את מכסת ה-API של Google.
// ============================================================

import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

/* ---------- OAuth: JWT חתום RS256 → access token (במטמון ~50 דק') ---------- */
let _tok = { v: null, exp: 0 }
async function googleToken() {
  if (_tok.v && Date.now() < _tok.exp) return _tok.v
  const email = process.env.GA_SA_CLIENT_EMAIL
  let key = process.env.GA_SA_PRIVATE_KEY || ''
  if (!email || !key) throw new Error('NOT_CONFIGURED')
  key = key.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  const jwt = `${unsigned}.${signer.sign(key, 'base64url')}`
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error('GOOGLE_AUTH_FAILED: ' + (data.error_description || data.error || res.status))
  _tok = { v: data.access_token, exp: Date.now() + 50 * 60 * 1000 }
  return _tok.v
}

/* ---------- Property ID: env או site_settings (במטמון 10 דק') ---------- */
let _prop = { v: null, exp: 0 }
async function propertyId() {
  if (process.env.GA4_PROPERTY_ID) return String(process.env.GA4_PROPERTY_ID).replace(/\D/g, '')
  if (_prop.v && Date.now() < _prop.exp) return _prop.v
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return ''
  const res = await fetch(`${url}/rest/v1/site_settings?key=eq.ga4_property_id&select=value`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).catch(() => null)
  const rows = res && res.ok ? await res.json() : []
  _prop = { v: String(rows?.[0]?.value || '').replace(/\D/g, ''), exp: Date.now() + 10 * 60 * 1000 }
  return _prop.v
}

/* ---------- אימות: רק אדמין מחובר (Supabase session) ---------- */
async function isAdmin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return false
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon) return false
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } }).catch(() => null)
  return !!(res && res.ok)
}

/* ---------- הגדרות הדוחות (השרת קובע — הלקוח רק בוחר שם) ---------- */
function reportSpecs(range, prevRange) {
  const M = (...names) => names.map((name) => ({ name }))
  const D = (...names) => names.map((name) => ({ name }))
  const cur = [{ startDate: range.start, endDate: range.end }]
  return {
    totals: { dateRanges: cur, metrics: M('totalUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'engagementRate', 'bounceRate', 'eventCount', 'keyEvents', 'averageSessionDuration') },
    totalsPrev: { dateRanges: [{ startDate: prevRange.start, endDate: prevRange.end }], metrics: M('totalUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'engagementRate', 'bounceRate', 'eventCount', 'keyEvents', 'averageSessionDuration') },
    timeseries: { dateRanges: cur, dimensions: D('date'), metrics: M('totalUsers', 'sessions', 'screenPageViews', 'keyEvents'), orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
    timeseriesPrev: { dateRanges: [{ startDate: prevRange.start, endDate: prevRange.end }], dimensions: D('date'), metrics: M('totalUsers', 'sessions', 'screenPageViews', 'keyEvents'), orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
    channels: { dateRanges: cur, dimensions: D('sessionDefaultChannelGroup'), metrics: M('totalUsers', 'newUsers', 'sessions', 'engagementRate', 'keyEvents'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12 },
    sources: { dateRanges: cur, dimensions: D('sessionSource', 'sessionMedium'), metrics: M('totalUsers', 'sessions', 'engagementRate', 'keyEvents'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12 },
    pages: { dateRanges: cur, dimensions: D('pagePath', 'pageTitle'), metrics: M('screenPageViews', 'totalUsers', 'userEngagementDuration', 'keyEvents'), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15 },
    devices: { dateRanges: cur, dimensions: D('deviceCategory'), metrics: M('totalUsers', 'sessions', 'engagementRate', 'keyEvents'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 5 },
    countries: { dateRanges: cur, dimensions: D('country'), metrics: M('totalUsers', 'sessions', 'keyEvents'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 10 },
    cities: { dateRanges: cur, dimensions: D('city'), metrics: M('totalUsers', 'sessions'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 10 },
    events: { dateRanges: cur, dimensions: D('eventName'), metrics: M('eventCount', 'totalUsers'), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 20 },
  }
}

/* טווח קודם באותו אורך — להשוואה */
function previousRange(start, end) {
  const s = new Date(start + 'T00:00:00Z'), e = new Date(end + 'T00:00:00Z')
  const days = Math.round((e - s) / 86400000) + 1
  const ps = new Date(s); ps.setUTCDate(ps.getUTCDate() - days)
  const pe = new Date(s); pe.setUTCDate(pe.getUTCDate() - 1)
  const iso = (d) => d.toISOString().slice(0, 10)
  return { start: iso(ps), end: iso(pe) }
}

/* ---------- מטמון תוצאות (5 דק') ---------- */
const _cache = new Map()
function cached(key, fn) {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.p
  const p = fn()
  p.catch(() => _cache.delete(key))
  _cache.set(key, { t: Date.now(), p })
  if (_cache.size > 200) _cache.clear()
  return p
}

async function gaBatch(prop, token, reports) {
  const out = []
  for (let i = 0; i < reports.length; i += 5) {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:batchRunReports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: reports.slice(i, i + 5) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error('GA_ERROR: ' + (data.error?.message || res.status))
    out.push(...(data.reports || []))
  }
  return out
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  if (!(await isAdmin(req))) { res.status(401).json({ error: 'unauthorized' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const type = String(body.type || 'dashboard')
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const start = DATE_RE.test(body.start) ? body.start : null
  const end = DATE_RE.test(body.end) ? body.end : null

  try {
    const prop = await propertyId()
    if (!prop) { res.status(200).json({ configured: false, missing: 'property' }); return }
    if (!process.env.GA_SA_CLIENT_EMAIL || !process.env.GA_SA_PRIVATE_KEY) {
      res.status(200).json({ configured: false, missing: 'credentials' }); return
    }
    const token = await googleToken()

    if (type === 'realtime') {
      const data = await cached(`rt:${prop}`, async () => {
        const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runRealtimeReport`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: [{ name: 'activeUsers' }], dimensions: [{ name: 'unifiedScreenName' }], limit: 8 }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error('GA_ERROR: ' + (d.error?.message || r.status))
        return d
      })
      res.status(200).json({ configured: true, realtime: data })
      return
    }

    if (type === 'page') {
      // Drill-down לעמוד בודד — מגמה, מקורות ומכשירים של אותו עמוד בלבד
      const path = String(body.path || '').slice(0, 300)
      if (!path.startsWith('/') || !start || !end) { res.status(400).json({ error: 'bad page request' }); return }
      const filt = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: path } } }
      const cur = [{ startDate: start, endDate: end }]
      const reports = await cached(`page:${prop}:${path}:${start}:${end}`, () => gaBatch(prop, token, [
        { dateRanges: cur, dimensions: [{ name: 'date' }], metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }], dimensionFilter: filt, orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
        { dateRanges: cur, dimensions: [{ name: 'sessionSource' }], metrics: [{ name: 'totalUsers' }, { name: 'sessions' }], dimensionFilter: filt, orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 8 },
        { dateRanges: cur, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'totalUsers' }], dimensionFilter: filt, orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 4 },
      ]))
      res.status(200).json({ configured: true, page: path, reports: { timeseries: reports[0], sources: reports[1], devices: reports[2] } })
      return
    }

    if (type === 'test') {
      // בדיקת חיבור — דוח מינימלי
      await gaBatch(prop, token, [{ dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }], metrics: [{ name: 'totalUsers' }] }])
      res.status(200).json({ configured: true, ok: true, property: prop })
      return
    }

    // דשבורד מלא
    if (!start || !end) { res.status(400).json({ error: 'bad range' }); return }
    const prev = previousRange(start, end)
    const specs = reportSpecs({ start, end }, prev)
    const names = Object.keys(specs)
    const reports = await cached(`dash:${prop}:${start}:${end}`, () => gaBatch(prop, token, names.map((n) => specs[n])))
    const byName = {}
    names.forEach((n, i) => { byName[n] = reports[i] || null })
    res.status(200).json({ configured: true, range: { start, end }, prevRange: prev, reports: byName })
  } catch (err) {
    const msg = String(err?.message || err)
    if (msg === 'NOT_CONFIGURED') { res.status(200).json({ configured: false, missing: 'credentials' }); return }
    res.status(502).json({ error: msg.slice(0, 300) })
  }
}
