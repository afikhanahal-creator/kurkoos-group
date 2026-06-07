import { useState, useRef, useEffect } from 'react'
import { useLocalized } from '../../i18n/index.jsx'
import SmartImage from './SmartImage.jsx'
import Icon from './Icon.jsx'

/* ============================================================
   אקורדיון תוכניות דירה — שורה לכל סוג דירה (2/3/4… חדרים).
   שורה אחת פתוחה בכל רגע, גובה מונפש, אייקון +/− מסתובב.
   הפתיחה חושפת סטריפ תצוגות; לחיצה מחליפה תצוגה גדולה בצד.
   נגיש למקלדת (Enter/Space דרך <button> טבעי).
   ============================================================ */

function AccordionRow({ group, isOpen, onToggle, activeImg, onPickPlan }) {
  const L = useLocalized()
  const bodyRef = useRef(null)
  const [maxH, setMaxH] = useState(0)

  useEffect(() => {
    if (bodyRef.current) setMaxH(isOpen ? bodyRef.current.scrollHeight : 0)
  }, [isOpen, group])

  const headingId = `plan-h-${group.rooms}`
  const panelId = `plan-p-${group.rooms}`

  return (
    <div className={`plan-acc__row ${isOpen ? 'is-open' : ''}`}>
      <h3 className="plan-acc__heading">
        <button
          type="button"
          id={headingId}
          className="plan-acc__trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="plan-acc__title">{L(group.label)}</span>
          <span className="plan-acc__icon" aria-hidden="true">
            <Icon name={isOpen ? 'minus' : 'plus'} size={20} />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className="plan-acc__panel"
        style={{ maxHeight: maxH }}
        hidden={!isOpen && maxH === 0}
      >
        <div className="plan-acc__panel-inner" ref={bodyRef}>
          <div className="plan-acc__strip" role="list">
            {group.plans.map((plan, i) => (
              <button
                key={i}
                type="button"
                role="listitem"
                className={`plan-acc__thumb ${activeImg === plan.img ? 'is-active' : ''}`}
                onClick={() => onPickPlan(plan.img)}
                aria-pressed={activeImg === plan.img}
              >
                <SmartImage src={plan.img} alt={L(plan.label) || `${L(group.label)} ${i + 1}`} label={L(group.label)} />
                <span className="plan-acc__thumb-label">{L(plan.label) || `${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlanAccordion({ groups, onEnlarge }) {
  const L = useLocalized()
  const [openIdx, setOpenIdx] = useState(0)
  const firstImg = groups[0]?.plans?.[0]?.img
  const [preview, setPreview] = useState(firstImg)

  if (!groups?.length) return null

  const toggle = (idx) => {
    setOpenIdx((cur) => {
      const next = cur === idx ? -1 : idx
      if (next !== -1) {
        const img = groups[next]?.plans?.[0]?.img
        if (img) setPreview(img)
      }
      return next
    })
  }

  return (
    <div className="plan-acc">
      <div className="plan-acc__preview">
        <button
          type="button"
          className="plan-acc__preview-btn"
          onClick={() => preview && onEnlarge?.(preview)}
          aria-label={L({ he: 'הגדלת תוכנית', en: 'Enlarge plan' })}
        >
          <SmartImage src={preview} alt={L({ he: 'תוכנית דירה', en: 'Floor plan' })} label={L({ he: 'תוכנית', en: 'Plan' })} />
          <span className="plan-acc__preview-zoom" aria-hidden="true"><Icon name="search" size={20} /></span>
        </button>
      </div>
      <div className="plan-acc__list">
        {groups.map((group, idx) => (
          <AccordionRow
            key={group.rooms ?? idx}
            group={group}
            isOpen={openIdx === idx}
            onToggle={() => toggle(idx)}
            activeImg={preview}
            onPickPlan={setPreview}
          />
        ))}
      </div>
    </div>
  )
}
