// Figures for master data, computed from stored documents (and project allocations). Never from AI.
import { claimableVat, counts, docDate, signedNet, signedTotal } from './format.js'

const REL = { suppliers: 'supplier_id', projects: 'project_id', businesses: 'business_id', categories: 'category_id' }

/* the documents of one entity, with the share of each that belongs to it (a split invoice counts its allocation only) */
export function docsFor(kind, id, documents, allocations = [], categories = []) {
  const out = []
  const byDoc = {}
  for (const a of allocations) (byDoc[a.document_id] ||= []).push(a)
  const sub = kind === 'categories' ? new Set([id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)]) : null
  for (const d of documents) {
    if (d.status === 'archived') continue
    let share = 1
    if (kind === 'projects') {
      const al = byDoc[d.id]
      if (al?.length) {
        const mine = al.filter((a) => a.project_id === id)
        if (!mine.length) continue
        const total = Math.abs(Number(d.total_amount) || 0)
        share = total ? mine.reduce((s, a) => s + Math.abs(Number(a.amount)), 0) / total : 0
      } else if (d.project_id !== id) continue
    } else if (kind === 'categories') {
      const cid = d.category_id || categories.find((c) => c.name === d.category)?.id
      if (!sub.has(cid)) continue
    } else if (d[REL[kind]] !== id) continue
    out.push({ doc: d, share })
  }
  return out
}

export function summarize(items, categories) {
  const booked = items.filter(({ doc }) => counts(doc))
  const dates = booked.map(({ doc }) => docDate(doc)).filter(Boolean).sort()
  return {
    docs: items.length,
    booked: booked.length,
    pendingDocs: items.filter(({ doc }) => doc.status === 'review').length,
    total: booked.reduce((s, { doc, share }) => s + signedTotal(doc) * share, 0),
    net: booked.reduce((s, { doc, share }) => s + signedNet(doc) * share, 0),
    vat: booked.reduce((s, { doc, share }) => s + (doc.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(doc.vat_amount) || 0) * share, 0),
    claimable: booked.reduce((s, { doc, share }) => s + claimableVat(doc, categories) * share, 0),
    first: dates[0] || null,
    last: dates[dates.length - 1] || null,
  }
}

export function entityStats(kind, list, documents, allocations, categories) {
  const out = {}
  for (const r of list) out[r.id] = summarize(docsFor(kind, r.id, documents, allocations, categories), categories)
  if (kind === 'businesses') for (const r of list) out[r.id].projects = 0
  return out
}
