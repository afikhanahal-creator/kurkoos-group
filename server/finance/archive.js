// The Google Drive archive (docs/finance/DRIVE-ARCHIVE-PLAN.md). Every document that was read gets one row in
// fin_drive_files per Drive connection and moves queued → uploading → uploaded → verified. It is "verified" only after the file
// was read back from Drive with the same md5. Folders are kept by their Drive id (fin_drive_folders), and every file the
// archive makes carries its document id in appProperties, so a retry finds the file it already made instead of making a
// second one. Nothing here deletes a file in Drive: a correction renames or moves the archive's own copy, nothing more.
import crypto from 'node:crypto'
import { env, TIME_BUDGET_MS } from './env.js'
import { fetchRetry, json } from './http.js'
import { sb, one, insert, patch, download, audit, rpc, q, agentRun } from './db.js'
import { tokenFor, HEB_MONTHS, TYPE_HE } from './cloud.js'

const FOLDER = 'application/vnd.google-apps.folder'
const RETRY_MIN = [1, 5, 30, 120, 720]                 // minutes after the 1st…5th failure; then "failed" and an alert
const NO_COMPANY = 'מסמכים ללא שיוך'
const KIND = { invoice: 'חשבוניות', invoice_receipt: 'חשבוניות', supplier_bill: 'חשבוניות', credit: 'זיכויים', receipt: 'קבלות', payment_confirmation: 'קבלות' }
const CUR = { ILS: 'שח', USD: 'USD', EUR: 'EUR', GBP: 'GBP' }
const IL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })

/* a safe part of a file name: no / \ : * ? " < > |, no control characters, a dash instead of spaces */
export const part = (s) => String(s ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, ' ').replace(/[״"]/g, '').trim().replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '')
const money = (n) => { const v = Math.abs(Number(n)); return Number.isInteger(v) ? String(v) : v.toFixed(2) }
const extOf = (doc) => {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(String(doc.file_name || ''))?.[1]?.toLowerCase()
  if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName
  const m = String(doc.file_mime || '')
  return m === 'application/pdf' ? 'pdf' : m.startsWith('text/') ? 'html' : m === 'image/jpeg' ? 'jpg' : (m.split('/')[1] || 'pdf')
}
/* the date the document carries (the arrival day only when none was read; then the name says nothing about the date) */
export function dateOf(doc) {
  if (/^\d{4}-\d{2}-\d{2}/.test(String(doc.issue_date || ''))) return { day: String(doc.issue_date).slice(0, 10), printed: true }
  if (/^\d{4}-\d{2}$/.test(String(doc.accounting_period || ''))) return { day: `${doc.accounting_period}-01`, printed: false }
  const t = new Date(doc.email_date || doc.created_at || NaN)
  return Number.isNaN(t.getTime()) ? { day: null, printed: false } : { day: IL_DAY.format(t), printed: false }
}

/* date_supplier_type_number_amount.ext, e.g. 2026-11-05_חשמל-ישיר_חשבונית-מס_12345_2450-שח.pdf. A missing detail is left out,
   never made up; without a number a short id keeps the name unique. */
export function organizedName(doc, supplierName) {
  const d = dateOf(doc)
  const amount = doc.total_amount == null || doc.total_amount === '' ? '' : `${doc.doc_type === 'credit' || Number(doc.total_amount) < 0 ? '-' : ''}${money(doc.total_amount)}-${CUR[doc.currency || 'ILS'] || part(doc.currency)}`
  const parts = [d.printed ? d.day : '', part(supplierName || doc.supplier_name), part(TYPE_HE[doc.doc_type] || 'מסמך'), part(doc.doc_number) || `id-${String(doc.id).slice(0, 8)}`, amount].filter(Boolean)
  let base = parts.join('_')
  if (base.length > 120) base = base.slice(0, 120).replace(/[_-]+$/, '')
  return `${base}.${extOf(doc)}`
}

/* the folder keys of a document: company, year, month (and the type when the connection asks for it) */
export function folderPlan(target, doc, businessName) {
  const ck = `b:${doc.business_id || 'none'}`
  const levels = [{ key: ck, name: businessName || NO_COMPANY }]
  const { day } = dateOf(doc)
  if (!day) levels.push({ key: `${ck}/nodate`, name: 'ללא תאריך' })
  else {
    const [y, m] = day.split('-')
    levels.push({ key: `${ck}/${y}`, name: y }, { key: `${ck}/${y}/${m}`, name: `${m} - ${HEB_MONTHS[Number(m) - 1]}` })
  }
  if (target.by_kind) { const last = levels[levels.length - 1]; const k = KIND[doc.doc_type] || 'מסמכים אחרים'; levels.push({ key: `${last.key}/k:${k}`, name: k }) }
  return levels
}

// ---------- Google Drive calls ----------
const H = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra })
const tag = (targetId) => String(targetId).slice(0, 8)
const qs = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const FILE_FIELDS = 'id,name,parents,md5Checksum,size,trashed,webViewLink,appProperties'
async function driveFind(token, query) {
  const r = await json(await fetchRetry(`${env.driveApi()}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(`files(${FILE_FIELDS})`)}&pageSize=10`, { headers: H(token) }), 'drive list')
  return r.files || []
}
async function driveGet(token, id) {
  const r = await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(FILE_FIELDS)}`, { headers: H(token) })
  if (r.status === 404) return null
  return json(r, 'drive get')
}
async function driveCreateFolder(token, name, parent, props) {
  return json(await fetchRetry(`${env.driveApi()}/files?fields=id`, { method: 'POST', headers: H(token, { 'Content-Type': 'application/json' }), body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent], appProperties: props }) }), 'drive folder')
}
async function driveUpload(token, { name, parent, mime, buf, props }) {
  const boundary = `kurkoos${crypto.randomBytes(8).toString('hex')}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent], appProperties: props })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    buf, Buffer.from(`\r\n--${boundary}--`),
  ])
  // not retried here: a lost answer is retried by the queue, which first looks for the file by its document id
  return json(await fetch(`${env.driveUpload()}/files?uploadType=multipart&fields=${encodeURIComponent(FILE_FIELDS)}`, { method: 'POST', headers: H(token, { 'Content-Type': `multipart/related; boundary=${boundary}` }), body }), 'drive upload')
}
async function drivePatch(token, id, { name, addParent, removeParents }) {
  const p = new URLSearchParams({ fields: FILE_FIELDS })
  if (addParent) p.set('addParents', addParent)
  if (removeParents?.length) p.set('removeParents', removeParents.join(','))
  return json(await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(id)}?${p}`, { method: 'PATCH', headers: H(token, { 'Content-Type': 'application/json' }), body: JSON.stringify(name ? { name } : {}) }), 'drive update')
}

const event = (targetId, documentId, action, detail, user) => insert('fin_drive_events', { target_id: targetId, document_id: documentId, action, detail: detail || null, user_id: user?.id || null, user_email: user?.email || null }, 'return=minimal').catch(() => {})

// ---------- folders ----------
async function context(target) {
  const { token } = await tokenFor(target)
  const folders = new Map(((await sb(`fin_drive_folders?target_id=eq.${target.id}&select=key,drive_folder_id,name`)) || []).map((f) => [f.key, f]))
  const businesses = Object.fromEntries(((await sb('fin_businesses?select=id,name')) || []).map((b) => [b.id, b.name]))
  return { target, token, folders, businesses, suppliers: new Map() }
}
async function forgetFolders(ctx, keys) {
  for (const k of keys) { ctx.folders.delete(k); await sb(`fin_drive_folders?target_id=eq.${ctx.target.id}&key=eq.${q(k)}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {}) }
}
/* finds or makes one folder: the id we keep, else a folder this archive made before (its key in appProperties), else a new one */
async function ensure(ctx, key, name, parentId) {
  const known = ctx.folders.get(key)
  if (known) return known.drive_folder_id
  const props = { kf: `${tag(ctx.target.id)}:${key}`.slice(0, 110), kt: tag(ctx.target.id) }
  const found = (await driveFind(ctx.token, `appProperties has { key='kf' and value='${qs(props.kf)}' } and mimeType='${FOLDER}' and trashed=false`))[0]
  const id = found?.id || (await driveCreateFolder(ctx.token, name, parentId, props)).id
  await insert('fin_drive_folders', { target_id: ctx.target.id, key, name, drive_folder_id: id }, 'resolution=ignore-duplicates,return=minimal')
  const kept = await one(`fin_drive_folders?target_id=eq.${ctx.target.id}&key=eq.${q(key)}&select=key,drive_folder_id,name`)
  ctx.folders.set(key, kept || { key, name, drive_folder_id: id })
  if (!found) await event(ctx.target.id, null, 'folder_created', { key, name })
  return (kept || { drive_folder_id: id }).drive_folder_id
}
async function rootOf(ctx) {
  if (ctx.target.root_folder_id) { if (!ctx.folders.has('root')) ctx.folders.set('root', { key: 'root', drive_folder_id: ctx.target.root_folder_id, name: ctx.target.root_name }); return ctx.target.root_folder_id }
  const id = await ensure(ctx, 'root', ctx.target.root_name || 'ארכיון מסמכים עסקי', 'root')
  await patch(`fin_cloud_targets?id=eq.${ctx.target.id}`, { root_folder_id: id })
  ctx.target.root_folder_id = id
  return id
}
async function folderFor(ctx, doc) {
  const levels = folderPlan(ctx.target, doc, ctx.businesses[doc.business_id])
  let parent = await rootOf(ctx)
  for (const l of levels) parent = await ensure(ctx, l.key, l.name, parent)
  return { id: parent, key: levels[levels.length - 1].key, path: `/${[ctx.target.root_name || 'ארכיון מסמכים עסקי', ...levels.map((l) => l.name)].join('/')}` }
}

async function supplierName(ctx, doc) {
  if (!doc.supplier_id) return doc.supplier_name
  if (!ctx.suppliers.has(doc.supplier_id)) ctx.suppliers.set(doc.supplier_id, (await one(`fin_suppliers?id=eq.${doc.supplier_id}&select=name`))?.name || doc.supplier_name)
  return ctx.suppliers.get(doc.supplier_id)
}
/* a name no other document of this folder has: _2, _3 … */
async function uniqueName(ctx, folderId, name, documentId) {
  const dot = name.lastIndexOf('.'); const base = name.slice(0, dot); const ext = name.slice(dot)
  for (let i = 1; i < 50; i++) {
    const n = i === 1 ? name : `${base}_${i}${ext}`
    const taken = await one(`fin_drive_files?target_id=eq.${ctx.target.id}&drive_folder_id=eq.${q(folderId)}&organized_name=eq.${q(n)}&document_id=neq.${documentId}&select=document_id`)
    if (!taken) return n
  }
  return `${base}_${String(documentId).slice(0, 8)}${ext}`
}

// ---------- one document ----------
const failWait = (attempts) => new Date(Date.now() + RETRY_MIN[Math.min(attempts, RETRY_MIN.length) - 1] * 60_000).toISOString()
async function setRow(row, body) {
  Object.assign(row, body)
  await patch(`fin_drive_files?target_id=eq.${row.target_id}&document_id=eq.${row.document_id}`, { ...body, updated_at: new Date().toISOString() })
}

/* the whole road of one document: checks, folder, name, upload (or the file already made), read back, verified */
export async function processRow(ctx, row) {
  const doc = await one(`fin_documents?id=eq.${row.document_id}&select=*`)
  if (!doc) return { state: 'gone' }
  if (doc.status === 'duplicate') { await setRow(row, { status: 'duplicate', duplicate_of: doc.duplicate_of, locked_until: null, error: null }); return { state: 'duplicate' } }
  if (['rejected', 'failed', 'processing'].includes(doc.status)) {
    // never uploaded: it leaves the queue. Already in Drive: the copy stays (nothing is deleted) and a person sees it.
    if (!row.drive_file_id) { await sb(`fin_drive_files?target_id=eq.${row.target_id}&document_id=eq.${row.document_id}`, { method: 'DELETE', prefer: 'return=minimal' }); return { state: 'left' } }
    await setRow(row, { status: 'needs_review', locked_until: null, error: doc.status === 'rejected' ? 'המסמך נדחה במערכת, והעותק שלו עדיין ב-Drive' : 'המסמך חזר לקריאה' })
    return { state: 'needs_review' }
  }
  if (!doc.file_path) { await setRow(row, { status: 'needs_review', locked_until: null, error: 'אין קובץ מקור למסמך' }); return { state: 'needs_review' } }

  const buf = await download(doc.file_path)
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  const md5 = crypto.createHash('md5').update(buf).digest('hex')
  // the same file already verified for another document: one copy in Drive, this one points at it
  const twin = await one(`fin_drive_files?target_id=eq.${row.target_id}&file_sha256=eq.${sha256}&status=eq.verified&document_id=neq.${row.document_id}&select=document_id,drive_file_id,web_link,folder_path,organized_name`)
  if (twin && !row.drive_file_id) {
    await setRow(row, { status: 'duplicate', duplicate_of: twin.document_id, file_sha256: sha256, file_md5: md5, drive_file_id: null, web_link: twin.web_link, folder_path: twin.folder_path, locked_until: null, error: null })
    await event(row.target_id, row.document_id, 'duplicate', { of: twin.document_id })
    return { state: 'duplicate' }
  }

  const folder = await folderFor(ctx, doc)
  const wanted = row.name_override || organizedName(doc, await supplierName(ctx, doc))
  const name = await uniqueName(ctx, folder.id, wanted, row.document_id)

  // the file this document already has in Drive: by the id we kept, else by the document id it carries
  let file = row.drive_file_id ? await driveGet(ctx.token, row.drive_file_id) : null
  if (!file) file = (await driveFind(ctx.token, `appProperties has { key='kd' and value='${row.document_id}' } and trashed=false`))[0] || null
  if (file && file.trashed) {
    // a person put our copy in the trash: we do not bring it back on our own
    await setRow(row, { status: 'needs_review', locked_until: null, error: 'הקובץ נמחק ב-Drive (נמצא בפח). אפשר להעלות שוב מהמסך' })
    await event(row.target_id, row.document_id, 'missing', { trashed: true })
    return { state: 'needs_review' }
  }
  if (file && file.md5Checksum && file.md5Checksum !== md5) file = null            // a different file: upload the right one
  if (file) {
    const parents = file.parents || []
    if (file.name !== name || !parents.includes(folder.id)) {
      file = await drivePatch(ctx.token, file.id, { name: file.name !== name ? name : undefined, addParent: parents.includes(folder.id) ? undefined : folder.id, removeParents: parents.filter((p) => p !== folder.id) })
      await event(row.target_id, row.document_id, row.folder_key && row.folder_key !== folder.key ? 'moved' : 'renamed', { from: { name: row.organized_name, path: row.folder_path }, to: { name, path: folder.path } })
    }
  } else {
    await setRow(row, { status: 'uploading', file_sha256: sha256, file_md5: md5, drive_folder_id: folder.id, folder_key: folder.key, folder_path: folder.path, organized_name: name })
    try {
      file = await driveUpload(ctx.token, { name, parent: folder.id, mime: doc.file_mime || 'application/pdf', buf, props: { kd: row.document_id, kt: tag(row.target_id), ks: sha256 } })
    } catch (e) {
      if (e.status === 404) { await forgetFolders(ctx, ['root', ...folderPlan(ctx.target, doc, '').map((l) => l.key)]); await patch(`fin_cloud_targets?id=eq.${ctx.target.id}`, { root_folder_id: null }); ctx.target.root_folder_id = null }
      throw e
    }
    await event(row.target_id, row.document_id, 'uploaded', { name, path: folder.path })
  }
  await setRow(row, { status: 'uploaded', drive_file_id: file.id, drive_folder_id: folder.id, folder_key: folder.key, folder_path: folder.path, organized_name: name, web_link: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`, file_sha256: sha256, file_md5: md5, business_id: doc.business_id, uploaded_at: row.uploaded_at || new Date().toISOString() })

  // read back: there, not in the trash, the same bytes
  const back = await driveGet(ctx.token, file.id)
  const same = !!back && !back.trashed && (!back.md5Checksum || back.md5Checksum === md5) && (!back.size || Number(back.size) === buf.length) && (back.parents || []).includes(folder.id)
  if (!same) { const e = new Error(back ? 'הקובץ ב-Drive לא זהה לקובץ המקור' : 'הקובץ לא נמצא ב-Drive אחרי ההעלאה'); e.verify = true; throw e }
  const now = new Date().toISOString()
  await setRow(row, { status: 'verified', verified_at: now, last_sync_at: now, verify_status: back.md5Checksum ? 'md5' : 'size', attempts: 0, next_try_at: null, locked_until: null, error: null })
  await event(row.target_id, row.document_id, 'verified', { md5: !!back.md5Checksum })
  return { state: 'verified', link: row.web_link, path: folder.path, name }
}

async function failRow(row, e) {
  const attempts = (row.attempts || 0) + 1
  const gaveUp = attempts >= RETRY_MIN.length
  await setRow(row, { status: gaveUp ? 'failed' : 'queued', attempts, next_try_at: gaveUp ? null : failWait(attempts), locked_until: null, error: String(e.message || e).slice(0, 300) })
  await event(row.target_id, row.document_id, gaveUp ? 'failed' : 'retry', { attempts, error: String(e.message || e).slice(0, 200) })
}

// ---------- the run ----------
const gdriveTargets = async (targetId) => (await sb(`fin_cloud_targets?provider=eq.gdrive&enabled=eq.true&status=in.(active,error)${targetId ? `&id=eq.${q(targetId)}` : '&auto=eq.true'}&select=*`)) || []

/* one run of the archive: new documents are queued, due rows are uploaded and verified, within the time it is given */
export async function tick({ started = Date.now(), budgetMs = TIME_BUDGET_MS, trigger = 'scan', targetId = null, max = 1e9 } = {}) {
  const targets = await gdriveTargets(targetId)
  const out = []
  for (const t of targets) {
    if (Date.now() - started > budgetMs) break
    const locked = await rpc('fin_cloud_lock', { p_target: t.id, p_minutes: 3 }).catch(() => false)
    if (locked !== true) { out.push({ target: t.id, busy: true }); continue }
    const res = { target: t.id, queued: 0, verified: 0, duplicates: 0, failed: 0, retry: 0, error: null }
    let run = null
    try {
      res.queued = await rpc('fin_drive_enqueue', { p_target: t.id }) || 0
      const ctx = await context(t)
      let left = max
      while (left > 0 && Date.now() - started < budgetMs) {
        const rows = (await rpc('fin_drive_claim', { p_target: t.id, p_limit: Math.min(20, left), p_lease_seconds: 120 })) || []
        if (!rows.length) break
        run ||= await agentRun('cloud', trigger)
        for (const row of rows) {
          left--
          if (Date.now() - started > budgetMs) { await setRow(row, { status: row.drive_file_id ? 'uploaded' : 'queued', locked_until: null }); continue }
          try {
            const r = await processRow(ctx, row)
            if (r.state === 'verified') { res.verified++; run.stat.processed++ } else if (r.state === 'duplicate') res.duplicates++
          } catch (e) {
            if (e.auth || e.status === 401) { await setRow(row, { status: row.drive_file_id ? 'uploaded' : 'queued', locked_until: null }); throw e }
            await failRow(row, e); run.stat.errors++
            if (row.status === 'failed') res.failed++; else res.retry++
          }
        }
      }
      await patch(`fin_cloud_targets?id=eq.${t.id}`, { status: 'active', last_error: null, last_sync_at: new Date().toISOString(), files_synced: (t.files_synced || 0) + res.verified, files_failed: res.failed })
    } catch (e) {
      res.error = String(e.message || e).slice(0, 300)
      if (e.auth || e.status === 401) await patch(`fin_cloud_targets?id=eq.${t.id}`, { status: 'error', last_error: 'ההרשאה ל-Google Drive בוטלה או פגה. חברו מחדש' }).catch(() => {})
    } finally {
      await patch(`fin_cloud_targets?id=eq.${t.id}`, { syncing_until: null }).catch(() => {})
      if (run) { run.stat.details.drive = res; await run.done().catch(() => {}) }
    }
    out.push(res)
  }
  return out
}

/* "save to Drive" now, for chosen documents: each one goes the whole road at once, and the answer says what really happened */
export async function saveNow({ target, ids, user }) {
  const ctx = await context(target)
  const results = []
  for (const id of ids) {
    let row = await one(`fin_drive_files?target_id=eq.${target.id}&document_id=eq.${q(id)}&select=*`)
    if (row?.status === 'verified') { results.push({ id, ok: true, already: true, link: row.web_link, path: row.folder_path }); continue }
    const doc = await one(`fin_documents?id=eq.${q(id)}&select=id,business_id,file_name,file_hash,duplicate_of,file_path`)
    if (!doc?.file_path) { results.push({ id, ok: false, error: 'אין קובץ מקור למסמך הזה' }); continue }
    if (!row) row = await insert('fin_drive_files', { target_id: target.id, document_id: id, business_id: doc.business_id, status: 'uploading', original_name: doc.file_name, file_sha256: doc.file_hash }, 'resolution=merge-duplicates,return=representation')
    try {
      const r = await processRow(ctx, row)
      if (r.state === 'verified') results.push({ id, ok: true, link: r.link, path: r.path })
      else if (r.state === 'duplicate') results.push({ id, ok: true, already: true, link: row.web_link, path: row.folder_path })
      else results.push({ id, ok: false, error: row.error || 'המסמך לא נשמר' })
    } catch (e) {
      if (e.auth || e.status === 401) { await setRow(row, { status: 'queued', locked_until: null }); throw e }
      await failRow(row, e)
      results.push({ id, ok: false, error: String(e.message || e).slice(0, 200) })
    }
  }
  const saved = results.filter((r) => r.ok && !r.already).length
  if (saved) await patch(`fin_cloud_targets?id=eq.${target.id}`, { files_synced: (target.files_synced || 0) + saved, last_sync_at: new Date().toISOString() }).catch(() => {})
  await audit('cloud', target.id, 'saved_documents', { provider: 'gdrive', saved, failed: results.filter((r) => !r.ok).length, ids: ids.slice(0, 50) }, user)
  return results
}

/* the night check: every file the archive holds is compared with Drive. Missing or trashed → a person sees it and can upload
   again; a failure that gave up gets one more try; the totals are kept on the connection for the screen and the morning report. */
export async function reconcile({ started = Date.now(), budgetMs = TIME_BUDGET_MS } = {}) {
  const out = []
  for (const t of await gdriveTargets()) {
    if (Date.now() - started > budgetMs) break
    try {
      await rpc('fin_drive_enqueue', { p_target: t.id })
      const { token } = await tokenFor(t)
      const inDrive = new Map()
      let pageToken = ''; let pages = 0; let complete = true
      do {
        const p = new URLSearchParams({ q: `appProperties has { key='kt' and value='${tag(t.id)}' } and mimeType!='${FOLDER}'`, fields: 'nextPageToken,files(id,trashed,md5Checksum,appProperties)', pageSize: '1000' })
        if (pageToken) p.set('pageToken', pageToken)
        const r = await json(await fetchRetry(`${env.driveApi()}/files?${p}`, { headers: H(token) }), 'drive list')
        for (const f of r.files || []) if (f.appProperties?.kd) inDrive.set(f.appProperties.kd, f)
        pageToken = r.nextPageToken || ''; pages++
        if (Date.now() - started > budgetMs) { complete = !pageToken; break }
      } while (pageToken)
      const rows = (await sb(`fin_drive_files?target_id=eq.${t.id}&select=document_id,status,drive_file_id,attempts,updated_at`)) || []
      let missing = 0
      if (complete) {
        for (const r of rows.filter((x) => x.status === 'verified')) {
          const f = inDrive.get(r.document_id)
          if (!f || f.trashed) {
            missing++
            await patch(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${r.document_id}`, { status: 'needs_review', error: f ? 'הקובץ נמחק ב-Drive (נמצא בפח). אפשר להעלות שוב מהמסך' : 'הקובץ לא נמצא ב-Drive. אפשר להעלות שוב מהמסך', updated_at: new Date().toISOString() })
            await event(t.id, r.document_id, 'missing', { trashed: !!f })
          }
        }
      }
      // a failure that gave up more than 12 hours ago gets one more try every night
      const stale = new Date(Date.now() - 12 * 3600_000).toISOString()
      await patch(`fin_drive_files?target_id=eq.${t.id}&status=eq.failed&updated_at=lt.${stale}`, { status: 'queued', attempts: RETRY_MIN.length - 1, next_try_at: null, updated_at: new Date().toISOString() }).catch(() => {})
      const known = new Set(rows.map((r) => r.document_id))
      const summary = { ...(await counts(t)), missing, orphans: [...inDrive.keys()].filter((k) => !known.has(k)).length, pages, complete, at: new Date().toISOString() }
      await patch(`fin_cloud_targets?id=eq.${t.id}`, { last_reconcile_at: summary.at, last_reconcile: summary })
      out.push({ target: t.id, ...summary })
    } catch (e) { out.push({ target: t.id, error: String(e.message || e).slice(0, 300) }) }
  }
  return out
}

async function counts(t) {
  const rows = (await sb(`fin_drive_files?target_id=eq.${t.id}&select=status`)) || []
  const by = {}; for (const r of rows) by[r.status] = (by[r.status] || 0) + 1
  return { expected: rows.filter((r) => r.status !== 'duplicate').length, verified: by.verified || 0, pending: (by.queued || 0) + (by.uploading || 0) + (by.uploaded || 0), failed: by.failed || 0, duplicates: by.duplicate || 0, needs_review: by.needs_review || 0 }
}

/* the screen: the connection, totals from the documents to Drive, problems, and the explorer rows */
export async function overview({ user }) {
  const targets = (await sb('fin_cloud_targets?provider=eq.gdrive&status=neq.revoked&select=id,account_email,status,root_folder_id,root_name,by_kind,auto,business_id,last_sync_at,last_error,last_reconcile_at,last_reconcile,created_at&order=created_at')) || []
  const docs = (await sb('fin_documents?select=status')) || []
  const collected = { total: docs.length, processing: docs.filter((d) => d.status === 'processing').length, read: docs.filter((d) => ['review', 'approved', 'sent'].includes(d.status)).length, failed: docs.filter((d) => d.status === 'failed').length, duplicates: docs.filter((d) => d.status === 'duplicate').length }
  const awaiting = (await sb('fin_documents?status=in.(review,approved,sent)&business_id=is.null&select=id')) || []
  const out = []
  for (const t of targets) {
    const c = await counts(t)
    const folders = ((await sb(`fin_drive_folders?target_id=eq.${t.id}&select=key`)) || []).length
    const companies = new Set(((await sb(`fin_drive_folders?target_id=eq.${t.id}&key=like.b:*&select=key`)) || []).map((f) => f.key.split('/')[0])).size
    const problems = (await sb(`fin_drive_files?target_id=eq.${t.id}&status=in.(failed,needs_review)&select=document_id,status,error,attempts,updated_at,organized_name,folder_path,web_link&order=updated_at.desc&limit=50`)) || []
    const queued = (await sb(`fin_drive_files?target_id=eq.${t.id}&status=in.(queued,uploading,uploaded)&select=document_id,status,attempts,next_try_at,error&order=next_try_at.asc.nullsfirst&limit=50`)) || []
    out.push({ ...t, counts: c, folders, companies, problems, queued, unassigned: awaiting.length })
  }
  return { targets: out, collected, user: user?.email || null }
}

export async function tree({ targetId, user }) {
  const rows = (await sb(`fin_drive_files?target_id=eq.${q(targetId)}&select=document_id,business_id,status,folder_key,folder_path,organized_name,web_link,verified_at,error,duplicate_of&order=folder_path,organized_name&limit=5000`)) || []
  const ok = (r) => !user?.business_ids?.length || (r.business_id && user.business_ids.includes(r.business_id))
  return rows.filter(ok)
}

/* a person renames the archive copy: the file in Drive gets the name, and the name is kept for every later run */
export async function renameDoc({ targetId, documentId, name, user }) {
  const target = await one(`fin_cloud_targets?id=eq.${q(targetId)}&select=*`)
  const row = await one(`fin_drive_files?target_id=eq.${q(targetId)}&document_id=eq.${q(documentId)}&select=*`)
  if (!target || !row) throw Object.assign(new Error('המסמך לא נמצא בארכיון'), { status: 404 })
  const dot = String(row.organized_name || '').lastIndexOf('.'); const ext = dot > 0 ? row.organized_name.slice(dot) : ''
  const clean = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '').split('_').map(part).filter(Boolean).join('_').slice(0, 120)
  if (!clean) throw Object.assign(new Error('שם לא תקין'), { status: 400 })
  const full = `${clean}${ext}`
  await patch(`fin_drive_files?target_id=eq.${row.target_id}&document_id=eq.${row.document_id}`, { name_override: full, status: 'queued', next_try_at: null, updated_at: new Date().toISOString() })
  await event(row.target_id, row.document_id, 'renamed_by_user', { from: row.organized_name, to: full }, user)
  await audit('cloud', target.id, 'archive_renamed', { document: documentId, from: row.organized_name, to: full }, user)
  const [r] = await saveNow({ target, ids: [documentId], user })
  return { ...r, name: full }
}

/* upload again: a file that was deleted in Drive, or a failure, goes back to the queue now */
export async function requeue({ targetId, ids, user }) {
  for (const id of ids) {
    await patch(`fin_drive_files?target_id=eq.${q(targetId)}&document_id=eq.${q(id)}`, { status: 'queued', attempts: 0, next_try_at: null, drive_file_id: null, locked_until: null, error: null, updated_at: new Date().toISOString() })
    await event(targetId, id, 'requeued', null, user)
  }
  return { requeued: ids.length }
}

/* the connection's choices. A subfolder per type changed: the archive's own files move to match (a setting is a policy). */
export async function settings({ targetId, by_kind, auto, user }) {
  const body = {}
  if (typeof by_kind === 'boolean') body.by_kind = by_kind
  if (typeof auto === 'boolean') body.auto = auto
  const before = await one(`fin_cloud_targets?id=eq.${q(targetId)}&provider=eq.gdrive&select=by_kind`)
  if (!before) throw Object.assign(new Error('החיבור לא נמצא'), { status: 404 })
  await patch(`fin_cloud_targets?id=eq.${q(targetId)}`, body)
  if ('by_kind' in body && body.by_kind !== before.by_kind) await patch(`fin_drive_files?target_id=eq.${q(targetId)}&status=eq.verified`, { status: 'queued', next_try_at: null, updated_at: new Date().toISOString() })
  await audit('cloud', targetId, 'archive_settings', body, user)
  return one(`fin_cloud_targets?id=eq.${q(targetId)}&select=id,root_name,by_kind,auto`)
}
