// Gate 4 of docs/finance/DESIGN-REVIEW-PROCESS.md: the three design audits in one run, one verdict.
// Runs after run.mjs (uses its data). Exit code 0 only when every blocking rule is clean.
//   node scripts/finance-e2e/review.mjs            all three audits, then the verdict
//   node scripts/finance-e2e/review.mjs --read     only read the last JSON results (no browser)
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = process.env.OUT || '/var/tmp/fin-shots'
const here = path.dirname(fileURLToPath(import.meta.url))
const SCRIPTS = ['visual-qa.mjs', 'ui-audit.mjs', 'design-qa.mjs']
// ui-audit rules that block a merge. `close` (the phone tab bar cells touch by design) and `offScale` (the large
// overview numbers) are reported, not blocking: see DESIGN-QA-CHECKLIST.md › "נשאר פתוח".
const BLOCKING = ['contrast', 'focus', 'noname', 'small', 'tinyText', 'lineHeight', 'motion', 'sizeAnim', 'hoverOnly', 'emoji', 'overflow']

if (!process.argv.includes('--read')) {
  for (const s of SCRIPTS) {
    console.log(`\n── ${s}`)
    const r = spawnSync(process.execPath, [path.join(here, s)], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', env: { ...process.env, LANG: 'C.UTF-8' }, timeout: 30 * 60 * 1000 })
    const lines = `${r.stdout}\n${r.stderr}`.split('\n').filter((l) => /^(FAIL|findings|routes ×|checks:|\d+\/\d+ passed)|Error/.test(l))
    console.log(lines.slice(0, 20).map((l) => `   ${l.slice(0, 220)}`).join('\n') || '   (no summary line)')
  }
}

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const rows = []
const v = read(`${OUT}/qa/visual-qa.json`)
rows.push(['פריסה (visual-qa)', !!v && !v.problems.length && v.checks.every((c) => c.pass) && !v.errors.length,
  v ? `${v.problems.length} מסכים×רוחבים עם בעיה, ${v.checks.filter((c) => !c.pass).length} בדיקות שנכשלו, ${v.errors.length} שגיאות דפדפן` : 'אין תוצאות'])
const u = read(`${OUT}/ui-audit.json`)
const uBad = u ? BLOCKING.filter((k) => u.totals[k] > 0) : []
rows.push(['נגישות ועיצוב (ui-audit)', !!u && !uBad.length, u ? (uBad.length ? uBad.map((k) => `${k}: ${u.totals[k]}`).join(', ') : `0 בכל הכללים החוסמים (close ${u.totals.close}, offScale ${u.totals.offScale} לידיעה)`) : 'אין תוצאות'])
const d = read(`${OUT}/design-qa/design-qa.json`)
const dBad = d ? d.results.filter((r) => !r.pass) : []
rows.push(['מצבים, מקלדת וכהה (design-qa)', !!d && !dBad.length, d ? (dBad.length ? dBad.map((r) => r.id).join(', ') : `${d.results.length}/${d.results.length}`) : 'אין תוצאות'])

console.log('\nשער 4 — בדיקת היישום')
for (const [name, ok, detail] of rows) console.log(`${ok ? '✅' : '❌'} ${name}: ${detail}`)
const pass = rows.every((r) => r[1])
console.log(pass ? '\nעובר. נשאר: מעבר בעין על הצילומים ואישור הבעלים.' : '\nלא עובר. מתקנים, מריצים שוב, ורק אז מבקשים אישור.')
process.exitCode = pass ? 0 : 1
