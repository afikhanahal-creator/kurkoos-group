import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import he from '../../../i18n/he.js'
import { WIDGETS, GROUPS, BG } from '../../../lib/pageBuilder/widgets.jsx'
import {
  DEVICES, SPACE_SCALE, TYPE_SCALE, newId, defaultLayout, clone, effectiveRs,
  fetchDraft, fetchPublished, saveDraft, publishPage, listVersions,
} from '../../../lib/pageBuilder/layout.js'
import { loadHeadingOverrides } from '../../../lib/headings.js'
import { uploadMedia, uploadVideoFile, fetchSettings, setSetting } from '../../../lib/cms.js'
import { readExecutionShowcase } from '../../../data/executionShowcase.js'
import ImageManager from '../ImageManager.jsx'
import { executionGallery } from '../../../data/executionGallery.js'
import { toast } from '../../../lib/toast.js'
import { WIcon, UiIcon } from './icons.jsx'
import { defFor } from '../../../lib/pageBuilder/defs/index.js'
import { localMeta } from '../../../lib/pageBuilder/PageRenderer.jsx'

/* רכיב משותף מהספרייה, או סקשן של העמוד עצמו (מוצג פעם אחת) */
const metaFor = (lm) => (type) => WIDGETS[type] || (lm[type] ? { ...lm[type], group: 'local', once: true, local: true } : null)

/* ============================================================
   עורך העמודים. במרכז: העמוד האמיתי בתוך iframe, ברוחב של המכשיר
   שנבחר. מימין: רכיבים, מבנה והגדרות. כל שינוי נשמר כטיוטה אוטומטית,
   ו"פרסום" מעלה את הטיוטה לאתר ושומר גרסה בהיסטוריה.
   ============================================================ */

const dictDefault = (key) => key.split('.').reduce((a, k) => (a ? a[k] : undefined), he) ?? ''
const deviceOf = (id) => DEVICES.find((d) => d.id === id) || DEVICES[0]
const HISTORY_MAX = 80

function useHistory(initial) {
  const [state, setState] = useState({ past: [], present: initial, future: [] })
  /* הקלדה רצופה באותו שדה נכנסת לצעד אחד בהיסטוריה, כך ש"בטל" מחזיר מילה ולא אות */
  const last = useRef({ group: null, t: 0 })
  const set = useCallback((updater, { merge = false, group = null } = {}) => {
    const now = Date.now()
    const same = group && last.current.group === group && now - last.current.t < 1200
    last.current = { group, t: now }
    setState((s) => {
      const next = typeof updater === 'function' ? updater(s.present) : updater
      if (next === s.present) return s
      const past = merge || same ? s.past : [...s.past, s.present].slice(-HISTORY_MAX)
      return { past, present: next, future: [] }
    })
  }, [])
  const reset = useCallback((v) => setState({ past: [], present: v, future: [] }), [])
  const undo = useCallback(() => setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)), [])
  const redo = useCallback(() => setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), [])
  return { layout: state.present, set, reset, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }
}

export default function PageEditor({ slug, title, onClose, onNavigate }) {
  const def = useMemo(() => defFor(slug), [slug])
  const lm = useMemo(() => localMeta(def), [def])
  const W_ = useMemo(() => metaFor(lm), [lm])
  const h = useHistory(null)
  const { layout } = h
  const [selected, setSelected] = useState(null)
  // בטלפון העורך נפתח על תצוגת הנייד, כמו שהגולשים יראו את העמוד
  const [device, setDevice] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 600 ? 'm' : 'd'))
  const [panel, setPanel] = useState('add')
  const [save, setSave] = useState('idle') // idle | saving | saved | error
  const [publishing, setPublishing] = useState(false)
  const [live, setLive] = useState(null) // שורת pages הנוכחית
  const [overrides, setOverrides] = useState({})
  const [found, setFound] = useState({})
  const [versionsOpen, setVersionsOpen] = useState(false)
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const [canvas, setCanvas] = useState({ w: 1000, h: 700 })
  const lastSaved = useRef('')

  /* טעינה: טיוטה, ואם אין אז הגרסה המפורסמת, ואם אין אז המבנה מהקוד */
  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        const [d, p, o] = await Promise.all([fetchDraft(slug).catch(() => null), fetchPublished(slug).catch(() => null), loadHeadingOverrides().catch(() => ({}))])
        if (!on) return
        setLive(p)
        setOverrides(o || {})
        const base = d?.layout || p?.layout || defaultLayout(def)
        const l = { v: 1, texts: {}, seo: {}, ...clone(base) }
        lastSaved.current = JSON.stringify(l)
        h.reset(l)
      } catch (e) {
        toast.error('טעינת העמוד נכשלה')
      }
    })()
    return () => { on = false }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  /* נעילת הגלילה של הניהול מאחורי העורך */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  /* שמירת טיוטה אוטומטית, שנייה וחצי אחרי השינוי האחרון */
  useEffect(() => {
    if (!layout) return undefined
    const json = JSON.stringify(layout)
    if (json === lastSaved.current) return undefined
    setSave('saving')
    const id = setTimeout(async () => {
      try { await saveDraft(slug, layout); lastSaved.current = json; setSave('saved') } catch { setSave('error') }
    }, 1500)
    return () => clearTimeout(id)
  }, [layout, slug])

  const flush = useCallback(async () => {
    if (!layout) return
    const json = JSON.stringify(layout)
    if (json === lastSaved.current) return
    await saveDraft(slug, layout); lastSaved.current = json; setSave('saved')
  }, [layout, slug])

  /* שליחת המצב ל-iframe */
  const send = useCallback((msg) => {
    const w = frameRef.current && frameRef.current.contentWindow
    if (w) w.postMessage({ kc: 1, ...msg }, window.location.origin)
  }, [])
  useEffect(() => { if (layout) send({ type: 'state', layout, selected }) }, [layout, selected, send])

  /* ---------- פעולות על המבנה ---------- */
  const sections = layout?.sections || []
  const sel = sections.find((s) => s.id === selected) || null

  const patchSection = useCallback((id, fn, opts) => {
    h.set((l) => ({ ...l, sections: l.sections.map((s) => (s.id === id ? fn(s) : s)) }), opts)
  }, [h])
  const insert = useCallback((type, index) => {
    const W = W_(type)
    if (!W) return
    if (W.once && sections.some((s) => s.type === type)) { toast.error(`${W.label} כבר מופיע בעמוד`); return }
    const s = { id: newId(type), type, props: W.basic ? clone(W.defaults || {}) : {}, rs: {} }
    h.set((l) => {
      const arr = [...l.sections]
      const at = index == null ? arr.length : Math.max(0, Math.min(arr.length, index))
      arr.splice(at, 0, s)
      return { ...l, sections: arr }
    })
    setSelected(s.id)
    setPanel('settings')
    setTimeout(() => send({ type: 'scrollTo', id: s.id }), 350)
  }, [sections, h, send, W_])
  const insertAfterSelected = (type) => {
    const i = sections.findIndex((s) => s.id === selected)
    insert(type, i >= 0 ? i + 1 : undefined)
  }
  const act = useCallback((id, action) => {
    const i = sections.findIndex((s) => s.id === id)
    if (i < 0) return
    if (action === 'up' && i > 0) h.set((l) => ({ ...l, sections: arrayMove(l.sections, i, i - 1) }))
    if (action === 'down' && i < sections.length - 1) h.set((l) => ({ ...l, sections: arrayMove(l.sections, i, i + 1) }))
    if (action === 'dup') {
      const W = W_(sections[i].type)
      if (W?.once) { toast.error(`${W.label} מופיע פעם אחת בעמוד`); return }
      const c = { ...clone(sections[i]), id: newId(sections[i].type) }
      h.set((l) => { const arr = [...l.sections]; arr.splice(i + 1, 0, c); return { ...l, sections: arr } })
      setSelected(c.id)
    }
    if (action === 'hide') patchSection(id, (s) => ({ ...s, hidden: !s.hidden }))
    if (action === 'del') {
      h.set((l) => ({ ...l, sections: l.sections.filter((s) => s.id !== id) }))
      setSelected(null)
      toast.success('הסקשן הוסר. אפשר להחזיר עם בטל (Ctrl+Z)')
    }
    if (action === 'up' || action === 'down') setTimeout(() => send({ type: 'scrollTo', id }), 200)
  }, [sections, h, patchSection, send])

  const setText = useCallback((key, value) => {
    h.set((l) => ({ ...l, texts: { ...(l.texts || {}), [key]: value } }), { group: `text:${key}` })
  }, [h])

  /* הודעות מה-iframe */
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || !e.data || !e.data.kc) return
      if (frameRef.current && e.source !== frameRef.current.contentWindow) return
      const d = e.data
      if (d.type === 'ready' && layout) send({ type: 'state', layout, selected })
      if (d.type === 'select') { setSelected(d.id); if (d.id) setPanel('settings') }
      if (d.type === 'drop') insert(d.widget, d.index)
      if (d.type === 'action') act(d.id, d.action)
      if (d.type === 'keys') setFound(d.found || {})
      if (d.type === 'text') setText(d.key, d.value)
      if (d.type === 'field') {
        patchSection(d.id, (s) => {
          const props = clone(s.props || {})
          const path = d.field.split('.')
          let o = props
          for (let k = 0; k < path.length - 1; k++) o = o[path[k]]
          o[path[path.length - 1]] = d.value
          return { ...s, props }
        })
      }
      if (d.type === 'key') {
        if (d.key === 'z' && !d.shift) h.undo()
        if ((d.key === 'z' && d.shift) || d.key === 'y') h.redo()
        if (d.key === 'delete' && selected) act(selected, 'del')
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [layout, selected, send, insert, act, setText, patchSection, h])

  /* קיצורי מקלדת בעורך עצמו */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); h.redo() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); flush() }
      if (e.key === 'Delete' && selected && !typing) act(selected, 'del')
      if (e.key === 'Escape' && !typing) setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [h, flush, selected, act])

  /* מידות הקנבס, לחישוב הקטנה של תצוגת המחשב. הקנבס קיים רק אחרי שהעמוד נטען,
     ולכן המדידה מתחילה כשיש layout (אחרת נשארה ברירת המחדל של 1000 והתצוגה גלשה לצד) */
  const ready = !!layout
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return undefined
    const measure = () => {
      const cs = getComputedStyle(el)
      const px = (v) => parseFloat(v) || 0
      setCanvas({ w: el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight), h: el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom) - 40 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ready])
  const dev = deviceOf(device)
  // canvas.w and canvas.h are the room inside the canvas padding (and above the hint line)
  const scale = Math.max(0.1, Math.min(1, canvas.w / dev.width))
  const frameH = Math.max(400, canvas.h / scale)

  /* ---------- פרסום ---------- */
  const publish = async () => {
    if (!layout || publishing) return
    setPublishing(true)
    try {
      await flush()
      const v = await publishPage(slug, layout, { baseTexts: overrides })
      const o = await loadHeadingOverrides().catch(() => overrides)
      setOverrides(o)
      const clean = { ...layout, texts: {} }
      lastSaved.current = JSON.stringify(clean)
      h.set(() => clean, { merge: true })
      const p = await fetchPublished(slug).catch(() => null)
      setLive(p || { version: v, published_at: new Date().toISOString() })
      toast.success(`פורסם. גרסה ${v} באוויר`)
    } catch (e) {
      toast.error('הפרסום נכשל. הטיוטה שמורה, נסו שוב')
    } finally { setPublishing(false) }
  }
  const openPreview = async () => {
    try { await flush() } catch { /* ממשיכים גם אם השמירה נכשלה */ }
    window.open(`${slug}${slug.includes('?') ? '&' : '?'}kc-preview=1`, '_blank', 'noopener')
  }

  const dirty = useMemo(() => {
    if (!layout) return false
    if (Object.keys(layout.texts || {}).length) return true
    if (!live) return true
    return JSON.stringify({ ...layout, texts: {} }) !== JSON.stringify(live.layout || {})
  }, [layout, live])

  if (!layout) {
    return createPortal(<div className="pe-loading" dir="rtl"><span className="adm-spin" />טוען את העמוד…</div>, document.body)
  }

  const saveLabel = save === 'saving' ? 'שומר טיוטה…' : save === 'error' ? 'השמירה נכשלה' : save === 'saved' ? 'הטיוטה שמורה' : 'הטיוטה שמורה'

  return createPortal(
    <div className="pe" dir="rtl" role="dialog" aria-modal="true" aria-label={`עורך העמוד ${title}`}>
      <header className="pe-top">
        <div className="pe-top__start">
          <button type="button" className="pe-icon-btn" onClick={async () => { try { await flush() } catch { /* noop */ } onClose() }} aria-label="חזרה לרשימת העמודים" title="חזרה לרשימת העמודים">
            <UiIcon name="back" />
          </button>
          <div className="pe-top__title">
            <strong>{title}</strong>
            <span className={`pe-save pe-save--${save}`} role="status">{saveLabel}{live ? ` · באוויר: גרסה ${live.version}` : ' · עוד לא פורסם מהעורך'}</span>
          </div>
        </div>

        <div className="pe-devices" role="radiogroup" aria-label="תצוגה לפי מכשיר">
          {DEVICES.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={device === d.id} className={`pe-dev${device === d.id ? ' is-on' : ''}`} onClick={() => setDevice(d.id)} title={`${d.label} · ${d.width}px`}>
              <UiIcon name={d.id === 'd' ? 'desktop' : d.id === 't' ? 'tablet' : 'phone'} />
              <span>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="pe-top__end">
          <button type="button" className="pe-icon-btn" onClick={h.undo} disabled={!h.canUndo} aria-label="בטל" title="בטל (Ctrl+Z)"><UiIcon name="undo" /></button>
          <button type="button" className="pe-icon-btn" onClick={h.redo} disabled={!h.canRedo} aria-label="חזור" title="חזור (Ctrl+Shift+Z)"><UiIcon name="redo" /></button>
          <button type="button" className="pe-icon-btn" onClick={() => setVersionsOpen(true)} aria-label="היסטוריית גרסאות" title="היסטוריית גרסאות"><UiIcon name="history" /></button>
          <button type="button" className="pe-btn pe-btn--ghost" onClick={openPreview}><UiIcon name="eye" />תצוגה מקדימה</button>
          <button type="button" className="pe-btn pe-btn--publish" onClick={publish} disabled={publishing || !dirty} title={dirty ? 'העלאת הטיוטה לאתר' : 'אין שינויים לפרסום'}>
            {publishing ? 'מפרסם…' : dirty ? 'פרסום' : 'מפורסם'}
          </button>
        </div>
      </header>

      <div className="pe-body">
        <aside className="pe-side" aria-label="כלי העורך">
          <div className="pe-tabs" role="tablist">
            {[['add', 'רכיבים', 'plus'], ['tree', 'מבנה', 'layers'], ['settings', 'הגדרות', 'sliders']].map(([id, label, ic]) => (
              <button key={id} type="button" role="tab" aria-selected={panel === id} className={`pe-tab${panel === id ? ' is-on' : ''}`} onClick={() => setPanel(id)}>
                <UiIcon name={ic} />{label}
              </button>
            ))}
          </div>
          <div className="pe-panel">
            {panel === 'add' && <AddPanel sections={sections} onAdd={insertAfterSelected} W_={W_} lm={lm} />}
            {panel === 'tree' && (
              <TreePanel
                W_={W_}
                sections={sections}
                selected={selected}
                onSelect={(id) => { setSelected(id); send({ type: 'scrollTo', id }) }}
                onMove={(from, to) => h.set((l) => ({ ...l, sections: arrayMove(l.sections, from, to) }))}
                onAct={act}
                onEdit={(id) => { setSelected(id); setPanel('settings') }}
              />
            )}
            {panel === 'settings' && (
              sel
                ? <SettingsPanel
                    W_={W_}
                    key={sel.id}
                    s={sel}
                    device={device}
                    setDevice={setDevice}
                    texts={layout.texts || {}}
                    overrides={overrides}
                    foundKeys={found[sel.id]}
                    onPatch={(fn, opts) => patchSection(sel.id, fn, opts)}
                    onText={setText}
                    onAct={(a) => act(sel.id, a)}
                    slug={slug}
                    onSettings={() => send({ type: 'settings' })}
                    onNavigate={async (tab) => { try { await flush() } catch { /* noop */ } onClose(); onNavigate && onNavigate(tab) }}
                  />
                : <PageSettings seoOn={!!def?.seo} layout={layout} onSeo={(seo) => h.set((l) => ({ ...l, seo: { ...(l.seo || {}), ...seo } }), { group: `seo:${Object.keys(seo)[0]}` })} />
            )}
          </div>
        </aside>

        <main className="pe-canvas" ref={canvasRef} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="pe-frame-wrap" style={{ width: dev.width * scale, height: frameH * scale }}>
            <iframe
              ref={frameRef}
              className="pe-frame"
              title={`תצוגת העמוד ${title}`}
              src={`${slug}${slug.includes('?') ? '&' : '?'}kc-edit=1`}
              style={{ width: dev.width, height: frameH, transform: `scale(${scale})` }}
            />
          </div>
          <p className="pe-hint">לחיצה בוחרת סקשן · לחיצה כפולה על טקסט עורכת אותו · גוררים רכיב מהספרייה אל העמוד</p>
        </main>
      </div>

      {versionsOpen && (
        <VersionsDrawer
          slug={slug}
          onClose={() => setVersionsOpen(false)}
          onRestore={(v) => { h.set(() => ({ v: 1, seo: {}, ...clone(v.layout), texts: clone(v.layout.texts || {}) })); setSelected(null); setVersionsOpen(false); toast.success(`גרסה ${v.version} הוחזרה לטיוטה. אפשר לפרסם אותה`) }}
        />
      )}
    </div>,
    document.body
  )
}

/* ---------- ספריית הרכיבים ---------- */
function AddPanel({ sections, onAdd, W_, lm }) {
  const [q, setQ] = useState('')
  const needle = q.trim()
  return (
    <div className="pe-add">
      <label className="pe-search pe-search--full">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש רכיב" aria-label="חיפוש רכיב" />
      </label>
      <p className="pe-muted">גוררים אל העמוד, או לוחצים להוספה אחרי הסקשן שנבחר.</p>
      {[{ id: 'local', label: 'סקשנים של העמוד הזה' }, ...GROUPS].map((g) => {
        const pool = g.id === 'local' ? Object.keys(lm).map((k) => [k, W_(k)]) : Object.entries(WIDGETS)
        const items = pool.filter(([, w]) => w.group === g.id && (!needle || w.label.includes(needle)))
        if (!items.length) return null
        return (
          <div key={g.id} className="pe-add__group">
            <h3 className="pe-h3">{g.label}</h3>
            <div className="pe-tiles">
              {items.map(([type, w]) => {
                const used = w.once && sections.some((s) => s.type === type)
                return (
                  <button
                    key={type}
                    type="button"
                    className="pe-tile"
                    draggable={!used}
                    disabled={used}
                    title={used ? 'כבר מופיע בעמוד' : `הוספת ${w.label}`}
                    onDragStart={(e) => { e.dataTransfer.setData('text/kc-widget', type); e.dataTransfer.setData('text/plain', `kc-widget:${type}`); e.dataTransfer.effectAllowed = 'copy' }}
                    onClick={() => onAdd(type)}
                  >
                    <WIcon name={w.icon} />
                    <span>{w.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- עץ הסקשנים ---------- */
function TreeRow({ s, i, n, selected, onSelect, onAct, onEdit, W_ }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id })
  const W = W_(s.type) || { label: s.type, icon: 'text' }
  const hiddenOn = ['d', 't', 'm'].filter((d) => s.rs?.[d]?.hide)
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`pe-row${selected ? ' is-sel' : ''}${isDragging ? ' is-drag' : ''}${s.hidden ? ' is-hidden' : ''}`}>
      <button type="button" className="pe-row__grip" aria-label={`גרירה של ${W.label}`} {...attributes} {...listeners}><UiIcon name="grip" /></button>
      <button type="button" className="pe-row__main" onClick={() => onSelect(s.id)} onDoubleClick={() => onEdit(s.id)}>
        <WIcon name={W.icon} />
        <span className="pe-row__label">{W.label}</span>
        {s.hidden ? <span className="pe-chip pe-chip--muted">מוסתר</span> : null}
        {!s.hidden && hiddenOn.length ? <span className="pe-chip">{hiddenOn.length === 1 ? `לא ב${deviceOf(hiddenOn[0]).label}` : 'מוסתר בחלק'}</span> : null}
      </button>
      <span className="pe-row__acts">
        <button type="button" onClick={() => onAct(s.id, 'up')} disabled={i === 0} aria-label="למעלה" title="למעלה"><UiIcon name="up" /></button>
        <button type="button" onClick={() => onAct(s.id, 'down')} disabled={i === n - 1} aria-label="למטה" title="למטה"><UiIcon name="down" /></button>
        <button type="button" onClick={() => onAct(s.id, 'hide')} aria-label={s.hidden ? 'הצגה' : 'הסתרה'} title={s.hidden ? 'הצגה' : 'הסתרה'}><UiIcon name={s.hidden ? 'eye' : 'eyeOff'} /></button>
        <button type="button" onClick={() => onAct(s.id, 'dup')} aria-label="שכפול" title="שכפול"><UiIcon name="dup" /></button>
        <button type="button" onClick={() => onAct(s.id, 'del')} aria-label="מחיקה" title="מחיקה" className="is-danger"><UiIcon name="trash" /></button>
      </span>
    </li>
  )
}

function TreePanel({ sections, selected, onSelect, onMove, onAct, onEdit, W_ }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = sections.findIndex((s) => s.id === active.id)
    const to = sections.findIndex((s) => s.id === over.id)
    if (from >= 0 && to >= 0) onMove(from, to)
  }
  return (
    <div className="pe-tree">
      <p className="pe-muted">{sections.length} סקשנים. גוררים מהידית כדי לשנות סדר.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ol className="pe-rows">
            {sections.map((s, i) => (
              <TreeRow key={s.id} s={s} i={i} n={sections.length} selected={s.id === selected} onSelect={onSelect} onAct={onAct} onEdit={onEdit} W_={W_} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!sections.length && <p className="pe-empty-note">העמוד ריק. הוסיפו רכיב מהלשונית "רכיבים".</p>}
    </div>
  )
}

/* ---------- הגדרות ---------- */
function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="pe-sgroup">
      <button type="button" className="pe-sgroup__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <svg className={open ? '' : 'is-col'} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div className="pe-sgroup__body">{children}</div>}
    </section>
  )
}

function Seg({ value, options, onChange, label }) {
  return (
    <div className="pe-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={value === v ? 'is-on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  )
}

function ImageField({ value, onChange, label }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const up = async (f) => {
    if (!f) return
    setBusy(true)
    try { onChange(await uploadMedia(f, 'pages')) } catch { toast.error('ההעלאה נכשלה') } finally { setBusy(false) }
  }
  return (
    <div className="pe-img">
      <span className="pe-label">{label}</span>
      <div className="pe-img__box" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); up(e.dataTransfer.files?.[0]) }}>
        {value ? <img src={value} alt="" /> : <span className="pe-muted">גררו תמונה לכאן</span>}
      </div>
      <div className="pe-img__acts">
        <button type="button" className="pe-btn pe-btn--soft" onClick={() => ref.current?.click()} disabled={busy}>{busy ? 'מעלה…' : value ? 'החלפה' : 'העלאה'}</button>
        {value ? <button type="button" className="pe-btn pe-btn--ghost" onClick={() => onChange('')}>הסרה</button> : null}
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => up(e.target.files?.[0])} />
      </div>
      <input className="pe-input" type="url" dir="ltr" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="או הדביקו קישור לתמונה" aria-label={`${label}: קישור`} />
    </div>
  )
}

function ItemsField({ items = [], onChange }) {
  const upd = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  return (
    <div className="pe-items">
      {items.map((it, i) => (
        <details key={i} className="pe-item" open={items.length <= 2}>
          <summary><span>{it.title || `פריט ${i + 1}`}</span></summary>
          <label className="pe-field"><span className="pe-label">כותרת</span><input className="pe-input" value={it.title || ''} onChange={(e) => upd(i, 'title', e.target.value)} /></label>
          <label className="pe-field"><span className="pe-label">טקסט</span><textarea className="pe-input" rows={3} value={it.text || ''} onChange={(e) => upd(i, 'text', e.target.value)} /></label>
          <ImageField label="תמונה" value={it.image} onChange={(v) => upd(i, 'image', v)} />
          <label className="pe-field"><span className="pe-label">טקסט הקישור</span><input className="pe-input" value={it.linkLabel || ''} onChange={(e) => upd(i, 'linkLabel', e.target.value)} /></label>
          <label className="pe-field"><span className="pe-label">קישור</span><input className="pe-input" dir="ltr" value={it.link || ''} onChange={(e) => upd(i, 'link', e.target.value)} placeholder="/contact" /></label>
          <div className="pe-item__acts">
            <button type="button" className="pe-btn pe-btn--ghost" disabled={i === 0} onClick={() => onChange(arrayMove(items, i, i - 1))}>למעלה</button>
            <button type="button" className="pe-btn pe-btn--ghost" disabled={i === items.length - 1} onClick={() => onChange(arrayMove(items, i, i + 1))}>למטה</button>
            <button type="button" className="pe-btn pe-btn--danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>הסרה</button>
          </div>
        </details>
      ))}
      <button type="button" className="pe-btn pe-btn--soft pe-btn--block" onClick={() => onChange([...items, { title: 'כותרת', text: 'טקסט קצר', image: '', link: '', linkLabel: '' }])}>הוספת פריט</button>
    </div>
  )
}

function ImagesField({ images = [], onChange }) {
  return (
    <div className="pe-items">
      <div className="pe-thumbs">
        {images.map((src, i) => (
          <div key={i} className="pe-thumb">
            <img src={src} alt="" />
            <button type="button" aria-label="הסרת התמונה" onClick={() => onChange(images.filter((_, j) => j !== i))}><UiIcon name="x" /></button>
          </div>
        ))}
      </div>
      <ImageField label="הוספת תמונה" value="" onChange={(v) => v && onChange([...images, v])} />
    </div>
  )
}

function SpaceChips({ value, onChange, label, inherited }) {
  return (
    <div className="pe-field">
      <span className="pe-label">{label}{value == null && inherited != null ? <em className="pe-inh"> · יורש {inherited}px</em> : null}</span>
      <div className="pe-chips" role="radiogroup" aria-label={label}>
        <button type="button" role="radio" aria-checked={value == null} className={value == null ? 'is-on' : ''} onClick={() => onChange(undefined)}>אוטומטי</button>
        {SPACE_SCALE.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'is-on' : ''} onClick={() => onChange(v)}>{v}</button>
        ))}
      </div>
    </div>
  )
}

/* תמונות של סקשן שנשמרות בהגדרות האתר (site_settings), למשל גלריית הביצוע. נשמר מיד ומופיע באתר,
   כמו בלשונית שמנהלת את אותן תמונות */
const FALLBACK_IMAGES = { execution: executionGallery }
function SettingImages({ cfg, onSaved }) {
  const [value, setValue] = useState(null)
  useEffect(() => {
    let on = true
    fetchSettings().then((st) => {
      let v = st && st[cfg.setting]
      if (typeof v === 'string') { try { v = JSON.parse(v) } catch { v = null } }
      if (on) setValue(Array.isArray(v) && v.length ? v : (FALLBACK_IMAGES[cfg.fallback] || []))
    }).catch(() => on && setValue(FALLBACK_IMAGES[cfg.fallback] || []))
    return () => { on = false }
  }, [cfg.setting, cfg.fallback])
  if (!value) return <p className="pe-muted">טוען את התמונות…</p>
  const save = (arr) => {
    setValue(arr)
    setSetting(cfg.setting, JSON.stringify(arr))
      .then(() => { toast.success('התמונות נשמרו ומופיעות באתר'); onSaved && onSaved() })
      .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
  }
  return (
    <div className="pe-field">
      <span className="pe-label">{cfg.label}</span>
      <ImageManager value={value} onChange={save} folder={cfg.folder || 'general'} max={cfg.max || 12} />
      <p className="pe-muted">העלאה, החלפה, הסרה וגרירה לסידור. השינוי נשמר מיד ומופיע באתר, בלי פרסום.</p>
    </div>
  )
}

/* תמונת פתיחה לסרטון שהועלה: פריים מתוך הקובץ עצמו, כדי שהמסך לא יהיה ריק עד שהסרטון נטען */
async function posterFrom(file) {
  const url = URL.createObjectURL(file)
  try {
    const v = document.createElement('video')
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
    await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = bad; setTimeout(bad, 15000) })
    v.currentTime = Math.min(0.6, (v.duration || 1) / 3)
    await new Promise((ok) => { v.onseeked = ok; setTimeout(ok, 4000) })
    const w = Math.min(720, v.videoWidth || 720)
    const h = Math.round(w * ((v.videoHeight || 405) / (v.videoWidth || 720)))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    c.getContext('2d').drawImage(v, 0, 0, w, h)
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.75))
    return blob ? new File([blob], 'poster.webp', { type: 'image/webp' }) : null
  } catch { return null } finally { URL.revokeObjectURL(url) }
}

/* "סרטונים מהשטח": רשימת הסרטונים והטקסטים של הכרטיס, נשמרים מיד בהגדרות האתר.
   אפשר להעלות כמה סרטונים יחד, להחליף, לשנות כיתוב, לסדר ולהסיר */
const SHOWCASE_TEXTS = [
  ['badge', 'תגית אדומה'], ['badgeWord', 'מילה ליד התגית'], ['title', 'כותרת'],
  ['text', 'פסקה', true], ['bold', 'סוף הפסקה בהדגשה'], ['note', 'שורת הדגשה'], ['ctaLabel', 'טקסט הכפתור'],
]
const MAX_SHOWCASE_MB = 40
const INTENSITIES = [['subtle', 'עדין'], ['balanced', 'מאוזן'], ['expressive', 'בולט']]
function SettingShowcase({ cfg, onSaved }) {
  const [val, setVal] = useState(null)
  const [busy, setBusy] = useState('')
  const fileRef = useRef(null)
  const replaceAt = useRef(-1)
  useEffect(() => {
    let on = true
    fetchSettings().then((st) => on && setVal(readExecutionShowcase(st && st[cfg.setting])))
      .catch(() => on && setVal(readExecutionShowcase(null)))
    return () => { on = false }
  }, [cfg.setting])
  if (!val) return <p className="pe-muted">טוען את הסרטונים…</p>
  const save = (next, msg = 'נשמר ומופיע באתר') => {
    setVal(next)
    return setSetting(cfg.setting, JSON.stringify(next))
      .then(() => { toast.success(msg); onSaved && onSaved() })
      .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
  }
  const setVideos = (videos, msg) => save({ ...val, videos }, msg)
  const upload = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const at = replaceAt.current
    replaceAt.current = -1
    const added = []
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      setBusy(`מעלה ${i + 1} מתוך ${list.length}…`)
      const isVid = f.type.startsWith('video/')
      /* האחסון באתר מוגבל: סרטון כבד מהטלפון ימלא אותו מהר. מעל 40 MB מבקשים קובץ קצר יותר */
      if (isVid && f.size > MAX_SHOWCASE_MB * 1024 * 1024) { toast.error(`${f.name}: ${Math.round(f.size / 1048576)} MB. צריך קובץ עד ${MAX_SHOWCASE_MB} MB, אפשר לקצר ל-10 שניות או לייצא ב-720p`); continue }
      try {
        const src = isVid ? await uploadVideoFile(f, `${cfg.folder}/videos`) : await uploadMedia(f, cfg.folder)
        let poster = ''
        if (isVid) { const p = await posterFrom(f); if (p) poster = await uploadMedia(p, cfg.folder, { compress: false }).catch(() => '') }
        added.push({ src, poster, label: '', type: isVid ? 'video' : 'image' })
      } catch (e) { toast.error(`${f.name}: ${e.message || e}`) }
    }
    setBusy('')
    if (!added.length) return
    const cur = val.videos.slice()
    if (at >= 0) cur.splice(at, 1, { ...added[0], label: cur[at].label })
    else cur.push(...added)
    setVideos(cur.slice(0, cfg.max || 16), at >= 0 ? 'הסרטון הוחלף ומופיע באתר' : `${added.length} נוספו ומופיעים באתר`)
  }
  const move = (i, d) => { const a = val.videos.slice(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setVideos(a, 'הסדר נשמר') }
  const remove = (i) => { if (val.videos.length <= 1) { toast.error('צריך להשאיר לפחות סרטון אחד'); return } setVideos(val.videos.filter((_, k) => k !== i), 'הוסר מהאתר') }
  const setLabel = (i, label) => setVal({ ...val, videos: val.videos.map((x, k) => (k === i ? { ...x, label } : x)) })
  const full = val.videos.length >= (cfg.max || 16)
  return (
    <div className="pe-field pe-show">
      <span className="pe-label">סרטונים ({val.videos.length})</span>
      <ul className="pe-show__list">
        {val.videos.map((v, i) => (
          <li key={`${v.src}-${i}`} className="pe-show__item">
            <span className="pe-show__thumb">
              {v.type === 'video' || (v.type !== 'image' && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(v.src))
                ? <video src={v.src} poster={v.poster || undefined} muted playsInline preload="metadata" />
                : <img src={v.src} alt="" />}
            </span>
            <input className="pe-input" value={v.label || ''} placeholder="כיתוב על המסך (לא חובה)" aria-label={`כיתוב לסרטון ${i + 1}`}
              onChange={(e) => setLabel(i, e.target.value)} onBlur={() => save(val, 'הכיתוב נשמר')} />
            <span className="pe-show__acts">
              <button type="button" className="pe-iconbtn" aria-label="הזזה למעלה" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="pe-iconbtn" aria-label="הזזה למטה" disabled={i === val.videos.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="pe-iconbtn" aria-label="החלפת הסרטון" onClick={() => { replaceAt.current = i; fileRef.current?.click() }}>⟳</button>
              <button type="button" className="pe-iconbtn pe-iconbtn--danger" aria-label="הסרה" onClick={() => remove(i)}>✕</button>
            </span>
          </li>
        ))}
      </ul>
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      <button type="button" className="pe-btn pe-btn--soft pe-btn--block" disabled={!!busy || full} onClick={() => { replaceAt.current = -1; fileRef.current?.click() }}>
        {busy || (full ? `הגעתם למקסימום (${cfg.max || 16})` : 'העלאת סרטונים')}
      </button>
      <p className="pe-muted">סרטון קצר (5 עד 10 שניות, עד 40 MB), בלי סאונד, עדיף לרוחב. הסרטונים מתחלקים לשתי שורות לפי הסדר: הראשון למעלה, השני למטה וכן הלאה.</p>

      <span className="pe-label">עוצמת התנועה</span>
      <Seg label="עוצמת התנועה" value={val.intensity} options={INTENSITIES} onChange={(v) => save({ ...val, intensity: v }, 'העוצמה נשמרה')} />

      {SHOWCASE_TEXTS.map(([k, label, multi]) => (
        <label key={k} className="pe-field">
          <span className="pe-label">{label}</span>
          {multi
            ? <textarea className="pe-input" rows={3} value={val[k] || ''} onChange={(e) => setVal({ ...val, [k]: e.target.value })} onBlur={() => save(val, 'הטקסט נשמר')} />
            : <input className="pe-input" value={val[k] || ''} onChange={(e) => setVal({ ...val, [k]: e.target.value })} onBlur={() => save(val, 'הטקסט נשמר')} />}
        </label>
      ))}
      <p className="pe-muted">כל שינוי נשמר מיד ומופיע באתר, בלי פרסום.</p>
    </div>
  )
}

function SettingsPanel({ s, device, setDevice, texts, overrides, foundKeys, onPatch, onText, onAct, onNavigate, W_, slug, onSettings }) {
  const W = W_(s.type) || {}
  const p = { ...(W.defaults || {}), ...(s.props || {}) }
  const setProp = (k, v) => onPatch((x) => ({ ...x, props: { ...(x.props || {}), [k]: v } }), { group: `prop:${s.id}:${k}` })
  const rsOwn = (k) => s.rs?.[device]?.[k]
  const setRs = (k, v) => onPatch((x) => {
    const rs = clone(x.rs || {})
    rs[device] = { ...(rs[device] || {}) }
    if (v == null) delete rs[device][k]; else rs[device][k] = v
    if (!Object.keys(rs[device]).length) delete rs[device]
    return { ...x, rs }
  })
  const devLabel = deviceOf(device).label
  const textFields = (W.texts || []).filter((f) => !foundKeys || !foundKeys.length || foundKeys.includes(f.key))

  return (
    <div className="pe-settings">
      <div className="pe-settings__head">
        <WIcon name={W.icon} />
        <div>
          <strong>{W.label || s.type}</strong>
          <span className="pe-muted">{W.basic ? 'רכיב בעורך' : W.local ? 'סקשן של העמוד הזה, באותו עיצוב' : 'סקשן קיים של האתר, באותו עיצוב'}</span>
        </div>
      </div>

      <Group title="תוכן">
        {W.basic && (W.fields || []).map((f) => {
          if (f.type === 'text') return <label key={f.key} className="pe-field"><span className="pe-label">{f.label}</span><input className="pe-input" value={p[f.key] || ''} onChange={(e) => setProp(f.key, e.target.value)} /></label>
          if (f.type === 'textarea') return <label key={f.key} className="pe-field"><span className="pe-label">{f.label}</span><textarea className="pe-input" rows={4} value={p[f.key] || ''} onChange={(e) => setProp(f.key, e.target.value)} /></label>
          if (f.type === 'select') return <div key={f.key} className="pe-field"><span className="pe-label">{f.label}</span><Seg label={f.label} value={p[f.key]} options={f.options} onChange={(v) => setProp(f.key, v)} /></div>
          if (f.type === 'toggle') return <label key={f.key} className="pe-switch"><input type="checkbox" checked={!!p[f.key]} onChange={(e) => setProp(f.key, e.target.checked)} /><span>{f.label}</span></label>
          if (f.type === 'image') return <ImageField key={f.key} label={f.label} value={p[f.key]} onChange={(v) => setProp(f.key, v)} />
          if (f.type === 'lines') return <label key={f.key} className="pe-field"><span className="pe-label">{f.label}</span><textarea className="pe-input" rows={5} value={(p[f.key] || []).join('\n')} onChange={(e) => setProp(f.key, e.target.value.split('\n'))} onBlur={(e) => setProp(f.key, e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></label>
          if (f.type === 'items') return <div key={f.key} className="pe-field"><span className="pe-label">{f.label}</span><ItemsField items={p[f.key]} onChange={(v) => setProp(f.key, v)} /></div>
          if (f.type === 'images') return <div key={f.key} className="pe-field"><span className="pe-label">{f.label}</span><ImagesField images={p[f.key]} onChange={(v) => setProp(f.key, v)} /></div>
          if (f.type === 'space') return <SpaceChips key={f.key} label={f.label} value={p[f.key]} onChange={(v) => setProp(f.key, v ?? 48)} />
          return null
        })}

        {!W.basic && textFields.map((f) => {
          const cur = texts[f.key] ?? overrides[f.key] ?? dictDefault(f.key)
          const changed = texts[f.key] != null
          return (
            <label key={f.key} className={`pe-field${changed ? ' is-changed' : ''}`}>
              <span className="pe-label">{f.label}{changed ? <em className="pe-inh"> · ישתנה בפרסום</em> : null}</span>
              {f.multiline
                ? <textarea className="pe-input" rows={3} value={cur} onChange={(e) => onText(f.key, e.target.value)} />
                : <input className="pe-input" value={cur} onChange={(e) => onText(f.key, e.target.value)} />}
            </label>
          )
        })}
        {!W.basic && W.texts?.length > 0 && <p className="pe-muted">אפשר גם לערוך בלחיצה כפולה על הטקסט בעמוד. הטקסט מתעדכן בכל מקום באתר שבו הוא מופיע.</p>}
        {W.images && (!W.images.only || W.images.only === slug) && <SettingImages cfg={W.images} onSaved={onSettings} />}
        {W.showcase && (!W.showcase.only || W.showcase.only === slug) && <SettingShowcase cfg={W.showcase} onSaved={onSettings} />}
        {W.manage && (!W.images || !W.images.only || W.images.only === slug) && (
          <button type="button" className="pe-btn pe-btn--soft pe-btn--block" onClick={() => onNavigate(W.manage.tab)}>
            ניהול התוכן בלשונית "{W.manage.label}"
          </button>
        )}
        {W.note && <p className="pe-muted">{W.note}</p>}
      </Group>

      {W.basic && (
        <Group title="עיצוב">
          <div className="pe-field"><span className="pe-label">רקע</span><Seg label="רקע" value={p.bg || 'paper'} options={BG} onChange={(v) => setProp('bg', v)} /></div>
        </Group>
      )}

      <Group title={`${devLabel}: ריווח ותצוגה`}>
        <div className="pe-devnote">
          <span>עורכים עכשיו את התצוגה ב{devLabel}</span>
          <Seg label="מכשיר" value={device} options={DEVICES.map((d) => [d.id, d.label])} onChange={setDevice} />
        </div>
        <SpaceChips label="ריווח עליון" value={rsOwn('pt')} inherited={effectiveRs(s, device, 'pt')} onChange={(v) => setRs('pt', v)} />
        <SpaceChips label="ריווח תחתון" value={rsOwn('pb')} inherited={effectiveRs(s, device, 'pb')} onChange={(v) => setRs('pb', v)} />
        {W.basic && 'align' in (W.defaults || {}) && (
          <div className="pe-field"><span className="pe-label">יישור</span>
            <Seg label="יישור" value={effectiveRs(s, device, 'align') || 'center'} options={[['start', 'ימין'], ['center', 'מרכז']]} onChange={(v) => (device === 'd' ? setProp('align', v) : setRs('align', v))} />
          </div>
        )}
        {s.type === 'heading' && (
          <div className="pe-field"><span className="pe-label">גודל כותרת</span>
            <Seg label="גודל כותרת" value={effectiveRs(s, device, 'size') || 'h2'} options={TYPE_SCALE.map((x) => [x.id, x.label])} onChange={(v) => (device === 'd' ? setProp('size', v) : setRs('size', v))} />
          </div>
        )}
        {W.basic && p.cols && (
          <div className="pe-field"><span className="pe-label">עמודות</span>
            <Seg label="עמודות" value={effectiveRs({ ...s, props: p }, device, 'cols')} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} onChange={(v) => (device === 'd' ? setProp('cols', v) : setRs('cols', v))} />
          </div>
        )}
        <label className="pe-switch"><input type="checkbox" checked={!!rsOwn('hide')} onChange={(e) => setRs('hide', e.target.checked || undefined)} /><span>הסתרה ב{devLabel}</span></label>
      </Group>

      <div className="pe-settings__foot">
        <button type="button" className="pe-btn pe-btn--ghost" onClick={() => onAct('dup')}><UiIcon name="dup" />שכפול</button>
        <button type="button" className="pe-btn pe-btn--ghost" onClick={() => onAct('hide')}><UiIcon name={s.hidden ? 'eye' : 'eyeOff'} />{s.hidden ? 'הצגה' : 'הסתרה'}</button>
        <button type="button" className="pe-btn pe-btn--danger" onClick={() => onAct('del')}><UiIcon name="trash" />מחיקה</button>
      </div>
    </div>
  )
}

function PageSettings({ layout, onSeo, seoOn }) {
  const seo = layout.seo || {}
  if (!seoOn) {
    return (
      <div className="pe-settings">
        <div className="pe-settings__head">
          <WIcon name="page" />
          <div><strong>הגדרות העמוד</strong><span className="pe-muted">בחרו סקשן בעמוד כדי לערוך אותו</span></div>
        </div>
        <p className="pe-muted">הכותרת והתיאור לגוגל של העמוד הזה נשארים כפי שהם בקוד, כדי לשמור על ה-SEO הקיים.</p>
      </div>
    )
  }
  return (
    <div className="pe-settings">
      <div className="pe-settings__head">
        <WIcon name="page" />
        <div><strong>הגדרות העמוד</strong><span className="pe-muted">בחרו סקשן בעמוד כדי לערוך אותו</span></div>
      </div>
      <Group title="גוגל ושיתוף">
        <label className="pe-field"><span className="pe-label">כותרת לגוגל <em className="pe-inh">· {(seo.title || '').length} / 60</em></span>
          <input className="pe-input" value={seo.title || ''} onChange={(e) => onSeo({ title: e.target.value })} placeholder="ריק: הכותרת הקיימת של העמוד" />
        </label>
        <label className="pe-field"><span className="pe-label">תיאור לגוגל <em className="pe-inh">· {(seo.description || '').length} / 160</em></span>
          <textarea className="pe-input" rows={4} value={seo.description || ''} onChange={(e) => onSeo({ description: e.target.value })} placeholder="ריק: התיאור הקיים של העמוד" />
        </label>
        <p className="pe-muted">שדה ריק שומר את מה שקיים היום. השאלות והתשובות בעמוד ממשיכות לייצר את הנתונים המובנים לגוגל.</p>
      </Group>
    </div>
  )
}

/* ---------- היסטוריית גרסאות ---------- */
function VersionsDrawer({ slug, onClose, onRestore }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { listVersions(slug).then(setRows).catch(() => setRows([])) }, [slug])
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="pe-drawer-wrap" onClick={onClose}>
      <aside className="pe-drawer" role="dialog" aria-modal="true" aria-label="היסטוריית גרסאות" onClick={(e) => e.stopPropagation()}>
        <header className="pe-drawer__head">
          <strong>היסטוריית גרסאות</strong>
          <button type="button" className="pe-icon-btn" onClick={onClose} aria-label="סגירה"><UiIcon name="x" /></button>
        </header>
        <p className="pe-muted">כל פרסום נשמר כאן ולא נמחק. שחזור מחזיר את הגרסה לטיוטה, ואז מפרסמים.</p>
        {rows == null && <p className="pe-muted">טוען…</p>}
        {rows && !rows.length && <p className="pe-empty-note">עוד אין גרסאות. הגרסה הראשונה תישמר בפרסום הראשון.</p>}
        <ol className="pe-versions">
          {(rows || []).map((v, i) => (
            <li key={v.id}>
              <div>
                <strong>גרסה {v.version}{i === 0 ? <span className="pe-chip pe-chip--live">באוויר</span> : null}</strong>
                <span className="pe-muted">{new Date(v.published_at).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })} · {(v.layout?.sections || []).length} סקשנים</span>
              </div>
              <button type="button" className="pe-btn pe-btn--soft" onClick={() => onRestore(v)}>שחזור</button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
