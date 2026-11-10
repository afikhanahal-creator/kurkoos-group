import { useEffect, useId, useRef, useState } from 'react'
import { iso, sayDate } from './DateRange.jsx'
import { Icon } from './ui.jsx'

// One date, picked from a calendar that looks the same in every browser and on every phone (the native control differs
// from one to the next and ignores the design). Type a date (5.11.26, 05/11/2026) or pick a day; Escape closes.
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const todayIso = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()) }
const parts = (s) => { const [y, m, d] = String(s).split('-').map(Number); return { y, m: m - 1, d } }
const shift = (s, days) => { const { y, m, d } = parts(s); const x = new Date(Date.UTC(y, m, d + days)); return iso(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) }
/* 5.11.26 · 05/11/2026 · 2026-11-05 → 2026-11-05 (day first, as dates are written here) */
export function readDate(text) {
  const t = String(text || '').trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  if (m) return valid(+m[1], +m[2] - 1, +m[3])
  m = /^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2}|\d{4})$/.exec(t)
  if (!m) return null
  return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1])
}
const valid = (y, m, d) => { const x = new Date(Date.UTC(y, m, d)); return x.getUTCFullYear() === y && x.getUTCMonth() === m && x.getUTCDate() === d && y > 1990 && y < 2100 ? iso(y, m, d) : null }

export default function DateField({ value, onChange, disabled, min, max, id, placeholder = 'בחירת תאריך', clearable = true, invalid, ...rest }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => { const p = parts(value || todayIso()); return { y: p.y, m: p.m } })
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)
  const [pos, setPos] = useState(null)
  const wrap = useRef(null); const grid = useRef(null); const trigger = useRef(null)
  const uid = useId()
  const t = todayIso()

  // the calendar floats over everything (a dialog's body would cut it): under the field, or above it when there is no room below
  const place = () => {
    const r = trigger.current?.getBoundingClientRect(); if (!r) return
    const H = 400; const below = window.innerHeight - r.bottom
    const top = below >= H || r.top < H ? Math.min(r.bottom + 6, Math.max(8, window.innerHeight - H - 8)) : r.top - H - 6
    const rtl = getComputedStyle(trigger.current).direction === 'rtl'
    setPos({ top, ...(rtl ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, r.left) }) })
  }
  const show = () => { if (disabled) return; const p = parts(value || t); setView({ y: p.y, m: p.m }); setText(''); setBad(false); place(); setOpen(true) }
  const close = (focus = true) => { setOpen(false); if (focus) trigger.current?.focus() }
  const pick = (s) => { if ((min && s < min) || (max && s > max)) return; onChange(s); close() }
  useEffect(() => {
    if (!open) return undefined
    const out = (e) => { if (!wrap.current?.contains(e.target)) close(false) }
    document.addEventListener('pointerdown', out, true)
    const away = (e) => { if (!wrap.current?.contains(e.target)) close(false) }
    window.addEventListener('scroll', away, true); window.addEventListener('resize', place)
    requestAnimationFrame(() => grid.current?.querySelector('[tabindex="0"]')?.focus())
    return () => { document.removeEventListener('pointerdown', out, true); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', place) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay()
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => iso(view.y, view.m, i + 1))]
  const focusDay = value && parts(value).y === view.y && parts(value).m === view.m ? value : (parts(t).y === view.y && parts(t).m === view.m ? t : iso(view.y, view.m, 1))
  const move = (n) => setView((v) => { const x = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: x.getUTCFullYear(), m: x.getUTCMonth() } })
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return }
    const cur = e.target?.dataset?.date
    if (!cur) return
    // right to left: the next day is to the left
    const step = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 7, ArrowUp: -7 }[e.key]
    if (!step) return
    e.preventDefault(); e.stopPropagation()
    const next = shift(cur, step); const p = parts(next)
    if (p.y !== view.y || p.m !== view.m) setView({ y: p.y, m: p.m })
    requestAnimationFrame(() => grid.current?.querySelector(`[data-date="${next}"]`)?.focus())
  }
  const typed = () => { const s = readDate(text); if (!s || (min && s < min) || (max && s > max)) { setBad(true); return } onChange(s); close() }

  return (
    <div className={`fin-date ${open ? 'is-open' : ''}`} ref={wrap} onKeyDown={open ? onKey : undefined}>
      <input type="hidden" value={value || ''} readOnly data-date-value />
      <button type="button" id={id} ref={trigger} className={`fin-date__btn ${value ? '' : 'is-empty'} ${invalid ? 'is-invalid' : ''}`} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : show())} {...rest}>
        <Icon name="calendar" size={16} />
        <span>{value ? sayDate(value).replace(/^(\d+ ב\S+)$/, `$1 ${parts(value).y}`) : placeholder}</span>
      </button>
      {open && (
        <div className="fin-date__pop" role="dialog" aria-label="בחירת תאריך" style={pos || undefined} onClick={(e) => e.preventDefault() /* inside a <label>: a click here must not press the field again */}>
          <div className="fin-date__head">
            <button type="button" className="fin-icon-btn" onClick={() => move(-1)} aria-label="החודש הקודם"><Icon name="chev" size={16} style={{ transform: 'rotate(-90deg)' }} /></button>
            <strong id={`${uid}-m`} aria-live="polite">{MONTHS[view.m]} {view.y}</strong>
            <button type="button" className="fin-icon-btn" onClick={() => move(1)} aria-label="החודש הבא"><Icon name="chev" size={16} style={{ transform: 'rotate(90deg)' }} /></button>
          </div>
          <div className="fin-date__grid" role="grid" aria-labelledby={`${uid}-m`} ref={grid}>
            {DAYS.map((d) => <span key={d} className="fin-date__dow" role="columnheader">{d}</span>)}
            {cells.map((s, i) => (s ? (
              <button key={s} type="button" data-date={s} tabIndex={s === focusDay ? 0 : -1} disabled={(min && s < min) || (max && s > max)}
                className={`fin-date__day ${s === value ? 'is-on' : ''} ${s === t ? 'is-today' : ''}`} aria-pressed={s === value} aria-label={sayDate(s)} onClick={() => pick(s)}>{parts(s).d}</button>
            ) : <span key={`e${i}`} aria-hidden="true" />))}
          </div>
          <div className="fin-date__type">
            <input value={text} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); typed() } }} onChange={(e) => { setText(e.target.value); setBad(false) }} placeholder="או להקליד: 5.11.26" inputMode="numeric" dir="ltr" aria-label="הקלדת תאריך" aria-invalid={bad} />
            {bad && <small role="alert">תאריך לא תקין</small>}
          </div>
          <div className="fin-date__foot">
            <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => pick(t)} disabled={(min && t < min) || (max && t > max)}>היום</button>
            {clearable && value && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => { onChange(''); close() }}>ניקוי</button>}
          </div>
        </div>
      )}
    </div>
  )
}
