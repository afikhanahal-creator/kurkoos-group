import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { moveImpact, sayDid, sayDocs, similarCategories, supplierSpread, uncategorizedWithSuggestion } from './categorySuggest.js'
import { Icon, Modal, askConfirm } from './ui.jsx'
import Select from './Select.jsx'

/* "סידור קטגוריות": the screen finds the mess by itself and offers the fix, with the numbers first and a question before
   anything changes. Three kinds: a supplier whose documents are spread over several categories, documents with no
   category that the office's own history can place, and two categories that read as one. A document that was approved or
   sent to the accountant is never changed here (changing its category would send it back to review). */
const STEP = 5
const OUT = ['rejected', 'duplicate', 'archived']

export default function CategoryTidy({ onDone }) {
  const { documents, categories, suppliers, can, go, reload } = useFinance()
  const edit = can('edit')
  const name = (id) => categories.find((c) => c.id === id)?.name || 'קטגוריה שנמחקה'
  const active = useMemo(() => categories.filter((c) => c.active !== false), [categories])
  // a supplier is listed only when something can really move to where most of its documents already are
  const spread = useMemo(() => supplierSpread(documents, categories).map((s) => ({ ...s, fix: moveImpact(s.docs, s.top, categories) })).filter((s) => s.fix.move.length > 0), [documents, categories])
  const loose = useMemo(() => uncategorizedWithSuggestion(documents, categories), [documents, categories])
  const pairs = useMemo(() => similarCategories(categories), [categories])
  const docsOf = (cid) => documents.filter((d) => !OUT.includes(d.status) && (d.category_id || categories.find((c) => c.name === d.category)?.id) === cid)
  const [shown, setShown] = useState(STEP)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [merge, setMerge] = useState(null)   // { a, b, keep }
  const [other, setOther] = useState({})     // supplier key → a category chosen instead of the most common one
  const total = spread.length + (loose.length ? 1 : 0) + pairs.length
  const run = async (key, fn, text) => { setBusy(key); setErr(''); try { await fn(); await reload(); onDone?.(text) } catch (e) { setErr(e.message) } finally { setBusy('') } }
  const openDocs = (ids, title) => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids, title })) } catch { /* noop */ } go('/documents?ids=1') }

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
  const doMerge = () => {
    const keep = merge.keep === merge.b.id ? merge.b : merge.a; const drop = keep.id === merge.a.id ? merge.b : merge.a
    const im = moveImpact(docsOf(drop.id), keep.id, categories)
    run(`m-${drop.id}`, async () => {
      if (im.move.length) await api.updateDocuments(im.move.map((d) => d.id), { category_id: keep.id })
      // whatever pointed at the name that goes away now points at the one that stays
      for (const s of suppliers.filter((x) => x.default_category === drop.name)) await api.saveRow('fin_suppliers', { id: s.id, default_category: keep.name })
      for (const c of categories.filter((x) => x.parent_id === drop.id && x.id !== keep.id)) await api.saveRow('fin_categories', { id: c.id, parent_id: keep.id })
      if (can('operate')) for (const r of (await api.loadRules()).filter((x) => x.action?.category === drop.name)) await api.saveRow('fin_rules', { id: r.id, action: { ...r.action, category: keep.name } })
      await api.saveRow('fin_categories', { id: drop.id, active: false })
      setMerge(null)
    }, `"${drop.name}" מוזגה לתוך "${keep.name}": ${im.move.length ? sayDid(im.move.length, 'עבר', 'עברו') : 'לא היו מסמכים להעביר'}${im.locked.length ? `, ${sayDocs(im.locked.length)} שכבר אושרו נשארו כמו שדווחו` : ''}`)
  }

  if (!edit) return null
  return (
    <section className={`fin-tidy ${total ? '' : 'is-clean'}`} aria-label="סידור קטגוריות">
      <header className="fin-tidy__head">
        <span className="fin-tidy__icon" aria-hidden="true"><Icon name={total ? 'sparkle' : 'check'} size={20} /></span>
        <div><h3>סידור קטגוריות</h3><p>{total ? 'מצאנו מקומות שבהם השיוך לא עקבי. כל הצעה מציגה מספרים ושואלת לפני שמשהו משתנה.' : 'הכול מסודר: אין ספקים שהמסמכים שלהם מפוזרים, אין מסמכים בלי קטגוריה שאפשר לשייך, ואין קטגוריות כפולות.'}</p></div>
        {active.length > 1 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setMerge({ a: null, b: null, keep: '' })}><Icon name="copy" size={15} /> מיזוג שתי קטגוריות</button>}
      </header>
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {loose.length > 0 && (
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

      {spread.length > 0 && (
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

      {pairs.length > 0 && (
        <div className="fin-tidy__block">
          <h4>{pairs.length === 1 ? 'שתי קטגוריות שנראות כמו אחת' : `${pairs.length} זוגות של קטגוריות שנראות כמו אחת`}</h4>
          <ul className="fin-tidy__list">
            {pairs.map(({ a, b, why }) => (
              <li key={`${a.id}-${b.id}`} className="fin-tidy__pair">
                <span className="fin-tidy__parts"><span className="is-main"><b>{docsOf(a.id).length}</b> {a.name}</span><span className="is-main"><b>{docsOf(b.id).length}</b> {b.name}</span><i>{why}</i></span>
                <span className="fin-tidy__acts"><button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => setMerge({ a, b, keep: docsOf(b.id).length > docsOf(a.id).length ? b.id : a.id })}>מיזוג</button></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {merge && (() => {
        const ready = merge.a && merge.b && merge.a.id !== merge.b.id && merge.keep
        const keep = ready ? (merge.keep === merge.b.id ? merge.b : merge.a) : null; const drop = ready ? (keep.id === merge.a.id ? merge.b : merge.a) : null
        const im = ready ? moveImpact(docsOf(drop.id), keep.id, categories) : null
        const pick = (k) => (e) => { const c = categories.find((x) => x.id === e.target.value) || null; setMerge((m) => { const n = { ...m, [k]: c }; return { ...n, keep: n.a && n.b ? (n.keep && [n.a.id, n.b.id].includes(n.keep) ? n.keep : n.a.id) : '' } }) }
        return (
          <Modal title="מיזוג קטגוריות" onClose={() => setMerge(null)} footer={<>
            <button type="button" className="fin-btn fin-btn--primary" disabled={!ready || !!busy} onClick={doMerge}>{busy ? 'ממזג…' : ready ? `מיזוג לתוך "${keep.name}"` : 'מיזוג'}</button>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setMerge(null)}>ביטול</button>
          </>}>
            <div className="fin-form__grid">
              <label className="fin-field"><span className="fin-field__label">קטגוריה אחת</span><Select value={merge.a?.id || ''} onChange={pick('a')}><option value="">בחרו…</option>{active.filter((c) => c.id !== merge.b?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
              <label className="fin-field"><span className="fin-field__label">קטגוריה שנייה</span><Select value={merge.b?.id || ''} onChange={pick('b')}><option value="">בחרו…</option>{active.filter((c) => c.id !== merge.a?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
            </div>
            {merge.a && merge.b && (
              <fieldset className="fin-tidy__keep">
                <legend>איזו נשארת?</legend>
                {[merge.a, merge.b].map((c) => (
                  <label key={c.id} className={merge.keep === c.id ? 'is-on' : ''}><input type="radio" name="fin-tidy-keep" checked={merge.keep === c.id} onChange={() => setMerge((m) => ({ ...m, keep: c.id }))} /><strong>{c.name}</strong><small>{sayDocs(docsOf(c.id).length)} · קיזוז מע״מ {Number(c.vat_deductible_pct ?? 100)}%</small></label>
                ))}
              </fieldset>
            )}
            {ready && (
              <ul className="fin-bulklines">
                <li>{im.move.length ? `${sayDid(im.move.length, 'יעבור', 'יעברו')} מ"${drop.name}" ל"${keep.name}"` : `אין מסמכים להעביר מ"${drop.name}"`}</li>
                {im.locked.length > 0 && <li>{sayDocs(im.locked.length)} שכבר אושרו או נשלחו לרו״ח {im.locked.length === 1 ? 'נשאר רשום' : 'נשארים רשומים'} תחת "{drop.name}", כמו שדווחו</li>}
                <li>"{drop.name}" עוברת לארכיון ולא תוצע יותר. ספקים וכללים שהפנו אליה יפנו ל"{keep.name}"</li>
                {Number(drop.vat_deductible_pct ?? 100) !== Number(keep.vat_deductible_pct ?? 100) && <li>שימו לב: אחוז קיזוז המע״מ שונה ({Number(drop.vat_deductible_pct ?? 100)}% לעומת {Number(keep.vat_deductible_pct ?? 100)}%). המסמכים שעוברים יחושבו לפי "{keep.name}"</li>}
              </ul>
            )}
            {err && <p className="fin-error" role="alert">{err}</p>}
          </Modal>
        )
      })()}
    </section>
  )
}
