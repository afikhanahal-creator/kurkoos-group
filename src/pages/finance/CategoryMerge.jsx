import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { moveImpact, sayDid, sayDocs, OUT } from './categorySuggest.js'
import { categoryColor } from './execKit.jsx'
import { money, signedTotal } from './format.js'
import { Icon, Modal } from './ui.jsx'

/* Merging categories: pick two or more that mean the same thing, choose the one that stays, see what will move (how many
   documents, how much money, what stays where it was reported) and only then merge. Nothing is merged without this
   confirmation. A document that was approved or sent to the accountant keeps the category it was reported under. */

export default function CategoryMerge({ start = [], onClose, onDone }) {
  const { documents, categories, suppliers, can, go, reload } = useFinance()
  const active = useMemo(() => categories.filter((c) => c.active !== false), [categories])
  const stat = useMemo(() => {
    const m = new Map(active.map((c) => [c.id, { docs: [], total: 0 }]))
    for (const d of documents) { if (OUT.includes(d.status)) continue; const id = d.category_id || categories.find((c) => c.name === d.category)?.id; const g = m.get(id); if (g) { g.docs.push(d); g.total += signedTotal(d) } }
    return m
  }, [documents, categories, active])
  const [picked, setPicked] = useState(() => start.filter((id) => active.some((c) => c.id === id)))
  const biggest = (ids) => [...ids].sort((a, b) => (stat.get(b)?.docs.length || 0) - (stat.get(a)?.docs.length || 0))[0] || ''
  const [keepId, setKeepId] = useState(() => biggest(start))
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const toggle = (id) => { const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]; setPicked(next); if (!next.includes(keepId)) setKeepId(biggest(next)) }
  const rows = active.filter((c) => !q.trim() || c.name.includes(q.trim()) || picked.includes(c.id)).sort((a, b) => Number(picked.includes(b.id)) - Number(picked.includes(a.id)) || (stat.get(b.id)?.total || 0) - (stat.get(a.id)?.total || 0))
  const keep = active.find((c) => c.id === keepId)
  const drops = picked.filter((id) => id !== keepId).map((id) => active.find((c) => c.id === id)).filter(Boolean)
  const plan = keep ? drops.map((c) => ({ c, im: moveImpact(stat.get(c.id)?.docs || [], keep.id, categories) })) : []
  const moving = plan.reduce((a, p) => a + p.im.move.length, 0); const locked = plan.reduce((a, p) => a + p.im.locked.length, 0)
  const movingSum = plan.reduce((a, p) => a + p.im.move.reduce((s, d) => s + signedTotal(d), 0), 0)
  const vatDiff = plan.filter((p) => Number(p.c.vat_deductible_pct ?? 100) !== Number(keep.vat_deductible_pct ?? 100))
  const ready = keep && drops.length > 0
  const see = (c) => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids: (stat.get(c.id)?.docs || []).map((d) => d.id), title: `המסמכים של "${c.name}"` })) } catch { /* noop */ } go('/documents?ids=1') }

  const run = async () => {
    setBusy(true); setErr('')
    try {
      const rules = can('operate') ? await api.loadRules() : []
      for (const { c: drop, im } of plan) {
        if (im.move.length) await api.updateDocuments(im.move.map((d) => d.id), { category_id: keep.id })
        // whatever pointed at the name that goes away now points at the one that stays
        for (const s of suppliers.filter((x) => x.default_category === drop.name)) await api.saveRow('fin_suppliers', { id: s.id, default_category: keep.name })
        for (const c of categories.filter((x) => x.parent_id === drop.id && x.id !== keep.id)) await api.saveRow('fin_categories', { id: c.id, parent_id: keep.id })
        for (const r of rules.filter((x) => x.action?.category === drop.name)) await api.saveRow('fin_rules', { id: r.id, action: { ...r.action, category: keep.name } })
        await api.saveRow('fin_categories', { id: drop.id, active: false })
      }
      await reload()
      onDone?.(`${drops.length === 1 ? `"${drops[0].name}" מוזגה` : `${drops.length} קטגוריות מוזגו`} לתוך "${keep.name}": ${moving ? sayDid(moving, 'עבר', 'עברו') : 'לא היו מסמכים להעביר'}${locked ? `, ${sayDocs(locked)} שכבר אושרו נשארו כמו שדווחו` : ''}`)
      onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <Modal title="מיזוג קטגוריות" onClose={onClose} wide footer={<>
      <button type="button" className="fin-btn fin-btn--primary" disabled={!ready || busy} onClick={run}>{busy ? 'ממזג…' : ready ? `מיזוג ${drops.length === 1 ? 'הקטגוריה' : `${drops.length} קטגוריות`} לתוך "${keep.name}"` : 'בחרו לפחות שתי קטגוריות'}</button>
      <button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>ביטול</button>
    </>}>
      <div className="fin-cmerge">
        <div className="fin-cmerge__pick">
          <h4>1. אילו קטגוריות הן אותו דבר? <span className="fin-muted">{picked.length} נבחרו</span></h4>
          <label className="fin-search"><Icon name="search" size={16} /><input type="search" value={q} placeholder="חיפוש קטגוריה" aria-label="חיפוש קטגוריה למיזוג" onChange={(e) => setQ(e.target.value)} /></label>
          <ul className="fin-cmerge__list">
            {rows.map((c) => { const s = stat.get(c.id); const on = picked.includes(c.id)
              return (
                <li key={c.id} className={on ? 'is-on' : ''}>
                  <label className="fin-check"><input type="checkbox" checked={on} onChange={() => toggle(c.id)} /><i style={{ background: categoryColor(c.name) }} /><span className="fin-cmerge__name">{c.name}</span></label>
                  <span className="fin-cmerge__n">{sayDocs(s?.docs.length || 0)}</span><span className="fin-cmerge__sum">{money(s?.total || 0)}</span>
                </li>
              )
            })}
            {!rows.length && <li className="fin-muted">לא נמצאה קטגוריה.</li>}
          </ul>
        </div>
        <div className="fin-cmerge__plan">
          <h4>2. איזו נשארת?</h4>
          {picked.length < 2 ? <p className="fin-muted">סמנו שתי קטגוריות או יותר. אחת תישאר, והאחרות יעברו לארכיון.</p> : (
            <>
              <div className="fin-cmerge__keep" role="radiogroup" aria-label="הקטגוריה שנשארת">
                {picked.map((id) => { const c = active.find((x) => x.id === id); const s = stat.get(id); if (!c) return null
                  return (
                    <label key={id} className={keepId === id ? 'is-on' : ''}>
                      <input type="radio" name="fin-cmerge-keep" checked={keepId === id} onChange={() => setKeepId(id)} />
                      <span><strong>{c.name}</strong><small>{sayDocs(s?.docs.length || 0)} · {money(s?.total || 0)} · קיזוז מע״מ {Number(c.vat_deductible_pct ?? 100)}%</small></span>
                      {(s?.docs.length || 0) > 0 && <button type="button" className="fin-link" onClick={() => see(c)}>לצפות במסמכים</button>}
                    </label>
                  )
                })}
              </div>
              {ready && (
                <>
                  <h4>3. מה יקרה</h4>
                  <ul className="fin-bulklines">
                    <li>{moving ? `${sayDid(moving, 'יעבור', 'יעברו')} ל"${keep.name}", בסך ${money(movingSum)}` : 'אין מסמכים להעביר'}</li>
                    {plan.map(({ c, im }) => <li key={c.id}>"{c.name}": {im.move.length ? sayDid(im.move.length, 'עובר', 'עוברים') : 'אין מסמכים להעביר'}{im.locked.length ? `, ${sayDocs(im.locked.length)} שכבר אושרו או נשלחו לרו״ח ${im.locked.length === 1 ? 'נשאר' : 'נשארים'} תחתיה כמו שדווחו` : ''}. הקטגוריה עוברת לארכיון ולא תוצע יותר</li>)}
                    <li>ספקים וכללים שהפנו לקטגוריות שנסגרות יפנו ל"{keep.name}"</li>
                    {vatDiff.length > 0 && <li>שימו לב: אחוז קיזוז המע״מ שונה ב-{vatDiff.map((p) => `"${p.c.name}" (${Number(p.c.vat_deductible_pct ?? 100)}%)`).join(', ')} לעומת {Number(keep.vat_deductible_pct ?? 100)}% ב"{keep.name}". המסמכים שעוברים יחושבו לפי "{keep.name}"</li>}
                  </ul>
                </>
              )}
            </>
          )}
          {err && <p className="fin-error" role="alert">{err}</p>}
        </div>
      </div>
    </Modal>
  )
}
