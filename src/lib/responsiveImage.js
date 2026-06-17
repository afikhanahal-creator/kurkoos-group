/* ============================================================
   Responsive image art-direction — מודל נתונים + עזרים.
   ערך תמונה יכול להיות:
     • מחרוזת URL (legacy) — נטען כ-cover ממורכז (תאימות לאחור מלאה).
     • אובייקט { src, alt, views: { mobile, desktop } } — אומנות-כיוון
       לכל breakpoint (focal point / object-fit / object-position / יחס).
   נקודת השבירה בין מובייל לדסקטופ: 768px (תואם useIsMobile ואת שאר האתר).
   ============================================================ */

export const RI_BREAKPOINT = 768

export const DEFAULT_VIEW = {
  objectFit: 'cover',
  objectPosition: '50% 50%',
  focalPoint: { x: 0.5, y: 0.5 },
  aspectRatio: '', // '' = לפי המיכל באתר
  zoom: 1,
  radius: 0, // עיגול פינות בפיקסלים (0 = פינות רגילות/חדות)
}

// המרת focal point (0..1) ל-object-position
export function posFromFocal(fp) {
  const x = Math.round((fp?.x ?? 0.5) * 100)
  const y = Math.round((fp?.y ?? 0.5) * 100)
  return `${x}% ${y}%`
}

function mergeView(v) {
  const out = { ...DEFAULT_VIEW, ...(v || {}) }
  out.focalPoint = { ...DEFAULT_VIEW.focalPoint, ...((v && v.focalPoint) || {}) }
  // ודאות עקביות: אם יש focalPoint אבל אין objectPosition — נגזור
  if (v && v.focalPoint && !v.objectPosition) out.objectPosition = posFromFocal(out.focalPoint)
  return out
}

// ערך שמור עשוי להגיע כמחרוזת JSON (עמודת text ב-DB) — מפענחים בבטחה לאובייקט
function maybeParse(value) {
  if (typeof value === 'string') {
    const s = value.trim()
    if (s.startsWith('{')) {
      try {
        const o = JSON.parse(s)
        if (o && typeof o === 'object') return o
      } catch { /* לא JSON — נשאר מחרוזת (URL) */ }
    }
  }
  return value
}

// מנרמל כל ערך (מחרוזת/אובייקט/מחרוזת-JSON/null) למבנה אחיד או null
export function normalizeResponsiveImage(value) {
  value = maybeParse(value)
  if (!value) return null
  if (typeof value === 'string') {
    return {
      src: value,
      alt: '',
      views: { mobile: { ...DEFAULT_VIEW }, desktop: { ...DEFAULT_VIEW } },
    }
  }
  if (typeof value === 'object') {
    const src = value.src || value.url || value.image_url || ''
    if (!src) return null
    return {
      src,
      alt: value.alt || '',
      views: {
        mobile: mergeView(value.views?.mobile),
        desktop: mergeView(value.views?.desktop),
      },
    }
  }
  return null
}

/* בידול תמונה לפי breakpoint — מאפשר תמונת *מקור* שונה לדסקטופ ולמובייל.
   ערך יכול להיות:
     • legacy — מחרוזת / { src, views } → אותה תמונה לשני המכשירים (תאימות לאחור).
     • מפוצל — { desktop, mobile } כאשר כל צד הוא ערך תמונה עצמאי משלו.
   מחזיר את ערך התמונה (legacy-shape) המתאים ל-breakpoint המבוקש, או null. */
export function isSplitImage(value) {
  const v = maybeParse(value)
  return !!(
    v && typeof v === 'object' && !Array.isArray(v) &&
    !v.src && !v.url && !v.image_url &&
    ('desktop' in v || 'mobile' in v)
  )
}

export function pickResponsive(value, breakpoint = 'desktop') {
  const v = maybeParse(value)
  if (isSplitImage(v)) {
    const other = breakpoint === 'mobile' ? 'desktop' : 'mobile'
    return v[breakpoint] ?? v[other] ?? null
  }
  return v ?? null
}

// שליפת ה-URL בלבד (למקומות שצריכים רק מקור)
export function srcOfResponsive(value) {
  value = maybeParse(value)
  if (isSplitImage(value)) value = pickResponsive(value, 'desktop')
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.src || value.url || value.image_url || ''
}

// משתני CSS שמוחלים על תמונה כדי לכבד את התצוגות השמורות בכל breakpoint
export function responsiveStyle(value) {
  const ri = normalizeResponsiveImage(value)
  if (!ri) return {}
  const { mobile, desktop } = ri.views
  return {
    '--ri-fit-d': desktop.objectFit,
    '--ri-pos-d': desktop.objectPosition,
    '--ri-scale-d': desktop.zoom || 1,
    '--ri-rad-d': `${desktop.radius || 0}px`,
    '--ri-fit-m': mobile.objectFit,
    '--ri-pos-m': mobile.objectPosition,
    '--ri-scale-m': mobile.zoom || 1,
    '--ri-rad-m': `${mobile.radius || 0}px`,
  }
}
