import { useMemo, useState } from 'react'
import { openIds } from './links.js'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { moveImpact, sayDid, sayDocs, similarCategories, supplierSpread, uncategorizedWithSuggestion, OUT } from './categorySuggest.js'
import { Icon, askConfirm } from './ui.jsx'
import CategoryMerge from './CategoryMerge.jsx'
import { money, signedTotal } from './format.js'
import Select from './Select.jsx'

/* "סידור קטגוריות": the screen finds the mess by itself and offers the fix, with the numbers first and a question before
   anything changes. Three kinds: a supplier whose documents are spread over several categories, documents with no
   category that the office's own history can place, and two categories that read as one. A document that was approved or
   sent to the accountant is never changed here (changing its category would send it back to review). */
const STEP = 5

export default function CategoryTidy({ onDone }) {
  const { documents, categories, suppliers, can, go, reload } = useFinance()
  const edit = can('edit')
  const name = (id) => categories.find((c) => c.id === id)?.name || 'קטגוריה שנמחקה'
  const active = useMemo(() => categories.filter((c) => c.active !== false), [categories])
  // a supplier is listed only when something can really move to where most of its documents already are
  const spread = useMemo(() => supplierSpread(documents, categories).map((s) => ({ ...s, fix: moveImpact(s.docs, s.top, categories) })).filter((s) => s.fix.move.length > 0), [documents, categories])
  const loose = useMemo(() => uncategorizedWithSuggestion(documents, categories), [documents, categories])
  // pairs the office already said are two different things stay out (the ids only, kept on this device)
  const [skipped, setSkipped] = useState(() => { try { return JSON.parse(localStorage.getItem('fin-cat-notdup') || '[]') } catch { return [] } })
  const skip = (ids) => { const keys = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b].sort().join('|'))); const next = [...skipped, ...keys].slice(-300); setSkipped(next); try { localStorage.setItem('fin-cat-notdup', JSON.stringify(next)) } catch { /* a preference only */ } }
  // names that read as one, joined into groups: three spellings of one category are one suggestion, not three pairs
  const pairs = useMemo(() => {
    const raw = similarCategories(categories).filter(({ a, b }) => !skipped.includes([a.id, b.id].sort().join('|')))
    const groups = []
    for (const { a, b, why } of raw) {
      const g = groups.find((x) => x.items.some((c) => c.id === a.id || c.id === b.id))
      if (g) { for (const c of [a, b]) if (!g.items.some((x) => x.id === c.id)) g.items.push(c); if (!g.why.includes(why)) g.why.push(why) } else groups.push({ items: [a, b], why: [why] })
    }
    return groups
  }, [categories, skipped])
  const [openTidy, setOpenTidy] = useState(true)
  const docsOf = (cid) => documents.filter((d) => !OUT.includes(d.status) && (d.category_id || categories.find((c) => c.name === d.category)?.id) === cid)
  const [shown, setShown] = useState(STEP)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [merge, setMerge] = useState(null)   // the category ids the merge window opens with
  const [other, setOther] = useState({})     // supplier key → a category chosen instead of the most common one
  const total = spread.length + (loose.length ? 1 : 0) + pairs.length
  const run = async (key, fn, text) => { setBusy(key); setErr(''); try { await fn(); await reload(); onDone?.(text) } catch (e) { setErr(e.message) } finally { setBusy('') } }
  const openDocs = (ids, title) => openIds(go, ids, title)

  const unify = async (s, toId) => {
    const im = moveImpact(s.docs, toId, categories)
    if (!im.move.length) { setErr(`אין מה להעביר: המסמכים של ${s.name} שאינם ב"${name(toId)}" כבר אושרו או נשלחו לרו״ח.`); return }
    const lines = [...im.from.map((x) => `${sayDocs(x.n)} מ"${name(x.category_id)}"`), im.same ? `${sayDocs(im.same)} כבר שם` : '', im.locked.length ? `${sayDocs(im.locked.length)} שכבר אושרו או נשלחו לרו״ח לא ${im.locked.length === 1 ? 'ישתנה' : 'ישתנו'}` : ''].filter(Boolean)
    if (!(await askConfirm({ title: `איחוד המסמכים של ${s.name}`, text: `${sayDid(im.move.length, 'יעבור', 'יעברו')} ל"${name(toId)}":`, lines, ok: im.move.length === 1 ? 'העברת המסמך' : `העברת ${im.move.length} המסמכים` }))) return
    run(`s-${s.key}`, () => api.updateDocuments(im.move.map((d) => d.id), { category_id: toId }), `${sayDocs(im.move.length)} של ${s.name} ${im.move.length === 1 ? 'עבר' : 'עברו'} ל"${name(toId)}"`)
  }
  const looseBy = useMemo(() => { const m = new Map(); for (const { doc, suggestion } of loose) m.set(suggestion.category_id, [...(m.get(suggestion.category_id) || []), doc]); return [...m.entries()].sort((a, b) => b[1].length - a[1].length) }, [loose])
  const placeAll = async () => {
    if (!(await askConfirm({ title: 'שיוך לפי ההצעות', text: `${sayDocs(loose.length)} בלי קטגוריה ${loose.length === 1 ? 'ישויך' : 'ישויכו'} לפי המסמכים הקודמים של אותו ספק:`, lines: looseBy.map(([cid, docs]) => `${sayDocs(docs.length)} ל"${name(cid)}"`), ok: loose.length === 1 ? 'שיוך המסמך' : `שיוך ${loose.length} המסמכים` }))) return
    run('loose', async () => { for (const [cid, docs] of looseBy) await api.updateDocuments(docs.map((d) => d.id), { category_id: cid }) }, `${sayDid(loose.length, 'שויך', 'שויכו')} לפי ההצעות`)
  }
  const sumOf = (cid) => docsOf(cid).reduce((a, d) => a + signedTotal(d), 0)

  if (!edit) return null
  return (
    <section className={`fin-tidy ${total ? '' : 'is-clean'}`} aria-label="סידור קטגוריות">
      <header className="fin-tidy__head">
        <span className="fin-tidy__icon" aria-hidden="true"><Icon name={total ? 'sparkle' : 'check'} size={20} /></span>
        <div><h3>סידור קטגוריות</h3><p>{total ? 'מצאנו מקומות שבהם השיוך לא עקבי. כל הצעה מציגה מספרים ושואלת לפני שמשהו משתנה.' : 'הכול מסודר: אין ספקים שהמסמכים שלהם מפוזרים, אין מסמכים בלי קטגוריה שאפשר לשייך, ואין קטגוריות כפולות.'}</p></div>
        {active.length > 1 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setMerge([])}><Icon name="copy" size={15} /> מיזוג קטגוריות</button>}
        {total > 0 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" aria-expanded={openTidy} onClick={() => setOpenTidy((v) => !v)}>{openTidy ? 'הסתרה' : `הצגת ${total} ההצעות`}</button>}
      </header>
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {openTidy && loose.length > 0 && (
        <div className="fin-tidy__block">
          <h4>{sayDocs(loose.length)} בלי קטגוריה, שאפשר לשייך לפי ההיסטוריה</h4>
          <div className="fin-tidy__row">
            <p className="fin-tidy__chips">{looseBy.map(([cid, docs]) => <span key={cid} className="fin-tidy__chip"><b>{docs.length}</b> {name(cid)}</span>)}</p>
            <span className="fin-tidy__acts">
              <button type="button" className="fin-btn fin-btn--sm" onClick={() => openDocs(loose.map((x) => x.doc.id), 'מסמכים בלי קטגוריה, עם הצעה')}>לעבור אחד אחד</button>
              <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" disabled={!!busy} onClick={placeAll}>{busy === 'loose' ? 'משייך…' : loose.length === 1 ? 'שיוך לפי ההצעה' : `שיוך כל ה-${loose.length} לפי ההצעות`}</button>
            </span>
          </div>
        </div>
      )}

      {openTidy && spread.length > 0 && (
        <div className="fin-tidy__block">
          <h4>{spread.length === 1 ? 'ספק אחד שהמסמכים שלו מפוזרים' : `${spread.length} ספקים שהמסמכים שלהם מפוזרים`} בין קטגוריות</h4>
          <ul className="fin-tidy__list">
            {spread.slice(0, shown).map((s) => {
              const to = other[s.key] || s.top
              return (
                <li key={s.key} className="fin-tidy__sup">
                  <div className="fin-tidy__who">
                    <button type="button" className="fin-link" onClick={() => openDocs(s.docs.map((d) => d.id), `המסמכים של ${s.name}`)}>{s.name || 'ספק בלי שם'}</button>
                    <small>{sayDocs(s.total)} ב-{s.parts.length} קטגוריות</small>
                  </div>
                  <div className="fin-tidy__split">
                    <span className="fin-tidy__bar" aria-hidden="true">{s.parts.map((p) => <span key={p.category_id} className={p.category_id === to ? 'is-main' : ''} style={{ flexGrow: p.n }} />)}</span>
                    <span className="fin-tidy__parts">{s.parts.map((p) => <span key={p.category_id} className={p.category_id === to ? 'is-main' : ''}><b>{p.n}</b> {name(p.category_id)}{p.locked ? <i title="מסמכים שכבר אושרו או נשלחו לרו״ח"> · {p.locked} מאושרים</i> : null}</span>)}</span>
                  </div>
                  <span className="fin-tidy__acts">
                    <Select className="fin-select fin-select--sm" value={to} onChange={(e) => setOther((o) => ({ ...o, [s.key]: e.target.value }))} aria-label={`הקטגוריה לאיחוד המסמכים של ${s.name}`}>
                      {active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" disabled={!!busy} onClick={() => unify(s, to)}>{busy === `s-${s.key}` ? 'מעביר…' : 'איחוד'}</button>
                  </span>
                </li>
              )
            })}
          </ul>
          {spread.length > shown && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost fin-tidy__more" onClick={() => setShown((n) => n + STEP * 2)}>הצגת עוד {Math.min(STEP * 2, spread.length - shown)}</button>}
        </div>
      )}

      {openTidy && pairs.length > 0 && (
        <div className="fin-tidy__block">
          <h4>{pairs.length === 1 ? 'קטגוריות שנראות כמו אחת' : `${pairs.length} קבוצות של קטגוריות שנראות כמו אחת`}</h4>
          <ul className="fin-tidy__list">
            {pairs.map(({ items, why }) => (
              <li key={items.map((c) => c.id).join('-')} className="fin-tidy__pair">
                <span className="fin-tidy__parts">{items.map((c) => <span key={c.id} className="is-main"><b>{docsOf(c.id).length}</b> {c.name} <i>· {money(sumOf(c.id))}</i></span>)}<i>{why.join(', ')}</i></span>
                <span className="fin-tidy__acts">
                  {items.some((c) => docsOf(c.id).length > 0) && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => openDocs(items.flatMap((c) => docsOf(c.id).map((d) => d.id)), `המסמכים של ${items.map((c) => `"${c.name}"`).join(' ו-')}`)}>לצפות במסמכים</button>}
                  <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => skip(items.map((c) => c.id))}>לא כפילות</button>
                  <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" disabled={!!busy} onClick={() => setMerge(items.map((c) => c.id))}>מיזוג</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {merge && <CategoryMerge start={merge} onClose={() => setMerge(null)} onDone={(text) => onDone?.(text)} />}
    </section>
  )
}
