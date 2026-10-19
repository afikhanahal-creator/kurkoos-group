import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase.js'
import './pageEditor/pageEditor.css'
import { allPages, GROUP_LABELS } from '../../lib/pageBuilder/defs/index.js'

const PageEditor = lazy(() => import('./pageEditor/PageEditor.jsx'))

/* ============================================================
   לשונית "עמודים": לוח של כל העמודים שנבנים בעורך, בקבוצות.
   הרשימה נבנית מ-defs/index.js, כך שכל עמוד שנוסף שם מופיע כאן.
   ============================================================ */

const COLORS = { main: 'var(--pe-g1)', div: 'var(--pe-g2)', land: 'var(--pe-g3)', city: 'var(--pe-g4)', guides: '#3d7a62', legal: '#6b7686', other: 'var(--pe-g2)' }
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
  return { id: 'code', label: 'עוד לא נערך' }
}

/* תצוגה חיה וזעירה של העמוד: נטענת רק כשהכרטיס נכנס למסך */
function Thumb({ slug, label, onOpen }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  const [ready, setReady] = useState(false)
  const [scale, setScale] = useState(0.22)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1280))
    ro.observe(el)
    if (typeof IntersectionObserver === 'undefined') { setOn(true); return () => ro.disconnect() }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { rootMargin: '200px' })
    io.observe(el)
    return () => { io.disconnect(); ro.disconnect() }
  }, [])
  return (
    <button type="button" ref={ref} className={`pe-thumb-card${ready ? ' is-ready' : ''}`} onClick={onOpen} aria-label={`עריכת העמוד ${label}`}>
      {on && <iframe src={`${slug}${slug.includes('?') ? '&' : '?'}kc-thumb=1`} title={`תצוגה זעירה של ${label}`} tabIndex={-1} aria-hidden="true" loading="lazy" style={{ transform: `scale(${scale})` }} onLoad={() => setTimeout(() => setReady(true), 600)} />}
      <span className="pe-thumb-card__shade" aria-hidden="true"><span>פתיחה בעורך</span></span>
    </button>
  )
}

export default function PagesTab({ onNavigate }) {
  const [pub, setPub] = useState({})
  const [drafts, setDrafts] = useState({})
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState(() => { try { return localStorage.getItem('kc-pages-view') || 'cards' } catch { return 'cards' } })
  useEffect(() => { try { localStorage.setItem('kc-pages-view', view) } catch { /* noop */ } }, [view])

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

  const all = BOARD.flatMap((g) => g.pages)
  const stats = all.reduce((acc, [slug]) => { acc[statusOf(slug, pub, drafts).id]++; return acc }, { live: 0, draft: 0, code: 0 })
  const needle = q.trim()
  const match = ([slug, label]) => (!needle || label.includes(needle) || slug.includes(needle)) && (filter === 'all' || statusOf(slug, pub, drafts).id === filter)
  const shown = all.filter(match).length

  return (
    <div className="pe-board" dir="rtl">
      {/* כשהעורך פתוח, הלוח שמאחוריו לא נגיש למקלדת ולקוראי מסך */}
      <div className="pe-board__inner" inert={open ? '' : undefined}>
      <div className="pe-kpis">
        {[['all', 'כל העמודים', all.length, 'מוכנים לעריכה בעורך'], ['live', 'באוויר מהעורך', stats.live, 'פורסמו לפחות פעם אחת'], ['draft', 'טיוטות', stats.draft, 'יש שינויים שמחכים לפרסום'], ['code', 'עוד לא נערכו', stats.code, 'מוצגים כמו היום, מהקוד']].map(([id, label, n, sub]) => (
          <button key={id} type="button" className={`pe-kpi pe-kpi--${id}${filter === id ? ' is-on' : ''}`} onClick={() => setFilter(filter === id && id !== 'all' ? 'all' : id)} aria-pressed={filter === id}>
            <span className="pe-kpi__n">{n}</span>
            <span className="pe-kpi__label">{label}</span>
            <span className="pe-kpi__sub">{sub}</span>
          </button>
        ))}
      </div>

      <div className="pe-board__bar">
        <label className="pe-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש עמוד לפי שם או כתובת" aria-label="חיפוש עמוד" />
        </label>
        <div className="pe-viewsw" role="radiogroup" aria-label="תצוגה">
          <button type="button" role="radio" aria-checked={view === 'cards'} className={view === 'cards' ? 'is-on' : ''} onClick={() => setView('cards')}>כרטיסים</button>
          <button type="button" role="radio" aria-checked={view === 'list'} className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}>רשימה</button>
        </div>
      </div>

      {!shown && <p className="pe-empty-note">לא נמצא עמוד. נסו מילה אחרת או הסירו את הסינון.</p>}

      {BOARD.map((g) => {
        const rows = g.pages.filter(match)
        if (!rows.length) return null
        const isCol = collapsed[g.id]
        return (
          <section className="pe-group" key={g.id} style={{ '--g': g.color }}>
            <button type="button" className="pe-group__head" onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))} aria-expanded={!isCol}>
              <span className="pe-group__dot" aria-hidden="true" />
              <span className="pe-group__title">{g.label}</span>
              <span className="pe-group__count">{rows.length}</span>
              <svg className={`pe-group__chev${isCol ? ' is-col' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {!isCol && (
              <div className={view === 'cards' ? 'pe-cards' : 'pe-list'}>
                {rows.map(([slug, label]) => {
                  const st = statusOf(slug, pub, drafts)
                  const when = pub[slug] ? `פורסם ${fmt(pub[slug].published_at)} · גרסה ${pub[slug].version}` : drafts[slug] ? `טיוטה מ ${fmt(drafts[slug].updated_at)}` : 'מוצג באתר כמו היום'
                  return (
                    <article className="pe-card" key={slug}>
                      {view === 'cards' && <Thumb slug={slug} label={label} onOpen={() => setOpen(slug)} />}
                      <div className="pe-card__body">
                        <div className="pe-card__top">
                          <h3 className="pe-card__title">{label}</h3>
                          <span className={`pe-pill pe-pill--${st.id}`}>{st.label}</span>
                        </div>
                        <a href={slug} target="_blank" rel="noopener noreferrer" className="pe-url" title="פתיחת העמוד באתר">{slug}</a>
                        <p className="pe-card__when">{when}</p>
                        <div className="pe-card__acts">
                          <button type="button" className="pe-btn pe-btn--primary" onClick={() => setOpen(slug)}>עריכת העמוד</button>
                          <a className="pe-icon-btn pe-icon-btn--line" href={slug} target="_blank" rel="noopener noreferrer" aria-label={`צפייה בעמוד ${label} באתר`} title="צפייה באתר">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
                          </a>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      </div>
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
