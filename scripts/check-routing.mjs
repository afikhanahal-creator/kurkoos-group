/* ============================================================
   בדיקת תקינות ניתוב, רצה בסוף כל build.
   מוודאת שהקונפיגורציה של Vercel לא תגרום שוב ל-404 בעמודי
   ה-SPA (אדמין, פרויקטים, אודות...). אם אחת הבדיקות נכשלת,
   ה-build נכשל ו-Vercel לא מעלה את הגרסה השבורה, הגרסה
   התקינה הקודמת נשארת באוויר.
   ============================================================ */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => { console.error(`\n✗ בדיקת ניתוב נכשלה: ${msg}\n  ה-deploy נעצר כדי לא להפיל עמודים באתר.\n`); process.exit(1) }

let v
try { v = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) }
catch (e) { fail(`vercel.json אינו JSON תקין (${e.message})`) }

/* 1. חייב להיות rewrite כללי שתופס את כל נתיבי ה-SPA (חוץ מ-api) */
const spa = (v.rewrites || []).find((r) => r.source === '/((?!api/).*)')
if (!spa) fail('חסר ה-rewrite הכללי של ה-SPA — source: "/((?!api/).*)". בלעדיו כל עמוד ללא קובץ סטטי יחזיר 404.')

/* 2. כש-cleanUrls פעיל, יעד שמסתיים ב-.html אינו נגיש ב-Vercel → 404 בכל האתר */
if (v.cleanUrls && (v.rewrites || []).some((r) => r.destination?.endsWith('.html'))) {
  fail('cleanUrls פעיל אבל יש rewrite שמצביע על קובץ ‎.html — תחת cleanUrls היעד חייב להיות "/" (זו בדיוק התקלה שהפילה את האדמין).')
}
if (spa.destination !== '/' && spa.destination !== '/index.html') {
  fail(`יעד ה-rewrite של ה-SPA הוא "${spa.destination}" — צפוי "/" (עם cleanUrls) או "/index.html" (בלעדיו).`)
}
if (!v.cleanUrls && spa.destination === '/') {
  /* בלי cleanUrls היעד "/" עלול שלא להיפתר לקובץ — מיישרים לקונפיגורציה מוכרת */
  fail('cleanUrls כבוי אבל יעד ה-rewrite הוא "/" — או להפעיל cleanUrls או להחזיר את היעד ל-"/index.html".')
}

/* 3. תוצרי ה-build הקריטיים קיימים */
if (!existsSync(join(root, 'dist', 'index.html'))) fail('dist/index.html לא קיים — ה-build לא הפיק את עמוד הבסיס.')
if (!existsSync(join(root, 'dist', 'robots.txt'))) fail('dist/robots.txt לא קיים.')
if (!existsSync(join(root, 'api', 'sitemap.js'))) fail('api/sitemap.js לא קיים — מפת האתר תישבר.')

/* 4. ה-rewrite של מפת האתר במקומו */
if (!(v.rewrites || []).some((r) => r.source === '/sitemap.xml' && r.destination === '/api/sitemap')) {
  fail('חסר ה-rewrite של ‎/sitemap.xml אל ‎/api/sitemap.')
}

console.log('✓ בדיקת ניתוב עברה: rewrite של ה-SPA תקין, cleanUrls עקבי, תוצרי build במקומם')
