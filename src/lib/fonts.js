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
