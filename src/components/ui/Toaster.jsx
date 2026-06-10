import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { subscribe, dismissToast } from '../../lib/toast.js'
import './Toaster.css'

/* ============================================================
   Toaster — מציג את ה-toasts ממערכת toast.js. RTL, נגיש,
   נערם בפינה התחתונה. כל toast נסגר אוטומטית או בלחיצה,
   ויכול לכלול כפתור פעולה (למשל "ביטול").
   ============================================================ */
const ICONS = {
  success: <path d="M20 6L9 17l-5-5" />,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v0" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v0" /></>,
  default: null,
}

function ToastItem({ t, onClose }) {
  const [leaving, setLeaving] = useState(false)
  const close = useCallback(() => { setLeaving(true); setTimeout(onClose, 220) }, [onClose])

  useEffect(() => {
    if (!t.duration) return
    const timer = setTimeout(close, t.duration)
    return () => clearTimeout(timer)
  }, [t.duration, close])

  const icon = ICONS[t.type] ?? ICONS.default

  return (
    <div className={`tst tst--${t.type} ${leaving ? 'tst--out' : ''}`} role="status">
      {icon && (
        <svg className="tst__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      )}
      <span className="tst__msg">{t.message}</span>
      {t.action && (
        <button
          type="button"
          className="tst__action"
          onClick={() => { t.action.onClick?.(); close() }}
        >
          {t.action.label}
        </button>
      )}
      <button type="button" className="tst__x" onClick={close} aria-label="סגירה">✕</button>
    </div>
  )
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => subscribe((ev) => {
    if (ev.kind === 'add') setToasts((prev) => [...prev, ev.toast])
    else if (ev.kind === 'remove') setToasts((prev) => prev.filter((t) => t.id !== ev.id))
  }), [])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="tst-wrap" dir="rtl" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onClose={() => dismissToast(t.id)} />
      ))}
    </div>,
    document.body
  )
}
