// Agent 5: deterministic checks on the extracted fields. Nothing here is AI: every issue is a rule
// a person can read. Errors keep the document in review; nothing is ever approved automatically.

/* Israeli company / person ID check digit (ת"ז, ח.פ, ע.מ: 9 digits) */
export function validIsraeliId(id) {
  const s = String(id || '').replace(/\D/g, '')
  if (s.length < 5 || s.length > 9) return false
  const p = s.padStart(9, '0')
  let sum = 0
  for (let i = 0; i < 9; i++) { let d = Number(p[i]) * ((i % 2) + 1); if (d > 9) d -= 9; sum += d }
  return sum % 10 === 0
}

const INVOICE_TYPES = ['invoice', 'invoice_receipt', 'credit', 'supplier_bill']
export const KEY_FIELDS = ['supplier_name', 'doc_number', 'issue_date', 'total_amount']

export function validate(doc, ctx = {}) {
  const issues = []
  const add = (level, code, field, message) => issues.push({ level, code, field, message })
  const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  const before = n(doc.amount_before_vat); const vat = n(doc.vat_amount); const total = n(doc.total_amount)

  for (const f of KEY_FIELDS) if (doc[f] === null || doc[f] === undefined || doc[f] === '') add('error', 'missing', f, 'שדה חובה חסר')
  if (INVOICE_TYPES.includes(doc.doc_type)) {
    if (!doc.supplier_vat_id) add('warn', 'missing', 'supplier_vat_id', 'חסר מספר עוסק של הספק')
    if (vat === null) add('warn', 'missing', 'vat_amount', 'חסר סכום המע״מ')
  }
  if (doc.supplier_vat_id && !validIsraeliId(doc.supplier_vat_id) && (doc.currency || 'ILS') === 'ILS') add('warn', 'bad_vat_id', 'supplier_vat_id', 'ספרת הביקורת של מספר העוסק לא תקינה')

  if (before !== null && vat !== null && total !== null && Math.abs(before + vat - total) > 1) add('error', 'sum', 'total_amount', `לפני מע״מ ועוד מע״מ (${(before + vat).toFixed(2)}) אינם שווים לסה״כ`)
  if (before && vat !== null && (doc.currency || 'ILS') === 'ILS' && INVOICE_TYPES.includes(doc.doc_type) && vat !== 0) {
    const year = Number(String(doc.issue_date || '').slice(0, 4)) || new Date().getFullYear()
    const rate = year >= 2025 ? 0.18 : 0.17
    if (Math.abs(vat / before - rate) > 0.006) add('warn', 'vat_rate', 'vat_amount', `שיעור המע״מ (${((vat / before) * 100).toFixed(1)}%) שונה מ-${rate * 100}%`)
  }
  if (total !== null && total < 0 && doc.doc_type !== 'credit') add('warn', 'negative', 'total_amount', 'סכום שלילי במסמך שאינו זיכוי')

  if (doc.issue_date) {
    const d = new Date(`${doc.issue_date}T00:00:00Z`)
    if (d.getTime() > Date.now() + 2 * 86400_000) add('error', 'future_date', 'issue_date', 'תאריך עתידי')
    else if (Date.now() - d.getTime() > 400 * 86400_000) add('warn', 'old_date', 'issue_date', 'מסמך בן יותר משנה')
  }

  const fc = doc.field_confidence || {}
  for (const [f, c] of Object.entries(fc)) if (typeof c === 'number' && c < 0.7 && doc[f] !== null && doc[f] !== undefined && doc[f] !== '') add('warn', 'low_confidence', f, `ודאות נמוכה (${Math.round(c * 100)}%)`)

  if (ctx.duplicateOf) add('error', 'duplicate', 'doc_number', 'כבר קיים מסמך עם אותו ספק ואותו מספר')
  if (ctx.possibleDuplicate) add('warn', 'possible_duplicate', 'total_amount', 'יש מסמך של אותו ספק באותו תאריך ובאותו סכום')
  if (ctx.flagAmount && total !== null && Math.abs(total) >= ctx.flagAmount) add('warn', 'large_amount', 'total_amount', `סכום מעל ${ctx.flagAmount.toLocaleString('he-IL')} ₪`)
  if (ctx.supplierMedian && total !== null && total > ctx.supplierMedian * 3 && total - ctx.supplierMedian > 1000) add('warn', 'unusual_amount', 'total_amount', `פי ${Math.round(total / ctx.supplierMedian)} מהסכום הרגיל של הספק`)
  if (ctx.extractionNotes) add('info', 'ai_note', null, ctx.extractionNotes)
  // layer 1: can the document be read at all, and is the picture good enough
  const qy = ctx.quality || {}
  if (qy.readable === false) add('error', 'unreadable', null, 'המסמך לא קריא. כדאי לצלם שוב באור טוב')
  else {
    if (qy.blurry) add('warn', 'blurry', null, 'הצילום מטושטש: כדאי לבדוק את הסכומים')
    if (qy.cropped) add('warn', 'cropped', null, 'חלק מהמסמך חתוך בצילום')
    if (qy.missing_pages) add('warn', 'missing_pages', null, 'חסר עמוד במסמך')
    if (qy.handwritten) add('info', 'handwritten', null, 'חלק מהערכים בכתב יד')
  }
  // layer 3: two independent readings did not agree on a field
  const LABEL = { supplier_vat_id: 'מספר העוסק', doc_number: 'מספר המסמך', issue_date: 'התאריך', amount_before_vat: 'הסכום לפני מע״מ', vat_amount: 'המע״מ', total_amount: 'הסה״כ' }
  for (const d of ctx.disagree || []) add('error', 'ai_disagree', d.field, `שתי קריאות שונות של ${LABEL[d.field] || d.field}: ${d.first ?? 'ריק'} מול ${d.second ?? 'ריק'}. בדקו מול המסמך`)
  return issues
}

export const minConfidence = (fc) => {
  const vals = KEY_FIELDS.map((f) => fc?.[f]).filter((v) => typeof v === 'number')
  return vals.length ? Math.min(...vals) : null
}
