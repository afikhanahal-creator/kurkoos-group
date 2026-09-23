// ============================================================
// Vercel serverless function — sitemap.xml דינמי.
// מייצר מפת-אתר עדכנית הכוללת את כל העמודים הקבועים + כל עמוד פרויקט
// שמפורסם ב-CMS (Supabase). כך כל פרויקט חדש שנוצר במערכת מקבל path
// ונכנס אוטומטית ל-sitemap ולאינדוקס של גוגל — בלי צורך בבנייה מחדש.
//
// מופעל דרך rewrite ב-vercel.json:  /sitemap.xml -> /api/sitemap
// משתני סביבה: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (קריאה ציבורית, RLS).
// ============================================================

import CONTENT_PATHS from './_content-paths.js'

const SITE = 'https://www.kurkoos-group.co.il'

// עמודים קבועים (תואם ל-Routes ב-App.jsx)
const STATIC = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/projects', changefreq: 'weekly', priority: '0.9' },
  { path: '/team', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/yazamut-nadlan', changefreq: 'weekly', priority: '0.8' },
  { path: '/constructions', changefreq: 'weekly', priority: '0.8' },
  { path: '/construction-supervision', changefreq: 'weekly', priority: '0.8' },
  { path: '/real-estate-guide', changefreq: 'weekly', priority: '0.8' },
  { path: '/real-estate-glossary', changefreq: 'monthly', priority: '0.8' },
  { path: '/real-estate-sharon', changefreq: 'monthly', priority: '0.9' },
  { path: '/villas-sharon', changefreq: 'monthly', priority: '0.9' },
  { path: '/real-estate-calculators', changefreq: 'monthly', priority: '0.8' },
  { path: '/livy-yazamim', changefreq: 'monthly', priority: '0.8' },
  { path: '/madrich-yazamim', changefreq: 'weekly', priority: '0.8' },
  { path: '/careers', changefreq: 'weekly', priority: '0.6' },
  { path: '/divisions/development', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/execution', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/supervision', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/brokerage', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/residential', changefreq: 'monthly', priority: '0.8' },
  { path: '/accessibility', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

/* כתבות הטורים — נוצר אוטומטית בזמן build מ-src/content (ראו scripts/generate-sitemap-paths.mjs) */
const ARTICLES = CONTENT_PATHS.map((a) => ({
  path: a.path, lastmod: a.lastmod, changefreq: 'monthly', priority: '0.7',
}))

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
))

/* ---------- איסוף תמונות לסייטמאפ התמונות ----------
   ערך תמונה ב-CMS מגיע בכמה צורות: כתובת פשוטה, מחרוזת JSON, אובייקט
   {src|url|image_url}, אובייקט עם גרסאות mobile/desktop, מערך (גלריה),
   או קבוצות גלריה [{label, images:[...]}]. במקום לנחש מבנה, עוברים
   רקורסיבית על הערך ואוספים כל מחרוזת שנראית ככתובת תמונה. */
const IMG_RE = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i
const IMG_HOST_RE = /res\.cloudinary\.com|\/storage\/v1\/object\/public\//i
function collectImages(value, out = new Set(), depth = 0) {
  if (value == null || depth > 6 || out.size >= 1000) return out
  if (typeof value === 'string') {
    const s = value.trim()
    if (s.startsWith('{') || s.startsWith('[')) {
      try { return collectImages(JSON.parse(s), out, depth + 1) } catch { /* לא JSON */ }
    }
    if ((s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) &&
        (IMG_RE.test(s) || IMG_HOST_RE.test(s))) {
      out.add(s.startsWith('/') ? `${SITE}${s}` : s)
    }
    return out
  }
  if (Array.isArray(value)) { for (const v of value) collectImages(v, out, depth + 1); return out }
  if (typeof value === 'object') { for (const v of Object.values(value)) collectImages(v, out, depth + 1) }
  return out
}

function urlTag({ loc, lastmod, changefreq, priority }) {
  return `  <url><loc>${esc(loc)}</loc>` +
    (lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : '') +
    (changefreq ? `<changefreq>${changefreq}</changefreq>` : '') +
    (priority ? `<priority>${priority}</priority>` : '') +
    `</url>`
}

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  /* שלוש הגשות ב-Search Console מאותה פונקציה:
       /sitemap.xml           אינדקס שמפנה לשני הקבצים שמתחת
       /sitemap-pages.xml     עמודי האתר והפרויקטים (המסחריים)
       /sitemap-articles.xml  כתבות הטורים והמדריכים
     הפיצול לא משנה דירוג. הוא נותן דוח כיסוי נפרד לכל חלק, כדי לראות אם
     דווקא העמודים המסחריים נתקעים בלי שזה נבלע בתוך עשרות הכתבות.
     כל כתובת מופיעה בדיוק בקובץ אחד, ולכן אין כאן כפילות. */
  const part = String((req.query && req.query.part) || '').toLowerCase()

  if (!part) {
    const lastmod = new Date().toISOString().slice(0, 10)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      ['/sitemap-pages.xml', '/sitemap-articles.xml', '/sitemap-images.xml']
        .map((p) => `  <sitemap><loc>${SITE}${p}</loc><lastmod>${lastmod}</lastmod></sitemap>`)
        .join('\n') +
      `\n</sitemapindex>\n`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400')
    res.status(200).send(xml)
    return
  }

  /* סייטמאף תמונות: מפרט לכל עמוד פרויקט את התמונות שבו, כדי שהן ייכנסו
     לחיפוש התמונות של גוגל. גוגל תומך היום ב-image:loc בלבד, ולכן אין כאן
     כותרות או כיתובים: מה שמתאר את התמונה הוא ה-alt בעמוד עצמו. */
  if (part === 'images') {
    let rows = []
    if (SUPABASE_URL && ANON_KEY) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/projects?is_published=eq.true&is_archived=eq.false` +
          `&select=slug,hero_image_url,about_image_url,gallery,gallery_groups,plan_groups,environment&order=sort_order.asc`,
          { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
        )
        if (r.ok) rows = await r.json()
      } catch { /* ה-CMS לא זמין — מחזירים סייטמאפ ריק ותקין */ }
    }
    const urls = rows
      .filter((p) => p && p.slug)
      .map((p) => {
        const imgs = [...collectImages(p)].slice(0, 1000)
        if (!imgs.length) return ''
        return `  <url><loc>${esc(`${SITE}/projects/${p.slug}`)}</loc>\n` +
          imgs.map((u) => `    <image:image><image:loc>${esc(u)}</image:loc></image:image>`).join('\n') +
          `\n  </url>`
      })
      .filter(Boolean)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      urls.join('\n') + (urls.length ? '\n' : '') + `</urlset>\n`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400')
    res.status(200).send(xml)
    return
  }

  if (part === 'articles') {
    const rows = ARTICLES.map((a) => urlTag({
      loc: `${SITE}${a.path}`, lastmod: a.lastmod || undefined, changefreq: a.changefreq, priority: a.priority,
    }))
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + rows.join('\n') + `\n</urlset>\n`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400')
    res.status(200).send(xml)
    return
  }

  // עמודי פרויקטים מפורסמים מה-CMS (קריאה ציבורית תחת RLS)
  let projects = []
  if (SUPABASE_URL && ANON_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?is_published=eq.true&is_archived=eq.false&select=slug,updated_at&order=updated_at.desc`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      )
      if (r.ok) projects = await r.json()
    } catch { /* אם ה-CMS לא זמין — נחזיר לפחות את העמודים הקבועים */ }
  }

  // part === 'pages' — עמודי האתר והפרויקטים, בלי הכתבות
  const today = new Date().toISOString().slice(0, 10)
  const rows = [
    ...STATIC.map((s) => urlTag({ loc: `${SITE}${s.path}`, changefreq: s.changefreq, priority: s.priority })),
    ...projects
      .filter((p) => p && p.slug)
      .map((p) => urlTag({
        loc: `${SITE}/projects/${p.slug}`,
        lastmod: (p.updated_at ? String(p.updated_at).slice(0, 10) : today),
        changefreq: 'monthly',
        priority: '0.7',
      })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows.join('\n') + `\n</urlset>\n`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  // קאש קצר ב-CDN: מתעדכן מהר כשנוצר פרויקט, בלי להעמיס על Supabase
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
