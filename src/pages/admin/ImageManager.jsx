import { useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { uploadMedia, deleteMedia } from '../../lib/cms.js'
import ImageEditor from './ImageEditor.jsx'

function SortableImage({ url, index, onDelete, onCover, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`im__item ${index === 0 ? 'im__item--cover' : ''}`}>
      <img src={url} alt="" />
      <div className="im__bar">
        <button type="button" className="im__drag" {...attributes} {...listeners} title="גרור לסידור">⠿</button>
        <button type="button" className="im__edit" onClick={() => onEdit(url)} title="עריכה / חיתוך / כיוון">✎</button>
        {index !== 0 && <button type="button" className="im__cover" onClick={() => onCover(url)} title="קבע ככריכה">★</button>}
        <button type="button" className="im__del" onClick={() => onDelete(url)} title="מחק">✕</button>
      </div>
      {index === 0 && <span className="im__badge">כריכה</span>}
    </div>
  )
}

/* אפשרויות עיגול פינות לכלל הגלריה (הגדרה אחת לכל הגלריה) */
export const GALLERY_CORNERS = [
  { v: 0, t: 'חדות' },
  { v: 18, t: 'מעוגלות' },
  { v: 30, t: 'מעוגלות מאוד' },
]

export default function ImageManager({ value = [], onChange, folder = 'general', max = 20, corners = null, onCornersChange = null }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)  // { done, total } בזמן העלאה מרובה
  const [err, setErr] = useState('')
  const [over, setOver] = useState(false)
  const [editing, setEditing] = useState(null)   // url שנערך כרגע
  const [urlInput, setUrlInput] = useState('')   // הוספת תמונה לפי כתובת (URL)

  // הוספת תמונה לפי כתובת חיצונית — בלי העלאה (שימושי להדבקת קישור מוכן)
  const addByUrl = () => {
    setErr('')
    const u = urlInput.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) { setErr('כתובת לא תקינה — חייבת להתחיל ב-http/https'); return }
    if (value.length >= max) { setErr(`אפשר עד ${max} תמונות`); return }
    if (value.includes(u)) { setErr('התמונה כבר קיימת ברשימה'); return }
    onChange([...value, u])
    setUrlInput('')
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // החלת עריכה — מעלה תמונה חדשה ומחליפה את המקור באותו מיקום ברשימה
  const applyEdit = async (blob) => {
    if (!editing) return
    setBusy(true)
    try {
      const file = new File([blob], `img-${Date.now()}.webp`, { type: blob.type || 'image/webp' })
      const url = await uploadMedia(file, folder)
      onChange(value.map((u) => (u === editing ? url : u)))
      deleteMedia(editing).catch(() => {})
      setEditing(null)
    } catch (e) { setErr('שגיאה בשמירת העריכה: ' + (e.message || e)) } finally { setBusy(false) }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files)
  }

  const handleFiles = async (files) => {
    setErr('')
    const list = Array.from(files)
    const room = max - value.length
    if (room <= 0) { setErr(`אפשר עד ${max} תמונות`); return }
    const toUpload = list.slice(0, room).filter((f) => f.type.startsWith('image/'))
    if (list.length > toUpload.length && list.length > room) setErr(`אפשר עד ${max} תמונות — חלק לא נוספו`)
    if (toUpload.length === 0) return
    setBusy(true)
    setProgress({ done: 0, total: toUpload.length })
    try {
      const urls = []
      for (const f of toUpload) {
        urls.push(await uploadMedia(f, folder))
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
      }
      onChange([...value, ...urls])
    } catch (e) {
      setErr('שגיאה בהעלאה: ' + (e.message || e))
    } finally {
      setBusy(false)
      setProgress(null)
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
    <div
      className={`im ${over ? 'im--over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setOver(false) }}
      onDrop={onDrop}
    >
      <div className="im__head">
        <span>תמונות ({value.length}/{max})</span>
        {onCornersChange && (
          <div className="im__corners" role="group" aria-label="עיגול פינות התמונות בגלריה">
            <span className="im__corners-lbl">פינות:</span>
            {GALLERY_CORNERS.map((o) => (
              <button
                key={o.v}
                type="button"
                className={`im__corner ${Number(corners ?? 18) === o.v ? 'is-active' : ''}`}
                onClick={() => onCornersChange(o.v)}
              >
                {o.t}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="btn btn--primary im__add" disabled={busy || value.length >= max} onClick={() => inputRef.current?.click()}>
          {busy ? (progress ? `מעלה ${progress.done}/${progress.total}…` : 'מעלה…') : '+ הוסף תמונות'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
      <div className="im__url">
        <input
          type="url"
          className="im__url-input"
          placeholder="או הדביקו כתובת תמונה (URL) והקישו Enter…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addByUrl() } }}
          disabled={busy || value.length >= max}
        />
        <button type="button" className="im__url-add" onClick={addByUrl} disabled={busy || !urlInput.trim() || value.length >= max}>
          הוסף קישור
        </button>
      </div>
      {progress && (
        <div className="im__progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
        </div>
      )}
      {err && <p className="im__err">{err}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value} strategy={rectSortingStrategy}>
          <div className="im__grid">
            {value.map((url, i) => (
              <SortableImage key={url} url={url} index={i} onDelete={handleDelete} onCover={handleCover} onEdit={setEditing} />
            ))}
            {value.length === 0 && (
              <button type="button" className="im__empty im__dropzone" onClick={() => inputRef.current?.click()}>
                <span className="im__dropzone-ic" aria-hidden="true">↑</span>
                <strong>גררו לכאן תמונות או לחצו להעלאה</strong>
                <small>PNG · JPG · WEBP — עד {max} תמונות. הראשונה תהיה תמונת השער.</small>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {over && <div className="im__overlay" aria-hidden="true"><span>שחררו כדי להעלות</span></div>}
      {editing && <ImageEditor src={editing} busy={busy} onApply={applyEdit} onClose={() => setEditing(null)} />}
    </div>
  )
}
