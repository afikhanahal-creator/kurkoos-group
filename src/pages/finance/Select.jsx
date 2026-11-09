// One dropdown for the whole app. It takes the same props and <option> children as a native <select>, so a screen
// swaps <select> for <Select> without other changes.
//
// The native <select> stays in the DOM, invisible over the trigger: it keeps the label association, form validation,
// screen-reader semantics and keyboard focus. Mouse and touch open our own list (searchable, RTL-aligned, kept inside
// the viewport); on phones it opens as a bottom sheet. Keyboard: arrows/Enter/Space open it, arrows move, Enter picks,
// Escape closes, typing searches.
import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf(node.props.children)
  return ''
}
function optionsOf(children, out = []) {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    if (c.type === Fragment) { optionsOf(c.props.children, out); return }
    if (c.type === 'option') {
      const label = textOf(c.props.children)
      out.push({ value: c.props.value !== undefined ? String(c.props.value) : label, label, disabled: !!c.props.disabled })
    }
  })
  return out
}
const norm = (s) => s.toLowerCase().replace(/["'״׳.,\-\s]/g, '')
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches
export const popRoot = () => document.querySelector('.fin') || document.body

/* positions a floating panel next to an anchor: right-aligned (RTL), flipped up when there is no room below,
   always inside the viewport. Returns style for position:fixed. */
export function placeNear(anchor, { minWidth = 220, maxHeight = 360, gap = 6 } = {}) {
  const r = anchor.getBoundingClientRect()
  const vw = window.innerWidth; const vh = window.innerHeight
  const width = Math.min(Math.max(r.width, minWidth), vw - 16)
  let right = vw - r.right
  if (vw - right - width < 8) right = Math.max(8, vw - width - 8)
  if (right < 8) right = 8
  const below = vh - r.bottom - gap - 8; const above = r.top - gap - 8
  const up = below < Math.min(maxHeight, 240) && above > below
  const h = Math.max(120, Math.min(maxHeight, up ? above : below))
  return up ? { right, width, bottom: vh - r.top + gap, maxHeight: h } : { right, width, top: r.bottom + gap, maxHeight: h }
}

export default function Select({ children, className = '', value, defaultValue, onChange, onBlur, disabled, autoFocus, placeholder, searchable, ...rest }) {
  const options = useMemo(() => optionsOf(children), [children])
  const native = useRef(null)
  const btn = useRef(null)
  const panel = useRef(null)
  const search = useRef(null)
  const listId = useId()
  const [inner, setInner] = useState(defaultValue !== undefined ? String(defaultValue) : undefined)
  const current = value !== undefined && value !== null ? String(value) : inner !== undefined ? inner : options[0]?.value
  const selected = options.find((o) => o.value === current)
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(-1)
  const [pos, setPos] = useState(null)
  const withSearch = searchable ?? options.length > 7
  // every word of the query must appear, in any order ("ביצוע קורקוס" finds "קורקוס ביצוע")
  const shown = useMemo(() => {
    const words = q.trim().split(/\s+/).map(norm).filter(Boolean)
    return words.length ? options.filter((o) => { const l = norm(o.label); return words.every((w) => l.includes(w)) }) : options
  }, [options, q])

  const place = useCallback(() => { if (btn.current && !isPhone()) setPos(placeNear(btn.current, { minWidth: 240 })) }, [])
  const show = () => {
    if (disabled) return
    setSheet(isPhone()); setQ(''); place()
    setActive(Math.max(0, options.findIndex((o) => o.value === current)))
    setOpen(true)
  }
  const hide = (refocus = true) => {
    setOpen(false)
    if (refocus) native.current?.focus({ preventScroll: true })
  }
  const pick = (o) => {
    if (!o || o.disabled) return
    const el = native.current
    if (el) el.value = o.value
    if (value === undefined) setInner(o.value)
    if (o.value !== current) onChange?.({ target: el, currentTarget: el, type: 'change', preventDefault() {}, stopPropagation() {} })
    hide()
  }

  useLayoutEffect(() => { if (open) place() }, [open, place])
  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => (withSearch ? search.current : panel.current)?.focus({ preventScroll: true }), 0)
    const away = (e) => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) { hide(false); onBlur?.(e) } }
    const move = () => place()
    document.addEventListener('pointerdown', away, true)
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', away, true); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active >= shown.length) setActive(shown.length ? 0 : -1) }, [shown, active])
  useEffect(() => { panel.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active, open])
  useEffect(() => { if (autoFocus && !isPhone()) show() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const step = (d) => {
    if (!shown.length) return
    let i = active
    for (let n = 0; n < shown.length; n++) { i = (i + d + shown.length) % shown.length; if (!shown[i].disabled) break }
    setActive(i)
  }
  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide() }
    else if (e.key === 'Tab') hide(false)
    else if (!withSearch && e.key.length === 1) {
      const i = shown.findIndex((o) => norm(o.label).startsWith(norm(e.key)))
      if (i >= 0) setActive(i)
    }
  }
  const onNativeKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) || (e.key === 'F4')) { e.preventDefault(); show() }
  }

  const list = (
    <div
      ref={panel}
      className={`fin-pop fin-sel__pop ${sheet ? 'is-sheet' : ''}`}
      style={sheet ? undefined : pos || { visibility: 'hidden' }}
      onKeyDown={onListKey}
      tabIndex={-1}
      role="presentation"
    >
      {sheet && <div className="fin-sheet__grip" aria-hidden="true" />}
      {sheet && <div className="fin-sheet__title">{rest['aria-label'] || native.current?.labels?.[0]?.querySelector('.fin-field__label')?.textContent || 'בחירה'}</div>}
      {withSearch && (
        <div className="fin-sel__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={search} value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} placeholder="חיפוש" aria-label="חיפוש ברשימה" aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} role="combobox" aria-expanded="true" />
        </div>
      )}
      <ul id={listId} role="listbox" className="fin-sel__list" aria-activedescendant={!withSearch && active >= 0 ? `${listId}-${active}` : undefined}>
        {shown.map((o, i) => (
          <li
            key={`${o.value}-${i}`}
            id={`${listId}-${i}`}
            data-i={i}
            role="option"
            aria-selected={o.value === current}
            aria-disabled={o.disabled || undefined}
            className={`fin-sel__opt ${i === active ? 'is-active' : ''} ${o.value === current ? 'is-on' : ''} ${o.disabled ? 'is-off' : ''}`}
            onPointerEnter={() => setActive(i)}
            onClick={() => pick(o)}
          >
            <span>{o.label || '—'}</span>
            {o.value === current && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
          </li>
        ))}
        {!shown.length && <li className="fin-sel__empty" role="presentation">{options.length ? 'אין תוצאות' : 'אין אפשרויות לבחירה'}</li>}
      </ul>
    </div>
  )

  return (
    <span className={`fin-sel ${className} ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <select
        ref={native}
        className="fin-sel__native"
        value={value !== undefined ? (value ?? '') : undefined}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(e) => { if (value === undefined) setInner(e.target.value); onChange?.(e) }}
        onKeyDown={onNativeKey}
        onMouseDown={(e) => { e.preventDefault(); show() }}
        onBlur={(e) => { if (!open && !panel.current) onBlur?.(e) }}
        disabled={disabled}
        {...rest}
      >
        {children}
      </select>
      <button ref={btn} type="button" className="fin-sel__btn" tabIndex={-1} aria-hidden="true" disabled={disabled} onClick={() => (open ? hide() : show())}>
        <span className={`fin-sel__value ${selected ? '' : 'is-ph'}`}>{selected?.label || placeholder || '—'}</span>
        <svg className="fin-sel__chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </button>
      {open && createPortal(<>{sheet && <button type="button" className="fin-sheet__scrim" aria-label="סגירה" tabIndex={-1} onClick={() => hide()} />}{list}</>, popRoot())}
    </span>
  )
}
