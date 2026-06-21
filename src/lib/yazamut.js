/* ============================================================
   טור יזמות נדל"ן — טעינת כתבות.
   כל כתבה היא קובץ נפרד תחת src/content/yazamut/*.js (מודול שמייצא
   אובייקט כתבה). הסוכן השבועי פשוט כותב קובץ חדש — וההטענה כאן
   (import.meta.glob) קולטת אותו אוטומטית בבנייה הבאה, בלי לגעת בקוד.

   מבנה כתבה:
   { slug, title, date 'YYYY-MM-DD', author, authorTitle, category,
     tags[], cover, coverAlt, excerpt, readingTime, published, body(md) }

   כלל פרסום: מוצגות רק כתבות published !== false שתאריכן <= היום,
   כך שכתבה מתוזמנת קדימה "יושבת רדומה" עד יום ראשון שלה.
   ============================================================ */
const modules = import.meta.glob('../content/yazamut/*.js', { eager: true })

const all = Object.values(modules)
  .map((m) => m.default)
  .filter(Boolean)

export function getArticles() {
  const now = Date.now()
  return all
    .filter((a) => a.published !== false && new Date(a.date).getTime() <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getArticle(slug) {
  return all.find((a) => a.slug === slug) || null
}

export function getCategories() {
  return [...new Set(getArticles().map((a) => a.category).filter(Boolean))]
}
