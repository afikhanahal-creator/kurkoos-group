/* ============================================================
   TeamGrid — רשת צוות בכרטיסי פליפ. לחיצה הופכת את הכרטיס:
   צד קדמי = תמונה + שם + תפקיד, צד אחורי = ביוגרפיה קצרה.
   members: [{ id, name, role, bio, image, link }]
   ============================================================ */
import { useState, useEffect, useRef } from 'react'
import { optimizeSrc } from '../../lib/responsiveImage.js'
import './TeamGrid.css'

export default function TeamGrid({ members = [] }) {
  const [flipped, setFlipped] = useState(null)
  // היפוך במקלדת (Enter/Space על כפתור השם) לא חוזר לבד: מי שקורא את הביוגרפיה
  // עם קורא מסך או במקלדת לא מאבד אותה באמצע (WCAG 2.2.1)
  const autoBack = useRef(true)

  const toggle = (id, auto = true) => {
    autoBack.current = auto
    setFlipped((cur) => (cur === id ? null : id))
  }

  // מחזיר את הכרטיס המהופך לקדמתו אוטומטית אחרי 4 שניות (לחיצת עכבר או מגע בלבד)
  useEffect(() => {
    if (flipped === null || !autoBack.current) return
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
            className={`flip-card flip-card--${id}${isFlipped ? ' is-active' : ''}`}
            key={id}
            onClick={(e) => toggle(id, e.detail !== 0)}
          >
            {/* הכרטיס כולו לחיץ בעכבר. במקלדת ובקורא מסך הפעולה היא כפתור השם
                (בתוך הכותרת), שמסמן aria-expanded ומפנה לביוגרפיה. */}
            <div className={`flip-card-inner${isFlipped ? ' is-flipped' : ''}`}>
              {/* צד קדמי */}
              <div className="flip-card-front">
                <div className="flip-card-media">
                  {/* הטקסט החלופי נושא גם את התפקיד: זה מה שמסביר לגוגל מי האדם בתמונה */}
                  <img src={optimizeSrc(m.image, 520)} alt={m.role ? `${m.name}, ${m.role}, קורקוס גרופ` : m.name} className="flip-card-img" loading="lazy" style={{ ...(m.imgPos ? { objectPosition: m.imgPos } : {}), ...(m.imgZoom ? { '--img-zoom': m.imgZoom } : {}), ...(m.imgBright ? { '--img-bright': m.imgBright } : {}) }} />
                </div>
                <div className="flip-card-caption">
                  <h2 className="flip-card-name">
                    <button type="button" className="flip-card-btn" aria-expanded={isFlipped} aria-controls={`bio-${id}`}>
                      {m.name}
                    </button>
                  </h2>
                  <span className="flip-card-role">{m.role}</span>
                </div>
              </div>

              {/* צד אחורי */}
              <div className="flip-card-back" id={`bio-${id}`} inert={isFlipped ? undefined : ''}>
                {/* הצד האחורי מציג שוב את השם והתפקיד. אם הם ייכתבו כטקסט
                    הם יופיעו פעמיים בעמוד, וכך גוגל הציג "מוטי בן עמי · מוטי
                    בן עמי". התוכן מגיע מ-CSS, כך שהמראה זהה אך הטקסט מופיע
                    פעם אחת. הקורא המסך מקבל אותם מה-aria-label של הכרטיס. */}
                <p className="flip-card-name flip-card-name--back" data-name={m.name} aria-hidden="true" />
                <span className="flip-card-role flip-card-role--back" data-role={m.role} aria-hidden="true" />
                <p className="flip-card-bio">{m.bio}</p>
                {m.link && m.link !== '#' && (
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flip-card-link"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`LinkedIn: ${m.name} (נפתח בחלון חדש)`}
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
