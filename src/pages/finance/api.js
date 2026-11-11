import { supabase } from '../../lib/supabase.js'

export const BUCKET = 'finance-docs'

async function token() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

/* the server side (server/finance.js) */
export async function callServer(action, payload = {}, { timeout } = {}) {
  const r = await fetch('/api/finance', {
    method: 'POST',
    ...(timeout && typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(timeout) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ action, ...payload }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `שגיאה ${r.status}`)
  return d
}

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data }
// Supabase answers at most 1,000 rows per request: larger tables are read in pages, in parallel after the first
const PAGE = 1000
// tie: a unique column that keeps the pages stable when many rows share a timestamp (documents imported together)
const all = async (table, order = 'created_at', asc = false, limit = 5000, columns = '*', tie = null) => {
  const page = (from) => { let qy = supabase.from(table).select(columns).order(order, { ascending: asc }); if (tie) qy = qy.order(tie, { ascending: true }); return qy.range(from, Math.min(from + PAGE, limit) - 1) }
  const first = must(await page(0))
  if (first.length < Math.min(PAGE, limit)) return first
  const rest = []
  for (let from = PAGE; from < limit; from += PAGE * 4) {
    const batch = await Promise.all([0, 1, 2, 3].map((i) => from + i * PAGE).filter((x) => x < limit).map((x) => page(x).then(must)))
    rest.push(...batch.flat())
    if (batch.some((b) => b.length < PAGE)) break
  }
  return [...first, ...rest]
}
/* a table the role cannot read answers empty, not with an error */
const soft = async (p) => { try { return await p } catch { return [] } }

export const me = async () => must(await supabase.rpc('fin_me'))
export const claimAdmin = async () => must(await supabase.rpc('fin_claim_admin'))

// the list reads every column except the raw reading (extraction, about a third of a row): the document panel and
// the capture dialog get it with the document itself. A database that is not migrated yet falls back to all columns.
const DOC_COLUMNS = 'id,business_id,project_id,supplier_id,supplier_name,supplier_vat_id,doc_type,doc_number,issue_date,due_date,payment_date,accounting_period,currency,amount_before_vat,vat_amount,total_amount,category,description,payment_method,paid,status,source,mailbox_id,email_message_id,email_subject,email_from,email_date,file_path,file_name,file_mime,file_size,file_hash,field_confidence,confidence,issues,suggestions,attempts,processed_at,approved_by,approved_at,exported_at,export_id,sent_at,notes,created_by,created_at,updated_at,category_id,supplier_email,ai_snapshot,requires_second_approval,first_approved_by,first_approved_at,archived_at,stage,stage_at,next_retry_at,duplicate_of,duplicate_state,quality,page_count,ai_tokens_in,ai_tokens_out,ai_calls,failures,document_class,relevance,business_source,recurring_id,recurring_off'
export const loadDocuments = async () => { try { return await all('fin_documents', 'created_at', false, 200000, DOC_COLUMNS, 'id') } catch { return all('fin_documents', 'created_at', false, 200000, '*', 'id') } }
// one cheap row that changes whenever any visible document is added, changed or removed: how many there are, and the
// newest change. The screen compares it every few seconds and reloads only when it moved.
export const docsStamp = async () => { const r = await supabase.from('fin_documents').select('updated_at', { count: 'exact' }).order('updated_at', { ascending: false }).limit(1); return r.error ? null : `${r.count}|${r.data?.[0]?.updated_at || ''}` }
export const loadDocumentFull = async (id) => must(await supabase.from('fin_documents').select('*').eq('id', id).single())
export const loadBusinesses = () => all('fin_businesses', 'sort', true)
export const loadProjects = () => soft(all('fin_projects', 'name', true))
export const loadCategories = () => all('fin_categories', 'sort', true)
export const loadSuppliers = () => soft(all('fin_suppliers', 'name', true))
export const loadMailboxes = () => soft(all('fin_mailboxes', 'created_at', true))
export const loadMembers = () => soft(all('fin_members', 'created_at', true))
export const loadRules = () => soft(all('fin_rules', 'priority', true))
export const loadAutomations = () => soft(all('fin_automations', 'key', true))
export const loadIntegrations = () => soft(all('fin_integrations', 'created_at', true))
export const loadExports = () => soft(all('fin_exports', 'created_at', false, 500))
export const loadAgentRuns = (limit = 200) => soft(all('fin_agent_runs', 'started_at', false, limit))
export const loadSyncRuns = (limit = 50) => soft(all('fin_sync_runs', 'started_at', false, limit))
export const loadSummaries = () => soft(all('fin_summaries', 'day', false, 30))
export const loadAudit = async ({ entity, entityId, limit = 100 } = {}) => {
  let qy = supabase.from('fin_audit').select('*').order('at', { ascending: false }).limit(limit)
  if (entity) qy = qy.eq('entity', entity)
  if (entityId) qy = qy.eq('entity_id', String(entityId))
  return soft(must(await qy))
}
export const loadAllocations = () => soft(all('fin_document_allocations', 'created_at', true, 200000, '*', 'id'))
export const loadSettings = async () => Object.fromEntries(((await soft(must(await supabase.from('fin_settings').select('*')))) || []).map((r) => [r.key, r.value]))
export const saveSetting = async (key, value) => must(await supabase.from('fin_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key).select().single())
export const loadRuleHits = (limit = 200) => soft(all('fin_rule_hits', 'at', false, limit))
export const mergeSuppliers = async (from, into) => must(await supabase.rpc('fin_merge_suppliers', { p_from: from, p_into: into }))
export const setAllocations = async (documentId, rows) => must(await supabase.rpc('fin_set_allocations', { p_document: documentId, p_rows: rows }))
export const loadWhatsappSenders = () => soft(all('fin_whatsapp_senders', 'created_at', true))
export const loadWhatsappInbox = (limit = 50) => soft(all('fin_whatsapp_inbox', 'at', false, limit))
export const loadCloudTargets = () => soft(all('fin_cloud_targets', 'created_at', true))
export const storageUsage = async () => { try { return must(await supabase.rpc('storage_usage')) } catch { return null } }

// a status change may have queued automatic deliveries (webhook / email); ask the server to send them, without waiting
export const flushOutbound = () => { callServer('outbound-flush').catch(() => {}) }
// a document that came by WhatsApp and was just approved: its sender gets one short message (the server decides whether)
const tellSender = (out) => { for (const d of [].concat(out || [])) if (d?.source === 'whatsapp' && d.status === 'approved') callServer('whatsapp-approved', { document_id: d.id }).catch(() => {}) }
const afterStatus = (patch, out) => { if (patch && 'status' in patch) { flushOutbound(); if (patch.status === 'approved') tellSender(out) } return out }
// a company chosen by a person is marked "manual": the engine learns from it for the next document of that supplier
const byPerson = (patch) => ('business_id' in patch ? { ...patch, business_source: patch.business_id ? 'manual' : null } : patch)
export const updateDocument = async (id, patch) => afterStatus(patch, must(await supabase.from('fin_documents').update(byPerson(patch)).eq('id', id).select().single()))
export const updateDocuments = async (ids, patch) => afterStatus(patch, must(await supabase.from('fin_documents').update(byPerson(patch)).in('id', ids).select()))
export const loadDeliveries = (limit = 30) => soft((async () => (await all('fin_deliveries', 'created_at', false, limit * 2)).filter((d) => (d.kind || 'accountant') === 'accountant').slice(0, limit))())
export const loadOutbound = () => soft(all('fin_outbound', 'created_at', true))
export const loadOutboundQueue = (limit = 30) => soft(all('fin_outbound_queue', 'id', false, limit))
export async function deleteDocument(doc) {
  // a deletion in the system is a deletion in Drive: the archive's copy goes to the Drive trash first. If Drive cannot
  // be reached the document is still deleted, and the next check against Drive trashes the copy.
  await callServer('drive-forget', { ids: [doc.id] }).catch(() => null)
  must(await supabase.from('fin_documents').delete().eq('id', doc.id))
  if (doc.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path])
}

export const saveRow = async (table, row) => must(row.id
  ? await supabase.from(table).update(row).eq('id', row.id).select().single()
  : await supabase.from(table).insert(row).select().single())
export const updateAutomation = async (key, patch) => must(await supabase.from('fin_automations').update({ ...patch, updated_at: new Date().toISOString() }).eq('key', key).select().single())
export const updateMember = async (userId, patch) => must(await supabase.from('fin_members').update(patch).eq('user_id', userId).select().single())
export const deleteRow = async (table, id, key = 'id') => must(await supabase.from(table).delete().eq(key, id))

export async function recordExport({ ids, businessId, period, format, destination, integrationId, allowReexport }) {
  const out = must(await supabase.rpc('fin_record_export', {
    p_ids: ids, p_business_id: businessId || null, p_period: period || null, p_format: format, p_destination: destination,
    p_integration_id: integrationId || null, p_allow_reexport: !!allowReexport,
  }))
  flushOutbound()
  return out
}

async function sha256(file) {
  const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']

/* one file from the computer or the phone camera: fingerprint, upload, create the row, Claude reads it */
/* phone photos: turned upright (EXIF), at most 2200 px on the long side, JPEG 86%. Big enough for OCR to read every
   digit, small enough to keep storage (and the reading) light. PDFs and small images pass through untouched. */
export async function prepareImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  let bmp
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch {
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw new Error('תמונות HEIC לא נתמכות בדפדפן הזה. צלמו מתוך המערכת או שמרו כ-JPG')
    return file
  }
  const MAX = 2200
  const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
  if (scale === 1 && file.size < 600_000 && !/hei[cf]/i.test(file.type)) { bmp.close?.(); return file }
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const g = c.getContext('2d')
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
  g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.()
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.86))
  if (!blob) return file
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'receipt'}.jpg`, { type: 'image/jpeg' })
}

/* A record that was entered without a file (a charge known from the supplier's billing log) gets its paper: the file is
   stored and linked, the details already on the record stay as they are, and the "file missing" note is cleared. */
export async function attachMainFile(doc, rawFile) {
  const file = await prepareImage(rawFile)
  if (!OK_TYPES.includes(file.type)) throw new Error(`${file.name}: רק PDF או תמונה`)
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: הקובץ גדול מ-12MB`)
  const hash = await sha256(file)
  const { data: dup } = await supabase.from('fin_documents').select('id,supplier_name,doc_number').eq('file_hash', hash).maybeSingle()
  if (dup) throw new Error(`הקובץ הזה כבר שייך למסמך אחר במערכת${dup.supplier_name ? ` (${dup.supplier_name}${dup.doc_number ? ` ${dup.doc_number}` : ''})` : ''}.`)
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message)
  const issues = (doc.issues || []).filter((i) => i.code !== 'missing_file')
  return must(await supabase.from('fin_documents').update({ file_path: path, file_name: file.name.slice(0, 200), file_mime: file.type, file_size: file.size, file_hash: hash, issues }).eq('id', doc.id).select().single())
}

/* the real paper replaces an email that only pointed at it: the email stays with the document as an attachment, the
   file becomes the document's file, and it is read like any upload. A file that already belongs to another document
   is refused (attachMainFile). */
export async function replaceMainFile(doc, rawFile) {
  const old = { path: doc.file_path, name: doc.file_name, mime: doc.file_mime, size: doc.file_size }
  const saved = await attachMainFile(doc, rawFile)
  if (old.path && old.path !== saved.file_path) await supabase.from('fin_document_attachments').insert({ document_id: doc.id, kind: 'file', file_path: old.path, file_name: old.name || 'המייל המקורי.html', file_mime: old.mime || 'text/html', file_size: old.size || null, note: 'המייל שבו הגיע הקישור למסמך' }).then(() => {}, () => {})
  const r = await callServer('extract', { document_id: doc.id, trigger: 'upload' }).catch(() => null)
  return r?.document || saved
}

export async function uploadFile(rawFile, { businessId, projectId, source = 'upload', wait = false, prepared = false } = {}) {
  const file = prepared ? rawFile : await prepareImage(rawFile)
  if (!OK_TYPES.includes(file.type)) throw new Error(`${file.name}: רק PDF או תמונה`)
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: הקובץ גדול מ-12MB`)
  const hash = await sha256(file)
  const { data: dup } = await supabase.from('fin_documents').select('id,supplier_name,doc_number').eq('file_hash', hash).maybeSingle()
  if (dup) return { duplicate: true, id: dup.id, of: dup }
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  // the same file uploaded before and then removed from the list: the object is still there, reuse it
  if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message)
  const { data: { user } } = await supabase.auth.getUser()
  let row
  try {
    row = must(await supabase.from('fin_documents').insert({
      status: 'processing', source, business_id: businessId || null, project_id: projectId || null, file_path: path, file_name: file.name.slice(0, 200),
      file_mime: file.type, file_size: file.size, file_hash: hash, created_by: user?.id || null,
    }).select().single())
  } catch (e) {
    // another document with this file exists but this person cannot see it
    if (/duplicate key|unique/i.test(e.message)) return { duplicate: true, hidden: true }
    throw e
  }
  // wait: the caller shows the result (receipt capture); otherwise the reading runs in the background
  if (wait) {
    // the reading can outlive the request (function limit): the receipt is saved either way and the agents finish it
    try { return (await callServer('extract', { document_id: row.id, trigger: 'upload' })).document || row } catch { return { ...row, pending: true } }
  }
  callServer('extract', { document_id: row.id, trigger: 'upload' }).catch(() => {})
  return row
}

export async function fileBlob(doc) {
  const { data, error } = await supabase.storage.from(BUCKET).download(doc.file_path)
  if (error) throw new Error(error.message || 'הקובץ לא נטען')
  return data
}

// ---- cloud copies (Drive / Dropbox): where each document was saved, saving now, and the connection test ----
export const loadCloudCopies = async () => {
  const { data, error } = await supabase.from('fin_cloud_synced').select('document_id, target_id, web_link, path, at').order('at', { ascending: false }).limit(5000)
  if (error) return {}
  const map = {}
  for (const r of data || []) if (!map[r.document_id]) map[r.document_id] = r
  return map
}
export const saveToCloud = (ids, targetId) => callServer('cloud-save', { ids, target_id: targetId || undefined })
export const testCloud = (targetId) => callServer('cloud-test', { target_id: targetId })
export const loadSkipped = (limit = 50) => soft((async () => must(await supabase.from('fin_skipped').select('*').order('at', { ascending: false }).limit(limit)))())
/* one line in the activity log for something done in the browser (an Excel file, a download). Never blocks the action. */
export const logAction = (action, details = {}) => { supabase.rpc('fin_log', { p_action: action, p_details: details }).then(() => {}, () => {}) }
/* my role, whether it requires the second step, and the idle timeout; null when I am not a member */
// "no row" (null) means the person is not a member; a failed call is not an answer, so it is asked again before giving up
export const mySecurity = async () => {
  for (const wait of [0, 400, 1200]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    try { return must(await supabase.rpc('fin_my_security')) } catch { /* asked again */ }
  }
  return null
}
export const loadLoginEvents = (limit = 100) => soft(all('fin_login_events', 'at', false, limit))
export const finishOnboarding = async (name) => must(await supabase.rpc('fin_finish_onboarding', { p_name: name || null }))

// ---- attachments (נספחים) of a document: extra files, or a link to another document ----
export const loadAttachments = async (documentId) => must(await supabase.from('fin_document_attachments').select('*').eq('document_id', documentId).order('created_at'))
export async function addAttachmentFile(documentId, rawFile) {
  const file = await prepareImage(rawFile)
  if (!OK_TYPES.includes(file.type)) throw new Error(`${file.name}: רק PDF או תמונה`)
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: הקובץ גדול מ-12MB`)
  const hash = await sha256(file)
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
  const path = `uploads/attachments/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message)
  return must(await supabase.from('fin_document_attachments').insert({ document_id: documentId, kind: 'file', file_path: path, file_name: rawFile.name?.slice(0, 200) || `נספח.${ext}`, file_mime: file.type, file_size: file.size }).select().single())
}
export const linkDocument = async (documentId, linkedId, note) => must(await supabase.from('fin_document_attachments').insert({ document_id: documentId, kind: 'link', linked_document_id: linkedId, note: note || null }).select().single())
export const removeAttachment = async (id) => must(await supabase.from('fin_document_attachments').delete().eq('id', id))
export const attachmentBlob = async (a) => { const { data, error } = await supabase.storage.from(BUCKET).download(a.file_path); if (error) throw new Error(error.message || 'הקובץ לא נטען'); return data }

/* fixed (recurring) expenses: the list, marking a document's supplier as one, stopping one */
// what the company's own invoices say about it: the name, number and address printed as "to" on documents assigned to it
export const loadCompanyHints = async (businessId) => {
  if (!businessId) return []
  try { return must(await supabase.from('fin_documents').select('name:extraction->>customer_name,vat:extraction->>customer_vat_id,address:extraction->>customer_address').eq('business_id', businessId).not('extraction', 'is', null).order('created_at', { ascending: false }).limit(300)) } catch { return [] }
}
export const loadRecurring = async () => must(await supabase.from('fin_recurring').select('*').order('created_at'))
export const markRecurring = async (documentId, on = true) => must(await supabase.rpc('fin_recurring_mark', { p_document: documentId, p_on: on }))
export const setRecurring = async (id, { active = null, label = null, expected = null } = {}) => must(await supabase.rpc('fin_recurring_set', { p_id: id, p_active: active, p_label: label, p_expected: expected }))
