import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import { srcOfResponsive } from './responsiveImage.js'

/* ============================================================
   שכבת גישה לנתונים (CMS) מול Supabase.
   ציבורי קורא רק שורות מפורסמות (RLS); אדמין מחובר קורא/כותב הכול.
   ============================================================ */

const BUCKET = 'media'

/* ---------- מטמון קצר-מועד בזיכרון (TTL) ----------
   בעת טעינת עמוד, כמה רכיבים מבקשים את אותם נתונים (הגדרות, פרויקטים,
   לוגואים) בו-זמנית. המטמון משתף בקשה אחת בתעופה (in-flight) ושומר את
   התוצאה לזמן קצר — פחות בקשות רשת, טעינה מהירה יותר, והנתונים נשארים
   טריים (TTL קצר + פינוי מיידי אחרי כל כתיבה מהאדמין). */
const _cache = new Map()

/* התמדה ל-localStorage (stale-while-revalidate): שומרים תוצאה אחרונה כדי
   שטעינה חוזרת/רענון תרנדר *מיד* מהמטמון, ואז תתרענן ברקע. גם פחות המתנה
   לרשת וגם פחות בקשות חוזרות ל-Supabase. */
const LS_PREFIX = 'kc_cache_'
function lsGet(key) {
  try { const raw = localStorage.getItem(LS_PREFIX + key); return raw ? JSON.parse(raw) : null } catch { return null }
}
function lsSet(key, data) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ t: Date.now(), data })) } catch { /* SSR/quota — מתעלמים */ }
}
// תמונת-מצב סינכרונית אחרונה (לזריעת state התחלתי) — null אם אין/ישן מדי
export function cachedSnapshot(key, maxAgeMs = 86_400_000) {
  const hit = lsGet(key)
  if (hit && (maxAgeMs === Infinity || Date.now() - hit.t < maxAgeMs)) return hit.data
  return null
}

function cached(key, ttlMs, fetcher) {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.t < ttlMs) return hit.p
  const p = Promise.resolve().then(fetcher).then((data) => { lsSet(key, data); return data })
  p.catch(() => _cache.delete(key))   // כישלון לא ננעל במטמון
  _cache.set(key, { t: Date.now(), p })
  return p
}
function invalidate(prefix) {
  for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k)
  // מנקים גם את ה-localStorage כדי שלא תוגש תמונת-מצב ישנה אחרי כתיבה מהאדמין
  try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith(LS_PREFIX + prefix)) localStorage.removeItem(k) } } catch { /* noop */ }
}

// ---------- Cloudinary (וידאו/מדיה כבדה) ----------
export const hasCloudinary = Boolean(
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
)
export async function uploadToCloudinary(file) {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloud || !preset) throw new Error('Cloudinary לא מוגדר (חסרים משתני סביבה)')
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', preset)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('שגיאת העלאה ל-Cloudinary')
  const data = await res.json()
  return data.secure_url
}

// העלאת וידאו — מעדיף Cloudinary (מתאים לקבצים כבדים) ונופל-לאחור ל-Supabase
export async function uploadVideoFile(file, folder = 'videos') {
  if (hasCloudinary) return uploadToCloudinary(file)
  return uploadMedia(file, folder)
}

// ---------- Media (Storage) ----------
/* דחיסת תמונה בצד-לקוח לפני העלאה: מקטין רזולוציה (עד 1920px) וממיר ל-WebP.
   → העלאה הרבה יותר מהירה + קבצים קלים שנטענים מהר באתר, בלי שינוי נראה לעין.
   מדלג על SVG/GIF, ועל קבצים שכבר קטנים/לא משתפרים. */
export async function compressImage(file, { maxW = 1920, maxH = 1920, quality = 0.85 } = {}) {
  if (typeof document === 'undefined' || !file || !file.type || !file.type.startsWith('image/')) return file
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  if (file.size < 120 * 1024) return file   // כבר קטן — לא נוגעים
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height)
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
    bmp.close && bmp.close()
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality))
    if (!blob || blob.size >= file.size) return file   // לא השתפר → משאירים מקור
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' })
  } catch { return file }
}

export async function uploadMedia(file, folder = 'general') {
  if (!supabase) throw new Error('Supabase לא מוגדר')
  file = await compressImage(file)   // דחיסה אוטומטית לתמונות → העלאה וטעינה מהירות
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const rand = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  const path = `${folder}/${rand}.${ext}`
  // קבצים ייחודיים (שם אקראי) → ניתן למטמן לטווח ארוך מאוד (immutable)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false })
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
  return cached(`projects:${includeArchived}`, 30_000, async () => {
    let q = supabase.from('projects').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (!includeArchived) q = q.eq('is_archived', false)
    const { data, error } = await q
    if (error) throw error
    return data
  })
}

/* עמודות כרטיס בלבד — לרשימות הציבוריות (גלריית הבית, עמוד הפרויקטים).
   מדלג על עמודות ה-JSONB/טקסט הכבדות (גלריות, תוכניות, תיאור ארוך, קוביות,
   סביבה, יזמים, סרטונים) → payload קטן בהרבה וטעינה מהירה משמעותית. תמונת
   הכריכה נלקחת מ-hero_image_url. */
const CARD_COLS = 'id, slug, name, location, subtitle, year, status, hero_image_url, pages, card_layout, is_published'
export async function listProjectCards() {
  return cached('projects:cards', 30_000, async () => {
    const fetchCards = (cols) => supabase
      .from('projects').select(cols)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    let res = await fetchCards(CARD_COLS)
    // רשת ביטחון: אם עמודה חסרה במסד (סכמה ישנה) — נופלים-לאחור לשליפה
    // מלאה. שאילתה כושלת לעולם לא תעלים פרויקטים מהאתר.
    if (res.error) res = await fetchCards('*')
    if (res.error) throw res.error
    // רק פרויקטים מפורסמים — גם כשמנהל מחובר (RLS מחזיר לו טיוטות)
    return (res.data || []).filter((p) => p.is_published !== false)
  })
}

export async function getProjectBySlug(slug) {
  return cached(`projects:one:${slug}`, 30_000, async () => {
    // קודם לפי slug; אם לפרויקט אין slug — מנסים לפי id (כך שהעמוד ייפתח תמיד)
    const { data, error } = await supabase.from('projects').select('*').eq('slug', slug).maybeSingle()
    if (error) throw error
    if (data) return data
    const byId = await supabase.from('projects').select('*').eq('id', slug).maybeSingle()
    if (!byId.error && byId.data) return byId.data
    return null
  })
}

// pages עשוי לחזור מה-DB כמערך (jsonb/text[]) או כמחרוזת JSON / מופרד-פסיקים —
// מנרמלים תמיד למערך כדי שסינון "עמודים נבחרים/יעד" יעבוד בלי תקלות.
export function projectPages(p) {
  const v = p?.pages
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return []
    try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : [] }
    catch { return s.split(',').map((x) => x.trim()).filter(Boolean) }
  }
  return []
}

// פרויקטים מפורסמים המשויכים לעמוד יעד מסוים
// (development | execution | featured | brokerage). פרויקט יכול להיות בכמה עמודים.
export async function listProjectsByPage(page) {
  // לעמודי תצוגה ציבוריים — מספיקות עמודות הכרטיס (קל ומהיר יותר)
  const rows = await listProjectCards()
  return (rows || []).filter(
    (p) => p.is_published !== false && projectPages(p).includes(page)
  )
}

// ממיר שורת CMS למבנה שכרטיס הפרויקט הציבורי מצפה לו
export function cmsRowToCard(p) {
  return {
    slug: p.slug || p.id,   // אם אין slug — נופלים ל-id כדי שהקישור לעמוד הפרויקט יעבוד
    name: p.name,
    city: p.location,
    type: p.subtitle,
    short: p.subtitle || p.description,
    year: p.year,
    status: p.status,
    category: p.category,
    cover: srcOfResponsive(p.hero_image_url) || srcOfResponsive(p.gallery && p.gallery[0]) || '',
  }
}

/* עמודות אופציונליות שנוספו לאחרונה — אם ה-migration עדיין לא הורץ ב-Supabase,
   העמודות לא קיימות ושמירה תיכשל. מסירים אותן ומנסים שוב כדי שהשמירה לא תישבר. */
const OPTIONAL_PROJECT_COLS = ['about_image_url', 'about_rounded', 'about_spaced', 'towers_label', 'more_projects', 'units_label', 'floors_label']
const isMissingColumnError = (error) =>
  !!error && (error.code === 'PGRST204' || error.code === '42703' ||
    /column .* does not exist|could not find the .* column|schema cache/i.test(error.message || ''))
const stripOptional = (obj) => {
  const clean = { ...obj }
  OPTIONAL_PROJECT_COLS.forEach((c) => delete clean[c])
  return clean
}

export async function createProject(row) {
  let { data, error } = await supabase.from('projects').insert(row).select().single()
  if (isMissingColumnError(error)) {
    ;({ data, error } = await supabase.from('projects').insert(stripOptional(row)).select().single())
  }
  if (error) throw error
  invalidate('projects')
  return data
}

export async function updateProject(id, patch) {
  let { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
  if (isMissingColumnError(error)) {
    ;({ data, error } = await supabase.from('projects').update(stripOptional(patch)).eq('id', id).select().single())
  }
  if (error) throw error
  invalidate('projects')
  return data
}

export async function archiveProject(id) {
  return updateProject(id, { is_archived: true })
}

export async function reorderRows(table, orderedIds) {
  // עדכון sort_order לפי הסדר החדש
  const updates = orderedIds.map((id, i) => supabase.from(table).update({ sort_order: i }).eq('id', id))
  await Promise.all(updates)
  const prefix = { projects: 'projects', properties: 'projects', site_logos: 'logos', site_counters: 'counters' }[table]
  if (prefix) invalidate(prefix)
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
  return cached(`counters:${activeOnly}`, 60_000, async () => {
    let q = supabase.from('site_counters').select('*').order('sort_order', { ascending: true })
    if (activeOnly) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw error
    return data
  })
}
export async function createCounter(row) {
  const { data, error } = await supabase.from('site_counters').insert(row).select().single()
  if (error) throw error
  invalidate('counters')
  return data
}
export async function updateCounter(id, patch) {
  const { data, error } = await supabase.from('site_counters').update(patch).eq('id', id).select().single()
  if (error) throw error
  invalidate('counters')
  return data
}
export async function deleteCounter(id) {
  const { error } = await supabase.from('site_counters').delete().eq('id', id)
  if (error) throw error
  invalidate('counters')
}

// ---------- Logos (carousel) ----------
export async function listLogos({ activeOnly = false } = {}) {
  return cached(`logos:${activeOnly}`, 60_000, async () => {
    let q = supabase.from('site_logos').select('*').order('sort_order', { ascending: true })
    if (activeOnly) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw error
    return data
  })
}
export async function createLogo(row) {
  const { data, error } = await supabase.from('site_logos').insert(row).select().single()
  if (error) throw error
  invalidate('logos')
  return data
}
export async function updateLogo(id, patch) {
  const { data, error } = await supabase.from('site_logos').update(patch).eq('id', id).select().single()
  if (error) throw error
  invalidate('logos')
  return data
}
export async function deleteLogo(id, imageUrl) {
  if (imageUrl) await deleteMedia(imageUrl).catch(() => {})
  const { error } = await supabase.from('site_logos').delete().eq('id', id)
  if (error) throw error
  invalidate('logos')
}

// ---------- Leads (CRM) ----------
// יצירת ליד — נקראת גם מטפסי האתר (אנונימי, RLS מתיר insert לכולם)
export async function createLead(row) {
  if (!supabase) return
  const { data, error } = await supabase.from('leads').insert(row).select().single()
  if (error) throw error
  // התראת מייל אוטומטית בזמן אמת — רק לפניות מהאתר (לא לידים שנוספו ידנית בניהול)
  if (data && row.source !== 'manual') notifyNewLead(data)
  return data
}

/* שולח את הליד לפונקציית /api/notify-lead (Vercel) שמפיצה מייל לנמענים.
   Fire-and-forget — לא חוסם את חוויית המשתמש, ובולע שגיאות (למשל בפיתוח מקומי). */
function notifyNewLead(lead) {
  try {
    fetch('/api/notify-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* אין רשת / אין endpoint — מתעלמים */ }
}

// ---------- Lead notifications (settings) ----------
export async function listRecipients() {
  if (!supabase) return []
  const { data, error } = await supabase.from('lead_notify_recipients').select('*').order('sort_order').order('created_at')
  if (error) throw error
  return data || []
}
export async function createRecipient(row) {
  const { data, error } = await supabase.from('lead_notify_recipients').insert(row).select().single()
  if (error) throw error
  return data
}
export async function updateRecipient(id, patch) {
  const { data, error } = await supabase.from('lead_notify_recipients').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteRecipient(id) {
  const { error } = await supabase.from('lead_notify_recipients').delete().eq('id', id)
  if (error) throw error
}
export async function getNotifySettings() {
  if (!supabase) return null
  const { data, error } = await supabase.from('lead_notify_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}
export async function saveNotifySettings(patch) {
  const { data, error } = await supabase.from('lead_notify_settings').upsert({ id: 1, ...patch }).select().single()
  if (error) throw error
  return data
}
// שליחת מייל בדיקה — מפעיל את אותה פונקציית /api/notify-lead עם דגל test
export async function sendTestNotification() {
  const res = await fetch('/api/notify-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `שגיאה (${res.status})`)
  return out
}
export async function listLeads() {
  const { data, error } = await supabase.from('leads').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function updateLead(id, patch) {
  const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

/* ============================================================
   שכבת תאימות (legacy) — לרכיבי האדמין הקיימים + גודל הלוגו.
   עובדת מעל הטבלאות stats / projects / site_settings (הקיימות).
   אינה נוגעת ב-API החדש למעלה.
   ============================================================ */
export function clearCmsCache() { _cache.clear() }

export async function fetchStats() {
  if (!supabase) return []
  const { data, error } = await supabase.from('stats').select('*').order('sort_order')
  return error ? [] : (data || [])
}
export async function upsertStat(stat) {
  const { error } = await supabase.from('stats').upsert(stat)
  if (error) throw error
}

export async function fetchProjects() {
  if (!supabase) return []
  const { data, error } = await supabase.from('projects').select('*').order('sort_order')
  return error ? [] : (data || [])
}
export async function upsertProject(project) {
  const { data, error } = await supabase.from('projects').upsert(project, { onConflict: 'slug' }).select()
  if (error) throw error
  return data?.[0]
}
export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  invalidate('projects')
}

export async function fetchSettings() {
  if (!supabase) return {}
  // הגדרות האתר נקראות ע"י כמה רכיבים בו-זמנית (פונטים, לוגו, יומן, כותרות)
  // — המטמון מאחד אותן לבקשת רשת אחת.
  return cached('settings', 60_000, async () => {
    const { data, error } = await supabase.from('site_settings').select('*')
    if (error) return {}
    return Object.fromEntries((data || []).map((r) => [r.key, r.value]))
  })
}
export async function setSetting(key, value) {
  const { error } = await supabase.from('site_settings').upsert({ key, value })
  if (error) throw error
  invalidate('settings')
}

/* ---- עדכון בזמן אמת להגדרות האתר ----
   מנוי Realtime *יחיד* לכל האפליקציה (לא ערוץ לכל קומפוננטה — כדי להימנע
   מערוצים כפולים באותו topic). הכול עטוף ב-try/catch כך שגם אם Realtime
   לא מאופשר על הטבלה / נכשל — זה לעולם לא יפיל את הרינדור. */
let _settingsChannel = null
const _settingsListeners = new Set()
function ensureSettingsRealtime() {
  if (_settingsChannel || !supabase || typeof supabase.channel !== 'function') return
  try {
    _settingsChannel = supabase
      .channel('site_settings_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        invalidate('settings')
        _settingsListeners.forEach((fn) => { try { fn() } catch { /* noop */ } })
      })
      .subscribe()
  } catch { _settingsChannel = null }
}

export function useSettings() {
  // זריעה מיידית מתמונת-המצב השמורה → ההגדרות (פונטים/לוגו/תמונות) חלות מיד, בלי המתנה לרשת
  const [settings, setSettings] = useState(() => cachedSnapshot('settings') || {})
  useEffect(() => {
    let on = true
    const load = () => fetchSettings().then((s) => on && setSettings(s)).catch(() => {})
    load()

    // הצטרפות למנוי המשותף + רענון בעת חזרה ללשונית (גיבוי לנתונים טריים)
    _settingsListeners.add(load)
    // Realtime נפתח רק למשתמש מחובר (אדמין) — מבקרים אנונימיים אינם פותחים
    // חיבור websocket (חיסכון משמעותי במכסת ה-Realtime של Supabase). הם
    // מתעדכנים ממילא בטעינת העמוד ובחזרה ללשונית (focus).
    let cancelled = false
    if (supabase?.auth?.getSession) {
      supabase.auth.getSession()
        .then(({ data }) => { if (!cancelled && data?.session) ensureSettingsRealtime() })
        .catch(() => {})
    }
    const onFocus = () => { invalidate('settings'); load() }
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)

    return () => {
      on = false
      cancelled = true
      _settingsListeners.delete(load)
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus)
    }
  }, [])
  return settings
}

// ---------- Newsletter (מאגר נרשמים + וובהוק לאוטומציות) ----------
export async function subscribeNewsletter(email, source = 'site') {
  if (!supabase) throw new Error('Supabase לא מוגדר')
  const clean = String(email || '').trim().toLowerCase()
  if (!clean) throw new Error('אימייל ריק')
  const { error } = await supabase.from('newsletter_subscribers').insert({ email: clean, source })
  // 23505 = כבר רשום (אינדקס ייחודי) — נחשב הצלחה שקטה
  if (error && error.code !== '23505') throw error
  // וובהוק לאוטומציות (Make / Zapier / ESP) — שיגור-ושכח, לא חוסם את המשתמש
  try {
    const s = await fetchSettings()
    if (s.newsletter_webhook) {
      fetch(s.newsletter_webhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'newsletter_subscribe', email: clean, source, ts: new Date().toISOString() }),
      }).catch(() => {})
    }
  } catch { /* הוובהוק הוא תוסף — כישלון בו לא מפיל את ההרשמה */ }
}

export async function listSubscribers() {
  const { data, error } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function deleteSubscriber(id) {
  const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id)
  if (error) throw error
}
