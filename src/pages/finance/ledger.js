// The bookkeeping rules every figure in the app follows, so the same money is never counted twice:
//  - a receipt or payment confirmation that pays an invoice already in the system is proof of payment, not a second
//    expense (same supplier, same total ±1 ₪, dated from 3 days before the invoice up to 180 days after it);
//  - an invoice is "paid" only with proof: it is a tax invoice-receipt, or a receipt / payment confirmation was paired
//    with it. A person's "paid" tick is shown separately as "marked by hand", never as verified;
//  - a proforma (חשבון עסקה) followed by the tax invoice for the same amount is replaced by the invoice.
// Pure functions. markLedger sets three read-only flags on each document object: _proofFor, _paidBy, _replacedBy.
const LIVE = (d) => !['rejected', 'duplicate', 'archived', 'failed', 'processing'].includes(d.status)
const dateOf = (d) => d.issue_date || String(d.email_date || d.created_at || '').slice(0, 10)
const days = (a, b) => (new Date(b) - new Date(a)) / 86400_000
const who = (d) => d.supplier_id || (d.supplier_vat_id ? `vat:${d.supplier_vat_id}` : null)
const amt = (d) => Math.abs(Number(d.total_amount) || 0)
const set = (d, k, v) => Object.defineProperty(d, k, { value: v, configurable: true, enumerable: false, writable: true })

export function markLedger(documents) {
  for (const d of documents) { set(d, '_proofFor', null); set(d, '_paidBy', null); set(d, '_replacedBy', null) }
  const bySupplier = new Map()
  for (const d of documents) { if (!LIVE(d) || !who(d) || !amt(d)) continue; const k = who(d); if (!bySupplier.has(k)) bySupplier.set(k, []); bySupplier.get(k).push(d) }
  for (const list of bySupplier.values()) {
    list.sort((a, b) => String(dateOf(a)).localeCompare(String(dateOf(b))))
    const invoices = list.filter((d) => ['invoice', 'supplier_bill'].includes(d.doc_type))
    // proofs of payment: the closest unpaid invoice of the same amount
    for (const p of list.filter((d) => ['receipt', 'payment_confirmation'].includes(d.doc_type))) {
      const inv = invoices.filter((i) => !i._paidBy && Math.abs(amt(i) - amt(p)) <= 1 && days(dateOf(i), dateOf(p)) >= -3 && days(dateOf(i), dateOf(p)) <= 180)
        .sort((a, b) => Math.abs(days(dateOf(a), dateOf(p))) - Math.abs(days(dateOf(b), dateOf(p))))[0]
      if (inv) { set(inv, '_paidBy', p.id); set(p, '_proofFor', inv.id) }
    }
    // a proforma later followed by its tax invoice
    for (const pf of list.filter((d) => d.doc_type === 'proforma')) {
      const inv = list.find((i) => ['invoice', 'invoice_receipt'].includes(i.doc_type) && Math.abs(amt(i) - amt(pf)) <= 1 && days(dateOf(pf), dateOf(i)) >= 0 && days(dateOf(pf), dateOf(i)) <= 180)
      if (inv) set(pf, '_replacedBy', inv.id)
    }
  }
  return documents
}

/* paid with proof | marked by hand | no proof in the system | not an invoice that waits for payment */
export function payState(d) {
  if (d.doc_type === 'invoice_receipt' || d.doc_type === 'receipt') return 'proof'
  if (d._paidBy) return 'proof'
  if (['invoice', 'supplier_bill'].includes(d.doc_type)) return d.paid ? 'manual' : 'open'
  return 'na'
}
export const PAY_LABEL = { proof: 'שולם (יש אישור)', manual: 'סומן כשולם ידנית', open: 'אין אישור תשלום', na: '—' }
