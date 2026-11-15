import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestCategory, categoryConflict, moveImpact, supplierSpread, uncategorizedWithSuggestion, similarCategories, nameIdeas, supplierUsage, supplierKey } from './categorySuggest.js'

const cats = [{ id: 'mat', name: 'חומרי בניין' }, { id: 'tools', name: 'ציוד וכלים', keywords: ['מקדחה'] }, { id: 'rent', name: 'שכירות' }, { id: 'rent2', name: 'שכירות ואחזקה' }, { id: 'old', name: 'ישן', active: false }, { id: 'food', name: 'כיבוד ואירוח' }]
let n = 0
const doc = (o) => ({ id: `d${++n}`, status: 'review', supplier_id: 's1', supplier_name: 'טמבור', created_at: `2026-11-${String(n).padStart(2, '0')}`, ...o })

test('supplier history: approved documents decide, the most frequent wins', () => {
  const docs = [doc({ status: 'approved', category_id: 'mat' }), doc({ status: 'sent', category_id: 'mat' }), doc({ status: 'approved', category_id: 'tools' }), doc({ status: 'review', category_id: 'tools' }), doc({ status: 'review', category_id: 'tools' })]
  const me = doc({})
  const s = suggestCategory(me, [...docs, me], cats)
  assert.deepEqual([s.category_id, s.reason, s.count, s.of], ['mat', 'supplier', 2, 3])
})
test('a tie goes to the most recent; review documents count only without approved history', () => {
  const a = doc({ status: 'approved', category_id: 'mat', approved_at: '2026-10-01' }); const b = doc({ status: 'approved', category_id: 'tools', approved_at: '2026-11-01' })
  const me = doc({})
  assert.equal(suggestCategory(me, [a, b, me], cats).category_id, 'tools')
  const r = doc({ category_id: 'food' })
  const s = suggestCategory(me, [r, me], cats)
  assert.deepEqual([s.category_id, s.decided], ['food', false])
})
test('the same document seen before wins over history', () => {
  const twin = doc({ status: 'approved', category_id: 'tools', doc_number: 'A-77' })
  const hist = [doc({ status: 'approved', category_id: 'mat' }), doc({ status: 'approved', category_id: 'mat' })]
  const me = doc({ doc_number: 'a-77' })
  assert.deepEqual([suggestCategory(me, [twin, ...hist, me], cats).reason, suggestCategory(me, [twin, ...hist, me], cats).category_id], ['same_document', 'tools'])
  const byHash = doc({ supplier_id: 's9', category_id: 'food', file_hash: 'h1' })
  assert.equal(suggestCategory(doc({ supplier_id: null, supplier_name: '', file_hash: 'h1' }), [byHash], cats).category_id, 'food')
})
test('rejected / duplicate documents, another supplier and an archived category never suggest', () => {
  const me = doc({})
  assert.equal(suggestCategory(me, [doc({ status: 'rejected', category_id: 'mat' }), doc({ supplier_id: 's2', status: 'approved', category_id: 'mat' }), doc({ status: 'approved', category_id: 'old' }), me], cats), null)
})
test('no supplier row: the tax id, then the name, tie the documents', () => {
  assert.equal(supplierKey({ supplier_vat_id: '51-4230101' }), 'vat:514230101')
  const me = doc({ supplier_id: null, supplier_name: 'קפה  לנדוור' })
  assert.equal(suggestCategory(me, [doc({ supplier_id: null, supplier_name: 'קפה לנדוור', status: 'approved', category_id: 'food' }), me], cats).category_id, 'food')
})
test('the words of the document: a category name or keyword', () => {
  const s = suggestCategory(doc({ supplier_id: 's5', description: 'מקדחה רוטטת' }), [], cats)
  assert.deepEqual([s.category_id, s.reason], ['tools', 'text'])
  assert.equal(suggestCategory(doc({ supplier_id: 's5', description: 'משהו אחר' }), [], cats), null)
})
test('conflict: the supplier sits elsewhere, or a person already chose', () => {
  const hist = [doc({ status: 'approved', category_id: 'mat' }), doc({ category_id: 'mat' }), doc({ category_id: 'tools' })]
  const me = doc({})
  const c = categoryConflict(me, 'tools', [...hist, me], cats)
  assert.deepEqual([c.supplier.category_id, c.supplier.n, c.supplier.of, c.prior, c.others.length], ['mat', 2, 3, null, 2])
  assert.equal(categoryConflict(me, 'mat', [...hist, me], cats), null)
  const chosen = doc({ supplier_id: 's7', category_id: 'food', category: 'כיבוד ואירוח', field_confidence: { category: 1 } })
  assert.equal(categoryConflict(chosen, 'tools', [chosen], cats).prior, 'food')
  const read = doc({ supplier_id: 's8', category_id: 'food', field_confidence: { category: 0.6 } })
  assert.equal(categoryConflict(read, 'tools', [read], cats), null)
})
test('move impact: approved / sent documents are never moved, the ones already there are counted', () => {
  const docs = [doc({ category_id: 'mat' }), doc({ category_id: null }), doc({ category_id: 'tools' }), doc({ status: 'sent', category_id: 'mat' }), doc({ status: 'approved', category_id: 'tools' })]
  const r = moveImpact(docs, 'tools', cats)
  assert.deepEqual([r.move.length, r.same, r.locked.length, r.from], [2, 2, 1, [{ category_id: 'mat', n: 1 }, { category_id: null, n: 1 }]])
})
test('spread: only suppliers over two or more categories, the most used first', () => {
  const docs = [doc({ category_id: 'mat' }), doc({ category_id: 'mat', status: 'approved' }), doc({ category_id: 'tools' }), doc({ supplier_id: 's2', supplier_name: 'בזק', category_id: 'rent' }), doc({ supplier_id: 's2', category_id: 'rent' })]
  const sp = supplierSpread(docs, cats)
  assert.equal(sp.length, 1)
  assert.deepEqual([sp[0].name, sp[0].top, sp[0].total, sp[0].parts.map((p) => [p.category_id, p.n, p.locked])], ['טמבור', 'mat', 3, [['mat', 2, 1], ['tools', 1, 0]]])
})
test('uncategorized with a suggestion: history only, never an approved document', () => {
  const hist = doc({ status: 'approved', category_id: 'mat' })
  const a = doc({}); const locked = doc({ status: 'approved' }); const text = doc({ supplier_id: 's5', description: 'מקדחה' })
  assert.deepEqual(uncategorizedWithSuggestion([hist, a, locked, text], cats).map((x) => x.doc.id), [a.id])
})
test('similar category names; a parent and its child are not a pair', () => {
  assert.deepEqual(similarCategories(cats).map((p) => [p.a.id, p.b.id]), [['rent', 'rent2']])
  assert.equal(similarCategories([{ id: 'a', name: 'רכב' }, { id: 'b', name: 'רכב ודלק', parent_id: 'a' }]).length, 0)
  assert.equal(similarCategories([{ id: 'a', name: 'כיבוד ואירוח' }, { id: 'b', name: 'כיבוד  ואירוח.' }]).length, 1)
  assert.deepEqual(similarCategories([{ id: 'a', name: 'ביטוח' }, { id: 'b', name: 'ביטוחים' }, { id: 'c', name: 'תקשורת' }]).map((p) => p.why), ['יחיד ורבים של אותו שם'])
})
test('name ideas come from the document, never an existing category, at most three', () => {
  assert.deepEqual(nameIdeas({ description: 'ארוחת עבודה', category: 'כיבוד ואירוח' }, cats, { category: 'מסעדות' }), ['מסעדות', 'ארוחת עבודה'])
  assert.deepEqual(nameIdeas({ description: 'שירותי ייעוץ הנדסי לפרויקט מוהליבר 17, חשבון 3' }, cats), ['שירותי ייעוץ'])
  assert.deepEqual(nameIdeas({ description: '88124' }, cats), [])
})
test('a catch-all category never wins a tie', () => {
  const cs = [...cats, { id: 'misc', name: 'אחר' }]
  const a = doc({ supplier_id: 's6', category_id: 'misc', updated_at: '2026-11-20' }); const b = doc({ supplier_id: 's6', category_id: 'food', updated_at: '2026-11-01' })
  assert.equal(supplierSpread([a, b], cs)[0].top, 'food')
  assert.equal(suggestCategory(doc({ supplier_id: 's6' }), [a, b], cs).category_id, 'food')
})
test('usage lists every category of the supplier with counts', () => {
  const me = doc({})
  const u = supplierUsage(me, [doc({ category_id: 'mat', status: 'approved' }), doc({ category_id: 'tools' }), doc({ category_id: 'tools' }), me], cats)
  assert.deepEqual(u.map((x) => [x.category_id, x.n, x.decided]), [['mat', 1, 1], ['tools', 2, 0]])
})
