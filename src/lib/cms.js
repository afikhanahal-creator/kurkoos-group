import { supabase } from './supabase.js'

/* ============================================================
   שכבת גישה לנתונים (CMS) מול Supabase.
   ציבורי קורא רק שורות מפורסמות (RLS); אדמין מחובר קורא/כותב הכול.
   ============================================================ */

const BUCKET = 'media'

// ---------- Media (Storage) ----------
export async function uploadMedia(file, folder = 'general') {
  if (!supabase) throw new Error('Supabase לא מוגדר')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const rand = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  const path = `${folder}/${rand}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteMedia(url) {
  if (!supabase || !url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = url.slice(i + marker.length)
  await supabase.storage.from(BUCKET).remove([path])
}

// ---------- Projects ----------
export async function listProjects({ includeArchived = false } = {}) {
  let q = supabase.from('projects').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (!includeArchived) q = q.eq('is_archived', false)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getProjectBySlug(slug) {
  const { data, error } = await supabase.from('projects').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function createProject(row) {
  const { data, error } = await supabase.from('projects').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateProject(id, patch) {
  const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function archiveProject(id) {
  return updateProject(id, { is_archived: true })
}

export async function reorderRows(table, orderedIds) {
  // עדכון sort_order לפי הסדר החדש
  const updates = orderedIds.map((id, i) => supabase.from(table).update({ sort_order: i }).eq('id', id))
  await Promise.all(updates)
}

// ---------- Properties ----------
export async function listProperties(projectId, { includeArchived = false } = {}) {
  let q = supabase.from('properties').select('*').eq('project_id', projectId).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (!includeArchived) q = q.eq('is_archived', false)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function listPropertiesBySlug(slug) {
  const project = await getProjectBySlug(slug)
  if (!project) return { project: null, properties: [] }
  const properties = await listProperties(project.id)
  return { project, properties }
}

export async function createProperty(row) {
  const { data, error } = await supabase.from('properties').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateProperty(id, patch) {
  const { data, error } = await supabase.from('properties').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function archiveProperty(id) {
  return updateProperty(id, { is_archived: true })
}

// ---------- Counters ----------
export async function listCounters({ activeOnly = false } = {}) {
  let q = supabase.from('site_counters').select('*').order('sort_order', { ascending: true })
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data
}
export async function createCounter(row) {
  const { data, error } = await supabase.from('site_counters').insert(row).select().single()
  if (error) throw error
  return data
}
export async function updateCounter(id, patch) {
  const { data, error } = await supabase.from('site_counters').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteCounter(id) {
  const { error } = await supabase.from('site_counters').delete().eq('id', id)
  if (error) throw error
}

// ---------- Logos (carousel) ----------
export async function listLogos({ activeOnly = false } = {}) {
  let q = supabase.from('site_logos').select('*').order('sort_order', { ascending: true })
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data
}
export async function createLogo(row) {
  const { data, error } = await supabase.from('site_logos').insert(row).select().single()
  if (error) throw error
  return data
}
export async function updateLogo(id, patch) {
  const { data, error } = await supabase.from('site_logos').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteLogo(id, imageUrl) {
  if (imageUrl) await deleteMedia(imageUrl).catch(() => {})
  const { error } = await supabase.from('site_logos').delete().eq('id', id)
  if (error) throw error
}
