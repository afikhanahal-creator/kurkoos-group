import { supabase } from '../../lib/supabase.js'

export const BUCKET = 'finance-docs'
const DOC_COLS = '*'

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

export const loadDocuments = async () => must(await supabase.from('fin_documents').select(DOC_COLS).order('created_at', { ascending: false }).limit(5000))
export const loadBusinesses = async () => must(await supabase.from('fin_businesses').select('*').order('sort'))
export const loadCategories = async () => must(await supabase.from('fin_categories').select('*').order('sort'))
export const loadSuppliers = async () => must(await supabase.from('fin_suppliers').select('*').order('name'))
export const loadMailboxes = async () => must(await supabase.from('fin_mailboxes').select('*').order('created_at'))
export const loadRuns = async () => must(await supabase.from('fin_sync_runs').select('*').order('started_at', { ascending: false }).limit(20))

export const updateDocument = async (id, patch) => must(await supabase.from('fin_documents').update(patch).eq('id', id).select().single())
export const updateDocuments = async (ids, patch) => must(await supabase.from('fin_documents').update(patch).in('id', ids).select())
export async function deleteDocument(doc) {
  if (doc.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path])
  must(await supabase.from('fin_documents').delete().eq('id', doc.id))
}

export const saveRow = async (table, row) => must(row.id
  ? await supabase.from(table).update(row).eq('id', row.id).select().single()
  : await supabase.from(table).insert(row).select().single())
export const deleteRow = async (table, id) => must(await supabase.from(table).delete().eq('id', id))

async function sha256(file) {
  const buf = await file.arrayBuffer()
  const h = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']

/* one file from the computer or the phone camera: upload, create the row, let Claude read it */
export async function uploadFile(file, { businessId, source = 'upload' } = {}) {
  if (!OK_TYPES.includes(file.type)) throw new Error(`${file.name}: רק PDF או תמונה`)
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: הקובץ גדול מ-12MB`)
  const hash = await sha256(file)
  const { data: dup } = await supabase.from('fin_documents').select('id').eq('file_hash', hash).maybeSingle()
  if (dup) return { duplicate: true, id: dup.id }
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
  const path = `uploads/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${ext}`
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: true })
  if (up.error) throw new Error(up.error.message)
  const { data: { user } } = await supabase.auth.getUser()
  const row = must(await supabase.from('fin_documents').insert({
    status: 'processing', source, business_id: businessId || null, file_path: path, file_name: file.name.slice(0, 200),
    file_mime: file.type, file_size: file.size, file_hash: hash, created_by: user?.id || null,
  }).select().single())
  callServer('extract', { document_id: row.id }).catch(() => {})   // the page refreshes when it finishes
  return row
}

export async function fileUrl(doc) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
export async function fileBlob(doc) {
  const { data, error } = await supabase.storage.from(BUCKET).download(doc.file_path)
  if (error) throw new Error(error.message)
  return data
}
