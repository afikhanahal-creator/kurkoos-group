import { useState } from 'react'
import { normalizeResponsiveImage, responsiveStyle, optimizeSrc, buildSrcSet } from '../../lib/responsiveImage.js'
import './ResponsiveImage.css'

/* ============================================================
   ResponsiveImage — רכיב תצוגה ציבורי שמכבד תצוגות-לפי-breakpoint
   שנשמרו ב-CMS (object-fit / object-position למובייל ולדסקטופ).
   מקבל ערך מחרוזת (legacy) או אובייקט { src, views }. תאימות לאחור:
   מחרוזת → cover ממורכז. כש-sizes סופק נבנה srcset לטעינה חדה (retina).
   ============================================================ */
export default function ResponsiveImage({
  value,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  draggable = false,
  style,
  w = 1280,
  sizes,
  ...rest
}) {
  const [failed, setFailed] = useState(false)
  const ri = normalizeResponsiveImage(value)
  if (!ri) return null
  const optimized = optimizeSrc(ri.src, w)
  const srcSet = (sizes && !failed) ? buildSrcSet(ri.src, w) : ''
  return (
    <img
      className={`ri-img ${className}`.trim()}
      src={failed ? ri.src : optimized}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt ?? ri.alt ?? ''}
      style={{ ...responsiveStyle(value), ...style }}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
      onError={() => { if (!failed && optimized !== ri.src) setFailed(true) }}
      {...rest}
    />
  )
}
