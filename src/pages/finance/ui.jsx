import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeNear, popRoot } from './Select.jsx'
import { STATUS, money } from './format.js'
import { uploadFile } from './api.js'

const P = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  docs: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  inbox: <><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  company: <><path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11" /><path d="M8 8h3M8 12h3M8 16h3" /></>,
  project: <><path d="M3 20h18M6 20V9l6-5 6 5v11" /><path d="M10 20v-5h4v5" /></>,
  suppliers: <><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5" /><circle cx="7" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  data: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  rules: <><path d="M4 6h10M4 12h6M4 18h10" /><circle cx="17" cy="6" r="2" /><circle cx="13" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  agents: <><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  plug: <><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l4 2" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  back: <path d="M9 6l6 6-6 6" />,
  next: <path d="M15 6l-6 6 6 6" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  upload: <><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 21h14" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  camera: <><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="4" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12l5 5L20 7" />,
  x: <path d="M7 7l10 10M17 7 7 17" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  sync: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  alert: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  sort: <path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" />,
  play: <path d="M7 4v16l13-8z" />,
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></>,
  cloud: <path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>,
  rows: <path d="M4 6h16M4 12h16M4 18h16" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
  webhook: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  minus: <path d="M5 12h14" />,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
}

export function Icon({ name, size = 20, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {P[name] || null}
    </svg>
  )
}

export function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, tone: 'muted' }
  return <span className={`fin-pill fin-pill--${s.tone}`}>{s.label}</span>
}
export function Pill({ tone = 'muted', children }) { return <span className={`fin-pill fin-pill--${tone}`}>{children}</span> }

export function Confidence({ value }) {
  if (value === null || value === undefined) return <span className="fin-muted">—</span>
  const pct = Math.round(Number(value) * 100)
  const tone = pct >= 90 ? 'ok' : pct >= 70 ? 'warn' : 'bad'
  return <span className={`fin-conf fin-conf--${tone}`} title={`ודאות ${pct}%`}><span style={{ width: `${pct}%` }} />{pct}%</span>
}

export function Kpi({ label, value, hint, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} className={`fin-kpi ${tone ? `fin-kpi--${tone}` : ''} ${onClick ? 'fin-kpi--link' : ''}`} onClick={onClick}>
      <span className="fin-kpi__label">{label}</span>
      <strong className="fin-kpi__value">{value}</strong>
      {hint && <span className="fin-kpi__hint">{hint}</span>}
    </Tag>
  )
}

export function Empty({ title, children, action, icon = 'docs' }) {
  return (
    <div className="fin-empty">
      <span className="fin-empty__icon"><Icon name={icon} size={26} /></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="fin-pagehead">
      <div><h2 className="fin-pagehead__title">{title}</h2>{sub && <p className="fin-muted">{sub}</p>}</div>
      {children && <div className="fin-pagehead__actions">{children}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`fin-card ${className}`}>
      {(title || actions) && <div className="fin-card__head">{title && <h3 className="fin-card__title">{title}</h3>}{actions}</div>}
      {children}
    </section>
  )
}

export function Bars({ rows, empty = 'אין נתונים לתקופה.', format = money }) {
  if (!rows.length) return <p className="fin-muted">{empty}</p>
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  return (
    <ul className="fin-bars">
      {rows.map((r) => (
        <li key={r.key || r.name}>
          <span className="fin-bars__name" title={r.name}>{r.name}</span>
          <span className="fin-bars__track"><span className="fin-bars__fill" style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` }} /></span>
          <span className="fin-bars__value">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}

/* a dialog: Escape closes, focus moves in and returns to the button that opened it */
export function Modal({ title, onClose, children, wide, footer }) {
  const box = useRef(null)
  useEffect(() => {
    const back = document.activeElement
    box.current?.querySelector('.fin-modal__body input:not([type="hidden"]), .fin-modal__body select, .fin-modal__body textarea, .fin-modal__body button, .fin-modal__foot button')?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !box.current) return
      // keep Tab inside the dialog
      const f = [...box.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null || el.classList.contains('fin-sel__native'))
      if (!f.length) return
      const first = f[0]; const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); back?.focus?.({ preventScroll: true }) }
  }, [onClose])
  return (
    <div className="fin-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="fin-modal__scrim" aria-label="סגירה" tabIndex={-1} onClick={onClose} />
      <div className={`fin-modal__box ${wide ? 'fin-modal__box--wide' : ''}`} ref={box}>
        <span className="fin-sheet__grip" aria-hidden="true" />
        <header className="fin-modal__head"><h2>{title}</h2><button type="button" className="fin-icon-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" /></button></header>
        <div className="fin-modal__body">{children}</div>
        {footer && <footer className="fin-modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

/* loading placeholder: the shape of what is coming, not a word */
export function Skeleton({ lines = 3, label = 'טוען' }) {
  return <div className="fin-skel" aria-busy="true" aria-label={label} role="status">{Array.from({ length: lines }, (_, i) => <span key={i} />)}</div>
}

export function Field({ label, children, wide, hint, tone }) {
  return (
    <label className={`fin-field ${wide ? 'fin-field--wide' : ''} ${tone ? `fin-field--${tone}` : ''}`}>
      <span className="fin-field__label">{label}</span>
      {children}
      {hint && <span className="fin-field__hint">{hint}</span>}
    </label>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} className={`fin-toggle ${checked ? 'is-on' : ''}`} onClick={() => !disabled && onChange(!checked)} disabled={disabled}>
      <span />
    </button>
  )
}

export function useAsync(fn, deps) {
  const [state, set] = useState({ loading: true, data: null, error: '' })
  const load = async () => {
    set((s) => ({ ...s, loading: true }))
    try { set({ loading: false, data: await fn(), error: '' }) } catch (e) { set({ loading: false, data: null, error: e.message }) }
  }
  useEffect(() => { load() }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: load }
}

/* drop files, pick files, or take a photo on the phone. Each file goes to the reading agents. */
export function UploadZone({ businessId, projectId, onDone, compact }) {
  const pick = useRef(null)
  const cam = useRef(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(0)
  const [msg, setMsg] = useState('')

  const send = async (files, source = 'upload') => {
    const list = [...files]
    if (!list.length) return
    setBusy(list.length); setMsg('')
    const notes = []
    let added = 0
    for (const f of list) {
      try {
        const r = await uploadFile(f, { businessId, projectId, source })
        if (r.duplicate) notes.push(`${f.name}: כפילות, הקובץ כבר קיים במערכת${r.of?.supplier_name ? ` (${r.of.supplier_name}${r.of.doc_number ? ` ${r.of.doc_number}` : ''})` : ''}`)
        else added++
      } catch (e) { notes.push(e.message) }
      setBusy((n) => n - 1)
    }
    setMsg([added ? `${added} קבצים הועלו וממתינים לקריאה` : '', ...notes].filter(Boolean).join(' · '))
    onDone?.()
  }

  return (
    <div
      className={`fin-drop ${over ? 'is-over' : ''} ${compact ? 'fin-drop--compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files) }}
    >
      <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => { send(e.target.files); e.target.value = '' }} data-testid="upload-input" />
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { send(e.target.files, 'camera'); e.target.value = '' }} />
      <span className="fin-drop__icon"><Icon name="upload" size={22} /></span>
      <div className="fin-drop__text">
        <strong>{busy ? `מעלה ${busy} קבצים…` : 'גררו לכאן חשבוניות וקבלות'}</strong>
        {!compact && <span>PDF או תמונה, עד 12MB. הסוכנים יקראו את הספק, הסכומים, המע״מ והתאריך.</span>}
      </div>
      <div className="fin-drop__actions">
        <button type="button" className="fin-btn fin-btn--primary" onClick={() => pick.current?.click()} disabled={!!busy}><Icon name="file" size={18} /> בחירת קבצים</button>
        <button type="button" className="fin-btn" onClick={() => cam.current?.click()} disabled={!!busy}><Icon name="camera" size={18} /> צילום</button>
      </div>
      {msg && <p className="fin-drop__msg" role="status">{msg}</p>}
    </div>
  )
}

/* the ⓘ next to a page title: a short explanation that opens on click and closes on Escape or outside click */
export function InfoTip({ label = 'מידע', children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const off = (e) => { if (e.key === 'Escape' || (e.type === 'mousedown' && !ref.current?.contains(e.target))) setOpen(false) }
    window.addEventListener('keydown', off); window.addEventListener('mousedown', off)
    return () => { window.removeEventListener('keydown', off); window.removeEventListener('mousedown', off) }
  }, [open])
  return (
    <span className="fin-infotip" ref={ref}>
      <button type="button" className="fin-icon-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}><Icon name="info" size={19} /></button>
      {open && <span className="fin-infotip__pop" role="note">{children}</span>}
    </span>
  )
}

/* ⋮ menu: a list of actions. Floats above everything (never clipped by a card or a table), stays inside the
   viewport, and on phones opens as an action sheet. Arrow keys move, Enter runs, Escape closes. */
export function MoreMenu({ label, items }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [sheet, setSheet] = useState(false)
  const btn = useRef(null)
  const pop = useRef(null)
  const list = items.filter(Boolean)
  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus({ preventScroll: true }) }
  const toggle = () => {
    if (open) { close(); return }
    const phone = window.matchMedia('(max-width: 700px)').matches
    setSheet(phone)
    if (!phone && btn.current) setPos(placeNear(btn.current, { minWidth: 200, maxHeight: 320 }))
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => pop.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true }), 0)
    const away = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) close(false) }
    const move = () => { if (!sheet && btn.current) setPos(placeNear(btn.current, { minWidth: 200, maxHeight: 320 })) }
    document.addEventListener('pointerdown', away, true)
    window.addEventListener('resize', move); window.addEventListener('scroll', move, true)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', away, true); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e) => {
    const all = [...(pop.current?.querySelectorAll('button[role="menuitem"]:not(:disabled)') || [])]
    const i = all.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); all[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); all[all.length - 1]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'Tab') close(false)
  }
  return (
    <span className="fin-more">
      <button ref={btn} type="button" className="fin-icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}><Icon name="more" size={19} style={{ transform: 'rotate(90deg)' }} /></button>
      {open && createPortal(
        <>
          {sheet && <button type="button" className="fin-sheet__scrim" aria-label="סגירה" tabIndex={-1} onClick={() => close()} />}
          <span ref={pop} className={`fin-pop fin-more__pop ${sheet ? 'is-sheet' : ''}`} role="menu" aria-label={label} style={sheet ? undefined : pos || undefined} onKeyDown={onKey}>
            {sheet && <span className="fin-sheet__grip" aria-hidden="true" />}
            {list.map((it) => <button key={it.label} type="button" role="menuitem" className={it.danger ? 'is-danger' : ''} disabled={it.disabled} onClick={() => { close(); it.onClick() }}>{it.label}</button>)}
            {sheet && <button type="button" className="fin-more__cancel" onClick={() => close()}>ביטול</button>}
          </span>
        </>, popRoot())}
    </span>
  )
}
