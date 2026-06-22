// ============================================================
// Vercel serverless function — sitemap.xml דינמי.
// מייצר מפת-אתר עדכנית הכוללת את כל העמודים הקבועים + כל עמוד פרויקט
// שמפורסם ב-CMS (Supabase). כך כל פרויקט חדש שנוצר במערכת מקבל path
// ונכנס אוטומטית ל-sitemap ולאינדוקס של גוגל — בלי צורך בבנייה מחדש.
//
// מופעל דרך rewrite ב-vercel.json:  /sitemap.xml -> /api/sitemap
// משתני סביבה: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (קריאה ציבורית, RLS).
// ============================================================

const SITE = 'https://www.kurkoos-group.co.il'

// עמודים קבועים (תואם ל-Routes ב-App.jsx)
const STATIC = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/projects', changefreq: 'weekly', priority: '0.9' },
  { path: '/team', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/yazamut-nadlan', changefreq: 'weekly', priority: '0.8' },
  // טור יזמות נדל"ן — כתבות (הסקריפט השבועי מוסיף נתיב חדש בכל פרסום)
  { path: '/yazamut-nadlan/tama38-pkiaa-hok-67', changefreq: 'monthly', priority: '0.7' },
  { path: '/yazamut-nadlan/bank-israel-10-90', changefreq: 'monthly', priority: '0.7' },
  { path: '/yazamut-nadlan/maslul-mahir-arvuyot', changefreq: 'monthly', priority: '0.7' },
  { path: '/constructions', changefreq: 'weekly', priority: '0.8' },
  // המדריך לתהליך הבנייה — כתבות (הסקריפט השבועי מוסיף נתיב חדש בכל פרסום)
  { path: '/constructions/tofes-4-ichlus', changefreq: 'monthly', priority: '0.7' },
  { path: '/constructions/likuei-bniya-tkufat-bedek', changefreq: 'monthly', priority: '0.7' },
  { path: '/constructions/betihut-atar-bniya', changefreq: 'monthly', priority: '0.7' },
  { path: '/construction-supervision', changefreq: 'weekly', priority: '0.8' },
  // פיקוח פרויקטים — כתבות (הסקריפט השבועי מוסיף נתיב חדש בכל פרסום)
  { path: '/construction-supervision/pikuach-yetzikat-beton', changefreq: 'monthly', priority: '0.7' },
  { path: '/construction-supervision/likuei-itum', changefreq: 'monthly', priority: '0.7' },
  { path: '/construction-supervision/mefakeach-mul-kablan', changefreq: 'monthly', priority: '0.7' },
  { path: '/real-estate-guide', changefreq: 'weekly', priority: '0.8' },
  // המדריך לרוכש ולמוכר — כתבות (הסקריפט השבועי מוסיף נתיב חדש בכל פרסום)
  { path: '/real-estate-guide/heskem-bladiyut', changefreq: 'monthly', priority: '0.7' },
  { path: '/real-estate-guide/dmei-tivuch-zchuyot', changefreq: 'monthly', priority: '0.7' },
  { path: '/real-estate-guide/iskaot-noflot', changefreq: 'monthly', priority: '0.7' },
  { path: '/careers', changefreq: 'weekly', priority: '0.6' },
  { path: '/divisions/development', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/execution', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/supervision', changefreq: 'monthly', priority: '0.8' },
  { path: '/divisions/residential', changefreq: 'monthly', priority: '0.8' },
  { path: '/accessibility', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
))

function urlTag({ loc, lastmod, changefreq, priority }) {
  return `  <url><loc>${esc(loc)}</loc>` +
    (lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : '') +
    (changefreq ? `<changefreq>${changefreq}</changefreq>` : '') +
    (priority ? `<priority>${priority}</priority>` : '') +
    `</url>`
}

module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

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
