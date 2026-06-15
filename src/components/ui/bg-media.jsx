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
}) {
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef(null)

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
    const tryPlay = () => { const p = v.play?.(); if (p && p.catch) p.catch(() => {}) }
    tryPlay()

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
    }
  }, [src, type])

  // הפעלה ידנית (מחווה של המשתמש) — תמיד מותרת ב-iOS גם כשה-autoplay חסום
  const manualPlay = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play?.()
    if (p && p.catch) p.catch(() => setFailed(true))
  }

  const showStill = type !== 'video' || (!forcePlay && prefersReducedMotion && poster)

  return (
    <div
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
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setLoaded(true)}
            onPlaying={() => { setLoaded(true); setPlaying(true) }}
            onPlay={() => setPlaying(true)}
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
