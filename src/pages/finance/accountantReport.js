/* The expense report for the accountant: the documents a person chose, as a styled right-to-left Excel workbook
   (the report, a summary, the documents that need a look), as CSV, and as a page to print or save as PDF.

   Every figure comes from the document as it is in the system and from the one compliance check (compliance.js); the
   report never fills in what the system does not know. A missing value stays empty or says "לא ידוע". A credit note is
   a negative line. A receipt that pays a tax invoice already in the system is listed, marked "not counted", and left out
   of every total, so the same money is never there twice. Amounts in another currency are shown in that currency and
   are not added to the shekel totals (the system holds no exchange rate). Pure functions: the browser builds the file. */
import { DOC_TYPE, monthLabel } from './format.js'
import { PAY_LABEL, payState } from './ledger.js'
import { STATUS } from './compliance.js'
import { ENGINE_VERSION } from './taxRules.js'
import { buildStyledXlsx, colName, moneyFmt, FMT } from './xlsxPro.js'

const r2 = (v) => Math.round(v * 100) / 100
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

// ---- the look (after the owner's reference sheet: dark blue headers, soft bands, coloured tags) ----
const C = { head: '#0B3A5B', headText: '#FFFFFF', band: '#F1F7FB', line: '#D5DEE8', ink: '#14202B', muted: '#5B6B7A', title: '#07293A', totalFill: '#E3EDF5', link: '#1D4ED8' }
const TAG = {
  blue: ['#DBEAFE', '#1E40AF'], purple: ['#EDE9FE', '#5B21B6'], green: ['#DCFCE7', '#166534'], orange: ['#FFEDD5', '#9A3412'], grey: ['#E5E7EB', '#374151'], red: ['#FEE2E2', '#991B1B'], yellow: ['#FEF9C3', '#854D0E'],
  teal: ['#CCFBF1', '#115E59'], pink: ['#FCE7F3', '#9D174D'], indigo: ['#E0E7FF', '#3730A3'], lime: ['#ECFCCB', '#3F6212'], sky: ['#E0F2FE', '#075985'], amber: ['#FEF3C7', '#92400E'], rose: ['#FFE4E6', '#9F1239'],
}
export const TYPE_TAG = { invoice: 'blue', invoice_receipt: 'purple', receipt: 'green', payment_confirmation: 'green', credit: 'orange', proforma: 'grey', supplier_bill: 'grey', quote: 'grey', other: 'red' }
// the accounting status: the compliance check's answer, with "partial offset" shown as its own colour
export const STATUS_TAG = { ok: 'green', ok_pending: 'yellow', waiting: 'yellow', accountant: 'yellow', fix: 'red', not_recognised: 'grey', no_vat_offset: 'grey', partial: 'orange', ready: 'blue', exported: 'blue', received: 'grey', reading: 'grey', excluded: 'grey' }
const STATUS_LABEL = { ...Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[1]])), partial: 'קיזוז חלקי' }
const CAT_PALETTE = ['teal', 'amber', 'indigo', 'pink', 'lime', 'sky', 'purple', 'orange', 'rose', 'green', 'blue', 'yellow']
const CUR_TAG = { ILS: 'green', USD: 'sky', EUR: 'indigo', GBP: 'purple' }
const CUR_LABEL = { ILS: 'ש״ח', USD: 'דולר', EUR: 'אירו', GBP: 'ליש״ט' }

/* one line of the report for one document. `audit` is auditCompliance over ALL the documents (links between an invoice,
   its receipt and its credit note need the whole set); `links` maps a document id to its copy in the cloud. */
export function reportLine(doc, c, { businesses = [], links = {}, origin = '' } = {}) {
  const a = c.vat
  const credit = doc.doc_type === 'credit'; const sign = credit ? -1 : 1
  const total = num(doc.total_amount)
  const cur = doc.currency || 'ILS'
  const counted = !(a.paysInvoice || doc._proofFor || doc._replacedBy)
  const vat = a.vat === null || a.vat === undefined ? null : sign * a.vat
  // VAT that may be offset: only VAT printed on a tax invoice or a credit note. What the VAT service estimates for a
  // receipt ("if a tax invoice arrives") is said in the notes and is never a figure of the report.
  const printed = ['invoice', 'invoice_receipt', 'credit'].includes(doc.doc_type) && a.vat !== null && a.vat !== undefined && !a.estimate
  const allowed = printed ? r2((a.eligible || 0) + (a.potential || 0)) : r2(a.eligible || 0)
  const maybe = !printed && a.potential ? r2(a.potential) : 0
  const open = c.checks.filter((x) => x.level === 'error' || x.level === 'doubt')
  const statusKey = ['ok', 'ok_pending', 'ready', 'exported'].includes(c.status) && a.cls === 'partial' ? 'partial' : c.status
  const notes = [
    !counted ? (doc._replacedBy ? 'חשבון עסקה שהוחלף בחשבונית מס. לא נספר בסיכום.' : 'אישור תשלום של חשבונית מס שכבר במערכת. לא נספר בסיכום, כדי שההוצאה לא תיספר פעמיים.') : '',
    cur !== 'ILS' ? 'מטבע זר: שער החליפין לא הוזן במערכת, ולכן אין סכום בשקלים.' : '',
    ...open.map((x) => x.text),
    a.confirmed || !allowed ? '' : 'המע״מ לקיזוז ממתין לאישור המסמך.',
    maybe ? `אם תתקבל חשבונית מס, המע״מ שיותר לניכוי הוא כ-${maybe.toLocaleString('he-IL')} ₪ (הערכה, אינה בסכומי הדוח).` : '',
    c.income.basis === 'estimate' && !open.some((x) => x.code === 'income_review') ? `מס הכנסה: ${c.income.note}` : '',
    doc.notes ? `הערה פנימית: ${doc.notes}` : '',
  ].filter(Boolean)
  return {
    id: doc.id, doc, c, counted, credit, cur, open,
    supplier: doc.supplier_name || doc.file_name || 'לא ידוע', vatId: String(doc.supplier_vat_id || ''), number: String(doc.doc_number || ''),
    typeKey: doc.doc_type || 'other', type: DOC_TYPE[doc.doc_type] || 'לא ידוע', category: doc.category || 'ללא קטגוריה', description: doc.description || '',
    date: /^\d{4}-\d{2}-\d{2}/.test(String(doc.issue_date || '')) ? String(doc.issue_date).slice(0, 10) : '', payDate: /^\d{4}-\d{2}-\d{2}/.test(String(doc.payment_date || '')) ? String(doc.payment_date).slice(0, 10) : '',
    period: c.period || '', company: businesses.find((b) => b.id === doc.business_id)?.name || 'לא משויך',
    net: a.net === null || a.net === undefined ? null : sign * a.net, rate: vat !== null && Math.abs(vat) > 0.005 && a.rate ? a.rate : vat !== null ? 0 : null, vat,
    total: total === null ? null : sign * Math.abs(total), fx: cur === 'ILS' ? 1 : null, ils: cur === 'ILS' && total !== null ? sign * Math.abs(total) : null,
    payMethod: doc.payment_method || '', pay: PAY_LABEL[payState(doc)] === '—' ? '' : PAY_LABEL[payState(doc)],
    incPct: counted && c.income.pct !== null ? c.income.pct / 100 : null, incAmount: counted ? c.income.amount : 0, incBlocked: counted ? c.income.blocked : 0, incEstimate: c.income.basis === 'estimate',
    vatPct: vat !== null && Math.abs(vat) > 0.005 && counted ? (a.pct || 0) / 100 : null, vatAllowed: allowed, vatBlocked: counted && vat !== null ? r2(vat - allowed) : 0,
    statusKey, status: STATUS_LABEL[statusKey] || '', allocation: String(doc.allocation_number || ''), allocationNeeded: !!(a.allocation?.required && !a.allocation.present),
    notes: notes.join(' | '), link: links[doc.id] || (origin ? `${origin}/admin/finance/documents/${doc.id}` : ''), linkKind: links[doc.id] ? 'Google Drive' : 'במערכת',
  }
}

/* the figures of a selection: shekel documents only in the sums, each purchase once */
export function reportSummary(lines) {
  const ils = lines.filter((l) => l.cur === 'ILS'); const cnt = ils.filter((l) => l.counted)
  const sum = (list, f) => r2(list.reduce((s, l) => s + (Number(f(l)) || 0), 0))
  return {
    documents: lines.length, suppliers: new Set(lines.map((l) => l.vatId || l.supplier)).size,
    net: sum(cnt, (l) => l.net), vat: sum(cnt, (l) => l.vat), total: sum(cnt, (l) => l.total),
    vatAllowed: sum(cnt, (l) => l.vatAllowed), vatConfirmed: sum(cnt, (l) => Math.min(Math.abs(l.c.vat.eligible || 0), Math.abs(l.vatAllowed)) * Math.sign(l.vatAllowed || 0)), vatBlocked: sum(cnt, (l) => l.vatBlocked),
    recognised: sum(cnt, (l) => l.incAmount), notRecognised: sum(cnt, (l) => l.incBlocked),
    partial: sum(cnt.filter((l) => l.incPct !== null && l.incPct > 0 && l.incPct < 1), (l) => l.incAmount + l.incBlocked),
    review: lines.filter((l) => l.open.length).length, notCounted: lines.filter((l) => !l.counted).length,
    foreign: lines.filter((l) => l.cur !== 'ILS').length, credits: sum(cnt.filter((l) => l.credit), (l) => l.total),
  }
}
const groupBy = (lines, key, label = (k) => k) => {
  const m = new Map()
  for (const l of lines) { const k = key(l); const g = m.get(k) || { name: label(k), docs: 0, net: 0, vat: 0, total: 0, allowed: 0, cur: l.cur }; g.docs++; if (l.counted) { g.net += l.net || 0; g.vat += l.vat || 0; g.total += l.total || 0; g.allowed += l.vatAllowed || 0 } m.set(k, g) }
  return [...m.entries()].map(([k, g]) => ({ key: k, ...g, net: r2(g.net), vat: r2(g.vat), total: r2(g.total), allowed: r2(g.allowed) }))
}

/* the report's name: "דוח הוצאות – שם החברה – חודש ושנה" */
export function reportName(lines, { company = '' } = {}) {
  const periods = [...new Set(lines.map((l) => (l.date || l.period || '').slice(0, 7)).filter((p) => /^\d{4}-\d{2}$/.test(p)))].sort()
  const when = !periods.length ? '' : periods.length === 1 ? monthLabel(periods[0]) : periods[0].slice(0, 4) === periods[periods.length - 1].slice(0, 4) && periods.length === 12 ? periods[0].slice(0, 4) : `${monthLabel(periods[0])} עד ${monthLabel(periods[periods.length - 1])}`
  const companies = [...new Set(lines.map((l) => l.company))]
  const who = company || (companies.length === 1 && companies[0] !== 'לא משויך' ? companies[0] : 'קבוצת קורקוס')
  return { title: ['דוח הוצאות', who, when].filter(Boolean).join(' – '), company: who, when }
}

// ---- the columns of the main sheet, in the order the accountant reads them (right to left) ----
export const COLUMNS = [
  { k: 'supplier', h: 'ספק', w: 28 }, { k: 'vatId', h: 'מספר עוסק / ח.פ', w: 15 }, { k: 'number', h: 'מספר מסמך', w: 16 }, { k: 'type', h: 'סוג מסמך', w: 17, tag: 'type' },
  { k: 'category', h: 'קטגוריית הוצאה', w: 20, tag: 'category' }, { k: 'description', h: 'תיאור ההוצאה', w: 34, wrap: true }, { k: 'date', h: 'תאריך המסמך', w: 13, t: 'date' }, { k: 'payDate', h: 'תאריך תשלום', w: 13, t: 'date' },
  { k: 'net', h: 'סכום לפני מע״מ', w: 16, t: 'money', sum: true }, { k: 'rate', h: 'שיעור מע״מ', w: 11, t: 'pct' }, { k: 'vat', h: 'סכום המע״מ', w: 14, t: 'money', sum: true }, { k: 'total', h: 'סכום כולל מע״מ', w: 16, t: 'money', sum: true, bold: true },
  { k: 'curLabel', h: 'מטבע', w: 9, tag: 'currency' }, { k: 'fx', h: 'שער חליפין', w: 11, t: 'rate' }, { k: 'ils', h: 'סכום בשקלים', w: 16, t: 'ils', sum: true }, { k: 'payMethod', h: 'אמצעי תשלום', w: 14 }, { k: 'pay', h: 'סטטוס תשלום', w: 19 },
  { k: 'incPct', h: 'אחוז הכרה במס הכנסה', w: 13, t: 'pct' }, { k: 'incAmount', h: 'סכום מוכר במס הכנסה', w: 17, t: 'ils', sum: true }, { k: 'vatPct', h: 'אחוז קיזוז מע״מ', w: 12, t: 'pct' }, { k: 'vatAllowed', h: 'מע״מ המותר לניכוי', w: 16, t: 'ils', sum: true }, { k: 'vatBlocked', h: 'מע״מ שאינו מותר לניכוי', w: 17, t: 'ils', sum: true },
  { k: 'status', h: 'סטטוס בדיקה חשבונאית', w: 24, tag: 'status' }, { k: 'allocation', h: 'מספר הקצאה', w: 15 }, { k: 'notes', h: 'הערות לרואה החשבון', w: 60, wrap: true }, { k: 'linkText', h: 'קישור למסמך המקורי', w: 20, link: true }, { k: 'countedText', h: 'נספר בסיכום', w: 12, tag: 'counted' },
]

export function accountantWorkbook(lines, opts = {}) {
  const { title } = reportName(lines, opts)
  const s = reportSummary(lines)
  const cats = [...new Set(lines.map((l) => l.category))].sort((a, b) => a.localeCompare(b, 'he'))
  const catTag = (name) => TAG[CAT_PALETTE[cats.indexOf(name) % CAT_PALETTE.length]]
  const base = { border: C.line, color: C.ink }
  const head = (h) => ({ v: h, bold: true, color: C.headText, fill: C.head, border: C.head, wrap: true })
  const tag = (v, pair) => (v === '' || v === null || v === undefined ? { v: '', ...base } : { v, bold: true, fill: pair[0], color: pair[1], border: C.line })
  const pctFmt = (v) => (Math.abs(v * 100 - Math.round(v * 100)) < 0.005 ? '0%' : '0.00%')
  const today = opts.today || new Date().toISOString().slice(0, 10)

  // ---- 1. the report ----
  const HEAD_ROW = 3; const first = HEAD_ROW + 1; const last = HEAD_ROW + lines.length
  const main = [
    { height: 30, cells: [{ v: title, bold: true, size: 16, color: C.title }] },
    { height: 20, cells: [{ v: `הופק ב-${today.slice(8, 10)}/${today.slice(5, 7)}/${today.slice(0, 4)} · ${s.documents} מסמכים · ${s.suppliers} ספקים · הכללים שלפיהם נבדק: גרסה ${ENGINE_VERSION} · כלי בקרה והכנת חומר; אינו תחליף לאישור רואה החשבון`, color: C.muted, size: 10 }] },
    { height: 34, cells: COLUMNS.map((c) => head(c.h)) },
  ]
  lines.forEach((l, i) => {
    const band = i % 2 ? C.band : null
    const cell = (c) => {
      const look = { ...base, ...(band ? { fill: band } : {}), ...(c.wrap ? { wrap: true } : {}), ...(c.bold ? { bold: true } : {}) }
      if (c.tag === 'type') return tag(l.type, TAG[TYPE_TAG[l.typeKey] || 'red'])
      if (c.tag === 'category') return tag(l.category, catTag(l.category))
      if (c.tag === 'status') return tag(l.status, TAG[STATUS_TAG[l.statusKey] || 'grey'])
      if (c.tag === 'currency') return tag(CUR_LABEL[l.cur] || l.cur, TAG[CUR_TAG[l.cur] || 'grey'])
      if (c.tag === 'counted') return tag(l.counted ? 'כן' : 'לא', TAG[l.counted ? 'green' : 'grey'])
      if (c.link) return l.link ? { v: `פתיחת המסמך (${l.linkKind})`, href: l.link, color: C.link, underline: true, border: C.line, ...(band ? { fill: band } : {}) } : { v: 'אין קובץ', ...look, color: C.muted }
      const v = l[c.k]
      if (c.t === 'date') return { v, t: 'date', fmt: FMT.date, ...look }
      if (c.t === 'money') return { v, t: 'num', fmt: moneyFmt(l.cur), ...look, ...(l.credit ? { color: TAG.orange[1] } : {}) }
      if (c.t === 'ils') return { v, t: 'num', fmt: moneyFmt('ILS'), ...look, ...(l.credit ? { color: TAG.orange[1] } : {}) }
      if (c.t === 'pct') return v === null ? { v: '', ...look } : { v, t: 'num', fmt: pctFmt(v), ...look }
      if (c.t === 'rate') return v === null ? { v: l.cur === 'ILS' ? '' : 'לא ידוע', ...look, color: C.muted } : { v, t: 'num', fmt: FMT.rate, ...look }
      return { v: v ?? '', ...look }
    }
    // the row is as tall as its longest wrapped text (about 95 characters to a line of notes, 55 of description)
    const rowsOfText = Math.max(1, Math.ceil(l.notes.length / 95), Math.ceil(l.description.length / 55))
    main.push({ height: Math.min(150, Math.max(24, rowsOfText * 14 + 8)), cells: COLUMNS.map(cell) })
  })
  // the totals follow the filters, and leave out what is "not counted" and what is not in shekels
  const countedCol = colName(COLUMNS.findIndex((c) => c.tag === 'counted')); const curCol = colName(COLUMNS.findIndex((c) => c.tag === 'currency'))
  const cnt = lines.filter((l) => l.counted && l.cur === 'ILS')
  if (lines.length) {
    main.push({ height: 8, cells: [] })
    main.push({ height: 28, cells: COLUMNS.map((c, i) => {
      const L = colName(i); const look = { bold: true, fill: C.totalFill, border: C.head, color: C.title }
      if (i === 0) return { v: 'סה״כ בשקלים (לפי הסינון)', ...look }
      if (!c.sum) return { v: '', ...look }
      const val = r2(cnt.reduce((a, l) => a + (Number(l[c.k]) || 0), 0))
      return { f: `SUMPRODUCT(SUBTOTAL(109,OFFSET(${L}${first},ROW(${L}${first}:${L}${last})-ROW(${L}${first}),0))*(${countedCol}${first}:${countedCol}${last}="כן")*(${curCol}${first}:${curCol}${last}="${CUR_LABEL.ILS}"))`, v: val, fmt: moneyFmt('ILS'), ...look }
    }) })
  }
  const lastCol = colName(COLUMNS.length - 1)
  const listRef = (col, n) => `'רשימות'!$${col}$1:$${col}$${Math.max(1, n)}`
  const typeList = [...new Set(Object.values(DOC_TYPE))]; const statusList = [...new Set(Object.values(STATUS_LABEL))]; const payList = Object.values(PAY_LABEL).filter((x) => x !== '—')
  const colOf = (k) => colName(COLUMNS.findIndex((c) => c.k === k))
  const sheets = [{
    name: 'דוח הוצאות לרואה החשבון', tab: C.head, cols: COLUMNS.map((c) => c.w), rows: main, freeze: HEAD_ROW, filter: lines.length ? `A${HEAD_ROW}:${lastCol}${last}` : null, merges: [`A1:H1`, `A2:M2`],
    lists: lines.length ? [{ ref: `${colOf('type')}${first}:${colOf('type')}${last}`, source: listRef('A', typeList.length) }, { ref: `${colOf('category')}${first}:${colOf('category')}${last}`, source: listRef('B', cats.length) }, { ref: `${colOf('status')}${first}:${colOf('status')}${last}`, source: listRef('C', statusList.length) }, { ref: `${colOf('pay')}${first}:${colOf('pay')}${last}`, source: listRef('D', payList.length) }] : [],
  }]

  // ---- 2. the summary ----
  const M = moneyFmt('ILS')
  const sum = [{ height: 30, cells: [{ v: 'סיכום הוצאות', bold: true, size: 16, color: C.title }] }, { height: 20, cells: [{ v: `${title} · הסכומים בשקלים, כל רכישה פעם אחת${s.foreign ? ` · ${s.foreign} מסמכים במטבע זר אינם בסכומים` : ''}`, color: C.muted, size: 10 }] }, { height: 8, cells: [] }]
  const sumMerges = ['A1:F1', 'A2:F2']
  // the explanation of a figure runs over the four columns beside it
  const fig = (label, v, fmt, note = '', pair = null) => { sumMerges.push(`C${sum.length + 1}:F${sum.length + 1}`); sum.push({ height: 24, cells: [{ v: label, bold: true, ...base, ...(pair ? { fill: pair[0], color: pair[1] } : {}) }, { v, t: 'num', fmt, bold: true, ...base }, { v: note, color: C.muted, size: 10, border: C.line }, { v: '', border: C.line }, { v: '', border: C.line }, { v: '', border: C.line }] }) }
  sumMerges.push('C4:F4')
  sum.push({ height: 28, cells: [head('הנתון'), head('הסכום'), head('הסבר'), head(''), head(''), head('')] })
  fig('מספר המסמכים', s.documents, FMT.int, s.notCounted ? `${s.notCounted} מהם אישורי תשלום של חשבונית שבמערכת, ואינם נספרים` : '')
  fig('מספר הספקים', s.suppliers, FMT.int)
  fig('סך ההוצאות לפני מע״מ', s.net, M)
  fig('סך המע״מ במסמכים', s.vat, M)
  fig('סך ההוצאות כולל מע״מ', s.total, M, s.credits ? `אחרי זיכויים של ${Math.abs(s.credits).toLocaleString('he-IL')} ₪` : '', TAG.blue)
  fig('סך המע״מ המותר לקיזוז', s.vatAllowed, M, `מתוכו ${s.vatConfirmed.toLocaleString('he-IL')} ₪ במסמכים שאושרו; היתר ממתין לאישור`, TAG.green)
  fig('סך המע״מ שאינו מותר לקיזוז', s.vatBlocked, M, 'לפי סוג המסמך וסוג ההוצאה')
  fig('סך ההוצאות המוכרות למס הכנסה', s.recognised, M, 'לפי סוג ההוצאה; הערכה עד אישור רואה החשבון', TAG.green)
  fig('סך ההוצאות שאינן מוכרות', s.notRecognised, M)
  fig('סך ההוצאות המוכרות באופן חלקי', s.partial, M, 'סכום ההוצאות שחל עליהן אחוז הכרה חלקי')
  fig('מספר המסמכים הדורשים בדיקה', s.review, FMT.int, 'מפורטים בגיליון "מסמכים לבדיקה"', s.review ? TAG.yellow : null)
  const block = (name, groups, tagOf) => {
    sum.push({ height: 14, cells: [] })
    sum.push({ height: 28, cells: [head(name), head('מסמכים'), head('לפני מע״מ'), head('מע״מ'), head('כולל מע״מ'), head('מע״מ לקיזוז')] })
    groups.forEach((g, i) => { const band = i % 2 ? { fill: C.band } : {}; const mf = moneyFmt(g.cur && name === 'לפי מטבע' ? g.cur : 'ILS'); const n = (v) => ({ v, t: 'num', fmt: mf, ...base, ...band })
      sum.push({ height: 22, cells: [tagOf ? tag(g.name, tagOf(g)) : { v: g.name, ...base, ...band }, { v: g.docs, t: 'num', fmt: FMT.int, ...base, ...band }, n(g.net), n(g.vat), n(g.total), n(g.allowed)] }) })
  }
  const ilsLines = lines.filter((l) => l.cur === 'ILS'); const byTotal = (a, b) => Math.abs(b.total) - Math.abs(a.total)
  block('לפי ספק', groupBy(ilsLines, (l) => l.supplier).sort(byTotal))
  block('לפי קטגוריית הוצאה', groupBy(ilsLines, (l) => l.category).sort(byTotal), (g) => catTag(g.name))
  block('לפי חודש', groupBy(ilsLines, (l) => (l.date || l.period || '').slice(0, 7), (k) => (/^\d{4}-\d{2}$/.test(k) ? monthLabel(k) : 'בלי תאריך')).sort((a, b) => String(a.key).localeCompare(String(b.key))))
  block('לפי סוג מסמך', groupBy(ilsLines, (l) => l.typeKey, (k) => DOC_TYPE[k] || 'לא ידוע').sort(byTotal), (g) => TAG[TYPE_TAG[g.key] || 'red'])
  block('לפי מטבע', groupBy(lines, (l) => l.cur, (k) => CUR_LABEL[k] || k).sort(byTotal), (g) => TAG[CUR_TAG[g.key] || 'grey'])
  block('לפי סטטוס חשבונאי', groupBy(ilsLines, (l) => l.statusKey, (k) => STATUS_LABEL[k] || k).sort(byTotal), (g) => TAG[STATUS_TAG[g.key] || 'grey'])
  sheets.push({ name: 'סיכום הוצאות', tab: '#166534', cols: [36, 18, 18, 16, 18, 18], rows: sum, merges: sumMerges })

  // ---- 3. what needs a look: one line per reason ----
  const AREA = { identity: 'זיהוי המסמך', validity: 'תקינות המסמך', math: 'חישוב', vat: 'מע״מ תשומות', income: 'מס הכנסה', credit: 'זיכוי', receipt: 'קבלה ותשלום', duplicate: 'כפילות', cash: 'מזומן', withholding: 'ניכוי במקור', books: 'ניהול ספרים' }
  const chk = [{ height: 30, cells: [{ v: 'מסמכים לבדיקה', bold: true, size: 16, color: C.title }] }, { height: 20, cells: [{ v: s.review ? `${s.review} מסמכים עם הערה אחת או יותר. כל שורה היא סיבה אחת, עם הכלל שעליו היא נשענת.` : 'אין במסמכים שנבחרו הערות פתוחות.', color: C.muted, size: 10 }] },
    { height: 34, cells: ['ספק', 'מספר מסמך', 'סוג מסמך', 'תאריך המסמך', 'סכום כולל מע״מ', 'חומרה', 'תחום', 'הסיבה שבגללה נדרשת בדיקה', 'הכלל והמקור', 'קישור למסמך המקורי'].map(head) }]
  let n = 0
  for (const l of lines) for (const x of l.open) {
    const band = n++ % 2 ? { fill: C.band } : {}
    chk.push({ height: Math.min(90, Math.max(26, Math.ceil(x.text.length / 105) * 14 + 8)), cells: [{ v: l.supplier, ...base, ...band }, { v: l.number, ...base, ...band }, tag(l.type, TAG[TYPE_TAG[l.typeKey] || 'red']), { v: l.date, t: 'date', fmt: FMT.date, ...base, ...band }, { v: l.total, t: 'num', fmt: moneyFmt(l.cur), ...base, ...band },
      tag(x.level === 'error' ? 'דורש תיקון' : 'ספק: לבדיקה', TAG[x.level === 'error' ? 'red' : 'yellow']), { v: AREA[x.area] || '', ...base, ...band }, { v: x.text, ...base, ...band, wrap: true }, { v: x.source ? `${x.source.name}${x.version ? ` (גרסה ${x.version})` : ''}` : '', ...base, ...band, wrap: true, color: C.muted },
      l.link ? { v: `פתיחת המסמך (${l.linkKind})`, href: l.link, color: C.link, underline: true, border: C.line, ...band } : { v: 'אין קובץ', ...base, ...band, color: C.muted }] })
  }
  sheets.push({ name: 'מסמכים לבדיקה', tab: '#B45309', cols: [28, 16, 17, 13, 16, 14, 16, 70, 44, 22], rows: chk, freeze: 3, filter: n ? `A3:J${3 + n}` : null, merges: ['A1:F1', 'A2:H2'] })

  // ---- the lists behind the drop-downs (hidden) ----
  const len = Math.max(typeList.length, cats.length, statusList.length, payList.length)
  sheets.push({ name: 'רשימות', hidden: true, cols: [22, 24, 26, 22], rows: Array.from({ length: len }, (_, i) => ({ cells: [typeList[i], cats[i], statusList[i], payList[i]].map((v) => (v ? { v } : null)) })) })
  return buildStyledXlsx(sheets, { title })
}

/* the same lines as CSV (UTF-8 with a byte-order mark, so Excel reads the Hebrew) */
export function accountantCsv(lines) {
  const cols = COLUMNS.filter((c) => !c.link)
  const cell = (v) => { const x = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x }
  const dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
  const val = (l, c) => { const v = c.tag === 'currency' ? l.cur : c.tag === 'counted' ? (l.counted ? 'כן' : 'לא') : l[c.k]; if (v === null || v === undefined) return ''; if (c.t === 'date') return dmy(v); if (c.t === 'money' || c.t === 'ils') return Number(v).toFixed(2); if (c.t === 'pct') return `${Math.round(v * 10000) / 100}%`; return v }
  const rows = [[...cols.map((c) => c.h), 'קישור למסמך המקורי'], ...lines.map((l) => [...cols.map((c) => val(l, c)), l.link])]
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`
}

/* the report as a page to print or to save as PDF: the main columns, the summary, and the reasons for a check */
export function accountantHtml(lines, opts = {}) {
  const { title } = reportName(lines, opts); const s = reportSummary(lines)
  const e = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const m = (v, cur = 'ILS') => (v === null || v === undefined ? '' : `<bdi>${Number(v).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;${{ ILS: '₪', USD: '$', EUR: '€', GBP: '£' }[cur] || e(cur)}</bdi>`)
  const d = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
  const p = (v) => (v === null || v === undefined ? '' : `${Math.round(v * 10000) / 100}%`)
  const chip = (text, pair) => `<span class="chip" style="background:${pair[0]};color:${pair[1]}">${e(text)}</span>`
  const figs = [['מסמכים', s.documents], ['כולל מע״מ', m(s.total)], ['מע״מ במסמכים', m(s.vat)], ['מע״מ לקיזוז', m(s.vatAllowed)], ['מוכר במס הכנסה', m(s.recognised)], ['דורשים בדיקה', s.review]]
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${e(title)}</title><style>
@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,"Noto Sans Hebrew",sans-serif;color:#14202b;margin:0;font-size:10px;direction:rtl}
h1{color:#07293a;font-size:18px;margin:0 0 2px}h2{color:#07293a;font-size:13px;margin:16px 0 6px}.sub{color:#5b6b7a;margin:0 0 10px}
.figs{display:flex;gap:8px;margin:0 0 12px}.figs div{flex:1;border:1px solid #d5dee8;border-radius:8px;padding:6px 8px}.figs small{display:block;color:#5b6b7a}.figs b{font-size:13px}
table{border-collapse:collapse;width:100%}th{background:#0b3a5b;color:#fff;padding:5px 4px;text-align:right;font-weight:700}td{border:1px solid #d5dee8;padding:4px;text-align:right;vertical-align:top}
tr:nth-child(even) td{background:#f1f7fb}td.n{text-align:right;white-space:nowrap}.chip{display:inline-block;padding:1px 6px;border-radius:999px;font-weight:700;white-space:nowrap}tfoot td{background:#e3edf5!important;font-weight:700}
.note{color:#5b6b7a;margin-top:10px}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body>
<h1>${e(title)}</h1><p class="sub">הופק ב-${d(opts.today || new Date().toISOString().slice(0, 10))} · הסכומים בשקלים, כל רכישה פעם אחת · כלי בקרה והכנת חומר; אינו תחליף לאישור רואה החשבון</p>
<div class="figs">${figs.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
<table><thead><tr>${['ספק', 'ח.פ / עוסק', 'מספר', 'סוג מסמך', 'קטגוריה', 'תאריך', 'לפני מע״מ', 'מע״מ', 'כולל מע״מ', 'מטבע', '% הכרה', 'מע״מ לקיזוז', 'סטטוס'].map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>
${lines.map((l) => `<tr><td>${e(l.supplier)}</td><td><bdi>${e(l.vatId)}</bdi></td><td><bdi>${e(l.number)}</bdi></td><td>${chip(l.type, TAG[TYPE_TAG[l.typeKey] || 'red'])}</td><td>${e(l.category)}</td><td>${d(l.date)}</td><td class="n">${m(l.net, l.cur)}</td><td class="n">${m(l.vat, l.cur)}</td><td class="n"><b>${m(l.total, l.cur)}</b></td><td>${e(CUR_LABEL[l.cur] || l.cur)}</td><td>${p(l.incPct)}</td><td class="n">${m(l.vatAllowed)}</td><td>${chip(l.status, TAG[STATUS_TAG[l.statusKey] || 'grey'])}</td></tr>`).join('')}
</tbody><tfoot><tr><td colspan="6">סה״כ בשקלים</td><td class="n">${m(s.net)}</td><td class="n">${m(s.vat)}</td><td class="n">${m(s.total)}</td><td></td><td></td><td class="n">${m(s.vatAllowed)}</td><td></td></tr></tfoot></table>
${s.review ? `<h2>מסמכים לבדיקה (${s.review})</h2><table><thead><tr><th>ספק</th><th>מספר</th><th>סכום</th><th>הסיבה</th></tr></thead><tbody>${lines.flatMap((l) => l.open.map((x) => `<tr><td>${e(l.supplier)}</td><td><bdi>${e(l.number)}</bdi></td><td class="n">${m(l.total, l.cur)}</td><td>${e(x.text)}</td></tr>`)).join('')}</tbody></table>` : ''}
<p class="note">${s.notCounted ? `${s.notCounted} אישורי תשלום של חשבונית שבמערכת מופיעים ברשימה ואינם נספרים בסכומים. ` : ''}${s.foreign ? `${s.foreign} מסמכים במטבע זר מוצגים במטבע שלהם ואינם בסכומים בשקלים. ` : ''}הדוח המלא, עם כל העמודות והקישורים למסמכים, בקובץ ה-Excel.</p>
</body></html>`
}
