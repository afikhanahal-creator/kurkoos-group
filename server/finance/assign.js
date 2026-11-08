// Agent 6: suggests company, project and category. Order: administrator rules, the supplier's
// defaults, what people approved before for this supplier (learning from corrections), the customer
// ID printed on the document, the mailbox. A project is filled only from a rule, a supplier default,
// or a clear history; otherwise it stays a suggestion for a person to accept.
import { sb, patch } from './db.js'

const like = (a, b) => String(a || '').toLowerCase().includes(String(b || '').toLowerCase())

export async function assign({ fields, x, mailbox, fromEmail, text, supplier }) {
  const out = { business_id: null, project_id: null, category: null }
  const sug = {}
  const set = (k, value, source, reason, apply = true) => {
    if (value === null || value === undefined || value === '' || sug[k]) return
    sug[k] = { value, source, reason }
    if (apply) out[k] = value
  }

  const rules = (await sb('fin_rules?enabled=eq.true&select=*&order=priority.asc')) || []
  const hit = []
  for (const r of rules) {
    const m = r.match || {}; const a = r.action || {}
    let ok = false
    if (r.kind.startsWith('supplier_')) ok = (m.supplier_id && supplier?.id === m.supplier_id) || (m.supplier_name && like(fields.supplier_name, m.supplier_name))
    else if (r.kind === 'keyword_project') ok = !!m.keyword && [text, fields.description, x.project_hint, fields.email_subject].some((t) => like(t, m.keyword))
    else if (r.kind === 'sender_company') ok = !!m.sender && like(fromEmail, m.sender)
    if (!ok) continue
    if (r.kind === 'supplier_category') set('category', a.category, 'rule', `כלל: ${r.name}`)
    if (r.kind === 'supplier_company' || r.kind === 'sender_company') set('business_id', a.business_id, 'rule', `כלל: ${r.name}`)
    if (r.kind === 'supplier_project' || r.kind === 'keyword_project') set('project_id', a.project_id, 'rule', `כלל: ${r.name}`)
    hit.push(r.id)
  }
  for (const id of hit) {
    const r = rules.find((y) => y.id === id)
    patch(`fin_rules?id=eq.${id}`, { hits: (r.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {})
  }

  if (supplier) {
    set('category', supplier.default_category, 'supplier', `ברירת המחדל של ${supplier.name}`)
    set('business_id', supplier.default_business_id, 'supplier', `ברירת המחדל של ${supplier.name}`)
    set('project_id', supplier.default_project_id, 'supplier', `ברירת המחדל של ${supplier.name}`)
    // history: what people approved for this supplier (approved records are never changed here)
    const past = (await sb(`fin_documents?supplier_id=eq.${supplier.id}&status=in.(approved,sent)&select=business_id,project_id,category&order=approved_at.desc&limit=20`)) || []
    for (const k of ['business_id', 'project_id', 'category']) {
      const counts = {}
      for (const p of past) if (p[k]) counts[p[k]] = (counts[p[k]] || 0) + 1
      const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || []
      if (!best) continue
      const share = n / past.length
      set(k, best, 'history', `${n} מתוך ${past.length} המסמכים המאושרים של הספק`, n >= 2 && share >= 0.7)
    }
  }

  const custVat = String(x.customer_vat_id || '').replace(/\D/g, '')
  if (custVat) {
    const b = (await sb(`fin_businesses?or=(vat_id.eq.${custVat},reg_number.eq.${custVat})&select=id,name`))?.[0]
    if (b) set('business_id', b.id, 'document', `הח.פ של הלקוח במסמך (${b.name})`)
  }
  if (mailbox?.business_id) set('business_id', mailbox.business_id, 'mailbox', `התיבה ${mailbox.email || ''}`)

  // projects: keywords and names printed on the document are only a suggestion
  if (!sug.project_id) {
    const projects = (await sb('fin_projects?status=in.(planning,active)&select=id,name,code,keywords,business_id')) || []
    const hay = [x.project_hint, fields.description, text, fields.email_subject].filter(Boolean).join(' ')
    const p = projects.find((pr) => [pr.name, pr.code, ...(pr.keywords || [])].filter((w) => w && w.length > 2).some((w) => like(hay, w)))
    if (p) set('project_id', p.id, 'ai', `"${p.name}" מופיע במסמך`, false)
  }
  set('category', x.category, 'ai', 'ההצעה של Claude')
  return { ...out, suggestions: sug }
}
