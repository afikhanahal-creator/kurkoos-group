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
