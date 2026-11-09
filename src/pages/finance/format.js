/* shared labels, formatting and the permission table of the finance system */
export const ROLE = {
  admin: 'מנהל מערכת',
  finance_manager: 'מנהל/ת כספים',
  employee: 'עובד/ת',
  accountant: 'רואה חשבון',
}
/* what each role may do in the screens. The database enforces the same rules (supabase/finance.sql). */
const CAN = {
  approve: ['admin', 'finance_manager'],
  edit: ['admin', 'finance_manager'],
  export: ['admin', 'finance_manager'],
  upload: ['admin', 'finance_manager', 'employee'],
  connect: ['admin', 'finance_manager', 'employee'],
  operate: ['admin', 'finance_manager'],      // agents, automations, rules, reports of everything
  manage: ['admin'],                          // users, companies, integrations, automation switches
  reports: ['admin', 'finance_manager', 'accountant'],
}
export const can = (role, what) => !!role && (CAN[what] || []).includes(role)

export const STATUS = {
  processing: { label: 'בעיבוד', tone: 'info' },
  review: { label: 'לבדיקה', tone: 'warn' },
  approved: { label: 'מוכן לרו״ח', tone: 'ok' },
  sent: { label: 'נשלח לרו״ח', tone: 'done' },
  rejected: { label: 'נדחה', tone: 'muted' },
  duplicate: { label: 'חשד לכפילות', tone: 'muted' },
  failed: { label: 'לא נקרא', tone: 'bad' },
}
export const DOC_TYPE = {
  invoice: 'חשבונית מס',
  invoice_receipt: 'חשבונית מס/קבלה',
  receipt: 'קבלה',
  credit: 'חשבונית זיכוי',
  supplier_bill: 'חשבון ספק',
  payment_confirmation: 'אישור תשלום',
  proforma: 'חשבון עסקה',
  quote: 'הצעת מחיר',
  other: 'אחר',
}
export const SOURCE = { gmail: 'Gmail', outlook: 'Outlook', upload: 'העלאה', camera: 'צילום', forward: 'העברה במייל', whatsapp: 'וואטסאפ' }
export const PROJECT_STATUS = { planning: 'בתכנון', active: 'פעיל', on_hold: 'מושהה', done: 'הסתיים' }
export const AGENTS = {
  scanner: { name: 'סוכן סריקת מייל', desc: 'עובר על כל התיבות המחוברות ומזהה מיילים כספיים' },
  collector: { name: 'סוכן איסוף מסמכים', desc: 'מוריד קבצים, שומר את המקור ומונע כפילויות' },
  ocr: { name: 'סוכן קריאה (OCR + AI)', desc: 'Claude מסווג את המסמך וקורא ממנו את השדות' },
  validation: { name: 'סוכן בקרה', desc: 'חשבון, מע״מ, מספר עוסק, כפילויות וסכומים חריגים' },
  classification: { name: 'סוכן שיוך', desc: 'מציע חברה, פרויקט וקטגוריה לפי כללים והיסטוריה' },
  export: { name: 'סוכן ייצוא', desc: 'מכין חבילות לרו״ח ורושם כל ייצוא' },
  summary: { name: 'סוכן סיכום יומי', desc: 'דוח בוקר: חדשים, לבדיקה, תקלות, מוכנים לייצוא' },
}
export const FIELD_LABEL = {
  supplier_name: 'ספק', supplier_vat_id: 'ח.פ ספק', doc_type: 'סוג', doc_number: 'מספר מסמך', issue_date: 'תאריך',
  payment_date: 'תאריך תשלום', amount_before_vat: 'לפני מע״מ', vat_amount: 'מע״מ', total_amount: 'סה״כ', currency: 'מטבע',
  category: 'קטגוריה', description: 'תיאור', customer: 'לקוח', business_id: 'חברה', project_id: 'פרויקט', status: 'סטטוס',
  paid: 'שולם', payment_method: 'אמצעי תשלום', notes: 'הערות', due_date: 'לתשלום עד', source: 'מקור', file_name: 'קובץ',
}

const fmtCache = {}
export function money(v, currency = 'ILS') {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—'
  const key = currency || 'ILS'
  try { fmtCache[key] ||= new Intl.NumberFormat('he-IL', { style: 'currency', currency: key, maximumFractionDigits: 2 }) } catch { fmtCache[key] = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }) }
  return fmtCache[key].format(Number(v))
}
export const date = (d) => (d ? new Date(String(d).length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
export const dateTime = (d) => (d ? new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')
export function ago(t) {
  if (!t) return 'אף פעם'
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 1) return 'עכשיו'
  if (m < 60) return `לפני ${m} דק׳`
  if (m < 1440) return `לפני ${Math.round(m / 60)} שע׳`
  return `לפני ${Math.round(m / 1440)} ימים`
}
export const monthKey = (d) => (d ? String(d).slice(0, 7) : '')
export const monthLabel = (k) => (k ? new Date(`${k}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) : '')
export const docDate = (d) => d.issue_date || (d.email_date || d.created_at || '').slice(0, 10)
export const period = (d) => d.accounting_period || monthKey(docDate(d))
export const thisMonth = () => new Date().toISOString().slice(0, 7)
export const shiftMonth = (k, n) => { const d = new Date(`${k}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7) }

const sign = (d) => (d.doc_type === 'credit' ? -1 : 1)
export const signedTotal = (d) => sign(d) * Math.abs(Number(d.total_amount) || 0)
export const signedNet = (d) => sign(d) * Math.abs(Number(d.amount_before_vat) || 0)
export function claimableVat(doc, categories) {
  const c = categories.find((x) => x.name === doc.category)
  const pct = c ? Number(c.vat_deductible_pct) : 100
  return sign(doc) * Math.abs(Number(doc.vat_amount) || 0) * pct / 100
}
/* documents that count in the books: not quotes, proformas, duplicates, rejected or unread */
export const counts = (d) => !['rejected', 'duplicate', 'failed', 'processing'].includes(d.status) && !['quote', 'proforma', 'payment_confirmation'].includes(d.doc_type) && !d._proofFor   // a receipt that pays an invoice already counted (ledger.js)
export const issuesOf = (d) => (Array.isArray(d.issues) ? d.issues : [])
export const hasError = (d) => issuesOf(d).some((i) => i.level === 'error')
export const nameOf = (list, id) => list.find((x) => x.id === id)?.name || ''

/* CSV with a BOM so Excel opens Hebrew correctly */
export function toCsv(head, rows) {
  const cell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return '﻿' + [head, ...rows].map((l) => l.map(cell).join(',')).join('\r\n')
}
/* Excel 2003 XML: opens in Excel with Hebrew, right-to-left, numbers as numbers */
export function toExcel(sheet, head, rows) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cell = (v) => (typeof v === 'number' && Number.isFinite(v) ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${esc(v ?? '')}</Data></Cell>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="${esc(sheet).slice(0, 30)}" ss:RightToLeft="1"><Table><Row>${head.map((h) => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>${rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions></Worksheet></Workbook>`
}

/* the last n months, newest first, for month pickers */
export const recentMonths = (n = 36) => Array.from({ length: n }, (_, i) => shiftMonth(thisMonth(), -i))
