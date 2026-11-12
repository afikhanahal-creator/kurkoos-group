/* The one place a document is deleted. Every screen calls it (action "documents-delete"), so a deletion is the same
   everywhere: the row (and with it the allocations, attachments, archive rows and links, by the database's cascades),
   the files in storage, the archive's copy in Google Drive, and a note that keeps the same file from being collected
   again. The row is the source of truth and goes first; what is left after it (Drive, storage) is repeatable and is
   finished by sweep() and by the archive's check against Drive when a step could not be done now.
   Deleting a document that is already gone is a success, not an error. */
import { env, BUCKET } from './env.js'
import { sb, one, insert, q, audit, removeFile } from './db.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCKED = ['approved', 'sent']
// the same rule as the database policy "fin_documents delete"
export const mayDelete = (user, d) => user?.role === 'admin' || (user?.role === 'finance_manager' && !LOCKED.includes(d.status))

const gone = async (path) => { try { await removeFile(path); return true } catch { return false } }

export async function removeDocuments({ ids, user, reason = '' }) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter((x) => UUID.test(x)).slice(0, 200)
  const results = []
  const archive = await import('./archive.js')
  for (const id of list) {
    const out = { id, ok: false }
    try {
      const doc = await one(`fin_documents?id=eq.${q(id)}&select=id,status,created_by,business_id,source,mailbox_id,email_subject,email_from,file_name,file_path,file_hash,supplier_name,total_amount`)
      if (!doc) { results.push({ id, ok: true, already: true }); continue }
      if (user && !mayDelete(user, doc)) { results.push({ ...out, error: LOCKED.includes(doc.status) ? 'מסמך מאושר או שנשלח נמחק רק על ידי מנהל המערכת' : 'אין לך הרשאה למחוק את המסמך הזה' }); continue }
      if (user?.business_ids?.length && doc.business_id && !user.business_ids.includes(doc.business_id)) { results.push({ ...out, error: 'המסמך לא שייך לחברה שלך' }); continue }
      // everything that hangs on the row is read before the row goes
      const copies = await archive.driveCopies([id]).catch(() => [])
      const files = (await sb(`fin_document_attachments?document_id=eq.${q(id)}&kind=eq.file&file_path=not.is.null&select=file_path`).catch(() => [])) || []
      const paths = [...new Set([doc.file_path, ...copies.map((c) => c.rendition_path), ...files.map((f) => f.file_path)].filter(Boolean))]
      // the same file is not collected again from the mailbox (pipeline.js reads fin_skipped by the file's hash)
      if (doc.file_hash && !(await one(`fin_skipped?file_hash=eq.${q(doc.file_hash)}&select=id`).catch(() => null))) {
        await insert('fin_skipped', { source: doc.source, mailbox_id: doc.mailbox_id, email_subject: doc.email_subject, email_from: doc.email_from, file_name: doc.file_name, file_hash: doc.file_hash, document_class: 'deleted', confidence: 1, reason: `נמחק מהמערכת ע״י ${user?.email || 'המערכת'}` }, 'return=minimal').catch(() => {})
      }
      await sb(`fin_documents?id=eq.${q(id)}`, { method: 'DELETE', prefer: 'return=minimal' })
      // the check: the row and everything that pointed at it are really gone
      const left = []
      if (await one(`fin_documents?id=eq.${q(id)}&select=id`)) left.push('המסמך')
      for (const [table, col, name] of [['fin_document_allocations', 'document_id', 'חלוקה לפרויקטים'], ['fin_document_attachments', 'document_id', 'מצורפים'], ['fin_drive_files', 'document_id', 'רישום בארכיון'], ['fin_documents', 'duplicate_of', 'הפניית כפילות']]) {
        if (await one(`${table}?${col}=eq.${q(id)}&select=${col}&limit=1`).catch(() => null)) left.push(name)
      }
      if (left.length) { results.push({ ...out, error: `המחיקה לא הושלמה, נשאר: ${left.join(', ')}` }); continue }
      // after the row: the copy in Drive and the files. A step that fails now is finished later, and said so.
      const drive = copies.some((c) => c.drive_file_id) ? await archive.trashCopies(copies, user).catch(() => ({ trashed: 0, failed: [id] })) : { trashed: 0, failed: [] }
      const kept = []
      for (const p of paths) if (!(await gone(p))) kept.push(p)
      const pending = [...(drive.failed.length ? ['drive'] : []), ...(kept.length ? ['storage'] : [])]
      await audit('document', id, 'deleted_everywhere', { supplier_name: doc.supplier_name, total_amount: doc.total_amount, file_name: doc.file_name, drive_trashed: drive.trashed, files_removed: paths.length - kept.length, ...(pending.length ? { pending } : {}), ...(reason ? { reason } : {}) }, user).catch(() => {})
      results.push({ id, ok: true, drive: drive.failed.length ? 'pending' : drive.trashed ? 'trashed' : 'none', files: paths.length - kept.length, ...(pending.length ? { pending } : {}) })
    } catch (e) {
      results.push({ ...out, error: String(e.message || e).slice(0, 200) })
    }
  }
  return { results, deleted: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, pending: results.filter((r) => r.pending).length }
}

// ---------- the sweep: what a deletion could not finish, and what older deletions left behind ----------
const head = () => ({ apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}`, 'Content-Type': 'application/json' })
async function listFolder(prefix) {
  const out = []
  for (let offset = 0; offset < 20000; offset += 1000) {
    const r = await fetch(`${env.sbUrl()}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: head(), body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) })
    if (!r.ok) throw new Error(`storage list ${r.status}`)
    const page = await r.json()
    out.push(...page)
    if (page.length < 1000) break
  }
  return out
}
async function allFiles(prefix = '', depth = 0) {
  const out = []
  for (const it of await listFolder(prefix)) {
    const path = prefix ? `${prefix}/${it.name}` : it.name
    if (it.id) out.push({ path, at: it.created_at || it.updated_at || null })
    else if (depth < 4) out.push(...(await allFiles(path, depth + 1)))
  }
  return out
}
const column = async (table, col) => {
  const out = []
  for (let from = 0; from < 200000; from += 1000) {
    const rows = (await sb(`${table}?${col}=not.is.null&select=${col}&order=${col}.asc&offset=${from}&limit=1000`)) || []
    out.push(...rows.map((r) => r[col]))
    if (rows.length < 1000) break
  }
  return out
}

/* Files in storage that no document, attachment or archive row points at are removed (only ones older than a day: an
   upload in progress has its file before its row). `dry` only counts. Nothing that a row points at is ever touched. */
export async function sweep({ dry = false, max = 400, minAgeMs = 86400_000, user } = {}) {
  const used = new Set([...(await column('fin_documents', 'file_path')), ...(await column('fin_document_attachments', 'file_path')), ...(await column('fin_drive_files', 'rendition_path'))])
  const files = await allFiles()
  const old = Date.now() - minAgeMs
  const orphans = files.filter((f) => !used.has(f.path) && (!f.at || new Date(f.at).getTime() < old))
  let removed = 0; const failed = []
  if (!dry) for (const f of orphans.slice(0, max)) { if (await gone(f.path)) removed++; else failed.push(f.path) }
  // rows that outlived their document (the cascades make this impossible; the count proves it)
  const docs = new Set(await column('fin_documents', 'id'))
  const dangling = {}
  for (const [table, col] of [['fin_document_allocations', 'document_id'], ['fin_document_attachments', 'document_id'], ['fin_drive_files', 'document_id']]) {
    dangling[table] = (await column(table, col).catch(() => [])).filter((x) => !docs.has(x)).length
  }
  const report = { files: files.length, referenced: used.size, orphans: orphans.length, removed, failed: failed.length, dangling }
  if (!dry && (removed || failed.length)) await audit('document', null, 'storage_swept', report, user).catch(() => {})
  return report
}
