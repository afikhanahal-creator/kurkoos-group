// Load test (local stack only, after run.mjs): adds N synthetic documents, then measures the documents API (all
// columns vs the list columns), the overview computation, and the browser (overview and documents screens).
// node scripts/finance-e2e/load.mjs 10000   → writes $OUT/load-<N>.json. Synthetic rows are marked email_subject='LOAD'.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { ANON } from './keys.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const N = Number(process.argv[2] || 10000)
const OUT = process.env.OUT || '/var/tmp/fin-shots'
const SB = 'http://127.0.0.1:54321'; const APP = 'http://127.0.0.1:5180/admin/finance'
const sql = (q) => execSync('psql -At -q -h 127.0.0.1 -p 54329 -U postgres -v ON_ERROR_STOP=1 -f -', { input: q, encoding: 'utf8' }).trim()

sql("delete from fin_documents where email_subject='LOAD'")
const have = Number(sql('select count(*) from fin_documents'))
// realistic rows: a few companies, suppliers and categories, 18 months of dates, an extraction blob like a real reading
sql(`insert into fin_documents (business_id, supplier_name, supplier_vat_id, doc_type, doc_number, issue_date, currency, amount_before_vat, vat_amount, total_amount, category, status, source, email_subject, file_name, file_hash, extraction, field_confidence, confidence, issues, processed_at)
select (select id from fin_businesses order by random() limit 1), 'ספק ' || (g % 120), lpad((510000000 + g % 120)::text, 9, '0'),
  (array['invoice','invoice_receipt','receipt','invoice','supplier_bill'])[1 + g % 5], 'L-' || g, current_date - (g % 540),
  'ILS', round((100 + (g * 37) % 9000)::numeric, 2), round((100 + (g * 37) % 9000) * 0.18, 2), round((100 + (g * 37) % 9000) * 1.18, 2),
  (array['חומרי בניין','קבלני משנה','חשמל','שירותים מקצועיים','הוצאות משרד','הובלות'])[1 + g % 6],
  (array['review','approved','sent','approved'])[1 + g % 4], 'upload', 'LOAD', 'load-' || g || '.pdf', md5('load' || g || random()),
  jsonb_build_object('supplier_name', 'ספק ' || (g % 120), 'notes', repeat('טקסט שחולץ מהמסמך ', 40), 'totals_text', repeat('סה״כ 1,180.00 ', 10), 'verification', jsonb_build_object('second', jsonb_build_object('total_amount', 1180), 'disagree', '[]'::jsonb)),
  '{"supplier_name":0.97,"total_amount":0.96,"vat_amount":0.95}'::jsonb, 0.95, '[]'::jsonb, now()
from generate_series(1, ${N}) g`)
const total = Number(sql('select count(*) from fin_documents'))
const token = (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kurkoos.test', password: 'Passw0rd!x' }) }).then((r) => r.json())).access_token

async function fetchAll(cols) {
  const t0 = performance.now(); let bytes = 0; let rows = 0
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${SB}/rest/v1/fin_documents?select=${cols}&order=created_at.desc,id.asc&limit=1000&offset=${off}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } })
    const t = await r.text(); bytes += t.length; const n = JSON.parse(t).length; rows += n
    if (n < 1000) break
  }
  return { ms: Math.round(performance.now() - t0), mb: +(bytes / 1048576).toFixed(2), rows }
}
const api = fs.readFileSync(new URL('../../src/pages/finance/api.js', import.meta.url), 'utf8')
const LIST = /const DOC_COLUMNS = '([^']+)'/.exec(api)[1]
const star = await fetchAll('*')
const slim = await fetchAll(LIST)

// the overview computation, as the browser runs it
const { markLedger } = await import('../../src/pages/finance/ledger.js')
const { overview, periodOf } = await import('../../src/pages/finance/insights.js')
const docs = []
for (let off = 0; ; off += 1000) { const p = await fetch(`${SB}/rest/v1/fin_documents?select=${LIST}&order=id&limit=1000&offset=${off}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }).then((x) => x.json()); docs.push(...p); if (p.length < 1000) break }
const ctx = { businesses: JSON.parse(sql("select coalesce(json_agg(json_build_object('id',id,'name',name)),'[]') from fin_businesses")), projects: [], categories: [], allocations: [] }
let t0 = performance.now(); markLedger(docs); const ledgerMs = Math.round(performance.now() - t0)
t0 = performance.now(); const o = overview(docs, ctx, periodOf('ytd')); const overviewMs = Math.round(performance.now() - t0)

// the browser: sign in, time the overview number and the documents table
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(APP); await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x')
t0 = performance.now(); await page.click('button[type=submit]')
await page.waitForSelector('.fin-x-big', { timeout: 120000 }); const overviewScreen = Math.round(performance.now() - t0)
t0 = performance.now(); await page.locator('.fin__nav-item', { hasText: 'כל המסמכים' }).first().click()
await page.waitForSelector('.fin-table tbody tr', { timeout: 120000 }); const docsScreen = Math.round(performance.now() - t0)
const domRows = await page.locator('.fin-table tbody tr').count()
t0 = performance.now(); await page.locator('.fin-search input').fill('ספק 7'); await page.waitForTimeout(50); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); const searchMs = Math.round(performance.now() - t0)
const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null))
await b.close()
const res = { documents: total, synthetic: N, existing: have, api_all_columns: star, api_list_columns: slim, ledger_ms: ledgerMs, overview_ms: overviewMs, ytd_total: Math.round(o.kpi.ytd), browser: { overview_after_login_ms: overviewScreen, documents_screen_ms: docsScreen, rows_in_dom: domRows, search_ms: searchMs, js_heap_mb: heap } }
fs.writeFileSync(`${OUT}/load-${N}.json`, JSON.stringify(res, null, 1))
console.log(JSON.stringify(res))
if (process.env.KEEP !== '1') sql("delete from fin_documents where email_subject='LOAD'")
