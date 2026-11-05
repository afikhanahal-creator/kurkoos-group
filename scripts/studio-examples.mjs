// Renders the example designs of the creative department at export size into docs/creative/examples/.
// Usage: node scripts/studio-examples.mjs   (needs Playwright's Chromium; serves public/ on a free local port)
// Every fact in these briefs comes from the site's own data (src/data/villasPage.js, hodHasharonAnswer.js,
// pageFacts.js) or from the original post being redesigned. Photos are the company's own project photos.
import http from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const ROOT = 'public', OUT = 'docs/creative/examples'
const ST = 'https://filnzlnvujnlazwcxbuq.supabase.co/storage/v1/object/public/engine-media/blob/'
const photo = (id, kind, name) => ({ src: ST + id, kind, name })
const P = {
  hk1: photo('29a9d02397b00bb2681f8d104f0b0949', 'render', 'חנקין 41 · הדמיה'),
  hv1: photo('ae8f658ab4e5baae8edfc6c1bde238d3', 'aerial', 'הנרייטה סאלד 22-24 · מלמעלה'),
  hn1: photo('1649c281ddcdf770d30c21387163d5df', 'render', 'הנרייטה סאלד 22-24 · הדמיה'),
  hm2: photo('2fc9d1d9891b743df94fb9f59456d650', 'finish', 'החומש 22-24 · בנוי'),
  bg2: photo('3901ea30a5eacee7e15504c366af6f86', 'finish', 'בן גוריון 17 · בנוי'),
  rm1: photo('d5c4df2caa39537a66ce6c303577b6be', 'finish', 'רמח״ל 6-8 · בנוי'),
  sk3: photo('6264d2c18922cc8f5f3f249b0e056edb', 'interior', 'השקמים 24 · פנים'),
  kv1: photo('72212dcd99e90c59f5a918774207d109', 'site', 'חנקין 41 · באתר'),
  sketch: { src: '/divisions/humash-22-24-sketch.webp', kind: 'drawing', name: 'החומש 22-24 · שרטוט' },
  house: { src: '/divisions/humash-22-24-house.jpg', kind: 'finish', name: 'החומש 22-24 · בנוי' },
}
// [file, direction, options, brief, original post id (before image) or null]
const EXAMPLES = [
  ['01-hankin-realestate', 'realestate', { variant: 0, tone: 'paper', type: 'heavy' }, { headline: '6 דירות, 6 דיירים וחצר אחת', eyebrow: 'בניין בוטיק', location: 'חנקין 41, מגדיאל', project: 'חנקין 41', items: [{ v: '6', l: 'דירות' }, { v: '150 מ"ר', l: 'גינה' }, { v: '2', l: 'חניות לכל דירה' }], img: P.hk1, division: 'development' }, 'k306'],
  ['02-henrietta-specs', 'specs', { variant: 0, type: 'heavy' }, { headline: '3 זוויות על הנרייטה סאלד', eyebrow: 'Built by Kurkoos', items: [{ v: '8', l: 'משפחות' }, { v: '380 מ"ר', l: 'מגרש בטאבו' }, { v: '3×6', l: 'בריכה לכל בית' }, { v: '3', l: 'מפלסים' }], img: P.hv1, location: 'מערב הוד השרון', division: 'development' }, 'munouzmvbx'],
  ['03-humash-typographic', 'typographic', { variant: 0, tone: 'paper', type: 'heavy' }, { headline: 'ונהפוך הוא? לא בסדר העבודות.', sub: 'בפורים הכול מתהפך. באתר יש סדר שלא משנים.', eyebrow: 'סדר עבודה', division: 'raita' }, 'mv1witfpzhg'],
  ['04-henrietta-launch', 'launch', { variant: 0, type: 'heavy' }, { headline: '8 משפחות, 4 בתים. ומה עם הרחוב?', eyebrow: 'מספרים מהשטח', location: 'הנרייטה סאלד 22-24, הוד השרון', img: P.hn1, division: 'development' }, 'mv28pyqk3r7'],
  ['05-supervision-edu', 'edu', { variant: 0, type: 'editorial' }, { headline: 'ביקורי מפקח: כמה זה מספיק?', eyebrow: 'שאלה מהשטח', cta: 'כתבו "פיקוח" ונשלח את הרשימה', items: [{ v: 'לפני יציקה', l: 'ברזל, כיסוי, שרוולים.' }, { v: 'לפני סגירת קירות', l: 'צנרת, חשמל, בדיקות לחץ.' }, { v: 'לפני ריצוף', l: 'איטום, שיפועים, בדיקת הצפה.' }, { v: 'לפני מסירה', l: 'סיור ורשימה.' }], division: 'shchinta' }, 'mv28q06ht0p'],
  ['06-tofes4-editorial', 'editorial', { variant: 1, tone: 'paper', type: 'editorial' }, { headline: 'הדירה גמורה, והמפתח עדיין לא אצלכם?', sub: 'למה דירה גמורה עומדת ריקה, ואיך מקצרים את הדרך לאכלוס.', eyebrow: 'טופס 4', location: 'מדריך לרוכשים', img: { ...P.hk1, ...{ src: ST + '4d7b15c93f5b643dbf6884edc6fa8f3c', kind: 'render', name: 'זרובבל 15 · הדמיה' } }, division: 'afik' }, 'c27mvl4k4rf783'],
  ['07-humash-beforeafter', 'beforeafter', { variant: 1, type: 'heavy' }, { headline: 'החומש 22-24: מהשרטוט אל הבית הגמור', img: P.house, img2: P.sketch, division: 'development' }, null],
  ['08-henrietta-authority', 'authority', { variant: 0, tone: 'navy', type: 'heavy' }, { headline: 'הנרייטה סאלד 22-24 במספרים', eyebrow: 'בבנייה', items: [{ v: '4', l: 'יחידות דו משפחתיות' }, { v: '8', l: 'משפחות' }, { v: '380', l: 'מ"ר מגרש בטאבו לכל יחידה' }, { v: '3', l: 'מפלסים בכל בית' }], division: 'development' }, null],
  ['09-ramhal-fullbleed', 'fullbleed', { variant: 0, type: 'heavy' }, { headline: 'מקרקע ועד מסירת מפתח', eyebrow: 'רמח״ל 6-8', img: P.rm1, division: 'development' }, null],
  ['10-shikmim-lifestyle', 'lifestyle', { variant: 0, type: 'light' }, { headline: 'בית שמתחיל באור של הבוקר', eyebrow: 'השקמים 24', img: P.sk3, division: 'development' }, null],
  ['11-hankin-progress', 'progress', { variant: 0, type: 'heavy' }, { headline: 'חנקין 41: בוטיק של שש דירות במגדיאל', sub: 'בניין בוטיק בשכונה ותיקה ומבוקשת, עם גישה מהירה לכבישים 531 ו-40.', eyebrow: 'בבנייה', location: 'מגדיאל, הוד השרון', img: P.kv1, division: 'raita' }, null],
  ['12-group-corporate', 'corporate', { variant: 0, tone: 'navy', type: 'heavy' }, { headline: 'ארבע חטיבות. כתובת אחת.', sub: 'יזמות, בנייה וביצוע, פיקוח וניהול, ותיווך ושיווק. מקרקע ועד מסירת מפתח.', eyebrow: 'קבוצת קורקוס', division: 'development' }, null],
]
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const server = http.createServer((q, r) => {
  let f = join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html')
  if (!existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${server.address().port}`
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const page = await b.newPage()
page.on('pageerror', (e) => console.error('page error', e.message))
await page.goto(base + '/engine/studio/render.html')
await page.waitForFunction('window.studioReady', null, { timeout: 60000 })
// JPEG keeps the repository light; the studio itself exports PNG and JPEG
await page.evaluate(() => { window.studio.mime = 'image/jpeg' })
const report = []
for (const [file, dir, opts, brief] of EXAMPLES) {
  const r = await page.evaluate(([c, d, o]) => studio.one(c, 'feed', d, o), [brief, dir, opts])
  r.pngs.forEach((u, i) => writeFileSync(`${OUT}/${file}${r.pngs.length > 1 ? '-' + String(i + 1).padStart(2, '0') : ''}.jpg`, Buffer.from(u.split(',')[1], 'base64')))
  const rv = r.scene.review
  report.push(`| ${file} | ${dir} | ${rv.total} | ${rv.approved ? 'עבר' : 'לא עבר'} | ${rv.minContrast}:1 | ${rv.issues.map((i) => i.msg).join('; ') || '-'} |`)
  console.log(file, dir, rv.total, rv.approved ? 'OK' : 'FAIL')
}
writeFileSync(`${OUT}/REVIEW.md`, `# ביקורת אוטומטית של הדוגמאות\n\nנוצר ב-${new Date().toISOString().slice(0, 10)} על ידי scripts/studio-examples.mjs, בגודל ייצוא 1080×1350 (נשמר כ-JPEG כדי לשמור על ריפו קל; הסטודיו מייצא PNG ו-JPEG).\n\n| קובץ | כיוון | ציון | סטטוס | ניגודיות מינימלית | הערות |\n|---|---|---|---|---|---|\n${report.join('\n')}\n`)
await b.close(); server.close()
