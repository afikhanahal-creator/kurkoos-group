import { useEffect, useState, useRef, useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { listLogos, createLogo, updateLogo, deleteLogo, reorderRows, uploadMedia, deleteMedia } from '../../lib/cms.js'

function LogoCard({ logo, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: logo.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(logo.name || '')
  const [scale, setScale] = useState(Number(logo.scale) || 1)
  const [posX, setPosX] = useState(Number(logo.pos_x) || 0)
  const [posY, setPosY] = useState(Number(logo.pos_y) || 0)
  const [status, setStatus] = useState('idle') // idle | saving | saved
  const nameTimer = useRef()
  const scaleTimer = useRef()
  const posTimer = useRef()
  const drag = useRef(null)
  const savedTimer = useRef()

  // שמירה לענן (Supabase) עם חיווי סטטוס — לא לוקאלי
  const save = useCallback((patch, reload = false) => {
    setStatus('saving')
    clearTimeout(savedTimer.current)
    return updateLogo(logo.id, patch)
      .then(() => {
        setStatus('saved')
        savedTimer.current = setTimeout(() => setStatus('idle'), 1600)
        if (reload) onChange?.()
      })
      .catch((e) => { setStatus('idle'); alert('שגיאה בשמירה: ' + (e.message || e)) })
  }, [logo.id, onChange])

  const saveName = (v) => {
    setName(v); clearTimeout(nameTimer.current)
    nameTimer.current = setTimeout(() => save({ name: v }), 600)
  }

  const clamp = (v) => Math.min(2.5, Math.max(0.4, Math.round(v * 100) / 100))
  const onScale = (v) => {
    const n = clamp(v)
    setScale(n); clearTimeout(scaleTimer.current)
    scaleTimer.current = setTimeout(() => save({ scale: n }), 350)
  }

  // גרירת הלוגו בתוך המסגרת — למרכוז/סידור לוגו חתוך (אחוזי הזזה)
  const clampPos = (v) => Math.max(-120, Math.min(120, Math.round(v)))
  const onPointerDown = (e) => {
    if (!logo.image_url) return
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { sx: e.clientX, sy: e.clientY, bx: posX, by: posY, w: r.width, h: r.height, nx: posX, ny: posY }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    d.nx = clampPos(d.bx + ((e.clientX - d.sx) / d.w) * 100)
    d.ny = clampPos(d.by + ((e.clientY - d.sy) / d.h) * 100)
    setPosX(d.nx); setPosY(d.ny)
  }
  const onPointerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    clearTimeout(posTimer.current)
    posTimer.current = setTimeout(() => save({ pos_x: d.nx, pos_y: d.ny }), 200)
  }
  const recenter = () => { setPosX(0); setPosY(0); setScale(1); save({ pos_x: 0, pos_y: 0, scale: 1 }) }

  const upload = async (file) => {
    if (!file) return
    setBusy(true); setStatus('saving')
    try {
      const url = await uploadMedia(file, 'logos')
      if (logo.image_url) deleteMedia(logo.image_url).catch(() => {})
      await updateLogo(logo.id, { image_url: url })
      setStatus('saved'); savedTimer.current = setTimeout(() => setStatus('idle'), 1600)
      onChange()
    } catch (e) { setStatus('idle'); alert('שגיאה בהעלאה: ' + (e.message || e)) } finally { setBusy(false) }
  }

  const toggleActive = () => save({ is_active: !logo.is_active }, true)

  return (
    <div ref={setNodeRef} style={style} className={`lcard ${!logo.is_active ? 'lcard--off' : ''}`}>
      <button type="button" className="lcard__handle" {...attributes} {...listeners} title="גרור לסידור">⠿</button>
      <div
        className={`lcard__thumb ${logo.image_url ? 'is-draggable' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={logo.image_url ? 'גררו למרכוז הלוגו' : ''}
      >
        {logo.image_url
          ? <img src={logo.image_url} alt={logo.name} draggable={false} style={{ transform: `translate(${posX}%, ${posY}%) scale(${scale})` }} />
          : <span className="lcard__placeholder">{logo.name || 'ללא לוגו'}</span>}
        {logo.image_url && (
          <button type="button" className="lcard__recenter" onClick={recenter} title="איפוס למרכז">⌖</button>
        )}
      </div>
      <input className="lcard__name" value={name} placeholder="שם" onChange={(e) => saveName(e.target.value)} />

      {/* שליטת גודל — סליידר + כפתורי −/+ */}
      <div className="lcard__size">
        <button type="button" className="lcard__size-btn" onClick={() => onScale(scale - 0.1)} aria-label="הקטן">−</button>
        <input className="lcard__size-range" type="range" min="0.4" max="2.5" step="0.05" value={scale}
          onChange={(e) => onScale(Number(e.target.value))} aria-label="גודל הלוגו" />
        <button type="button" className="lcard__size-btn" onClick={() => onScale(scale + 0.1)} aria-label="הגדל">+</button>
        <span className="lcard__size-val">{Math.round(scale * 100)}%</span>
      </div>

      <div className="lcard__row">
        <button type="button" className="lcard__btn" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? 'מעלה…' : (logo.image_url ? 'החלף תמונה' : 'העלה תמונה')}</button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
      </div>
      <div className="lcard__row">
        <label className="lcard__toggle"><input type="checkbox" checked={!!logo.is_active} onChange={toggleActive} /> פעיל</label>
        <button type="button" className="lcard__del" onClick={() => onDelete(logo)} title="מחק">מחק ✕</button>
      </div>

      {/* שמירה ידנית + חיווי שמירה אוטומטית בענן */}
      <div className="lcard__save">
        <button type="button" className="lcard__save-btn" onClick={() => save({ name, scale, pos_x: posX, pos_y: posY })}>שמור</button>
        <span className={`lcard__status lcard__status--${status}`}>
          {status === 'saving' ? 'שומר…' : status === 'saved' ? 'נשמר בענן ✓' : 'נשמר אוטומטית'}
        </span>
      </div>
    </div>
  )
}

export default function LogosTab() {
  const [logos, setLogos] = useState([])
  const [loading, setLoading] = useState(true)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    try { setLogos(await listLogos()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const add = async () => {
    const row = await createLogo({ name: 'לוגו חדש', sort_order: logos.length, is_active: true })
    setLogos((prev) => [...prev, row])
  }
  const remove = async (logo) => {
    if (!window.confirm('למחוק את הלוגו?')) return
    await deleteLogo(logo.id, logo.image_url); setLogos((prev) => prev.filter((l) => l.id !== logo.id))
  }
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const ids = logos.map((l) => l.id)
    const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id))
    setLogos((prev) => next.map((id) => prev.find((l) => l.id === id)))
    reorderRows('site_logos', next)
  }

  return (
    <div className="ltab">
      <div className="ltab__head">
        <div>
          <h3>לוגואים (קרוסלת שותפים)</h3>
          <p className="ltab__muted">העלי לוגו לכל שותף, גררי לסידור, או הסירי. אם אין תמונה — מוצג השם כטקסט.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={add}>+ לוגו</button>
      </div>
      {loading ? <p className="ltab__muted">טוען…</p> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={logos.map((l) => l.id)} strategy={rectSortingStrategy}>
            <div className="ltab__grid">
              {logos.map((l) => <LogoCard key={l.id} logo={l} onChange={load} onDelete={remove} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
