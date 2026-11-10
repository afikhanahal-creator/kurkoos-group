// Small navigation helpers shared by the lists: "everything with this supplier" and "these documents, in date order".
/* a list of documents opened from a number or a name: only ids are kept for the next screen (never amounts or names of files) */
export function openDocs(go, docs, title, { chrono = true } = {}) {
  try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids: docs.map((d) => d.id), title, sort: chrono ? 'chrono' : undefined })) } catch { /* noop */ }
  go('/documents?ids=1')
}
const key = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
/* the history with a supplier: its page when it is a known supplier, otherwise every document that carries its name */
export function supplierHistory(go, doc, documents) {
  if (doc.supplier_id) return go(`/suppliers/${doc.supplier_id}`)
  if (!doc.supplier_name) return undefined
  const k = key(doc.supplier_name)
  return openDocs(go, documents.filter((d) => key(d.supplier_name) === k), `כל המסמכים של ${doc.supplier_name}`)
}
