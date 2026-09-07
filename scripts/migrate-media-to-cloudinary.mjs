#!/usr/bin/env node
/* ============================================================
   מיגרציית מדיה: Supabase Storage → Cloudinary
   מוריד כל קובץ מדלי ה-media, מעלה ל-Cloudinary, ומעדכן את כל
   הקישורים במסד (site_settings, projects, logos, counters).
   המטרה: לאפס את צריכת ה-Egress של Supabase על הגשת תמונות.

   שימוש:
     SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
     CLOUDINARY_CLOUD_NAME=... CLOUDINARY_UPLOAD_PRESET=... \
     node scripts/migrate-media-to-cloudinary.mjs            ← הרצה יבשה (רק מדפיס)
     node scripts/migrate-media-to-cloudinary.mjs --apply    ← מבצע בפועל

   דרישות:
   - SUPABASE_SERVICE_KEY = מפתח service_role (Settings → API בלוח Supabase).
     נחוץ לרשימת הקבצים ולעדכון הטבלאות. לא לשתף ולא להכניס לקוד!
   - CLOUDINARY_UPLOAD_PRESET = preset מסוג Unsigned (Settings → Upload בלוח Cloudinary).
   - Node 18 ומעלה (fetch/FormData מובנים).

   הסקריפט אידמפוטנטי: מפת ההעברות נשמרת ל-media-migration-map.json,
   והרצה חוזרת מדלגת על קבצים שכבר הועברו.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || ''
const PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || ''
const APPLY = process.argv.includes('--apply')
const BUCKET = 'media'
const MAP_FILE = 'media-migration-map.json'

if (!SUPABASE_URL || !SERVICE_KEY || !CLOUD || !PRESET) {
  console.error('חסרים משתני סביבה. נדרשים: SUPABASE_URL, SUPABASE_SERVICE_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET')
  process.exit(1)
}

const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`

/* ---------- Storage: רשימת כל הקבצים (רקורסיבי) ---------- */
async function listFolder(prefix = '') {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  })
  if (!res.ok) throw new Error(`storage list failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function listAllFiles(prefix = '') {
  const entries = await listFolder(prefix)
  const files = []
  for (const e of entries) {
    const full = prefix ? `${prefix}/${e.name}` : e.name
    if (e.id === null) files.push(...await listAllFiles(full))   // תיקייה
    else files.push({ path: full, size: e.metadata?.size ?? 0, mime: e.metadata?.mimetype || '' })
  }
  return files
}

/* ---------- Cloudinary: העלאה לא-חתומה ---------- */
async function uploadToCloudinary(bytes, mime, path) {
  const fd = new FormData()
  fd.append('file', new Blob([bytes], { type: mime || 'application/octet-stream' }))
  fd.append('upload_preset', PRESET)
  fd.append('folder', 'kurkoos-media')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`cloudinary upload failed for ${path} (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.secure_url
}

/* ---------- טבלאות: עדכון גנרי של כל שורה שמכילה URL ישן ---------- */
const TABLES = [
  { name: 'site_settings', pk: 'key' },
  { name: 'projects', pk: 'id' },
  { name: 'logos', pk: 'id' },
  { name: 'counters', pk: 'id' },
]

async function fetchRows(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: sbHeaders })
  if (!res.ok) { console.warn(`  ⚠ דילוג על ${table}: ${res.status}`); return [] }
  return res.json()
}

async function updateRow(table, pk, pkValue, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${pk}=eq.${encodeURIComponent(pkValue)}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`update ${table}/${pkValue} failed (${res.status}): ${await res.text()}`)
}

function replaceUrls(value, urlMap) {
  let str = JSON.stringify(value)
  let changed = false
  for (const [oldUrl, newUrl] of Object.entries(urlMap)) {
    if (str.includes(oldUrl)) { str = str.split(oldUrl).join(newUrl); changed = true }
  }
  return changed ? JSON.parse(str) : null
}

/* ---------- ריצה ---------- */
console.log(`מצב: ${APPLY ? 'ביצוע בפועל (--apply)' : 'הרצה יבשה (הוסיפו --apply לביצוע)'}\n`)

const urlMap = existsSync(MAP_FILE) ? JSON.parse(readFileSync(MAP_FILE, 'utf8')) : {}

console.log('שלב 1: רשימת קבצים בדלי media...')
const files = await listAllFiles()
const totalMB = (files.reduce((a, f) => a + f.size, 0) / 1048576).toFixed(1)
console.log(`  נמצאו ${files.length} קבצים, ${totalMB}MB סה"כ\n`)

console.log('שלב 2: העלאה ל-Cloudinary...')
let uploaded = 0, skipped = 0, failed = 0
for (const f of files) {
  const oldUrl = publicPrefix + f.path
  if (urlMap[oldUrl]) { skipped++; continue }
  if (!APPLY) { console.log(`  [יבש] ${f.path} (${(f.size / 1024).toFixed(0)}KB)`); continue }
  try {
    const dl = await fetch(oldUrl)
    if (!dl.ok) throw new Error(`download ${dl.status}`)
    const bytes = await dl.arrayBuffer()
    urlMap[oldUrl] = await uploadToCloudinary(bytes, f.mime, f.path)
    writeFileSync(MAP_FILE, JSON.stringify(urlMap, null, 2))   // שמירה מתמשכת — עמיד לקריסה
    uploaded++
    console.log(`  ✓ ${f.path}`)
  } catch (err) {
    failed++
    console.warn(`  ✗ ${f.path}: ${err.message}`)
  }
}
console.log(`  הועלו ${uploaded}, דולגו (כבר הועברו) ${skipped}, נכשלו ${failed}\n`)

console.log('שלב 3: עדכון קישורים בטבלאות...')
for (const t of TABLES) {
  const rows = await fetchRows(t.name)
  let patched = 0
  for (const row of rows) {
    const pkValue = row[t.pk]
    const { [t.pk]: _pk, ...rest } = row
    const replaced = replaceUrls(rest, urlMap)
    if (!replaced) continue
    if (APPLY) await updateRow(t.name, t.pk, pkValue, replaced)
    patched++
  }
  console.log(`  ${t.name}: ${patched} שורות ${APPLY ? 'עודכנו' : 'ידרשו עדכון'}`)
}

console.log(`\nסיום. מפת ההעברות: ${MAP_FILE}`)
if (APPLY) console.log('לאחר אימות שהאתר תקין, אפשר למחוק את הקבצים מדלי ה-media בלוח Supabase כדי לפנות אחסון.')
