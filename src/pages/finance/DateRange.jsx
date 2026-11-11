// Date range picker: two months side by side (one on a phone, as a bottom sheet), Sunday first, right to left.
// First tap sets the start, second tap the end; the range is shaded and previewed while hovering. Quick ranges on top,
// "החל" applies, "ניקוי" clears. Keyboard: arrows move a day/week, PageUp/PageDown a month, Enter picks, Escape closes.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeNear, popRoot } from './Select.jsx'
import { Icon } from './ui.jsx'

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const pad = (n) => String(n).padStart(2, '0')
export const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return { y, m: m - 1, d } }
const today = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()) }
const addDays = (s, n) => { const { y, m, d } = parse(s); const t = new Date(Date.UTC(y, m, d + n)); return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) }
const addMonths = (ym, n) => { const t = new Date(Date.UTC(ym.y, ym.m + n, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() } }
const lastDay = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
export const sayDate = (s) => { if (!s) return ''; const { y, m, d } = parse(s); return `${d} ב${MONTHS[m]}${y !== new Date().getFullYear() ? ` ${y}` : ''}` }
export const sayRange = (from, to) => (from && to ? (from === to ? sayDate(from) : `${sayDate(from)} – ${sayDate(to)}`) : from ? `מ-${sayDate(from)}` : to ? `עד ${sayDate(to)}` : '')

function presets() {
  const t = today(); const { y, m } = parse(t)
  const prev = addMonths({ y, m }, -1)
  const q = Math.floor(m / 3) * 3
  return [
    ['החודש', iso(y, m, 1), t],
    ['החודש שעבר', iso(prev.y, prev.m, 1), iso(prev.y, prev.m, lastDay(prev.y, prev.m))],
    ['הרבעון', iso(y, q, 1), t],
    ['30 יום', addDays(t, -29), t],
    ['השנה', iso(y, 0, 1), t],
  ]
}

function Month({ ym, from, to, hover, focus, onPick, onHover, monthLabelId }) {
  const first = new Date(Date.UTC(ym.y, ym.m, 1)).getUTCDay()
  const n = lastDay(ym.y, ym.m)
  const end = to || (from && hover && hover >= from ? hover : null)
  const cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)]
  const t = today()
  return (
    <div className="fin-cal__month">
      <div className="fin-cal__mname" id={monthLabelId}>{MONTHS[ym.m]} {ym.y}</div>
      <div className="fin-cal__grid" role="grid" aria-labelledby={monthLabelId}>
        {DAYS.map((d) => <span key={d} className="fin-cal__dow" role="columnheader" aria-label={d}>{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} className="fin-cal__empty" aria-hidden="true" />
          const s = iso(ym.y, ym.m, d)
          const isStart = s === from; const isEnd = s === end
          const inside = from && end && s > from && s < end
          const cls = ['fin-cal__day', isStart && 'is-start', isEnd && 'is-end', inside && 'is-in', s === t && 'is-today', isStart && isEnd && 'is-single', i % 7 === 0 && 'is-rowstart', i % 7 === 6 && 'is-rowend', d === 1 && 'is-mstart', d === n && 'is-mend'].filter(Boolean).join(' ')
          return (
            <button key={s} type="button" data-date={s} className={cls} tabIndex={s === focus ? 0 : -1} aria-pressed={isStart || isEnd || !!inside} aria-label={sayDate(s)}
              onClick={() => onPick(s)} onPointerEnter={() => onHover(s)}><span>{d}</span></button>
          )
        })}
      </div>
    </div>
  )
}

export default function DateRange({ from, to, onChange, label = 'תאריך', by, onBy, byOptions }) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [pos, setPos] = useState(null)
  const [a, setA] = useState(from || '')
  const [b, setB] = useState(to || '')
  const [hover, setHover] = useState('')
  const [view, setView] = useState(() => { const s = parse(to || from || today()); return addMonths({ y: s.y, m: s.m }, to || from ? 0 : -1) })
  const [focus, setFocus] = useState(from || today())
  const btn = useRef(null)
  const pop = useRef(null)
  const months = sheet ? 1 : 2
  const shown = useMemo(() => Array.from({ length: months }, (_, i) => addMonths(view, i)), [view, months])

  const show = () => {
    const phone = window.matchMedia('(max-width: 700px)').matches
    setSheet(phone); setA(from || ''); setB(to || ''); setHover('')
    const s = parse(to || from || today())
    // desktop shows two months: the start month and the one after it, or last month and this month when empty
    const base = from ? parse(from) : s
    setView(phone ? { y: base.y, m: base.m } : from ? { y: base.y, m: base.m } : addMonths({ y: base.y, m: base.m }, -1))
    setFocus(from || today())
    if (!phone && btn.current) setPos(placeNear(btn.current, { minWidth: 640, maxHeight: 560 }))
    setOpen(true)
  }
  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus({ preventScroll: true }) }
  const pick = (s) => {
    setFocus(s)
    if (!a || (a && b)) { setA(s); setB('') }
    else if (s < a) { setA(s); setB('') }
    else setB(s)
  }
  const apply = () => { onChange(a || '', b || a || ''); close() }
  const clear = () => { setA(''); setB(''); onChange('', ''); close() }

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => pop.current?.querySelector('.fin-cal__day[tabindex="0"]')?.focus({ preventScroll: true }), 0)
    const away = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) close(false) }
    const move = () => { if (!sheet && btn.current) setPos(placeNear(btn.current, { minWidth: 640, maxHeight: 560 })) }
    document.addEventListener('pointerdown', away, true)
    window.addEventListener('resize', move); window.addEventListener('scroll', move, true)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', away, true); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // keep the focused day visible and focused while moving with the keyboard
  useEffect(() => {
    if (!open) return
    const f = parse(focus)
    const firstM = shown[0]; const lastM = shown[shown.length - 1]
    if (f.y * 12 + f.m < firstM.y * 12 + firstM.m) setView({ y: f.y, m: f.m })
    else if (f.y * 12 + f.m > lastM.y * 12 + lastM.m) setView(addMonths({ y: f.y, m: f.m }, -(months - 1)))
    setTimeout(() => pop.current?.querySelector(`[data-date="${focus}"]`)?.focus({ preventScroll: true }), 0)
  }, [focus]) // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e) => {
    const k = e.key
    // right to left: the right arrow moves to the previous day
    const step = { ArrowRight: -1, ArrowLeft: 1, ArrowUp: -7, ArrowDown: 7 }[k]
    if (step && e.target.dataset?.date) { e.preventDefault(); setFocus(addDays(focus, step)); setHover(addDays(focus, step)) }
    else if ((k === 'PageUp' || k === 'PageDown') && e.target.dataset?.date) { e.preventDefault(); const f = parse(focus); const t = addMonths({ y: f.y, m: f.m }, k === 'PageUp' ? -1 : 1); setFocus(iso(t.y, t.m, Math.min(f.d, lastDay(t.y, t.m)))) }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
  }

  const value = sayRange(from, to)
  const draft = a ? `${sayDate(a)} – ${b ? sayDate(b) : '?'}` : 'בחרו תאריך התחלה'
  const panel = (
    <div ref={pop} className={`fin-pop fin-cal ${sheet ? 'is-sheet' : ''}`} style={sheet ? undefined : pos || { visibility: 'hidden' }} role="dialog" aria-modal="false" aria-label={`בחירת ${label}`} onKeyDown={onKey}>
      {sheet && <span className="fin-sheet__grip" aria-hidden="true" />}
      <header className="fin-cal__head">
        <small>{label}</small>
        <strong aria-live="polite">{draft}</strong>
        {byOptions && (
          <div className="fin-seg fin-cal__by" role="group" aria-label="לפי איזה תאריך">
            {byOptions.map(([k, v]) => <button key={k} type="button" className={by === k ? 'is-on' : ''} aria-pressed={by === k} onClick={() => onBy(k)}>{v}</button>)}
          </div>
        )}
      </header>
      <div className="fin-cal__presets" role="group" aria-label="טווחים מהירים">
        {presets().map(([n, s, e2]) => <button key={n} type="button" className={`fin-cal__preset ${a === s && b === e2 ? 'is-on' : ''}`} onClick={() => { setA(s); setB(e2); const p = parse(e2); setView(addMonths({ y: p.y, m: p.m }, -(months - 1))); setFocus(e2) }}>{n}</button>)}
      </div>
      <div className="fin-cal__nav">
        <button type="button" className="fin-icon-btn" onClick={() => setView((v) => addMonths(v, -1))} aria-label="החודש הקודם"><Icon name="back" size={18} /></button>
        <button type="button" className="fin-icon-btn" onClick={() => setView((v) => addMonths(v, 1))} aria-label="החודש הבא"><Icon name="next" size={18} /></button>
      </div>
      <div className="fin-cal__months" onPointerLeave={() => setHover('')}>
        {/* in RTL the earlier month sits on the right, like reading order */}
        {shown.map((ym) => <Month key={`${ym.y}-${ym.m}`} ym={ym} from={a} to={b} hover={hover} focus={focus} onPick={pick} onHover={setHover} monthLabelId={`fin-cal-${ym.y}-${ym.m}`} />)}
      </div>
      <footer className="fin-cal__foot">
        <button type="button" className="fin-btn fin-btn--primary fin-cal__apply" onClick={apply} disabled={!a}>החל</button>
        <button type="button" className="fin-btn fin-btn--ghost" onClick={clear}>ניקוי</button>
      </footer>
    </div>
  )

  return (
    <>
      <span className={`fin-datechip ${value ? 'is-on' : ''}`}>
        <button ref={btn} type="button" className="fin-datechip__main" onClick={() => (open ? close() : show())} aria-haspopup="dialog" aria-expanded={open} aria-label={value ? `${label}: ${value}` : `סינון לפי ${label}`}>
          <Icon name="calendar" size={17} />
          <span>{value || label}</span>
        </button>
        {value && <button type="button" className="fin-datechip__x" aria-label="ניקוי התאריכים" onClick={() => onChange('', '')}><Icon name="x" size={14} /></button>}
      </span>
      {open && createPortal(<>{sheet && <button type="button" className="fin-sheet__scrim" aria-label="סגירה" tabIndex={-1} onClick={() => close()} />}{panel}</>, popRoot())}
    </>
  )
}
