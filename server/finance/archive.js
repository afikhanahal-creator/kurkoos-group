// The Google Drive archive (docs/finance/DRIVE-ARCHIVE-PLAN.md). Every document that was read gets one row in
// fin_drive_files per Drive connection and moves queued → uploading → uploaded → verified. It is "verified" only after the file
// was read back from Drive with the same md5. Folders are kept by their Drive id (fin_drive_folders), and every file the
// archive makes carries its document id in appProperties, so a retry finds the file it already made instead of making a
// second one. Nothing here deletes a file in Drive: a correction renames or moves the archive's own copy, nothing more.
import crypto from 'node:crypto'
import { env, TIME_BUDGET_MS } from './env.js'
import { fetchRetry, json } from './http.js'
import { sb, one, insert, patch, download, upload, audit, rpc, q, agentRun } from './db.js'
import { tokenFor, HEB_MONTHS, TYPE_HE } from './cloud.js'

const FOLDER = 'application/vnd.google-apps.folder'
const RETRY_MIN = [1, 5, 30, 120, 720]                 // minutes after the 1st…5th failure; then "failed" and an alert
const NO_COMPANY = 'מסמכים ללא שיוך'
const KIND = { invoice: 'חשבוניות', invoice_receipt: 'חשבוניות', supplier_bill: 'חשבוניות', credit: 'זיכויים', receipt: 'קבלות', payment_confirmation: 'קבלות' }
const CUR = { ILS: 'שח', USD: 'USD', EUR: 'EUR', GBP: 'GBP' }
const IL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })

/* a safe part of a file name: no / \ : * ? " < > |, no control characters, a dash instead of spaces */
export const part = (s) => String(s ?? '').normalize('NFC').replace(/["״׳'`’]/g, '').replace(/[\u0000-\u001f\u007f\\/:*?<>|]+/g, ' ').trim().replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '')
/* what belongs in the archive (the same rule as fin_drive_eligible in finance.sql): a tax invoice, invoice-receipt, receipt,
   credit note or payment demand that was read, as a PDF or an image. Not an email body, a quote, an order or a confirmation. */
export const ARCHIVE_TYPES = ['invoice', 'invoice_receipt', 'receipt', 'credit', 'supplier_bill']
const isBody = (d) => String(d?.file_mime || '').startsWith('text/')     // the email itself is the receipt (Meta ads, online services)
export const eligible = (d) => !!d && !!d.file_path && ['review', 'approved', 'sent', 'duplicate'].includes(d.status) && ARCHIVE_TYPES.includes(d.doc_type) && (d.file_mime === 'application/pdf' || String(d.file_mime || '').startsWith('image/') || isBody(d))
const GENERIC = /^(scan|scanned|img|image|dsc|pxl|photo|document|doc|file|invoice|receipt|untitled|attachment|מסמך|סריקה|קובץ)[-_ ]?\d*$/i
/* the supplier as people know it: the name read from the document, else the sender's display name, else the original file
   name when it says something (not "scan001", "IMG_2026…", "document"). Hebrew and English alike. */
export function supplierFallback(doc) {
  const sender = String(doc.email_from || '').replace(/<[^>]*>/g, '').replace(/["']/g, '').trim()
  if (sender && !/@/.test(sender) && !/^(no-?reply|noreply|info|billing|invoices?|support|accounts?)$/i.test(sender)) return sender
  const base = String(doc.file_name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim()
  if (base && !GENERIC.test(base.replace(/\s+/g, '')) && /[a-zA-Z\u0590-\u05FF]{3,}/.test(base) && !/^\d|^(img|dsc|pxl|scan)/i.test(base)) return base.slice(0, 40)
  return ''
}
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
  const parts = [d.printed ? d.day : '', part(supplierName || doc.supplier_name || supplierFallback(doc)), part(TYPE_HE[doc.doc_type] || 'מסמך'), part(doc.doc_number) || `id-${String(doc.id).slice(0, 8)}`, amount].filter(Boolean)
  let base = parts.join('_')
  if (base.length > 120) base = base.slice(0, 120).replace(/[_-]+$/, '')
  return `${base}.${extOf(doc)}`
}

/* the folder keys of a document: company, year, month (and the type when the connection asks for it) */
export function folderPlan(target, doc, businessName) {
  const ck = `b:${doc.business_id || 'none'}`
  const levels = [{ key: ck, name: businessName || NO_COMPANY }]
  let { day } = dateOf(doc)
  // a person may book a document in another month than the one printed on it: the folder follows the accounting month
  // (the name keeps the printed date)
  if (/^\d{4}-\d{2}$/.test(String(doc.accounting_period || '')) && day && String(doc.accounting_period) !== day.slice(0, 7)) day = `${doc.accounting_period}-01`
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
const RESUMABLE_FROM = Number(process.env.FINANCE_DRIVE_RESUMABLE_FROM) || 5 * 1024 * 1024
/* a large file: a resumable session (the metadata first, then the bytes), as Drive asks for above 5 MB */
async function driveUploadResumable(token, { name, parent, mime, buf, props }) {
  const start = await fetch(`${env.driveUpload()}/files?uploadType=resumable&fields=${encodeURIComponent(FILE_FIELDS)}`, { method: 'POST', headers: H(token, { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(buf.length) }), body: JSON.stringify({ name, parents: [parent], appProperties: props }) })
  if (!start.ok) return json(start, 'drive upload')
  const session = start.headers.get('location')
  if (!session) throw new Error('drive upload: no session')
  return json(await fetch(session, { method: 'PUT', headers: { 'Content-Type': mime, 'Content-Length': String(buf.length) }, body: buf }), 'drive upload')
}
async function driveDownload(token, id) {
  const r = await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(id)}?alt=media`, { headers: H(token) })
  if (!r.ok) return json(r, 'drive download')
  return Buffer.from(await r.arrayBuffer())
}
/* an email that is itself the receipt has no file to open. Drive turns its HTML into a PDF: the HTML goes up as a temporary
   Google document, is exported as PDF, and the temporary document is removed (it is ours, made a moment ago; it is the one
   thing this module ever removes). The PDF is what the archive keeps. */
async function htmlToPdf(token, html, documentId) {
  const boundary = `kurkoos${crypto.randomBytes(8).toString('hex')}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: `kurkoos-convert-${documentId}`, mimeType: 'application/vnd.google-apps.document', appProperties: { kc: documentId } })}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n`),
    html, Buffer.from(`\r\n--${boundary}--`),
  ])
  const tmp = await json(await fetch(`${env.driveUpload()}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: H(token, { 'Content-Type': `multipart/related; boundary=${boundary}` }), body }), 'drive convert')
  try {
    const r = await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(tmp.id)}/export?mimeType=${encodeURIComponent('application/pdf')}`, { headers: H(token) })
    if (!r.ok) return json(r, 'drive export')
    const pdf = Buffer.from(await r.arrayBuffer())
    if (pdf.subarray(0, 4).toString() !== '%PDF') throw new Error('drive export: not a PDF')
    return pdf
  } finally {
    await fetch(`${env.driveApi()}/files/${encodeURIComponent(tmp.id)}`, { method: 'DELETE', headers: H(token) }).catch(() => {})
  }
}
async function driveTrash(token, id) {
  const r = await fetchRetry(`${env.driveApi()}/files/${encodeURIComponent(id)}?fields=id,trashed`, { method: 'PATCH', headers: H(token, { 'Content-Type': 'application/json' }), body: JSON.stringify({ trashed: true }) })
  if (r.status === 404) return null
  return json(r, 'drive trash')
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

/* the path of a folder key, by the names of the folders above it: "root/m:ab12" → /<root>/<name> */
export function pathOfKey(ctx, key) {
  const rootName = ctx.target.root_name || 'ארכיון מסמכים עסקי'
  const segs = String(key || '').split('/'); const names = []
  for (let i = 0; i < segs.length; i++) { const k = segs.slice(0, i + 1).join('/'); if (k === 'root') continue; names.push(ctx.folders.get(k)?.name || segs[i]) }
  return `/${[rootName, ...names].join('/')}`
}
/* where a pinned document lives: a folder the system knows (its key is kept in the pin's name), or a folder made in Drive */
function pinnedFolder(ctx, pin) {
  // "ext" is a folder made in Drive whose name the connection cannot read; "ext:<name>" is one whose name it could
  const ext = /^ext(:|$)/.test(String(pin.name || ''))
  const key = pin.name && !ext ? pin.name : null
  const extName = ext && String(pin.name).length > 4 ? String(pin.name).slice(4) : 'תיקייה שנוצרה ב-Drive'
  return { id: pin.drive_folder_id, key: key || 'pin', path: key ? pathOfKey(ctx, key) : `/${ctx.target.root_name || 'ארכיון מסמכים עסקי'}/${extName}` }
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
  if (doc.status === 'processing') { await setRow(row, { status: 'queued', next_try_at: new Date(Date.now() + 10 * 60_000).toISOString(), locked_until: null }); return { state: 'waiting' } }
  // not (or no longer) an invoice or receipt for the archive, or a duplicate: never uploaded → it leaves the queue;
  // already in Drive → the archive's own copy goes to the Drive trash (30 days to restore) and the row says why
  if (row.excluded || !eligible(doc) || doc.status === 'duplicate') return withdraw(ctx, row, doc)

  let buf = await download(doc.file_path)
  let fileMime = doc.file_mime || 'application/pdf'
  if (isBody(doc)) {
    // the PDF made from the email is kept in our storage too, so every later check compares the same bytes
    if (row.rendition_path) buf = await download(row.rendition_path)
    else {
      buf = await htmlToPdf(ctx.token, buf, row.document_id)
      const path = `${String(doc.file_path).replace(/\.[a-z0-9]+$/i, '')}.drive.pdf`
      await upload(path, buf, 'application/pdf')
      await setRow(row, { rendition_path: path })
    }
    fileMime = 'application/pdf'
  }
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  const md5 = crypto.createHash('md5').update(buf).digest('hex')
  // the same file already verified for another document: one copy in Drive, this one points at it
  const twin = await one(`fin_drive_files?target_id=eq.${row.target_id}&file_sha256=eq.${sha256}&status=eq.verified&document_id=neq.${row.document_id}&select=document_id,drive_file_id,web_link,folder_path,organized_name`)
  if (twin && !row.drive_file_id) {
    await setRow(row, { status: 'duplicate', duplicate_of: twin.document_id, file_sha256: sha256, file_md5: md5, drive_file_id: null, web_link: twin.web_link, folder_path: twin.folder_path, locked_until: null, error: null })
    await event(row.target_id, row.document_id, 'duplicate', { of: twin.document_id })
    return { state: 'duplicate' }
  }

  let folder = await folderFor(ctx, doc)
  // a person put this document in a folder of their own choice (in the system, or by moving it in Drive): it stays there
  const pin = ctx.folders.get(`pin:${row.document_id}`)
  if (pin) folder = pinnedFolder(ctx, pin)
  const wanted = (row.name_override || organizedName(doc, await supplierName(ctx, doc))).replace(isBody(doc) ? /\.html?$/i : /$^/, '.pdf')
  const name = await uniqueName(ctx, folder.id, wanted, row.document_id)

  // the file this document already has in Drive: by the id we kept, else by the document id it carries
  let file = row.drive_file_id ? await driveGet(ctx.token, row.drive_file_id) : null
  // (only among this connection's own files: another connected account must never take this one's copy as its own)
  if (!file) file = (await driveFind(ctx.token, `appProperties has { key='kd' and value='${row.document_id}' } and appProperties has { key='kt' and value='${tag(row.target_id)}' } and trashed=false`))[0] || null
  // in the Drive trash: the document still belongs in the archive, so a fresh copy is restored from our storage
  // (to keep a document out of the archive for good, a person takes it out on the screen)
  if (file && file.trashed) { await event(row.target_id, row.document_id, 'missing', { trashed: true }); file = null }
  // the archive's copy was changed in Drive: it goes to the Drive trash and the original is uploaded again
  if (file && file.md5Checksum && file.md5Checksum !== md5) { await driveTrash(ctx.token, file.id).catch(() => null); await event(row.target_id, row.document_id, 'changed', { drive_file_id: file.id }); file = null }
  if (file) {
    const parents = file.parents || []
    if (file.name !== name || !parents.includes(folder.id)) {
      file = await drivePatch(ctx.token, file.id, { name: file.name !== name ? name : undefined, addParent: parents.includes(folder.id) ? undefined : folder.id, removeParents: parents.filter((p) => p !== folder.id) })
      await event(row.target_id, row.document_id, row.folder_key && row.folder_key !== folder.key ? 'moved' : 'renamed', { from: { name: row.organized_name, path: row.folder_path }, to: { name, path: folder.path } })
    }
  } else {
    await setRow(row, { status: 'uploading', file_sha256: sha256, file_md5: md5, drive_folder_id: folder.id, folder_key: folder.key, folder_path: folder.path, organized_name: name })
    try {
      file = await (buf.length > RESUMABLE_FROM ? driveUploadResumable : driveUpload)(ctx.token, { name, parent: folder.id, mime: fileMime, buf, props: { kd: row.document_id, kt: tag(row.target_id), ks: sha256 } })
    } catch (e) {
      // the chosen folder is gone from Drive: the document returns to the folder its fields give
      if (e.status === 404 && pin) { await forgetFolders(ctx, [`pin:${row.document_id}`]); await event(row.target_id, row.document_id, 'pin_lost', { path: folder.path }) }
      if (e.status === 404) { await forgetFolders(ctx, ['root', ...folderPlan(ctx.target, doc, '').map((l) => l.key)]); await patch(`fin_cloud_targets?id=eq.${ctx.target.id}`, { root_folder_id: null }); ctx.target.root_folder_id = null }
      throw e
    }
    await event(row.target_id, row.document_id, 'uploaded', { name, path: folder.path })
  }
  await setRow(row, { status: 'uploaded', drive_file_id: file.id, drive_folder_id: folder.id, folder_key: folder.key, folder_path: folder.path, organized_name: name, web_link: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`, file_sha256: sha256, file_md5: md5, business_id: doc.business_id, uploaded_at: row.uploaded_at || new Date().toISOString() })

  // read back, never trusting the upload answer: there, not in the trash, this name, this folder, this size, the same bytes
  // (md5 from Drive; when Drive gives none, the file is downloaded and its SHA-256 compared)
  const back = await driveGet(ctx.token, file.id)
  const wrong = !back ? 'הקובץ לא נמצא ב-Drive אחרי ההעלאה' : back.trashed ? 'הקובץ בפח של Drive' : back.name !== name ? 'שם הקובץ ב-Drive שונה' : !(back.parents || []).includes(folder.id) ? 'הקובץ לא בתיקייה הנכונה' : back.size && Number(back.size) !== buf.length ? 'גודל הקובץ ב-Drive שונה' : back.md5Checksum && back.md5Checksum !== md5 ? 'תוכן הקובץ ב-Drive שונה מהמקור' : null
  let how = 'md5'
  if (!wrong && !back.md5Checksum) {
    const got = await driveDownload(ctx.token, file.id)
    if (crypto.createHash('sha256').update(got).digest('hex') !== sha256) { const e = new Error('תוכן הקובץ ב-Drive שונה מהמקור'); e.verify = true; throw e }
    how = 'sha256'
  }
  if (wrong) { const e = new Error(wrong); e.verify = true; throw e }
  const now = new Date().toISOString()
  const fixed = row.repair
  await setRow(row, { status: 'verified', verified_at: now, last_sync_at: now, verify_status: how, attempts: 0, next_try_at: null, locked_until: null, error: null, repair: null })
  await event(row.target_id, row.document_id, 'verified', { how, ...(fixed ? { after: fixed } : {}) })
  return { state: 'verified', link: row.web_link, path: folder.path, name }
}

const WHY = (doc, row) => row?.excluded ? 'הוצא מהארכיון על ידי אדם' : !doc ? 'המסמך נמחק מהמערכת' : doc.status === 'duplicate' ? 'כפילות של מסמך אחר שכבר בארכיון' : doc.status === 'rejected' ? 'המסמך סומן במערכת כלא רלוונטי' : !ARCHIVE_TYPES.includes(doc.doc_type) ? 'לא חשבונית ולא קבלה (למשל אישור הזמנה, הצעת מחיר או אישור תשלום)' : !(doc.file_mime === 'application/pdf' || String(doc.file_mime || '').startsWith('image/') || isBody(doc)) ? 'סוג קובץ שלא נשמר בארכיון' : 'לא שייך לארכיון'
async function withdraw(ctx, row, doc) {
  const dup = doc?.status === 'duplicate'
  if (!row.drive_file_id) {
    if (dup) { await setRow(row, { status: 'duplicate', duplicate_of: doc.duplicate_of, locked_until: null, error: null }); return { state: 'duplicate' } }
    if (row.excluded) { await setRow(row, { status: 'withdrawn', locked_until: null, next_try_at: null, error: WHY(doc, row) }); return { state: 'withdrawn' } }
    await sb(`fin_drive_files?target_id=eq.${row.target_id}&document_id=eq.${row.document_id}`, { method: 'DELETE', prefer: 'return=minimal' })
    return { state: 'left' }
  }
  await driveTrash(ctx.token, row.drive_file_id)
  const why = WHY(doc, row)
  await setRow(row, { status: dup ? 'duplicate' : 'withdrawn', duplicate_of: dup ? doc.duplicate_of : row.duplicate_of, drive_file_id: null, web_link: null, locked_until: null, next_try_at: null, error: why })
  await event(row.target_id, row.document_id, 'withdrawn', { why, name: row.organized_name, path: row.folder_path })
  return { state: 'withdrawn' }
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
          if (res.rate_limited || Date.now() - started > budgetMs) { await setRow(row, { status: row.drive_file_id ? 'uploaded' : 'queued', locked_until: null }); continue }
          try {
            const r = await processRow(ctx, row)
            if (r.state === 'verified') { res.verified++; run.stat.processed++ } else if (r.state === 'duplicate') res.duplicates++; else if (r.state === 'withdrawn') res.withdrawn = (res.withdrawn || 0) + 1
          } catch (e) {
            if (e.auth || e.status === 401) { await setRow(row, { status: row.drive_file_id ? 'uploaded' : 'queued', locked_until: null }); throw e }
            // Google asks to slow down: this is not the document's failure. It waits two minutes and the run stops here.
            if (isRate(e)) { await setRow(row, { status: 'queued', next_try_at: new Date(Date.now() + 2 * 60_000).toISOString(), locked_until: null, error: 'Google Drive ביקש להאט. ממשיך לבד בעוד שתי דקות' }); await event(row.target_id, row.document_id, 'rate_limited', null); res.rate_limited = true; left = 0; continue }
            await failRow(row, e); run.stat.errors++
            if (row.status === 'failed') res.failed++; else res.retry++
          }
        }
      }
      // a connection that was disconnected while this run was working stays disconnected (the run must not bring it back)
      await patch(`fin_cloud_targets?id=eq.${t.id}&status=neq.revoked`, { status: 'active', last_error: null, last_sync_at: new Date().toISOString(), files_synced: (t.files_synced || 0) + res.verified, files_failed: res.failed })
      // after a sync that uploaded files, the whole archive is checked against Drive (at most once in 6 hours; the night run does it anyway)
      if (res.verified && trigger !== 'repair' && trigger !== 'manual' && (!t.last_reconcile_at || Date.now() - new Date(t.last_reconcile_at).getTime() > 6 * 3600_000)) await startReconcile({ targetId: t.id, trigger: 'after_sync' }).catch(() => {})
    } catch (e) {
      res.error = String(e.message || e).slice(0, 300)
      if (e.auth || e.status === 401) await patch(`fin_cloud_targets?id=eq.${t.id}&status=neq.revoked`, { status: 'error', last_error: 'ההרשאה ל-Google Drive בוטלה או פגה. חברו מחדש' }).catch(() => {})
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

// ---------- the reconciliation agent ----------
// Compares the whole archive with Drive in three resumable stages (fin_drive_reconciles): list every page of Drive into
// fin_drive_seen with the page token as the checkpoint; compare every row with what Drive really holds; repair (a missing or
// trashed file is restored from our storage, a wrong folder or name is corrected, a changed file is replaced) and wait until
// each repair is verified. "completed" only when nothing is left; otherwise "completed_with_issues" with the exact list.
const SEEN_FIELDS = 'nextPageToken,files(id,name,parents,size,md5Checksum,mimeType,trashed,appProperties)'
const isRate = (e) => e?.status === 429 || (e?.status === 403 && /rate ?limit|userRateLimitExceeded|rateLimitExceeded|quota/i.test(String(e.message || '') + String(e.code || '')))

export async function startReconcile({ targetId, trigger = 'manual', user = null }) {
  const running = await one(`fin_drive_reconciles?target_id=eq.${q(targetId)}&status=eq.running&select=*`)
  if (running) return { ...running, already: true }
  await rpc('fin_drive_enqueue', { p_target: targetId }).catch(() => 0)
  // what is held and no longer belongs (not an invoice or receipt, an email body, rejected, a duplicate) goes back to the
  // queue, where the run moves the archive's own copy to the Drive trash
  const held = await pagedAll(`fin_drive_files?target_id=eq.${q(targetId)}&status=in.(verified,uploaded,needs_review,failed)&select=document_id,fin_documents!fin_drive_files_document_id_fkey(id,status,doc_type,file_mime,file_path)&order=document_id`)
  const stray = held.filter((r) => !r.fin_documents || !eligible(r.fin_documents) || r.fin_documents.status === 'duplicate').map((r) => r.document_id)
  for (let i = 0; i < stray.length; i += 100) await patch(`fin_drive_files?target_id=eq.${q(targetId)}&document_id=in.(${stray.slice(i, i + 100).join(',')})`, { status: 'queued', next_try_at: null, updated_at: new Date().toISOString() })
  // a failure that gave up gets one more try with every check
  await patch(`fin_drive_files?target_id=eq.${q(targetId)}&status=eq.failed`, { status: 'queued', attempts: RETRY_MIN.length - 1, next_try_at: null, updated_at: new Date().toISOString() }).catch(() => {})
  const rec = await insert('fin_drive_reconciles', { target_id: targetId, trigger, requested_by: user?.id || null }, 'resolution=ignore-duplicates,return=representation')
    || await one(`fin_drive_reconciles?target_id=eq.${q(targetId)}&status=eq.running&select=*`)
  await event(targetId, null, 'reconcile_started', { reconcile: rec?.id, trigger }, user)
  return rec
}

async function listStep(ctx, rec, started, budgetMs) {
  let pageToken = rec.page_token || ''
  do {
    const p = new URLSearchParams({ q: `appProperties has { key='kt' and value='${tag(ctx.target.id)}' } and mimeType!='${FOLDER}'`, fields: SEEN_FIELDS, pageSize: '1000' })
    if (pageToken) p.set('pageToken', pageToken)
    const r = await json(await fetchRetry(`${env.driveApi()}/files?${p}`, { headers: H(ctx.token) }), 'drive list')
    const files = r.files || []
    if (files.length) await sb('fin_drive_seen', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: files.map((f) => ({ reconcile_id: rec.id, drive_file_id: f.id, document_id: /^[0-9a-f-]{36}$/i.test(f.appProperties?.kd || '') ? f.appProperties.kd : null, name: f.name, parent: (f.parents || [])[0] || null, size: f.size ? Number(f.size) : null, md5: f.md5Checksum || null, mime: f.mimeType || null, trashed: !!f.trashed })) })
    pageToken = r.nextPageToken || ''
    rec.pages++; rec.listed += files.length
    // the checkpoint: a stop here goes on from the next page, not from the start
    await patch(`fin_drive_reconciles?id=eq.${rec.id}`, { page_token: pageToken || null, pages: rec.pages, listed: rec.listed, phase: pageToken ? 'list' : 'compare', updated_at: new Date().toISOString() })
    if (!pageToken) rec.phase = 'compare'
  } while (pageToken && Date.now() - started < budgetMs)
}

async function pagedAll(path, size = 1000) {
  const out = []
  for (let off = 0; ; off += size) {
    const rows = (await sb(`${path}&limit=${size}&offset=${off}`)) || []
    out.push(...rows)
    if (rows.length < size) return out
  }
}

async function compareStep(ctx, rec) {
  const t = ctx.target
  const twoWay = await isTwoWay()
  const seen = await pagedAll(`fin_drive_seen?reconcile_id=eq.${rec.id}&select=drive_file_id,document_id,name,parent,size,md5,trashed&order=drive_file_id`)
  const rows = await pagedAll(`fin_drive_files?target_id=eq.${t.id}&select=document_id,status,excluded,drive_file_id,drive_folder_id,organized_name,file_md5,file_sha256,fin_documents!fin_drive_files_document_id_fkey(file_path)&order=document_id`)
  const byDoc = new Map()
  for (const f of seen) if (f.document_id) { if (!byDoc.has(f.document_id)) byDoc.set(f.document_id, []); byDoc.get(f.document_id).push(f) }
  const R = { in_system: 0, found_in_drive: 0, verified_ok: 0, missing: 0, trashed: 0, wrong_folder: 0, wrong_name: 0, changed: 0, no_source: 0, duplicates_in_drive: 0, orphans: 0, orphan_names: [], pending_upload: 0 }
  const ok = []; const repairs = []
  const held = new Set(rows.filter((r) => r.status !== 'withdrawn').map((r) => r.document_id))
  for (const r of rows) {
    if (['queued', 'uploading'].includes(r.status) && !r.excluded) { R.pending_upload++; continue }
    if (!['verified', 'uploaded'].includes(r.status) || r.excluded) continue
    R.in_system++
    const files = byDoc.get(r.document_id) || []
    const live = files.filter((f) => !f.trashed)
    const own = live.find((f) => f.drive_file_id === r.drive_file_id) || live[0]
    // our own extra copies of one document (from an old run): the one we keep stays, the others go to the Drive trash
    for (const extra of live.filter((f) => f !== own)) { R.duplicates_in_drive++; await driveTrash(ctx.token, extra.drive_file_id).catch(() => null); await event(t.id, r.document_id, 'duplicate_trashed', { drive_file_id: extra.drive_file_id }) }
    if (own) R.found_in_drive++
    let kind = null
    if (!own) kind = files.some((f) => f.trashed) ? 'trashed' : 'missing'
    else if (r.file_md5 && own.md5 && own.md5 !== r.file_md5) kind = 'changed'
    else if (own.parent !== r.drive_folder_id) kind = 'wrong_folder'
    else if (own.name !== r.organized_name) kind = 'wrong_name'
    if (!kind) { R.verified_ok++; ok.push(r.document_id); continue }
    // two-way sync: a rename, a move or a trashing done in Drive is the person's wish, and the system follows it
    if (twoWay && ['trashed', 'wrong_folder', 'wrong_name'].includes(kind)) {
      const seenFile = own || files.find((f) => f.trashed)
      const did = await adopt(ctx, await one(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${r.document_id}&select=*`), { id: seenFile.drive_file_id, name: seenFile.name, parents: [seenFile.parent], trashed: !!seenFile.trashed, md5Checksum: seenFile.md5 }, { via: 'reconcile' }).catch(() => null)
      if (did) { R.adopted = (R.adopted || 0) + 1; R[`adopted_${did}`] = (R[`adopted_${did}`] || 0) + 1; if (did !== 'trashed') ok.push(r.document_id); continue }
    }
    R[kind]++
    const noSource = ['missing', 'trashed', 'changed'].includes(kind) && !r.fin_documents?.file_path
    if (noSource) R.no_source++
    repairs.push({ r, kind, own, noSource })
  }
  // The archive's own copy of a document that no longer exists in the system (deleted there) goes to the Drive trash:
  // a deletion in the system is a deletion in Drive. A file with no mark of ours is somebody's own and is only counted.
  const loose = seen.filter((f) => !f.trashed && f.document_id && !held.has(f.document_id))
  const alive = new Set()
  for (let i = 0; i < loose.length; i += 100) for (const d of (await sb(`fin_documents?id=in.(${loose.slice(i, i + 100).map((f) => f.document_id).join(',')})&select=id`)) || []) alive.add(d.id)
  R.deleted_trashed = 0
  for (const f of loose) if (!alive.has(f.document_id) && t.auto_correct !== false) { const done = await driveTrash(ctx.token, f.drive_file_id).then(() => true, () => false); if (done) { f.trashed = true; R.deleted_trashed++; await event(t.id, null, 'withdrawn', { why: 'המסמך נמחק מהמערכת', name: f.name, reconcile: rec.id }) } }
  for (const f of seen) if (!f.trashed && (!f.document_id || !held.has(f.document_id))) { R.orphans++; if (R.orphan_names.length < 30) R.orphan_names.push(f.name) }
  // the ones that are right: "last checked against Drive" moves on
  const now = new Date().toISOString()
  for (let i = 0; i < ok.length; i += 100) await patch(`fin_drive_files?target_id=eq.${t.id}&document_id=in.(${ok.slice(i, i + 100).join(',')})`, { last_sync_at: now })
  for (const { r, kind, own, noSource } of repairs) {
    const auto = t.auto_correct !== false || ['missing', 'trashed', 'changed'].includes(kind)
    let outcome = 'pending'
    if (noSource) {
      outcome = 'attention'
      await patch(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${r.document_id}`, { status: 'needs_review', repair: kind, error: 'הקובץ חסר ב-Drive, וגם הקובץ המקורי לא נמצא במערכת. אי אפשר לשחזר אותו', updated_at: now })
    } else if (auto) {
      // back to the queue: the run restores (missing, trashed, changed) or corrects (folder, name) and verifies again
      await patch(`fin_drive_files?target_id=eq.${t.id}&document_id=eq.${r.document_id}`, { status: 'queued', attempts: 0, next_try_at: null, locked_until: null, repair: kind, drive_file_id: ['missing', 'trashed'].includes(kind) ? null : (own?.drive_file_id || r.drive_file_id), updated_at: now })
    } else outcome = 'attention'
    await insert('fin_drive_repairs', { reconcile_id: rec.id, document_id: r.document_id, kind, outcome, detail: own ? { name: own.name, parent: own.parent } : null }, 'resolution=merge-duplicates,return=minimal')
    await event(t.id, r.document_id, kind === 'missing' || kind === 'trashed' ? 'missing' : kind, { reconcile: rec.id, trashed: kind === 'trashed' })
  }
  rec.report = R; rec.phase = 'repair'
  await patch(`fin_drive_reconciles?id=eq.${rec.id}`, { phase: 'repair', report: R, updated_at: now })
}

async function repairStep(rec) {
  const pend = (await sb(`fin_drive_repairs?reconcile_id=eq.${rec.id}&outcome=eq.pending&select=document_id,kind`)) || []
  if (pend.length) {
    const st = new Map(((await sb(`fin_drive_files?target_id=eq.${rec.target_id}&document_id=in.(${pend.map((x) => x.document_id).join(',')})&select=document_id,status`)) || []).map((x) => [x.document_id, x.status]))
    for (const x of pend) {
      const s2 = st.get(x.document_id)
      const outcome = s2 === 'verified' ? (['missing', 'trashed', 'changed'].includes(x.kind) ? 'restored' : 'corrected') : ['failed', 'needs_review'].includes(s2) || !s2 ? 'attention' : null
      if (outcome) {
        await patch(`fin_drive_repairs?reconcile_id=eq.${rec.id}&document_id=eq.${x.document_id}`, { outcome, at: new Date().toISOString() })
        if (outcome !== 'attention') await event(rec.target_id, x.document_id, outcome, { reconcile: rec.id, kind: x.kind })
      }
    }
  }
  const left = (await sb(`fin_drive_repairs?reconcile_id=eq.${rec.id}&outcome=eq.pending&select=document_id`)) || []
  if (left.length) return false
  // done: the final numbers, and "completed" only when nothing is left
  const all = (await sb(`fin_drive_repairs?reconcile_id=eq.${rec.id}&select=outcome`)) || []
  const target = await one(`fin_cloud_targets?id=eq.${rec.target_id}&select=*`)
  const c = await counts(target)
  const R = { ...(rec.report || {}), restored: all.filter((x) => x.outcome === 'restored').length, corrected: all.filter((x) => x.outcome === 'corrected').length, attention: all.filter((x) => x.outcome === 'attention').length, failed: c.failed, needs_review: c.needs_review, verified_now: c.verified, expected_now: c.expected }
  R.outstanding = R.attention + c.failed + c.needs_review
  const status = R.outstanding ? 'completed_with_issues' : 'completed'
  const at = new Date().toISOString()
  await patch(`fin_drive_reconciles?id=eq.${rec.id}`, { phase: 'done', status, report: R, finished_at: at, updated_at: at })
  await sb(`fin_drive_seen?reconcile_id=eq.${rec.id}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {})
  await patch(`fin_cloud_targets?id=eq.${rec.target_id}`, { last_reconcile_at: at, last_reconcile: { ...R, status, reconcile: rec.id, at } })
  await event(rec.target_id, null, 'reconcile_done', { reconcile: rec.id, status, outstanding: R.outstanding })
  Object.assign(rec, { phase: 'done', status, report: R })
  return true
}

/* one step of every reconciliation in progress, within the time given (the minute run, the night run, the button) */
export async function reconcileStep({ started = Date.now(), budgetMs = TIME_BUDGET_MS, targetId = null } = {}) {
  const recs = (await sb(`fin_drive_reconciles?status=eq.running${targetId ? `&target_id=eq.${q(targetId)}` : ''}&select=*&order=started_at`)) || []
  const out = []
  for (const rec of recs) {
    if (Date.now() - started > budgetMs) break
    const t = await one(`fin_cloud_targets?id=eq.${rec.target_id}&select=*`)
    if (!t || !t.enabled || t.status === 'revoked') { out.push({ reconcile: rec.id, skipped: true }); continue }
    try {
      const ctx = await context(t)
      if (rec.phase === 'list') await listStep(ctx, rec, started, budgetMs)
      if (rec.phase === 'compare' && Date.now() - started < budgetMs) await compareStep(ctx, rec)
      if (rec.phase === 'repair') await repairStep(rec)
      await patch(`fin_drive_reconciles?id=eq.${rec.id}`, { error: null, updated_at: new Date().toISOString() })
    } catch (e) {
      // not the end: the next minute goes on from the checkpoint; a broken connection is the connection's error
      await patch(`fin_drive_reconciles?id=eq.${rec.id}`, { error: String(e.message || e).slice(0, 300), updated_at: new Date().toISOString() }).catch(() => {})
      if (e.auth || e.status === 401) await patch(`fin_cloud_targets?id=eq.${t.id}&status=neq.revoked`, { status: 'error', last_error: 'ההרשאה ל-Google Drive בוטלה או פגה. חברו מחדש' }).catch(() => {})
    }
    out.push({ reconcile: rec.id, target: rec.target_id, phase: rec.phase, status: rec.status, report: rec.report })
  }
  return out
}

/* the whole check now (the button, the night run, the tests): start, then list, compare and repair until done or out of time */
export async function reconcile({ started = Date.now(), budgetMs = TIME_BUDGET_MS, trigger = 'manual', targetId = null, user = null } = {}) {
  const out = []
  for (const t of await gdriveTargets(targetId)) {
    const rec = await startReconcile({ targetId: t.id, trigger, user })
    let last = rec
    while (Date.now() - started < budgetMs) {
      const [r] = await reconcileStep({ started, budgetMs, targetId: t.id })
      last = r || last
      if (!r || r.status !== 'running') break
      if (r.phase === 'repair') await tick({ started, budgetMs, trigger: 'repair', targetId: t.id })
    }
    const now = await one(`fin_drive_reconciles?id=eq.${rec.id}&select=*`)
    out.push({ target: t.id, reconcile: rec.id, status: now?.status, phase: now?.phase, ...(now?.report || {}), missing: (now?.report?.missing || 0) + (now?.report?.trashed || 0) })
  }
  return out
}

async function counts(t) {
  const rows = (await sb(`fin_drive_files?target_id=eq.${t.id}&select=status`)) || []
  const by = {}; for (const r of rows) by[r.status] = (by[r.status] || 0) + 1
  return { withdrawn: by.withdrawn || 0, expected: rows.filter((r) => !['duplicate', 'withdrawn'].includes(r.status)).length, verified: by.verified || 0, pending: (by.queued || 0) + (by.uploading || 0) + (by.uploaded || 0), failed: by.failed || 0, duplicates: by.duplicate || 0, needs_review: by.needs_review || 0 }
}

/* the screen: the connection, totals from the documents to Drive, problems, and the explorer rows */
export async function overview({ user }) {
  const targets = (await sb('fin_cloud_targets?provider=eq.gdrive&status=neq.revoked&select=id,account_email,status,enabled,auto_correct,root_folder_id,root_name,by_kind,auto,business_id,last_sync_at,last_error,last_reconcile_at,last_reconcile,created_at&order=created_at')) || []
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
    const reconciles = (await sb(`fin_drive_reconciles?target_id=eq.${t.id}&select=id,trigger,status,phase,pages,listed,report,error,started_at,finished_at&order=started_at.desc&limit=5`)) || []
    const repairs = reconciles[0] ? ((await sb(`fin_drive_repairs?reconcile_id=eq.${reconciles[0].id}&select=document_id,kind,outcome,at&order=at.desc&limit=100`)) || []) : []
    out.push({ ...t, counts: c, folders, companies, problems, queued, unassigned: awaiting.length, reconciles, repairs })
  }
  return { targets: out, collected, user: user?.email || null }
}

export async function tree({ targetId, user }) {
  const rows = (await sb(`fin_drive_files?target_id=eq.${q(targetId)}&status=neq.withdrawn&select=document_id,business_id,status,folder_key,folder_path,organized_name,web_link,verified_at,error,duplicate_of,uploaded_at,updated_at&order=folder_path,organized_name&limit=5000`)) || []
  const ok = (r) => !user?.business_ids?.length || (r.business_id && user.business_ids.includes(r.business_id))
  return rows.filter(ok)
}
/* the folders a person made (also the empty ones), and what was taken out of the archive (the trash of this screen) */
export async function extras({ targetId, user }) {
  const target = await one(`fin_cloud_targets?id=eq.${q(targetId)}&select=*`)
  if (!target) return { folders: [], trash: [] }
  const all = (await sb(`fin_drive_folders?target_id=eq.${q(targetId)}&select=key,name,drive_folder_id,created_at&order=created_at`)) || []
  const ctx = { target, folders: new Map(all.map((f) => [f.key, f])) }
  const folders = all.filter((f) => /(^|\/)m:[0-9a-f]+$/.test(f.key)).map((f) => ({ key: f.key, name: f.name, path: pathOfKey(ctx, f.key), created_at: f.created_at }))
  const limited = (r) => !user?.business_ids?.length || (r.business_id && user.business_ids.includes(r.business_id))
  const trash = ((await sb(`fin_drive_files?target_id=eq.${q(targetId)}&status=eq.withdrawn&select=document_id,business_id,status,folder_path,organized_name,error,updated_at,drive_file_id&order=updated_at.desc&limit=500`)) || []).filter(limited).map(({ drive_file_id, ...r }) => ({ ...r, in_drive_trash: !!drive_file_id }))
  return { folders, trash, two_way: await isTwoWay(), sync: ((await one(`fin_settings?key=eq.drive_sync_state&select=value`))?.value || {})[targetId] || null }
}
/* two-way sync is on unless it was turned off (fin_settings "drive_two_way") */
export async function isTwoWay() { const v = (await one(`fin_settings?key=eq.drive_two_way&select=value`).catch(() => null))?.value; return v !== false }

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

/* A person moves documents: to another company, to another accounting month, or both. The document is changed first
   (the database queues its file), then the file is moved in Drive now, and each answer says whether Drive confirmed it.
   A document that is not in the archive (no file, or a kind that is not archived) is changed in the system only. */
export async function moveDocs({ targetId, ids, businessId, period, user }) {
  const target = await one(`fin_cloud_targets?id=eq.${q(targetId)}&select=*`)
  if (!target || target.status === 'revoked') throw Object.assign(new Error('Google Drive לא מחובר'), { status: 409 })
  if (period !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period))) throw Object.assign(new Error('חודש לא תקין'), { status: 400 })
  if (businessId && !(await one(`fin_businesses?id=eq.${q(businessId)}&select=id`))) throw Object.assign(new Error('החברה לא נמצאה'), { status: 404 })
  if (user?.business_ids?.length && businessId !== undefined && !(businessId && user.business_ids.includes(businessId))) throw Object.assign(new Error('אין לך הרשאה לחברה הזו'), { status: 403 })
  const results = []; const moved = []
  for (const id of ids) {
    const doc = await one(`fin_documents?id=eq.${q(id)}&select=id,status,business_id,accounting_period,project_id`)
    if (!doc) { results.push({ id, ok: false, error: 'המסמך לא נמצא' }); continue }
    if (user?.business_ids?.length && doc.business_id && !user.business_ids.includes(doc.business_id)) { results.push({ id, ok: false, error: 'אין לך הרשאה למסמך הזה' }); continue }
    if (['approved', 'sent'].includes(doc.status) && user?.role !== 'admin') { results.push({ id, ok: false, error: 'מסמך מאושר או שנשלח מועבר רק על ידי מנהל המערכת' }); continue }
    const body = {}
    if (businessId !== undefined && (businessId || null) !== (doc.business_id || null)) { body.business_id = businessId || null; body.business_source = businessId ? 'manual' : null }
    if (period !== undefined && period !== doc.accounting_period) body.accounting_period = period
    // a project belongs to one company: a document that moves to another company leaves the project of the old one
    if ('business_id' in body && doc.project_id) { const pr = await one(`fin_projects?id=eq.${q(doc.project_id)}&select=business_id`); if (pr?.business_id && pr.business_id !== body.business_id) body.project_id = null }
    if (!Object.keys(body).length) { results.push({ id, ok: true, same: true }); continue }
    try { await patch(`fin_documents?id=eq.${q(id)}`, body); moved.push({ id, from: { business_id: doc.business_id, period: doc.accounting_period }, to: body }) } catch (e) { results.push({ id, ok: false, error: String(e.message || e).slice(0, 200) }) }
  }
  if (moved.length) {
    // the person chose a company or a month: a folder chosen by hand before no longer holds the document
    await sb(`fin_drive_folders?target_id=eq.${q(targetId)}&key=in.(${moved.map((m) => q(`pin:${m.id}`)).join(',')})`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {})
    const inDrive = new Set(((await sb(`fin_drive_files?target_id=eq.${q(targetId)}&document_id=in.(${moved.map((m) => q(m.id)).join(',')})&select=document_id,status`)) || []).filter((r) => r.status !== 'withdrawn').map((r) => r.document_id))
    const saved = inDrive.size ? await saveNow({ target, ids: moved.filter((m) => inDrive.has(m.id)).map((m) => m.id), user }).catch((e) => moved.filter((m) => inDrive.has(m.id)).map((m) => ({ id: m.id, ok: false, error: String(e.message || e).slice(0, 200) }))) : []
    const by = new Map(saved.map((r) => [r.id, r]))
    for (const m of moved) {
      const r = by.get(m.id)
      // the document is already changed; when Drive did not confirm, the file stays queued and the next run moves it
      results.push(!inDrive.has(m.id) ? { id: m.id, ok: true, drive: 'none' } : r?.ok ? { id: m.id, ok: true, drive: 'moved', path: r.path, link: r.link } : { id: m.id, ok: true, drive: 'pending', error: r?.error || 'Drive לא אישר את ההעברה' })
      await event(targetId, m.id, 'moved_by_user', { from: m.from, to: m.to, drive: r?.ok ? 'moved' : inDrive.has(m.id) ? 'pending' : 'none' }, user).catch(() => {})
    }
    await audit('cloud', targetId, 'archive_moved', { documents: moved.map((m) => m.id).slice(0, 50), business_id: businessId, period }, user).catch(() => {})
  }
  return { results, moved: results.filter((r) => r.drive === 'moved').length, pending: results.filter((r) => r.drive === 'pending').length, failed: results.filter((r) => !r.ok).length }
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
export async function settings({ targetId, by_kind, auto, auto_correct, enabled, user }) {
  const body = {}
  if (typeof auto_correct === 'boolean') body.auto_correct = auto_correct
  if (typeof enabled === 'boolean') body.enabled = enabled            // pause / resume: a paused connection uploads and checks nothing
  if (typeof by_kind === 'boolean') body.by_kind = by_kind
  if (typeof auto === 'boolean') body.auto = auto
  const before = await one(`fin_cloud_targets?id=eq.${q(targetId)}&provider=eq.gdrive&select=by_kind`)
  if (!before) throw Object.assign(new Error('החיבור לא נמצא'), { status: 404 })
  await patch(`fin_cloud_targets?id=eq.${q(targetId)}`, body)
  if ('by_kind' in body && body.by_kind !== before.by_kind) await patch(`fin_drive_files?target_id=eq.${q(targetId)}&status=eq.verified`, { status: 'queued', next_try_at: null, updated_at: new Date().toISOString() })
  await audit('cloud', targetId, 'archive_settings', body, user)
  return one(`fin_cloud_targets?id=eq.${q(targetId)}&select=id,root_name,by_kind,auto,auto_correct,enabled`)
}

/* a person takes documents out of the archive (or puts them back): the copy goes to the Drive trash and is not uploaded again */
/* A document is about to be deleted from the system: its copy in Drive goes to the Drive trash first (30 days to
   restore there). Only the archive's own file is touched. A failure does not stop the deletion: the next check against
   Drive finds a file whose document no longer exists and trashes it then. */
// the archive's copies of these documents: read before a document is deleted, because the rows go with it
export async function driveCopies(ids) {
  const out = []
  // one question for up to 100 documents (it used to be one per document)
  for (let i = 0; i < ids.length; i += 100) out.push(...((await sb(`fin_drive_files?document_id=in.(${ids.slice(i, i + 100).map(q).join(',')})&select=target_id,document_id,drive_file_id,organized_name,folder_path,rendition_path`)) || []))
  return out
}
// each copy goes to the Drive trash, four at a time. Trashing a file that is already trashed or gone counts as done.
export async function trashCopies(rows, user) {
  let trashed = 0; const failed = []; const trashedOf = {}
  const mine = rows.filter((x) => x.drive_file_id)
  // one sign-in per destination, before the files (asked once, not once per file)
  const ctxs = new Map()
  for (const tid of new Set(mine.map((r) => r.target_id))) {
    try { const t = await one(`fin_cloud_targets?id=eq.${q(tid)}&select=*`); ctxs.set(tid, t && t.status !== 'revoked' ? await context(t).catch(() => null) : null) } catch { ctxs.set(tid, null) }
  }
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, mine.length) }, async () => {
    while (next < mine.length) {
      const r = mine[next++]
      try {
        const ctx = ctxs.get(r.target_id)
        if (!ctx) { failed.push(r.document_id); continue }
        await driveTrash(ctx.token, r.drive_file_id).catch((e) => { if (e?.status !== 404) throw e })
        await event(r.target_id, null, 'withdrawn', { why: 'המסמך נמחק מהמערכת', name: r.organized_name, path: r.folder_path, document: r.document_id }, user)
        trashed++; trashedOf[r.document_id] = (trashedOf[r.document_id] || 0) + 1
      } catch { failed.push(r.document_id) }
    }
  }))
  if (trashed) await audit('cloud', null, 'archive_file_trashed', { documents: [...new Set(rows.map((r) => r.document_id))].slice(0, 50), trashed }, user).catch(() => {})
  return { trashed, failed: [...new Set(failed)], trashedOf }
}
export async function removeFromDrive({ ids, user }) { return trashCopies(await driveCopies(ids), user) }

export async function exclude({ targetId, ids, excluded = true, user }) {
  for (const id of ids) {
    await patch(`fin_drive_files?target_id=eq.${q(targetId)}&document_id=eq.${q(id)}`, { excluded: !!excluded, status: 'queued', attempts: 0, next_try_at: null, locked_until: null, updated_at: new Date().toISOString() })
    await event(targetId, id, excluded ? 'excluded_by_user' : 'included_by_user', null, user)
  }
  await audit('cloud', targetId, excluded ? 'archive_excluded' : 'archive_included', { ids: ids.slice(0, 50) }, user)
  return { changed: ids.length }
}

// ---------- two-way sync: what a person did in Drive is followed by the system (driveSync.js runs it) ----------
/* One file of ours as Drive holds it now, against the row. Returns what was adopted: 'trashed' | 'restored' | 'renamed' |
   'moved' | null. Only a settled row is touched (verified, or taken out): a row the queue is working on is left to it. */
export async function adopt(ctx, row, file, { via = 'changes' } = {}) {
  if (!row || !file) return null
  const t = ctx.target; const now = new Date().toISOString()
  const TRASHED = 'הועבר לפח ב-Google Drive'
  if (file.trashed) {
    if (row.status === 'withdrawn' || !['verified', 'uploaded'].includes(row.status)) return null
    // in the Drive trash: out of the archive here too, kept in this screen's trash, never uploaded again by itself
    await setRow(row, { status: 'withdrawn', excluded: true, drive_file_id: file.id, locked_until: null, next_try_at: null, error: TRASHED, last_sync_at: now })
    await event(t.id, row.document_id, 'trashed_in_drive', { name: row.organized_name, path: row.folder_path, via })
    return 'trashed'
  }
  if (row.status === 'withdrawn') {
    if (row.error !== TRASHED) return null
    // taken back out of the Drive trash: back in the archive, and checked again
    await setRow(row, { status: 'queued', excluded: false, drive_file_id: file.id, attempts: 0, next_try_at: null, error: null })
    await event(t.id, row.document_id, 'restored_in_drive', { name: file.name, via })
    return 'restored'
  }
  if (row.status !== 'verified') return null
  let did = null
  if (file.name && file.name !== row.organized_name) {
    const was = row.organized_name
    await setRow(row, { name_override: file.name, organized_name: file.name, last_sync_at: now })
    await event(t.id, row.document_id, 'renamed_in_drive', { from: was, to: file.name, via })
    did = 'renamed'
  }
  const parent = (file.parents || [])[0]
  if (parent && parent !== row.drive_folder_id) {
    const dest = [...ctx.folders.values()].find((f) => f.drive_folder_id === parent && !String(f.key).startsWith('pin:'))
    const from = { path: row.folder_path }
    const month = dest && /^b:([^/]+)\/(\d{4})\/(\d{2})(\/k:.+)?$/.exec(dest.key)
    const doc = await one(`fin_documents?id=eq.${row.document_id}&select=id,status,business_id,accounting_period,project_id,issue_date`)
    let path
    if (month && doc && !['approved', 'sent'].includes(doc.status)) {
      // into a company's month folder: the document is assigned to that company and month, exactly as a move in the system
      const biz = month[1] === 'none' ? null : month[1]; const period = `${month[2]}-${month[3]}`
      const body = {}
      if ((biz || null) !== (doc.business_id || null)) { body.business_id = biz; body.business_source = biz ? 'manual' : null }
      if (period !== (doc.accounting_period || String(doc.issue_date || '').slice(0, 7))) body.accounting_period = period
      if ('business_id' in body && doc.project_id) { const pr = await one(`fin_projects?id=eq.${q(doc.project_id)}&select=business_id`); if (pr?.business_id && pr.business_id !== body.business_id) body.project_id = null }
      if (Object.keys(body).length) await patch(`fin_documents?id=eq.${row.document_id}`, body)
      await sb(`fin_drive_folders?target_id=eq.${t.id}&key=eq.${q(`pin:${row.document_id}`)}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {}); ctx.folders.delete(`pin:${row.document_id}`)
      path = pathOfKey(ctx, dest.key)
      await setRow(row, { drive_folder_id: parent, folder_key: dest.key, folder_path: path, business_id: biz, last_sync_at: now })
      await audit('document', row.document_id, 'moved_in_drive', { to: body, path }, { email: 'Google Drive' }).catch(() => {})
    } else {
      // anywhere else (a folder a person made, a company's own folder, an approved document): the file stays where the
      // person put it, and the system remembers the place; the document's own details are not changed
      // a folder made in Drive: its name is read when the connection may see it (the wide permission), else it stays unnamed
      const seen = dest ? null : await driveGet(ctx.token, parent).catch(() => null)
      const pin = { target_id: t.id, key: `pin:${row.document_id}`, name: dest ? dest.key : seen?.name ? `ext:${String(seen.name).slice(0, 100)}` : 'ext', drive_folder_id: parent }
      await sb('fin_drive_folders', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: pin })
      ctx.folders.set(pin.key, pin)
      const f = pinnedFolder(ctx, pin); path = f.path
      await setRow(row, { drive_folder_id: parent, folder_key: f.key, folder_path: path, last_sync_at: now })
    }
    await event(t.id, row.document_id, 'moved_in_drive', { from, to: { path }, via })
    did = 'moved'
  }
  return did
}

// what driveSync.js builds on (kept here so there is one place that talks to Drive)
export const kit = { context, rootOf, ensure, driveGet, drivePatch, driveTrash, driveCreateFolder, event, setRow, tag, H, saveNow, FOLDER, FILE_FIELDS }
