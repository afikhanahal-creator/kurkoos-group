// The finance assistant. Claude never produces a number: it only turns a Hebrew question into a structured query
// (what to measure, for which period, company, project, category or supplier). The server then computes the answer from
// the stored documents with the same code as the executive overview (src/pages/finance/insights.js + ledger.js),
// and returns the number, the period, the scope, a short explanation and the ids of the documents behind it.
import { env } from './env.js'
import { fetchRetry } from './http.js'
import { sb, audit } from './db.js'
import { markLedger } from '../../src/pages/finance/ledger.js'
import { overview, periodOf, booked, within, dayOf, monthName } from '../../src/pages/finance/insights.js'

const INTENTS = ['monthly_trend', 'doc_count', 'avg_invoice', 'largest_docs', 'spend_total', 'top_companies', 'top_suppliers', 'top_categories', 'category_growth', 'project_spend', 'projects_over_budget', 'unassigned', 'vat_total', 'period_compare', 'pending_review', 'open_invoices', 'unknown']
const PART = {
  type: 'object', additionalProperties: false,
  required: ['intent', 'period', 'from', 'to', 'company', 'project', 'category', 'supplier', 'limit'],
  properties: {
    intent: { type: 'string', enum: INTENTS, description: 'what the question asks for' },
    period: { type: 'string', enum: ['month', 'last_month', 'quarter', 'ytd', '12m', 'year_last', 'custom', 'all'], description: 'the period asked about; "all" when none is mentioned and the question is about totals ever' },
    from: { type: 'string', description: 'YYYY-MM-DD for a custom period, else empty' },
    to: { type: 'string', description: 'YYYY-MM-DD for a custom period, else empty' },
    company: { type: 'string', description: 'exactly one of the company names given, or empty' },
    project: { type: 'string', description: 'exactly one of the project names given, or empty' },
    category: { type: 'string', description: 'exactly one of the category names given, or empty' },
    supplier: { type: 'string', description: 'the supplier name as asked, or empty' },
    limit: { type: 'integer', description: 'how many rows for a "top N" question; 5 when not said' },
  },
}
// a complex question becomes up to three parts, each one query computed on its own (a comparison plus a ranking, two periods)
const PLAN = { type: 'object', additionalProperties: false, required: ['parts'], properties: { parts: { type: 'array', minItems: 1, maxItems: 3, items: PART } } }
const docsTxt = (n) => (n === 1 ? 'מסמך אחד' : `${n} מסמכים`)
const money = (v) => `${(Math.round(v * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₪`
const sign = (d) => (d.doc_type === 'credit' ? -1 : 1)
const tot = (d) => sign(d) * Math.abs(Number(d.total_amount) || 0)
const ils = (d) => !d.currency || d.currency === 'ILS'

async function plan(question, names, history = []) {
  if (!env.anthropicKey()) { const e = new Error('העוזר דורש ANTHROPIC_API_KEY בשרת'); e.status = 503; throw e }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const text = [
    'ASK: Turn this question about the expenses of a group of Israeli companies into a query. Do not answer it and do not compute anything.',
    `Today is ${today}. Hebrew: החודש = month, חודש שעבר = last_month, הרבעון = quarter, מתחילת השנה / השנה = ytd, שנה שעברה = year_last.`,
    `Companies: ${names.companies.join(' | ') || '(none)'}`,
    `Projects: ${names.projects.join(' | ') || '(none)'}`,
    `Categories: ${names.categories.join(' | ') || '(none)'}`,
    'If the question asks several things (a total and a ranking, two periods, two companies, a figure and the documents behind it), return up to 3 parts, each a full query; most questions are one part. Extra intents: monthly_trend (spending month by month in the period), doc_count (how many documents), avg_invoice (the average document amount), largest_docs (the biggest documents).',
    'Intents: spend_total (how much was spent), top_companies (which company spent most), top_suppliers, top_categories, category_growth (which category grew most vs the previous period), project_spend (how much on a project), projects_over_budget, unassigned (documents without a company or a project), vat_total, period_compare (this period vs the previous one), pending_review, open_invoices (invoices without proof of payment), unknown (anything else).',
    ...(history.length ? ['Earlier in this conversation (use it for follow-ups such as "and last month?", "what about Ronir?", "and the suppliers?": keep what the new question does not change):', ...history.map((h, i) => `${i + 1}. "${h.q}" -> intent ${h.intent || '?'}, period ${h.period || '?'}, scope ${h.scope || 'all'}`)] : []),
    `Question: ${question}`,
  ].join('\n')
  const r = await fetchRetry(`${env.anthropic()}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.anthropicKey(), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.model(), max_tokens: 1200, output_config: { effort: 'low', format: { type: 'json_schema', schema: PLAN } }, messages: [{ role: 'user', content: [{ type: 'text', text }] }] }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d.error && d.error.message) || `claude ${r.status}`)
  return JSON.parse((d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
}

/* PostgREST answers at most max-rows (1,000 on Supabase) per request: read in pages until a short page */
async function pages(path, size = 1000) {
  const out = []
  for (let off = 0; off < 200_000; off += size) {
    const part = (await sb(`${path}&limit=${size}&offset=${off}`)) || []
    out.push(...part)
    if (part.length < size) break
  }
  return out
}
const pick = (list, name) => (name ? list.find((x) => x.name === name) || list.find((x) => x.name?.includes(name) || name.includes(x.name)) : null)

export async function ask({ question, history, user }) {
  const qn = String(question || '').trim().slice(0, 500)
  if (qn.length < 3) { const e = new Error('כתבו שאלה'); e.status = 400; throw e }
  const [docsRaw, businesses, projects, categories, allocations] = await Promise.all([
    pages('fin_documents?select=id,status,doc_type,business_id,project_id,supplier_id,supplier_name,supplier_vat_id,category,total_amount,vat_amount,amount_before_vat,currency,issue_date,email_date,created_at,paid,duplicate_state&order=id'),
    sb('fin_businesses?select=id,name,active'), sb('fin_projects?select=id,name,business_id,budget,status,archived_at'), sb('fin_categories?select=id,name,vat_deductible_pct'), pages('fin_document_allocations?select=document_id,project_id,amount&order=id'),
  ])
  // the person sees only their companies; an accountant only approved documents
  let docs = docsRaw || []
  if (user.business_ids?.length) docs = docs.filter((d) => d.business_id && user.business_ids.includes(d.business_id))
  if (user.role === 'accountant') docs = docs.filter((d) => ['approved', 'sent'].includes(d.status))
  const bizList = (businesses || []).filter((b) => !user.business_ids?.length || user.business_ids.includes(b.id))
  const projList = (projects || []).filter((p) => !user.business_ids?.length || user.business_ids.includes(p.business_id))
  markLedger(docs)

  const hist = (Array.isArray(history) ? history : []).slice(-6).map((h) => ({ q: String(h?.q || '').slice(0, 300), intent: String(h?.intent || '').slice(0, 40), period: String(h?.period || '').slice(0, 60), scope: String(h?.scope || '').slice(0, 120) })).filter((h) => h.q)
  const planned = await plan(qn, { companies: bizList.map((b) => b.name), projects: projList.map((x) => x.name), categories: (categories || []).map((c) => c.name) }, hist)
  const parts = (Array.isArray(planned.parts) && planned.parts.length ? planned.parts : [planned]).slice(0, 3)
  const runPart = (p) => {
  const company = pick(bizList, p.company); const project = pick(projList, p.project); const category = pick(categories || [], p.category)
  const period = p.period === 'all' ? { key: 'all', label: 'מאז תחילת הנתונים', from: '1900-01-01', to: '2999-12-31', prevFrom: '1900-01-01', prevTo: '1900-01-01' } : periodOf(p.period, new Date(), { from: p.from, to: p.to })
  const ctx = { businesses: bizList, projects: projList, categories: categories || [], allocations: allocations || [] }
  const o = overview(docs, ctx, period, { businessId: company?.id || null })
  const scope = [company?.name || (bizList.length > 1 ? 'כל החברות' : bizList[0]?.name), project?.name, category?.name, p.supplier || null].filter(Boolean).join(' · ')
  let inScope = docs.filter((d) => booked(d) && ils(d) && within(d, period.from, period.to) && (!company || d.business_id === company.id) && (!category || d.category === category.name) && (!p.supplier || String(d.supplier_name || '').includes(p.supplier)))
  if (project) inScope = inScope.filter((d) => d.project_id === project.id || (allocations || []).some((a) => a.document_id === d.id && a.project_id === project.id))
  const sum = (list) => list.reduce((s, d) => s + tot(d), 0)
  const out = { question: qn, intent: p.intent, period: period.label, from: period.from === '1900-01-01' ? null : period.from, to: period.to === '2999-12-31' ? null : period.to, scope, rows: [], ids: [], value: null, unit: 'money' }
  const n = Math.max(1, Math.min(20, Number(p.limit) || 5))

  switch (p.intent) {
    case 'spend_total': {
      const v = project ? inScope.reduce((s, d) => { const al = (allocations || []).filter((a) => a.document_id === d.id && a.project_id === project.id); return s + (al.length ? sign(d) * al.reduce((x, a) => x + Math.abs(Number(a.amount)), 0) : tot(d)) }, 0) : sum(inScope)
      Object.assign(out, { value: v, ids: inScope.map((d) => d.id), answer: `${money(v)}`, explain: `סכום ${docsTxt(inScope.length)} (חשבוניות, חשבוניות מס/קבלה וקבלות שלא משלמות חשבונית שכבר נספרה), כולל מע״מ, לפי התאריך שעל המסמך.` })
      break
    }
    case 'top_companies': out.rows = o.byCompany.filter((c) => c.total).slice(0, n).map((c) => ({ label: c.name, value: c.total, count: c.count, ids: c.ids })); out.value = out.rows[0]?.value ?? 0; out.answer = out.rows[0] ? `${out.rows[0].label}: ${money(out.rows[0].value)}` : 'אין הוצאות בתקופה'; out.explain = 'ההוצאות של כל חברה בתקופה, מהגבוהה לנמוכה.'; break
    case 'top_suppliers': out.rows = groupRows(inScope, (d) => d.supplier_name || 'ספק לא מזוהה').slice(0, n); out.value = out.rows[0]?.value ?? 0; out.answer = out.rows.length ? `${out.rows.length} הספקים עם ההוצאות הגבוהות` : 'אין הוצאות בתקופה'; out.explain = 'לפי סכום המסמכים של כל ספק בתקופה.'; break
    case 'top_categories': out.rows = groupRows(inScope, (d) => d.category || 'ללא קטגוריה').slice(0, n); out.value = out.rows[0]?.value ?? 0; out.answer = out.rows[0] ? `${out.rows[0].label}: ${money(out.rows[0].value)}` : 'אין הוצאות בתקופה'; out.explain = 'לפי סכום המסמכים בכל קטגוריה בתקופה.'; break
    case 'category_growth': {
      const rows = o.byCategory.filter((c) => c.prev > 0 || c.total > 0).map((c) => ({ label: c.name, value: c.total - c.prev, now: c.total, before: c.prev, ids: c.ids })).sort((a, b) => b.value - a.value).slice(0, n)
      out.rows = rows; out.value = rows[0]?.value ?? 0
      out.answer = rows[0] && rows[0].value > 0 ? `${rows[0].label}: עלייה של ${money(rows[0].value)}` : 'לא נרשמה עלייה באף קטגוריה'
      out.explain = `השוואה ל${period.prevFrom} – ${period.prevTo}, תקופה באותו אורך.`; break
    }
    case 'project_spend': {
      const rows = (project ? o.projects.filter((x) => x.id === project.id) : o.projects).slice(0, n)
      out.rows = rows.map((x) => ({ label: x.name, value: x.spent, inPeriod: x.inPeriod, budget: x.budget || null, used: x.used }))
      out.value = project ? rows[0]?.spent ?? 0 : rows.reduce((s, x) => s + x.spent, 0)
      out.answer = project ? `${project.name}: ${money(out.value)} מצטבר${rows[0]?.budget ? ` מתוך תקציב ${money(rows[0].budget)} (${Math.round(rows[0].used * 100)}%)` : ''}` : `${rows.length} פרויקטים`
      out.ids = project ? docs.filter((d) => booked(d) && (d.project_id === project.id || (allocations || []).some((a) => a.document_id === d.id && a.project_id === project.id))).map((d) => d.id) : []
      out.explain = 'כל המסמכים ששויכו לפרויקט מאז תחילתו; חשבונית מפוצלת נספרת לפי החלק של הפרויקט.'; break
    }
    case 'projects_over_budget': out.rows = o.projects.filter((x) => x.over || x.near).map((x) => ({ label: x.name, value: x.spent, budget: x.budget, used: x.used, over: x.over })); out.value = out.rows.filter((r) => r.over).length; out.unit = 'count'; out.answer = out.value ? `${out.value === 1 ? 'פרויקט אחד' : `${out.value} פרויקטים`} בחריגה` : out.rows.length ? 'אין חריגה, אבל יש פרויקטים מעל 85% מהתקציב' : 'אין פרויקטים בחריגה מהתקציב'; out.explain = 'ביצוע מצטבר מול התקציב שהוגדר לפרויקט. פרויקט בלי תקציב לא נבדק.'; break
    case 'unassigned': {
      const noCo = docs.filter((d) => !d.business_id && !['rejected', 'archived', 'duplicate', 'failed', 'processing'].includes(d.status))
      out.value = noCo.length; out.unit = 'count'; out.ids = noCo.map((d) => d.id); out.answer = `${docsTxt(noCo.length)} בלי חברה`; out.rows = [{ label: 'בלי חברה', value: noCo.length, unit: 'count' }]; out.explain = 'מסמכים שהמנוע לא היה בטוח לאיזו חברה הם שייכים, ממתינים לשיוך ידני.'; break
    }
    case 'vat_total': {
      const v = inScope.reduce((s, d) => s + sign(d) * Math.abs(Number(d.vat_amount) || 0), 0)
      Object.assign(out, { value: v, ids: inScope.map((d) => d.id), answer: money(v), explain: `סכום המע״מ שמודפס על ${inScope.length} המסמכים. זה לא חישוב של מע״מ לקיזוז: את זה קובע רו״ח.` }); break
    }
    case 'period_compare': {
      const prev = docs.filter((d) => booked(d) && ils(d) && within(d, period.prevFrom, period.prevTo) && (!company || d.business_id === company.id))
      const a = sum(inScope); const b = sum(prev)
      out.rows = [{ label: period.label, value: a, count: inScope.length }, { label: `${period.prevFrom} – ${period.prevTo}`, value: b, count: prev.length }]
      out.value = a - b; out.ids = inScope.map((d) => d.id)
      out.answer = `${a >= b ? 'עלייה' : 'ירידה'} של ${money(Math.abs(a - b))}${b ? ` (${Math.round(((a - b) / Math.abs(b)) * 100)}%)` : ''}`
      out.explain = `${money(a)} לעומת ${money(b)}.`; break
    }
    case 'pending_review': { const w = docs.filter((d) => d.status === 'review' && (!company || d.business_id === company.id)); out.value = w.length; out.unit = 'count'; out.ids = w.map((d) => d.id); out.answer = `${docsTxt(w.length)} ${w.length === 1 ? 'ממתין' : 'ממתינים'} לבדיקה`; out.explain = 'מסמכים שנקראו ומחכים שאדם יאשר אותם.'; break }
    case 'open_invoices': out.value = o.kpi.openNoProof; out.ids = o.ids.open; out.answer = `${money(o.kpi.openNoProof)} ב-${o.kpi.openCount === 1 ? 'חשבונית אחת' : `${o.kpi.openCount} חשבוניות`}`; out.explain = 'חשבוניות בתקופה שאין במערכת קבלה או אישור תשלום שמתאים להן. זה לא בדיקה מול הבנק.'; break
    case 'monthly_trend': {
      const m = new Map()
      for (const d of inScope) { const key = dayOf(d).slice(0, 7); const g = m.get(key) || { label: monthName(key), key, value: 0, count: 0, ids: [] }; g.value += tot(d); g.count++; g.ids.push(d.id); m.set(key, g) }
      out.rows = [...m.values()].sort((a, b) => a.key.localeCompare(b.key)); out.ids = inScope.map((d) => d.id)
      const avg = out.rows.length ? out.rows.reduce((x, r) => x + r.value, 0) / out.rows.length : 0; out.value = avg
      const peak = [...out.rows].sort((a, b) => b.value - a.value)[0]
      out.answer = out.rows.length ? `ממוצע חודשי ${money(avg)}${peak ? `, השיא ב${peak.label} (${money(peak.value)})` : ''}` : 'אין הוצאות בתקופה'
      out.explain = `ההוצאות לפי החודש שעל המסמך, ${out.rows.length} חודשים.`; break
    }
    case 'doc_count': out.value = inScope.length; out.unit = 'count'; out.ids = inScope.map((d) => d.id); out.answer = docsTxt(inScope.length); out.explain = 'חשבוניות, חשבוניות מס/קבלה וקבלות שלא משלמות חשבונית שכבר נספרה.'; break
    case 'avg_invoice': { const v = inScope.length ? sum(inScope) / inScope.length : 0; out.value = v; out.ids = inScope.map((d) => d.id); out.answer = `${money(v)} בממוצע`; out.explain = `ממוצע של ${docsTxt(inScope.length)}.`; break }
    case 'largest_docs': {
      out.rows = [...inScope].sort((a, b) => tot(b) - tot(a)).slice(0, n).map((d) => ({ label: `${d.supplier_name || 'מסמך'} · ${dayOf(d)}`, value: tot(d), count: 1, ids: [d.id] }))
      out.ids = out.rows.flatMap((r) => r.ids); out.value = out.rows[0]?.value ?? 0
      out.answer = out.rows[0] ? `הגדול ביותר: ${out.rows[0].label}, ${money(out.rows[0].value)}` : 'אין מסמכים בתקופה'; break
    }
    default: out.intent = 'unknown'; out.answer = 'לא הצלחתי להבין את השאלה כשאלה על הנתונים.'; out.explain = 'נסו למשל: "כמה הוצאנו החודש?", "מי חמשת הספקים הגדולים מתחילת השנה?", "כמה הוצאנו על פרויקט ...?"'
  }
  out.count = out.ids.length
  // what the answer rests on and what it leaves out
  out.checked = inScope.length
  const foreign = docs.filter((d) => booked(d) && !ils(d) && within(d, period.from, period.to)).length
  const unread = docs.filter((d) => ['failed', 'processing'].includes(d.status) && within(d, period.from, period.to)).length
  out.limits = [foreign && `${docsTxt(foreign)} במטבע זר לא נכללו בסכומים בש״ח.`, unread && `${docsTxt(unread)} עוד לא נקראו, ולכן לא נספרו.`, out.intent !== 'unknown' && !out.checked && !['projects_over_budget', 'unassigned', 'pending_review', 'open_invoices', 'project_spend'].includes(out.intent) && 'אין מסמכים בתקופה ובהיקף שנבחרו.'].filter(Boolean)
  out.ids = out.ids.slice(0, 500)
  for (const r of out.rows) if (r.ids) r.ids = r.ids.slice(0, 300)
  return out
  }
  const results = parts.map(runPart)
  const out = { ...results[0], parts: results.slice(1).map((r) => ({ intent: r.intent, answer: r.answer, explain: r.explain, period: r.period, scope: r.scope, rows: r.rows, unit: r.unit, ids: r.ids, count: r.count, limits: r.limits })) }
  out.limits = [...new Set(results.flatMap((r) => r.limits || []))]
  out.checked = results.reduce((x, r) => Math.max(x, r.checked || 0), 0)
  // the reply as a person would say it, built only from the computed result (no number comes from the AI)
  const where = [out.scope && out.scope !== 'כל החברות' ? out.scope : 'כל החברות', out.period].filter(Boolean).join(', ')
  out.reply = out.intent === 'unknown' ? 'לא הצלחתי להבין את השאלה כשאלה על הנתונים. אפשר לשאול למשל כמה הוצאנו החודש, מי הספקים הגדולים, או אילו מסמכים מחכים לבדיקה.'
    : results.length > 1 ? `בדקתי ${results.length} דברים בשאלה. ${results.map((r) => `${r.answer}${r.scope || r.period ? ` (${[r.scope, r.period].filter(Boolean).join(', ')})` : ''}`).join(' · ')}.` : `בדקתי (${where}). ${String(out.answer).replace(/[.]+$/, '')}.${out.count ? ` מבוסס על ${docsTxt(out.count)}.` : ''}`
  out.follow = ({
    spend_total: ['ואיך זה לעומת התקופה הקודמת?', 'מי הספקים הגדולים?', 'לפי קטגוריות?'],
    top_companies: ['ומה הספקים הגדולים?', 'ואיך זה לעומת התקופה הקודמת?'],
    top_suppliers: ['ולפי קטגוריות?', 'כמה מע״מ יש במסמכים האלה?'],
    top_categories: ['איזו קטגוריה עלתה הכי הרבה?', 'מי הספקים הגדולים?'],
    period_compare: ['באיזו קטגוריה נרשמה העלייה?', 'מי הספקים הגדולים?'],
    pending_review: ['כמה מסמכים עדיין לא שויכו?', 'כמה חשבוניות בלי אישור תשלום?'],
    open_invoices: ['מי הספקים עם הכי הרבה חשבוניות פתוחות?', 'כמה מסמכים מחכים לבדיקה?'],
  })[out.intent] || ['כמה הוצאנו החודש?', 'מי הספקים הגדולים?']
  await audit('assistant', null, 'asked', { question: qn, intent: results.map((r) => r.intent).join('+'), period: out.period, scope: out.scope }, user).catch(() => {})
  return out
}

function groupRows(list, keyOf) {
  const m = new Map()
  for (const d of list) { const k = keyOf(d); const g = m.get(k) || { label: k, value: 0, count: 0, ids: [] }; g.value += tot(d); g.count++; g.ids.push(d.id); m.set(k, g) }
  return [...m.values()].sort((a, b) => b.value - a.value)
}
export { dayOf, monthName }
