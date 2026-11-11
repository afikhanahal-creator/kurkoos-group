// Rewrites the results table in docs/finance/TESTING.md from $OUT/results.json (written by run.mjs).
// node scripts/finance-e2e/report.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = process.env.OUT || '/var/tmp/fin-shots'
const DOC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../docs/finance/TESTING.md')
const { at, results } = JSON.parse(fs.readFileSync(`${OUT}/results.json`, 'utf8'))
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim().slice(0, 400)
const passed = results.filter((r) => r.pass).length
const table = [
  '| # | תרחיש | צפוי | בפועל | |',
  '|---|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${cell(r.name)} | ${cell(r.expected)} | ${cell(r.actual)} | ${r.pass ? '✅' : '❌'} |`),
].join('\n')

let doc = fs.readFileSync(DOC, 'utf8')
doc = doc.replace(/## תוצאות \([^)]*\): \d+\/\d+/, `## תוצאות (${at.slice(0, 10)}): ${passed}/${results.length}`)
const start = doc.indexOf('| # | תרחיש |')
const end = doc.indexOf('\n\n', start)
if (start < 0 || end < 0) throw new Error('results table not found in TESTING.md')
doc = `${doc.slice(0, start)}${table}${doc.slice(end)}`
fs.writeFileSync(DOC, doc)
console.log(`TESTING.md: ${passed}/${results.length}`)
