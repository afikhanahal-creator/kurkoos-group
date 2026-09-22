/* ============================================================
   בדיקת תקינות ניתוב, רצה בסוף כל build.
   מוודאת שהקונפיגורציה של Vercel לא תגרום שוב ל-404 בעמודי
   ה-SPA (אדמין, פרויקטים, אודות...). אם אחת הבדיקות נכשלת,
   ה-build נכשל ו-Vercel לא מעלה את הגרסה השבורה, הגרסה
   התקינה הקודמת נשארת באוויר.
   ============================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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
if (!existsSync(join(root, 'api', '[fn].js'))) fail('api/[fn].js לא קיים — כל ה-API של האתר יחזיר 404.')

/* 4. ה-rewrite של מפת האתר במקומו */
if (!(v.rewrites || []).some((r) => r.source === '/sitemap.xml' && r.destination === '/api/sitemap')) {
  fail('חסר ה-rewrite של ‎/sitemap.xml אל ‎/api/sitemap.')
}

/* 5. שער ה-API נשאר קובץ אחד.
   Vercel אורזת כל קובץ בתיקיית api לחבילת פונקציה נפרדת, וכל חבילה
   נשמרת שוב בכל deployment ונספרת במכסת ה-Function Storage. אם מישהו
   יוסיף כאן קובץ נוסף במקום להוסיף נתיב ל-ROUTES, הצריכה תזנק. */
const apiFiles = readdirSync(join(root, 'api')).filter((f) => !f.startsWith('_') && /\.(js|mjs|ts)$/.test(f))
if (apiFiles.length !== 1 || apiFiles[0] !== '[fn].js') {
  fail(
    `תיקיית api חייבת להכיל בדיוק קובץ פונקציה אחד, ‎[fn].js, ונמצאו: ${apiFiles.join(', ') || '(כלום)'}.\n` +
    '  כל קובץ נוסף כאן הוא פונקציה נוספת ב-Vercel שנשמרת מחדש בכל גרסה ומנפחת את ה-Function Storage.\n' +
    '  כדי להוסיף endpoint: הוסיפו מטפל בתיקיית server ורשמו אותו ב-ROUTES שבתוך api/[fn].js.'
  )
}

/* 6. כל נתיב שרשום בשער מצביע על מטפל שקיים בפועל */
const gateway = readFileSync(join(root, 'api', '[fn].js'), 'utf8')
for (const [, handlerPath] of gateway.matchAll(/import\('\.\.\/server\/([\w-]+\.js)'\)/g)) {
  if (!existsSync(join(root, 'server', handlerPath))) fail(`api/[fn].js מפנה אל server/${handlerPath} שלא קיים.`)
}

/* 7. תגית אימות הבעלות של Google Search Console ב-index.html.
   זו שיטת האימות הפעילה באתר, כי תחת cleanUrls כתובת ‎.html מקבלת
   הפניה 308 לפני שכבת הקבצים ו-Search Console דוחה הפניות. התגית
   עוברת מ-index.html לכל העמודים הסטטיים. אם היא נעלמת, האימות
   מתבטל וכל הדוחות נסגרים. */
{
  const idx = readFileSync(join(root, 'index.html'), 'utf8')
  const m = idx.match(/<meta\s+name="google-site-verification"\s+content="([^"]*)"/)
  if (!m) fail('חסרה תגית ה-google-site-verification ב-index.html — האימות מול Search Console יתבטל.')
  if (m[1].trim().length < 20) fail('תגית ה-google-site-verification ב-index.html ריקה או קצרה מדי.')
  const home = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
  if (!home.includes(m[1])) fail('תגית האימות לא הגיעה ל-dist/index.html.')
}

/* 8. קובץ אימות הבעלות של Google Search Console נשאר במקומו ועם התוכן המדויק.
   אם הוא נעלם או שהתוכן משתנה, האימות מתבטל וכל הדוחות נסגרים. */
const gsc = readdirSync(join(root, 'public')).filter((f) => /^google[a-z0-9]+\.html$/.test(f))
for (const f of gsc) {
  const body = readFileSync(join(root, 'public', f), 'utf8').trim()
  if (body !== `google-site-verification: ${f}`) {
    fail(`קובץ האימות public/${f} מכיל תוכן שגוי. התוכן חייב להיות בדיוק: google-site-verification: ${f}`)
  }
  if (!existsSync(join(root, 'dist', f))) fail(`קובץ האימות ${f} לא הועתק ל-dist.`)
}

console.log('✓ בדיקת ניתוב עברה: rewrite של ה-SPA תקין, cleanUrls עקבי, שער API יחיד, תוצרי build במקומם')
