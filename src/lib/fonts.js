/* ============================================================
   ניהול פונטים — מקור-אמת אחד להחלפת הפונטים של האתר.
   • GOOGLE_FONTS: רשימת פונטים עבריים ברישיון חופשי (OFL).
   • applyFonts(settings): מחיל את הבחירה מה-CMS על האתר בזמן ריצה
     (מזריק <link>/@font-face ודורס את --font-heading/--font-body).
   הערכים נשמרים ב-site_settings תחת המפתחות font_heading / font_body.
   ============================================================ */

// פונטים עבריים ברישיון חופשי (Google Fonts · SIL OFL — מותר מסחרי)
export const GOOGLE_FONTS = [
  { family: 'Heebo',            category: 'sans',    weights: [300, 400, 500, 600, 700, 800] },
  { family: 'Assistant',        category: 'sans',    weights: [300, 400, 500, 600, 700, 800] },
  { family: 'Rubik',            category: 'sans',    weights: [300, 400, 500, 600, 700, 900] },
  { family: 'Noto Sans Hebrew', category: 'sans',    weights: [300, 400, 500, 600, 700, 900] },
  { family: 'Alef',             category: 'sans',    weights: [400, 700] },
  { family: 'Secular One',      category: 'display', weights: [400] },
  { family: 'Karantina',        category: 'display', weights: [300, 400, 700] },
  { family: 'Frank Ruhl Libre', category: 'serif',   weights: [300, 400, 500, 700, 900] },
  { family: 'David Libre',      category: 'serif',   weights: [400, 500, 700] },
  { family: 'Suez One',         category: 'serif',   weights: [400] },
]

const FALLBACK = {
  sans: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  display: 'system-ui, sans-serif',
}

// בונה את ה-font stack (משפחה + fallback) לפי קטגוריה
export function fontStack(family, category = 'sans') {
  return `'${family}', ${FALLBACK[category] || FALLBACK.sans}`
}

// פורמט @font-face לפי סיומת הקובץ
function srcFormat(url) {
  const ext = (url.split('.').pop() || '').toLowerCase().split('?')[0]
  return { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[ext] || 'woff2'
}

function googleHref(picks) {
  const seen = new Set()
  const fams = []
  picks.forEach((p) => {
    if (p && p.source === 'google' && p.family && !seen.has(p.family)) {
      seen.add(p.family)
      const w = (p.weights && p.weights.length ? p.weights : [400]).join(';')
      fams.push(`family=${encodeURIComponent(p.family).replace(/%20/g, '+')}:wght@${w}`)
    }
  })
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.join('&')}&display=swap` : ''
}

/* מחיל את בחירת הפונטים על ה-DOM. בטוח להרצה חוזרת (idempotent). */
export function applyFonts(settings = {}) {
  if (typeof document === 'undefined') return
  const heading = settings.font_heading || null
  const body = settings.font_body || null
  const picks = [heading, body].filter(Boolean)

  // 1) <link> ל-Google Fonts (אם נבחרו)
  const href = googleHref(picks)
  let link = document.getElementById('cms-font-google')
  if (href) {
    if (!link) {
      link = document.createElement('link')
      link.id = 'cms-font-google'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    if (link.href !== href) link.href = href
  } else if (link) {
    link.remove()
  }

  // 2) @font-face לפונטים מותאמים (שהועלו) + דריסת המשתנים
  let css = ''
  picks.forEach((p) => {
    if (p.source === 'custom' && p.url && p.family) {
      css += `@font-face{font-family:'${p.family}';src:url('${p.url}') format('${srcFormat(p.url)}');font-weight:300 800;font-style:normal;font-display:swap;}\n`
    }
  })
  const vars = []
  if (heading && heading.stack) vars.push(`--font-heading:${heading.stack};--font-display:${heading.stack};`)
  if (body && body.stack) vars.push(`--font-body:${body.stack};--font-sans:${body.stack};`)
  if (vars.length) css += `:root{${vars.join('')}}\n`

  let style = document.getElementById('cms-fonts')
  if (css) {
    if (!style) {
      style = document.createElement('style')
      style.id = 'cms-fonts'
      document.head.appendChild(style)
    }
    if (style.textContent !== css) style.textContent = css
  } else if (style) {
    style.remove()
  }
}

/* ============================================================
   סולם טיפוגרפי (Type Scale) — שליטה בגדלים ובמשקלים של כל רמת
   טקסט באתר (Hero / H1–H5 / טקסט מוביל / גוף / קטן) מתוך האדמין.
   נשמר ב-site_settings תחת 'type_scale' (JSON). ערך ריק = ברירת
   המחדל של העיצוב — כלום לא משתנה עד שבוחרים ערך במפורש.
   ============================================================ */
export const TYPE_LEVELS = [
  { key: 'hero',  label: 'כותרת ענק (Hero)', tag: 'Hero', cssVar: '--fs-hero',    sample: 'בונים את הבית הבא שלכם' },
  { key: 'h1',    label: 'כותרת ראשית',      tag: 'H1',   cssVar: '--fs-h1',      selector: 'h1',  sample: 'כותרת ראשית לדוגמה' },
  { key: 'h2',    label: 'כותרת מקטע',       tag: 'H2',   cssVar: '--fs-h2',      selector: 'h2',  sample: 'כותרת מקטע לדוגמה' },
  { key: 'h3',    label: 'תת-כותרת',         tag: 'H3',   cssVar: '--fs-h3',      selector: 'h3',  sample: 'תת-כותרת לדוגמה' },
  { key: 'h4',    label: 'כותרת קטנה',       tag: 'H4',   selector: 'h4',         sample: 'כותרת קטנה לדוגמה' },
  { key: 'h5',    label: 'כותרת זעירה',      tag: 'H5',   selector: 'h5',         sample: 'כותרת זעירה לדוגמה' },
  { key: 'lead',  label: 'טקסט מוביל',       tag: 'Lead', cssVar: '--fs-body-lg', sample: 'משפט פתיחה שמוביל את הקורא פנימה.' },
  { key: 'body',  label: 'טקסט רץ (גוף)',    tag: 'P',    cssVar: '--fs-body',    selector: 'body', sample: 'טקסט רץ רגיל של פסקאות התוכן באתר.' },
  { key: 'small', label: 'טקסט קטן',         tag: 'Small', cssVar: '--fs-small',  sample: 'הערות שוליים ותוויות קטנות.' },
]
export const TYPE_WEIGHTS = [300, 400, 500, 600, 700, 800, 900]

export function parseTypeScale(v) {
  if (!v) return {}
  try { const o = typeof v === 'string' ? JSON.parse(v) : v; return o && typeof o === 'object' ? o : {} } catch { return {} }
}

/* מחיל את הסולם על האתר: גדלים דרך משתני ה-CSS הקיימים (--fs-*),
   ומשקלים/גדלים לתגיות בלי משתנה (h4/h5) דרך כללי style מוזרקים.
   בטוח להרצה חוזרת; ללא ערכים — מנקה הכול וחוזרים לברירת המחדל. */
export function applyTypeScale(settings = {}) {
  if (typeof document === 'undefined') return
  const scale = parseTypeScale(settings.type_scale)
  const root = document.documentElement
  let css = ''
  TYPE_LEVELS.forEach((lvl) => {
    const cfg = scale[lvl.key] || {}
    const size = Number(cfg.size) > 0 ? Number(cfg.size) : null
    const weight = Number(cfg.weight) > 0 ? Number(cfg.weight) : null
    if (lvl.cssVar) {
      if (size) root.style.setProperty(lvl.cssVar, `${size}px`)
      else root.style.removeProperty(lvl.cssVar)
    } else if (lvl.selector && size) {
      css += `${lvl.selector}{font-size:${size}px !important;}\n`
    }
    if (weight && lvl.selector) css += `${lvl.selector}{font-weight:${weight} !important;}\n`
  })
  let style = document.getElementById('cms-type-scale')
  if (css) {
    if (!style) {
      style = document.createElement('style')
      style.id = 'cms-type-scale'
      document.head.appendChild(style)
    }
    if (style.textContent !== css) style.textContent = css
  } else if (style) {
    style.remove()
  }
}
