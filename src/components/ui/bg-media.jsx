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
   הגודל נקבע ע"י ההורה — הרכיב פשוט ממלא אותו (object-fit: cover),
   ולכן הוא responsive: דסקטופ מלא, מובייל מתכווץ יחד עם המכל.
   נגישות: אם המשתמש ביקש "פחות תנועה" — מוצגת תמונת הפוסטר במקום וידאו.
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
  const videoRef = useRef(null)
  // מאלץ ניגון אוטומטי גם בדפדפנים שמתעלמים מ-autoPlay (דסקטופ ומובייל)
  useEffect(() => {
    const v = videoRef.current
    if (v) { const p = v.play?.(); if (p && p.catch) p.catch(() => {}) }
  }, [src])
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
          onCanPlay={(e) => { setLoaded(true); const p = e.currentTarget.play?.(); if (p && p.catch) p.catch(() => {}) }}
        />
      )}

      {variant !== 'none' && <div className="bg-media__overlay" aria-hidden="true" />}

      {children && <div className="bg-media__content">{children}</div>}
    </div>
  )
}