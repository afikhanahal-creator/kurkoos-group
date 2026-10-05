import { supabase } from '../../lib/supabase.js'

/* ============================================================
   ייבוא מהמערכת הקודמת (מנוע התוכן ב-claude.ai) אל האתר.
   הקובץ ‎.kce נוצר שם בכפתור "הורדת קובץ ההעברה":
     'KCE1' | אורך הכותרת (4 בתים) | כותרת JSON | חלקים בינאריים
   החלקים: data (כל אוספי המסד, דחוס gzip), blob (קבצים שהועלו),
   static (תמונות וסרטונים מובנים).
   הכול נכתב עם ההתחברות של המנהל. הייבוא בטוח להרצה חוזרת:
   כל רשומה וכל קובץ נכתבים מעל עצמם.
   ============================================================ */

const BUCKET = 'engine-media'

async function readHeader(file) {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const magic = new TextDecoder().decode(head.slice(0, 4))
  if (magic !== 'KCE1') throw new Error('זה לא קובץ העברה של מנוע התוכן')
  const len = new DataView(head.buffer).getUint32(4)
  const meta = JSON.parse(new TextDecoder().decode(await file.slice(8, 8 + len).arrayBuffer()))
  return { base: 8 + len, entries: meta.entries || [] }
}

async function gunzip(blob) {
  if (!window.DecompressionStream) throw new Error('הדפדפן הזה לא יודע לפתוח קבצים דחוסים. נסו ב-Chrome מעודכן')
  return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
}

export async function importEngineFile(file, onProgress) {
  if (!supabase) throw new Error('האתר לא מחובר ל-Supabase')
  const say = (m, p) => onProgress && onProgress(m, p)
  const { base, entries } = await readHeader(file)
  const part = (e) => file.slice(base + e.off, base + e.off + e.len)

  const dataEntry = entries.find((e) => e.kind === 'data')
  if (!dataEntry) throw new Error('בקובץ אין נתונים')
  say('פותח את הנתונים…', 0)
  const text = dataEntry.gz ? await gunzip(part(dataEntry)) : await part(dataEntry).text()
  const { data } = JSON.parse(text)

  const rows = []
  for (const [collection, docs] of Object.entries(data || {})) {
    for (const [id, doc] of Object.entries(docs || {})) rows.push({ collection, id, data: doc })
  }
  const files = entries.filter((e) => e.kind === 'blob' || e.kind === 'static')
  const total = rows.length + files.length
  let done = 0

  // רשומות, בקבוצות של 400
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400)
    let err = null
    for (let t = 0; t < 3; t++) {
      ;({ error: err } = await supabase.from('engine_docs').upsert(chunk, { onConflict: 'collection,id' }))
      if (!err) break
      await new Promise((r) => setTimeout(r, 1200 * (t + 1)))
    }
    if (err) throw new Error('שמירת הרשומות נכשלה: ' + err.message)
    done += chunk.length
    say(`רשומות: ${Math.min(i + 400, rows.length)} מתוך ${rows.length}`, done / total)
  }

  // קבצים
  let failed = 0
  for (const e of files) {
    const path = e.kind === 'blob' ? `blob/${e.id}` : `static/${e.path}`
    const body = part(e)
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { upsert: true, contentType: e.type || undefined, cacheControl: '31536000' })
    if (error) failed++
    done++
    say(`קבצים: ${done - rows.length} מתוך ${files.length}${failed ? ` (${failed} נכשלו)` : ''}`, done / total)
  }
  return { records: rows.length, files: files.length, failed }
}
