import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from '../supabase.js'
import { cached, cachedSnapshot, invalidate } from '../cms.js'
import { saveHeading } from '../headings.js'

/* ============================================================
   עורך העמודים: מבנה העמוד נשמר כרשימת סקשנים (layout).
   - pages: הגרסה המפורסמת, שהאתר קורא (קריאה ציבורית).
   - page_drafts: הטיוטה, רק למנהל המחובר.
   - page_versions: כל פרסום נשמר כגרסה. אין מחיקה ואין עדכון.
   עמוד בלי שורה ב-pages מוצג מהקוד, בדיוק כמו קודם.
   ============================================================ */

export const DEVICES = [
  { id: 'd', label: 'מחשב', min: 981, max: null, width: 1280 },
  { id: 't', label: 'טאבלט', min: 600, max: 980, width: 820 },
  { id: 'm', label: 'נייד', min: null, max: 599, width: 390 },
]
export const SPACE_SCALE = [0, 16, 24, 32, 48, 64, 96, 128]
export const TYPE_SCALE = [
  { id: 'hero', label: 'ענק' },
  { id: 'h1', label: 'H1' },
  { id: 'h2', label: 'H2' },
  { id: 'h3', label: 'H3' },
]

let _n = 0
export const newId = (type) => `${type}_${Date.now().toString(36)}${(_n++).toString(36)}`

const clone = (o) => JSON.parse(JSON.stringify(o))

/* ============================================================
   הגדרת עמוד (defs/<page>.js): הסדר הקבוע מהקוד, שממנו נבנה העמוד
   כשאין לו גרסה מפורסמת בעורך.
   sections: מחרוזת = רכיב משותף מהספרייה (widgets.jsx).
             מערך [id, label, icon, texts] = סקשן של העמוד עצמו ('l:<id>').
   ============================================================ */
export const localId = (x) => (Array.isArray(x) ? `l:${x[0]}` : x)
export function defaultLayout(def) {
  return {
    v: 1,
    sections: (def?.sections || []).map((x) => {
      const type = localId(x)
      return { id: `${type.replace(':', '-')}_d`, type, props: {}, rs: {} }
    }),
  }
}

/* ---------- מצב עריכה בתוך ה-iframe ----------
   ?kc-edit=1    עמוד בתוך העורך, מקבל את הטיוטה מההורה ב-postMessage.
   ?kc-preview=1 תצוגה מקדימה בלשונית נפרדת, קוראת את הטיוטה מ-Supabase. */
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
export const EDIT_MODE = !!(params && params.get('kc-edit') === '1' && window.parent !== window)
export const PREVIEW_MODE = !!(params && params.get('kc-preview') === '1')

const store = { layout: null, texts: {}, device: 'd', selected: null, listeners: new Set() }
const emit = () => store.listeners.forEach((f) => f())
export function setDraftState(patch) { Object.assign(store, patch); store.v = (store.v || 0) + 1; emit() }
const subscribe = (f) => { store.listeners.add(f); return () => store.listeners.delete(f) }
const snap = () => store.v || 0
export function useDraftStore() {
  useSyncExternalStore(subscribe, snap, snap)
  return store
}

/* ---------- קריאה וכתיבה ---------- */
const TTL = 5 * 60 * 1000

export async function fetchPublished(slug) {
  if (!supabase) return null
  return cached(`page:${slug}`, TTL, async () => {
    const { data, error } = await supabase.from('pages').select('layout,seo,version,published_at').eq('slug', slug).maybeSingle()
    if (error) throw error
    return data || null
  })
}

/* מבנה העמוד לאתר הציבורי: מהמטמון המקומי מיד, ואז מהשרת. בלי שורה, ברירת המחדל מהקוד. */
export function usePageLayout(slug, def) {
  const draft = useDraftStore()
  const [row, setRow] = useState(() => (EDIT_MODE || PREVIEW_MODE ? null : cachedSnapshot(`page:${slug}`)))
  useEffect(() => {
    if (EDIT_MODE) return undefined
    let on = true
    if (PREVIEW_MODE) {
      fetchDraft(slug).then((d) => { if (on && d) setDraftState({ layout: d.layout, texts: d.layout.texts || {} }) }).catch(() => {})
    }
    fetchPublished(slug).then((r) => { if (on) setRow(r) }).catch(() => {})
    return () => { on = false }
  }, [slug])
  if ((EDIT_MODE || PREVIEW_MODE) && draft.layout) return { layout: draft.layout, seo: draft.layout.seo || {} }
  if (row && row.layout && Array.isArray(row.layout.sections)) return { layout: row.layout, seo: row.seo || {} }
  return { layout: defaultLayout(def), seo: {} }
}

export async function fetchDraft(slug) {
  const { data, error } = await supabase.from('page_drafts').select('layout,updated_at').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function saveDraft(slug, layout) {
  const { error } = await supabase.from('page_drafts').upsert({ slug, layout, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function listVersions(slug) {
  const { data, error } = await supabase.from('page_versions').select('id,version,published_at,note,layout').eq('slug', slug).order('version', { ascending: false }).limit(50)
  if (error) throw error
  return data || []
}

/* פרסום: הטיוטה הופכת לגרסה המפורסמת, ונשמרת גרסה בהיסטוריה.
   טקסטים של סקשנים קיימים נכתבים לכותרות האתר (אותו מקום שלשונית "כותרות וטקסטים" כותבת). */
export async function publishPage(slug, layout, { baseTexts = {} } = {}) {
  const { data: cur } = await supabase.from('pages').select('version').eq('slug', slug).maybeSingle()
  const version = (cur?.version || 0) + 1
  const texts = layout.texts || {}
  for (const [k, v] of Object.entries(texts)) {
    if (baseTexts[k] !== v) await saveHeading(k, v)
  }
  const clean = { ...layout, texts: {} }
  const seo = layout.seo || {}
  const { error: e1 } = await supabase.from('page_versions').insert({ slug, version, layout: { ...layout } })
  if (e1) throw e1
  const { error: e2 } = await supabase.from('pages').upsert({ slug, layout: clean, seo, version, published_at: new Date().toISOString() })
  if (e2) throw e2
  await saveDraft(slug, clean)
  invalidate(`page:${slug}`)
  invalidate('settings')
  return version
}

/* ---------- ערכים רספונסיביים ----------
   טאבלט יורש ממחשב, נייד יורש מטאבלט. ריווח בנייד יורד צעד אחד בסולם כשלא נקבע. */
const stepDown = (v) => {
  const i = SPACE_SCALE.indexOf(v)
  return i > 0 ? SPACE_SCALE[i - 1] : v
}
export function resolveRs(rs = {}, prop) {
  const d = rs.d?.[prop]
  const t = rs.t?.[prop] ?? d
  let m = rs.m?.[prop]
  if (m == null) m = (prop === 'pt' || prop === 'pb') && t != null ? stepDown(t) : t
  return { d, t, m }
}

const MQ = { d: '(min-width: 981px)', t: '(min-width: 600px) and (max-width: 980px)', m: '(max-width: 599px)' }

/* CSS לסקשן אחד. רק מה שנקבע נכתב, כך שסקשן בלי הגדרות נראה בדיוק כמו בקוד. */
/* ערך לכל מכשיר: מחשב מההגדרה או מהתוכן, טאבלט יורש ממחשב, נייד יורש מטאבלט */
function cascade(rs, prop, base, { t: tDef, m: mDef } = {}) {
  const d = rs.d?.[prop] ?? base
  const t = rs.t?.[prop] ?? (tDef ? tDef(d) : d)
  const m = rs.m?.[prop] ?? (mDef ? mDef(t) : t)
  return { d, t, m }
}

export function sectionCss(s) {
  const sel = `[data-pb="${s.id}"]`
  const rs = s.rs || {}
  const p = s.props || {}
  const pt = resolveRs(rs, 'pt')
  const pb = resolveRs(rs, 'pb')
  const align = cascade(rs, 'align', p.align)
  const size = cascade(rs, 'size', p.size)
  const cols = p.cols ? cascade(rs, 'cols', p.cols, { t: (d) => Math.min(2, d), m: () => 1 }) : null
  const out = []
  for (const dev of ['d', 't', 'm']) {
    const rules = []
    if (pt[dev] != null) rules.push(`${sel}>*{padding-top:${pt[dev]}px!important}`)
    if (pb[dev] != null) rules.push(`${sel}>*{padding-bottom:${pb[dev]}px!important}`)
    if (align[dev]) {
      const c = align[dev] === 'center'
      rules.push(`${sel} .pb-in{text-align:${c ? 'center' : 'start'};--pb-justify:${c ? 'center' : 'flex-start'}}${sel} .pb-p,${sel} .pb-check{margin-inline:${c ? 'auto' : '0'}}`)
    }
    if (size[dev]) rules.push(`${sel} .pb-h{font-size:var(--fs-${size[dev]})}`)
    if (cols) rules.push(`${sel} .pb-cols{grid-template-columns:repeat(${cols[dev]},minmax(0,1fr))}`)
    if (rs[dev]?.hide) rules.push(`${sel}{display:none!important}`)
    if (rules.length) out.push(`@media ${MQ[dev]}{${rules.join('')}}`)
  }
  return out.join('\n')
}

/* הערך שמוצג בהגדרות למכשיר הנוכחי, כולל ירושה */
export function effectiveRs(s, dev, prop) {
  const rs = s.rs || {}
  const p = s.props || {}
  if (prop === 'pt' || prop === 'pb') return resolveRs(rs, prop)[dev]
  if (prop === 'cols') return p.cols ? cascade(rs, 'cols', p.cols, { t: (d) => Math.min(2, d), m: () => 1 })[dev] : undefined
  return cascade(rs, prop, p[prop])[dev]
}

export { clone }
