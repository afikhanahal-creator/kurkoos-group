/* ============================================================
   שכבת לקוח לדשבורד האנליטיקס — קוראת ל-/api/analytics עם
   טוקן האדמין. כל הנתונים אמיתיים מ-GA4; אין נתוני דמו.
   ============================================================ */
import { supabase } from './supabase.js'

async function call(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('נדרשת התחברות')
  const res = await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `שגיאה (${res.status})`)
  return out
}

export const fetchDashboard = (start, end) => call({ type: 'dashboard', start, end })
export const fetchRealtime = () => call({ type: 'realtime' })
export const testConnection = () => call({ type: 'test' })
export const fetchPageDetail = (path, start, end) => call({ type: 'page', path, start, end })

/* ---- גבולות יום בשעון ישראל ----
   דוחות GA4 של הנכס נספרים לפי ימים בשעון ישראל. ספירת הלידים מהמסד
   חייבת להשתמש באותם גבולות בדיוק, אחרת ליד שנכנס ב-01:00 בלילה
   נופל ליום הקודם (UTC) ושני המספרים לא מתייחסים לאותה תקופה.
   ההיסט מחושב לכל תאריך בנפרד, כך ששעון קיץ וחורף מטופלים נכון. */
const JLM = 'Asia/Jerusalem'
function offsetMinutes(isoDate, time) {
  // מפרשים את הרגע כאילו הוא UTC, ושואלים כמה שעון ישראל מקדים אותו
  const probe = new Date(`${isoDate}T${time}Z`)
  // דיוק של שניות חובה: בלי השניות, גשוש של 23:59:59 יצא ב-+02:59 במקום
  // +03:00, וסוף היום זלג דקה לתוך היום הבא
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JLM, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(probe).reduce((o, p) => (o[p.type] = p.value, o), {})
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return Math.round((local - probe.getTime()) / 60000)
}
export function jerusalemBounds(start, end) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0')
  const off = (m) => `${m >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}`
  return {
    from: `${start}T00:00:00.000${off(offsetMinutes(start, '00:00:00'))}`,
    to: `${end}T23:59:59.999${off(offsetMinutes(end, '23:59:59'))}`,
  }
}

/* ---- עזרי פירוק דוח GA4 ---- */
export function rows(report) {
  return (report?.rows || []).map((r) => ({
    d: (r.dimensionValues || []).map((v) => v.value),
    m: (r.metricValues || []).map((v) => Number(v.value) || 0),
  }))
}
export function totalsOf(report) {
  const r = rows(report)[0]
  return r ? r.m : []
}
