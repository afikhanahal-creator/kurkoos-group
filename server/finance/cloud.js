// Cloud sync: copies of documents go to a folder in Google Drive or Dropbox, one subfolder per company and month.
// Google Drive uses the drive.file scope (the app sees only the files it created). Dropbox uses a scoped app
// with files.content.write. Tokens live in fin_cloud_secrets (server only). Originals stay in our storage.
import { env } from './env.js'
import { fetchRetry, json } from './http.js'
import { sb, one, insert, patch, download, audit, rpc } from './db.js'
import { agentRun } from './db.js'
import { TIME_BUDGET_MS } from './env.js'

const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
const asciiJson = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)

export const CLOUD = {
  gdrive: {
    label: 'Google Drive',
    configured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    authUrl: (state, redirectUri) => `${env.googleAuthorize()}?${new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file openid email', access_type: 'offline', prompt: 'consent', state })}`,
    async exchange(code, redirectUri) {
      const t = await json(await fetchRetry(`${env.googleOauth()}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectUri }) }), 'google token')
      const me = await json(await fetchRetry(env.googleUserinfo(), { headers: { Authorization: `Bearer ${t.access_token}` } }), 'google userinfo')
      return { email: String(me.email || '').toLowerCase(), ...t }
    },
    refresh: async (rt) => json(await fetchRetry(`${env.googleOauth()}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: rt }) }), 'google token'),
    revoke: async (rt) => { await fetch(`${env.googleOauth()}/revoke?token=${encodeURIComponent(rt)}`, { method: 'POST' }).catch(() => {}) },
    async ensureFolder(token, parts, cache) {
      let parent = 'root'; let key = ''
      for (const name of parts) {
        key = `${key}/${name}`
        if (cache[key]) { parent = cache[key]; continue }
        const qy = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`
        const found = await json(await fetchRetry(`${env.driveApi()}/files?q=${encodeURIComponent(qy)}&fields=files(id)`, { headers: { Authorization: `Bearer ${token}` } }), 'drive list')
        const id = found.files?.[0]?.id || (await json(await fetch(`${env.driveApi()}/files?fields=id`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }) }), 'drive folder')).id
        cache[key] = id; parent = id
      }
      return parent
    },
    async upload(token, args) {
      try { return await this.uploadOnce(token, args) } catch (e) {
        if (e.status !== 404) throw e
        for (const k of Object.keys(args.cache)) delete args.cache[k]
        return this.uploadOnce(token, args)
      }
    },
    async uploadOnce(token, { parts, fileName, mime, buf, cache }) {
      const parent = await this.ensureFolder(token, parts, cache)
      const boundary = `kurkoos${Date.now()}`
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: fileName, parents: [parent] })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
        buf, Buffer.from(`\r\n--${boundary}--`),
      ])
      const r = await json(await fetch(`${env.driveUpload()}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body }), 'drive upload')
      return { id: r.id, path: `/${[...parts, fileName].join('/')}` }
    },
  },
  dropbox: {
    label: 'Dropbox',
    configured: () => !!(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET),
    authUrl: (state, redirectUri) => `${env.dropboxAuth()}?${new URLSearchParams({ client_id: process.env.DROPBOX_APP_KEY, response_type: 'code', token_access_type: 'offline', redirect_uri: redirectUri, state })}`,
    async exchange(code, redirectUri) {
      const t = await json(await fetchRetry(`${env.dropboxApi()}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: process.env.DROPBOX_APP_KEY, client_secret: process.env.DROPBOX_APP_SECRET }) }), 'dropbox token')
      const me = await json(await fetchRetry(`${env.dropboxApi()}/2/users/get_current_account`, { method: 'POST', headers: { Authorization: `Bearer ${t.access_token}` } }), 'dropbox account')
      return { email: String(me.email || '').toLowerCase(), ...t }
    },
    refresh: async (rt) => json(await fetchRetry(`${env.dropboxApi()}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt, client_id: process.env.DROPBOX_APP_KEY, client_secret: process.env.DROPBOX_APP_SECRET }) }), 'dropbox token'),
    revoke: async (rt, token) => {
      try { token = (await CLOUD.dropbox.refresh(rt)).access_token || token } catch { /* already revoked */ }
      if (token) await fetch(`${env.dropboxApi()}/2/auth/token/revoke`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    },
    async upload(token, { parts, fileName, buf }) {
      const path = `/${[...parts, fileName].join('/')}`
      const r = await json(await fetch(`${env.dropboxContent()}/2/files/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': asciiJson({ path, mode: 'add', autorename: true, mute: true }) }, body: buf }), 'dropbox upload')
      return { id: r.id, path: r.path_display || path }
    },
  },
}

async function tokenFor(target) {
  const s = await one(`fin_cloud_secrets?target_id=eq.${target.id}&select=*`)
  if (!s) { const e = new Error('החיבור חסר. חברו מחדש'); e.auth = true; throw e }
  if (s.access_token && s.expires_at && new Date(s.expires_at).getTime() - Date.now() > 60_000) return { token: s.access_token, secret: s }
  try {
    const t = await CLOUD[target.provider].refresh(s.refresh_token)
    await patch(`fin_cloud_secrets?target_id=eq.${target.id}`, { access_token: t.access_token, refresh_token: t.refresh_token || s.refresh_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() })
    return { token: t.access_token, secret: s }
  } catch (e) {
    if (e.status === 400 || e.status === 401 || e.code === 'invalid_grant') { const err = new Error('ההרשאה בוטלה או פגה. חברו מחדש'); err.auth = true; throw err }
    throw e
  }
}

export function partsFor(target, doc, names) {
  const period = doc.accounting_period || String(doc.issue_date || doc.created_at || '').slice(0, 7) || 'ללא תאריך'
  const company = names.businesses[doc.business_id] || 'ללא חברה'
  const project = names.projects[doc.project_id] || 'ללא פרויקט'
  const sub = target.structure.replace('{company}', company).replace('{period}', period).replace('{project}', project).split('/').map(safe).filter(Boolean)
  return [safe(target.folder) || 'Kurkoos Finance', ...sub]
}
export function fileNameFor(doc) {
  const ext = doc.file_mime === 'application/pdf' ? 'pdf' : (doc.file_mime || '').startsWith('text/') ? 'html' : (doc.file_mime || 'image/jpeg').split('/')[1]
  return `${doc.issue_date || String(doc.created_at).slice(0, 10)}_${safe(doc.supplier_name) || 'מסמך'}${doc.doc_number ? `_${safe(doc.doc_number)}` : ''}_${doc.id.slice(0, 6)}.${ext}`
}

/* copies the matching documents that were not copied yet. Idempotent: fin_cloud_synced holds one row per (folder, document). */
export async function syncCloud({ targetId, started = Date.now(), trigger = 'manual' } = {}) {
  const targets = (await sb(`fin_cloud_targets?enabled=eq.true&status=in.(active,error)${targetId ? `&id=eq.${targetId}` : ''}&select=*`)) || []
  if (!targets.length) return []
  const run = await agentRun('cloud', trigger)
  const names = {
    businesses: Object.fromEntries(((await sb('fin_businesses?select=id,name')) || []).map((b) => [b.id, b.name])),
    projects: Object.fromEntries(((await sb('fin_projects?select=id,name')) || []).map((p) => [p.id, p.name])),
  }
  const results = []
  for (const t of targets) {
    // lock: the cron and the button must not copy the same target at the same time
    const locked = await rpc('fin_cloud_lock', { p_target: t.id }).catch(() => false)
    if (locked !== true) { results.push({ target: t.id, provider: t.provider, copied: 0, busy: true, error: null }); continue }
    let copied = 0; let failed = 0; let error = null; let lastFail = null
    try {
      const { token, secret } = await tokenFor(t)
      const cache = { ...(secret.folder_cache || {}) }
      const skip = new Set()
      let more = true
      while (more && Date.now() - started < TIME_BUDGET_MS) {
        const docs = ((await rpc('fin_cloud_pending', { p_target: t.id, p_limit: 200 })) || []).filter((d) => !skip.has(d.id))
        if (!docs.length) break
        for (const d of docs) {
          if (Date.now() - started > TIME_BUDGET_MS) { more = false; break }
          try {
            const buf = await download(d.file_path)
            const up = await CLOUD[t.provider].upload(token, { parts: partsFor(t, d, names), fileName: fileNameFor(d), mime: d.file_mime || 'application/pdf', buf, cache })
            await insert('fin_cloud_synced', { target_id: t.id, document_id: d.id, remote_id: up.id, path: up.path }, 'resolution=ignore-duplicates,return=minimal')
            copied++; run.stat.processed++
          } catch (e) {
            if (e.auth || e.status === 401) throw e          // the whole connection is broken, not this file
            failed++; skip.add(d.id); run.stat.errors++
            lastFail = `${d.file_name || d.id}: ${String(e.message || e).slice(0, 160)}`
          }
        }
      }
      await patch(`fin_cloud_secrets?target_id=eq.${t.id}`, { folder_cache: cache })
    } catch (e) {
      error = String(e.message || e).slice(0, 300); run.stat.errors++
      if (e.auth || e.status === 401) await patch(`fin_cloud_targets?id=eq.${t.id}`, { status: 'error' }).catch(() => {})
    }
    if (!error && failed) error = `${failed} מסמכים לא הועתקו (ינסו שוב בסנכרון הבא). ${lastFail}`.slice(0, 300)
    await patch(`fin_cloud_targets?id=eq.${t.id}`, { syncing_until: null, last_sync_at: new Date().toISOString(), last_error: error, files_failed: failed, files_synced: (t.files_synced || 0) + copied, ...(error && !failed ? {} : { status: 'active' }) }).catch(() => {})
    results.push({ target: t.id, provider: t.provider, copied, failed, error })
  }
  run.stat.details.results = results
  await run.done()
  return results
}

export async function connectCloud(provider, t, st) {
  let target = await one(`fin_cloud_targets?provider=eq.${provider}&account_email=eq.${encodeURIComponent(t.email)}&select=*`)
  if (!target) target = await insert('fin_cloud_targets', { provider, account_email: t.email, connected_by: st.u })
  else await patch(`fin_cloud_targets?id=eq.${target.id}`, { status: 'active', last_error: null, enabled: true })
  const existing = await one(`fin_cloud_secrets?target_id=eq.${target.id}&select=refresh_token`)
  const refresh = t.refresh_token || existing?.refresh_token
  if (!refresh) throw new Error('no_refresh')
  await sb('fin_cloud_secrets', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { target_id: target.id, refresh_token: refresh, access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() } })
  await audit('cloud', target.id, 'connected', { provider, email: t.email }, { id: st.u, email: st.e })
  return target
}
