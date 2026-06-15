import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useIsMobile from '../../hooks/useIsMobile.js'
import SmartImage from './SmartImage.jsx'
import Icon from './Icon.jsx'
import './ExpandableGallery.css'

/* ============================================================
   ExpandableGallery — גלריית תמונות "נפתחת": בדסקטופ התמונות הן רצועות
   שמתרחבות בריחוף (accordion אופקי), לחיצה פותחת לייטבוקס עם ניווט.
   במובייל — רצועת גלילה אופקית עם snap (אין hover). חכם לכל כמות תמונות.
   מימוש נטיבי (framer-motion + CSS) של רעיון shadcn/Tailwind. RTL.
   ============================================================ */
export default function ExpandableGallery({ images = [] }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const isMobile = useIsMobile()

  const list = (images || []).filter(Boolean)
  if (!list.length) return null

  const flexVal = (i) => (hovered === null ? 1 : hovered === i ? 2.6 : 0.6)
  const open = (i) => setSelected(i)
  const close = () => setSelected(null)
  const next = (e) => { e.stopPropagation(); setSelected((s) => (s + 1) % list.length) }
  const prev = (e) => { e.stopPropagation(); setSelected((s) => (s - 1 + list.length) % list.length) }

  return (
    <div className="xgal">
      <div className="xgal__row">
        {list.map((src, i) => (
          <motion.button
            type="button"
            key={i}
            className="xgal__item"
            style={{ flex: 1 }}
            animate={{ flex: isMobile ? 1 : flexVal(i) }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => { if (!isMobile) setHovered(i) }}
            onMouseLeave={() => { if (!isMobile) setHovered(null) }}
            onClick={() => open(i)}
            aria-label={`הגדלת תמונה ${i + 1}`}
          >
            <SmartImage src={src} alt={`גלריית ביצוע ${i + 1}`} className="xgal__img" w={1100} />
            <span className="xgal__shade" style={{ opacity: hovered === i ? 0 : 0.32 }} aria-hidden="true" />
            <span className="xgal__zoom" aria-hidden="true"><Icon name="search" size={20} /></span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            className="xgal__modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
          >
            <button type="button" className="xgal__close" onClick={close} aria-label="סגירה">
              <Icon name="close" size={26} />
            </button>
            {list.length > 1 && (
              <button type="button" className="xgal__nav xgal__nav--prev" onClick={prev} aria-label="הקודם">
                <Icon name="chevron" size={26} />
              </button>
            )}
            <motion.img
              key={selected}
              src={list[selected]}
              alt={`גלריית ביצוע ${selected + 1}`}
              className="xgal__full"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            />
            {list.length > 1 && (
              <button type="button" className="xgal__nav xgal__nav--next" onClick={next} aria-label="הבא">
                <Icon name="chevron" size={26} />
              </button>
            )}
            <span className="xgal__counter">{selected + 1} / {list.length}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
