// ============================================================
// שער ה-API היחיד של האתר.
//
// למה קובץ אחד ולא חמישה: Vercel אורזת כל קובץ בתיקיית api לחבילת
// פונקציה נפרדת, וכל חבילה נשמרת מחדש בכל deployment ונספרת במכסת
// ה-Function Storage. חמישה קבצים = פי חמישה אחסון על כל גרסה
// שעולה לאוויר. כאן יש נתיב דינמי אחד, [fn], שמנתב פנימה אל
// המטפלים שיושבים בתיקיית server. הכתובות הציבוריות לא השתנו:
//   POST /api/notify-lead
//   POST /api/newsletter-subscribe
//   POST /api/analytics
//   POST /api/generate-image
//   POST /api/claude         (מנוע התוכן: Claude)
//   POST /api/engine-image   (מנוע התוכן: סטודיו התמונות)
//   POST /api/metricool      (מנוע התוכן: תזמון לערוצים דרך Metricool, תמיד כטיוטה)
//   POST /api/video-gen      (מנוע התוכן: יצירת וידאו מפרומפט, משימה אסינכרונית)
//   GET  /api/status         (מנוע התוכן: אילו שירותים מחוברים, בלי סודות)
//   POST /api/finance       (מערכת החשבוניות: Gmail, סריקה, קריאת חשבוניות ע"י Claude)
//   GET  /api/finance-oauth (חזרה מחלון ההרשאה של Google)
//   GET  /api/sitemap        (וגם /sitemap.xml דרך rewrite)
//   GET  /api/indexnow       (cron יומי, מודיע ל-Bing על עמודים חדשים)
//
// בונוס: כל המטפלים חולקים עכשיו instance אחד, כך שהמטמון בזיכרון
// של האנליטיקס נשמר בין קריאות במקום להתפזר בין חמש פונקציות.
// ============================================================

const ROUTES = {
  'notify-lead': () => import('../server/notify-lead.js'),
  'newsletter-subscribe': () => import('../server/newsletter-subscribe.js'),
  analytics: () => import('../server/analytics.js'),
  'generate-image': () => import('../server/generate-image.js'),
  claude: () => import('../server/claude.js'),
  'engine-image': () => import('../server/engine-image.js'),
  metricool: () => import('../server/metricool.js'),
  sitemap: () => import('../server/sitemap.js'),
  indexnow: () => import('../server/indexnow.js'),
  'article-images': () => import('../server/article-images.js'),
  transcribe: () => import('../server/transcribe.js'),
  tts: () => import('../server/tts.js'),
  'video-gen': () => import('../server/video-gen.js'),
  status: () => import('../server/status.js'),
  'fetch-url': () => import('../server/fetch-url.js'),
  finance: () => import('../server/finance.js'),
  'finance-oauth': () => import('../server/finance.js'),
  'finance-whatsapp': () => import('../server/finance.js'),
}

/* שם המטפל מגיע מהסגמנט הדינמי של הנתיב. יש גיבוי לקריאה מתוך
   req.url כדי שהניתוב יעבוד גם אם ה-query לא אוכלס משום סיבה. */
export function resolveRoute(req) {
  const fromQuery = req?.query?.fn
  const direct = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery
  if (direct && Object.hasOwn(ROUTES, direct)) return direct

  const path = String(req?.url || '').split('?')[0]
  const last = decodeURIComponent(path.split('/').filter(Boolean).pop() || '')
  return Object.hasOwn(ROUTES, last) ? last : null
}

/* Members of the finance system other than admins (accountant, employee, finance manager) have a
   Supabase account, and the site's handlers trust any signed-in user. They are kept to /api/finance.
   Public routes (lead form, newsletter, sitemap) and cron calls are not affected. */
const FINANCE_ONLY_OK = new Set(['finance', 'finance-oauth', 'finance-whatsapp', 'notify-lead', 'newsletter-subscribe', 'sitemap', 'indexnow'])
async function financeOnly(req) {
  const auth = String(req.headers?.authorization || '')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token || token.split('.').length !== 3) return false   // no user token (public call, or a cron secret)
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  const r = await fetch(`${url}/rest/v1/rpc/fin_is_external`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null)
  if (!r || !r.ok) return false   // function not installed yet, or not a user token
  return (await r.json().catch(() => false)) === true
}

export default async function handler(req, res) {
  const route = resolveRoute(req)
  if (!route) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (!FINANCE_ONLY_OK.has(route) && await financeOnly(req)) {
    res.status(403).json({ error: 'החשבון הזה מורשה למערכת הנהלת החשבונות בלבד' })
    return
  }

  const mod = await ROUTES[route]()
  return mod.default(req, res)
}
