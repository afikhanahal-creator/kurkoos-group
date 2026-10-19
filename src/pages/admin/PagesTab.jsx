import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase.js'
import './pageEditor/pageEditor.css'
import { allPages, GROUP_LABELS } from '../../lib/pageBuilder/defs/index.js'

const PageEditor = lazy(() => import('./pageEditor/PageEditor.jsx'))

/* ============================================================
   לשונית "עמודים": לוח של כל העמודים שנבנים בעורך, בקבוצות.
   הרשימה נבנית מ-defs/index.js, כך שכל עמוד שנוסף שם מופיע כאן.
   ============================================================ */

const COLORS = { main: 'var(--pe-g1)', div: 'var(--pe-g2)', land: 'var(--pe-g3)', city: 'var(--pe-g4)', other: 'var(--pe-g2)' }
function boardGroups() {
  const pages = allPages()
  return Object.keys(GROUP_LABELS)
    .map((id) => ({ id, label: GROUP_LABELS[id], color: COLORS[id], pages: pages.filter((p) => p.group === id).map((p) => [p.path, p.label]) }))
    .filter((g) => g.pages.length)
}
const BOARD = boardGroups()
const TOTAL = BOARD.reduce((n, g) => n + g.pages.length, 0)

const fmt = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function statusOf(slug, pub, drafts) {
  const p = pub[slug]
  const d = drafts[slug]
  const changed = d && (!p || JSON.stringify(d.layout) !== JSON.stringify(p.layout))
  if (changed) return { id: 'draft', label: p ? 'יש שינויים בטיוטה' : 'טיוטה, עוד לא פורסם' }
  if (p) return { id: 'live', label: 'באוויר מהעורך' }
  return { id: 'code', label: 'מוכן לעריכה' }
}

export default function PagesTab({ onNavigate }) {
  const [pub, setPub] = useState({})
  const [drafts, setDrafts] = useState({})
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const load = async () => {
    if (!supabase) return
    const [a, b] = await Promise.all([
      supabase.from('pages').select('slug,version,published_at,layout'),
      supabase.from('page_drafts').select('slug,updated_at,layout'),
    ])
    setPub(Object.fromEntries((a.data || []).map((r) => [r.slug, r])))
    setDrafts(Object.fromEntries((b.data || []).map((r) => [r.slug, r])))
  }
  useEffect(() => { load() }, [])

  const inEditor = Object.keys(pub).length
  const needle = q.trim()

  return (
    <div className="pe-board" dir="rtl">
      <div className="pe-board__bar">
        <div className="pe-board__progress" aria-label={`${inEditor} מתוך ${TOTAL} עמודים בעורך`}>
          <strong>{inEditor} מתוך {TOTAL}</strong> עמודים כבר מנוהלים מהעורך
          <span className="pe-board__meter"><span style={{ width: `${(inEditor / TOTAL) * 100}%` }} /></span>
        </div>
        <label className="pe-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש עמוד" aria-label="חיפוש עמוד" />
        </label>
      </div>

      {BOARD.map((g) => {
        const rows = g.pages.filter(([slug, label]) => !needle || label.includes(needle) || slug.includes(needle))
        if (!rows.length) return null
        const isCol = collapsed[g.id]
        return (
          <section className="pe-group" key={g.id} style={{ '--g': g.color }}>
            <button type="button" className="pe-group__head" onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))} aria-expanded={!isCol}>
              <svg className={`pe-group__chev${isCol ? ' is-col' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              <span className="pe-group__title">{g.label}</span>
              <span className="pe-group__count">{rows.length} עמודים</span>
            </button>
            {!isCol && (
              <div className="pe-table" role="table" aria-label={g.label}>
                <div className="pe-tr pe-tr--head" role="row">
                  <span role="columnheader">עמוד</span>
                  <span role="columnheader">סטטוס</span>
                  <span role="columnheader">פורסם לאחרונה</span>
                  <span role="columnheader" className="pe-sr">פעולות</span>
                </div>
                {rows.map(([slug, label]) => {
                  const st = statusOf(slug, pub, drafts)
                  const can = true
                  return (
                    <div className="pe-tr" role="row" key={slug}>
                      <span role="cell" className="pe-td-name">
                        <strong>{label}</strong>
                        <a href={slug} target="_blank" rel="noopener noreferrer" className="pe-url">{slug}</a>
                      </span>
                      <span role="cell" className={`pe-status pe-status--${st.id}`}>{st.label}</span>
                      <span role="cell" className="pe-td-date">{pub[slug] ? `${fmt(pub[slug].published_at)} · גרסה ${pub[slug].version}` : 'עדיין לא'}</span>
                      <span role="cell" className="pe-td-act">
                        {can
                          ? <button type="button" className="pe-btn pe-btn--primary" onClick={() => setOpen(slug)}>עריכה</button>
                          : <span className="pe-later" title="נפתח אחרי אישור הפיילוט">אחרי הפיילוט</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {open && (
        <Suspense fallback={<div className="pe-loading"><span className="adm-spin" />פותח את העורך…</div>}>
          <PageEditor
            slug={open}
            title={BOARD.flatMap((g) => g.pages).find(([s]) => s === open)?.[1] || open}
            onClose={() => { setOpen(null); load() }}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}
    </div>
  )
}
