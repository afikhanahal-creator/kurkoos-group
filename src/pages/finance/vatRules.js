/* The one VAT service of the system (input VAT, מע״מ תשומות). Pure functions: the screens, the reports, the exports and
   the nightly agent (server/finance/vat.js) all read the same answer for a document from here, so two places never
   disagree about a shekel.

   What it decides for every document: what it is for VAT (a tax invoice, a receipt, a credit note...), whether VAT is
   on it and at which rate, whether the numbers add up, how much of the VAT may be offset, how much may not, and what
   is missing before a person can approve it. It never invents a number: when the VAT is not printed on the document,
   it says so and shows what the VAT would be IF the total includes VAT, clearly marked as an estimate.

   The rules are a table (RULES), each with where it comes from and whether the accountant confirmed it. A rule marked
   confirmed: false is this system's reading of the law and of the owner's brief, to be confirmed by the accountant;
   the VAT screen shows that mark. Nothing here files a report or approves a deduction on its own: a deduction counts
   as confirmed only for a document a person approved. */
import { ruleOn, RULES as TAX } from './taxRules.js'

export const VAT_VERSION = '2026-11-14.2'

export const RULES = {
  rate: { title: 'שיעור המע״מ לפי תאריך המסמך', text: '17% מ-1.10.2015 עד 31.12.2024, 18% מ-1.1.2025. שיעורים קודמים נמצאים במאגר הכללים.', source: 'חוק מס ערך מוסף, צו שיעור המס', confirmed: false },
  tax_invoice: { title: 'קיזוז רק לפי חשבונית מס', text: 'מע״מ תשומות מקוזז לפי חשבונית מס או חשבונית מס/קבלה שהוצאה על שם העסק. קבלה, אישור תשלום, חשבון עסקה והצעת מחיר אינם מספיקים.', source: 'חוק מס ערך מוסף, סעיף 38', confirmed: false },
  category: { title: 'שיעור הקיזוז לפי סוג ההוצאה', text: 'אחוז הקיזוז נקבע בקטגוריה של ההוצאה (למשל רכב ודלק 2/3, כיבוד 0, ביטוח ואגרות 0).', source: 'הגדרות הקטגוריות במערכת; תקנות מע״מ 14-18', confirmed: false },
  six_months: { title: 'קיזוז בתוך שישה חודשים', text: 'חשבונית מס מקוזזת בתוך שישה חודשים מיום הוצאתה.', source: 'חוק מס ערך מוסף, סעיף 38(א)', confirmed: false },
  allocation: { title: 'מספר הקצאה (חשבוניות ישראל)', text: 'חשבונית מס מעל הסף צריכה מספר הקצאה כדי לקזז: מעל 25,000 ₪ לפני מע״מ מ-5.5.2024, מעל 20,000 ₪ מ-1.1.2025, מעל 10,000 ₪ מ-1.1.2026, מעל 5,000 ₪ מ-1.6.2026.', source: 'חוק מס ערך מוסף, סעיף 38(א1); אומת מול נוסח רשומות', confirmed: false },
  credit: { title: 'חשבונית זיכוי מקטינה את הקיזוז', text: 'זיכוי מקטין את מע״מ התשומות שקוזז לפי החשבונית המקורית, פעם אחת.', source: 'חוק מס ערך מוסף', confirmed: false },
  foreign: { title: 'ספק זר', text: 'במסמך של ספק זר אין מע״מ ישראלי לקיזוז. החיוב במע״מ על יבוא שירותים נבדק מול רו״ח.', source: 'לבדיקת רו״ח', confirmed: false },
  no_vat_body: { title: 'גוף שאינו גובה מע״מ', text: 'אגרות, ארנונה ותשלומים לרשויות אינם כוללים מע״מ.', source: 'לבדיקת רו״ח', confirmed: false },
}

// the rate and the allocation threshold come from the one rules registry (taxRules.js), by the document's date; nothing
// here holds a number of its own
export const rateOn = (day) => (ruleOn('vat_rate', day) || TAX.vat_rate.versions[TAX.vat_rate.versions.length - 1]).value
// the net amount above which a tax invoice needs an allocation number, by its date (null before the regime began)
export const allocationFloor = (day) => ruleOn('vat_allocation', day)?.value ?? null

export const CLASS = {
  full: ['ok', 'מקוזז במלואו'], partial: ['info', 'מקוזז חלקית'], none: ['muted', 'לא מקוזז'], no_vat: ['muted', 'בלי מע״מ'],
  missing: ['warn', 'חסר מידע'], review: ['warn', 'לבדיקת רו״ח'], duplicate: ['muted', 'כפילות'], credit: ['info', 'זיכוי'],
}
const TAX_INVOICE = ['invoice', 'invoice_receipt']
const NOT_INVOICE = { receipt: 'קבלה', payment_confirmation: 'אישור תשלום', proforma: 'חשבון עסקה', quote: 'הצעת מחיר', supplier_bill: 'חשבון ספק' }
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const r2 = (v) => Math.round(v * 100) / 100
const dayOf = (d) => (/^\d{4}-\d{2}-\d{2}/.test(String(d.issue_date || '')) ? String(d.issue_date).slice(0, 10) : String(d.email_date || d.created_at || '').slice(0, 10))
// an Israeli business or company number: nine digits. Anything else on a supplier (or a known foreign name) is foreign.
const israeliId = (v) => /^\d{9}$/.test(String(v || '').replace(/\D/g, '').padStart(9, '0')) && String(v || '').replace(/\D/g, '').length >= 8
const FOREIGN = /\b(inc|llc|ltd\.?\s*(ireland|uk)|ireland|gmbh|b\.v\.|pte|corp|limited)\b/i
const NO_VAT_BODY = /(עיריי?ת|מועצה (מקומית|אזורית)|משרד ה|רשות ה|רשם ה|בית משפט|הוצאה לפועל|ביטוח לאומי|מס הכנסה|רשות המסים)/

/* ctx: { categories, today: 'YYYY-MM-DD', documents (optional, to link a credit note to its invoice) } */
export function assessVat(doc, ctx = {}) {
  const today = ctx.today || new Date().toISOString().slice(0, 10)
  const day = dayOf(doc)
  const type = doc.doc_type || ''
  const total = num(doc.total_amount); const net = num(doc.amount_before_vat); const vatCol = num(doc.vat_amount)
  const out = { id: doc.id, version: VAT_VERSION, cls: 'missing', reasons: [], needs: [], rules: [], day, period: doc.accounting_period || day.slice(0, 7),
    net, vat: vatCol, total, rate: null, expectedRate: day ? rateOn(day) : null, vatSource: vatCol !== null ? 'document' : 'none',
    pct: 0, eligible: 0, blocked: 0, potential: 0, estimate: null, confirmed: false, allocation: { required: false, present: false, floor: null }, confidence: 1 }
  const why = (rule, text) => { if (rule && !out.rules.includes(rule)) out.rules.push(rule); out.reasons.push(text) }
  const need = (code, text) => { out.needs.push({ code, text }); out.confidence = Math.min(out.confidence, 0.6) }

  if (doc.status === 'duplicate') { out.cls = 'duplicate'; why(null, 'המסמך סומן ככפילות של מסמך אחר, ולכן אינו נספר.'); return finish(out, doc) }
  if (['rejected', 'archived'].includes(doc.status)) { out.cls = 'none'; why(null, 'המסמך נדחה או הועבר לארכיון.'); return finish(out, doc) }
  if (total === null) { out.cls = 'missing'; need('total', 'הסכום הכולל לא נקרא מהמסמך.'); why(null, 'בלי סכום כולל אי אפשר לחשב מע״מ.'); return finish(out, doc) }
  if (!doc.business_id) need('company', 'המסמך לא משויך לחברה, ולכן לא ברור מי מקזז אותו.')

  const credit = type === 'credit'
  const sign = credit ? -1 : 1
  // ---- the VAT on the document: printed, or what follows from the net and the total; never assumed ----
  let vat = vatCol
  if (vat === null && net !== null) { vat = r2(Math.abs(total) - Math.abs(net)); out.vatSource = 'derived'; why(null, `המע״מ לא נרשם בנפרד; לפי הסכום לפני מע״מ והסכום הכולל הוא ${r2(vat)} ₪.`) }
  if (vat !== null) {
    out.vat = Math.abs(vat)
    const base = net !== null ? Math.abs(net) : r2(Math.abs(total) - Math.abs(vat))
    out.net = base
    out.rate = base > 0 ? Math.abs(vat) / base : 0
    if (net !== null && Math.abs(Math.abs(net) + Math.abs(vat) - Math.abs(total)) > 1) need('sum', `הסכומים לא מסתכמים: ${r2(Math.abs(net))} + ${r2(Math.abs(vat))} ≠ ${r2(Math.abs(total))}.`)
    if (Math.abs(vat) > 0.005 && out.expectedRate && Math.abs(out.rate - out.expectedRate) > 0.006) { out.rules.push('rate'); need('rate', `שיעור המע״מ במסמך ${(out.rate * 100).toFixed(1)}%, והשיעור בתאריך המסמך ${(out.expectedRate * 100).toFixed(0)}%.`) }
  }
  const foreign = (doc.currency && doc.currency !== 'ILS') || (!israeliId(doc.supplier_vat_id) && FOREIGN.test(String(doc.supplier_name || '')))
  const publicBody = NO_VAT_BODY.test(String(doc.supplier_name || ''))

  // ---- what kind of document it is ----
  if (!credit && !TAX_INVOICE.includes(type)) {
    out.rules.push('tax_invoice')
    if (foreign) { out.cls = 'review'; why('foreign', `${NOT_INVOICE[type] || 'מסמך'} של ספק זר: אין בו מע״מ ישראלי לקיזוז. החיוב במע״מ על שירות מספק זר נבדק מול רו״ח.`); need('foreign', 'ספק זר: לבדיקת רו״ח.'); return finish(out, doc) }
    if (publicBody && !(out.vat > 0)) { out.cls = 'no_vat'; why('no_vat_body', 'תשלום לרשות או לגוף ציבורי, בלי מע״מ.'); return finish(out, doc) }
    if (doc._proofFor) { out.cls = 'none'; why('tax_invoice', 'זהו אישור התשלום של חשבונית שכבר במערכת; המע״מ מקוזז לפי החשבונית עצמה.'); return finish(out, doc) }
    // a payment on a tax invoice that is already here: the same payment (same supplier, same sum, close dates), or one
    // instalment of it (the invoice's total is a whole number of such payments). Its VAT is the invoice's VAT.
    const inv = invoiceOf(doc, ctx, day, Math.abs(total))
    if (inv) { out.cls = 'none'; out.paysInvoice = inv.doc.id; why('tax_invoice', `${inv.parts > 1 ? `תשלום אחד מתוך ${inv.parts} על` : 'התשלום של'} חשבונית מס ${inv.doc.doc_number || ''} של אותו ספק (${r2(Math.abs(num(inv.doc.total_amount)))} ₪). המע״מ מקוזז לפי החשבונית עצמה, ולא שוב לפי הקבלה.`); return finish(out, doc) }
    // a receipt for a purchase that carries VAT: the money is real, the deduction waits for the tax invoice
    const r = out.expectedRate || rateOn(today)
    const est = out.vat > 0 ? out.vat : r2(Math.abs(total) * r / (1 + r))
    const pct = pctOf(doc, ctx)
    out.cls = 'missing'; out.pct = pct
    out.estimate = { vat: est, net: r2(Math.abs(total) - est), rate: r, assumed: !(out.vat > 0) }
    out.potential = r2(est * pct / 100)
    why('tax_invoice', `${NOT_INVOICE[type] || 'המסמך'} אינה חשבונית מס, ולכן המע״מ לא מקוזז לפיה.${out.vat > 0 ? ` במסמך מופיע מע״מ של ${r2(out.vat)} ₪: אם זו בעצם חשבונית מס/קבלה, מתקנים את סוג המסמך.` : ` אם הסכום כולל מע״מ בשיעור ${(r * 100).toFixed(0)}%, המע״מ הוא כ-${est} ₪ (הערכה).`}`)
    need('tax_invoice', out.vat > 0 ? 'לבדוק אם זו חשבונית מס/קבלה ולתקן את הסוג, או להשיג את חשבונית המס.' : 'להשיג מהספק את חשבונית המס של התשלום הזה.')
    return finish(out, doc)
  }

  // ---- a tax invoice or a credit note ----
  if (vat === null) {
    if (foreign) { out.cls = 'review'; why('foreign', 'חשבונית של ספק זר בלי מע״מ ישראלי. לבדיקת רו״ח.'); need('foreign', 'ספק זר: לבדיקת רו״ח.'); return finish(out, doc) }
    const r = out.expectedRate || rateOn(today); const est = r2(Math.abs(total) * r / (1 + r))
    out.cls = 'missing'; out.pct = pctOf(doc, ctx); out.estimate = { vat: est, net: r2(Math.abs(total) - est), rate: r, assumed: true }; out.potential = r2(est * out.pct / 100)
    why(null, `המע״מ והסכום לפני מע״מ לא נקראו מהחשבונית. אם הסכום כולל מע״מ בשיעור ${(r * 100).toFixed(0)}%, המע״מ הוא כ-${est} ₪ (הערכה, לא נתון מהמסמך).`)
    need('vat', 'לפתוח את המסמך ולהזין את המע״מ ואת הסכום לפני מע״מ כפי שהם מודפסים.')
    return finish(out, doc)
  }
  if (Math.abs(vat) < 0.005) { out.cls = 'no_vat'; why(null, 'בחשבונית אין מע״מ (עוסק פטור, מע״מ בשיעור אפס או עסקה פטורה).'); return finish(out, doc) }

  const pct = pctOf(doc, ctx)
  out.pct = pct
  out.rules.push('tax_invoice', 'category')
  const claim = r2(sign * Math.abs(vat) * pct / 100)
  const left = r2(sign * Math.abs(vat) - claim)
  if (!doc.category && !doc.category_id) need('category', 'למסמך אין קטגוריה: אחוז הקיזוז חושב כ-100% עד שתיבחר קטגוריה.')
  if (!String(doc.supplier_vat_id || '').trim()) need('supplier_id', 'מספר העוסק של הספק לא נקרא מהחשבונית.')
  // allocation number
  const floor = allocationFloor(day)
  if (!credit && floor !== null && out.net > floor) {
    const present = !!String(doc.allocation_number || doc.extraction?.allocation_number || '').trim()
    out.allocation = { required: true, present, floor }; out.rules.push('allocation')
    if (!present) need('allocation', `חשבונית מעל ${floor.toLocaleString('he-IL')} ₪ לפני מע״מ צריכה מספר הקצאה, והוא לא נמצא במסמך.`)
  }
  // six months
  if (!credit && day && !['approved', 'sent'].includes(doc.status)) {
    const months = (new Date(today) - new Date(day)) / (86400_000 * 30.44)
    if (months > 6) { out.rules.push('six_months'); need('six_months', `עברו יותר משישה חודשים מתאריך החשבונית (${day}).`) }
  }
  if (credit) {
    out.rules.push('credit')
    const orig = (ctx.documents || []).find((x) => x.id !== doc.id && TAX_INVOICE.includes(x.doc_type) && !['duplicate', 'rejected', 'archived'].includes(x.status)
      && ((doc.supplier_id && x.supplier_id === doc.supplier_id) || (doc.supplier_vat_id && x.supplier_vat_id === doc.supplier_vat_id)) && dayOf(x) <= day && Math.abs(num(x.total_amount) || 0) + 1 >= Math.abs(total))
    out.creditOf = orig ? orig.id : null
    out.cls = 'credit'
    why('credit', `חשבונית זיכוי: מקטינה את מע״מ התשומות ב-${r2(Math.abs(claim))} ₪.${orig ? ` נמצאה חשבונית מקורית של אותו ספק (${orig.doc_number || orig.id.slice(0, 6)}).` : ''}`)
    if (!orig) need('credit_original', 'לא נמצאה במערכת החשבונית המקורית של הזיכוי.')
  } else {
    out.cls = pct >= 99.99 ? 'full' : pct > 0 ? 'partial' : 'none'
    why('tax_invoice', `${type === 'invoice_receipt' ? 'חשבונית מס/קבלה' : 'חשבונית מס'} עם מע״מ של ${r2(Math.abs(vat))} ₪ (${(out.rate * 100).toFixed(0)}%).`)
    why('category', pct >= 99.99 ? 'ההוצאה בקטגוריה שמקוזזת במלואה.' : pct > 0 ? `לפי הקטגוריה "${doc.category}" מקוזזים ${Math.round(pct * 100) / 100}% מהמע״מ: ${r2(Math.abs(claim))} ₪ מתוך ${r2(Math.abs(vat))} ₪.` : `לפי הקטגוריה "${doc.category}" המע״מ אינו מקוזז.`)
  }
  // amounts: confirmed only for an approved document with nothing open; otherwise the same money is "potential"
  const open = out.needs.length > 0
  const approved = ['approved', 'sent'].includes(doc.status)
  out.blocked = left
  if (open) { if (out.cls !== 'credit') out.cls = out.needs.some((x) => ['rate', 'sum', 'allocation', 'six_months'].includes(x.code)) ? 'review' : out.cls; out.potential = claim }
  else if (!approved) out.potential = claim
  else { out.eligible = claim; out.confirmed = true }
  return finish(out, doc)
}
// the tax invoice a receipt pays: same supplier, issued up to 18 months before the receipt (or up to 3 days after)
function invoiceOf(doc, ctx, day, total) {
  if (!total) return null
  const same = (x) => (doc.supplier_id && x.supplier_id === doc.supplier_id) || (doc.supplier_vat_id && x.supplier_vat_id && x.supplier_vat_id === doc.supplier_vat_id)
  const cands = (ctx.documents || []).filter((x) => x.id !== doc.id && TAX_INVOICE.includes(x.doc_type) && !['duplicate', 'rejected', 'archived'].includes(x.status) && same(x) && num(x.total_amount))
  let best = null
  for (const x of cands) {
    const gap = (new Date(day) - new Date(dayOf(x))) / 86400_000
    if (!(gap >= -3 && gap <= 550)) continue
    const parts = Math.abs(num(x.total_amount)) / total
    const whole = Math.round(parts)
    if (whole >= 1 && whole <= 60 && Math.abs(parts - whole) < 0.011 && (whole > 1 || gap <= 180)) { if (!best || whole < best.parts) best = { doc: x, parts: whole } }
  }
  return best
}
function pctOf(doc, ctx) {
  const c = (ctx.categories || []).find((x) => (doc.category_id && x.id === doc.category_id) || x.name === doc.category)
  const p = c ? Number(c.vat_deductible_pct) : 100
  return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 100
}
function finish(out, doc) {
  out.approval = out.cls === 'duplicate' ? 'excluded' : out.confirmed ? 'approved' : out.needs.length ? 'needs_person' : ['approved', 'sent'].includes(doc.status) ? 'approved' : 'awaiting_approval'
  out.explain = out.reasons.join(' ')
  // what this assessment hangs on: when it changes, the nightly agent records the document again
  out.hash = [out.version, out.cls, out.vat, out.net, out.total, out.pct, out.eligible, out.potential, out.blocked, out.needs.map((x) => x.code).join(','), doc.status, doc.business_id || '', out.period].join('|')
  return out
}

/* everything, for the screens and the report. `rows` keeps each document beside its assessment. */
export function auditVat(documents, ctx = {}) {
  const scope = documents.filter((d) => !['processing', 'failed'].includes(d.status) && !['rejected', 'archived'].includes(d.status))
  const full = { ...ctx, documents: scope }
  const rows = scope.map((d) => ({ doc: d, a: assessVat(d, full) }))
  const sum = (f) => r2(rows.reduce((s, x) => s + (f(x) || 0), 0))
  const counted = rows.filter((x) => x.a.cls !== 'duplicate')
  const totals = {
    documents: counted.length,
    invoices: counted.filter((x) => TAX_INVOICE.includes(x.doc.doc_type)).length,
    receipts: counted.filter((x) => ['receipt', 'payment_confirmation'].includes(x.doc.doc_type)).length,
    credits: counted.filter((x) => x.doc.doc_type === 'credit').length,
    // the VAT printed on documents, each purchase once: a receipt that pays an invoice already here is not a second VAT
    vatFound: sum((x) => (x.a.cls === 'duplicate' || x.a.vat === null || x.a.paysInvoice || x.doc._proofFor ? 0 : (x.doc.doc_type === 'credit' ? -1 : 1) * x.a.vat)),
    eligible: sum((x) => x.a.eligible),
    potential: sum((x) => x.a.potential),
    blocked: sum((x) => (x.a.confirmed || x.a.cls === 'none' ? x.a.blocked : 0)),
    creditAdjust: sum((x) => (x.a.cls === 'credit' ? x.a.eligible + x.a.potential : 0)),
    needPerson: counted.filter((x) => x.a.needs.length).length,
    missingVat: counted.filter((x) => x.a.needs.some((n) => ['vat', 'tax_invoice', 'total'].includes(n.code))).length,
    discrepancies: counted.filter((x) => x.a.needs.some((n) => ['sum', 'rate'].includes(n.code))).length,
    byClass: Object.fromEntries(Object.keys(CLASS).map((k) => [k, counted.filter((x) => x.a.cls === k).length])),
  }
  return { rows, totals, version: VAT_VERSION }
}
// what the VAT of a document is worth in every older figure of the app (overview, reports, exports): the same answer
export const claimOf = (doc, categories, documents) => { const a = assessVat(doc, { categories, documents }); return a.eligible + a.potential }
