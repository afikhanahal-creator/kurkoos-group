import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './ActivityMenu.css'

/* ============================================================
   ActivityMenu — תצוגת מובייל לתחומי הפעילות (במקום הכרטיסיות):
   תפריט בצד ימין (4 תחומים) ותמונה מתחלפת בצד שמאל.
   לחיצה על פריט בתפריט מנווטת לדף התחום (יזמות/ביצוע/פיקוח/תיווך).
   מגע/פוקוס על פריט מעדכן את התמונה משמאל (תצוגה מקדימה).
   ============================================================ */
export default function ActivityMenu({ items = [] }) {
  const L = useLocalized()
  const [active, setActive] = useState(0)
  if (!items.length) return null
  const current = items[active] || items[0]

  return (
    <div className="actmenu">
      {/* תפריט — צד ימין (ב-RTL הילד הראשון הוא הימני) */}
      <nav className="actmenu__list" aria-label="תחומי הפעילות">
        {items.map((a, i) => (
          <Link
            key={a.id}
            to={a.to}
            className={`actmenu__item ${i === active ? 'is-active' : ''}`}
            onPointerEnter={() => setActive(i)}
            onTouchStart={() => setActive(i)}
            onFocus={() => setActive(i)}
          >
            <span className="actmenu__icon" aria-hidden="true">
              <Icon name={a.icon} size={22} />
            </span>
            <span className="actmenu__texts">
              <span className="actmenu__title">{L(a.title)}</span>
              <span className="actmenu__short">{L(a.short)}</span>
            </span>
            <Icon name="arrowLeft" size={18} className="actmenu__arrow" />
          </Link>
        ))}
      </nav>

      {/* תמונה — צד שמאל, מתחלפת לפי הפריט הפעיל */}
      <div className="actmenu__media" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={current.id}
            className="actmenu__img"
            src={current.image}
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
      </div>
    </div>
  )
}
