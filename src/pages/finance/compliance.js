/* The compliance check of one document, and of all of them. Pure functions over the rules registry (taxRules.js) and
   the VAT service (vatRules.js): the document screen, the compliance centre, the accountant's workbook and the nightly
   agent (server/finance/compliance.js) read the same answer from here.

   What it does for every document: identifies what it is, checks that what the law requires on it was read, checks the
   arithmetic against the rate of the document's own date, says how much of the VAT may be offset and how much of the
   expense is recognised for income tax (two separate questions with two separate answers), follows a credit note to
   its invoice and a receipt to its tax invoice, looks for a second copy, and raises a note for anything it is not sure
   of. It never changes a figure on a document and never approves one. A doubt is a note for the accountant, not a
   decision. Every check names the rule and the rule's version it used, so an old document keeps its old answer. */
import { ENGINE_VERSION, KINDS, ruleOn, ruleRef, RULES } from './taxRules.js'
import { assessVat } from './vatRules.js'

export const LEVEL = { ok: ['ok', 'תקין'], info: ['info', 'לידיעה'], doubt: ['warn', 'ספק: לבדיקה'], error: ['bad', 'דורש תיקון'] }
export const STATUS = {
  received: ['muted', 'נקלט'], reading: ['info', 'בתהליך זיהוי'], waiting: ['warn', 'ממתין לבדיקה'], ok: ['ok', 'תקין'],
  ok_pending: ['info', 'תקין בכפוף לאישור'], fix: ['bad', 'דורש תיקון'], accountant: ['warn', 'דורש בדיקת רואה חשבון'],
  not_recognised: ['muted', 'לא מוכר לצורכי מס'], no_vat_offset: ['muted', 'לא ניתן לקיזוז מע״מ'],
  ready: ['ok', 'מוכן לייצוא לרואה החשבון'], exported: ['ok', 'יוצא לרואה החשבון'], excluded: ['muted', 'לא נספר'],
}
export const AREA = { identity: 'זיהוי המסמך', validity: 'תקינות המסמך', math: 'חישוב', vat: 'מע״מ תשומות', income: 'מס הכנסה', credit: 'זיכוי', receipt: 'קבלה ותשלום', duplicate: 'כפילות', cash: 'מזומן', withholding: 'ניכוי במקור', books: 'ניהול ספרים' }

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const r2 = (v) => Math.round(v * 100) / 100
const TAX_INVOICE = ['invoice', 'invoice_receipt']
const DEAD = ['duplicate', 'rejected', 'archived']
const dayOf = (d) => (/^\d{4}-\d{2}-\d{2}/.test(String(d.issue_date || '')) ? String(d.issue_date).slice(0, 10) : String(d.email_date || d.created_at || '').slice(0, 10))
const fmt = (v) => Number(v).toLocaleString('he-IL', { maximumFractionDigits: 2 })
const norm = (s) => String(s || '').replace(/[^0-9a-zא-ת]/gi, '').toLowerCase()

/* the check digit of an Israeli identity / company / dealer number (nine digits) */
export function validIsraeliId(id) {
  const s = String(id || '').replace(/\D/g, '')
  if (s.length < 5 || s.length > 9) return false
  const p = s.padStart(9, '0')
  let sum = 0
  for (let i = 0; i < 9; i++) { let d = Number(p[i]) * ((i % 2) + 1); if (d > 9) d -= 9; sum += d }
  return sum % 10 === 0
}

/* what kind of expense this is, for the two tax questions: by the category's name first, then by what the document says */
export function kindOf(doc, ctx = {}) {
  const cat = (ctx.categories || []).find((x) => (doc.category_id && x.id === doc.category_id) || x.name === doc.category)
  const name = cat?.name || doc.category || ''
  const text = `${doc.description || ''} ${doc.supplier_name || ''}`
  // what the document itself says wins over a wide category ("general"), a narrow category wins over the text
  const byText = KINDS.find((k) => k.text && k.text.test(text))
  const byCat = KINDS.find((k) => k.category && k.category.test(name))
  const kind = byCat && byCat.id !== 'general' ? (byText && byText.strong ? byText : byCat) : byText || byCat || KINDS.find((k) => k.id === 'general')
  return { kind, category: cat || null, by: kind === byCat ? 'category' : kind === byText ? 'text' : 'default', other: byText && byCat && byText !== byCat && byCat.id !== 'general' ? byText : null }
}

/* ctx: { categories, documents, today, confirmed: { ruleId: {...} } } */
export function assessCompliance(doc, ctx = {}) {
  const today = ctx.today || new Date().toISOString().slice(0, 10)
  const day = dayOf(doc)
  const a = ctx.vat || assessVat(doc, ctx)
  const total = num(doc.total_amount); const net = num(doc.amount_before_vat); const vat = num(doc.vat_amount)
  const type = doc.doc_type || ''
  const checks = []
  const used = new Map()
  const add = (area, level, code, text, rule) => {
    const ref = rule ? ruleRef(rule, day) : null
    if (ref) used.set(rule, ref)
    checks.push({ area, level, code, text, rule: rule || null, version: ref?.version || null, source: ref?.source || null })
  }
  const out = { id: doc.id, engine: ENGINE_VERSION, day, today, type, period: a.period, checks, vat: a, kind: null, income: { pct: null, amount: 0, blocked: 0, basis: 'none', note: '' }, status: 'waiting' }

  if (['processing'].includes(doc.status)) { out.status = 'reading'; return finish(out, doc, used) }
  if (DEAD.includes(doc.status)) { out.status = 'excluded'; add('duplicate', 'info', 'excluded', doc.status === 'duplicate' ? 'המסמך סומן ככפילות ואינו נספר.' : 'המסמך נדחה או בארכיון ואינו נספר.'); return finish(out, doc, used) }
  if (doc.status === 'failed') { out.status = 'fix'; add('identity', 'error', 'unread', 'המסמך לא נקרא. צריך לקרוא אותו שוב או למלא את הפרטים ביד.'); return finish(out, doc, used) }

  // ---- 1. identification: what the law requires on the document, and whether it was read ----
  const isInvoice = TAX_INVOICE.includes(type) || type === 'credit'
  if (!type) add('identity', 'doubt', 'type', 'סוג המסמך לא זוהה.')
  if (!String(doc.supplier_name || '').trim()) add('identity', 'error', 'supplier', 'שם הספק לא נקרא מהמסמך.', isInvoice ? 'books_invoice_contents' : null)
  if (!String(doc.doc_number || '').trim()) add('identity', isInvoice ? 'error' : 'doubt', 'number', 'מספר המסמך לא נקרא.', isInvoice ? 'books_invoice_contents' : null)
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(doc.issue_date || ''))) add('identity', 'error', 'date', 'תאריך המסמך לא נקרא; השיעורים והספים נבדקו לפי תאריך הקליטה.', isInvoice ? 'books_invoice_contents' : null)
  if (total === null) add('identity', 'error', 'total', 'הסכום הכולל לא נקרא מהמסמך.')
  const idRaw = String(doc.supplier_vat_id || '').trim()
  if (isInvoice && !idRaw) add('identity', 'doubt', 'supplier_id', 'מספר העוסק של הספק לא נקרא מהחשבונית.', 'books_invoice_contents')
  else if (idRaw && /^\d{5,9}$/.test(idRaw.replace(/\D/g, '')) && !validIsraeliId(idRaw)) add('validity', 'doubt', 'supplier_id_check', `מספר העוסק ${idRaw} לא עובר את בדיקת ספרת הביקורת. ייתכן שספרה נקראה לא נכון.`)
  if (typeof doc.confidence === 'number' && doc.confidence < 0.6) add('identity', 'doubt', 'confidence', `הקריאה של המסמך בוודאות נמוכה (${Math.round(doc.confidence * 100)}%). כדאי להשוות למקור.`)
  // the same supplier number under another name elsewhere: one of the two readings is probably wrong
  const others = (ctx.documents || []).filter((x) => x.id !== doc.id && !DEAD.includes(x.status))
  if (idRaw && doc.supplier_name) {
    const clash = others.find((x) => String(x.supplier_vat_id || '').trim() === idRaw && x.supplier_name && norm(x.supplier_name) !== norm(doc.supplier_name) && !norm(x.supplier_name).includes(norm(doc.supplier_name)) && !norm(doc.supplier_name).includes(norm(x.supplier_name)))
    if (clash) add('validity', 'doubt', 'supplier_mismatch', `אותו מספר עוסק (${idRaw}) מופיע במערכת גם תחת השם "${clash.supplier_name}". כדאי לוודא איזה שם נכון.`)
  }

  // ---- 2. dates ----
  if (day && day > today) add('validity', 'doubt', 'future', `תאריך המסמך (${day}) עתידי.`)
  const keep = ruleOn('books_retention', day)?.value
  if (day && keep && (new Date(today) - new Date(day)) / 86400_000 > keep * 365.25) add('books', 'info', 'old', `המסמך ישן מ-${keep} שנים, מעבר לתקופת שמירת המסמכים.`, 'books_retention')
  if (doc.accounting_period && day && Math.abs((Number(doc.accounting_period.slice(0, 4)) - Number(day.slice(0, 4))) * 12 + Number(doc.accounting_period.slice(5, 7)) - Number(day.slice(5, 7))) > 6) add('validity', 'doubt', 'period', `החודש החשבונאי (${doc.accounting_period}) רחוק יותר משישה חודשים מתאריך המסמך (${day}).`, 'vat_six_months')

  // ---- 3. arithmetic, against the rate of the document's own date ----
  const rate = ruleOn('vat_rate', day)?.value
  if (total !== null && net !== null && vat !== null) {
    if (Math.abs(Math.abs(net) + Math.abs(vat) - Math.abs(total)) > 1) add('math', 'error', 'sum', `הסכומים לא מסתכמים: ${fmt(Math.abs(net))} + ${fmt(Math.abs(vat))} = ${fmt(r2(Math.abs(net) + Math.abs(vat)))}, ובמסמך ${fmt(Math.abs(total))}.`)
    else if (Math.abs(vat) > 0.005 && rate) {
      const should = r2(Math.abs(net) * rate)
      const tol = Math.max(0.5, Math.abs(net) * 0.0006)
      if (Math.abs(should - Math.abs(vat)) > tol) {
        const actual = Math.abs(net) > 0 ? Math.abs(vat) / Math.abs(net) : 0
        const older = RULES.vat_rate.versions.find((v) => Math.abs(v.value - actual) < 0.0035 && v.value !== rate)
        add('math', 'doubt', 'rate', `המע״מ במסמך ${fmt(Math.abs(vat))} ₪ (${(actual * 100).toFixed(1)}%), ולפי ${(rate * 100).toFixed(0)}% שבתוקף בתאריך המסמך היה צריך להיות ${fmt(should)} ₪. הפרש ${fmt(r2(Math.abs(vat) - should))} ₪.${older ? ` השיעור תואם ל-${(older.value * 100).toFixed(0)}% שהיה בתוקף עד ${older.to}.` : ' ייתכן שחלק מהסכום פטור או בשיעור אפס.'}`, 'vat_rate')
      } else add('math', 'ok', 'math_ok', `החישוב תקין: ${fmt(Math.abs(net))} × ${(rate * 100).toFixed(0)}% = ${fmt(Math.abs(vat))}, סה״כ ${fmt(Math.abs(total))}.`, 'vat_rate')
    }
  } else if (total !== null && isInvoice && vat === null) add('math', 'doubt', 'vat_unread', `המע״מ לא נקרא מהחשבונית.${rate ? ` אם הסכום כולל מע״מ בשיעור ${(rate * 100).toFixed(0)}%, המע״מ הוא כ-${fmt(r2(Math.abs(total) * rate / (1 + rate)))} ₪ (הערכה בלבד).` : ''}`, 'vat_rate')
  if (total !== null && !isInvoice && type !== 'credit' && total < 0) add('math', 'doubt', 'negative', 'סכום שלילי במסמך שאינו חשבונית זיכוי.')

  // ---- 4. input VAT (the VAT service's answer, with the rule behind each open point) ----
  const NEED_RULE = { tax_invoice: 'vat_deduction_document', allocation: 'vat_allocation', six_months: 'vat_six_months', foreign: 'vat_foreign_supplier', rate: 'vat_rate', credit_original: 'vat_credit_note' }
  for (const n of a.needs) {
    if (['sum', 'rate', 'total', 'supplier_id', 'vat'].includes(n.code)) continue   // said above, once
    const soft = ['company', 'category'].includes(n.code)
    add('vat', soft ? 'info' : 'doubt', `vat_${n.code}`, n.text, NEED_RULE[n.code])
  }
  const k = kindOf(doc, ctx)
  out.kind = { id: k.kind.id, label: k.kind.label, by: k.by }
  const hasVat = (a.vat || 0) > 0.005
  if (TAX_INVOICE.includes(type) && hasVat) {
    const legal = k.kind.vat          // { rule, pct } : what the regulations say for this kind, when they say something
    if (legal && legal.pct !== null && Math.abs(a.pct - legal.pct) > 0.5) {
      const more = a.pct > legal.pct
      add('vat', 'doubt', 'vat_pct', `ההוצאה נראית כ"${k.kind.label}", שלגביה ${legal.text}. בקטגוריה "${k.category?.name || 'ללא קטגוריה'}" מוגדר קיזוז של ${fmt(a.pct)}%${more ? `, כלומר ייתכן קיזוז ביתר של ${fmt(r2((a.vat || 0) * (a.pct - legal.pct) / 100))} ₪` : ''}.`, legal.rule)
    }
    if (a.cls === 'full' || a.cls === 'partial') add('vat', 'ok', 'vat_ok', `מע״מ תשומות: ${fmt(a.pct)}% מתוך ${fmt(a.vat)} ₪ = ${fmt(Math.abs(a.eligible || a.potential))} ₪${a.confirmed ? '' : ' (ממתין לאישור המסמך)'}.`, 'vat_deduction_document')
  }
  if (a.cls === 'no_vat' && TAX_INVOICE.includes(type) && doc.currency === 'ILS' && Math.abs(total || 0) > 0 && !k.kind.noVat) add('vat', 'info', 'no_vat', 'חשבונית בלי מע״מ: עוסק פטור, מע״מ בשיעור אפס או עסקה פטורה. אין מס תשומות לקיזוז.', 'vat_zero_exempt')

  // ---- 5. income tax: a separate question from the VAT ----
  const base = total === null ? 0 : (hasVat && a.net !== null ? a.net + (TAX_INVOICE.includes(type) || type === 'credit' ? Math.abs(a.blocked || 0) : (a.vat || 0)) : Math.abs(total))
  const sign = type === 'credit' ? -1 : 1
  const inc = k.kind.income           // { rule, pct, text, review }
  const paysInvoice = a.paysInvoice || doc._proofFor
  if (paysInvoice) { out.income = { pct: 0, amount: 0, blocked: 0, basis: 'paid_invoice', note: 'אישור תשלום של חשבונית שכבר נספרה; ההוצאה נרשמת לפי החשבונית.' } }
  else if (doc._replacedBy) { out.income = { pct: 0, amount: 0, blocked: 0, basis: 'replaced', note: 'חשבון עסקה שהוחלף בחשבונית מס; ההוצאה נרשמת לפי החשבונית.' } }
  else if (total !== null) {
    const pct = inc.pct === null ? 100 : inc.pct
    out.income = { pct, amount: r2(sign * base * pct / 100), blocked: r2(sign * base * (100 - pct) / 100), basis: inc.pct === null ? 'default' : inc.review ? 'estimate' : 'rule', note: inc.text, rule: inc.rule }
    if (inc.review) add('income', 'doubt', 'income_review', `מס הכנסה: ${inc.text}`, inc.rule)
    else if (inc.pct !== null && inc.pct < 100) add('income', 'info', 'income_partial', `מס הכנסה: ${inc.text}`, inc.rule)
    else add('income', 'ok', 'income_ok', `מס הכנסה: ${inc.text || 'הוצאה בייצור הכנסה, מוכרת במלואה לפי הכלל הכללי.'}`, inc.rule || 'income_general')
    if (k.other && k.other.income.pct !== pct) add('income', 'doubt', 'kind_conflict', `הקטגוריה היא "${k.category?.name}", אבל לפי תיאור המסמך ייתכן שזו הוצאת "${k.other.label}", שהכללים לגביה שונים.`, k.other.income.rule)
    // equipment that serves more than a year is an asset, not an expense of the year
    const asset = ruleOn('income_fixed_asset', day)?.value
    if (k.kind.asset && asset && Math.abs(base) >= asset && type !== 'credit') add('income', 'doubt', 'fixed_asset', `רכישת ציוד בסכום ${fmt(Math.abs(base))} ₪: ייתכן שזה רכוש קבוע, שמוכר בפחת לאורך שנים ולא כהוצאה מלאה בשנה אחת.`, 'income_fixed_asset')
  }

  // a tax invoice above the threshold without an allocation number: from 2026 the expense itself is not recognised either
  if (a.allocation?.required && !a.allocation.present && ruleOn('income_allocation', day)) add('income', 'doubt', 'income_allocation', 'בלי מספר הקצאה גם ההוצאה עצמה אינה מוכרת במס הכנסה, לא רק המע״מ. צריך להשיג מהספק את המספר.', 'income_allocation')

  // ---- 6. a credit note ----
  if (type === 'credit') {
    if (a.creditOf) {
      const orig = others.find((x) => x.id === a.creditOf)
      const sameCredits = others.filter((x) => x.doc_type === 'credit' && ((doc.supplier_id && x.supplier_id === doc.supplier_id) || (idRaw && String(x.supplier_vat_id || '').trim() === idRaw)))
      const credited = r2(sameCredits.reduce((s, x) => s + Math.abs(num(x.total_amount) || 0), 0) + Math.abs(total || 0))
      const full = orig && Math.abs(Math.abs(num(orig.total_amount) || 0) - Math.abs(total || 0)) <= 1
      add('credit', 'ok', 'credit_linked', `זיכוי ${full ? 'מלא' : 'חלקי'} על חשבונית ${orig?.doc_number || ''} (${fmt(Math.abs(num(orig?.total_amount) || 0))} ₪). הזיכוי מקטין את ההוצאה ואת מס התשומות.`, 'vat_credit_note')
      if (orig && credited > Math.abs(num(orig.total_amount) || 0) + 1) add('credit', 'doubt', 'credit_over', `סך הזיכויים של הספק (${fmt(credited)} ₪) גדול מהחשבונית המקורית (${fmt(Math.abs(num(orig.total_amount)))} ₪). ייתכן זיכוי כפול.`, 'vat_credit_note')
    }
    if (others.some((x) => x.doc_type === 'credit' && x.doc_number && x.doc_number === doc.doc_number && String(x.supplier_vat_id || '') === idRaw)) add('credit', 'doubt', 'credit_twice', 'חשבונית זיכוי עם אותו מספר של אותו ספק כבר במערכת.', 'vat_credit_note')
  }

  // ---- 7. a receipt: is its tax invoice here, and was the money counted once ----
  if (['receipt', 'payment_confirmation'].includes(type)) {
    if (paysInvoice) add('receipt', 'ok', 'receipt_linked', 'הקבלה מקושרת לחשבונית מס שבמערכת; ההוצאה והמע״מ נספרים פעם אחת, לפי החשבונית.', 'vat_deduction_document')
    else if (!k.kind.noVat && doc.currency === 'ILS') add('receipt', 'info', 'receipt_alone', 'קבלה בלי חשבונית מס מקושרת: התשלום נרשם כהוצאה, אבל מע״מ לא מקוזז לפי קבלה.', 'vat_deduction_document')
  }
  if (TAX_INVOICE.includes(type) && type === 'invoice') add('receipt', doc._paidBy ? 'ok' : 'info', 'paid', doc._paidBy ? 'שולמה: קבלה או אישור תשלום מקושרים לחשבונית.' : doc.paid ? 'סומנה כשולמה ביד, בלי אישור תשלום במערכת.' : 'אין במערכת אישור תשלום לחשבונית.')

  // ---- 8. a second copy of the same document under another file ----
  if (doc.duplicate_state === 'suspected') add('duplicate', 'doubt', 'dup_suspected', 'המערכת חושדת שהמסמך כפול למסמך אחר. צריך להכריע לפני אישור.')
  else if (doc.doc_number && total !== null) {
    const twin = others.find((x) => x.doc_type === type && String(x.doc_number || '') === String(doc.doc_number) && ((idRaw && String(x.supplier_vat_id || '').trim() === idRaw) || (doc.supplier_id && x.supplier_id === doc.supplier_id) || (doc.supplier_name && norm(x.supplier_name) === norm(doc.supplier_name))) && Math.abs((num(x.total_amount) || 0) - total) <= 1)
    if (twin && doc.duplicate_state !== 'dismissed') add('duplicate', 'doubt', 'dup_number', `מסמך נוסף של אותו ספק עם אותו מספר (${doc.doc_number}) ואותו סכום כבר במערכת. ייתכן שהועלה פעמיים (למשל פעם כתמונה ופעם כ-PDF).`)
  }

  // ---- 9. cash, and tax withheld at source ----
  const cash = ruleOn('cash_limit', day)?.value
  if (cash && total !== null && /cash|מזומן/i.test(String(doc.payment_method || '')) && Math.abs(total) > cash) add('cash', 'doubt', 'cash', `המסמך מסומן כתשלום במזומן, ומחיר העסקה ${fmt(Math.abs(total))} ₪ עולה על ${fmt(cash)} ₪: במזומן מותר לשלם עד ${fmt(Math.min(cash, r2(Math.abs(total) * 0.1)))} ₪ מתוכו.`, 'cash_limit')
  if (k.kind.withholding && TAX_INVOICE.includes(type) && total !== null && Math.abs(total) > 0) add('withholding', 'info', 'withholding', 'תשלום לקבלן או לנותן שירות: לוודא שיש בתיק אישור ניכוי מס במקור בתוקף של הספק, אחרת יש לנכות מס במקור מהתשלום.', 'withholding_services')

  return finish(out, doc, used)
}

function finish(out, doc, used) {
  out.rules = [...used.entries()].map(([id, ref]) => ({ id, ...ref }))
  const lv = (l) => out.checks.filter((c) => c.level === l)
  out.errors = lv('error').length; out.doubts = lv('doubt').length; out.notes = lv('info').length
  if (out.status === 'waiting') {
    const a = out.vat
    const ACCOUNTANT = ['vat_allocation', 'vat_six_months', 'vat_foreign', 'vat_pct', 'rate', 'income_review', 'fixed_asset', 'credit_over', 'credit_twice', 'vat_credit_original', 'cash', 'kind_conflict', 'period', 'income_allocation']
    const approved = ['approved', 'sent'].includes(doc.status)
    if (out.errors) out.status = 'fix'
    else if (out.checks.some((c) => c.level === 'doubt' && ACCOUNTANT.includes(c.code))) out.status = 'accountant'
    else if (out.doubts) out.status = 'waiting'
    else if (doc.status === 'sent' || doc.exported_at) out.status = 'exported'
    else if (approved) out.status = 'ready'
    else if (out.income.basis === 'rule' && out.income.pct === 0) out.status = 'not_recognised'
    else if ((a.vat || 0) > 0.005 && a.pct === 0 && ['invoice', 'invoice_receipt'].includes(doc.doc_type)) out.status = 'no_vat_offset'
    else if (out.checks.some((c) => c.level === 'info' && ['vat_company', 'vat_category', 'no_vat', 'receipt_alone'].includes(c.code)) || out.income.basis === 'estimate') out.status = 'ok_pending'
    else out.status = 'ok'
  }
  out.flagged = out.errors + out.doubts > 0
  out.summary = out.checks.filter((c) => c.level === 'error' || c.level === 'doubt').map((c) => c.text).join(' ')
  // what the answer hangs on: when it changes, the nightly agent writes the document to the log again
  out.hash = [out.engine, out.status, out.vat?.hash || '', out.income.pct, out.income.amount, out.checks.filter((c) => c.level !== 'ok').map((c) => c.code).sort().join(','), out.rules.map((r) => `${r.id}@${r.version}`).sort().join(',')].join('|')
  return out
}

/* everything: each document beside its answer, and the figures the owner asked to know at any moment */
export function auditCompliance(documents, ctx = {}) {
  const scope = documents.filter((d) => !['rejected', 'archived'].includes(d.status))
  const full = { ...ctx, documents: scope }
  const rows = scope.map((d) => ({ doc: d, c: assessCompliance(d, full) }))
  const live = rows.filter((x) => !['excluded', 'reading'].includes(x.c.status))
  const ils = live.filter((x) => !x.doc.currency || x.doc.currency === 'ILS')
  const sum = (list, f) => r2(list.reduce((s, x) => s + (f(x) || 0), 0))
  const once = (x) => !(x.c.vat.paysInvoice || x.doc._proofFor || x.doc._replacedBy)
  const spent = (x) => (once(x) && x.doc.total_amount != null ? (x.doc.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(x.doc.total_amount)) : 0)
  const totals = {
    documents: live.length,
    spent: sum(ils, spent),
    recognised: sum(ils, (x) => x.c.income.amount),
    notRecognised: sum(ils, (x) => x.c.income.blocked),
    vatFound: sum(ils, (x) => (once(x) && x.c.vat.vat ? (x.doc.doc_type === 'credit' ? -1 : 1) * x.c.vat.vat : 0)),
    vatConfirmed: sum(ils, (x) => x.c.vat.eligible),
    vatWaiting: sum(ils, (x) => x.c.vat.potential),
    vatBlocked: sum(ils, (x) => (x.c.vat.confirmed || x.c.vat.cls === 'none' || x.c.vat.cls === 'partial' || x.c.vat.cls === 'full' ? x.c.vat.blocked : 0)),
    foreign: live.length - ils.length,
    flagged: live.filter((x) => x.c.flagged).length,
    fix: live.filter((x) => x.c.status === 'fix').length,
    accountant: live.filter((x) => x.c.status === 'accountant').length,
    waiting: live.filter((x) => x.c.status === 'waiting').length,
    missingInvoice: live.filter((x) => x.c.checks.some((c) => c.code === 'vat_tax_invoice')).length,
    ready: live.filter((x) => x.c.status === 'ready').length,
    readyAmount: sum(ils.filter((x) => x.c.status === 'ready'), spent),
    exported: live.filter((x) => x.c.status === 'exported').length,
    byStatus: Object.fromEntries(Object.keys(STATUS).map((s) => [s, rows.filter((x) => x.c.status === s).length])),
  }
  return { rows, totals, engine: ENGINE_VERSION }
}
