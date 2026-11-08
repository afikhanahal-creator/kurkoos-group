/* shared labels and formatting for the finance system */
export const STATUS = {
  processing: { label: 'בקריאה', tone: 'info' },
  review: { label: 'לבדיקה', tone: 'warn' },
  approved: { label: 'מאושר', tone: 'ok' },
  sent: { label: 'נשלח לרו״ח', tone: 'done' },
  rejected: { label: 'נדחה', tone: 'muted' },
  duplicate: { label: 'כפול', tone: 'muted' },
  failed: { label: 'נכשלה הקריאה', tone: 'bad' },
}
export const DOC_TYPE = {
  invoice: 'חשבונית מס',
  receipt: 'קבלה',
  invoice_receipt: 'חשבונית מס/קבלה',
  credit: 'חשבונית זיכוי',
  proforma: 'חשבון עסקה',
  quote: 'הצעת מחיר',
  other: 'אחר',
}
export const SOURCE = { gmail: 'Gmail', outlook: 'Outlook', upload: 'העלאה', camera: 'צילום', forward: 'העברה במייל', whatsapp: 'וואטסאפ' }

const fmtCache = {}
export function money(v, currency = 'ILS') {
  if (v === null || v === undefined || v === '') return '—'
  const key = currency || 'ILS'
  fmtCache[key] ||= new Intl.NumberFormat('he-IL', { style: 'currency', currency: key, maximumFractionDigits: 2 })
  return fmtCache[key].format(Number(v))
}
export const date = (d) => (d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
export const monthKey = (d) => (d ? String(d).slice(0, 7) : '')
export const monthLabel = (k) => (k ? new Date(`${k}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) : '')
export const docDate = (d) => d.issue_date || (d.email_date || d.created_at || '').slice(0, 10)
/* VAT the company can claim for a document, after the category's deductible share */
export function claimableVat(doc, categories) {
  const c = categories.find((x) => x.name === doc.category)
  const pct = c ? Number(c.vat_deductible_pct) : 100
  const sign = doc.doc_type === 'credit' ? -1 : 1
  return sign * (Number(doc.vat_amount) || 0) * pct / 100
}
export const signedTotal = (d) => (d.doc_type === 'credit' ? -1 : 1) * (Number(d.total_amount) || 0)
/* documents that count in the books: not quotes, not duplicates or rejected */
export const counts = (d) => !['rejected', 'duplicate', 'failed'].includes(d.status) && !['quote', 'proforma'].includes(d.doc_type)
