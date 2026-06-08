import { useState } from 'react'
import './bg-media.css'

/* ============================================================
   BackgroundMedia — שכבת רקע (וידאו או תמונה) שמכסה את ההורה.
   הווידאו מתנגן אוטומטית, מושתק וב-loop (כמו רקע אתר תדמית).
   ------------------------------------------------------------
   props:
     type     'video' | 'image'         (ברירת מחדל: 'video')
     src      נתיב המדיה (חובה)
     poster   תמונת פתיח לווידאו (טעינה מהירה + fallback)
     variant  'light' | 'dark' | 'none'  — גוון שכבת-העל לקריאות טקסט מעל
     alt      טקסט חלופי (לתמונה / נגישות)
     className / style  — מועברים לאלמנט החיצוני
     children  תוכן שמרחף מעל המדיה (כותרות, כפתורים...)
   הגודל נקבע ע"י ההורה — הרכיב פשוט ממלא אותו (object-fit: cover),
   ולכן הוא responsive: דסקטופ מלא במסך, מובייל מתכווץ יחד עם המכל.
   ============================================================ */
export default function BackgroundMedia({
  type = 'video',
  src,
  poster,
  variant = 'light',
  alt = '',
  className = '',
  style,
  children,
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={`bg-media bg-media--${variant} ${loaded ? 'is-loaded' : ''} ${className}`}
      style={style}
    >
      {type === 'video' ? (
        <video
          className="bg-media__el"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
        />
      ) : (
        <img
          className="bg-media__el"
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      )}

      {variant !== 'none' && <div className="bg-media__overlay" aria-hidden="true" />}

      {children && <div className="bg-media__content">{children}</div>}
    </div>
  )
}
