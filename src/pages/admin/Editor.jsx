import { useEffect, useRef, useState, useCallback } from 'react'
import ImageManager from './ImageManager.jsx'
import { uploadMedia } from '../../lib/cms.js'

const STRIP = ['id', 'created_at', 'updated_at']

const XIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>

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

export default function Editor({ schema, record, onSave, folder = 'general', coverField = null, onArchive, onClose, title }) {
  const [form, setForm] = useState(record)
  const [status, setStatus] = useState('saved')
  const timer = useRef()

  useEffect(() => {
    setForm(record)
    setStatus('saved')
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
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }, [onSave, coverField])

  const schedule = useCallback((next) => {
    setStatus('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(next), 1000)
  }, [commit])

  const setField = (key, val) => setForm((prev) => { const next = { ...prev, [key]: val }; schedule(next); return next })
  const setGallery = (arr) => setForm((prev) => { const next = { ...prev, gallery: arr }; schedule(next); return next })
  const saveNow = () => { clearTimeout(timer.current); commit(form) }
  // X = שמירה ויציאה: מוודא שכל שינוי תלוי נשמר, ואז סוגר
  const closeNow = async () => { clearTimeout(timer.current); if (status !== 'saved') await commit(form); onClose && onClose() }

  const uploadDevLogo = async (arr, i, file) => {
    if (!file) return
    try { const url = await uploadMedia(file, `${folder}/developers`); setField('developers', arr.map((d, j) => (j === i ? { ...d, logo: url } : d))) }
    catch (e) { alert('שגיאה בהעלאה: ' + (e.message || e)) }
  }

  // העלאת תמונה בודדת לשדה כלשהו; מחזירה את ה-URL דרך callback
  const uploadOne = async (sub, file, onUrl) => {
    if (!file) return
    try { onUrl(await uploadMedia(file, `${folder}/${sub}`)) }
    catch (e) { alert('שגיאה בהעלאה: ' + (e.message || e)) }
  }

  const renderField = (f) => {
    const v = form[f.key]
    if (f.type === 'textarea')
      return <textarea dir={f.dir || 'auto'} value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} rows={4} />
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
            <label className="ed__dev-upload">
              {obj.image ? 'החלפת תמונה' : 'העלאת תמונה'}
              <input type="file" accept="image/*" hidden onChange={(e) => uploadOne('environment', e.target.files[0], (url) => upd({ image: url }))} />
            </label>
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
    if (f.type === 'multiselect') {
      const arr = Array.isArray(v) ? v : []
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

  return (
    <div className="ed">
      <div className="ed__top">
        <div className="ed__heading">
          <h3 className="ed__title">{title}</h3>
          <StatusPill status={status} />
        </div>
        <div className="ed__actions">
          {onArchive && <button type="button" className="ed__archive" onClick={onArchive}>העברה לארכיון</button>}
          <button type="button" className="btn btn--primary ed__save" disabled={status === 'saved' || status === 'saving'} onClick={saveNow}>שמירה</button>
          {onClose && (
            <button type="button" className="ed__close" onClick={closeNow} aria-label="שמירה ויציאה" title="שמירה ויציאה">
              <XIcon width={20} height={20} />
            </button>
          )}
        </div>
      </div>

      {schema.map((sec) => (
        <fieldset className="ed__section" key={sec.section}>
          <legend>{sec.section}</legend>
          <div className="ed__grid">
            {sec.fields.map((f) => (
              <div className={`ed__field ${['textarea', 'multiselect', 'developers', 'environment', 'plan_groups', 'gallery_groups', 'features', 'coords'].includes(f.type) ? 'ed__field--wide' : ''} ${f.type === 'bool' ? 'ed__field--bool' : ''}`} key={f.key}>
                <label>{f.label}{f.required && <span className="ed__req">*</span>}</label>
                {renderField(f)}
                {f.hint && <small className="ed__hint">{f.hint}</small>}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="ed__section">
        <legend>מדיה (תמונות)</legend>
        <ImageManager value={form.gallery || []} onChange={setGallery} folder={folder} max={20} />
      </fieldset>
    </div>
  )
}
