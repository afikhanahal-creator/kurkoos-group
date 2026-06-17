import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import ImageManager from './ImageManager.jsx'
import ImageEditor from './ImageEditor.jsx'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import StatCubesField from './StatCubesField.jsx'
import ProjectPreview from './ProjectPreview.jsx'
import { slugify } from '../../lib/slugify.js'
import { uploadMedia, uploadVideoFile, hasCloudinary, fetchSettings, setSetting, listProjectCards } from '../../lib/cms.js'
import { toast } from '../../lib/toast.js'

const STRIP = ['id', 'created_at', 'updated_at']
const GALLERY_STEP = '__gallery__'   // מזהה מיוחד למקטע המדיה (גלריה) בתוך הצעדים

const XIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>

// בדיקת "ריקוּת" אחידה לשדה — מטפלת במחרוזות, מערכים ואובייקטים
const isEmpty = (v) =>
  v == null || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x == null || x === ''))

const CUSTOM = '__custom__'
/* בחירה מרשימה + אפשרות להקליד ערך מותאם ("אחר") — נוח לערוך ולשנות בכל עת. */
function SelectText({ value, options, onChange }) {
  const known = (val) => options.some((o) => o.value === val)
  const [custom, setCustom] = useState(value != null && value !== '' && !known(value))
  return (
    <div className="ed__seltext">
      <select
        value={custom ? CUSTOM : (value ?? '')}
        onChange={(e) => {
          if (e.target.value === CUSTOM) { setCustom(true); onChange('') }
          else { setCustom(false); onChange(e.target.value) }
        }}
      >
        <option value="">— בחרו —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value={CUSTOM}>אחר (הקלדה חופשית)…</option>
      </select>
      {custom && (
        <input
          type="text" dir="rtl" autoFocus placeholder="הקלידו סוג מותאם"
          value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

/* בורר "פרויקטים נוספים" — בחירה מתוך הפרויקטים האמיתיים במערכת (לפי slug).
   ריק = מציג אוטומטית את שאר הפרויקטים. שומר מערך של slugים בסדר הבחירה. */
function RelatedProjectsField({ value, currentSlug, onChange }) {
  const [opts, setOpts] = useState([])
  useEffect(() => {
    let on = true
    listProjectCards()
      .then((rows) => {
        if (!on || !rows) return
        setOpts(rows.map((r) => ({
          slug: r.slug || r.id,
          name: r.name?.he || r.name?.en || (typeof r.name === 'string' ? r.name : '') || r.slug || r.id,
        })))
      })
      .catch(() => {})
    return () => { on = false }
  }, [])
  const sel = Array.isArray(value)
    ? value
    : (typeof value === 'string' && value.trim()
        ? (() => { try { const a = JSON.parse(value); return Array.isArray(a) ? a : [] } catch { return [] } })()
        : [])
  const toggle = (slug) => onChange(sel.includes(slug) ? sel.filter((x) => x !== slug) : [...sel, slug])
  const list = opts.filter((o) => o.slug && o.slug !== currentSlug)
  return (
    <div className="ed__chips" role="group">
      {list.length === 0 && <span className="ed__seltext" style={{ color: 'var(--adm-muted,#889)' }}>אין עדיין פרויקטים אחרים במערכת.</span>}
      {list.map((o) => {
        const on = sel.includes(o.slug)
        return (
          <button type="button" key={o.slug} className={`ed__chip ${on ? 'ed__chip--on' : ''}`} aria-pressed={on} onClick={() => toggle(o.slug)}>
            <span className="ed__chip-check" aria-hidden="true">{on ? '✓' : '+'}</span>
            {o.name}
          </button>
        )
      })}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    saved: { t: 'נשמר אוטומטית', c: 'ok' },
    dirty: { t: 'שומר…', c: 'dirty' },
    saving: { t: 'שומר…', c: 'saving' },
    error: { t: 'שגיאת שמירה — נסו שוב', c: 'error' },
  }
  const s = map[status] || map.saved
  return <span className={`ed__status ed__status--${s.c}`}>{s.t}</span>
}

export default function Editor({ schema, record, onSave, folder = 'general', coverField = null, onArchive, onClose, previewUrl = null, title, steps = null }) {
  const [form, setForm] = useState(record)
  const [status, setStatus] = useState('saved')
  const [vidUp, setVidUp] = useState(-1) // אינדקס סרטון שמתבצעת לו העלאה
  const [envEdit, setEnvEdit] = useState(null) // עריכת תמונת הסביבה: { key, src }
  const [stepIdx, setStepIdx] = useState(0)    // הצעד הנוכחי באשף (כשפעיל)
  const [galleryCorners, setGalleryCorners] = useState(null) // עיגול פינות הגלריה (נשמר ב-site_settings לפי slug)
  const timer = useRef()
  const slugEdited = useRef(false)             // האם ה-slug נערך ידנית (אז לא ממלאים אוטומטית)

  useEffect(() => {
    setForm(record)
    setStatus('saved')
    setStepIdx(0)
    // אם כבר קיים slug שלא נגזר אוטומטית מהשם — מסמנים כ"נערך ידנית"
    slugEdited.current = !!record.slug && record.slug !== slugify(record.name)
    return () => clearTimeout(timer.current)
  }, [record.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback(async (data) => {
    setStatus('saving')
    try {
      const patch = { ...data }
      if (coverField) patch[coverField] = (data.gallery && data.gallery[0]) || null
      STRIP.forEach((k) => delete patch[k])
      await onSave(patch)
      setStatus('saved')
      return true
    } catch (e) {
      console.error(e)
      setStatus('error')
      toast.error('השמירה נכשלה — נסו שוב')
      return false
    }
  }, [onSave, coverField])

  const schedule = useCallback((next) => {
    setStatus('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(next), 1000)
  }, [commit])

  const setField = (key, val) => setForm((prev) => {
    const next = { ...prev, [key]: val }
    // מילוי אוטומטי של ה-slug מתוך השם — רק כל עוד לא נערך ידנית
    if (key === 'name' && !slugEdited.current && 'slug' in prev) next.slug = slugify(val)
    if (key === 'slug') slugEdited.current = true
    schedule(next)
    return next
  })
  const setGallery = (arr) => setForm((prev) => { const next = { ...prev, gallery: arr }; schedule(next); return next })

  // עיגול פינות הגלריה — נשמר ב-site_settings (מפת slug→רדיוס), בלי תלות בעמודת DB.
  // כך אותה תמונה יכולה להופיע עם פינות שונות בקאבר ובגלריה, וההגדרה אחת לכל הגלריה.
  const gallerySlug = form.slug || record.slug || record.id
  useEffect(() => {
    if (!gallerySlug) { setGalleryCorners(null); return }
    let on = true
    fetchSettings()
      .then((s) => {
        if (!on) return
        let map = {}
        try { map = s.project_gallery_corners ? (typeof s.project_gallery_corners === 'string' ? JSON.parse(s.project_gallery_corners) : s.project_gallery_corners) : {} } catch { map = {} }
        setGalleryCorners(map[gallerySlug] ?? null)
      })
      .catch(() => {})
    return () => { on = false }
  }, [gallerySlug])

  const saveGalleryCorners = (v) => {
    setGalleryCorners(v)
    if (!gallerySlug) return
    fetchSettings().then((s) => {
      let map = {}
      try { map = s.project_gallery_corners ? (typeof s.project_gallery_corners === 'string' ? JSON.parse(s.project_gallery_corners) : s.project_gallery_corners) : {} } catch { map = {} }
      map[gallerySlug] = v
      setSetting('project_gallery_corners', JSON.stringify(map))
        .then(() => toast.success('עיגול הפינות של הגלריה נשמר'))
        .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
    })
  }
  const saveNow = async () => { clearTimeout(timer.current); if (await commit(form)) toast.success('נשמר') }
  // X = שמירה ויציאה: מוודא שכל שינוי תלוי נשמר, ואז סוגר
  const closeNow = async () => { clearTimeout(timer.current); if (status !== 'saved') await commit(form); onClose && onClose() }

  // אזהרת יציאה כשיש שינויים שטרם נשמרו (ריענון/סגירת טאב)
  useEffect(() => {
    const handler = (e) => { if (status === 'dirty' || status === 'saving') { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status])

  // קיצורי מקלדת: Esc = שמירה ויציאה · Ctrl/⌘+S = שמירה מיידית
  const actionRef = useRef({})
  actionRef.current = { closeNow, saveNow }
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); actionRef.current.closeNow() }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); actionRef.current.saveNow() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const uploadDevLogo = async (arr, i, file) => {
    if (!file) return
    try { const url = await uploadMedia(file, `${folder}/developers`); setField('developers', arr.map((d, j) => (j === i ? { ...d, logo: url } : d))) }
    catch (e) { toast.error('שגיאה בהעלאה: ' + (e.message || e)) }
  }

  // העלאת תמונה בודדת לשדה כלשהו; מחזירה את ה-URL דרך callback
  const uploadOne = async (sub, file, onUrl) => {
    if (!file) return
    try { onUrl(await uploadMedia(file, `${folder}/${sub}`)) }
    catch (e) { toast.error('שגיאה בהעלאה: ' + (e.message || e)) }
  }

  // החלת עריכת תמונת הסביבה (חיתוך/כיוון לרוחב-לאורך) — מעלה את הקובץ ומעדכן
  const applyEnvEdit = async (blob) => {
    if (!envEdit) return
    try {
      const file = new File([blob], `env-${Date.now()}.webp`, { type: blob.type || 'image/webp' })
      const url = await uploadMedia(file, `${folder}/environment`)
      setField(envEdit.key, { ...(form[envEdit.key] || {}), image: url })
      setEnvEdit(null)
      toast.success('התמונה עודכנה')
    } catch (e) { toast.error('שגיאה בשמירת העריכה: ' + (e.message || e)) }
  }

  // העלאת קובץ וידאו (מהמחשב/נייד) — Cloudinary אם מוגדר, אחרת אחסון Supabase
  const uploadVid = async (key, i, file) => {
    if (!file) return
    setVidUp(i)
    try {
      const url = await uploadVideoFile(file, `${folder}/videos`)
      setForm((prev) => {
        const list = Array.isArray(prev[key]) ? prev[key] : []
        const next = { ...prev, [key]: list.map((d, j) => (j === i ? { ...d, type: 'file', src: url } : d)) }
        schedule(next)
        return next
      })
    } catch (e) { toast.error('שגיאה בהעלאה: ' + (e.message || e)) } finally { setVidUp(-1) }
  }

  const renderField = (f) => {
    const v = form[f.key]
    if (f.type === 'textarea')
      return <textarea dir={f.dir || 'auto'} value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} rows={4} />
    if (f.type === 'image') {
      return (
        <ResponsiveImageField
          value={v}
          folder={folder}
          surfaceLabel={f.surfaceLabel || f.label}
          desktopAspect={f.aspectDesktop || '4 / 3'}
          mobileAspect={f.aspectMobile || '4 / 5'}
          breakpoints={f.breakpoints || ['desktop', 'mobile']}
          allowOrientation={!!f.allowOrientation}
          onChange={(val) => setField(f.key, val ? JSON.stringify(val) : null)}
        />
      )
    }
    if (f.type === 'number')
      return <input type="number" dir="ltr" value={v ?? ''} onChange={(e) => setField(f.key, e.target.value === '' ? null : Number(e.target.value))} />
    if (f.type === 'developers') {
      const arr = Array.isArray(v) ? v : []
      const upd = (i, patch) => setField(f.key, arr.map((d, j) => (j === i ? { ...d, ...patch } : d)))
      return (
        <div className="ed__devs">
          {arr.length === 0 && <p className="ed__devs-empty">עדיין אין יזמים. הוסיפו את הגוף הראשון שמקים את הפרויקט.</p>}
          {arr.map((d, i) => (
            <div className="ed__dev" key={i}>
              <div className="ed__dev-logo">
                {d.logo ? <img src={d.logo} alt={d.name || ''} /> : <span className="ed__dev-logo-empty">אין לוגו</span>}
                <label className="ed__dev-upload">
                  {d.logo ? 'החלפת לוגו' : 'העלאת לוגו'}
                  <input type="file" accept="image/*" hidden onChange={(e) => uploadDevLogo(arr, i, e.target.files[0])} />
                </label>
              </div>
              <div className="ed__dev-fields">
                <input dir="rtl" value={d.name || ''} placeholder="שם היזם (למשל: קבוצת תדהר)" onChange={(e) => upd(i, { name: e.target.value })} />
                <textarea dir="rtl" rows={3} value={d.bio || ''} placeholder="טקסט קצר על היזם" onChange={(e) => upd(i, { bio: e.target.value })} />
              </div>
              <button type="button" className="ed__dev-del" onClick={() => setField(f.key, arr.filter((_, j) => j !== i))} aria-label="מחיקת יזם" title="מחיקה"><XIcon width={16} height={16} /></button>
            </div>
          ))}
          <button type="button" className="ed__dev-add" onClick={() => setField(f.key, [...arr, { name: '', logo: '', bio: '' }])}>+ הוסף יזם</button>
        </div>
      )
    }
    if (f.type === 'video') {
      const obj = v && typeof v === 'object' ? v : {}
      return (
        <input
          type="text" dir="ltr" placeholder="מזהה YouTube (למשל dQw4w9WgXcQ)"
          value={obj.id || ''}
          onChange={(e) => { const id = e.target.value.trim(); setField(f.key, id ? { type: 'youtube', id } : {}) }}
        />
      )
    }
    if (f.type === 'videos') {
      const arr = Array.isArray(v) ? v : []
      const upd = (i, patch) => setField(f.key, arr.map((d, j) => (j === i ? { ...d, ...patch } : d)))
      return (
        <div className="ed__list">
          {arr.length === 0 && <p className="ed__devs-empty">אין סרטונים. הוסיפו 3–5 סרטונים (YouTube או קובץ).</p>}
          {arr.map((vid, i) => {
            const type = vid.type || 'youtube'
            return (
              <div className="ed__vid" key={i}>
                <select value={type} onChange={(e) => upd(i, { type: e.target.value })}>
                  <option value="youtube">YouTube</option>
                  <option value="file">קובץ</option>
                </select>
                {type === 'youtube'
                  ? <input dir="ltr" placeholder="מזהה YouTube (למשל dQw4w9WgXcQ)" value={vid.id || ''} onChange={(e) => upd(i, { id: e.target.value.trim() })} />
                  : <input dir="ltr" placeholder="כתובת קובץ וידאו (mp4)" value={vid.src || ''} onChange={(e) => upd(i, { src: e.target.value.trim() })} />}
                <input dir="rtl" placeholder="כותרת (אופציונלי)" value={vid.title || ''} onChange={(e) => upd(i, { title: e.target.value })} />
                {type === 'file' && (
                  <>
                    <label className="ed__dev-upload">
                      {vidUp === i ? 'מעלה…' : (vid.src ? 'החלפת קובץ' : 'העלאה מהמחשב/נייד')}
                      <input type="file" accept="video/*" hidden disabled={vidUp === i} onChange={(e) => uploadVid(f.key, i, e.target.files[0])} />
                    </label>
                    {vid.src && <span className="ed__vid-ok">✓ הועלה ({hasCloudinary ? 'Cloudinary' : 'שרת'})</span>}
                  </>
                )}
                <button type="button" className="ed__dev-del" onClick={() => setField(f.key, arr.filter((_, j) => j !== i))} aria-label="מחיקת סרטון" title="מחיקה"><XIcon width={16} height={16} /></button>
              </div>
            )
          })}
          <button type="button" className="ed__dev-add" onClick={() => setField(f.key, [...arr, { type: 'youtube', id: '', title: '' }])}>+ הוסף סרטון</button>
        </div>
      )
    }
    if (f.type === 'coords') {
      const obj = v && typeof v === 'object' ? v : {}
      const set = (k, raw) => {
        const num = raw === '' ? undefined : Number(raw)
        const next = { ...obj, [k]: num }
        if (next.lat === undefined) delete next.lat
        if (next.lng === undefined) delete next.lng
        setField(f.key, next)
      }
      return (
        <div className="ed__coords">
          <label>קו רוחב (lat)<input type="number" step="any" dir="ltr" value={obj.lat ?? ''} onChange={(e) => set('lat', e.target.value)} /></label>
          <label>קו אורך (lng)<input type="number" step="any" dir="ltr" value={obj.lng ?? ''} onChange={(e) => set('lng', e.target.value)} /></label>
        </div>
      )
    }
    if (f.type === 'environment') {
      const obj = v && typeof v === 'object' ? v : {}
      const upd = (patch) => setField(f.key, { ...obj, ...patch })
      return (
        <div className="ed__env">
          <input dir="rtl" placeholder="כותרת (למשל: בלב העיר הירוקה)" value={obj.title || ''} onChange={(e) => upd({ title: e.target.value })} />
          <textarea dir="rtl" rows={4} placeholder="טקסט על הסביבה" value={obj.text || ''} onChange={(e) => upd({ text: e.target.value })} />
          <div className="ed__env-img">
            {obj.image ? <img src={obj.image} alt="" /> : <span className="ed__dev-logo-empty">אין תמונה</span>}
            <div className="ed__env-imgactions">
              <label className="ed__dev-upload">
                {obj.image ? 'החלפת תמונה' : 'העלאת תמונה'}
                <input type="file" accept="image/*" hidden onChange={(e) => uploadOne('environment', e.target.files[0], (url) => upd({ image: url }))} />
              </label>
              {obj.image && (
                <button type="button" className="ed__dev-upload ed__env-edit" onClick={() => setEnvEdit({ key: f.key, src: obj.image })}>
                  ✎ עריכה / חיתוך / כיוון
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }
    if (f.type === 'features') {
      const arr = Array.isArray(v) ? v : []
      const upd = (i, val) => setField(f.key, arr.map((x, j) => (j === i ? val : x)))
      return (
        <div className="ed__list">
          {arr.length === 0 && <p className="ed__devs-empty">אין מאפיינים. הוסיפו את הראשון.</p>}
          {arr.map((item, i) => (
            <div className="ed__list-row" key={i}>
              <input dir="rtl" value={typeof item === 'object' ? (item.he || '') : (item || '')} placeholder="מאפיין" onChange={(e) => upd(i, e.target.value)} />
              <button type="button" className="ed__dev-del" onClick={() => setField(f.key, arr.filter((_, j) => j !== i))} aria-label="מחיקה" title="מחיקה"><XIcon width={16} height={16} /></button>
            </div>
          ))}
          <button type="button" className="ed__dev-add" onClick={() => setField(f.key, [...arr, ''])}>+ הוסף מאפיין</button>
        </div>
      )
    }
    if (f.type === 'stat_cubes') {
      return <StatCubesField value={v} onChange={(arr) => setField(f.key, arr)} row={!!form.stat_cubes_row} />
    }
    if (f.type === 'plan_groups') {
      const groups = Array.isArray(v) ? v : []
      const updG = (gi, patch) => setField(f.key, groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)))
      const updPlans = (gi, plans) => updG(gi, { plans })
      return (
        <div className="ed__groups">
          {groups.length === 0 && <p className="ed__devs-empty">אין קבוצות תוכניות. הוסיפו קבוצה לפי מספר חדרים.</p>}
          {groups.map((g, gi) => {
            const plans = Array.isArray(g.plans) ? g.plans : []
            const updPlan = (pi, patch) => updPlans(gi, plans.map((p, j) => (j === pi ? { ...p, ...patch } : p)))
            return (
              <div className="ed__group" key={gi}>
                <div className="ed__group-head">
                  <input type="number" dir="ltr" style={{ maxWidth: 90 }} placeholder="חדרים" value={g.rooms ?? ''} onChange={(e) => updG(gi, { rooms: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input dir="rtl" placeholder="כותרת הקבוצה (למשל: דירות 3 חדרים)" value={typeof g.label === 'object' ? (g.label.he || '') : (g.label || '')} onChange={(e) => updG(gi, { label: e.target.value })} />
                  <button type="button" className="ed__dev-del" onClick={() => setField(f.key, groups.filter((_, j) => j !== gi))} aria-label="מחיקת קבוצה" title="מחיקת קבוצה"><XIcon width={16} height={16} /></button>
                </div>
                <div className="ed__plans">
                  {plans.map((p, pi) => (
                    <div className="ed__plan" key={pi}>
                      <div className="ed__env-img">
                        {p.img ? <img src={p.img} alt="" /> : <span className="ed__dev-logo-empty">אין תשריט</span>}
                        <label className="ed__dev-upload">
                          {p.img ? 'החלפה' : 'העלאת תשריט'}
                          <input type="file" accept="image/*" hidden onChange={(e) => uploadOne('plans', e.target.files[0], (url) => updPlan(pi, { img: url }))} />
                        </label>
                      </div>
                      <input dir="rtl" placeholder="כותרת התשריט (למשל: דגם A)" value={typeof p.label === 'object' ? (p.label.he || '') : (p.label || '')} onChange={(e) => updPlan(pi, { label: e.target.value })} />
                      <button type="button" className="ed__dev-del" onClick={() => updPlans(gi, plans.filter((_, j) => j !== pi))} aria-label="מחיקת תשריט" title="מחיקה"><XIcon width={16} height={16} /></button>
                    </div>
                  ))}
                  <button type="button" className="ed__dev-add" onClick={() => updPlans(gi, [...plans, { label: '', img: '' }])}>+ הוסף תשריט</button>
                </div>
              </div>
            )
          })}
          <button type="button" className="ed__dev-add" onClick={() => setField(f.key, [...groups, { rooms: null, label: '', plans: [] }])}>+ הוסף קבוצת חדרים</button>
        </div>
      )
    }
    if (f.type === 'gallery_groups') {
      const groups = Array.isArray(v) ? v : []
      const updG = (gi, patch) => setField(f.key, groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)))
      return (
        <div className="ed__groups">
          {groups.length === 0 && <p className="ed__devs-empty">אין קטגוריות. ריק = גלריה אחת רגילה לפי התמונות למטה.</p>}
          {groups.map((g, gi) => (
            <div className="ed__group" key={gi}>
              <div className="ed__group-head">
                <input dir="rtl" placeholder="שם הקטגוריה (למשל: הדמיות פנים)" value={typeof g.label === 'object' ? (g.label.he || '') : (g.label || '')} onChange={(e) => updG(gi, { label: e.target.value })} />
                <button type="button" className="ed__dev-del" onClick={() => setField(f.key, groups.filter((_, j) => j !== gi))} aria-label="מחיקת קטגוריה" title="מחיקת קטגוריה"><XIcon width={16} height={16} /></button>
              </div>
              <ImageManager value={Array.isArray(g.images) ? g.images : []} onChange={(imgs) => updG(gi, { images: imgs })} folder={`${folder}/gallery`} max={20} />
            </div>
          ))}
          <button type="button" className="ed__dev-add" onClick={() => setField(f.key, [...groups, { label: '', images: [] }])}>+ הוסף קטגוריה</button>
        </div>
      )
    }
    if (f.type === 'select')
      return (
        <select value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    if (f.type === 'select_text')
      return <SelectText value={v} options={f.options} onChange={(val) => setField(f.key, val)} />
    if (f.type === 'related_projects')
      return <RelatedProjectsField value={v} currentSlug={form.slug || record.slug} onChange={(val) => setField(f.key, val)} />
    // מונה + תווית נבחרת מרשימה (במקום שדה נפרד): מספר + dropdown שמחליף את הכיתוב
    if (f.type === 'count_label')
      return (
        <div className="ed__countlabel">
          <input
            type="number" inputMode="numeric" min="0" placeholder="מספר"
            value={v ?? ''}
            onChange={(e) => setField(f.key, e.target.value === '' ? null : Number(e.target.value))}
          />
          <SelectText value={form[f.labelKey]} options={f.options} onChange={(val) => setField(f.labelKey, val)} />
        </div>
      )
    if (f.type === 'multiselect') {
      // v עשוי להגיע כמערך או כמחרוזת JSON (סכמת DB ישנה) — מנרמלים למערך כדי
      // שהבחירות הקיימות (כמו "פרויקטים נבחרים") יוצגו ויישמרו תקין
      const arr = Array.isArray(v)
        ? v
        : (typeof v === 'string' && v.trim()
            ? (() => { try { const a = JSON.parse(v); return Array.isArray(a) ? a : [] } catch { return v.split(',').map((x) => x.trim()).filter(Boolean) } })()
            : [])
      const toggle = (val) =>
        setField(f.key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
      return (
        <div className="ed__chips" role="group">
          {f.options.map((o) => {
            const on = arr.includes(o.value)
            return (
              <button
                type="button"
                key={o.value}
                className={`ed__chip ${on ? 'ed__chip--on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(o.value)}
                title={o.hint || ''}
              >
                <span className="ed__chip-check" aria-hidden="true">{on ? '✓' : '+'}</span>
                {o.label}
              </button>
            )
          })}
        </div>
      )
    }
    if (f.type === 'bool')
      return (
        <label className="ed__switch">
          <input type="checkbox" checked={!!v} onChange={(e) => setField(f.key, e.target.checked)} />
          <span />
        </label>
      )
    return <input type="text" dir={f.dir || 'auto'} value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
  }

  // רשימת השדות החסרים (חובה אך ריקים) — לסיכום "מה חסר" ולחיווי בצעדים
  const missing = useMemo(() => {
    const out = []
    for (const sec of schema)
      for (const f of sec.fields)
        if (f.required && isEmpty(form[f.key])) out.push({ key: f.key, label: f.label })
    return out
  }, [schema, form])
  const missingKeys = useMemo(() => new Set(missing.map((m) => m.key)), [missing])

  const fieldWide = (t) => ['textarea', 'multiselect', 'related_projects', 'developers', 'environment', 'plan_groups', 'gallery_groups', 'features', 'coords', 'videos', 'stat_cubes'].includes(t)

  // רינדור מקטע שדות יחיד (משותף לתצוגה הרגילה ולאשף)
  const renderSection = (sec) => (
    <fieldset className="ed__section" key={sec.section}>
      <legend>{sec.section}</legend>
      <div className="ed__grid">
        {sec.fields.map((f) => {
          const invalid = f.required && missingKeys.has(f.key)
          return (
            <div className={`ed__field ${fieldWide(f.type) ? 'ed__field--wide' : ''} ${f.type === 'bool' ? 'ed__field--bool' : ''} ${invalid ? 'ed__field--invalid' : ''}`} key={f.key}>
              <label>{f.label}{f.required && <span className="ed__req">*</span>}</label>
              {renderField(f)}
              {invalid && <small className="ed__error">שדה חובה — נא למלא</small>}
              {f.hint && <small className="ed__hint">{f.hint}</small>}
            </div>
          )
        })}
      </div>
    </fieldset>
  )

  const gallerySection = (
    <fieldset className="ed__section" key={GALLERY_STEP}>
      <legend>מדיה (תמונות)</legend>
      <ImageManager
        value={form.gallery || []}
        onChange={setGallery}
        folder={folder}
        max={20}
        corners={galleryCorners}
        onCornersChange={gallerySlug ? saveGalleryCorners : null}
      />
    </fieldset>
  )

  // מפת מקטע→תוכן (לפי שם המקטע, או GALLERY_STEP לגלריה)
  const sectionsByName = {}
  schema.forEach((sec) => { sectionsByName[sec.section] = renderSection(sec) })
  sectionsByName[GALLERY_STEP] = gallerySection

  const header = (
    <div className="ed__top">
      <div className="ed__heading">
        <h3 className="ed__title">{title}</h3>
        <StatusPill status={status} />
      </div>
      <div className="ed__actions">
        {previewUrl && (
          <a className="ed__preview" href={previewUrl} target="_blank" rel="noopener noreferrer" title="צפייה בדף הציבורי">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
            צפייה בדף
          </a>
        )}
        {onArchive && <button type="button" className="ed__archive" onClick={onArchive}>העברה לארכיון</button>}
        <button type="button" className="btn btn--primary ed__save" disabled={status === 'saved' || status === 'saving'} onClick={saveNow}>שמירה</button>
        {onClose && (
          <button type="button" className="ed__close" onClick={closeNow} aria-label="שמירה ויציאה" title="שמירה ויציאה">
            <XIcon width={20} height={20} />
          </button>
        )}
      </div>
    </div>
  )

  // ---------- תצוגה רגילה (ללא אשף) — נכסים וכו' ----------
  if (!steps || !steps.length) {
    return (
      <div className="ed">
        {header}
        {schema.map(renderSection)}
        {gallerySection}
        {envEdit && <ImageEditor src={envEdit.src} onApply={applyEnvEdit} onClose={() => setEnvEdit(null)} />}
      </div>
    )
  }

  // ---------- אשף רב-שלבי ----------
  // רשת ביטחון: מקטעים בסכימה שלא שובצו לאף שלב יתווספו לשלב הלא-סקירה הראשון,
  // כדי שתוספת מקטע עתידית לא "תיעלם" מהטופס.
  const assigned = new Set(steps.flatMap((s) => s.sections || []))
  const orphans = schema.map((sec) => sec.section).filter((name) => !assigned.has(name))
  const wizardSteps = orphans.length
    ? steps.map((s) => (!s.review && s === steps.find((x) => !x.review)
        ? { ...s, sections: [...(s.sections || []), ...orphans] } : s))
    : steps

  const clampIdx = Math.min(stepIdx, wizardSteps.length - 1)
  const step = wizardSteps[clampIdx]
  const isReview = step.review
  const isLast = clampIdx === wizardSteps.length - 1
  const goStep = (i) => setStepIdx(Math.max(0, Math.min(wizardSteps.length - 1, i)))

  return (
    <div className="ed ed--wizard">
      {header}

      {/* מחוון צעדים — לחיץ לקפיצה בין שלבים */}
      <ol className="ed__steps" role="tablist" aria-label="שלבי עריכת הפרויקט">
        {wizardSteps.map((s, i) => {
          const done = i < clampIdx
          const active = i === clampIdx
          // חיווי "חסר" על שלב שמכיל שדות חובה ריקים
          const stepMissing = (s.sections || []).some((name) =>
            (schema.find((sec) => sec.section === name)?.fields || []).some((f) => f.required && missingKeys.has(f.key))
          )
          return (
            <li key={s.label} className={`ed__step ${active ? 'ed__step--active' : ''} ${done ? 'ed__step--done' : ''}`}>
              <button type="button" role="tab" aria-selected={active} className="ed__step-btn" onClick={() => goStep(i)}>
                <span className="ed__step-num">{done ? '✓' : i + 1}</span>
                <span className="ed__step-label">{s.label}</span>
                {stepMissing && !s.review && <span className="ed__step-dot" title="יש שדות חובה חסרים" aria-label="חסר">!</span>}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="ed__step-body">
        {isReview ? (
          <div className="ed__review">
            <fieldset className="ed__section ed__summary">
              <legend>{missing.length ? 'מה חסר לפני פרסום' : 'הכול מוכן לפרסום'}</legend>
              {missing.length ? (
                <ul className="ed__missing">
                  {missing.map((m) => <li key={m.key}>{m.label}</li>)}
                </ul>
              ) : (
                <p className="ed__ok">כל שדות החובה מולאו. ניתן לפרסם את הפרויקט. ✓</p>
              )}
              <label className="ed__publish">
                <span>מפורסם באתר</span>
                <span className="ed__switch">
                  <input type="checkbox" checked={!!form.is_published} disabled={missing.length > 0}
                    onChange={(e) => setField('is_published', e.target.checked)} />
                  <span />
                </span>
              </label>
              {missing.length > 0 && <small className="ed__hint">יש להשלים את שדות החובה לפני פרסום.</small>}
            </fieldset>

            <fieldset className="ed__section ed__previewbox">
              <legend>תצוגה מקדימה</legend>
              <ProjectPreview form={form} />
            </fieldset>
          </div>
        ) : (
          (step.sections || []).map((name) => sectionsByName[name]).filter(Boolean)
        )}
      </div>

      {/* ניווט בין שלבים */}
      <div className="ed__nav">
        <button type="button" className="ed__nav-btn" disabled={clampIdx === 0} onClick={() => goStep(clampIdx - 1)}>
          → הקודם
        </button>
        <span className="ed__nav-count">שלב {clampIdx + 1} מתוך {wizardSteps.length}</span>
        {!isLast && (
          <button type="button" className="btn btn--primary ed__nav-btn ed__nav-next" onClick={() => goStep(clampIdx + 1)}>
            הבא ←
          </button>
        )}
      </div>

      {envEdit && <ImageEditor src={envEdit.src} onApply={applyEnvEdit} onClose={() => setEnvEdit(null)} />}
    </div>
  )
}
