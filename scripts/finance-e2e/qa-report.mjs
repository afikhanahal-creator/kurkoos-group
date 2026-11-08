// Writes docs/finance/VISUAL-QA.md from $OUT/qa/visual-qa.json (written by visual-qa.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = `${process.env.OUT || '/var/tmp/fin-shots'}/qa`
const DOC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../docs/finance/VISUAL-QA.md')
const r = JSON.parse(fs.readFileSync(`${OUT}/visual-qa.json`, 'utf8'))
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
const ok = r.checks.filter((c) => c.pass).length
const byRoute = Object.fromEntries(r.routes.map((x) => [x, r.problems.filter((p) => p.route === x)]))

const md = `# בדיקה ויזואלית · KURKOOS FINANCE AI

נוצר אוטומטית ע״י \`scripts/finance-e2e/visual-qa.mjs\` (אחרי \`run.mjs\`, על הנתונים שהוא משאיר) ו-\`qa-report.mjs\`. תאריך: ${r.at.slice(0, 10)}.

## מה נבדק

- **${r.routes.length} מסכים × ${r.widths.length} רוחבים** (${r.widths.join(', ')} px): גלילה אופקית, רכיב שנחתך בקצה המסך, ובטלפון כפתור קטן מ-32px.
- **רשימות נפתחות ותפריטים, כל סוג בנפרד**: פתיחה, חצים ו-Enter, Escape, קליק בחוץ, חזרת פוקוס, חיפוש, "אין תוצאות", שמות ארוכים, פתיחה כלפי מעלה בתחתית המסך, גיליון תחתון בטלפון, Tab בתוך חלון.
- שגיאות JavaScript בדפדפן: **${r.errors.length}**.

## בדיקות אינטראקציה: ${ok}/${r.checks.length}

| # | בדיקה | תוצאה | |
|---|---|---|---|
${r.checks.map((c) => `| ${c.id} | ${cell(c.what)} | ${cell(c.detail)} | ${c.pass ? '✅' : '❌'} |`).join('\n')}

## מסכים ורוחבים

| מסך | ${r.widths.map((w) => `${w}`).join(' | ')} |
|---|${r.widths.map(() => '---').join('|')}|
${r.routes.map((x) => `| ${x} | ${r.widths.map((w) => (byRoute[x].some((p) => p.width === w) ? '⚠️' : '✅')).join(' | ')} |`).join('\n')}

${r.problems.length ? `### ממצאים פתוחים\n\n${r.problems.map((p) => `- **${p.route} @${p.width}px**: ${p.overflow > 0 ? `גלילה אופקית ${p.overflow}px. ` : ''}${p.cut.length ? `נחתך: ${p.cut.join(', ')}. ` : ''}${p.small.length ? `קטן מדי למגע: ${p.small.join(', ')}.` : ''}`).join('\n')}\n` : 'אין ממצאים פתוחים: אין גלילה אופקית, אין רכיב חתוך ואין כפתור קטן מדי בשום מסך ורוחב.\n'}
## צילומים

צילום של כל מסך ב-390 וב-1440 נשמר ב-\`${OUT}\` (\`<מסך>-390.png\`, \`<מסך>-1440.png\`), וגם \`dd-*\` (רשימות), \`menu-*\` (תפריט ⋮), \`dialog-*\` (חלונות) ו-\`rail-1440\` (תפריט מכווץ).
`
fs.writeFileSync(DOC, md)
console.log(`VISUAL-QA.md: ${ok}/${r.checks.length} checks, ${r.problems.length} open findings`)
