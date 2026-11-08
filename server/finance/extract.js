// Agents 3 + 4: classify the document and extract its fields with Claude, as structured output.
// Claude is told never to guess: a field it cannot read stays empty with a low confidence.
import { env, DOC_TYPES } from './env.js'
import { fetchRetry } from './http.js'

const FIELDS = ['supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'payment_date', 'amount_before_vat', 'vat_amount', 'total_amount', 'currency', 'category', 'description', 'customer']
const num = { type: ['number', 'null'] }
const str = (description) => ({ type: 'string', description })

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_financial_document', 'doc_type', 'supplier_name', 'supplier_vat_id', 'customer_name', 'customer_vat_id', 'doc_number', 'issue_date', 'due_date', 'payment_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'vat_rate', 'description', 'category', 'payment_method', 'project_hint', 'supplier_email', 'supplier_phone', 'supplier_address', 'supplier_website', 'field_confidence', 'notes'],
  properties: {
    is_financial_document: { type: 'boolean', description: 'true for an invoice, receipt, credit note, supplier bill, payment confirmation, proforma or quote' },
    doc_type: { type: 'string', enum: DOC_TYPES },
    supplier_name: str('the business that issued the document, exactly as printed; empty if not printed'),
    supplier_vat_id: str('issuer ח.פ / ע.מ / VAT number, digits only; empty if not printed'),
    customer_name: str('who the document is addressed to; empty if not printed'),
    customer_vat_id: str('digits only; empty if not printed'),
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
      'Amounts are plain numbers, no currency signs or thousands separators. Israeli VAT is 18% since 2025 (17% before).',
      'חשבונית מס = invoice, חשבונית מס/קבלה = invoice_receipt, קבלה = receipt, חשבונית זיכוי = credit, דרישת תשלום / חשבון ספק = supplier_bill, אישור תשלום / אישור העברה = payment_confirmation, חשבון עסקה = proforma, הצעת מחיר = quote.',
      'A newsletter, an advertisement, an order confirmation without amounts or a shipping notice is not a financial document.',
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
  return JSON.parse((d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
}
