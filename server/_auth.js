// One admin check for every site handler (the content engine, image and video tools, Metricool, status).
//
// Sign-up is open, so a valid session alone is not enough: the account must be site staff
// (public.site_staff, or a finance admin) — the same rule the database enforces on the site tables
// (supabase/site_staff.sql). These handlers spend the Anthropic / OpenAI keys and schedule posts,
// so they follow it too. Until site_staff.sql is installed (the function answers 404) a signed-in
// account is accepted, as before.
const base = () => String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const anon = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const service = () => process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const bearer = (req) => String((req && req.headers && req.headers['authorization']) || '').replace(/^Bearer\s+/i, '').trim()

export async function isStaff(token) {
  const url = base(), key = anon() || service()
  if (!url || !key || !token) return false
  const r = await fetch(`${url}/rest/v1/rpc/is_site_staff`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null)
  if (!r) return false
  if (r.status === 404) return true   // the staff list is not installed in this database
  if (!r.ok) return false
  return (await r.json().catch(() => false)) === true
}

/** The signed-in staff account behind the request, or null. */
export async function adminUser(req) {
  const url = base(), key = service() || anon(), token = bearer(req)
  if (!token || !url || !key) return null
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json().catch(() => null)
  if (!u || !u.id) return null
  return (await isStaff(token)) ? u : null
}
