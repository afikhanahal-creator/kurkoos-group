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
  const email = (process.env.GA_SA_CLIENT_EMAIL || '').trim()
  let key = process.env.GA_SA_PRIVATE_KEY || ''
  if (!email || !key) throw new Error('NOT_CONFIGURED')
  // נרמול סלחני של המפתח — מתקן טעויות הדבקה נפוצות ב-Vercel:
  key = key.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1)   // מרכאות מסביב
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim()   // \n מילולי מתוך ה-JSON
  if (!key.includes('BEGIN PRIVATE KEY')) throw new Error('GA_SA_PRIVATE_KEY לא תקין: חסרות שורות BEGIN/END PRIVATE KEY — העתיקו את הערך המלא של private_key מקובץ ה-JSON')
  if (!key.includes('\n')) {
    // הודבק כשורה אחת בלי שבירות — משחזרים מבנה PEM תקני
    const m = key.match(/-----BEGIN PRIVATE KEY-----(.+?)-----END PRIVATE KEY-----/)
    if (m) key = `-----BEGIN PRIVATE KEY-----\n${m[1].replace(/\s+/g, '').replace(/(.{64})/g, '$1\n').trim()}\n-----END PRIVATE KEY-----\n`
  }
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

/* ---------- מה נחשב פנייה ----------
   ההמרות מוגדרות כאן, בקוד שלנו, ולא דרך סימון "אירוע מפתח" ב-GA4.
   המדד keyEvents של גוגל סופר רק אירועים שמישהו סימן ידנית בהגדרות
   הנכס, ובלי הסימון הזה הדשבורד הראה "המרות: 0" לצד טבלת אירועים עם
   עשרות פניות אמיתיות. כאן הרשימה מפורשת: ארבע הפעולות שבהן גולש
   פונה אלינו. כל דוח המרות מסונן לפי הרשימה הזאת, ולכן המספרים באדמין
   לא תלויים בשום הגדרה בגוגל. */
/* השמות kc_* נשלחים רק מ-track() באתר, ורק מלחיצה אמיתית (ראו
   src/lib/track.js). השמות הגנריים phone_click ו-email_click זוהמו בנכס
   בכלל שיוצר אותם מצפיות בעמוד, ולכן הם לא נספרים יותר. */
export const CONVERSION_EVENTS = ['kc_lead', 'kc_phone', 'kc_whatsapp', 'kc_email']
export const USEFUL_EVENTS = [
  'kc_lead', 'kc_phone', 'kc_whatsapp', 'kc_email', 'kc_newsletter_signup',
  'kc_directions_click', 'kc_calculator_use', 'kc_article_cta', 'kc_cta_click', 'form_start',
]
const CONV_FILTER = { filter: { fieldName: 'eventName', inListFilter: { values: CONVERSION_EVENTS } } }

/* ---------- הגדרות הדוחות (השרת קובע — הלקוח רק בוחר שם) ---------- */
function reportSpecs(range, prevRange) {
  const M = (...names) => names.map((name) => ({ name }))
  const D = (...names) => names.map((name) => ({ name }))
  const cur = [{ startDate: range.start, endDate: range.end }]
  const prev = [{ startDate: prevRange.start, endDate: prevRange.end }]
  /* דוח המרות: אותו מבנה כמו הדוח הרגיל, מסונן לאירועי הפנייה.
     sessions כאן פירושו "ביקורים שבהם הייתה פנייה", ו-totalUsers "אנשים
     שפנו", כי הסינון על האירוע חל לפני הספירה. */
  const conv = (dims, extra = {}) => ({
    dateRanges: cur,
    ...(dims.length ? { dimensions: D(...dims) } : {}),
    metrics: M('eventCount', 'totalUsers', 'sessions'),
    dimensionFilter: CONV_FILTER,
    ...extra,
  })
  return {
    /* המרות לפי סוג פעולה, ובסך הכול (בלי מימד → ניכוי כפילויות בין הסוגים) */
    conv: conv(['eventName'], { orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 10 }),
    convPrev: { ...conv(['eventName'], { limit: 10 }), dateRanges: prev },
    convTotals: conv([]),
    convTotalsPrev: { ...conv([]), dateRanges: prev },
    convTimeseries: conv(['date'], { orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 }),
    convTimeseriesPrev: { ...conv(['date'], { orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 }), dateRanges: prev },
    convChannels: conv(['sessionDefaultChannelGroup'], { limit: 12 }),
    convSources: conv(['sessionSource', 'sessionMedium'], { limit: 40 }),
    convPages: conv(['pagePath'], { limit: 60 }),
    convDevices: conv(['deviceCategory'], { limit: 5 }),
    convCountries: conv(['country'], { limit: 20 }),
    totals: { dateRanges: cur, metrics: M('totalUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'engagementRate', 'bounceRate', 'eventCount', 'keyEvents', 'averageSessionDuration') },
    totalsPrev: { dateRanges: [{ startDate: prevRange.start, endDate: prevRange.end }], metrics: M('totalUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'engagementRate', 'bounceRate', 'eventCount', 'keyEvents', 'averageSessionDuration') },
    timeseries: { dateRanges: cur, dimensions: D('date'), metrics: M('totalUsers', 'sessions', 'screenPageViews', 'keyEvents'), orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
    timeseriesPrev: { dateRanges: [{ startDate: prevRange.start, endDate: prevRange.end }], dimensions: D('date'), metrics: M('totalUsers', 'sessions', 'screenPageViews', 'keyEvents'), orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
    channels: { dateRanges: cur, dimensions: D('sessionDefaultChannelGroup'), metrics: M('totalUsers', 'newUsers', 'sessions', 'engagementRate', 'keyEvents'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12 },
    sources: { dateRanges: cur, dimensions: D('sessionSource', 'sessionMedium'), metrics: M('totalUsers', 'sessions', 'engagementRate', 'keyEvents'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12 },
    /* עמודים מקובצים לפי כתובת בלבד. קודם הקיבוץ היה לפי כתובת וכותרת
       יחד, וכל עמוד שהכותרת שלו השתנתה (שינויי שם, או כותרת זמנית לפני
       שעמוד פרויקט נטען) הופיע כמה פעמים בטבלה עם מספרים מפוצלים. */
    pages: { dateRanges: cur, dimensions: D('pagePath'), metrics: M('screenPageViews', 'totalUsers', 'userEngagementDuration', 'keyEvents'), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15 },
    /* הכותרת להצגה ליד כל כתובת: מהימים האחרונים של הטווח, כדי שתוצג
       הכותרת הנוכחית ולא שם ישן של העמוד. הלקוח בוחר לכל כתובת את
       הכותרת עם הכי הרבה צפיות בחלון הזה, ונופל לטווח המלא אם אין. */
    pageTitles: { dateRanges: [{ startDate: recentStart(range), endDate: range.end }], dimensions: D('pagePath', 'pageTitle'), metrics: M('screenPageViews'), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 200 },
    pageTitlesAll: { dateRanges: cur, dimensions: D('pagePath', 'pageTitle'), metrics: M('screenPageViews'), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 200 },
    devices: { dateRanges: cur, dimensions: D('deviceCategory'), metrics: M('totalUsers', 'sessions', 'engagementRate', 'keyEvents'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 5 },
    countries: { dateRanges: cur, dimensions: D('country'), metrics: M('totalUsers', 'sessions', 'keyEvents'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 10 },
    cities: { dateRanges: cur, dimensions: D('city'), metrics: M('totalUsers', 'sessions'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 10 },
    /* רק האירועים שיש להם משמעות עסקית, בשמות kc_ שהאתר עצמו שולח
       (ראו src/lib/track.js), ועוד form_start של גוגל שנמדד בדפדפן
       ולא זוהם. צפיות, סשנים וגלילה מוצגים ממילא בשאר הדשבורד. */
    events: {
      dateRanges: cur, dimensions: D('eventName'), metrics: M('eventCount', 'totalUsers'),
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: USEFUL_EVENTS } } },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 20,
    },
  }
}

/* שלושת הימים האחרונים של הטווח (או כולו, אם הוא קצר יותר) */
function recentStart(range) {
  const e = new Date(range.end + 'T00:00:00Z'); e.setUTCDate(e.getUTCDate() - 2)
  const r = e.toISOString().slice(0, 10)
  return r < range.start ? range.start : r
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
function cached(key, fn, ttl = 5 * 60 * 1000) {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.t < ttl) return hit.p
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

/* דוח זמן אמת בודד. ל-GA4 אין batch לדוחות זמן אמת, כל דוח הוא קריאה. */
async function gaRealtime(prop, token, spec) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runRealtimeReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  })
  const d = await r.json()
  if (!r.ok) throw new Error('GA_ERROR: ' + (d.error?.message || r.status))
  return d
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
      /* מטמון של 25 שניות בלבד. הלקוח מרענן כל דקה, וקודם ישב כאן מטמון
         של חמש דקות, כך שמונה "עכשיו באתר" יכול היה להציג מספר בן חמש
         דקות. 25 שניות מבטיחות שכל רענון מקבל נתון טרי. */
      const data = await cached(`rt:${prop}`, async () => {
        const [now, byMinute, today] = await Promise.all([
          /* מי באתר ממש עכשיו, ובאילו עמודים.
             ב-API של זמן אמת אין נתיב עמוד, רק כותרת, ולכן מוצגות כותרות.
             metricAggregations מחזיר גם את הסך הכולל, מנוכה כפילויות. */
          gaRealtime(prop, token, {
            metrics: [{ name: 'activeUsers' }],
            dimensions: [{ name: 'unifiedScreenName' }],
            metricAggregations: ['TOTAL'],
            orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
            limit: 10,
          }),
          /* עקומת חצי השעה האחרונה. זה החלון המלא ש-GA4 מחזיק בזמן אמת.
             המדד הוא צפיות ולא גולשים: הממשק מציג כאן "צפיות", וסכימת
             גולשים פעילים לפי דקה סופרת את אותו אדם בכל דקה שבה היה באתר,
             כך שהסכום לא היה מייצג שום דבר אמיתי. צפיות כן מסתכמות. */
          gaRealtime(prop, token, {
            metrics: [{ name: 'screenPageViews' }],
            dimensions: [{ name: 'minutesAgo' }],
            limit: 31,
          }).catch(() => null),
          /* מאיפה הם הגיעו. ל-API של זמן אמת אין מימדי מקור תנועה בכלל,
             ולכן זה דוח רגיל של היום. מסומן בממשק כ"היום" ולא כ"עכשיו",
             כדי לא להציג נתון כאילו הוא חי כשהוא לא. */
          gaBatch(prop, token, [
            { dateRanges: [{ startDate: 'today', endDate: 'today' }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'totalUsers' }, { name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
            { dateRanges: [{ startDate: 'today', endDate: 'today' }], dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }], metrics: [{ name: 'totalUsers' }, { name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
          ]).catch(() => []),
        ])
        return { now, byMinute, todayChannels: today[0] || null, todaySources: today[1] || null }
      }, 25 * 1000)
      res.status(200).json({ configured: true, realtime: data.now, rt: data })
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
