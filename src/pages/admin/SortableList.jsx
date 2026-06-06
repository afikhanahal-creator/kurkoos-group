import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function Row({ id, active, onSelect, label, badge }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`srow ${active ? 'srow--active' : ''}`}>
      <button type="button" className="srow__handle" {...attributes} {...listeners} title="גרור לסידור">⠿</button>
      <button type="button" className="srow__main" onClick={onSelect}>
        <span className="srow__label">{label}</span>
        {badge != null && <span className="srow__badge">{badge}</span>}
      </button>
    </div>
  )
}

export default function SortableList({ items, getId, getLabel, getBadge, activeId, onSelect, onReorder }) {
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
            <Row key={getId(it)} id={getId(it)} active={activeId === getId(it)} onSelect={() => onSelect(getId(it))} label={getLabel(it)} badge={getBadge ? getBadge(it) : null} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
