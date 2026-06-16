import { normalizeResponsiveImage, responsiveStyle } from '../../lib/responsiveImage.js'
import './ResponsiveImage.css'

/* ============================================================
   ResponsiveImage — רכיב תצוגה ציבורי שמכבד תצוגות-לפי-breakpoint
   שנשמרו ב-CMS (object-fit / object-position למובייל ולדסקטופ).
   מקבל ערך מחרוזת (legacy) או אובייקט { src, views }. תאימות לאחור:
   מחרוזת → cover ממורכז.
   ============================================================ */
export default function ResponsiveImage({
  value,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  draggable = false,
  style,
  ...rest
}) {
  const ri = normalizeResponsiveImage(value)
  if (!ri) return null
  return (
    <img
      className={`ri-img ${className}`.trim()}
      src={ri.src}
      alt={alt ?? ri.alt ?? ''}
      style={{ ...responsiveStyle(value), ...style }}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
      {...rest}
    />
  )
}
