import { useState } from 'react'
import { srcOfResponsive, responsiveStyle, optimizeSrc, buildSrcSet, wsrvSrc } from '../../lib/responsiveImage.js'
import './SmartImage.css'
import './ResponsiveImage.css'

export { optimizeSrc }

/* ============================================================
   תמונה עם fallback אלגנטי + fade-in בעת טעינה.
   props נוספים: priority (LCP — טעינה מיידית בעדיפות גבוהה), w (רוחב יעד
   ל-Cloudinary, לתמונות קטנות כמו תמונות גלריה).
   ============================================================ */
export default function SmartImage({ src, alt = '', label, className = '', style, priority = false, w = 1920, sizes, quality = 'auto', ...rest }) {
  // src יכול להיות מחרוזת (legacy) או אובייקט תמונה רספונסיבי { src, views }
  const url = srcOfResponsive(src)
  const riStyle = responsiveStyle(src)
  const [failed, setFailed] = useState(!url)
  const [loaded, setLoaded] = useState(false)
  // שרשרת נפילה: Cloudinary fetch → wsrv.nl (proxy חינמי) → המקור.
  // כך גם כשהטרנספורמציה הראשית נכשלת, תמונות Storage עדיין מוגשות מ-CDN
  // ולא שורפות את מכסת ה-Egress של Supabase.
  const [stage, setStage] = useState(0)
  const wsrv = wsrvSrc(url, w)
  const tiers = [optimizeSrc(url, w, quality), wsrv || url, url]
  const finalSrc = tiers[Math.min(stage, tiers.length - 1)]
  // srcset רספונסיבי — רק בשכבה הראשית. מאפשר לדפדפן להוריד את הרוחב
  // המתאים למכשיר (חיסכון משמעותי במשקל במובייל).
  const srcSet = (sizes && stage === 0) ? buildSrcSet(url, w, quality) : ''

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
      onError={() => { if (finalSrc !== url) setStage((st) => st + 1); else setFailed(true) }}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  )
}
