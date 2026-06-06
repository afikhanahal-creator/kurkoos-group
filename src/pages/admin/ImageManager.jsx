import { useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { uploadMedia, deleteMedia } from '../../lib/cms.js'

function SortableImage({ url, index, onDelete, onCover }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`im__item ${index === 0 ? 'im__item--cover' : ''}`}>
      <img src={url} alt="" />
      <div className="im__bar">
        <button type="button" className="im__drag" {...attributes} {...listeners} title="גרור לסידור">⠿</button>
        {index !== 0 && <button type="button" className="im__cover" onClick={() => onCover(url)} title="קבע ככריכה">★</button>}
        <button type="button" className="im__del" onClick={() => onDelete(url)} title="מחק">✕</button>
      </div>
      {index === 0 && <span className="im__badge">כריכה</span>}
    </div>
  )
}

export default function ImageManager({ value = [], onChange, folder = 'general', max = 20 }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleFiles = async (files) => {
    setErr('')
    const list = Array.from(files)
    const room = max - value.length
    if (room <= 0) { setErr(`אפשר עד ${max} תמונות`); return }
    const toUpload = list.slice(0, room)
    setBusy(true)
    try {
      const urls = []
      for (const f of toUpload) {
        if (!f.type.startsWith('image/')) continue
        urls.push(await uploadMedia(f, folder))
      }
      onChange([...value, ...urls])
    } catch (e) {
      setErr('שגיאה בהעלאה: ' + (e.message || e))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (url) => {
    onChange(value.filter((u) => u !== url))
    deleteMedia(url).catch(() => {})
  }

  const handleCover = (url) => {
    onChange([url, ...value.filter((u) => u !== url)])
  }

  const onDragEnd = (e) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldI = value.indexOf(active.id)
    const newI = value.indexOf(over.id)
    onChange(arrayMove(value, oldI, newI))
  }

  return (
    <div className="im">
      <div className="im__head">
        <span>תמונות ({value.length}/{max})</span>
        <button type="button" className="btn btn--primary im__add" disabled={busy || value.length >= max} onClick={() => inputRef.current?.click()}>
          {busy ? 'מעלה…' : '+ הוסף תמונות'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {err && <p className="im__err">{err}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value} strategy={rectSortingStrategy}>
          <div className="im__grid">
            {value.map((url, i) => (
              <SortableImage key={url} url={url} index={i} onDelete={handleDelete} onCover={handleCover} />
            ))}
            {value.length === 0 && <p className="im__empty">אין תמונות עדיין. לחצי "הוסף תמונות".</p>}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
