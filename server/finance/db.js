import { env, BUCKET, QUOTA_BYTES } from './env.js'

const headers = (extra = {}) => ({ apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}`, ...extra })

/* PostgREST with the service role (bypasses RLS: the server checks the caller's role itself) */
export async function sb(path, { method = 'GET', body, prefer = 'return=representation' } = {}) {
  const r = await fetch(`${env.sbUrl()}/rest/v1/${path}`, {
    method,
    headers: headers({ 'Content-Type': 'application/json', Prefer: prefer }),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!r.ok) { const e = new Error((data && data.message) || `supabase ${r.status}`); e.status = r.status; e.code = data && data.code; throw e }
  return data
}
export const one = async (path) => (await sb(path))?.[0] || null
export const insert = async (table, row, prefer) => (await sb(table, { method: 'POST', body: row, prefer }))?.[0] || null
export const patch = async (path, body) => (await sb(path, { method: 'PATCH', body }))?.[0] || null
export const q = encodeURIComponent

export async function rpc(fn, args = {}, token) {
  const r = await fetch(`${env.sbUrl()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: token ? { apikey: env.sbKey(), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(args),
  })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error((d && d.message) || `rpc ${fn} ${r.status}`)
  return d
}

/* share of the 1 GB free quota in use (null when the function is missing) */
export async function storageUsage() {
  try { const u = await rpc('storage_usage'); return u && typeof u.storage_bytes === 'number' ? u.storage_bytes / QUOTA_BYTES : null } catch { return null }
}

export async function upload(path, buf, mime) {
  const r = await fetch(`${env.sbUrl()}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': mime, 'cache-control': 'max-age=31536000', 'x-upsert': 'true' }),
    body: buf,
  })
  if (!r.ok) throw new Error(`storage upload ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

export async function download(path) {
  const r = await fetch(`${env.sbUrl()}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: headers() })
  if (!r.ok) throw new Error(`storage download ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

/* the signed-in caller, with their finance role */
export async function caller(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || !env.sbUrl() || !env.sbKey()) return null
  const r = await fetch(`${env.sbUrl()}/auth/v1/user`, { headers: { apikey: env.sbKey(), Authorization: `Bearer ${token}` } }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json().catch(() => null)
  if (!u || !u.id) return null
  const m = await one(`fin_members?user_id=eq.${u.id}&active=eq.true&select=*`)
  return { id: u.id, email: u.email, token, role: m?.role || null, business_ids: m?.business_ids || null }
}

export async function audit(entity, entityId, action, changes, user) {
  await sb('fin_audit', { method: 'POST', body: { entity, entity_id: entityId ? String(entityId) : null, action, changes: changes || null, user_id: user?.id || null, user_email: user?.email || 'agent' }, prefer: 'return=minimal' }).catch(() => {})
}

/* one row per agent per batch, so the "AI agents" screen shows what really ran */
export async function agentRun(agent, trigger) {
  const row = await insert('fin_agent_runs', { agent, trigger }).catch(() => null)
  const stat = { processed: 0, errors: 0, details: {} }
  return {
    stat,
    async done(status) {
      if (!row) return
      const s = status || (stat.errors && stat.processed ? 'partial' : stat.errors ? 'error' : 'ok')
      await patch(`fin_agent_runs?id=eq.${row.id}`, { finished_at: new Date().toISOString(), status: s, processed: stat.processed, errors: stat.errors, details: stat.details }).catch(() => {})
    },
  }
}
