// Categories: what the office already decided, used to suggest, to warn and to tidy up. Pure (no React, no network),
// tested in categorySuggest.test.mjs (`node --test src/pages/finance/categorySuggest.test.mjs`).
//
// A document's category is `category_id` (the name in `category` follows it in the database). "Decided by a person" is an
// approved / sent document: nothing is approved without someone looking. A document in review may carry a category the
// reading gave it by itself, so it counts only when there is no approved history at all.
//
// A document that was approved or sent to the accountant is LOCKED for every bulk change here: changing its category sends
// it back to review (the database does that on purpose), so nothing in this file ever lists it as "to move".

/* documents that are not counted in any category figure */
export const OUT = ['rejected', 'duplicate', 'archived']
export const isLocked = (d) => ['approved', 'sent'].includes(d?.status)
const norm = (s) => String(s ?? '').toLowerCase().replace(/[֑-ׇ"'`׳״’.,;:()\-_/\\]/g, ' ').replace(/\s+/g, ' ').trim()
const when = (d) => String(d.approved_at || d.updated_at || d.created_at || '')

/** one key for "the same supplier": the supplier row, else the tax id, else the name as written */
export function supplierKey(d) {
  if (!d) return ''
  if (d.supplier_id) return `id:${d.supplier_id}`
  const vat = String(d.supplier_vat_id || '').replace(/\D/g, '')
  if (vat.length >= 8) return `vat:${vat}`
  const n = norm(d.supplier_name)
  return n ? `name:${n}` : ''
}
const catOf = (d, categories) => d.category_id || (d.category ? categories.find((c) => c.name === d.category)?.id : null) || null
// a catch-all category ("אחר") is where a document lands when nobody decided: between equals it never wins
const VAGUE = ['אחר', 'אחרים', 'כללי', 'שונות', 'הוצאות כלליות', 'הוצאות אחרות']
const vagueIds = (categories) => new Set(categories.filter((c) => VAGUE.includes(norm(c.name))).map((c) => c.id))
const usable = (categories) => new Set(categories.filter((c) => c.active !== false).map((c) => c.id))

/** the supplier's other documents by category: [{ category_id, n, decided, last }] — most used first */
export function supplierUsage(doc, documents, categories = []) {
  const key = supplierKey(doc); if (!key) return []
  const by = new Map()
  for (const d of documents) {
    if (d.id === doc.id || OUT.includes(d.status) || supplierKey(d) !== key) continue
    const cid = catOf(d, categories); if (!cid) continue
    const row = by.get(cid) || { category_id: cid, n: 0, decided: 0, last: '' }
    row.n++; if (isLocked(d)) row.decided++
    if (when(d) > row.last) row.last = when(d)
    by.set(cid, row)
  }
  return [...by.values()].sort((a, b) => b.decided - a.decided || b.n - a.n || (a.last < b.last ? 1 : -1))
}

/**
 * The category to offer for a document → { category_id, reason, count, of, sample } | null
 *   same_document — an earlier copy of this very document (same file, or same supplier + number) already has one
 *   supplier      — where this supplier's documents sit: approved / sent ones first, the most frequent, ties → the latest
 *   text          — a category's name or one of its keywords is written in the document
 * `count` of `of` = how many of the supplier's documents agree; `sample` = one of them (for "like <number>").
 */
export function suggestCategory(doc, documents, categories = []) {
  if (!doc) return null
  const ok = usable(categories)
  const key = supplierKey(doc)
  const others = documents.filter((d) => d.id !== doc.id && !OUT.includes(d.status))
  // 1. the same document, seen before
  const num = norm(doc.doc_number)
  const twin = others.find((d) => catOf(d, categories) && ok.has(catOf(d, categories))
    && ((doc.file_hash && d.file_hash === doc.file_hash) || (num && key && norm(d.doc_number) === num && supplierKey(d) === key)))
  if (twin) return { category_id: catOf(twin, categories), reason: 'same_document', count: 1, of: 1, sample: twin.id }
  // 2. the supplier's history
  if (key) {
    const mine = others.filter((d) => supplierKey(d) === key && catOf(d, categories))
    const decided = mine.filter(isLocked)
    const pool = (decided.length ? decided : mine).filter((d) => ok.has(catOf(d, categories)))
    if (pool.length) {
      const by = new Map()
      for (const d of pool) { const c = catOf(d, categories); const r = by.get(c) || { n: 0, last: '', sample: d.id }; r.n++; if (when(d) >= r.last) { r.last = when(d); r.sample = d.id } by.set(c, r) }
      const vague = vagueIds(categories)
      const [cid, top] = [...by.entries()].sort((a, b) => b[1].n - a[1].n || vague.has(a[0]) - vague.has(b[0]) || (a[1].last < b[1].last ? 1 : -1))[0]
      return { category_id: cid, reason: 'supplier', count: top.n, of: pool.length, sample: top.sample, decided: decided.length > 0 }
    }
  }
  // 3. the document's own words
  const hay = ` ${norm([doc.description, doc.supplier_name, doc.file_name, doc.email_subject, doc.notes].filter(Boolean).join(' '))} `
  let best = null
  for (const c of categories) {
    if (!ok.has(c.id)) continue
    const words = [c.name, ...(Array.isArray(c.keywords) ? c.keywords : [])].map(norm).filter((w) => w.length > 2)
    const hits = words.filter((w) => hay.includes(` ${w} `) || (w.length > 4 && hay.includes(w))).length
    if (hits && (!best || hits > best.count)) best = { category_id: c.id, reason: 'text', count: hits, of: words.length, sample: null }
  }
  return best
}

/**
 * Before a document's category changes to `toId`: is that against what was already decided?
 * → null, or { supplier: { category_id, n, of } | null, prior: category_id | null, others: [docs of the supplier not in toId] }
 *   supplier — most of this supplier's other documents sit in another category (two or more, or one a person approved)
 *   prior    — the document itself already had another category that a person chose (approved, or typed over the reading)
 */
export function categoryConflict(doc, toId, documents, categories = []) {
  if (!doc || !toId) return null
  const usage = supplierUsage(doc, documents, categories)
  const top = usage[0]
  const of = usage.reduce((a, u) => a + u.n, 0)
  const supplier = top && top.category_id !== toId && (top.n >= 2 || top.decided >= 1) ? { category_id: top.category_id, n: top.n, of } : null
  const was = catOf(doc, categories)
  const byPerson = isLocked(doc) || Number(doc.field_confidence?.category) === 1 || (doc.ai_snapshot?.category != null && doc.category && doc.ai_snapshot.category !== doc.category)
  const prior = was && was !== toId && byPerson ? was : null
  if (!supplier && !prior) return null
  const key = supplierKey(doc)
  const others = key ? documents.filter((d) => d.id !== doc.id && !OUT.includes(d.status) && supplierKey(d) === key && catOf(d, categories) !== toId) : []
  return { supplier, prior, others }
}

/**
 * What putting `docs` into `toId` would do → { move: [docs], same: n, locked: [docs], from: [{ category_id, n }] }
 *   move   — will change · same — already there · locked — approved / sent with another category: never changed in bulk
 */
export function moveImpact(docs, toId, categories = []) {
  const move = []; const locked = []; let same = 0; const from = new Map()
  for (const d of docs) {
    const c = catOf(d, categories)
    if (c === toId) { same++; continue }
    if (isLocked(d)) { locked.push(d); continue }
    move.push(d); from.set(c || '', (from.get(c || '') || 0) + 1)
  }
  return { move, same, locked, from: [...from.entries()].map(([category_id, n]) => ({ category_id: category_id || null, n })).sort((a, b) => b.n - a.n) }
}

/** suppliers whose documents are spread over two or more categories: [{ key, supplier_id, name, total, parts: [{ category_id, n, locked }], top }] */
export function supplierSpread(documents, categories = []) {
  const by = new Map(); const vague = vagueIds(categories)
  for (const d of documents) {
    if (OUT.includes(d.status)) continue
    const key = supplierKey(d); const cid = catOf(d, categories); if (!key || !cid) continue
    const s = by.get(key) || { key, supplier_id: d.supplier_id || null, name: d.supplier_name || '', total: 0, parts: new Map(), docs: [] }
    const p = s.parts.get(cid) || { category_id: cid, n: 0, locked: 0, last: '' }
    p.n++; if (isLocked(d)) p.locked++; if (when(d) > p.last) p.last = when(d)
    s.parts.set(cid, p); s.total++; s.docs.push(d); if (!s.name && d.supplier_name) s.name = d.supplier_name
    by.set(key, s)
  }
  return [...by.values()].filter((s) => s.parts.size > 1)
    .map((s) => { const parts = [...s.parts.values()].sort((a, b) => b.n - a.n || vague.has(a.category_id) - vague.has(b.category_id) || b.locked - a.locked || (a.last < b.last ? 1 : -1)); return { ...s, parts, top: parts[0].category_id } })
    .sort((a, b) => (b.total - b.parts[0].n) - (a.total - a.parts[0].n) || b.total - a.total)
}

/** documents with no category that have a suggestion from history (never a locked one): [{ doc, suggestion }] */
export function uncategorizedWithSuggestion(documents, categories = []) {
  const out = []
  for (const d of documents) {
    if (OUT.includes(d.status) || isLocked(d) || d.status === 'processing' || catOf(d, categories)) continue
    const s = suggestCategory(d, documents, categories)
    if (s && s.reason !== 'text') out.push({ doc: d, suggestion: s })
  }
  return out
}

/** active categories whose names read as one: [{ a, b, why }] — the same name, or one name opening the other ("שכירות" / "שכירות ואחזקה") */
export function similarCategories(categories = []) {
  const act = categories.filter((c) => c.active !== false)
  const out = []
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i]; const b = act[j]
    if (a.parent_id === b.id || b.parent_id === a.id) continue
    const x = norm(a.name); const y = norm(b.name); if (x.length < 3 || y.length < 3) continue
    if (x === y) out.push({ a, b, why: 'אותו שם' })
    else if (y.startsWith(`${x} `) || x.startsWith(`${y} `)) out.push({ a, b, why: 'שם אחד פותח את השני' })
    else if (x.replace(/ /g, '') === y.replace(/ /g, '')) out.push({ a, b, why: 'אותו שם, ברווח שונה' })
    else if ([x, y].some((w, k) => { const o = k ? x : y; return !w.includes(' ') && [`${w}ים`, `${w}ות`].includes(o) })) out.push({ a, b, why: 'יחיד ורבים של אותו שם' })
  }
  return out
}

/**
 * Up to 3 names for a NEW category, taken from words already on the document (no AI call): the category the reading
 * wrote when it is not in the list, and the description when it is short. Names that match an existing category are left out.
 */
export function nameIdeas(doc, categories = [], extraction = null) {
  const have = new Set(categories.map((c) => norm(c.name)))
  const out = []
  const add = (raw) => {
    const s = String(raw ?? '').replace(/\s+/g, ' ').trim().replace(/^[\-–—:,. ]+|[\-–—:,. ]+$/g, '')
    const n = norm(s)
    if (s.length < 3 || s.length > 32 || /\d{3,}/.test(s) || !/[א-תa-z]/i.test(s) || have.has(n) || out.some((o) => norm(o) === n)) return
    out.push(s)
  }
  add(extraction?.category); add(doc?.suggestions?.category?.value); if (!doc?.category_id) add(doc?.category)
  const desc = String(doc?.description || '').split(/[,;|\n·]/)[0].trim()
  const words = desc.split(/\s+/).filter(Boolean)
  if (words.length && words.length <= 3) add(desc); else if (words.length > 3) add(words.slice(0, 2).join(' '))
  return out.slice(0, 3)
}

/** "7 מתוך 8" / "מסמך אחד" — the counts as words, shared by the chip, the picker and the dialogs */
export const sayDocs = (n) => (n === 1 ? 'מסמך אחד' : `${n.toLocaleString('he-IL')} מסמכים`)
/** the verb that goes with the count: one('עבר','עברו') → "מסמך אחד עבר" / "3 מסמכים עברו" */
export const sayDid = (n, one, many) => `${sayDocs(n)} ${n === 1 ? one : many}`
