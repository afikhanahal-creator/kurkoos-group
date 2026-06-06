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
  const timer = useRef()

  const saveName = (v) => {
    setName(v); clearTimeout(timer.current)
    timer.current = setTimeout(() => updateLogo(logo.id, { name: v }).then(() => onChange()), 700)
  }

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadMedia(file, 'logos')
      if (logo.image_url) deleteMedia(logo.image_url).catch(() => {})
      await updateLogo(logo.id, { image_url: url }); onChange()
    } catch (e) { alert('שגיאה בהעלאה: ' + (e.message || e)) } finally { setBusy(false) }
  }

  const toggleActive = async () => { await updateLogo(logo.id, { is_active: !logo.is_active }); onChange() }

  return (
    <div ref={setNodeRef} style={style} className={`lcard ${!logo.is_active ? 'lcard--off' : ''}`}>
      <button type="button" className="lcard__handle" {...attributes} {...listeners} title="גרור לסידור">⠿</button>
      <div className="lcard__thumb">
        {logo.image_url ? <img src={logo.image_url} alt={logo.name} /> : <span className="lcard__placeholder">{logo.name || 'ללא לוגו'}</span>}
      </div>
      <input className="lcard__name" value={name} placeholder="שם" onChange={(e) => saveName(e.target.value)} />
      <div className="lcard__row">
        <button type="button" className="lcard__btn" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? 'מעלה…' : (logo.image_url ? 'החלף תמונה' : 'העלה תמונה')}</button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
      </div>
      <div className="lcard__row">
        <label className="lcard__toggle"><input type="checkbox" checked={!!logo.is_active} onChange={toggleActive} /> פעיל</label>
        <button type="button" className="lcard__del" onClick={() => onDelete(logo)} title="מחק">מחק ✕</button>
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
