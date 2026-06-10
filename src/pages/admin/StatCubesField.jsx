import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ============================================================
   StatCubesField — עורך קוביות נתונים (drag & drop) למערכת ה-CMS.
   כל קוביה: value (ערך) · label דו-לשוני · size (גודל/מראה).
   גרירה לסידור · הוספה/הסרה · עריכה חיה. value="" + label="" → לא יוצג.
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

function CubeRow({ id, cube, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="cubed__row">
      <button type="button" className="cubed__handle" {...attributes} {...listeners} aria-label="גרור לסידור">
        <DragIcon />
      </button>
      <input
        className="cubed__field cubed__field--val"
        value={cube.value || ''}
        placeholder="ערך (96 / BLK / בשיווק)"
        onChange={(e) => onChange({ value: e.target.value })}
      />
      <input
        className="cubed__field"
        value={cube.label?.he || ''}
        placeholder="תווית"
        onChange={(e) => onChange({ label: { ...(cube.label || {}), he: e.target.value } })}
      />
      <input
        className="cubed__field"
        dir="ltr"
        value={cube.label?.en || ''}
        placeholder="Label (EN)"
        onChange={(e) => onChange({ label: { ...(cube.label || {}), en: e.target.value } })}
      />
      <select
        className="cubed__size"
        value={cube.size || 'md'}
        onChange={(e) => onChange({ size: e.target.value })}
        aria-label="גודל הקוביה"
      >
        {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <button type="button" className="cubed__del" onClick={onDelete} aria-label="הסר קוביה">
        <XIcon />
      </button>
    </div>
  )
}

export default function StatCubesField({ value, onChange }) {
  const cubes = Array.isArray(value) ? value : []
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
