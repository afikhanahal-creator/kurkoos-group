import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ============================================================
   StatCubesField — עורך קוביות נתונים למערכת ה-CMS.
   כל קוביה: value (ערך) · label דו-לשוני · size (גודל/מראה).
   • תצוגה חיה שניתן לגרור בה את הקוביות לרוחב (אחת אחרי השנייה),
     בדיוק כפי שיופיעו בבאנר — עם מתג דסקטופ/מובייל.
   • שורות עריכה למטה (טקסט/גודל/מחיקה) עם גרירה אנכית.
   value="" + label="" → לא יוצג.
   ============================================================ */

const SIZES = [
  { value: 'sm', label: 'קטן' },
  { value: 'md', label: 'רגיל' },
  { value: 'lg', label: 'גדול ובולט' },
  { value: 'wide', label: 'רחב (טקסט)' },
]

const DragIcon = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...p}>
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
)
const XIcon = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
)

const clampW = (v) => Math.max(0.6, Math.min(3.2, Math.round(v * 10) / 10))

/* קוביה בתצוגה החיה — היא עצמה ידית הגרירה (גוררים את מה שרואים) */
function PvCube({ id, cube }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const size = cube.size || 'md'
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 5 : 'auto',
    ...(cube.w ? { paddingInline: `${cube.w}rem` } : {}),
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cubed__pv cubed__pv--${size} ${cube.spread ? 'cubed__pv--spread' : ''} ${isDragging ? 'cubed__pv--drag' : ''}`}
      {...attributes}
      {...listeners}
      title="גררו לסידור"
    >
      <span className="cubed__pv-val" dir={size === 'wide' ? 'auto' : 'ltr'}>{cube.value || '—'}</span>
      <span className="cubed__pv-lbl">{cube.label?.he || ''}</span>
    </div>
  )
}

function CubeRow({ id, cube, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="cubed__row">
      <button type="button" className="cubed__handle" {...attributes} {...listeners} aria-label="גרור לסידור">
        <DragIcon />
      </button>
      <div className="cubed__row-main">
        {/* שדות עם תוויות — ברורים וקריאים */}
        <div className="cubed__fields">
          <label className="cubed__f cubed__f--val">
            <span>ערך</span>
            <input value={cube.value || ''} placeholder="96 / בשיווק" onChange={(e) => onChange({ value: e.target.value })} />
          </label>
          <label className="cubed__f">
            <span>תווית (עברית)</span>
            <input value={cube.label?.he || ''} placeholder="דירות" onChange={(e) => onChange({ label: { ...(cube.label || {}), he: e.target.value } })} />
          </label>
          <label className="cubed__f">
            <span>Label (EN)</span>
            <input dir="ltr" value={cube.label?.en || ''} placeholder="Units" onChange={(e) => onChange({ label: { ...(cube.label || {}), en: e.target.value } })} />
          </label>
          <label className="cubed__f">
            <span>גודל</span>
            <select value={cube.size || 'md'} onChange={(e) => onChange({ size: e.target.value })}>
              {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
        {/* פקדים — רוחב הקוביה + הצמדת טקסט */}
        <div className="cubed__row-ctrls">
          <span className="cubed__w" title="רוחב הקוביה">
            <button type="button" onClick={() => onChange({ w: clampW((cube.w ?? 1.1) - 0.3) })} aria-label="הקטן רוחב">−</button>
            <span className="cubed__w-lbl">רוחב</span>
            <button type="button" onClick={() => onChange({ w: clampW((cube.w ?? 1.1) + 0.3) })} aria-label="הגדל רוחב">+</button>
          </span>
          <button
            type="button"
            className={`cubed__spread ${cube.spread ? 'is-on' : ''}`}
            onClick={() => onChange({ spread: !cube.spread })}
            title="הצמדת הכיתוב לפאות הקוביה"
            aria-pressed={!!cube.spread}
          >⇕ הצמד טקסט</button>
        </div>
      </div>
      <button type="button" className="cubed__del" onClick={onDelete} aria-label="הסר קוביה">
        <XIcon />
      </button>
    </div>
  )
}

export default function StatCubesField({ value, onChange, row = false }) {
  const cubes = Array.isArray(value) ? value : []
  const [device, setDevice] = useState('desktop')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = cubes.map((_, i) => `cube-${i}`)

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldI = ids.indexOf(active.id)
    const newI = ids.indexOf(over.id)
    if (oldI !== -1 && newI !== -1) onChange(arrayMove(cubes, oldI, newI))
  }
  const upd = (i, patch) => onChange(cubes.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const del = (i) => onChange(cubes.filter((_, j) => j !== i))
  const add = () => onChange([...cubes, { value: '', label: { he: '', en: '' }, size: 'md' }])

  return (
    <div className="cubed">
      {/* ===== תצוגה חיה הניתנת לגרירה ===== */}
      <div className="cubed__pvbar">
        <span className="cubed__pvbar-title">תצוגה חיה — גררו את הקוביות לסידור</span>
        <div className="cubed__devtoggle" role="group" aria-label="תצוגת מכשיר">
          <button type="button" className={device === 'desktop' ? 'is-active' : ''} onClick={() => setDevice('desktop')}>דסקטופ</button>
          <button type="button" className={device === 'mobile' ? 'is-active' : ''} onClick={() => setDevice('mobile')}>מובייל</button>
        </div>
      </div>
      <div className={`cubed__preview-wrap cubed__preview-wrap--${device}`}>
        <div className={`cubed__preview ${row ? 'cubed__preview--row' : ''}`} dir="rtl" aria-label="תצוגה חיה">
          {cubes.length === 0 ? (
            <span className="cubed__preview-empty">תצוגה חיה — הוסיפו קוביה כדי לראות אותה כאן בדיוק כפי שתופיע בבאנר הפרויקט. גררו את הקוביות לסידור.</span>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                {cubes.map((cube, i) => <PvCube key={ids[i]} id={ids[i]} cube={cube} />)}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* ===== שורות עריכה ===== */}
      {cubes.length === 0 && (
        <p className="cubed__empty">אין קוביות מותאמות — מוצגות קוביות ברירת המחדל (בניינים/דיור/קומות/אדריכלים/סטטוס). הוסיפו קוביה כדי לשלוט במלל, בגודל ובסדר.</p>
      )}
      {cubes.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="cubed__list">
              {cubes.map((cube, i) => (
                <CubeRow key={ids[i]} id={ids[i]} cube={cube} onChange={(patch) => upd(i, patch)} onDelete={() => del(i)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <button type="button" className="cubed__add" onClick={add}>+ הוסף קוביה</button>
    </div>
  )
}
