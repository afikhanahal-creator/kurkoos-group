import { useState } from 'react'
import './SmartImage.css'

/* ============================================================
   תמונה עם fallback אלגנטי + fade-in בעת טעינה.
   אם הקובץ לא קיים — מוצג placeholder ממותג.
   ============================================================ */
export default function SmartImage({ src, alt = '', label, className = '', style, ...rest }) {
  const [failed, setFailed] = useState(!src)
  const [loaded, setLoaded] = useState(false)

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
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`smart-image ${loaded ? 'is-loaded' : ''} ${className}`}
      style={style}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  )
}
