import { useState } from 'react'
import './SmartImage.css'

/* אופטימיזציית Cloudinary: f_auto,q_auto (פורמט מודרני WebP/AVIF + דחיסה
   ויזואלית-זהה) + הגבלת רוחב (c_limit,w_...) כדי שמקור ענק יוקטן לרוחב התצוגה.
   חוסך משקל רב בלי שינוי נראה לעין. כתובות שאינן Cloudinary מוחזרות כמו שהן. */
export function optimizeSrc(src, w = 1920) {
  if (typeof src !== 'string' || !src.includes('res.cloudinary.com/')) return src
  const marker = '/image/upload/'
  const i = src.indexOf(marker)
  if (i === -1) return src
  const rest = src.slice(i + marker.length)
  if (/^[a-z]+_[^/]*\//.test(rest)) return src   // יש כבר טרנספורמציה — לא נוגעים
  return src.slice(0, i + marker.length) + `f_auto,q_auto,c_limit,w_${w}/` + rest
}

/* ============================================================
   תמונה עם fallback אלגנטי + fade-in בעת טעינה.
   props נוספים: priority (LCP — טעינה מיידית בעדיפות גבוהה), w (רוחב יעד
   ל-Cloudinary, לתמונות קטנות כמו תמונות גלריה).
   ============================================================ */
export default function SmartImage({ src, alt = '', label, className = '', style, priority = false, w = 1920, ...rest }) {
  const [failed, setFailed] = useState(!src)
  const [loaded, setLoaded] = useState(false)
  // אם הגרסה המאופטמת נכשלת (חשבון שחוסם טרנספורמציות) — חוזרים למקור
  const [useOriginal, setUseOriginal] = useState(false)
  const finalSrc = useOriginal ? src : optimizeSrc(src, w)

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
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`smart-image ${loaded ? 'is-loaded' : ''} ${className}`}
      style={style}
      onError={() => { if (!useOriginal && finalSrc !== src) setUseOriginal(true); else setFailed(true) }}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  )
}
