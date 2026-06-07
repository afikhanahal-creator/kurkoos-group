import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import { fetchProjects, upsertProject, deleteProject, uploadMedia, clearCmsCache } from '../../lib/cms.js'

const STATUS = ['planning', 'construction', 'marketing', 'completed']
const CATEGORY = ['residential', 'commercial', 'renewal']

const blank = () => ({
  slug: '', name: { he: '', en: '' }, city: { he: '', en: '' },
  status: 'planning', category: 'residential', year: new Date().getFullYear(), units: 0,
  towers: '', floors: '', architects: { he: '', en: '' },
  type: { he: '', en: '' }, short: { he: '', en: '' }, description: { he: '', en: '' },
  cover: '', gallery: [], features: [], video: { type: 'youtube', id: '' }, sort_order: 99,
  mapQuery: '',
  environment: { title: { he: '', en: '' }, text: { he: '', en: '' }, image: '' },
  planGroups: [], galleryGroups: [],
})

// מירור ערך עברי לשני השדות (האתר עובד עם {he,en}; אנחנו עורכים עברית בלבד)
const he2 = (v) => ({ he: v || '', en: v || '' })

export default function ProjectsAdmin() {
  const { lang } = useI18n()
  const he = lang === 'he'
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => { clearCmsCache(); fetchProjects().then(setList) }
  useEffect(load, [])

  const set = (patch) => setEditing((p) => ({ ...p, ...patch }))
  const setI18n = (field, key, val) => setEditing((p) => ({ ...p, [field]: { ...p[field], [key]: val } }))

  const save = async () => {
    if (!editing.slug) { alert('חובה למלא Slug (מזהה באנגלית לכתובת, למשל park-residence)'); return }
    setBusy(true)
    try {
      const env = editing.environment || {}
      const row = {
        ...editing,
        name: he2(editing.name?.he),
        city: he2(editing.city?.he),
        type: he2(editing.type?.he),
        architects: he2(editing.architects?.he),
        short: he2(editing.short?.he),
        description: he2(editing.description?.he),
        year: Number(editing.year) || null,
        units: Number(editing.units) || null,
        towers: Number(editing.towers) || null,
        floors: editing.floors || null,
        mapQuery: editing.mapQuery || '',
        features: (editing.features || []).map((f) => he2(f?.he)),
        environment: {
          title: he2(env.title?.he),
          text: he2(env.text?.he),
          image: env.image || '',
        },
        planGroups: (editing.planGroups || []).map((g) => ({
          rooms: Number(g.rooms) || null,
          label: he2(g.label?.he),
          plans: (g.plans || []).map((pl) => ({ label: he2(pl.label?.he), img: pl.img || '' })),
        })),
        galleryGroups: (editing.galleryGroups || []).map((g) => ({
          label: he2(g.label?.he),
          images: g.images || [],
        })),
      }
      if (!row.id) delete row.id
      await upsertProject(row)
      setEditing(null)
      load()
    } catch (e) { alert('שגיאה: ' + e.message) }
    setBusy(false)
  }

  const remove = async (p) => {
    if (!confirm(he ? `למחוק את "${p.name?.he}"?` : `Delete "${p.name?.en}"?`)) return
    try { await deleteProject(p.id); load() } catch (e) { alert(e.message) }
  }

  const uploadCover = async (file) => {
    if (!file) return
    setBusy(true)
    try { set({ cover: await uploadMedia(file, 'projects') }) } catch (e) { alert(e.message) }
    setBusy(false)
  }
  const addGallery = async (file) => {
    if (!file) return
    setBusy(true)
    try { const url = await uploadMedia(file, 'projects'); set({ gallery: [...(editing.gallery || []), url] }) } catch (e) { alert(e.message) }
    setBusy(false)
  }

  // ---------- עזרי ריפיטר ----------
  const upload = async (cb) => {
    setBusy(true)
    try { return await cb() } catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  // מאפיינים
  const addFeature = () => set({ features: [...(editing.features || []), { he: '', en: '' }] })
  const setFeature = (i, val) => set({ features: (editing.features || []).map((f, j) => j === i ? { ...f, he: val } : f) })
  const delFeature = (i) => set({ features: (editing.features || []).filter((_, j) => j !== i) })

  // סביבה
  const setEnv = (key, val) => set({ environment: { ...(editing.environment || {}), [key]: val } })
  const setEnvI18n = (key, val) => set({ environment: { ...(editing.environment || {}), [key]: { ...((editing.environment || {})[key] || {}), he: val } } })
  const uploadEnvImage = async (file) => {
    if (!file) return
    await upload(async () => setEnv('image', await uploadMedia(file, 'projects')))
  }

  // קבוצות תוכניות
  const PG = () => editing.planGroups || []
  const setPG = (groups) => set({ planGroups: groups })
  const addPlanGroup = () => setPG([...PG(), { rooms: '', label: { he: '', en: '' }, plans: [] }])
  const delPlanGroup = (gi) => setPG(PG().filter((_, j) => j !== gi))
  const updPlanGroup = (gi, patch) => setPG(PG().map((g, j) => j === gi ? { ...g, ...patch } : g))
  const addPlan = (gi) => updPlanGroup(gi, { plans: [...(PG()[gi].plans || []), { label: { he: '', en: '' }, img: '' }] })
  const delPlan = (gi, pi) => updPlanGroup(gi, { plans: (PG()[gi].plans || []).filter((_, j) => j !== pi) })
  const updPlan = (gi, pi, patch) => updPlanGroup(gi, { plans: (PG()[gi].plans || []).map((pl, j) => j === pi ? { ...pl, ...patch } : pl) })
  const uploadPlanImage = async (gi, pi, file) => {
    if (!file) return
    await upload(async () => updPlan(gi, pi, { img: await uploadMedia(file, 'projects') }))
  }

  // גלריות לפי קטגוריה
  const GG = () => editing.galleryGroups || []
  const setGG = (groups) => set({ galleryGroups: groups })
  const addGalleryGroup = () => setGG([...GG(), { label: { he: '', en: '' }, images: [] }])
  const delGalleryGroup = (gi) => setGG(GG().filter((_, j) => j !== gi))
  const updGalleryGroup = (gi, patch) => setGG(GG().map((g, j) => j === gi ? { ...g, ...patch } : g))
  const addGalleryGroupImage = async (gi, file) => {
    if (!file) return
    await upload(async () => {
      const url = await uploadMedia(file, 'projects')
      updGalleryGroup(gi, { images: [...(GG()[gi].images || []), url] })
    })
  }
  const delGalleryGroupImage = (gi, ii) => updGalleryGroup(gi, { images: (GG()[gi].images || []).filter((_, j) => j !== ii) })

  // ---------- עורך ----------
  if (editing) {
    const e = editing
    return (
      <div className="adm adm--editor">
        <div className="adm__editor-head">
          <h3>{e.id ? (he ? 'עריכת פרויקט' : 'Edit project') : (he ? 'פרויקט חדש' : 'New project')}</h3>
          <div>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>{he ? 'ביטול' : 'Cancel'}</button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>{busy ? '…' : (he ? 'שמירה' : 'Save')}</button>
          </div>
        </div>

        <div className="adm__grid2">
          <Field label="Slug (כתובת)"><input dir="ltr" value={e.slug} onChange={(ev) => set({ slug: ev.target.value })} placeholder="park-residence" /></Field>
          <Field label="שם הפרויקט"><input dir="rtl" value={e.name?.he || ''} onChange={(ev) => setI18n('name', 'he', ev.target.value)} /></Field>
          <Field label="עיר"><input dir="rtl" value={e.city?.he || ''} onChange={(ev) => setI18n('city', 'he', ev.target.value)} /></Field>
          <Field label="סטטוס">
            <select value={e.status} onChange={(ev) => set({ status: ev.target.value })}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </Field>
          <Field label="קטגוריה">
            <select value={e.category} onChange={(ev) => set({ category: ev.target.value })}>{CATEGORY.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </Field>
          <Field label="שנה"><input type="number" value={e.year || ''} onChange={(ev) => set({ year: ev.target.value })} /></Field>
          <Field label='יח"ד (יחידות דיור)'><input type="number" value={e.units || ''} onChange={(ev) => set({ units: ev.target.value })} /></Field>
          <Field label="בניינים"><input type="number" value={e.towers || ''} onChange={(ev) => set({ towers: ev.target.value })} /></Field>
          <Field label="קומות"><input dir="rtl" value={e.floors || ''} onChange={(ev) => set({ floors: ev.target.value })} placeholder="למשל: 24 או 7-8" /></Field>
          <Field label="אדריכל / אדריכלים"><input dir="rtl" value={e.architects?.he || ''} onChange={(ev) => setI18n('architects', 'he', ev.target.value)} placeholder="למשל: בר אוריין" /></Field>
          <Field label="סוג פרויקט"><input dir="rtl" value={e.type?.he || ''} onChange={(ev) => setI18n('type', 'he', ev.target.value)} placeholder="למשל: מגורי יוקרה" /></Field>
          <Field label="סדר תצוגה"><input type="number" value={e.sort_order ?? 99} onChange={(ev) => set({ sort_order: Number(ev.target.value) })} /></Field>
        </div>

        <Field label="תקציר"><textarea dir="rtl" rows={2} value={e.short?.he || ''} onChange={(ev) => setI18n('short', 'he', ev.target.value)} /></Field>
        <Field label="תיאור"><textarea dir="rtl" rows={3} value={e.description?.he || ''} onChange={(ev) => setI18n('description', 'he', ev.target.value)} /></Field>


        <Field label={he ? 'תמונת כיסוי' : 'Cover image'}>
          <div className="adm__media-row">
            {e.cover && <img className="adm__thumb" src={e.cover} alt="cover" />}
            <label className="btn btn--ghost adm__upload">{he ? 'העלאה' : 'Upload'}<input type="file" accept="image/*" hidden onChange={(ev) => uploadCover(ev.target.files[0])} /></label>
            <input dir="ltr" className="adm__url" value={e.cover || ''} onChange={(ev) => set({ cover: ev.target.value })} placeholder="https://…" />
          </div>
        </Field>

        <Field label={he ? 'גלריה (כללית)' : 'Gallery (flat)'}>
          <div className="adm__gallery">
            {(e.gallery || []).map((url, i) => (
              <div className="adm__gthumb" key={i}>
                <img src={url} alt={`g${i}`} />
                <button type="button" onClick={() => set({ gallery: e.gallery.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <label className="btn btn--ghost adm__upload">+ {he ? 'הוסף' : 'Add'}<input type="file" accept="image/*" hidden onChange={(ev) => addGallery(ev.target.files[0])} /></label>
          </div>
        </Field>

        {/* ===== וידאו ===== */}
        <h4 className="adm__subhead">{he ? 'וידאו' : 'Video'}</h4>
        <div className="adm__grid2">
          <Field label={he ? 'סוג וידאו' : 'Video type'}>
            <select value={e.video?.type || 'youtube'} onChange={(ev) => set({ video: { ...(e.video || {}), type: ev.target.value } })}>
              <option value="youtube">YouTube</option>
              <option value="file">{he ? 'קובץ (URL)' : 'File (URL)'}</option>
            </select>
          </Field>
          {(e.video?.type || 'youtube') === 'youtube' ? (
            <Field label={he ? 'מזהה YouTube' : 'YouTube ID'}>
              <input dir="ltr" value={e.video?.id || ''} onChange={(ev) => set({ video: { ...(e.video || {}), id: ev.target.value } })} placeholder="dQw4w9WgXcQ" />
            </Field>
          ) : (
            <Field label={he ? 'כתובת הקובץ' : 'File URL'}>
              <input dir="ltr" value={e.video?.src || ''} onChange={(ev) => set({ video: { ...(e.video || {}), src: ev.target.value } })} placeholder="https://…/video.mp4" />
            </Field>
          )}
        </div>

        {/* ===== מאפיינים ===== */}
        <h4 className="adm__subhead">{he ? 'מאפיינים' : 'Features'}</h4>
        <div className="adm__repeater">
          {(e.features || []).map((f, i) => (
            <div className="adm__rep-row" key={i}>
              <input dir="rtl" value={f?.he || ''} onChange={(ev) => setFeature(i, ev.target.value)} placeholder={he ? 'מאפיין…' : 'Feature…'} />
              <button type="button" className="adm__spec-del" onClick={() => delFeature(i)}>×</button>
            </div>
          ))}
          <button type="button" className="btn btn--ghost adm__add" onClick={addFeature}>+ {he ? 'הוסף מאפיין' : 'Add feature'}</button>
        </div>

        {/* ===== מפה ===== */}
        <Field label={he ? 'שאילתת מפה (Google Maps)' : 'Map query'}>
          <input dir="rtl" value={e.mapQuery || ''} onChange={(ev) => set({ mapQuery: ev.target.value })} placeholder={he ? 'למשל: שדרות רוטשילד, תל אביב' : 'e.g. Rothschild Blvd, Tel Aviv'} />
        </Field>

        {/* ===== סביבה ===== */}
        <h4 className="adm__subhead">{he ? 'סביבה' : 'Environment'}</h4>
        <Field label={he ? 'כותרת הסביבה' : 'Environment title'}>
          <input dir="rtl" value={e.environment?.title?.he || ''} onChange={(ev) => setEnvI18n('title', ev.target.value)} />
        </Field>
        <Field label={he ? 'טקסט הסביבה' : 'Environment text'}>
          <textarea dir="rtl" rows={3} value={e.environment?.text?.he || ''} onChange={(ev) => setEnvI18n('text', ev.target.value)} />
        </Field>
        <Field label={he ? 'תמונת סביבה' : 'Environment image'}>
          <div className="adm__media-row">
            {e.environment?.image && <img className="adm__thumb" src={e.environment.image} alt="env" />}
            <label className="btn btn--ghost adm__upload">{he ? 'העלאה' : 'Upload'}<input type="file" accept="image/*" hidden onChange={(ev) => uploadEnvImage(ev.target.files[0])} /></label>
            <input dir="ltr" className="adm__url" value={e.environment?.image || ''} onChange={(ev) => setEnv('image', ev.target.value)} placeholder="https://…" />
          </div>
        </Field>

        {/* ===== תוכניות (לפי סוג דירה) ===== */}
        <h4 className="adm__subhead">{he ? 'תוכניות (לפי סוג דירה)' : 'Plans (by apartment type)'}</h4>
        <div className="adm__groups">
          {(e.planGroups || []).map((g, gi) => (
            <div className="adm__group" key={gi}>
              <div className="adm__group-head">
                <div className="adm__grid2 adm__group-fields">
                  <Field label={he ? 'מספר חדרים' : 'Rooms'}>
                    <input type="number" value={g.rooms ?? ''} onChange={(ev) => updPlanGroup(gi, { rooms: ev.target.value })} />
                  </Field>
                  <Field label={he ? 'תווית הקבוצה' : 'Group label'}>
                    <input dir="rtl" value={g.label?.he || ''} onChange={(ev) => updPlanGroup(gi, { label: { ...(g.label || {}), he: ev.target.value } })} placeholder={he ? 'דירות 3 חדרים' : '3-room apartments'} />
                  </Field>
                </div>
                <button type="button" className="btn adm__del adm__group-del" onClick={() => delPlanGroup(gi)}>{he ? 'מחק קבוצה' : 'Remove group'}</button>
              </div>
              <div className="adm__repeater">
                {(g.plans || []).map((pl, pi) => (
                  <div className="adm__plan-row" key={pi}>
                    {pl.img && <img className="adm__thumb" src={pl.img} alt="plan" />}
                    <input dir="rtl" value={pl.label?.he || ''} onChange={(ev) => updPlan(gi, pi, { label: { ...(pl.label || {}), he: ev.target.value } })} placeholder={he ? 'תווית הדגם' : 'Plan label'} />
                    <label className="btn btn--ghost adm__upload">{he ? 'העלאה' : 'Upload'}<input type="file" accept="image/*" hidden onChange={(ev) => uploadPlanImage(gi, pi, ev.target.files[0])} /></label>
                    <input dir="ltr" className="adm__url" value={pl.img || ''} onChange={(ev) => updPlan(gi, pi, { img: ev.target.value })} placeholder="https://…" />
                    <button type="button" className="adm__spec-del" onClick={() => delPlan(gi, pi)}>×</button>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost adm__add" onClick={() => addPlan(gi)}>+ {he ? 'הוסף תוכנית' : 'Add plan'}</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--ghost adm__add" onClick={addPlanGroup}>+ {he ? 'הוסף קבוצת תוכניות' : 'Add plan group'}</button>
        </div>

        {/* ===== גלריה לפי קטגוריות ===== */}
        <h4 className="adm__subhead">{he ? 'גלריה לפי קטגוריות' : 'Gallery by category'}</h4>
        <div className="adm__groups">
          {(e.galleryGroups || []).map((g, gi) => (
            <div className="adm__group" key={gi}>
              <div className="adm__group-head">
                <Field label={he ? 'שם הקטגוריה' : 'Category label'}>
                  <input dir="rtl" value={g.label?.he || ''} onChange={(ev) => updGalleryGroup(gi, { label: { ...(g.label || {}), he: ev.target.value } })} placeholder={he ? 'הדמיות פנים' : 'Interiors'} />
                </Field>
                <button type="button" className="btn adm__del adm__group-del" onClick={() => delGalleryGroup(gi)}>{he ? 'מחק קטגוריה' : 'Remove category'}</button>
              </div>
              <div className="adm__gallery">
                {(g.images || []).map((url, ii) => (
                  <div className="adm__gthumb" key={ii}>
                    <img src={url} alt={`gg${ii}`} />
                    <button type="button" onClick={() => delGalleryGroupImage(gi, ii)}>×</button>
                  </div>
                ))}
                <label className="btn btn--ghost adm__upload">+ {he ? 'הוסף' : 'Add'}<input type="file" accept="image/*" hidden onChange={(ev) => addGalleryGroupImage(gi, ev.target.files[0])} /></label>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--ghost adm__add" onClick={addGalleryGroup}>+ {he ? 'הוסף קטגוריית גלריה' : 'Add gallery category'}</button>
        </div>
      </div>
    )
  }

  // ---------- רשימה ----------
  return (
    <div className="adm">
      <div className="adm__listhead">
        <p className="adm__hint">{he ? 'נהלו את הפרויקטים. השינויים משתקפים באתר מיד.' : 'Manage projects. Changes reflect on the site immediately.'}</p>
        <button type="button" className="btn btn--primary" onClick={() => setEditing(blank())}>+ {he ? 'פרויקט חדש' : 'New project'}</button>
      </div>
      <div className="adm__list">
        {list.map((p) => (
          <div className="adm__item" key={p.id || p.slug}>
            {p.cover && <img className="adm__item-img" src={p.cover} alt="" />}
            <div className="adm__item-info">
              <strong>{he ? p.name?.he : p.name?.en}</strong>
              <span>{(he ? p.city?.he : p.city?.en)} · {p.year} · {p.status}</span>
            </div>
            <div className="adm__item-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing({ ...blank(), ...p })}>{he ? 'עריכה' : 'Edit'}</button>
              {p.id && <button type="button" className="btn adm__del" onClick={() => remove(p)}>{he ? 'מחיקה' : 'Delete'}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="adm__field">
      <span>{label}</span>
      {children}
    </label>
  )
}
