import { supabase } from './supabase.js'

/* הודעות ואוטומציות (אינסטגרם ופייסבוק): כל הקריאות עוברות דרך פונקציית השרת "dm".
   הטוקנים של פייסבוק נשמרים רק בשרת ולא מגיעים לדפדפן. */
const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dm`

export async function dm(a, extra = {}) {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw Object.assign(new Error('צריך להתחבר לאדמין'), { code: 'not_signed_in' })
  const r = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ a, ...extra }),
  })
  let d = {}
  try { d = await r.json() } catch { /* empty */ }
  if (!r.ok) throw Object.assign(new Error(d.error || `שגיאה ${r.status}`), { code: d.code })
  return d
}
