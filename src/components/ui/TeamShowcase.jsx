import { useState } from 'react'
import './TeamShowcase.css'

/* ============================================================
   TeamShowcase — רשת תמונות (גווני אפור → צבע בריחוף) +
   רשימת שמות מסונכרנת. מבוסס Uiverse, הומר ל-JS + CSS.
   members: [{ id, name, role, image }]
   ============================================================ */
function PhotoCard({ member, col, hoveredId, onHover }) {
  const isActive = hoveredId === member.id
  const isDimmed = hoveredId !== null && !isActive
  return (
    <div
      className={`ts__photo ts__photo--c${col} ${isActive ? 'is-active' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      <img src={member.image} alt={member.name} />
    </div>
  )
}

function MemberRow({ member, hoveredId, onHover }) {
  const isActive = hoveredId === member.id
  const isDimmed = hoveredId !== null && !isActive
  return (
    <div
      className={`ts__row ${isActive ? 'is-active' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="ts__row-head">
        <span className="ts__bar" />
        <span className="ts__name">{member.name}</span>
      </div>
      <p className="ts__role">{member.role}</p>
    </div>
  )
}

export default function TeamShowcase({ members = [] }) {
  const [hoveredId, setHoveredId] = useState(null)
  const col1 = members.filter((_, i) => i % 3 === 0)
  const col2 = members.filter((_, i) => i % 3 === 1)
  const col3 = members.filter((_, i) => i % 3 === 2)

  return (
    <div className="team-showcase">
      <div className="ts__photos">
        <div className="ts__col">
          {col1.map((m) => <PhotoCard key={m.id} member={m} col={1} hoveredId={hoveredId} onHover={setHoveredId} />)}
        </div>
        <div className="ts__col ts__col--2">
          {col2.map((m) => <PhotoCard key={m.id} member={m} col={2} hoveredId={hoveredId} onHover={setHoveredId} />)}
        </div>
        <div className="ts__col ts__col--3">
          {col3.map((m) => <PhotoCard key={m.id} member={m} col={3} hoveredId={hoveredId} onHover={setHoveredId} />)}
        </div>
      </div>

      <div className="ts__list">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} hoveredId={hoveredId} onHover={setHoveredId} />
        ))}
      </div>
    </div>
  )
}
