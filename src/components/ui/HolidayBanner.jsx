import { useEffect, useState, useCallback } from 'react'
import './HolidayBanner.css'

/* ============================================================
   באנר ברכת שנה טובה — קופץ בכניסה לאתר.
   - נסגר אוטומטית אחרי 4 שניות, בלחיצה על X (בצד ימין), על הרקע או Escape
   - מוצג פעם אחת לכל ביקור (sessionStorage) כדי לא להטריד ברענונים
   - פג תוקף אוטומטית: לא מוצג החל מיום שני 14/09/2026 בבוקר
   ============================================================ */
const EXPIRES = new Date('2026-09-14T06:00:00+03:00').getTime()
const SEEN_KEY = 'kc_rosh_hashana_2026_seen'
const AUTO_CLOSE_MS = 4000

export default function HolidayBanner() {
  const [open, setOpen] = useState(() => {
    if (Date.now() >= EXPIRES) return false
    try { if (sessionStorage.getItem(SEEN_KEY)) return false } catch { /* noop */ }
    return true
  })
  const [leaving, setLeaving] = useState(false)

  const close = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* noop */ }
    setLeaving(true)
    setTimeout(() => setOpen(false), 280)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(close, AUTO_CLOSE_MS)
    const onKey = (e) => { if (e.key === 'Escape' && e.isTrusted) close() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [open, close])

  if (!open) return null

  return (
    <div
      className={`holiday-banner${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-label="ברכת שנה טובה מקבוצת קורקוס"
      onClick={(e) => { if (e.isTrusted) close() }}
    >
      <div className="holiday-banner__card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="holiday-banner__close"
          onClick={close}
          aria-label="סגירת הברכה והמשך לאתר"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <img
          src="/rosh-hashana-2026.webp"
          alt="שנה טובה, אושר ובריאות — קבוצת קורקוס. תבקרו באתר החדש שלנו!"
          fetchPriority="high"
        />
      </div>
    </div>
  )
}
