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
//   GET  /api/sitemap        (וגם /sitemap.xml דרך rewrite)
//
// בונוס: כל המטפלים חולקים עכשיו instance אחד, כך שהמטמון בזיכרון
// של האנליטיקס נשמר בין קריאות במקום להתפזר בין חמש פונקציות.
// ============================================================

const ROUTES = {
  'notify-lead': () => import('../server/notify-lead.js'),
  'newsletter-subscribe': () => import('../server/newsletter-subscribe.js'),
  analytics: () => import('../server/analytics.js'),
  'generate-image': () => import('../server/generate-image.js'),
  sitemap: () => import('../server/sitemap.js'),
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

export default async function handler(req, res) {
  const route = resolveRoute(req)
  if (!route) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const mod = await ROUTES[route]()
  return mod.default(req, res)
}
