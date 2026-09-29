// ============================================================
// IndexNow: מודיע ל-Bing (ודרכו גם למנועים שמשתמשים באינדקס שלו, כמו
// החיפוש של ChatGPT, וגם ל-Yandex, Seznam ו-Naver) על עמודים חדשים
// ומעודכנים, במקום לחכות שהסורק יחזור לבד. זה חשוב במיוחד כאן: האינדקס
// של Bing עדיין מחזיק את האתר הישן של הקבוצה.
//
// רץ כ-cron יומי של Vercel (vercel.json). כל יום נשלחים עמודי הליבה
// והכתבות מהימים האחרונים, ובימי שני כל האתר.
// המפתח הוא ציבורי מעצם ההגדרה של IndexNow ומוגש מ-/ab01ef227b7a3181c48a24f935dc95c9.txt.
// אם מוגדר CRON_SECRET ב-Vercel, רק בקשה עם אותו סוד תפעיל שליחה.
// ============================================================
import { STATIC, ARTICLES } from './sitemap.js'

const SITE = 'https://www.kurkoos-group.co.il'
const HOST = 'www.kurkoos-group.co.il'
const KEY = 'ab01ef227b7a3181c48a24f935dc95c9'
const CORE = ['/', '/villas-sharon', '/divisions/execution', '/divisions/supervision', '/divisions/development', '/divisions/brokerage', '/about', '/projects', '/livy-yazamim', '/real-estate-sharon', '/contact', '/llms.txt', '/llms-full.txt']

export function pickUrls(now = new Date(), all = false) {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const dayMs = 86400000
  const recentFrom = new Date(now.getTime() - 3 * dayMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const live = ARTICLES.filter((a) => !a.lastmod || String(a.lastmod).slice(0, 10) <= today)
  const paths = all
    ? [...STATIC.map((p) => p.path), ...live.map((a) => a.path), '/llms.txt', '/llms-full.txt']
    : [...CORE, ...live.filter((a) => a.lastmod && String(a.lastmod).slice(0, 10) >= recentFrom).map((a) => a.path)]
  return [...new Set(paths)].map((p) => SITE + p)
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' })
  const all = weekday === 'Mon' || req.query?.all === '1'
  const urlList = pickUrls(now, all)
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    })
    res.status(200).json({ submitted: urlList.length, full: all, status: r.status })
  } catch (e) {
    res.status(200).json({ submitted: 0, error: String(e?.message || e) })
  }
}
