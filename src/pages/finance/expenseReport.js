// The expenses report as rows: used by the browser (Excel / CSV download) and by the server (the accountant email),
// so the file looks the same wherever it is made. Pure: no DOM, no network.
import { buildXlsx } from './xlsx.js'

const TYPE = { invoice: 'חשבונית מס', invoice_receipt: 'חשבונית מס/קבלה', receipt: 'קבלה', credit: 'חשבונית זיכוי', supplier_bill: 'חשבון ספק', payment_confirmation: 'אישור תשלום', proforma: 'חשבון עסקה', quote: 'הצעת מחיר', other: 'אחר' }
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const sign = (d) => (d.doc_type === 'credit' ? -1 : 1)
const IL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })
const israelDay = (t) => { const x = new Date(t || 0); return Number.isNaN(x.getTime()) || !t ? '' : IL_DAY.format(x) }
const dateOf = (d) => d.issue_date || israelDay(d.email_date || d.created_at)
const r2 = (n) => Math.round(n * 100) / 100

export const COLUMNS = [
  { header: 'תאריך המסמך', type: 'date', width: 13 },
  { header: 'ספק', type: 'text', width: 26 },
  { header: 'ח.פ / עוסק', type: 'text', width: 13 },
  { header: 'סוג מסמך', type: 'text', width: 16 },
  { header: 'מספר מסמך', type: 'text', width: 14 },
  { header: 'חברה', type: 'text', width: 20 },
  { header: 'פרויקט', type: 'text', width: 20 },
  { header: 'קטגוריה', type: 'text', width: 18 },
  { header: 'סכום לפני מע״מ', type: 'money', width: 15 },
  { header: 'מע״מ', type: 'money', width: 12 },
  { header: 'סכום כולל', type: 'money', width: 14 },
  { header: 'מטבע', type: 'text', width: 8 },
  { header: 'אמצעי תשלום', type: 'text', width: 14 },
  { header: 'קישור ב-Google Drive', type: 'text', width: 40 },
]

/* names: { businesses: {id: name}, projects: {id: name} }, links: {documentId: url} */
export function expenseRows(docs, names = {}, links = {}) {
  const list = [...docs].sort((a, b) => String(dateOf(a)).localeCompare(String(dateOf(b))))
  return list.map((d) => [
    dateOf(d), d.supplier_name || d.file_name || '', d.supplier_vat_id || '', TYPE[d.doc_type] || d.doc_type || '', d.doc_number || '',
    names.businesses?.[d.business_id] || '', names.projects?.[d.project_id] || '', d.category || '',
    num(d.amount_before_vat) === null ? null : r2(sign(d) * Math.abs(num(d.amount_before_vat))),
    num(d.vat_amount) === null ? null : r2(sign(d) * Math.abs(num(d.vat_amount))),
    num(d.total_amount) === null ? null : r2(sign(d) * Math.abs(num(d.total_amount))),
    d.currency || 'ILS', d.payment_method || '', links[d.id] || '',
  ])
}

/* totals add shekels only: amounts in other currencies are listed per currency, never added to ₪ */
function totalsOf(rows) {
  const ils = rows.filter((r) => !r[11] || r[11] === 'ILS')
  const sum = (i, list = ils) => r2(list.reduce((s, r) => s + (Number(r[i]) || 0), 0))
  const other = {}
  for (const r of rows) if (r[11] && r[11] !== 'ILS') other[r[11]] = r2((other[r[11]] || 0) + (Number(r[10]) || 0))
  return { before: sum(8), vat: sum(9), total: sum(10), count: rows.length, other }
}
const otherNote = (t) => Object.entries(t.other).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ')
function groupBy(rows, key) {
  const m = new Map()
  for (const r of rows.filter((x) => !x[11] || x[11] === 'ILS')) { const k = r[key] || 'ללא'; const g = m.get(k) || { name: k, count: 0, before: 0, vat: 0, total: 0, vatId: r[2] }; g.count++; g.before += Number(r[8]) || 0; g.vat += Number(r[9]) || 0; g.total += Number(r[10]) || 0; m.set(k, g) }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

/* one tab per company when the documents belong to more than one: the tab is named after the company (Excel allows 31
   characters, no \\ / ? * [ ] :, and no two tabs with one name), documents without a company in "ללא חברה" */
const RESERVED = new Set(['מסמכים', 'לפי קטגוריה', 'לפי ספק'])
export function companySheets(rows) {
  const by = new Map()
  for (const r of rows) { const k = r[5] || 'ללא חברה'; if (!by.has(k)) by.set(k, []); by.get(k).push(r) }
  if (by.size < 2) return []
  const used = new Set(RESERVED)
  return [...by.entries()].sort((a, b) => (a[0] === 'ללא חברה') - (b[0] === 'ללא חברה') || a[0].localeCompare(b[0], 'he')).map(([name, list]) => {
    const base = String(name).replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31).trim() || 'חברה'
    let tab = base; let i = 2
    while (used.has(tab)) { const suf = ` (${i++})`; tab = `${base.slice(0, 31 - suf.length)}${suf}` }
    used.add(tab)
    return { name: tab, company: name, rows: list }
  })
}

/* the workbook: documents (with totals), by category, by supplier */
export function expenseWorkbook(docs, names, links, { title = 'הוצאות' } = {}) {
  const rows = expenseRows(docs, names, links)
  const t = totalsOf(rows)
  const cats = groupBy(rows, 7); const sups = groupBy(rows, 1)
  const sumCols = [{ header: 'קטגוריה', type: 'text', width: 24 }, { header: 'מסמכים', type: 'int', width: 10 }, { header: 'לפני מע״מ', type: 'money', width: 15 }, { header: 'מע״מ', type: 'money', width: 13 }, { header: 'סכום כולל', type: 'money', width: 15 }, { header: 'אחוז מההוצאות', type: 'pct', width: 14 }]
  const share = (g) => (t.total ? g.total / t.total : 0)
  const totalRow = (x) => [['סה״כ בש״ח', '', '', '', '', '', '', `${x.count} מסמכים`, x.before, x.vat, x.total, 'ILS', '', otherNote(x) ? `במטבע אחר (לא בסה״כ): ${otherNote(x)}` : '']]
  return buildXlsx([
    { name: 'מסמכים', columns: COLUMNS, rows, totals: totalRow(t) },
    // documents of more than one company: a tab of its own for each company, named after it, with its own totals
    ...companySheets(rows).map((c) => ({ name: c.name, columns: COLUMNS, rows: c.rows, totals: totalRow(totalsOf(c.rows)) })),
    { name: 'לפי קטגוריה', columns: sumCols, rows: cats.map((g) => [g.name, g.count, r2(g.before), r2(g.vat), r2(g.total), share(g)]), totals: [['סה״כ', t.count, t.before, t.vat, t.total, 1]] },
    { name: 'לפי ספק', columns: [{ header: 'ספק', type: 'text', width: 28 }, { header: 'ח.פ / עוסק', type: 'text', width: 13 }, { header: 'מסמכים', type: 'int', width: 10 }, { header: 'לפני מע״מ', type: 'money', width: 15 }, { header: 'מע״מ', type: 'money', width: 13 }, { header: 'סכום כולל', type: 'money', width: 15 }],
      rows: sups.map((g) => [g.name, g.vatId || '', g.count, r2(g.before), r2(g.vat), r2(g.total)]), totals: [['סה״כ', '', t.count, t.before, t.vat, t.total]] },
  ], { title })
}

/* CSV that Excel opens correctly: UTF-8 with BOM, CRLF, dates dd/mm/yyyy, plain numbers; a total line at the end */
export function expenseCsv(docs, names, links) {
  const rows = expenseRows(docs, names, links)
  const t = totalsOf(rows)
  const cell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const dmy = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : '' }
  const lines = [COLUMNS.map((c) => c.header), ...rows.map((r) => r.map((v, i) => (i === 0 ? dmy(v) : COLUMNS[i].type === 'money' && v !== null ? Number(v).toFixed(2) : v)))]
  lines.push([], ['סה״כ בש״ח', '', '', '', '', '', '', `${t.count} מסמכים`, t.before.toFixed(2), t.vat.toFixed(2), t.total.toFixed(2), 'ILS'])
  if (otherNote(t)) lines.push([`במטבע אחר (לא בסה״כ): ${otherNote(t)}`])
  return `﻿${lines.map((l) => l.map(cell).join(',')).join('\r\n')}\r\n`
}
export const summaryOf = (docs) => totalsOf(expenseRows(docs))
