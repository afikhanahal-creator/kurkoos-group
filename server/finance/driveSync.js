/* Two-way sync with Google Drive, on top of the archive (archive.js).

   The archive already sends every change made in the system to Drive, and checks itself against Drive. This module is the
   other direction and the folders a person makes:

   - syncFromDrive: reads Drive's own list of changes since the last reading (the Changes API, with the page token kept
     per connection) and follows what a person did there to the archive's files: a rename, a move to another folder, a
     trashing, a restore from the trash. A file that vanished altogether is put back from our storage, as before.
     The change list is the trigger and the full check (archive.reconcile) is the safety net: both use the same rules
     (archive.adopt), so they can never disagree. Push notifications are not used: they need a verified public address,
     and Google does not promise that every notice arrives.
   - folders a person makes: created, renamed and removed in Drive itself, and documents moved into them stay there.
   - the trash of this screen: what was taken out of the archive, with a way back.

   No new table: a folder a person made is a row of fin_drive_folders whose key ends in "m:<id>"; a document kept in a
   chosen folder is a row "pin:<document id>"; the page tokens are in fin_settings ("drive_sync_state").
   The connection sees only files this system made (Google's "drive.file" permission): other files in the account are
   not listed and are never touched. */
import crypto from 'node:crypto'
import { env } from './env.js'
import { fetchRetry, json } from './http.js'
import { sb, one, insert, patch, audit, q } from './db.js'
import { adopt, isTwoWay, kit, pathOfKey, exclude, requeue } from './archive.js'

const { context, rootOf, driveGet, drivePatch, driveTrash, driveCreateFolder, event, setRow, tag, H, saveNow, FOLDER, FILE_FIELDS } = kit
const UUID = /^[0-9a-f-]{36}$/i
const setting = async (key) => (await one(`fin_settings?key=eq.${key}&select=value`))?.value ?? null
async function saveSetting(key, value) {
  const body = { value, updated_at: new Date().toISOString() }
  const done = await patch(`fin_settings?key=eq.${key}`, body).catch(() => null)
  if (!done || (Array.isArray(done) && !done.length)) await insert('fin_settings', { key, ...body })
}
const targetOf = async (id) => { const t = await one(`fin_cloud_targets?id=eq.${q(id)}&provider=eq.gdrive&select=*`); if (!t || t.status === 'revoked') throw Object.assign(new Error('Google Drive לא מחובר'), { status: 409 }); return t }
const cleanName = (name) => String(name || '').normalize('NFC').replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)

// ---------- from Drive to the system ----------
export async function syncFromDrive({ targetId = null, budgetMs = 20_000, trigger = 'manual' } = {}) {
  const started = Date.now()
  const targets = (await sb(`fin_cloud_targets?provider=eq.gdrive&enabled=eq.true&status=in.(active,error)${targetId ? `&id=eq.${q(targetId)}` : ''}&select=*`)) || []
  const all = (await setting('drive_sync_state')) || {}
  const twoWay = await isTwoWay()
  const out = []
  for (const t of targets) {
    const st = all[t.id] || {}
    const res = { target: t.id, two_way: twoWay, changes: 0, renamed: 0, moved: 0, trashed: 0, restored: 0, missing: 0, folders: 0, first: false, error: null }
    try {
      const ctx = await context(t)
      if (!st.token) {
        // the first reading: from now on. What happened before is the full check's work (archive.reconcile).
        st.token = (await json(await fetchRetry(`${env.driveApi()}/changes/startPageToken`, { headers: H(ctx.token) }), 'drive changes')).startPageToken
        res.first = true
      } else {
        let token = st.token
        while (token && Date.now() - started < budgetMs) {
          const p = new URLSearchParams({ pageToken: token, pageSize: '200', includeRemoved: 'true', spaces: 'drive', fields: `nextPageToken,newStartPageToken,changes(fileId,removed,file(${FILE_FIELDS},mimeType))` })
          const r = await json(await fetchRetry(`${env.driveApi()}/changes?${p}`, { headers: H(ctx.token) }), 'drive changes')
          for (const c of r.changes || []) {
            res.changes++
            const did = twoWay ? await oneChange(ctx, c).catch((e) => { res.error = String(e.message || e).slice(0, 200); return null }) : null
            if (did) res[did] = (res[did] || 0) + 1
          }
          // the token moves only after the page was handled: a stop in the middle reads the page again, and handling a
          // change twice changes nothing
          token = r.nextPageToken || null
          st.token = r.nextPageToken || r.newStartPageToken || st.token
        }
      }
      st.at = new Date().toISOString(); st.ok_at = st.at; st.error = null
      st.last = { changes: res.changes, renamed: res.renamed, moved: res.moved, trashed: res.trashed, restored: res.restored, missing: res.missing, folders: res.folders }
      const followed = res.renamed + res.moved + res.trashed + res.restored + res.missing + res.folders
      if (followed) { st.followed_at = st.at; await audit('cloud', t.id, 'drive_changes_followed', { ...st.last, trigger }, null).catch(() => {}) }
    } catch (e) {
      res.error = String(e.message || e).slice(0, 300); st.at = new Date().toISOString(); st.error = res.error
      // a token Drive no longer accepts: start again from now, and let the full check cover the gap
      if (e.status === 400 || e.status === 410) { st.token = null; st.gap = true }
      if (e.auth || e.status === 401) await patch(`fin_cloud_targets?id=eq.${t.id}`, { status: 'error', last_error: 'ההרשאה ל-Google Drive בוטלה או פגה. חברו מחדש' }).catch(() => {})
    }
    all[t.id] = st
    out.push(res)
  }
  if (targets.length) await saveSetting('drive_sync_state', all)
  return out
}

async function oneChange(ctx, c) {
  const t = ctx.target
  const f = c.removed ? null : c.file
  // a folder a person made here: renamed in Drive → the name follows; trashed there → its documents go to this screen's trash
  const folderRow = [...ctx.folders.values()].find((x) => x.drive_folder_id === c.fileId && !String(x.key).startsWith('pin:'))
  if (folderRow) {
    if (f && !f.trashed && f.name && f.name !== folderRow.name && /(^|\/)m:[0-9a-f]+$/.test(folderRow.key)) {
      await patch(`fin_drive_folders?target_id=eq.${t.id}&key=eq.${q(folderRow.key)}`, { name: f.name }); folderRow.name = f.name
      await repath(ctx, folderRow.key)
      await event(t.id, null, 'folder_renamed_in_drive', { key: folderRow.key, name: f.name })
      return 'folders'
    }
    if ((!f || f.trashed) && /(^|\/)m:[0-9a-f]+$/.test(folderRow.key)) {
      const inside = (await sb(`fin_drive_files?target_id=eq.${t.id}&drive_folder_id=eq.${q(c.fileId)}&status=eq.verified&select=*`)) || []
      for (const row of inside) await adopt(ctx, row, { id: row.drive_file_id, name: row.organized_name, parents: [c.fileId], trashed: true })
      await sb(`fin_drive_folders?target_id=eq.${t.id}&or=(key.eq.${q(folderRow.key)},key.like.${q(`${folderRow.key}/*`)})`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {})
      await event(t.id, null, 'folder_trashed_in_drive', { key: folderRow.key, name: folderRow.name, documents: inside.length })
      return 'folders'
    }
    return null
  }
  // one of the archive's files: by the id we keep, else by the document id the file carries
  let row = await one(`fin_drive_files?target_id=eq.${t.id}&drive_file_id=eq.${q(c.fileId)}&select=*`)
  const kd = f?.appProperties?.kd
  if (!row && kd && UUID.test(kd) && f.appProperties?.kt === tag(t.id)) row = await one(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${q(kd)}&select=*`)
  if (!row) return null
  if (!f) {
    // gone from Drive altogether (deleted for good): not a wish we can read. The document is put back from our storage.
    if (row.status !== 'verified') return null
    await setRow(row, { status: 'queued', attempts: 0, next_try_at: null, locked_until: null, repair: 'missing', drive_file_id: null })
    await event(t.id, row.document_id, 'missing', { via: 'changes' })
    return 'missing'
  }
  if (row.drive_file_id && row.drive_file_id !== f.id) return null   // an old copy of the same document: the full check handles it
  return adopt(ctx, row, f, { via: 'changes' })
}

/* after a folder got another name: the paths written on the documents under it follow */
async function repath(ctx, key) {
  const rows = (await sb(`fin_drive_files?target_id=eq.${ctx.target.id}&or=(folder_key.eq.${q(key)},folder_key.like.${q(`${key}/*`)})&select=document_id,folder_key`)) || []
  for (const r of rows) await patch(`fin_drive_files?target_id=eq.${ctx.target.id}&document_id=eq.${r.document_id}`, { folder_path: pathOfKey(ctx, r.folder_key), updated_at: new Date().toISOString() })
}

// ---------- folders a person makes ----------
const MANUAL = /(^|\/)m:[0-9a-f]+$/
export async function createFolder({ targetId, parentKey = 'root', name, user }) {
  const t = await targetOf(targetId); const ctx = await context(t)
  const clean = cleanName(name)
  if (!clean) throw Object.assign(new Error('צריך שם לתיקייה'), { status: 400 })
  const parentId = parentKey === 'root' ? await rootOf(ctx) : ctx.folders.get(parentKey)?.drive_folder_id
  if (!parentId || String(parentKey).startsWith('pin:')) throw Object.assign(new Error('תיקיית האב לא נמצאה'), { status: 404 })
  const siblings = [...ctx.folders.values()].filter((f) => String(f.key).startsWith(`${parentKey}/`) && !f.key.slice(parentKey.length + 1).includes('/'))
  if (siblings.some((f) => f.name === clean)) throw Object.assign(new Error('כבר יש כאן תיקייה בשם הזה'), { status: 409 })
  const key = `${parentKey}/m:${crypto.randomBytes(5).toString('hex')}`
  const made = await driveCreateFolder(ctx.token, clean, parentId, { kf: `${tag(t.id)}:${key}`.slice(0, 110), kt: tag(t.id) })
  await insert('fin_drive_folders', { target_id: t.id, key, name: clean, drive_folder_id: made.id }, 'return=minimal')
  ctx.folders.set(key, { key, name: clean, drive_folder_id: made.id })
  await event(t.id, null, 'folder_created', { key, name: clean, path: pathOfKey(ctx, key), by: 'person' }, user)
  await audit('cloud', t.id, 'drive_folder_created', { name: clean, path: pathOfKey(ctx, key) }, user)
  return { ok: true, key, name: clean, path: pathOfKey(ctx, key) }
}
export async function renameFolder({ targetId, key, name, user }) {
  const t = await targetOf(targetId); const ctx = await context(t)
  const row = ctx.folders.get(key); const clean = cleanName(name)
  if (!row || !MANUAL.test(key)) throw Object.assign(new Error('אפשר לשנות שם רק לתיקייה שנוצרה כאן'), { status: 400 })
  if (!clean) throw Object.assign(new Error('צריך שם לתיקייה'), { status: 400 })
  if (clean === row.name) return { ok: true, same: true }
  const from = pathOfKey(ctx, key)
  await drivePatch(ctx.token, row.drive_folder_id, { name: clean })
  await patch(`fin_drive_folders?target_id=eq.${t.id}&key=eq.${q(key)}`, { name: clean }); row.name = clean
  await repath(ctx, key)
  await event(t.id, null, 'folder_renamed', { key, from, to: pathOfKey(ctx, key) }, user)
  await audit('cloud', t.id, 'drive_folder_renamed', { from, to: pathOfKey(ctx, key) }, user)
  return { ok: true, key, name: clean, path: pathOfKey(ctx, key) }
}
/* only an empty folder is removed (in Drive, a trashed folder takes everything inside with it) */
export async function deleteFolder({ targetId, key, user }) {
  const t = await targetOf(targetId); const ctx = await context(t)
  const row = ctx.folders.get(key)
  if (!row || !MANUAL.test(key)) throw Object.assign(new Error('אפשר למחוק רק תיקייה שנוצרה כאן'), { status: 400 })
  const docs = (await sb(`fin_drive_files?target_id=eq.${t.id}&status=neq.withdrawn&or=(folder_key.eq.${q(key)},folder_key.like.${q(`${key}/*`)})&select=document_id&limit=1`)) || []
  const kids = [...ctx.folders.keys()].some((k) => k.startsWith(`${key}/`))
  if (docs.length || kids) throw Object.assign(new Error('התיקייה לא ריקה. מעבירים קודם את המסמכים ואת תתי-התיקיות שבה'), { status: 409 })
  const path = pathOfKey(ctx, key)
  await driveTrash(ctx.token, row.drive_folder_id)
  await sb(`fin_drive_folders?target_id=eq.${t.id}&key=eq.${q(key)}`, { method: 'DELETE', prefer: 'return=minimal' })
  await event(t.id, null, 'folder_deleted', { key, path }, user)
  await audit('cloud', t.id, 'drive_folder_deleted', { path }, user)
  return { ok: true }
}

/* documents into a folder a person chose (folderKey), or back to the folder their company and month give (null).
   The file is moved in Drive now; each answer says whether Drive confirmed it. */
export async function pinDocs({ targetId, ids, folderKey = null, user }) {
  const t = await targetOf(targetId); const ctx = await context(t)
  let dest = null
  if (folderKey) {
    dest = folderKey === 'root' ? { key: 'root', drive_folder_id: await rootOf(ctx) } : ctx.folders.get(folderKey)
    if (!dest || String(folderKey).startsWith('pin:')) throw Object.assign(new Error('התיקייה לא נמצאה'), { status: 404 })
  }
  const rows = (await sb(`fin_drive_files?target_id=eq.${t.id}&document_id=in.(${ids.map(q).join(',')})&select=document_id,status,folder_path,business_id`)) || []
  const have = new Map(rows.map((r) => [r.document_id, r]))
  const results = []; const go = []
  for (const id of ids) {
    const r = have.get(id)
    if (!r || r.status === 'withdrawn') { results.push({ id, ok: false, error: 'המסמך לא נמצא בארכיון' }); continue }
    if (user?.business_ids?.length && r.business_id && !user.business_ids.includes(r.business_id)) { results.push({ id, ok: false, error: 'אין לך הרשאה למסמך הזה' }); continue }
    if (dest) await sb('fin_drive_folders', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { target_id: t.id, key: `pin:${id}`, name: dest.key, drive_folder_id: dest.drive_folder_id } })
    else await sb(`fin_drive_folders?target_id=eq.${t.id}&key=eq.${q(`pin:${id}`)}`, { method: 'DELETE', prefer: 'return=minimal' })
    await patch(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${q(id)}`, { status: 'queued', attempts: 0, next_try_at: null, updated_at: new Date().toISOString() })
    go.push({ id, from: r.folder_path })
  }
  const saved = go.length ? await saveNow({ target: t, ids: go.map((g) => g.id), user }).catch((e) => go.map((g) => ({ id: g.id, ok: false, error: String(e.message || e).slice(0, 200) }))) : []
  const by = new Map(saved.map((r) => [r.id, r]))
  for (const g of go) {
    const r = by.get(g.id)
    results.push(r?.ok ? { id: g.id, ok: true, drive: 'moved', path: r.path } : { id: g.id, ok: true, drive: 'pending', error: r?.error || 'Drive לא אישר את ההעברה' })
    await event(t.id, g.id, 'moved_by_user', { from: { path: g.from }, to: { path: r?.path || (dest ? pathOfKey(ctx, dest.key) : 'לפי החברה והחודש') }, drive: r?.ok ? 'moved' : 'pending', folder: dest ? dest.key : null }, user)
  }
  if (go.length) await audit('cloud', t.id, 'archive_moved', { documents: go.map((g) => g.id).slice(0, 50), folder: dest ? pathOfKey(ctx, dest.key) : null }, user).catch(() => {})
  return { results, moved: results.filter((r) => r.drive === 'moved').length, pending: results.filter((r) => r.drive === 'pending').length, failed: results.filter((r) => !r.ok).length }
}

/* back from this screen's trash: the file comes out of the Drive trash (when it is still there) and the document
   returns to the archive, checked again */
export async function restoreDocs({ targetId, ids, user }) {
  const t = await targetOf(targetId); const ctx = await context(t)
  const rows = (await sb(`fin_drive_files?target_id=eq.${t.id}&document_id=in.(${ids.map(q).join(',')})&status=eq.withdrawn&select=*`)) || []
  const results = []
  for (const row of rows) {
    let back = false
    if (row.drive_file_id) {
      const f = await driveGet(ctx.token, row.drive_file_id).catch(() => null)
      if (f?.trashed) back = await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(row.drive_file_id)}?fields=id,trashed`, { method: 'PATCH', headers: H(ctx.token, { 'Content-Type': 'application/json' }), body: JSON.stringify({ trashed: false }) }).then((r) => r.ok, () => false)
      else if (f) back = true
    }
    await patch(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${row.document_id}`, { excluded: false, status: 'queued', attempts: 0, next_try_at: null, locked_until: null, error: null, drive_file_id: back ? row.drive_file_id : null, updated_at: new Date().toISOString() })
    await event(t.id, row.document_id, 'restored_by_user', { from_drive_trash: back }, user)
    results.push({ id: row.document_id, from_drive_trash: back })
  }
  const saved = results.length ? await saveNow({ target: t, ids: results.map((r) => r.id), user }).catch(() => []) : []
  const ok = new Set(saved.filter((r) => r.ok).map((r) => r.id))
  if (results.length) await audit('cloud', t.id, 'archive_restored', { documents: results.map((r) => r.id).slice(0, 50) }, user).catch(() => {})
  return { results: results.map((r) => ({ ...r, ok: ok.has(r.id) })), restored: results.filter((r) => ok.has(r.id)).length, pending: results.filter((r) => !ok.has(r.id)).length }
}

/* what happened to one document's file (or lately, to all of them): who, what, from where to where, when */
export async function activity({ targetId, documentId = null, limit = 60 }) {
  const rows = (await sb(`fin_drive_events?target_id=eq.${q(targetId)}${documentId ? `&document_id=eq.${q(documentId)}` : ''}&select=id,document_id,action,detail,user_email,at&order=at.desc&limit=${Math.min(200, limit)}`)) || []
  return { events: rows }
}

/* the connected Google accounts, each on its own: who, state, what it holds, how much room Drive reports */
export async function accounts() {
  const targets = (await sb('fin_cloud_targets?provider=eq.gdrive&status=neq.revoked&select=id,account_email,status,enabled,business_id,root_name,last_sync_at,last_error,last_reconcile_at,last_reconcile,created_at&order=created_at')) || []
  const state = (await setting('drive_sync_state')) || {}
  const out = []
  for (const t of targets) {
    const rows = (await sb(`fin_drive_files?target_id=eq.${t.id}&select=status`)) || []
    const by = {}; for (const r of rows) by[r.status] = (by[r.status] || 0) + 1
    let quota = null
    if (t.status === 'active' && t.enabled) {
      try { const ctx = await context(await one(`fin_cloud_targets?id=eq.${t.id}&select=*`)); const a = await json(await fetchRetry(`${env.driveApi()}/about?fields=${encodeURIComponent('storageQuota,user(displayName,emailAddress)')}`, { headers: H(ctx.token) }), 'drive about'); quota = { limit: a.storageQuota?.limit ? Number(a.storageQuota.limit) : null, usage: a.storageQuota?.usage ? Number(a.storageQuota.usage) : null, name: a.user?.displayName || null } } catch { quota = null }
    }
    const s = state[t.id] || {}
    out.push({ ...t, files: { verified: by.verified || 0, pending: (by.queued || 0) + (by.uploading || 0) + (by.uploaded || 0), failed: (by.failed || 0) + (by.needs_review || 0), trash: by.withdrawn || 0, total: rows.length }, quota, sync: { at: s.at || null, ok_at: s.ok_at || null, followed_at: s.followed_at || null, error: s.error || null, last: s.last || null, started: !!s.token } })
  }
  return { accounts: out, two_way: await isTwoWay(), scope: 'drive.file' }
}

export async function setTwoWay({ on, user }) {
  await saveSetting('drive_two_way', !!on)
  await audit('cloud', null, on ? 'drive_two_way_on' : 'drive_two_way_off', null, user)
  return { ok: true, two_way: !!on }
}
export { exclude, requeue }
