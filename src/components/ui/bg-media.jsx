import { useState } from 'react'
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
}) {
  const [loaded, setLoaded] = useState(false)
  const showStill = type !== 'video' || (prefersReducedMotion && poster)

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
          className="bg-media__el"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
        />
      )}

      {variant !== 'none' && <div className="bg-media__overlay" aria-hidden="true" />}

      {children && <div className="bg-media__content">{children}</div>}
    </div>
  )
}