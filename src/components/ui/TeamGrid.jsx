/* ============================================================
   TeamGrid — רשת צוות בכרטיסי פליפ. לחיצה הופכת את הכרטיס:
   צד קדמי = תמונה + שם + תפקיד, צד אחורי = ביוגרפיה קצרה.
   members: [{ id, name, role, bio, image, link }]
   ============================================================ */
import { useState, useEffect } from 'react'
import './TeamGrid.css'

export default function TeamGrid({ members = [] }) {
  const [flipped, setFlipped] = useState(null)

  const toggle = (id) => setFlipped((cur) => (cur === id ? null : id))

  // מחזיר את הכרטיס המהופך לקדמתו אוטומטית אחרי 4 שניות
  useEffect(() => {
    if (flipped === null) return
    const timer = setTimeout(() => setFlipped(null), 4000)
    return () => clearTimeout(timer)
  }, [flipped])

  return (
    <div className="team-grid">
      {members.map((m, i) => {
        const id = m.id || i
        const isFlipped = flipped === id
        return (
          <div
            className={`flip-card${isFlipped ? ' is-active' : ''}`}
            key={id}
            role="button"
            tabIndex={0}
            aria-pressed={isFlipped}
            aria-label={`${m.name} — ${m.role}`}
            onClick={() => toggle(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggle(id)
              }
            }}
          >
            <div className={`flip-card-inner${isFlipped ? ' is-flipped' : ''}`}>
              {/* צד קדמי */}
              <div className="flip-card-front">
                <div className="flip-card-media">
                  <img src={m.image} alt={m.name} className="flip-card-img" loading="lazy" />
                </div>
                <div className="flip-card-caption">
                  <h3 className="flip-card-name">{m.name}</h3>
                  <span className="flip-card-role">{m.role}</span>
                </div>
              </div>

              {/* צד אחורי */}
              <div className="flip-card-back">
                <h3 className="flip-card-name flip-card-name--back">{m.name}</h3>
                <span className="flip-card-role flip-card-role--back">{m.role}</span>
                <p className="flip-card-bio">{m.bio}</p>
                {m.link && m.link !== '#' && (
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flip-card-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
