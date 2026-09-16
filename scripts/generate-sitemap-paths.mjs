/* ============================================================
   מחולל נתיבי תוכן ל-sitemap — רץ אוטומטית לפני כל build.
   סורק את כל קבצי המאמרים ב-src/content/<טור>/ ומחלץ slug + תאריך,
   וכותב את הרשימה ל-api/_content-paths.js שממנו פונקציית ה-sitemap
   קוראת. כך כל מאמר חדש נכנס ל-sitemap בלי תחזוקה ידנית.
   ============================================================ */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* טור → נתיב העמוד באתר (תואם ל-Routes ב-App.jsx) */
const COLUMN_ROUTE = {
  yazamut: '/yazamut-nadlan',
  constructions: '/constructions',
  supervision: '/construction-supervision',
  brokerage: '/real-estate-guide',
  mentorguide: '/madrich-yazamim',
}

const out = []
for (const [dir, route] of Object.entries(COLUMN_ROUTE)) {
  const full = join(root, 'src', 'content', dir)
  let files = []
  try { files = readdirSync(full).filter((f) => f.endsWith('.js')) } catch { continue }
  for (const f of files) {
    const src = readFileSync(join(full, f), 'utf8')
    /* תומך בשני סגנונות הקבצים: slug: '...' וגם "slug": "..." */
    const slug = /["']?slug["']?\s*:\s*["']([^"']+)["']/.exec(src)?.[1]
    const date = /["']?date["']?\s*:\s*["']([^"']+)["']/.exec(src)?.[1]
    const published = !/["']?published["']?\s*:\s*false/.test(src)
    if (slug && published) out.push({ path: `${route}/${slug}`, lastmod: date || null })
  }
}
out.sort((a, b) => a.path.localeCompare(b.path))

const banner = '/* קובץ שנוצר אוטומטית ע"י scripts/generate-sitemap-paths.mjs — אל תערכו ידנית */\n'
writeFileSync(join(root, 'api', '_content-paths.js'), `${banner}export default ${JSON.stringify(out, null, 2)}\n`)
console.log(`sitemap paths: ${out.length} article urls written to api/_content-paths.js`)
