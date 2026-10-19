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
/* spec: מה שהאתר מציג היום, נמדד בדפדפן ב-19.10.2026 על 21 עמודים ברוחב מחשב (1440) ונייד (390).
   d = גודל במחשב, m = גודל בנייד, w = המשקל שהאתר מבקש, fam = פונט הכותרות או פונט הגוף.
   where = איפה הרמה הזו מופיעה באתר בפועל. */
export const TYPE_LEVELS = [
  { key: 'hero',  label: 'כותרת ענק (Hero)', tag: 'Hero', cssVar: '--fs-hero',    targets: '.hero__title,.hl-hero__title,.division-hero__title,.cx-hero__title', sample: 'בונים את הבית הבא שלכם',
    spec: { d: 68, m: 46.4, w: 900, lh: 1.05, ls: -0.02, fam: 'heading', where: 'פתיחת עמוד הבית, החטיבות ועמודי הנחיתה' } },
  { key: 'h1',    label: 'כותרת ראשית',      tag: 'H1',   cssVar: '--fs-h1',      selector: 'h1',  targets: '.page-header__title,.hero-collage__title,.story__title', sample: 'כותרת ראשית לדוגמה',
    spec: { d: 56, m: 36.8, w: 800, lh: 1.08, ls: -0.02, fam: 'heading', where: 'כותרת העמוד באודות, צוות, קריירה, בלוג, מדריכים' } },
  { key: 'h2',    label: 'כותרת מקטע',       tag: 'H2',   cssVar: '--fs-h2',      selector: 'h2',  targets: '.section-title', sample: 'כותרת מקטע לדוגמה',
    spec: { d: 35.2, m: 31.2, w: 900, lh: 1.12, ls: -0.018, fam: 'heading', where: 'כותרות הסקשנים בכל העמודים' } },
  { key: 'h3',    label: 'תת-כותרת',         tag: 'H3',   cssVar: '--fs-h3',      selector: 'h3',  sample: 'תת-כותרת לדוגמה',
    spec: { d: 20.8, m: 20.8, w: 900, lh: 1.25, ls: -0.01, fam: 'heading', where: 'כותרות כרטיסים: פרויקטים, כתבות, שלבים' } },
  { key: 'h4',    label: 'כותרת קטנה',       tag: 'H4',   selector: 'h4',         sample: 'כותרת קטנה לדוגמה',
    spec: { d: 16.8, m: 16.8, w: 700, lh: 1.3, ls: 0, fam: 'heading', where: 'מעט מאוד מקומות' } },
  { key: 'h5',    label: 'כותרת זעירה',      tag: 'H5',   selector: 'h5',         sample: 'כותרת זעירה לדוגמה',
    spec: { d: 13.3, m: 13.3, w: 900, lh: 1.3, ls: 0, fam: 'heading', where: 'לא בשימוש כרגע' } },
  { key: 'lead',  label: 'טקסט מוביל',       tag: 'Lead', cssVar: '--fs-body-lg', targets: '.section-lead', sample: 'משפט פתיחה שמוביל את הקורא פנימה.',
    spec: { d: 18.4, m: 18.4, w: 400, lh: 1.65, ls: 0, fam: 'body', where: 'הפסקה שמתחת לכותרות הסקשנים' } },
  { key: 'body',  label: 'טקסט רץ (גוף)',    tag: 'P',    cssVar: '--fs-body',    selector: 'body', sample: 'טקסט רץ רגיל של פסקאות התוכן באתר.',
    spec: { d: 16, m: 16, w: 400, lh: 1.65, ls: 0, fam: 'body', where: 'כל הפסקאות, הכתבות והטפסים' } },
  { key: 'small', label: 'טקסט קטן',         tag: 'Small', cssVar: '--fs-small',  selector: 'small', sample: 'הערות שוליים ותוויות קטנות.',
    spec: { d: 13.3, m: 13.3, w: 400, lh: 1.6, ls: 0, fam: 'body', where: 'תאריכים, הערות, תוויות בכרטיסים' } },
]
/* המשקלים שקבצי הפונט באמת כוללים. Heebo נטען מ-Google כפונט משתנה, כל משקל קיים.
   Almoni מותקן בשלושה קבצים: 300, 400 (מוצג גם כ-500) ו-700 (מוצג גם כ-600 עד 900). */
export const FONT_FILES = {
  Heebo: { source: 'Google Fonts, פונט משתנה', weights: { 300: 300, 400: 400, 500: 500, 600: 600, 700: 700, 800: 800, 900: 900 } },
  Almoni: { source: 'קבצים באתר (public/fonts)', weights: { 300: 300, 400: 400, 500: 400, 600: 700, 700: 700, 800: 700, 900: 700 } },
}
/* חלק המשקלים מכל הטקסט באתר, לפי מספר התווים שמוצגים במחשב (19.10.2026) */
export const WEIGHT_USAGE = {
  Almoni: { 400: 71.4, 600: 5.1, 700: 1.2, 500: 0.1, 800: 0.1 },
  Heebo: { 700: 9.1, 900: 6.7, 600: 3.8, 800: 1.6, 500: 0.5, 400: 0.2 },
}
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
  let desk = ''
  let all = ''
  TYPE_LEVELS.forEach((lvl) => {
    const cfg = scale[lvl.key] || {}
    const size = Number(cfg.size) > 0 ? Number(cfg.size) : null
    const weight = Number(cfg.weight) > 0 ? Number(cfg.weight) : null
    if (lvl.cssVar) root.style.removeProperty(lvl.cssVar)   // older versions set the variable inline on every screen
    const sel = [lvl.selector, lvl.targets].filter(Boolean).join(',')
    // הגודל שנבחר הוא הגודל במחשב, ומוחל מ-981 פיקסלים ומעלה. בנייד נשאר הגודל של העיצוב.
    if (size) {
      if (lvl.cssVar) desk += `:root{${lvl.cssVar}:${size}px}`
      if (sel && lvl.key !== 'body') desk += `${sel}{font-size:${size}px !important}`
    }
    if (weight && sel) all += `${sel}{font-weight:${weight} !important}\n`
  })
  const css = (desk ? `@media (min-width: 981px){${desk}}\n` : '') + all
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
