import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TrashIcon = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
  </svg>
)

function Row({ id, active, onSelect, onDelete, label, badge }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`srow ${active ? 'srow--active' : ''}`}>
      <button type="button" className="srow__main" onClick={onSelect}>
        <span className="srow__label">{label}</span>
        {badge != null && <span className="srow__badge">{badge}</span>}
      </button>
      <div className="srow__tools">
        <button type="button" className="srow__handle" {...attributes} {...listeners} title="גרור לסידור" aria-label="גרור לסידור">⠿</button>
        {onDelete && (
          <button type="button" className="srow__del" onClick={() => onDelete(id)} title="מחיקה לצמיתות" aria-label="מחיקה">
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  )
}

export default function SortableList({ items, getId, getLabel, getBadge, activeId, onSelect, onDelete, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const ids = items.map(getId)
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldI = ids.indexOf(active.id)
    const newI = ids.indexOf(over.id)
    onReorder(arrayMove(ids, oldI, newI))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="slist">
          {items.map((it) => (
            <Row key={getId(it)} id={getId(it)} active={activeId === getId(it)} onSelect={() => onSelect(getId(it))} onDelete={onDelete} label={getLabel(it)} badge={getBadge ? getBadge(it) : null} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
