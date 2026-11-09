// Cloud sync: copies of documents go to a folder in Google Drive or Dropbox, one subfolder per company and month.
// Google Drive uses the drive.file scope (the app sees only the files it created). Dropbox uses a scoped app
// with files.content.write. Tokens live in fin_cloud_secrets (server only). Originals stay in our storage.
import { env } from './env.js'
import { fetchRetry, json } from './http.js'
import { sb, one, insert, patch, download, audit, rpc, q } from './db.js'
import { agentRun } from './db.js'
import { TIME_BUDGET_MS } from './env.js'

const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
const driveLink = (id) => `https://drive.google.com/file/d/${id}/view`
const dropboxLink = (path) => `https://www.dropbox.com/home${encodeURI(String(path || '').split('/').slice(0, -1).join('/'))}?preview=${encodeURIComponent(String(path || '').split('/').pop())}`
// the calendar day in Israel (an email at 00:30 on the 1st belongs to that month, not to the previous one in UTC)
const IL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })
const israelDay = (t) => { const d = new Date(t || Date.now()); return Number.isNaN(d.getTime()) ? '' : IL_DAY.format(d) }
export const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const TYPE_HE = { invoice: 'חשבונית מס', invoice_receipt: 'חשבונית מס-קבלה', receipt: 'קבלה', credit: 'חשבונית זיכוי', supplier_bill: 'דרישת תשלום', payment_confirmation: 'אישור תשלום', proforma: 'חשבון עסקה', quote: 'הצעת מחיר', other: 'מסמך' }
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
      // the same name in the same folder is the same document (a second sync, a retry): keep the one that is there
      const qy = `name='${fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and '${parent}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`
      const there = await json(await fetchRetry(`${env.driveApi()}/files?q=${encodeURIComponent(qy)}&fields=files(id,webViewLink,size)`, { headers: { Authorization: `Bearer ${token}` } }), 'drive list')
      if (there.files?.[0]?.id && (!there.files[0].size || Number(there.files[0].size) === buf.length)) return { id: there.files[0].id, path: `/${[...parts, fileName].join('/')}`, link: there.files[0].webViewLink || driveLink(there.files[0].id), existed: true }
      const boundary = `kurkoos${Date.now()}`
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: fileName, parents: [parent] })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
        buf, Buffer.from(`\r\n--${boundary}--`),
      ])
      const r = await json(await fetch(`${env.driveUpload()}/files?uploadType=multipart&fields=id,webViewLink`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body }), 'drive upload')
      return { id: r.id, path: `/${[...parts, fileName].join('/')}`, link: r.webViewLink || driveLink(r.id) }
    },
    /* reads the file back: proves it is really there */
    async check(token, id) {
      const r = await json(await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(id)}?fields=id,name,size,webViewLink,trashed`, { headers: { Authorization: `Bearer ${token}` } }), 'drive get')
      return { ok: !!r.id && !r.trashed, name: r.name, link: r.webViewLink || driveLink(r.id) }
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
      // mode add without autorename: a file with the same name is the same document and is kept, not copied again
      const res = await fetch(`${env.dropboxContent()}/2/files/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': asciiJson({ path, mode: 'add', autorename: false, mute: true }) }, body: buf })
      if (res.status === 409) { const t = await res.text(); if (/path\/conflict\/file/.test(t)) return { id: null, path, link: dropboxLink(path), existed: true } ; const e = new Error(`dropbox upload: ${t.slice(0, 160)}`); e.status = 409; throw e }
      const r = await json(res, 'dropbox upload')
      return { id: r.id, path: r.path_display || path, link: dropboxLink(r.path_display || path) }
    },
    async check(token, id, path) {
      const r = await json(await fetchRetry(`${env.dropboxApi()}/2/files/get_metadata`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: asciiJson({ path: id || path }) }), 'dropbox metadata')
      return { ok: r['.tag'] === 'file', name: r.name, link: dropboxLink(r.path_display || path) }
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

/* the folder path of a document. {year} and {month} come from the date printed on the document (the arrival date only
   when none was read): "Kurkoos Finance/2026/11 נובמבר". The month number keeps the folders in calendar order. */
export function partsFor(target, doc, names) {
  const when = /^\d{4}-\d{2}/.test(String(doc.issue_date || '')) ? doc.issue_date : israelDay(doc.email_date || doc.created_at)
  const m = /^(\d{4})-(\d{2})/.exec(when) || /^(\d{4})-(\d{2})/.exec(new Date(when).toISOString?.() || '')
  const year = m ? m[1] : 'ללא תאריך'
  const month = m ? `${m[2]} ${HEB_MONTHS[Number(m[2]) - 1]}` : 'ללא תאריך'
  const period = doc.accounting_period || (m ? `${m[1]}-${m[2]}` : 'ללא תאריך')
  const company = names.businesses[doc.business_id] || 'ללא חברה'
  const project = names.projects[doc.project_id] || 'ללא פרויקט'
  const sub = String(target.structure || '{year}/{month}').replace('{company}', company).replace('{period}', period).replace('{project}', project).replace('{year}', year).replace('{month}', month).split('/').map(safe).filter(Boolean)
  return [safe(target.folder) || 'Kurkoos Finance', ...sub]
}
/* date_supplier_type_number.ext: "2026-11-03_חשמל ישראל_חשבונית מס_448812.pdf". Without a number, a short id keeps it unique. */
export function fileNameFor(doc) {
  const ext = doc.file_mime === 'application/pdf' ? 'pdf' : (doc.file_mime || '').startsWith('text/') ? 'html' : (doc.file_mime || 'image/jpeg').split('/')[1]
  const date = doc.issue_date || String(doc.created_at).slice(0, 10)
  return `${[date, safe(doc.supplier_name) || 'ספק לא ידוע', TYPE_HE[doc.doc_type] || 'מסמך', safe(doc.doc_number) || doc.id.slice(0, 8)].join('_')}.${ext}`
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
    let copied = 0; let failed = 0; let error = null; let lastFail = null; let authFailed = false
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
            await insert('fin_cloud_synced', { target_id: t.id, document_id: d.id, remote_id: up.id, path: up.path, web_link: up.link, file_name: fileNameFor(d) }, 'resolution=ignore-duplicates,return=minimal')
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
      authFailed = !!(e.auth || e.status === 401)
    }
    if (!error && failed) error = `${failed} מסמכים לא הועתקו (ינסו שוב בסנכרון הבא). ${lastFail}`.slice(0, 300)
    await patch(`fin_cloud_targets?id=eq.${t.id}`, { syncing_until: null, last_sync_at: new Date().toISOString(), last_error: error, files_failed: failed, files_synced: (t.files_synced || 0) + copied, ...(authFailed ? { status: 'error' } : error && !failed ? {} : { status: 'active' }) }).catch(() => {})
    results.push({ target: t.id, provider: t.provider, copied, failed, error })
  }
  run.stat.details.results = results
  await run.done()
  return results
}

const namesMap = async () => ({
  businesses: Object.fromEntries(((await sb('fin_businesses?select=id,name')) || []).map((b) => [b.id, b.name])),
  projects: Object.fromEntries(((await sb('fin_projects?select=id,name')) || []).map((p) => [p.id, p.name])),
})

/* "save to Drive" for chosen documents, now, whatever their status. Each result says what really happened. */
export async function saveDocsToCloud({ ids, targetId, user }) {
  const target = targetId ? await one(`fin_cloud_targets?id=eq.${targetId}&status=neq.revoked&select=*`) : (await sb('fin_cloud_targets?status=neq.revoked&enabled=eq.true&select=*&order=provider.desc,created_at.asc&limit=1'))?.[0]
  if (!target) { const e = new Error('אין תיקייה בענן מחוברת. חברו Google Drive במסך "סנכרון לענן"'); e.status = 409; throw e }
  // only documents this person may see, and only of the target's company when the target is limited to one
  let list = (await sb(`fin_documents?id=in.(${ids.map((i) => q(i)).join(',')})&select=*`)) || []
  const outside = []
  list = list.filter((d) => {
    const ok = (!user?.business_ids?.length || (d.business_id && user.business_ids.includes(d.business_id))) && (!target.business_id || d.business_id === target.business_id)
    if (!ok) outside.push(d.id)
    return ok
  })
  const done = Object.fromEntries(((await sb(`fin_cloud_synced?target_id=eq.${target.id}&document_id=in.(${ids.map((i) => q(i)).join(',')})&select=document_id,web_link,path`)) || []).map((r) => [r.document_id, r]))
  const { token, secret } = await tokenFor(target)
  const cache = { ...(secret.folder_cache || {}) }
  const names = await namesMap()
  const results = outside.map((id) => ({ id, ok: false, error: 'המסמך לא שייך לחברה של התיקייה הזו או שאין לך הרשאה אליו' }))
  for (const d of list) {
    if (done[d.id]) { results.push({ id: d.id, ok: true, already: true, link: done[d.id].web_link, path: done[d.id].path }); continue }
    if (!d.file_path) { results.push({ id: d.id, ok: false, error: 'אין קובץ מקור למסמך הזה' }); continue }
    try {
      const buf = await download(d.file_path)
      const up = await CLOUD[target.provider].upload(token, { parts: partsFor(target, d, names), fileName: fileNameFor(d), mime: d.file_mime || 'application/pdf', buf, cache })
      await insert('fin_cloud_synced', { target_id: target.id, document_id: d.id, remote_id: up.id, path: up.path, web_link: up.link, file_name: fileNameFor(d) }, 'resolution=merge-duplicates,return=minimal')
      results.push({ id: d.id, ok: true, link: up.link, path: up.path, ...(up.existed ? { already: true } : {}) })
    } catch (e) {
      if (e.auth || e.status === 401) { await patch(`fin_cloud_targets?id=eq.${target.id}`, { status: 'error', last_error: 'ההרשאה בוטלה או פגה. חברו מחדש' }).catch(() => {}); throw e }
      results.push({ id: d.id, ok: false, error: String(e.message || e).slice(0, 200) })
    }
  }
  await patch(`fin_cloud_secrets?target_id=eq.${target.id}`, { folder_cache: cache }).catch(() => {})
  const saved = results.filter((r) => r.ok && !r.already).length
  if (saved) await patch(`fin_cloud_targets?id=eq.${target.id}`, { files_synced: (target.files_synced || 0) + saved, last_sync_at: new Date().toISOString() }).catch(() => {})
  await audit('cloud', target.id, 'saved_documents', { provider: target.provider, saved, failed: results.filter((r) => !r.ok).length, ids: ids.slice(0, 50) }, user)
  return { provider: target.provider, account: target.account_email, results }
}

/* a real test: refresh the token, create (or find) the folder, upload a small file, read it back, keep the link */
export async function testCloud({ targetId, user }) {
  const target = await one(`fin_cloud_targets?id=eq.${targetId}&select=*`)
  if (!target || target.status === 'revoked') { const e = new Error('התיקייה לא מחוברת'); e.status = 404; throw e }
  const steps = []
  const finish = async (ok, link, error) => {
    await patch(`fin_cloud_targets?id=eq.${target.id}`, { last_test_at: new Date().toISOString(), last_test_ok: ok, last_test_link: link || null, last_test_error: error || null, ...(ok ? { status: 'active', last_error: null } : {}) }).catch(() => {})
    await audit('cloud', target.id, ok ? 'test_passed' : 'test_failed', { provider: target.provider, steps, error }, user)
    return { ok, link, steps, error }
  }
  try {
    const { token, secret } = await tokenFor(target); steps.push('התחברות')
    const cache = { ...(secret.folder_cache || {}) }
    const parts = [safe(target.folder) || 'Kurkoos Finance', 'בדיקת חיבור']
    const at = new Date()
    const name = `בדיקה_${at.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`
    const buf = Buffer.from(`בדיקת חיבור של KURKOOS FINANCE\n${at.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}\nאפשר למחוק את הקובץ הזה.\n`, 'utf8')
    if (target.provider === 'gdrive') { await CLOUD.gdrive.ensureFolder(token, parts, cache); steps.push('יצירת תיקייה') }
    const up = await CLOUD[target.provider].upload(token, { parts, fileName: name, mime: 'text/plain', buf, cache }); steps.push('העלאת קובץ')
    const back = await CLOUD[target.provider].check(token, up.id, up.path)
    if (!back.ok) return finish(false, null, 'הקובץ הועלה אבל לא נמצא בבדיקה חוזרת')
    steps.push('הקובץ נמצא בתיקייה')
    await patch(`fin_cloud_secrets?target_id=eq.${target.id}`, { folder_cache: cache }).catch(() => {})
    return finish(true, back.link || up.link, null)
  } catch (e) {
    if (e.auth || e.status === 401) await patch(`fin_cloud_targets?id=eq.${target.id}`, { status: 'error', last_error: 'ההרשאה בוטלה או פגה. חברו מחדש' }).catch(() => {})
    return finish(false, null, String(e.message || e).slice(0, 240))
  }
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
