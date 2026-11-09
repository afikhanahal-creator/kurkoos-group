import { supabase } from '../../lib/supabase.js'

export const BUCKET = 'finance-docs'

async function token() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

/* the server side (server/finance.js) */
export async function callServer(action, payload = {}) {
  const r = await fetch('/api/finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ action, ...payload }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `שגיאה ${r.status}`)
  return d
}

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data }
const all = async (table, order = 'created_at', asc = false, limit = 5000) => must(await supabase.from(table).select('*').order(order, { ascending: asc }).limit(limit))
/* a table the role cannot read answers empty, not with an error */
const soft = async (p) => { try { return await p } catch { return [] } }

export const me = async () => must(await supabase.rpc('fin_me'))
export const claimAdmin = async () => must(await supabase.rpc('fin_claim_admin'))

export const loadDocuments = () => all('fin_documents')
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
export const loadAllocations = () => soft(all('fin_document_allocations', 'created_at', true, 10000))
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
const afterStatus = (patch, out) => { if (patch && 'status' in patch) flushOutbound(); return out }
export const updateDocument = async (id, patch) => afterStatus(patch, must(await supabase.from('fin_documents').update(patch).eq('id', id).select().single()))
export const updateDocuments = async (ids, patch) => afterStatus(patch, must(await supabase.from('fin_documents').update(patch).in('id', ids).select()))
export const loadDeliveries = (limit = 30) => soft(all('fin_deliveries', 'created_at', false, limit))
export const loadOutbound = () => soft(all('fin_outbound', 'created_at', true))
export const loadOutboundQueue = (limit = 30) => soft(all('fin_outbound_queue', 'id', false, limit))
export async function deleteDocument(doc) {
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
