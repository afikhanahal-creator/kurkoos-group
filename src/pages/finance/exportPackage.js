// Builds an accountant package in the browser from stored, approved records.
import * as api from './api.js'
import { DOC_TYPE, claimableVat, docDate, money, monthLabel, nameOf, signedNet, signedTotal, toCsv, toExcel } from './format.js'
import { makeZip, saveBlob } from './zip.js'

const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
export const HEAD = ['#', 'תאריך', 'תקופה', 'ספק', 'ח.פ ספק', 'סוג', 'מספר', 'חברה', 'פרויקט', 'קטגוריה', 'לפני מע״מ', 'מע״מ', 'מע״מ לקיזוז', 'סה״כ', 'מטבע', 'אמצעי תשלום', 'שולם', 'תיאור', 'קובץ', 'מזהה']

export function fileNameOf(d, i) {
  const ext = d.file_mime === 'application/pdf' ? 'pdf' : (d.file_mime || '').startsWith('text/') ? 'html' : (d.file_mime || 'image/jpeg').split('/')[1]
  return `${String(i + 1).padStart(3, '0')}_${docDate(d)}_${safe(d.supplier_name) || 'מסמך'}${d.doc_number ? `_${safe(d.doc_number)}` : ''}.${ext}`
}
export function rowsOf(docs, ctx) {
  return docs.map((d, i) => [i + 1, docDate(d), d.accounting_period || '', d.supplier_name || '', d.supplier_vat_id || '', DOC_TYPE[d.doc_type] || '', d.doc_number || '', nameOf(ctx.businesses, d.business_id), nameOf(ctx.projects, d.project_id), d.category || '',
    signedNet(d), (d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(d.vat_amount) || 0), Math.round(claimableVat(d, ctx.categories) * 100) / 100, signedTotal(d), d.currency || 'ILS', d.payment_method || '', d.paid ? 'כן' : 'לא', d.description || '', fileNameOf(d, i), d.id])
}
function pdfHtml(docs, ctx, title) {
  const rows = rowsOf(docs, ctx)
  const total = docs.reduce((a, d) => a + signedTotal(d), 0)
  const vat = docs.reduce((a, d) => a + claimableVat(d, ctx.categories), 0)
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#1a1f2b;margin:24px}h1{color:#07293a;font-size:20px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd2db;padding:4px 6px;text-align:right}th{background:#e7eef1}td.n{text-align:left;direction:ltr}.sum{margin:12px 0;font-size:13px}@media print{button{display:none}}</style></head><body><button onclick="print()">הדפסה / שמירה כ-PDF</button><h1>${title}</h1><p class="sum">${docs.length} מסמכים · סה״כ ${money(total)} · מע״מ לקיזוז ${money(vat)} · הופק ${new Date().toLocaleString('he-IL')}</p><table><thead><tr>${['#', 'תאריך', 'ספק', 'ח.פ', 'סוג', 'מספר', 'חברה', 'פרויקט', 'קטגוריה', 'לפני מע״מ', 'מע״מ', 'סה״כ'].map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${[r[0], r[1], r[3], r[4], r[5], r[6], r[7], r[8], r[9]].map((c) => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('')}<td class="n">${money(r[10])}</td><td class="n">${money(r[11])}</td><td class="n">${money(r[13])}</td></tr>`).join('')}</tbody></table></body></html>`
}

/* format: zip | excel | csv | pdf. Returns nothing; saves or opens the file. */
export async function buildPackage(docs, format, ctx, base) {
  const rows = rowsOf(docs, ctx)
  const title = `קורקוס · הוצאות ${base.period ? monthLabel(base.period) : ''} ${base.company || ''}`.trim()
  const name = `קורקוס_הוצאות_${safe(base.period || 'בחירה')}${base.company ? `_${safe(base.company)}` : ''}`
  if (format === 'csv') return saveBlob(new Blob([toCsv(HEAD, rows)], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
  if (format === 'excel') return saveBlob(new Blob([toExcel('הוצאות', HEAD, rows)], { type: 'application/vnd.ms-excel' }), `${name}.xls`)
  if (format === 'pdf') {
    const w = window.open('', '_blank')
    if (w) { w.document.write(pdfHtml(docs, ctx, title)); w.document.close() } else saveBlob(new Blob([pdfHtml(docs, ctx, title)], { type: 'text/html' }), `${name}.html`)
    return
  }
  const files = [
    { name: `${name}.xls`, data: new TextEncoder().encode(toExcel('הוצאות', HEAD, rows)) },
    { name: `${name}.csv`, data: new TextEncoder().encode(toCsv(HEAD, rows)) },
    { name: 'metadata.json', data: new TextEncoder().encode(JSON.stringify({ generated_at: new Date().toISOString(), period: base.period, company: base.company, count: docs.length, documents: docs.map((d, i) => ({ id: d.id, file: fileNameOf(d, i), hash: d.file_hash, supplier: d.supplier_name, supplier_vat_id: d.supplier_vat_id, number: d.doc_number, date: d.issue_date, type: d.doc_type, before_vat: d.amount_before_vat, vat: d.vat_amount, total: d.total_amount, currency: d.currency, category: d.category, company: nameOf(ctx.businesses, d.business_id), project: nameOf(ctx.projects, d.project_id), approved_at: d.approved_at })) }, null, 1)) },
  ]
  for (const [i, d] of docs.entries()) if (d.file_path) files.push({ name: `מסמכים/${fileNameOf(d, i)}`, data: await api.fileBlob(d) })
  saveBlob(await makeZip(files), `${name}.zip`)
}
