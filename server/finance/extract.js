// Agents 3 + 4: classify the document and extract its fields with Claude, as structured output.
// Claude is told never to guess: a field it cannot read stays empty with a low confidence.
import { env, DOC_TYPES } from './env.js'
import { fetchRetry } from './http.js'

// what a document can be. The first group is kept as an expense; the second is skipped (no financial record)
export const RELEVANT_CLASSES = ['tax_invoice', 'invoice_receipt', 'receipt', 'transaction_invoice', 'credit_note', 'supplier_bill', 'payment_confirmation']
export const SKIP_CLASSES = ['quote', 'purchase_order', 'contract', 'legal', 'marketing', 'correspondence', 'bank_statement', 'personal', 'other']
const DOC_CLASSES = [...RELEVANT_CLASSES, ...SKIP_CLASSES]
export const CLASS_LABEL = { tax_invoice: 'חשבונית מס', invoice_receipt: 'חשבונית מס/קבלה', receipt: 'קבלה', transaction_invoice: 'חשבון עסקה', credit_note: 'חשבונית זיכוי', supplier_bill: 'דרישת תשלום', payment_confirmation: 'אישור תשלום', quote: 'הצעת מחיר', purchase_order: 'הזמנת רכש', contract: 'חוזה או הסכם', legal: 'מסמך משפטי', marketing: 'פרסום או ניוזלטר', correspondence: 'התכתבות', bank_statement: 'דף חשבון', personal: 'מסמך אישי', other: 'מסמך אחר' }
/* keep | skip | unsure. A document is skipped only when the reader is sure it is not an expense; an unsure answer
   is kept and sent to a person. Old answers without a class fall back to is_financial_document. */
export function relevanceOf(x) {
  const cls = x?.document_class
  const conf = Number.isFinite(Number(x?.relevance_confidence)) ? Number(x.relevance_confidence) : null
  if (!cls) return { verdict: x?.is_financial_document ? 'keep' : 'skip', cls: null, conf }
  if (RELEVANT_CLASSES.includes(cls)) return { verdict: x.is_financial_document === false && (conf ?? 1) < 0.8 ? 'unsure' : 'keep', cls, conf }
  if ((conf ?? 0) >= 0.8 && !x.is_financial_document) return { verdict: 'skip', cls, conf }
  return { verdict: 'unsure', cls, conf }
}

const FIELDS = ['supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'payment_date', 'amount_before_vat', 'vat_amount', 'total_amount', 'currency', 'category', 'description', 'customer']
const num = { type: ['number', 'null'] }
const str = (description) => ({ type: 'string', description })

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_financial_document', 'document_class', 'relevance_confidence', 'doc_type', 'supplier_name', 'supplier_trading_name', 'supplier_vat_id', 'customer_name', 'customer_vat_id', 'customer_address', 'doc_number', 'issue_date', 'due_date', 'payment_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'vat_rate', 'description', 'category', 'payment_method', 'project_hint', 'supplier_email', 'supplier_phone', 'supplier_address', 'supplier_website', 'discount_amount', 'extra_charges', 'page_count', 'quality', 'totals_text', 'field_confidence', 'notes'],
  properties: {
    is_financial_document: { type: 'boolean', description: 'true only for a document that records an expense or a payment: tax invoice, invoice-receipt, receipt, transaction invoice (חשבון עסקה), credit note, supplier bill, payment confirmation. false for a quote, order, contract, legal letter, marketing, correspondence, statement or anything personal' },
    document_class: { type: 'string', enum: DOC_CLASSES, description: 'what this document is' },
    relevance_confidence: { type: 'number', description: '0 to 1: how sure you are about document_class' },
    doc_type: { type: 'string', enum: DOC_TYPES },
    supplier_name: str('the business that issued the document, exactly as printed; empty if not printed'),
    supplier_trading_name: str('the brand / trading name when it differs from the legal name (e.g. "שופרסל דיל" for "שופרסל בע״מ"); empty otherwise'),
    supplier_vat_id: str('issuer ח.פ / ע.מ / VAT number, digits only; empty if not printed'),
    customer_name: str('who the document is addressed to; empty if not printed'),
    customer_vat_id: str('digits only; empty if not printed'),
    customer_address: str('the address of the customer (who the document is addressed to), as printed; empty if not printed'),
    doc_number: str('the document number; empty if not printed'),
    issue_date: str('YYYY-MM-DD; empty if not printed'),
    due_date: str('YYYY-MM-DD; empty if not printed'),
    payment_date: str('YYYY-MM-DD when a payment date is printed (receipts, payment confirmations); empty otherwise'),
    currency: str('ISO 4217; ILS for ₪/ש"ח'),
    amount_before_vat: num,
    vat_amount: num,
    total_amount: { type: ['number', 'null'], description: 'the total including VAT, as printed' },
    vat_rate: { type: ['number', 'null'], description: 'the VAT percent printed on the document, e.g. 18' },
    description: str('one short Hebrew line: what was bought'),
    category: str('the closest category from the list'),
    payment_method: str('אשראי / העברה בנקאית / מזומן / צ׳ק / הוראת קבע; empty if not printed'),
    project_hint: str('a project, site address, project code or job name printed on the document; empty if none'),
    supplier_email: str('the issuer email printed on the document; empty if none'),
    supplier_phone: str('the issuer phone; empty if none'),
    supplier_address: str('the issuer address; empty if none'),
    supplier_website: str('the issuer website; empty if none'),
    discount_amount: { type: ['number', 'null'], description: 'a discount printed on the document, as a positive number; null if none' },
    extra_charges: { type: ['number', 'null'], description: 'extra charges printed separately (delivery, service, tip); null if none' },
    page_count: { type: ['integer', 'null'], description: 'pages in this document' },
    quality: {
      type: 'object', additionalProperties: false, required: ['readable', 'blurry', 'cropped', 'rotated', 'missing_pages', 'handwritten'],
      properties: {
        readable: { type: 'boolean', description: 'the text can be read' },
        blurry: { type: 'boolean', description: 'a photo that is out of focus or too dark to read some values' },
        cropped: { type: 'boolean', description: 'part of the document (often the totals or the header) is cut off' },
        rotated: { type: 'boolean', description: 'the page is sideways or upside down' },
        missing_pages: { type: 'boolean', description: 'it says "page 1 of 2" (or similar) and a page is missing' },
        handwritten: { type: 'boolean', description: 'key values are handwritten' },
      },
    },
    totals_text: str('the exact printed lines of the totals block (subtotal, VAT, total), copied as printed; empty if none'),
    field_confidence: {
      type: 'object', additionalProperties: false, required: FIELDS,
      properties: Object.fromEntries(FIELDS.map((f) => [f, { type: 'number', description: '0 to 1' }])),
    },
    notes: str('anything unclear: illegible amounts, two totals, handwriting; empty if none'),
  },
}

export async function extract({ buf, mime, text, categories, hint }) {
  if (!env.anthropicKey()) throw new Error('ANTHROPIC_API_KEY לא הוגדר ב-Vercel')
  const content = []
  if (buf && mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } })
  else if (buf) content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } })
  content.push({
    type: 'text',
    text: [
      'This document (or email) was received by a company of the Kurkoos group in Israel (construction, real estate development, supervision, brokerage).',
      'Fill the fields ONLY from what is printed. Never invent or compute a value that is not printed: leave it empty (or null) and give it a low confidence.',
      'Amounts are plain numbers, no currency signs or thousands separators. Israeli VAT by document date: 18% from 2025-01-01, 17% from 2015-10-01 to 2024-12-31, 18% from 2013-06-02 to 2015-09-30. Read the rate printed on the document; never assume it.',
      'חשבונית מס = invoice, חשבונית מס/קבלה = invoice_receipt, קבלה = receipt, חשבונית זיכוי = credit, דרישת תשלום / חשבון ספק = supplier_bill, אישור תשלום / אישור העברה = payment_confirmation, חשבון עסקה = proforma, הצעת מחיר = quote.',
      'First decide document_class. Kept as expenses: tax_invoice (חשבונית מס), invoice_receipt (חשבונית מס/קבלה), receipt (קבלה), transaction_invoice (חשבון עסקה / proforma), credit_note (חשבונית זיכוי), supplier_bill (דרישת תשלום), payment_confirmation (אישור תשלום / העברה).',
      'Not expenses: quote (הצעת מחיר), purchase_order (הזמנה), contract (חוזה / הסכם), legal (מכתב עורך דין, כתב תביעה), marketing (newsletter, advertisement, promotion), correspondence (a letter or email with no invoice), bank_statement, personal, other.',
      'An order confirmation without a tax invoice, a shipping notice or a Word letter is not an expense. When the class is not clear, give relevance_confidence below 0.8.',
      `category must be one of: ${categories.join(' | ')}.`,
      'field_confidence: how sure you are that each value is exactly what is printed (1 = printed clearly, below 0.7 = unsure or missing).',
      hint ? `Context: ${hint}` : '',
      text ? `\n--- email ---\n${text.slice(0, 40_000)}` : '',
    ].filter(Boolean).join('\n'),
  })
  const r = await fetchRetry(`${env.anthropic()}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.anthropicKey(), 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({
      model: env.model(),
      max_tokens: 4000,
      fallbacks: 'default',
      output_config: { effort: env.effort(), format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d.error && d.error.message) || `claude ${r.status}`)
  if (d.stop_reason === 'refusal') throw new Error('Claude declined to read this document')
  if (d.stop_reason === 'max_tokens') throw new Error('Claude answer was cut off')
  const out = JSON.parse((d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
  // usage, kept per document so the cost of reading is visible (tokens, not a price guess)
  Object.defineProperty(out, '_usage', { value: { in: d.usage?.input_tokens || 0, out: d.usage?.output_tokens || 0, calls: 1 }, enumerable: false, configurable: true, writable: true })
  return out
}

/* Layer 3: a second, independent reading of the critical fields only, with more thinking effort.
   It runs when the first reading is unsure, the arithmetic does not close, or the image is poor.
   Agreement raises confidence; disagreement is flagged on the field, and both readings are kept. */
const VERIFY_FIELDS = ['supplier_vat_id', 'doc_number', 'issue_date', 'amount_before_vat', 'vat_amount', 'total_amount']
export const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false, required: VERIFY_FIELDS,
  properties: {
    supplier_vat_id: str('issuer ח.פ / ע.מ, digits only; empty if not printed'),
    doc_number: str('the document number; empty if not printed'),
    issue_date: str('YYYY-MM-DD; empty if not printed'),
    amount_before_vat: num, vat_amount: num,
    total_amount: { type: ['number', 'null'], description: 'the final total to pay, as printed' },
  },
}
export async function verify({ buf, mime, text }) {
  if (!env.anthropicKey()) throw new Error('ANTHROPIC_API_KEY לא הוגדר ב-Vercel')
  const content = []
  if (buf && mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } })
  else if (buf) content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } })
  content.push({ type: 'text', text: ['VERIFY: read only these values from the document, exactly as printed. Look at the totals block and the header carefully.', 'If a value is not printed or cannot be read with certainty, leave it empty (or null). Do not compute missing values.', text ? `\n--- email ---\n${text.slice(0, 20_000)}` : ''].filter(Boolean).join('\n') })
  const r = await fetchRetry(`${env.anthropic()}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.anthropicKey(), 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({ model: env.model(), max_tokens: 1500, fallbacks: 'default', output_config: { effort: 'medium', format: { type: 'json_schema', schema: VERIFY_SCHEMA } }, messages: [{ role: 'user', content }] }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d.error && d.error.message) || `claude ${r.status}`)
  const out = JSON.parse((d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
  Object.defineProperty(out, '_usage', { value: { in: d.usage?.input_tokens || 0, out: d.usage?.output_tokens || 0, calls: 1 }, enumerable: false, configurable: true, writable: true })
  return out
}

const same = (k, a, b) => {
  if (['amount_before_vat', 'vat_amount', 'total_amount'].includes(k)) return (a === null || a === undefined || a === '') === (b === null || b === undefined || b === '') && (a === null || a === undefined || a === '' || Math.abs(Number(a) - Number(b)) <= 0.01)
  const n = (v) => String(v ?? '').replace(/[\s\-/.]/g, '').toLowerCase()
  return n(a) === n(b)
}
/* should the critical fields get a second reading? */
export function needsVerify(x) {
  // only when something is really wrong: it doubles the cost of that document
  const fc = x.field_confidence || {}
  const unsure = ['total_amount', 'vat_amount'].some((k) => typeof fc[k] === 'number' && fc[k] < 0.7 && x[k] !== null && x[k] !== '')
  const b = x.amount_before_vat; const v = x.vat_amount; const t = x.total_amount
  const sumOff = [b, v, t].every((n) => typeof n === 'number') && Math.abs(b + v - t) > 1
  const q = x.quality || {}
  return unsure || sumOff || q.blurry || q.cropped
}
/* compares the two readings; returns the per-field result and the confidence to keep */
export function crossCheck(x, y) {
  const fc = { ...(x.field_confidence || {}) }
  const disagree = []
  for (const k of VERIFY_FIELDS) {
    if (same(k, x[k], y[k])) { if (x[k] !== null && x[k] !== '' && typeof fc[k] === 'number') fc[k] = Math.max(fc[k], 0.9) }
    else { disagree.push({ field: k, first: x[k] ?? null, second: y[k] ?? null }); fc[k] = Math.min(typeof fc[k] === 'number' ? fc[k] : 1, 0.5) }
  }
  return { field_confidence: fc, disagree }
}
