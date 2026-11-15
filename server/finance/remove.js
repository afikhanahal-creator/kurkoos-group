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
// several things at a time, never all at once (a selection can hold 200 documents)
const pool = async (items, n, fn) => { let i = 0; const out = new Array(items.length); await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) } })); return out }

/* Three passes, each over all the documents together (it used to be one document after another, about fifteen calls
   each): 1. the row, with what hangs on it read first and checked gone after; 2. the copies in Drive, in one go with one
   sign-in; 3. the files. The order inside a document is the same as before: the row first, then Drive and storage. */
export async function removeDocuments({ ids, user, reason = '' }) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter((x) => UUID.test(x)).slice(0, 200)
  const archive = await import('./archive.js')
  // 1. the rows
  const rows = await pool(list, 6, async (id) => {
    const out = { id, ok: false }
    try {
      // everything that hangs on the row is read before the row goes
      const [doc, copies, files] = await Promise.all([
        one(`fin_documents?id=eq.${q(id)}&select=id,status,created_by,business_id,source,mailbox_id,email_subject,email_from,file_name,file_path,file_hash,supplier_name,total_amount`),
        archive.driveCopies([id]).catch(() => []),
        sb(`fin_document_attachments?document_id=eq.${q(id)}&kind=eq.file&file_path=not.is.null&select=file_path`).then((r) => r || [], () => []),
      ])
      if (!doc) return { id, ok: true, already: true }
      if (user && !mayDelete(user, doc)) return { ...out, error: LOCKED.includes(doc.status) ? 'מסמך מאושר או שנשלח נמחק רק על ידי מנהל המערכת' : 'אין לך הרשאה למחוק את המסמך הזה' }
      if (user?.business_ids?.length && doc.business_id && !user.business_ids.includes(doc.business_id)) return { ...out, error: 'המסמך לא שייך לחברה שלך' }
      const paths = [...new Set([doc.file_path, ...copies.map((c) => c.rendition_path), ...files.map((f) => f.file_path)].filter(Boolean))]
      // the same file is not collected again from the mailbox (pipeline.js reads fin_skipped by the file's hash)
      if (doc.file_hash && !(await one(`fin_skipped?file_hash=eq.${q(doc.file_hash)}&select=id`).catch(() => null))) {
        await insert('fin_skipped', { source: doc.source, mailbox_id: doc.mailbox_id, email_subject: doc.email_subject, email_from: doc.email_from, file_name: doc.file_name, file_hash: doc.file_hash, document_class: 'deleted', confidence: 1, reason: `נמחק מהמערכת ע״י ${user?.email || 'המערכת'}` }, 'return=minimal').catch(() => {})
      }
      await sb(`fin_documents?id=eq.${q(id)}`, { method: 'DELETE', prefer: 'return=minimal' })
      // the check: the row and everything that pointed at it are really gone
      const checks = await Promise.all([
        one(`fin_documents?id=eq.${q(id)}&select=id`).then((r) => (r ? 'המסמך' : null)),
        ...[['fin_document_allocations', 'document_id', 'חלוקה לפרויקטים'], ['fin_document_attachments', 'document_id', 'מצורפים'], ['fin_drive_files', 'document_id', 'רישום בארכיון'], ['fin_documents', 'duplicate_of', 'הפניית כפילות']]
          .map(([table, col, name]) => one(`${table}?${col}=eq.${q(id)}&select=${col}&limit=1`).then((r) => (r ? name : null), () => null)),
      ])
      const left = checks.filter(Boolean)
      if (left.length) return { ...out, error: `המחיקה לא הושלמה, נשאר: ${left.join(', ')}` }
      return { id, ok: true, doc, copies, paths }
    } catch (e) {
      return { ...out, error: String(e.message || e).slice(0, 200) }
    }
  })
  // 2. after the rows: the copies in Drive, all of them in one pass. A step that fails now is finished later, and said so.
  const done = rows.filter((r) => r.ok && r.doc)
  const inDrive = done.flatMap((r) => r.copies.filter((c) => c.drive_file_id))
  const drive = inDrive.length ? await archive.trashCopies(inDrive, user).catch(() => ({ trashed: 0, failed: [...new Set(inDrive.map((c) => c.document_id))], trashedOf: {} })) : { trashed: 0, failed: [], trashedOf: {} }
  const driveFailed = new Set(drive.failed)
  // 3. the files, then one line in the log per document
  const results = await pool(rows, 6, async (r) => {
    if (!r.ok || !r.doc) return r
    const { id, doc, paths } = r
    const kept = (await Promise.all(paths.map(async (p) => ((await gone(p)) ? null : p)))).filter(Boolean)
    const trashed = drive.trashedOf?.[id] || 0
    const pending = [...(driveFailed.has(id) ? ['drive'] : []), ...(kept.length ? ['storage'] : [])]
    await audit('document', id, 'deleted_everywhere', { supplier_name: doc.supplier_name, total_amount: doc.total_amount, file_name: doc.file_name, drive_trashed: trashed, files_removed: paths.length - kept.length, ...(pending.length ? { pending } : {}), ...(reason ? { reason } : {}) }, user).catch(() => {})
    return { id, ok: true, drive: driveFailed.has(id) ? 'pending' : trashed ? 'trashed' : 'none', files: paths.length - kept.length, ...(pending.length ? { pending } : {}) }
  })
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
