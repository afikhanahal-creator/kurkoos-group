import { useState } from 'react'
import { srcOfResponsive, responsiveStyle, optimizeSrc, buildSrcSet } from '../../lib/responsiveImage.js'
import './SmartImage.css'
import './ResponsiveImage.css'

export { optimizeSrc }

/* ============================================================
   תמונה עם fallback אלגנטי + fade-in בעת טעינה.
   props נוספים: priority (LCP — טעינה מיידית בעדיפות גבוהה), w (רוחב יעד
   ל-Cloudinary, לתמונות קטנות כמו תמונות גלריה).
   ============================================================ */
export default function SmartImage({ src, alt = '', label, className = '', style, priority = false, w = 1920, sizes, ...rest }) {
  // src יכול להיות מחרוזת (legacy) או אובייקט תמונה רספונסיבי { src, views }
  const url = srcOfResponsive(src)
  const riStyle = responsiveStyle(src)
  const [failed, setFailed] = useState(!url)
  const [loaded, setLoaded] = useState(false)
  // אם הגרסה המאופטמת נכשלת (חשבון שחוסם טרנספורמציות) — חוזרים למקור
  const [useOriginal, setUseOriginal] = useState(false)
  const finalSrc = useOriginal ? url : optimizeSrc(url, w)
  // srcset רספונסיבי — רק כש-sizes סופק וטרם נפלנו-לאחור למקור. מאפשר לדפדפן
  // להוריד את הרוחב המתאים למכשיר (חיסכון משמעותי במשקל במובייל).
  const srcSet = (sizes && !useOriginal) ? buildSrcSet(url, w) : ''

  if (failed) {
    return (
      <div
        className={`smart-image-placeholder ${className}`}
        style={style}
        role="img"
        aria-label={alt || label}
      >
        <span>{label || alt || 'Kurkoos Group'}</span>
      </div>
    )
  }

  return (
    <img
      src={finalSrc}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`smart-image ri-img ${loaded ? 'is-loaded' : ''} ${className}`}
      style={{ ...riStyle, ...style }}
      onError={() => { if (!useOriginal && finalSrc !== url) setUseOriginal(true); else setFailed(true) }}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  )
}
