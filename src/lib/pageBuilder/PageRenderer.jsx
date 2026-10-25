import { useEffect, useRef } from 'react'
import { WIDGETS } from './widgets.jsx'
import { sectionCss, EDIT_MODE, PREVIEW_MODE, useDraftStore, setDraftState, usePageLayout } from './layout.js'
import { useI18n } from '../../i18n/index.jsx'

/* ============================================================
   מצייר עמוד מתוך רשימת הסקשנים. אותו רנדרר משמש את האתר, את
   העורך ואת התצוגה המקדימה, כך שמה שרואים בעורך הוא מה שיעלה.
   ============================================================ */

/* local: הסקשנים של העמוד עצמו, { id: Component }. כל אחד מקבל ctx,
   הנתונים שהעמוד חישב פעם אחת (הגדרות, נתוני CMS, refs), כך שהפיצול
   לסקשנים לא משנה שום דבר ממה שהעמוד מציג. */
export default function PageRenderer({ layout, local = {}, ctx = {}, meta = {} }) {
  const sections = Array.isArray(layout.sections) ? layout.sections : []
  const css = sections.map((s) => sectionCss(s)).filter(Boolean).join('\n')
  return (
    <>
      {css ? <style data-pb-css="">{css}</style> : null}
      {sections.map((s) => {
        if (s.hidden && !EDIT_MODE) return null
        let body = null
        if (s.type.startsWith('l:')) {
          const L = local[s.type.slice(2)]
          if (!L) return null
          body = <L ctx={ctx} />
        } else {
          const W = WIDGETS[s.type]
          if (!W) return null
          const C = W.C
          body = W.basic ? <C id={s.id} props={{ ...(W.defaults || {}), ...(s.props || {}) }} /> : <C />
        }
        return (
          <div className={`pb-sec${s.hidden ? ' pb-hidden-preview' : ''}`} data-pb={s.id} key={s.id}>{body}</div>
        )
      })}
      {EDIT_MODE ? <EditBridge sections={sections} meta={meta} /> : null}
      {PREVIEW_MODE ? <div className="kc-preview-bar" role="status">תצוגה מקדימה של הטיוטה</div> : null}
    </>
  )
}

/* עמוד שלם מתוך ההגדרה שלו (defs/<page>.js) והגרסה המפורסמת בעורך */
export function PageSections({ def, slug, local, ctx }) {
  const { layout } = usePageLayout(slug || def.route, def)
  return <PageRenderer layout={layout} local={local} ctx={ctx} meta={localMeta(def)} />
}

/* תוויות וטקסטים של הסקשנים המקומיים, לסרגל ולזיהוי הטקסטים בעורך */
export function localMeta(def) {
  const out = {}
  for (const x of def?.sections || []) {
    if (!Array.isArray(x)) continue
    const [id, label, icon, texts, extra] = x
    out[`l:${id}`] = { label, icon, texts: (texts || []).map((t) => (typeof t === 'string' ? { key: t, label: t } : t)), ...(extra || {}) }
  }
  return out
}

/* ---------- הגשר בתוך ה-iframe של העורך ---------- */
const post = (msg) => { try { window.parent.postMessage({ kc: 1, ...msg }, window.location.origin) } catch { /* noop */ } }

const ICONS = {
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  hide: '<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.2-.9"/>',
  del: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
}
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`

function EditBridge({ sections, meta }) {
  const metaRef = useRef(meta)
  metaRef.current = meta
  const W_ = (type) => WIDGETS[type] || metaRef.current[type]
  const store = useDraftStore()
  const { t } = useI18n()
  const tagRef = useRef(null)
  const lineRef = useRef(null)
  const secRef = useRef(sections)
  secRef.current = sections

  /* חיבור: הודעות מהעורך, לחיצות, לחיצה כפולה לעריכה וגרירה מהספרייה */
  useEffect(() => {
    document.documentElement.classList.add('kc-edit')
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || !e.data || !e.data.kc) return
      const d = e.data
      if (d.type === 'state') {
        setDraftState({ layout: d.layout, texts: d.layout.texts || {}, selected: d.selected })
      }
      if (d.type === 'scrollTo') {
        const el = document.querySelector(`[data-pb="${d.id}"] > *`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    window.addEventListener('message', onMsg)

    const secOf = (el) => el && el.closest && el.closest('.pb-sec')
    const onClick = (e) => {
      if (e.target.closest('.kc-tag')) return
      if (e.target.closest('[contenteditable]')) return
      e.preventDefault(); e.stopPropagation()
      const sec = secOf(e.target)
      post({ type: 'select', id: sec ? sec.dataset.pb : null })
    }
    const onSubmit = (e) => { e.preventDefault(); e.stopPropagation() }

    const startEdit = (el, done) => {
      if (el.isContentEditable) return
      const before = el.innerText
      el.setAttribute('contenteditable', 'plaintext-only')
      el.focus()
      const r = document.createRange(); r.selectNodeContents(el)
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
      const finish = (save) => {
        el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onKey)
        el.removeAttribute('contenteditable')
        const v = el.innerText.replace(/ /g, ' ').replace(/\n+$/, '')
        if (!save) { el.innerText = before; return }
        if (v !== before) done(v)
      }
      const onBlur = () => finish(true)
      const onKey = (k) => {
        if (k.key === 'Escape') { k.preventDefault(); finish(false); el.blur() }
        if (k.key === 'Enter' && !k.shiftKey) { k.preventDefault(); el.blur() }
      }
      el.addEventListener('blur', onBlur); el.addEventListener('keydown', onKey)
    }
    const onDbl = (e) => {
      const f = e.target.closest('[data-pbf]')
      const sec = secOf(e.target)
      if (f && sec) { e.preventDefault(); startEdit(f, (v) => post({ type: 'field', id: sec.dataset.pb, field: f.dataset.pbf, value: v })); return }
      const k = e.target.closest('[data-kc-key]')
      if (k) { e.preventDefault(); startEdit(k, (v) => post({ type: 'text', key: k.dataset.kcKey, value: v })) }
    }

    /* גרירה מספריית הרכיבים אל העמוד: קו מראה איפה הרכיב ייכנס */
    const indexAt = (y) => {
      const els = [...document.querySelectorAll('.pb-sec')].map((n) => n.firstElementChild).filter(Boolean)
      let i = 0
      for (; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (y < r.top + r.height / 2) break }
      const ref = els[i] ? els[i].getBoundingClientRect().top : (els.length ? els[els.length - 1].getBoundingClientRect().bottom : 0)
      return { i, top: ref + window.scrollY }
    }
    const isOurs = (e) => [...(e.dataTransfer?.types || [])].includes('text/kc-widget') || [...(e.dataTransfer?.types || [])].includes('text/plain')
    const onOver = (e) => {
      if (!isOurs(e)) return
      e.preventDefault()
      const { top } = indexAt(e.clientY)
      let ln = lineRef.current
      if (!ln) { ln = document.createElement('div'); ln.className = 'kc-drop-line'; document.body.appendChild(ln); lineRef.current = ln }
      ln.style.top = `${top - 2}px`
      ln.style.display = 'block'
    }
    const hideLine = () => { if (lineRef.current) lineRef.current.style.display = 'none' }
    const onDrop = (e) => {
      if (!isOurs(e)) return
      e.preventDefault()
      const raw = e.dataTransfer.getData('text/kc-widget') || e.dataTransfer.getData('text/plain') || ''
      const type = raw.replace(/^kc-widget:/, '')
      hideLine()
      if (type) post({ type: 'drop', widget: type, index: indexAt(e.clientY).i })
    }
    const onKeyDoc = (e) => {
      if (e.target.isContentEditable) return
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) { e.preventDefault(); post({ type: 'key', key: e.key.toLowerCase(), shift: e.shiftKey }) }
      if (e.key === 'Delete') post({ type: 'key', key: 'delete' })
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('dblclick', onDbl, true)
    document.addEventListener('dragover', onOver)
    document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) hideLine() })
    document.addEventListener('drop', onDrop)
    document.addEventListener('keydown', onKeyDoc)
    post({ type: 'ready' })
    return () => {
      window.removeEventListener('message', onMsg)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('dblclick', onDbl, true)
      document.removeEventListener('dragover', onOver)
      document.removeEventListener('drop', onDrop)
      document.removeEventListener('keydown', onKeyDoc)
    }
  }, [])

  /* סימון טקסטים של סקשנים קיימים: האלמנט שהטקסט שלו זהה לערך בכותרות האתר */
  useEffect(() => {
    const id = setTimeout(() => {
      const found = {}
      for (const s of secRef.current) {
        const W = W_(s.type)
        if (!W || !W.texts || !W.texts.length) continue
        const root = document.querySelector(`[data-pb="${s.id}"]`)
        if (!root) continue
        const keys = []
        for (const f of W.texts) {
          const val = String(t(f.key) || '').trim()
          if (!val || val === f.key) continue
          let el = root.querySelector(`[data-kc-key="${f.key}"]`)
          if (!el || el.innerText.trim() !== val) {
            el = null
            const all = root.querySelectorAll('h1,h2,h3,h4,p,span,a,button,strong,em,div')
            for (const n of all) {
              if (n.closest('.kc-tag')) continue
              if (n.textContent.trim() === val && ![...n.children].some((c) => c.textContent.trim() === val)) { el = n; break }
            }
            if (el) el.setAttribute('data-kc-key', f.key)
          }
          if (el) keys.push(f.key)
        }
        found[s.id] = keys
      }
      post({ type: 'keys', found })
    }, 400)
    return () => clearTimeout(id)
  }, [store.v, t])

  /* סרגל קטן מעל הסקשן הנבחר: הזזה, שכפול, הסתרה ומחיקה */
  useEffect(() => {
    let tag = tagRef.current
    const sel = store.selected
    const el = sel && document.querySelector(`[data-pb="${sel}"] > *`)
    document.querySelectorAll('.pb-sec.is-selected').forEach((n) => n.classList.remove('is-selected'))
    if (!el) { if (tag) tag.style.display = 'none'; return undefined }
    el.parentElement.classList.add('is-selected')
    if (!tag) {
      tag = document.createElement('div'); tag.className = 'kc-tag'; document.body.appendChild(tag); tagRef.current = tag
      tag.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-act]')
        if (!b) return
        e.preventDefault(); e.stopPropagation()
        post({ type: 'action', id: tag.dataset.id, action: b.dataset.act })
      })
    }
    const s = secRef.current.find((x) => x.id === sel)
    const label = (s && W_(s.type)?.label) || ''
    tag.dataset.id = sel
    tag.innerHTML = `<span>${label.replace(/</g, '&lt;')}</span>` +
      [['up', 'למעלה'], ['down', 'למטה'], ['dup', 'שכפול'], ['hide', s && s.hidden ? 'הצגה' : 'הסתרה'], ['del', 'מחיקה']]
        .map(([k, l]) => `<button type="button" data-act="${k}" title="${l}" aria-label="${l}">${svg(k)}</button>`).join('')
    const place = () => {
      const r = el.getBoundingClientRect()
      tag.style.display = 'flex'
      tag.style.top = `${Math.max(window.scrollY + 6, r.top + window.scrollY + 8)}px`
      tag.style.left = `${r.left + window.scrollX + 8}px`
    }
    place()
    window.addEventListener('scroll', place, { passive: true })
    window.addEventListener('resize', place)
    const ro = new ResizeObserver(place); ro.observe(el)
    return () => { window.removeEventListener('scroll', place); window.removeEventListener('resize', place); ro.disconnect() }
  }, [store.selected, store.v])

  return null
}
