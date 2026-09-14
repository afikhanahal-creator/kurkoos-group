/* ============================================================
   עקבות ביקור — באיזה עמודים הגולש היה לפני שהשאיר פרטים.
   נשמר ב-sessionStorage (לביקור הנוכחי בלבד, נמחק בסגירת הטאב).
   שני שימושים:
   1) לידים — מצרפים לליד את הפרויקט שבו התעניין + מסלול הגלישה
   2) ניוזלטר — מצרפים להרשמה את העמוד והפרויקט האחרון שנצפה
   ============================================================ */

const TRAIL_KEY = 'kc_visit_trail'
const PROJECT_KEY = 'kc_last_project'
const MAX_TRAIL = 8

const LABELS = [
  [/^\/$/, 'דף הבית'],
  [/^\/projects\/.+/, 'עמוד פרויקט'],
  [/^\/projects/, 'כל הפרויקטים'],
  [/^\/divisions\/residential/, 'מגורים'],
  [/^\/divisions\/execution/, 'ביצוע'],
  [/^\/divisions\/development/, 'יזמות'],
  [/^\/divisions\/supervision/, 'פיקוח פרויקטים'],
  [/^\/divisions\/brokerage/, 'תיווך'],
  [/^\/livy-yazamim/, 'מנטורינג'],
  [/^\/madrich-yazamim/, 'המדריך ליזמים צעירים'],
  [/^\/yazamut-nadlan/, 'טור יזמות נדל"ן'],
  [/^\/constructions/, 'טור ביצוע ובנייה'],
  [/^\/construction-supervision/, 'טור פיקוח'],
  [/^\/real-estate-guide/, 'המדריך לרוכש ולמוכר'],
  [/^\/team/, 'הצוות'],
  [/^\/about/, 'אודות'],
  [/^\/blog/, 'בלוג'],
  [/^\/careers/, 'קריירה'],
]

export function labelFor(pathname) {
  for (const [re, label] of LABELS) if (re.test(pathname)) return label
  return pathname
}

function read(key) {
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : null } catch { return null }
}
function write(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

/* נקרא על כל מעבר עמוד (מה-Router) */
export function notePage(pathname) {
  if (!pathname || pathname.startsWith('/admin')) return
  const trail = read(TRAIL_KEY) || []
  const label = labelFor(pathname)
  const last = trail[trail.length - 1]
  if (last && last.p === pathname) return   // רענון של אותו עמוד — לא מכפילים
  trail.push({ p: pathname, l: label })
  write(TRAIL_KEY, trail.slice(-MAX_TRAIL))
}

/* נקרא מעמוד פרויקט ברגע שהפרויקט נטען — שם מדויק */
export function noteProject(name, slug) {
  const clean = String(name || '').trim().slice(0, 80)
  if (!clean) return
  write(PROJECT_KEY, { name: clean, slug: String(slug || '') })
  // מעדכנים גם את התווית בעקבות — "עמוד פרויקט" הופך לשם האמיתי
  const trail = read(TRAIL_KEY) || []
  const last = trail[trail.length - 1]
  if (last && /^\/projects\/.+/.test(last.p)) {
    last.l = `פרויקט ${clean}`
    write(TRAIL_KEY, trail)
  }
}

/* הפרויקט האחרון שהגולש צפה בו בביקור הזה (או null) */
export function getLastProject() {
  return read(PROJECT_KEY)
}

/* 'דף הבית ← פרויקט הנרייטה ← מנטורינג' — לקריאה אנושית בהערות הליד */
export function trailSummary() {
  const trail = read(TRAIL_KEY) || []
  if (!trail.length) return ''
  return trail.map((t) => t.l).join(' ← ')
}

/* הקשר להרשמת ניוזלטר: העמוד הנוכחי + הפרויקט האחרון שנצפה */
export function newsletterContext() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const parts = [labelFor(path)]
  const proj = getLastProject()
  if (proj) parts.push(`התעניין ב: ${proj.name}`)
  return parts.join(' · ').slice(0, 120)
}
