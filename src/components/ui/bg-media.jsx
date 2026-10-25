import { useState, useRef, useEffect } from 'react'
import './bg-media.css'

/* ============================================================
   BackgroundMedia — שכבת רקע (וידאו או תמונה) שמכסה את ההורה.
   הווידאו מתנגן אוטומטית, מושתק וב-loop (כמו רקע אתר תדמית).
   ------------------------------------------------------------
   props:
     type     'video' | 'image'          (ברירת מחדל: 'video')
     src      נתיב המדיה (חובה)
     poster   תמונת פתיח לווידאו (טעינה מהירה + fallback + reduced-motion)
     variant  'dark' | 'light' | 'none'   — גוון שכבת-על לקריאות תוכן מעל
     alt      טקסט חלופי (נגישות)
     className / style   — מועברים לאלמנט החיצוני
     children  תוכן שמרחף מעל המדיה (כותרות, כפתורים...)
   נגישות: אם המשתמש ביקש "פחות תנועה" — מוצגת תמונת הפוסטר במקום וידאו.
   iOS: כשמדיניות ה-autoplay חוסמת (מצב חיסכון) — מופיע כפתור Play שמאפשר
   הפעלה ידנית במגע (מחווה של המשתמש תמיד מותרת ב-iOS).
   ============================================================ */

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* בטלפון מנוגנת גרסה קלה של הסרטון (mobileSrc), אוטומטית כמו במחשב.
   רק במצב חיסכון בנתונים או בחיבור איטי מאוד מוצג הפוסטר עם כפתור הפעלה,
   וגם כשאין גרסה קלה (סרטון כבד בלבד) בטלפון. */
const isPhone = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches === true
const heavyVideoOnDemand = (hasLight) => {
  if (typeof window === 'undefined') return false
  const c = navigator.connection || {}
  if (c.saveData) return true
  if (/^(slow-2g|2g)$/.test(c.effectiveType || '')) return true
  return !hasLight && isPhone()
}

export default function BackgroundMedia({
  type = 'video',
  src,
  poster,
  variant = 'dark',
  alt = '',
  className = '',
  style,
  children,
  forcePlay = false,   // כשדולק — הווידאו תמיד מתנגן (מתעלם מ-reduced-motion)
  mobileSrc,           // גרסה קלה לטלפון (עד 900px), מתנגנת אוטומטית
}) {
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  // הווידאו לא נטען עד שהרכיב מתקרב למסך — חוסך מגה-בייטים לכל ביקור
  // בעמוד שבו הגולש לא גלל עד הסרטון (הפוסטר מוצג עד אז).
  const [near, setNear] = useState(false)
  // המבקר ביקש במפורש לראות את הסרטון (הקשה על כפתור ההפעלה)
  const [asked, setAsked] = useState(false)
  const onDemand = type === 'video' && !asked && heavyVideoOnDemand(Boolean(mobileSrc))
  const [phone] = useState(isPhone)
  const videoSrc = phone && mobileSrc ? mobileSrc : src
  const wrapRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    if (type !== 'video') return
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }),
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [type])

  useEffect(() => {
    const v = videoRef.current
    if (!v || type !== 'video') return
    // iOS דורש את הדגלים גם כ-properties וגם כ-attributes לאמינות מלאה
    v.muted = true
    v.defaultMuted = true
    v.playsInline = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', 'true')
    // בלי קובץ אין מה לנגן: play() על וידאו ריק מסמן אותו "מתנגן" ומעלים את כפתור ההפעלה
    const tryPlay = () => { if (!v.getAttribute('src')) return; const p = v.play?.(); if (p && p.catch) p.catch(() => {}) }
    tryPlay()

    // iOS (במיוחד במצב חיסכון בסוללה) חוסם autoplay עד למחווה כלשהי של המשתמש.
    // מאזינים פעם-אחת למגע/לחיצה/גלילה הראשונים בעמוד ומנגנים מיד — וכך הסרטון
    // תמיד יתחיל ברגע שהמשתמש נוגע במסך, גם אם ה-autoplay האוטומטי נחסם.
    const gestureEvents = ['touchstart', 'pointerdown', 'click', 'keydown', 'scroll']
    const onGesture = () => {
      tryPlay()
      gestureEvents.forEach((e) => window.removeEventListener(e, onGesture))
    }
    gestureEvents.forEach((e) => window.addEventListener(e, onGesture, { passive: true }))

    // מנגן מחדש כשהסרטון חוזר להיות נראה על המסך (iOS עוצר וידאו שיוצא מהמסך)
    let io
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) tryPlay() }),
        { threshold: 0.15 }
      )
      io.observe(v)
    }
    const onVisible = () => { if (!document.hidden) tryPlay() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (io) io.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      gestureEvents.forEach((e) => window.removeEventListener(e, onGesture))
    }
  }, [videoSrc, type, near])

  // הפעלה ידנית (מחווה של המשתמש) — תמיד מותרת ב-iOS גם כשה-autoplay חסום
  const manualPlay = () => {
    if (onDemand) { setAsked(true); return }   // הטעינה מתחילה, ההפעלה בעקבות onCanPlay
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play?.()
    if (p && p.catch) p.catch(() => setFailed(true))
  }

  const showStill = type !== 'video' || (!forcePlay && prefersReducedMotion && poster)

  return (
    <div
      ref={wrapRef}
      className={`bg-media bg-media--${variant} ${loaded ? 'is-loaded' : ''} ${className}`}
      style={style}
    >
      {showStill ? (
        <img
          className="bg-media__el"
          src={type === 'video' ? poster : src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            className="bg-media__el"
            src={near && !onDemand ? videoSrc : undefined}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            /* היה preload="auto", כלומר הדפדפן הוריד את כל הקובץ מראש.
               בעמוד הביצוע זה 5 מגה על חיבור סלולרי, והוא גם רכיב ה-LCP.
               metadata מוריד רק את מה שצריך כדי להתחיל, והשאר בזרימה. */
            preload="metadata"
            onLoadedData={() => setLoaded(true)}
            onPlaying={() => { setLoaded(true); setPlaying(true) }}
            /* "מתנגן" רק כשיש פריימים (onPlaying), לא על אירוע play, שקורה גם כשהדפדפן חוסם או שאין קובץ */
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
            onCanPlay={(e) => { setLoaded(true); const p = e.currentTarget.play?.(); if (p && p.catch) p.catch(() => {}) }}
          />
          {/* כפתור Play — מופיע כשהסרטון לא מתנגן (iOS שחוסם autoplay) */}
          {!playing && (
            <button type="button" className="bg-media__play" onClick={manualPlay} aria-label="הפעלת הסרטון">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
        </>
      )}

      {variant !== 'none' && <div className="bg-media__overlay" aria-hidden="true" />}

      {children && <div className="bg-media__content">{children}</div>}
    </div>
  )
}
