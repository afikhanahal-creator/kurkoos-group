/* ============================================================
   תקציב גודל ל-deployment, רץ בסוף כל build.

   למה זה קיים: Vercel מחייבת אחסון ב-GB-months, כלומר גודל כפול
   מספר הימים שהוא יושב שם. כל גרסה שעולה לאוויר נשמרת ונספרת
   מחדש בכל יום. עם כשש גרסאות שמורות, כל מגה בתוצר ה-build שווה
   בערך 180 מגה-חודש בחשבון החודשי.

   החשבון מול המכסה החינמית (10 GB-months):
     19MB  × 6 גרסאות × 30 יום ≈ 3.4 GB-months   ✓ המצב היום
     30MB  × 6 גרסאות × 30 יום ≈ 5.4 GB-months   ✓ התקרה כאן
     76MB  × 6 גרסאות × 30 יום ≈ 13.7 GB-months  ✗ המצב שגרם לחריגה

   פעם אחת כבר נכנסו לכאן 23MB של WASM ו-33MB של סרטונים בלי
   ששמנו לב, וזה מה שמילא את המכסה. הבדיקה הזו מפילה את ה-build
   לפני שזה קורה שוב, כי חריגה מתגלה רק במייל מ-Vercel בסוף החודש.
   ============================================================ */
import { readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

const BUDGET_MB = 30        // מעבר לזה ה-build נכשל
const WARN_MB = 25          // מעבר לזה מתריעים בלוג
const BIG_FILE_MB = 5       // קובץ בודד גדול מזה חשוד כמעט תמיד
const MB = 1024 * 1024

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile()) out.push([full, statSync(full).size])
  }
  return out
}

let files
try { files = walk(dist) }
catch { console.error('\n✗ תקציב גודל: לא נמצאה תיקיית dist — ה-build לא הפיק תוצר.\n'); process.exit(1) }

const total = files.reduce((s, [, size]) => s + size, 0)
const totalMb = total / MB
const biggest = files.filter(([, s]) => s > BIG_FILE_MB * MB).sort((a, b) => b[1] - a[1])

const list = (rows) => rows.map(([f, s]) => `     ${(s / MB).toFixed(1)} MB  ${relative(dist, f)}`).join('\n')

if (totalMb > BUDGET_MB) {
  console.error(
    `\n✗ תקציב גודל נחרג: תוצר ה-build הוא ${totalMb.toFixed(1)} MB, התקרה היא ${BUDGET_MB} MB.\n` +
    `  בקצב הזה החשבון החודשי ב-Vercel הוא כ-${(totalMb * 6 * 30 / 1024).toFixed(1)} GB-months מתוך 10 שיש במכסה החינמית.\n` +
    (biggest.length ? `  הקבצים הכבדים:\n${list(biggest)}\n` : '') +
    '  בדקו אם משהו כבד נכנס ל-public/ בלי צורך, או אם ספרייה חדשה מכניסה WASM או מודל לתוך dist.\n' +
    '  אם הגידול מוצדק, עדכנו את BUDGET_MB בקובץ scripts/check-deploy-size.mjs.\n' +
    '  ה-deploy נעצר כדי לא לחרוג מהמכסה.\n'
  )
  process.exit(1)
}

if (biggest.length) {
  console.warn(`⚠ תקציב גודל: יש קבצים גדולים מ-${BIG_FILE_MB} MB בתוצר:\n${list(biggest)}`)
}
if (totalMb > WARN_MB) {
  console.warn(`⚠ תקציב גודל: ${totalMb.toFixed(1)} MB מתוך תקרה של ${BUDGET_MB} MB — מתקרבים, שווה לבדוק מה נוסף.`)
}

console.log(`✓ תקציב גודל: ${totalMb.toFixed(1)} MB מתוך ${BUDGET_MB} MB (כ-${(totalMb * 6 * 30 / 1024).toFixed(1)} GB-months מתוך 10 במכסה)`)
