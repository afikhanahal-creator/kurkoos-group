import { useState } from 'react'
import './SmartImage.css'

/* אופטימיזציית Cloudinary: הזרקת f_auto,q_auto (פורמט מודרני WebP/AVIF +
   דחיסה ויזואלית-זהה) — חוסך עשרות אחוזים במשקל בלי שום שינוי נראה לעין.
   מדלג אם כבר קיימת טרנספורמציה בכתובת; כתובות אחרות מוחזרות כמו שהן. */
export function optimizeSrc(src) {
  if (typeof src !== 'string' || !src.includes('res.cloudinary.com/')) return src
  const marker = '/image/upload/'
  const i = src.indexOf(marker)
  if (i === -1) return src
  const rest = src.slice(i + marker.length)
  if (/^[a-z]+_[^/]*\//.test(rest)) return src   // יש כבר טרנספורמציה — לא נוגעים
  return src.slice(0, i + marker.length) + 'f_auto,q_auto/' + rest
}

/* ============================================================
   תמונה עם fallback אלגנטי + fade-in בעת טעינה.
   אם הקובץ לא קיים — מוצג placeholder ממותג.
   ============================================================ */
export default function SmartImage({ src, alt = '', label, className = '', style, ...rest }) {
  const [failed, setFailed] = useState(!src)
  const [loaded, setLoaded] = useState(false)
  // אם הגרסה המאופטמת נכשלת (חשבון שחוסם טרנספורמציות) — חוזרים למקור
  const [useOriginal, setUseOriginal] = useState(false)
  const finalSrc = useOriginal ? src : optimizeSrc(src)

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
      loading="lazy"
      decoding="async"
      className={`smart-image ${loaded ? 'is-loaded' : ''} ${className}`}
      style={style}
      onError={() => { if (!useOriginal && finalSrc !== src) setUseOriginal(true); else setFailed(true) }}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  )
}
