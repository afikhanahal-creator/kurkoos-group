import { useRef, useState } from 'react'
import { STATUS } from './format.js'
import { uploadFile } from './api.js'

const P = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  docs: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  suppliers: <><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  export: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  back: <path d="M9 6l6 6-6 6" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  upload: <><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 21h14" /></>,
  camera: <><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="4" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12l5 5L20 7" />,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  sync: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  open: <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />,
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

export function Kpi({ label, value, hint, tone }) {
  return (
    <div className={`fin-kpi ${tone ? `fin-kpi--${tone}` : ''}`}>
      <span className="fin-kpi__label">{label}</span>
      <strong className="fin-kpi__value">{value}</strong>
      {hint && <span className="fin-kpi__hint">{hint}</span>}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="fin-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

/* drop files, pick files, or take a photo on the phone. Each file goes to Claude to read. */
export function UploadZone({ businessId, onDone, compact }) {
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
        const r = await uploadFile(f, { businessId, source })
        if (r.duplicate) notes.push(`${f.name}: כבר קיים במערכת`)
        else added++
      } catch (e) { notes.push(e.message) }
      setBusy((n) => n - 1)
    }
    setMsg([added ? `${added} קבצים הועלו. Claude קורא אותם עכשיו` : '', ...notes].filter(Boolean).join(' · '))
    onDone?.()
  }

  return (
    <div
      className={`fin-drop ${over ? 'is-over' : ''} ${compact ? 'fin-drop--compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files) }}
    >
      <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => { send(e.target.files); e.target.value = '' }} />
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { send(e.target.files, 'camera'); e.target.value = '' }} />
      <Icon name="upload" size={compact ? 20 : 30} className="fin-drop__icon" />
      <div className="fin-drop__text">
        <strong>{busy ? `מעלה ${busy} קבצים…` : 'גררו לכאן חשבוניות וקבלות'}</strong>
        {!compact && <span>PDF או תמונה, עד 12MB לקובץ. Claude יקרא את הסכום, המע״מ, הספק והתאריך.</span>}
      </div>
      <div className="fin-drop__actions">
        <button type="button" className="fin-btn fin-btn--primary" onClick={() => pick.current?.click()} disabled={!!busy}><Icon name="file" size={18} /> בחירת קבצים</button>
        <button type="button" className="fin-btn" onClick={() => cam.current?.click()} disabled={!!busy}><Icon name="camera" size={18} /> צילום</button>
      </div>
      {msg && <p className="fin-drop__msg" role="status">{msg}</p>}
    </div>
  )
}
