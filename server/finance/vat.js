/* The nightly VAT agent. It runs the one VAT service (src/pages/finance/vatRules.js, the same code the screens use)
   over every document, and records what changed since the last run: a document seen for the first time, or one whose
   assessment moved (its amounts, its company, its category, its state, or the rules' version). Unchanged documents are
   not written again. Nothing is approved and no amount on a document is changed here: the agent reads, compares and
   reports, and a person approves on the VAT screen.

   No new table: the last assessment of each document is kept in fin_settings ("vat_audit_state"), the last report in
   "vat_audit_last", and every change is a line in the audit trail (fin_audit, action "vat_audited") with the previous
   and the new figures. */
import { sb, one, patch, insert, audit } from './db.js'
import { auditVat, VAT_VERSION } from '../../src/pages/finance/vatRules.js'
import { markLedger } from '../../src/pages/finance/ledger.js'

const COLS = 'id,status,doc_type,total_amount,amount_before_vat,vat_amount,currency,supplier_name,supplier_vat_id,supplier_id,business_id,category,category_id,issue_date,email_date,created_at,accounting_period,doc_number,duplicate_of,allocation_number:extraction->>allocation_number'
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
const brief = (a) => ({ h: a.hash, cls: a.cls, vat: a.vat, eligible: a.eligible, potential: a.potential, blocked: a.blocked, needs: a.needs.map((n) => n.code) })

export async function vatAudit({ trigger = 'manual', user = null } = {}) {
  const started = new Date().toISOString()
  try {
    const [documents, categories] = await Promise.all([all(`fin_documents?select=${COLS}`), all('fin_categories?select=id,name,vat_deductible_pct')])
    markLedger(documents)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
    const { rows, totals } = auditVat(documents, { categories, today })
    const before = (await setting('vat_audit_state')) || {}
    const first = !Object.keys(before).length
    const state = {}; const changed = []
    for (const { doc, a } of rows) {
      const now = brief(a); state[doc.id] = now
      const was = before[doc.id]
      if (!was || was.h !== now.h) changed.push({ id: doc.id, was: was || null, now, doc })
    }
    // the first run is the full historical audit: one summary line, not a line per document
    if (!first) for (const c of changed.slice(0, 500)) {
      await audit('document', c.id, 'vat_audited', { previous: c.was ? { cls: c.was.cls, vat: c.was.vat, eligible: c.was.eligible, potential: c.was.potential } : null, current: { cls: c.now.cls, vat: c.now.vat, eligible: c.now.eligible, potential: c.now.potential, needs: c.now.needs }, version: VAT_VERSION }, user).catch(() => {})
    }
    const report = {
      at: started, finished: new Date().toISOString(), trigger, version: VAT_VERSION, ok: true, first,
      audited: rows.length, changed: changed.length, new_documents: changed.filter((c) => !c.was).length, removed: Object.keys(before).filter((id) => !state[id]).length,
      totals,
      moved: changed.filter((c) => c.was).slice(0, 40).map((c) => ({ id: c.id, supplier: c.doc.supplier_name || '', number: c.doc.doc_number || '', from: { cls: c.was.cls, vat: c.was.vat, eligible: c.was.eligible, potential: c.was.potential }, to: { cls: c.now.cls, vat: c.now.vat, eligible: c.now.eligible, potential: c.now.potential } })),
    }
    await saveSetting('vat_audit_state', state)
    await saveSetting('vat_audit_last', report)
    await audit('document', null, 'vat_audit_run', { trigger, audited: report.audited, changed: report.changed, new_documents: report.new_documents, eligible: totals.eligible, potential: totals.potential, need_person: totals.needPerson, version: VAT_VERSION }, user).catch(() => {})
    return report
  } catch (e) {
    // a run that failed says so; the previous state is kept, so the next run compares against the last good one
    const report = { at: started, finished: new Date().toISOString(), trigger, version: VAT_VERSION, ok: false, error: String(e.message || e).slice(0, 300) }
    await saveSetting('vat_audit_last', report).catch(() => {})
    await audit('document', null, 'vat_audit_failed', { trigger, error: report.error }, user).catch(() => {})
    return report
  }
}
