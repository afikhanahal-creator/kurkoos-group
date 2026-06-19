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

/* אופטימיזציית URL לתמונות מרוחקות (Cloudinary / Unsplash): פורמט מודרני
   (WebP/AVIF), דחיסה ויזואלית-זהה והגבלת רוחב לפי גודל התצוגה בפועל — חוסך
   משקל רב בלי שינוי נראה לעין. כתובות אחרות מוחזרות כמו שהן. */
export function optimizeSrc(src, w = 1920, q = 'auto') {
  if (typeof src !== 'string') return src
  if (src.includes('images.unsplash.com/')) {
    try {
      const u = new URL(src)
      const cur = parseInt(u.searchParams.get('w') || '0', 10)
      if (!cur || w < cur) u.searchParams.set('w', String(w))
      // eco → איכות נמוכה יותר (תמונות תמונה/thumbnail), אחרת ברירת-מחדל
      u.searchParams.set('q', q.includes('eco') ? '55' : '70')
      u.searchParams.set('auto', 'format')
      return u.toString()
    } catch { return src }
  }
  // Supabase Storage — מגישים דרך ה-CDN של Cloudinary (שינוי-גודל + פורמט מודרני
   // f_auto/q_auto) → תמונות קלות בהרבה וטעינה מהירה. נופל-לאחור לכתובת המקורית
   // אם משהו נכשל (onError ברכיבי התמונה).
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  if (cloud && src.includes('.supabase.co/storage/')) {
    return `https://res.cloudinary.com/${cloud}/image/fetch/f_auto,q_${q},c_limit,w_${w}/${encodeURIComponent(src)}`
  }
  // כתובות Cloudinary upload — מוסיפים טרנספורמציה (פורמט/איכות/רוחב) אם אין כבר
  if (src.includes('res.cloudinary.com/')) {
    const marker = '/image/upload/'
    const i = src.indexOf(marker)
    if (i === -1) return src
    const rest = src.slice(i + marker.length)
    if (/^[a-z]+_[^/]*\//.test(rest)) return src   // יש כבר טרנספורמציה — לא נוגעים
    return src.slice(0, i + marker.length) + `f_auto,q_${q},c_limit,w_${w}/` + rest
  }
  // ברירת-מחדל ללא Cloudinary — פרוקסי תמונות חינמי (wsrv.nl): שינוי-גודל + WebP,
  // בלי שום הגדרה. עובד על כל כתובת ציבורית (כולל Supabase Storage) → במקום
  // להוריד תמונת-מקור במלוא הרוחב (1920px) לכרטיס של 250px, יורדת תמונה קלה.
  // אם הפרוקסי נכשל — רכיב התמונה נופל-לאחור למקור (onError) → במקרה הגרוע
  // מתנהג כמו היום (תמונת-מקור), כך שזה תמיד בטוח.
  if (!/^https?:\/\//.test(src)) return src                  // כתובת מקומית/יחסית — משאירים
  if (src.includes('wsrv.nl') || src.includes('weserv.nl')) return src
  const wq = q.includes('eco') ? 60 : 78
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${w}&q=${wq}&output=webp`
}

/* בניית srcset רספונסיבי — סולם רוחבים סביב הרוחב המבוקש, כל אחד דרך optimizeSrc
   (פורמט מודרני + הגבלת רוחב). מאפשר לדפדפן לבחור את הגודל האופטימלי לפי המכשיר
   ו-DPR → במובייל יורדת תמונה קלה בהרבה במקום רוחב דסקטופ מלא. מחזיר '' אם הכתובת
   אינה ניתנת לאופטימיזציה (אז נשארים על src בודד). */
export function buildSrcSet(src, w = 1920, q = 'auto') {
  if (typeof src !== 'string' || !src) return ''
  // רק כתובות שבאמת עוברות טרנספורמציה (Cloudinary / Supabase / Unsplash)
  if (optimizeSrc(src, w, q) === src) return ''
  const ladder = [0.5, 0.75, 1, 1.5]
    .map((m) => Math.round(w * m))
    .filter((x, i, a) => x > 0 && a.indexOf(x) === i)
  return ladder.map((x) => `${optimizeSrc(src, x, q)} ${x}w`).join(', ')
}

// משתני CSS שמוחלים על תמונה כדי לכבד את התצוגות השמורות בכל breakpoint
export function responsiveStyle(value) {
  const ri = normalizeResponsiveImage(value)
  if (!ri) return {}
  const { mobile, desktop } = ri.views
  // בזום-אאוט (מתחת ל-100%) מציגים את כל התמונה (contain) בלי חיתוך — לפי הפרופורציות
  const fitOf = (v) => ((v.zoom || 1) < 1 ? 'contain' : v.objectFit)
  return {
    '--ri-fit-d': fitOf(desktop),
    '--ri-pos-d': desktop.objectPosition,
    '--ri-scale-d': desktop.zoom || 1,
    '--ri-rad-d': `${desktop.radius || 0}px`,
    '--ri-fit-m': fitOf(mobile),
    '--ri-pos-m': mobile.objectPosition,
    '--ri-scale-m': mobile.zoom || 1,
    '--ri-rad-m': `${mobile.radius || 0}px`,
  }
}
