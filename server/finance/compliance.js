/* The compliance agent's two nightly jobs (both also run on demand from the compliance screen).

   1. complianceAudit: runs the one compliance check (src/pages/finance/compliance.js, the same code the screens use)
      over every document and records what changed since the last run: a line in the audit trail per document whose
      answer moved, with the previous and the new status, the open points and the rules (with their versions) it was
      checked against. Nothing on a document is changed and nothing is approved.

   2. watchSources: reads the official pages the rules come from (taxRules.js, WATCH) and compares them to the last
      reading. A page that changed, or that no longer shows the value a rule relies on, raises a note for the system's
      manager and marks the rules that hang on it "needs a check". It never changes a rule: a change in the law is
      entered by a person, with its source and its date. A page that could not be read is said so, with the date of
      the last successful reading; it is never shown as verified now.

   No new table: the state lives in fin_settings ("tax_audit_state", "tax_audit_last", "tax_watch_state",
   "tax_rules_confirmed") and every event is a line in fin_audit. */
import crypto from 'node:crypto'
import { sb, one, patch, insert, audit } from './db.js'
import { auditCompliance } from '../../src/pages/finance/compliance.js'
import { ENGINE_VERSION, RULES, WATCH } from '../../src/pages/finance/taxRules.js'
import { markLedger } from '../../src/pages/finance/ledger.js'

const COLS = 'id,status,doc_type,total_amount,amount_before_vat,vat_amount,currency,supplier_name,supplier_vat_id,supplier_id,business_id,category,category_id,issue_date,email_date,created_at,accounting_period,doc_number,duplicate_of,duplicate_state,description,payment_method,paid,confidence,exported_at,allocation_number:extraction->>allocation_number'
async function all(path) {
  const out = []
  for (let from = 0; from < 100000; from += 1000) { const rows = (await sb(`${path}${path.includes('?') ? '&' : '?'}order=id.asc&offset=${from}&limit=1000`)) || []; out.push(...rows); if (rows.length < 1000) break }
  return out
}
const setting = async (key) => (await one(`fin_settings?key=eq.${key}&select=value`))?.value ?? null
async function saveSetting(key, value) {
  const body = { value, updated_at: new Date().toISOString() }
  const done = await patch(`fin_settings?key=eq.${key}`, body).catch(() => null)
  if (!done || (Array.isArray(done) && !done.length)) await insert('fin_settings', { key, ...body })
}
const todayIL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
const brief = (c) => ({ h: c.hash, status: c.status, open: c.checks.filter((x) => x.level === 'error' || x.level === 'doubt').map((x) => x.code), income: c.income.amount, vat: r2((c.vat.eligible || 0) + (c.vat.potential || 0)) })
const r2 = (v) => Math.round(v * 100) / 100

export async function complianceAudit({ trigger = 'manual', user = null } = {}) {
  const started = new Date().toISOString()
  try {
    const [documents, categories] = await Promise.all([all(`fin_documents?select=${COLS}`), all('fin_categories?select=id,name,vat_deductible_pct')])
    markLedger(documents)
    const { rows, totals } = auditCompliance(documents, { categories, today: todayIL() })
    const before = (await setting('tax_audit_state')) || {}
    const first = !Object.keys(before).length
    const state = {}; const changed = []
    for (const { doc, c } of rows) {
      if (c.status === 'excluded' || c.status === 'reading') continue
      const now = brief(c); state[doc.id] = now
      const was = before[doc.id]
      if (!was || was.h !== now.h) changed.push({ id: doc.id, was: was || null, now, doc, c })
    }
    // the first run is the full historical check: one summary line, not a line per document
    if (!first) for (const x of changed.slice(0, 500)) {
      await audit('document', x.id, 'tax_checked', { previous: x.was ? { status: x.was.status, open: x.was.open } : null, current: { status: x.now.status, open: x.now.open, income_recognised: x.now.income, vat_offset: x.now.vat }, rules: x.c.rules.map((r) => `${r.id}@${r.version}`), engine: ENGINE_VERSION }, user).catch(() => {})
    }
    const report = {
      at: started, finished: new Date().toISOString(), trigger, engine: ENGINE_VERSION, ok: true, first,
      checked: Object.keys(state).length, changed: changed.length, new_documents: changed.filter((x) => !x.was).length, totals,
      flagged: changed.filter((x) => x.now.open.length && (!x.was || x.was.open.join() !== x.now.open.join())).slice(0, 40).map((x) => ({ id: x.id, supplier: x.doc.supplier_name || '', number: x.doc.doc_number || '', status: x.now.status, open: x.now.open })),
    }
    await saveSetting('tax_audit_state', state)
    await saveSetting('tax_audit_last', report)
    await audit('document', null, 'tax_check_run', { trigger, checked: report.checked, changed: report.changed, flagged: totals.flagged, fix: totals.fix, accountant: totals.accountant, engine: ENGINE_VERSION }, user).catch(() => {})
    return report
  } catch (e) {
    const report = { at: started, finished: new Date().toISOString(), trigger, engine: ENGINE_VERSION, ok: false, error: String(e.message || e).slice(0, 300) }
    await saveSetting('tax_audit_last', report).catch(() => {})
    await audit('document', null, 'tax_check_failed', { trigger, error: report.error }, user).catch(() => {})
    return report
  }
}

// ---------- the watch over the official sources ----------
// the words of a page, without markup, scripts and the parts that change on every load
const textOf = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#\d+;|&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
const hashOf = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 32)
const urlOf = (w) => (process.env.FINANCE_TAX_WATCH ? `${process.env.FINANCE_TAX_WATCH.replace(/\/$/, '')}/${w.id}` : w.url)   // the test stand-in

async function readSource(w) {
  try {
    const r = await fetch(urlOf(w), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; rules-watch)', 'Accept-Language': 'he,en;q=0.8', Accept: 'text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(15000) })
    const body = await r.text()
    const text = textOf(body)
    // a page behind a bot check or an empty shell is not a reading
    if (!r.ok || text.length < (w.min || 400) || (w.must && !w.must.every((m) => text.includes(m)))) return { ok: false, http: r.status, why: !r.ok ? `HTTP ${r.status}` : text.length < (w.min || 400) ? 'העמוד חזר ריק או חסום לקריאה אוטומטית' : 'העמוד לא הציג את התוכן הצפוי' }
    return { ok: true, http: r.status, hash: hashOf(text), missing: (w.expect || []).filter((e) => !text.includes(e.text)).map((e) => e) }
  } catch (e) { return { ok: false, http: 0, why: String(e.name === 'TimeoutError' ? 'לא ענה בזמן' : e.message || e).slice(0, 120) } }
}

export async function watchSources({ trigger = 'manual', user = null } = {}) {
  const now = new Date().toISOString()
  const state = (await setting('tax_watch_state')) || {}
  const results = []
  let i = 0
  await Promise.all(Array.from({ length: Math.min(3, WATCH.length) }, async () => {
    while (i < WATCH.length) {
      const w = WATCH[i++]
      const was = state[w.id] || {}
      const got = await readSource(w)
      const cur = { ...was, checked_at: now, http: got.http }
      if (!got.ok) { cur.status = was.status === 'changed' || was.status === 'value_missing' ? was.status : 'unreachable'; cur.why = got.why }
      else {
        cur.ok_at = now; cur.why = ''
        const firstRead = !was.hash
        if (got.missing.length) {
          cur.status = 'value_missing'; cur.missing = got.missing.map((m) => m.label || m.text)
          if (was.status !== 'value_missing') await audit('settings', w.id, 'tax_source_value_missing', { source: w.label, url: w.url, missing: cur.missing, rules: w.rules }, user).catch(() => {})
        } else if (!firstRead && was.hash !== got.hash && was.status !== 'changed') {
          cur.status = 'changed'; cur.changed_at = now; cur.prev_hash = was.hash
          await audit('settings', w.id, 'tax_source_changed', { source: w.label, url: w.url, rules: w.rules }, user).catch(() => {})
        } else if (was.status !== 'changed') { cur.status = 'ok'; cur.missing = [] }
        cur.hash = got.hash
        if (firstRead) cur.first_at = now
      }
      state[w.id] = cur
      results.push({ id: w.id, label: w.label, status: cur.status, http: cur.http, why: cur.why || '' })
    }
  }))
  const report = { at: now, trigger, sources: WATCH.length, unchanged: results.filter((r) => r.status === 'ok').length, changed: results.filter((r) => ['changed', 'value_missing'].includes(r.status)).length, unreachable: results.filter((r) => r.status === 'unreachable').length, results }
  state._last = { at: now, trigger, ok: report.unchanged, changed: report.changed, unreachable: report.unreachable }
  await saveSetting('tax_watch_state', state)
  await audit('settings', null, 'tax_watch_run', { trigger, sources: report.sources, unchanged: report.unchanged, changed: report.changed, unreachable: report.unreachable }, user).catch(() => {})
  return report
}

/* a person looked at a page that changed and found the rules still right (or updated them in a new version of the
   system): the page as it is now becomes the baseline */
export async function ackSource({ id, user }) {
  const w = WATCH.find((x) => x.id === id)
  if (!w) return { ok: false, error: 'מקור לא מוכר' }
  const state = (await setting('tax_watch_state')) || {}
  const cur = state[id] || {}
  state[id] = { ...cur, status: cur.hash ? 'ok' : 'unreachable', missing: [], acknowledged_at: new Date().toISOString(), acknowledged_by: user?.email || null }
  await saveSetting('tax_watch_state', state)
  await audit('settings', id, 'tax_source_acknowledged', { source: w.label, by: user?.email || null }, user).catch(() => {})
  return { ok: true }
}

/* the accountant's confirmation of a rule (or its withdrawal): who, when, and a note. The rule's text is not changed. */
export async function confirmRule({ id, confirmed = true, note = '', user }) {
  if (!RULES[id]) return { ok: false, error: 'כלל לא מוכר' }
  const all0 = (await setting('tax_rules_confirmed')) || {}
  if (confirmed) all0[id] = { by: user?.email || null, at: new Date().toISOString(), version: RULES[id].versions[RULES[id].versions.length - 1].v, note: String(note || '').slice(0, 300) }
  else delete all0[id]
  await saveSetting('tax_rules_confirmed', all0)
  await audit('settings', id, confirmed ? 'tax_rule_confirmed' : 'tax_rule_unconfirmed', { rule: RULES[id].name, note: String(note || '').slice(0, 300) }, user).catch(() => {})
  return { ok: true, confirmed: all0 }
}
