import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listProjectCards, cmsRowToCard } from '../../lib/cms.js'
import { optimizeSrc } from '../../lib/responsiveImage.js'
import { track } from '../../lib/track.js'
import Icon from './Icon.jsx'
import './PromoBanner.css'

/* ============================================================
   באנר שיווקי בתחתית המסך, בכניסה לאתר.
   - מוצג פעם אחת לביקור (sessionStorage), נסגר לבד אחרי עשר שניות,
     ב-X או ב-Escape. מעבר עכבר על הבאנר עוצר את הספירה.
   - פג תוקף לבד בתאריך שלמטה. אחריו הקומפוננטה לא מציגה כלום.
   - הקישור מוביל לעמוד הפרויקט במערכת. ה-slug נמצא לפי שם הפרויקט,
     כך שגם אם ה-slug ישתנה באדמין הבאנר ימשיך לעבוד. התמונה הקטנה היא
     תמונת השער של הפרויקט מהמערכת.
   - אם באנר העוגיות עדיין פתוח, הבאנר הזה יושב מעליו ולא מכסה אותו.
   - מוצג רק בעמודים שב-PAGES (בית, פרויקטים, תיווך). לא בעמוד צור קשר,
     לא בעמודי פרויקט, לא בכתבות ולא בשום עמוד אחר: שם הגולש באמצע משימה.
   - לא קופץ בכניסה: מחכה 30 שניות באתר או גלילה של חצי עמוד באחד
     מהעמודים המותרים, המוקדם מביניהם.
   - שכבה (z-index) מתחת לחלון צור קשר ולכל מודאל, מעל בר הפנייה במובייל.
   ============================================================ */

const PROMO = {
  id: 'ben-gurion-17-last-units',
  expires: '2026-10-15T23:59:59+03:00',
  title: 'נותרו 2 יחידות אחרונות לשיווק',
  project: 'בן גוריון 17, יהוד-מונוסון',
  text: 'דירות בפרויקט בוטיק, בליווי מלא של הקבוצה מהחתימה ועד המפתח.',
  cta: 'לתיאום פגישה',
  nameKeys: ['בן גוריון'],
  fallbackTo: '/projects',
}
const AUTO_CLOSE_MS = 10000
const PAGES = ['/', '/projects', '/divisions/brokerage']
const DELAY_MS = 30000          // זמן באתר עד שהבאנר מותר להופיע
const SCROLL_RATIO = 0.5        // או גלילה של חצי עמוד, המוקדם מביניהם
const SEEN_KEY = `kc_promo_${PROMO.id}_seen`
const nameOf = (v) => (v && typeof v === 'object') ? String(v.he || v.en || '') : String(v || '')

export default function PromoBanner() {
  const [open, setOpen] = useState(() => {
    if (Date.now() >= new Date(PROMO.expires).getTime()) return false
    try { if (sessionStorage.getItem(SEEN_KEY)) return false } catch { /* noop */ }
    return true
  })
  const [leaving, setLeaving] = useState(false)
  const [paused, setPaused] = useState(false)
  const [card, setCard] = useState(null)      // הפרויקט מהמערכת: slug ותמונה
  const [lift, setLift] = useState(0)         // גובה באנר העוגיות, אם פתוח
  const remaining = useRef(AUTO_CLOSE_MS)
  const startedAt = useRef(0)
  const [armed, setArmed] = useState(false)   // עברו 30 שניות או חצי גלילה
  const { pathname } = useLocation()
  const onPage = PAGES.includes(pathname.replace(/\/+$/, '') || '/')
  // מוצג בפועל רק כשכל התנאים מתקיימים. מעבר לעמוד אחר מסתיר בלי לסמן "נראה"
  const visible = open && armed && onPage

  // טריגר: 30 שניות מהכניסה לאתר
  useEffect(() => {
    if (!open || armed) return undefined
    const t = setTimeout(() => setArmed(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [open, armed])

  // טריגר: גלילה של חצי עמוד, רק בעמוד שבו הבאנר מותר
  useEffect(() => {
    if (!open || armed || !onPage) return undefined
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0 && window.scrollY / max >= SCROLL_RATIO) setArmed(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open, armed, onPage])

  const close = useCallback((how = 'auto') => {
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* noop */ }
    if (how !== 'auto') track('promo_close', { promo: PROMO.id, how })
    setLeaving(true)
    setTimeout(() => setOpen(false), 320)
  }, [])

  // הפרויקט מהמערכת, לפי שם
  useEffect(() => {
    if (!visible || card) return undefined
    let on = true
    listProjectCards()
      .then((rows) => {
        if (!on) return
        const cards = (rows || []).map(cmsRowToCard)
        const hit = cards.find((c) => PROMO.nameKeys.some((k) => nameOf(c.name).includes(k)))
        if (hit) setCard(hit)
      })
      .catch(() => {})
    return () => { on = false }
  }, [visible, card])

  // ספירה לאחור עם עצירה במעבר עכבר
  useEffect(() => {
    if (!visible || paused) return undefined
    startedAt.current = Date.now()
    const t = setTimeout(() => close('auto'), remaining.current)
    return () => {
      clearTimeout(t)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current))
    }
  }, [visible, paused, close])

  // כל עוד הבאנר פתוח, html מקבל class: במובייל באנר העוגיות מחכה לו ולא מופיע לידו
  // והגובה שלו נשמר במשתנה --promo-h, כדי שכפתור הנגישות במובייל יעלה מעליו
  useEffect(() => {
    if (!visible) return undefined
    const root = document.documentElement
    root.classList.add('promo-open')
    const setH = () => {
      const el = document.querySelector('.promo__card')
      if (el) root.style.setProperty('--promo-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    }
    setH()
    const raf = requestAnimationFrame(setH)
    window.addEventListener('resize', setH)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', setH)
      root.classList.remove('promo-open')
      root.style.removeProperty('--promo-h')
    }
  }, [visible, card])

  useEffect(() => {
    if (!visible) return undefined
    track('promo_view', { promo: PROMO.id })
    const onKey = (e) => { if (e.key === 'Escape' && e.isTrusted) close('escape') }
    window.addEventListener('keydown', onKey)
    // לא מכסים את באנר העוגיות: מודדים אותו כל עוד הבאנר שלנו פתוח
    // המרחק מתחתית המסך עד הקצה העליון של באנר העוגיות (גובה + הרווח שלו מהתחתית)
    const measure = () => {
      const el = document.querySelector('.cookie-banner')
      if (!el) { setLift(0); return }
      const r = el.getBoundingClientRect()
      setLift(r.height > 0 ? Math.max(0, Math.round(window.innerHeight - r.top)) : 0)
    }
    measure()
    const iv = setInterval(measure, 500)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('keydown', onKey); clearInterval(iv); window.removeEventListener('resize', measure) }
  }, [visible, close])

  if (!visible) return null

  const to = card?.slug ? `/projects/${card.slug}#contact` : PROMO.fallbackTo
  const cover = card?.cover ? optimizeSrc(card.cover, 320) : ''

  return (
    <aside
      className={`promo${leaving ? ' is-leaving' : ''}${paused ? ' is-paused' : ''}`}
      role="complementary"
      aria-label={`${PROMO.title}, ${PROMO.project}`}
      style={lift ? { '--promo-lift': `${lift}px` } : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="promo__card">
        <button type="button" className="promo__close" onClick={() => close('x')} aria-label="סגירת ההודעה">
          <Icon name="close" size={16} />
        </button>

        {cover && (
          <Link to={to} className="promo__media" aria-hidden="true" tabIndex={-1} onClick={() => track('promo_click', { promo: PROMO.id, how: 'image' })}>
            <img src={cover} alt="" loading="eager" decoding="async" />
          </Link>
        )}

        <div className="promo__body">
          <strong className="promo__title">{PROMO.title}</strong>
          <span className="promo__project">{PROMO.project}</span>
          <span className="promo__text">{PROMO.text}</span>
        </div>

        <Link
          to={to}
          className="btn promo__cta"
          onClick={() => { track('promo_click', { promo: PROMO.id, how: 'button' }); close('cta') }}
        >
          {PROMO.cta} <Icon name="arrowLeft" size={18} />
        </Link>

        <span className="promo__timer" aria-hidden="true" style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }} />
      </div>
    </aside>
  )
}
