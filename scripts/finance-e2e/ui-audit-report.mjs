// Turns $OUT/ui-audit.json (from ui-audit.mjs) into docs/finance/UI-AUDIT.md: one table of findings per rule, light and
// dark, desktop and phone, with the distinct offenders, so a regression is a diff in git.  node scripts/finance-e2e/ui-audit-report.mjs
import fs from 'node:fs'
const OUT = process.env.OUT || '/var/tmp/fin-shots'
const r = JSON.parse(fs.readFileSync(`${OUT}/ui-audit.json`, 'utf8'))
const RULES = [
  ['contrast', 'ניגודיות טקסט מתחת ל-4.5:1 (3:1 לכותרות)', (f) => `${f.el} "${f.text}" ${f.ratio}:1`],
  ['focus', 'טבעת פוקוס שהוסרה', (f) => f.el],
  ['noname', 'כפתור בלי שם נגיש', (f) => f.el],
  ['small', 'יעד מגע מתחת ל-44×44 בטלפון', (f) => `${f.el} "${f.name}" ${f.w}×${f.h}`],
  ['close', 'שני יעדים במרחק קטן מ-8px', (f) => `${f.a} ↔ ${f.b} (${f.gap}px)`],
  ['tinyText', 'טקסט מתחת ל-12px', (f) => `${f.el} ${f.size}px`],
  ['offScale', 'גודל גופן מחוץ לסולם', (f) => `${f.el} ${f.size}px`],
  ['lineHeight', 'גובה שורה מתחת ל-1.3 בטקסט רץ', (f) => `${f.el} ${f.lineHeight}`],
  ['motion', 'משך מעבר מחוץ ל-100–450ms', (f) => `${f.el} ${f.duration}`],
  ['sizeAnim', 'אנימציה של רוחב/גובה', (f) => `${f.el} ${f.props}`],
  ['hoverOnly', 'תוכן שנחשף רק בריחוף', (f) => String(f)],
  ['emoji', 'אמוג׳י כאייקון', (f) => `${f.el} ${f.text}`],
]
const ctx = (x) => `${x.route}@${x.width}${x.theme === 'dark' ? ' כהה' : ''}`
let md = `# בדיקת ממשק לפי כללי ui-ux-pro-max\n\nנמדד בדפדפן ב-${new Date(r.at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}: ${new Set(r.results.map((x) => x.route)).size} מסכים × בהיר/כהה × 1440px/390px (${r.results.length} צירופים). הסקריפט: \`scripts/finance-e2e/ui-audit.mjs\`.\n\n| כלל | ממצאים | מסכים נגועים |\n|---|---|---|\n`
for (const [k, label] of RULES) { const n = r.results.reduce((s, x) => s + (x[k]?.length || 0), 0); const scr = new Set(r.results.filter((x) => x[k]?.length).map(ctx)); md += `| ${label} | ${n} | ${scr.size} |\n` }
md += `| גלילה אופקית | ${r.results.filter((x) => x.overflow > 0).length} | ${r.results.filter((x) => x.overflow > 0).map(ctx).join(', ') || '—'} |\n`
for (const [k, label, fmt] of RULES) {
  const m = new Map()
  for (const x of r.results) for (const f of x[k] || []) { const id = fmt(f); const e = m.get(id) || { n: 0, where: new Set() }; e.n++; e.where.add(ctx(x)); m.set(id, e) }
  if (!m.size) continue
  md += `\n## ${label} (${m.size} שונים)\n\n| ממצא | פעמים | למשל |\n|---|---|---|\n`
  for (const [id, e] of [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 40)) md += `| ${id.replace(/\|/g, '\\|')} | ${e.n} | ${[...e.where].slice(0, 3).join(', ')} |\n`
}
md += `\n## חריגים מכוונים\n\n- קישורי טקסט בתוך שורה (\`.fin-cell-btn\`, \`.fin-link\`) לא נמדדים כיעד מגע: השורה שמכילה אותם היא היעד, בגובה 44px ומעלה.\n- שורות רשימה שגובהן 44px ומעלה שנערמות בלי רווח (תפריט, רשימות) לא נספרות כ"קרובות מדי": הרווח נועד ליעדים קטנים.\n- המספר הראשי בסקירה הפיננסית (3.1rem) נשאר מחוץ לסולם בכוונה.\n`
fs.mkdirSync('docs/finance', { recursive: true })
fs.writeFileSync('docs/finance/UI-AUDIT.md', md)
console.log('UI-AUDIT.md:', JSON.stringify(Object.fromEntries(RULES.map(([k]) => [k, r.results.reduce((s, x) => s + (x[k]?.length || 0), 0)]))))
