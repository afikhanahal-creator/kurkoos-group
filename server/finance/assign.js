// Agents 4b + 6: identifies the supplier, then suggests company, category and project, each with a confidence.
// A value is filled only above the administrator's threshold; below it the document carries a suggestion for a person.
//
// Priority (high to low), so a weak signal never overrides a strong one:
//   company:  the recipient registration number printed on the document (exact match, 1.0) › recipient_company rule
//             › sender_company / supplier_company rule › approved history of this supplier › mailbox (suggestion only)
//   category: supplier_category / keyword_category rule › supplier default › approved history › Claude › category keywords
//   project:  project code printed on the document › supplier_project / keyword_project rule › supplier default (only if the
//             supplier works on one project) › approved history (only if one project) › project keywords (suggestion only)
// Conflicts between strong signals are flagged for review, never resolved silently.
import { sb, one, insert, patch, q } from './db.js'

const norm = (t) => String(t || '').toLowerCase().replace(/(בע"מ|בע״מ|בעמ|ltd\.?|inc\.?|llc|limited|ושות׳|ושות'|ושות)/g, '').replace(/[^\p{L}\p{N}]+/gu, '')
const like = (a, b) => !!a && !!b && String(a).toLowerCase().includes(String(b).toLowerCase())
const digits = (s) => String(s || '').replace(/\D/g, '') || null

export async function settings() {
  const rows = (await sb('fin_settings?select=key,value')) || []
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    supplierMode: s.supplier_mode || 'controlled',
    supplierThreshold: Number(s.supplier_auto_threshold ?? 0.92),
    categoryThreshold: Number(s.category_auto_threshold ?? 0.85),
    projectThreshold: Number(s.project_auto_threshold ?? 0.9),
    secondApprovalAmount: Number(s.second_approval_amount ?? 0) || null,
  }
}

/* Step 4: find the supplier. Exact ID, then normalized name, then email domain / website. Never creates a duplicate. */
export async function identifySupplier(x, { fromEmail, cfg, documentId }) {
  const vat = digits(x.supplier_vat_id)
  const name = x.supplier_name || ''
  const domain = (String(x.supplier_email || fromEmail || '').match(/@([\w.-]+)/) || [])[1] || null
  const site = String(x.supplier_website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || null
  let s = null; let how = null
  if (vat) { s = await one(`fin_suppliers?or=(vat_id.eq.${vat},vat_number.eq.${vat})&select=*`); if (s) how = 'id' }
  if (!s && name) { s = await one(`fin_suppliers?normalized_name=eq.${q(norm(name))}&status=neq.archived&select=*`); if (s) how = 'name' }
  if (!s && domain && !/gmail|outlook|hotmail|yahoo|walla|kurkoos/.test(domain)) { s = await one(`fin_suppliers?email_domain=eq.${q(domain)}&status=neq.archived&select=*`); if (s) how = 'domain' }
  if (!s && site) { s = await one(`fin_suppliers?website=ilike.*${q(site)}*&status=neq.archived&select=*`); if (s) how = 'website' }
  if (s) {
    // a name match with a different printed ID is not the same supplier: flag it
    const conflict = how !== 'id' && vat && s.vat_id && s.vat_id !== vat
    return { supplier: conflict ? null : s, match: how, confidence: how === 'id' ? 1 : how === 'name' ? 0.9 : 0.75, conflict: conflict ? s : null }
  }
  if (!name) return { supplier: null, match: null, confidence: 0 }
  const fc = x.field_confidence || {}
  const conf = Math.min(fc.supplier_name ?? 0.5, vat ? (fc.supplier_vat_id ?? 0.5) : 0.6)
  const auto = cfg.supplierMode === 'automatic' && conf >= cfg.supplierThreshold && !!vat
  const row = {
    name: name.slice(0, 200), vat_id: vat, email_domain: domain, email: x.supplier_email || null, phone: x.supplier_phone || null,
    address: x.supplier_address || null, website: x.supplier_website || null, default_category: null,
    status: auto ? 'active' : 'pending', suggested_from: documentId || null, match_confidence: Math.round(conf * 100) / 100,
  }
  const created = await insert('fin_suppliers', row).catch(async (e) => (e.code === '23505' ? one(`fin_suppliers?normalized_name=eq.${q(norm(name))}&select=*`) : null))
  return { supplier: created, match: 'new', created: !!created, pending: created?.status === 'pending', confidence: conf }
}

export async function assign({ fields, x, mailbox, fromEmail, text, supplier, cfg, documentId }) {
  const out = { business_id: null, project_id: null, category: null }
  const sug = {}
  const issues = []
  const hits = []
  const consider = (k, value, conf, source, reason, ruleId) => {
    if (!value) return
    const cur = sug[k]
    if (cur && cur.confidence >= conf) {
      if (cur.value !== value && conf >= 0.95 && cur.confidence >= 0.95) issues.push({ level: 'error', code: `${k}_conflict`, field: k, message: `שני מקורות ודאיים סותרים: ${cur.reason} מול ${reason}` })
      if (ruleId) hits.push({ rule_id: ruleId, outcome: 'overridden', detail: `נדחה מפני ${cur.reason}` })
      return
    }
    if (cur && cur.value !== value && cur.confidence >= 0.95 && conf >= 0.95) issues.push({ level: 'error', code: `${k}_conflict`, field: k, message: `שני מקורות ודאיים סותרים: ${cur.reason} מול ${reason}` })
    sug[k] = { value, confidence: Math.round(conf * 100) / 100, source, reason }
    if (ruleId) hits.push({ rule_id: ruleId, outcome: 'suggested', detail: reason })
  }
  const hay = [x.project_hint, x.description, fields.description, text, fields.email_subject].filter(Boolean).join(' ')

  // ---- company: the printed recipient ID is the strongest signal there is ----
  const custVat = digits(x.customer_vat_id)
  const companies = (await sb('fin_businesses?select=id,name,vat_id,reg_number,active')) || []
  if (custVat) {
    const b = companies.find((c) => c.vat_id === custVat || c.reg_number === custVat)
    if (b) consider('business_id', b.id, 1, 'document', `ח.פ הנמען במסמך (${b.name})`)
    else issues.push({ level: 'warn', code: 'unknown_recipient', field: 'business_id', message: `ח.פ הנמען ${custVat} לא שייך לאף חברה בקבוצה` })
  }

  const rules = (await sb('fin_rules?enabled=eq.true&select=*&order=priority.asc')) || []
  for (const r of rules) {
    const m = r.match || {}; const a = r.action || {}
    const supplierHit = (m.supplier_id && supplier?.id === m.supplier_id) || (m.supplier_name && like(fields.supplier_name, m.supplier_name))
    switch (r.kind) {
      case 'recipient_company': if (custVat && m.reg_number && digits(m.reg_number) === custVat) consider('business_id', a.business_id, 0.99, 'rule', `כלל: ${r.name}`, r.id); break
      case 'sender_company': if (m.sender && like(fromEmail, m.sender)) consider('business_id', a.business_id, 0.9, 'rule', `כלל: ${r.name}`, r.id); break
      case 'supplier_company': if (supplierHit) consider('business_id', a.business_id, 0.9, 'rule', `כלל: ${r.name}`, r.id); break
      case 'supplier_category': if (supplierHit) consider('category', a.category, 0.97, 'rule', `כלל: ${r.name}`, r.id); break
      case 'keyword_category': if (m.keyword && like(hay, m.keyword)) consider('category', a.category, 0.9, 'rule', `כלל: ${r.name}`, r.id); break
      case 'supplier_project': if (supplierHit) consider('project_id', a.project_id, 0.9, 'rule', `כלל: ${r.name}`, r.id); break
      case 'keyword_project': if (m.keyword && like(hay, m.keyword)) consider('project_id', a.project_id, 0.9, 'rule', `כלל: ${r.name}`, r.id); break
      case 'project_code': if (m.code && like(hay, m.code)) consider('project_id', a.project_id, 0.97, 'rule', `כלל: ${r.name}`, r.id); break
      case 'missing_vat_flag': if (!fields.supplier_vat_id) { issues.push({ level: 'warn', code: 'rule_missing_vat', field: 'supplier_vat_id', message: `כלל: ${r.name}` }); hits.push({ rule_id: r.id, outcome: 'flagged', detail: 'חסר מספר עוסק' }) } break
      case 'amount_approval': if (Math.abs(Number(fields.total_amount) || 0) >= Number(m.min_amount || Infinity)) { fields.requires_second_approval = true; hits.push({ rule_id: r.id, outcome: 'flagged', detail: `סכום ${fields.total_amount} דורש שני מאשרים` }) } break
      default: break
    }
  }

  // ---- supplier defaults and what people approved before (learning, never changing approved records) ----
  if (supplier && supplier.status !== 'pending') {
    const past = (await sb(`fin_documents?supplier_id=eq.${supplier.id}&status=in.(approved,sent)&select=business_id,project_id,category&order=approved_at.desc&limit=30`)) || []
    const best = (k) => {
      const c = {}
      for (const p of past) if (p[k]) c[p[k]] = (c[p[k]] || 0) + 1
      const [v, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0] || []
      return v ? { v, n, share: n / past.length, distinct: Object.keys(c).length } : null
    }
    if (supplier.default_category) consider('category', supplier.default_category, 0.95, 'supplier', `ברירת המחדל של ${supplier.name}`)
    const hc = best('category'); if (hc) consider('category', hc.v, Math.min(0.94, 0.5 + hc.share * 0.45 * Math.min(1, hc.n / 3)), 'history', `${hc.n} מתוך ${past.length} המסמכים המאושרים של הספק`)
    if (supplier.default_business_id) consider('business_id', supplier.default_business_id, 0.85, 'supplier', `ברירת המחדל של ${supplier.name}`)
    const hb = best('business_id'); if (hb) consider('business_id', hb.v, Math.min(0.88, 0.5 + hb.share * 0.4 * Math.min(1, hb.n / 3)), 'history', `${hb.n} מתוך ${past.length} המסמכים המאושרים`)
    // a supplier who works on several projects never decides the project by name alone
    const hp = best('project_id')
    const multi = hp && hp.distinct > 1
    if (supplier.default_project_id && !multi) consider('project_id', supplier.default_project_id, 0.9, 'supplier', `ברירת המחדל של ${supplier.name}`)
    else if (supplier.default_project_id) consider('project_id', supplier.default_project_id, 0.6, 'supplier', `ברירת מחדל, אבל הספק עובד בכמה פרויקטים`)
    if (hp && !multi) consider('project_id', hp.v, Math.min(0.92, 0.5 + 0.42 * Math.min(1, hp.n / 3)), 'history', `כל ${hp.n} המסמכים המאושרים של הספק`)
  }

  // ---- what is printed on the document ----
  const projects = (await sb('fin_projects?status=in.(planning,active)&archived_at=is.null&select=id,name,code,keywords,business_id')) || []
  for (const p of projects) {
    if (p.code && p.code.length > 2 && like(hay, p.code)) consider('project_id', p.id, 0.96, 'document', `קוד הפרויקט ${p.code} מופיע במסמך`)
    else if ([p.name, ...(p.keywords || [])].filter((w) => w && w.length > 2).some((w) => like(hay, w))) consider('project_id', p.id, 0.7, 'document', `"${p.name}" מופיע במסמך`)
  }
  const cats = (await sb('fin_categories?active=eq.true&select=name,keywords')) || []
  const aiCatConf = (x.field_confidence || {}).category ?? 0.6
  if (x.category && cats.some((c) => c.name === x.category)) consider('category', x.category, Math.min(0.9, aiCatConf), 'ai', `Claude (${Math.round(aiCatConf * 100)}%)`)
  for (const c of cats) if ((c.keywords || []).some((k) => k && k.length > 2 && like(hay, k))) consider('category', c.name, 0.65, 'keywords', `מילת מפתח של "${c.name}"`)
  if (mailbox?.business_id) consider('business_id', mailbox.business_id, 0.6, 'mailbox', `התיבה ${mailbox.email || ''}`)

  // a project of company B with a document of company A is a conflict
  const proj = sug.project_id && projects.find((p) => p.id === sug.project_id.value)
  if (proj?.business_id && sug.business_id && proj.business_id !== sug.business_id.value) {
    issues.push({ level: 'warn', code: 'project_company', field: 'project_id', message: 'הפרויקט המוצע שייך לחברה אחרת מזו שבמסמך' })
    sug.project_id.confidence = Math.min(sug.project_id.confidence, 0.5)
  }

  // ---- apply only what passes the thresholds ----
  if (sug.business_id && sug.business_id.confidence >= 0.85) out.business_id = sug.business_id.value
  else if (!sug.business_id) issues.push({ level: 'warn', code: 'no_company', field: 'business_id', message: 'לא זוהתה חברה נמענת. יש לשייך ידנית' })
  else issues.push({ level: 'info', code: 'company_suggested', field: 'business_id', message: 'החברה מוצעת בלבד, לא שויכה אוטומטית' })
  if (sug.category && sug.category.confidence >= cfg.categoryThreshold) out.category = sug.category.value
  if (sug.project_id && sug.project_id.confidence >= cfg.projectThreshold) out.project_id = sug.project_id.value
  if (cfg.secondApprovalAmount && Math.abs(Number(fields.total_amount) || 0) >= cfg.secondApprovalAmount) fields.requires_second_approval = true

  for (const h of hits) {
    const applied = h.outcome === 'suggested' && Object.entries(sug).some(([k, s]) => s.reason?.startsWith('כלל') && out[k] === s.value)
    if (documentId) await insert('fin_rule_hits', { rule_id: h.rule_id, document_id: documentId, outcome: applied ? 'applied' : h.outcome, detail: h.detail }, 'return=minimal').catch(() => {})
    const r = rules.find((y) => y.id === h.rule_id)
    if (r) await patch(`fin_rules?id=eq.${r.id}`, { hits: (r.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {})
  }
  return { ...out, suggestions: sug, issues, pendingHits: documentId ? [] : hits }
}

export async function flushHits(documentId, hits, rulesSeen) {
  for (const h of hits || []) await insert('fin_rule_hits', { rule_id: h.rule_id, document_id: documentId, outcome: h.outcome, detail: h.detail }, 'return=minimal').catch(() => {})
  return rulesSeen
}
