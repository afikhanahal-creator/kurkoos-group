import { useEffect, useRef, useState, useCallback } from 'react'
import ImageManager from './ImageManager.jsx'

const STRIP = ['id', 'created_at', 'updated_at']

function StatusPill({ status }) {
  const map = {
    saved: { t: 'נשמר ✓', c: 'ok' },
    dirty: { t: 'שינויים לא שמורים', c: 'dirty' },
    saving: { t: 'שומר…', c: 'saving' },
    error: { t: 'שגיאת שמירה', c: 'error' },
  }
  const s = map[status] || map.saved
  return <span className={`ed__status ed__status--${s.c}`}>{s.t}</span>
}

export default function Editor({ schema, record, onSave, folder = 'general', coverField = null, onArchive, title }) {
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

  const renderField = (f) => {
    const v = form[f.key]
    if (f.type === 'textarea')
      return <textarea value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} rows={4} />
    if (f.type === 'number')
      return <input type="number" value={v ?? ''} onChange={(e) => setField(f.key, e.target.value === '' ? null : Number(e.target.value))} />
    if (f.type === 'select')
      return (
        <select value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    if (f.type === 'bool')
      return (
        <label className="ed__switch">
          <input type="checkbox" checked={!!v} onChange={(e) => setField(f.key, e.target.checked)} />
          <span />
        </label>
      )
    return <input type="text" value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
  }

  return (
    <div className="ed">
      <div className="ed__top">
        <h3 className="ed__title">{title}</h3>
        <div className="ed__actions">
          <StatusPill status={status} />
          <button type="button" className="btn btn--primary" disabled={status === 'saved' || status === 'saving'} onClick={saveNow}>שמירה</button>
          {onArchive && <button type="button" className="ed__archive" onClick={onArchive}>העברה לארכיון</button>}
        </div>
      </div>

      {schema.map((sec) => (
        <fieldset className="ed__section" key={sec.section}>
          <legend>{sec.section}</legend>
          <div className="ed__grid">
            {sec.fields.map((f) => (
              <div className={`ed__field ${f.type === 'textarea' ? 'ed__field--wide' : ''} ${f.type === 'bool' ? 'ed__field--bool' : ''}`} key={f.key}>
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
