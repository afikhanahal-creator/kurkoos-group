import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useIsMobile from '../../hooks/useIsMobile.js'
import Icon from './Icon.jsx'
import './ExpandableGallery.css'

/* ============================================================
   ExpandableGallery — גלריית תמונות "נפתחת": בדסקטופ התמונות הן רצועות
   שמתרחבות בריחוף (accordion אופקי), לחיצה פותחת לייטבוקס עם ניווט.
   במובייל — רצועת גלילה אופקית עם snap (אין hover). חכם לכל כמות תמונות,
   ומדלג אוטומטית על תמונות שלא נטענו (404) כך שאפשר להגדיר משבצות מראש.
   מימוש נטיבי (framer-motion + CSS) של רעיון shadcn/Tailwind. RTL.
   ============================================================ */
export default function ExpandableGallery({ images = [] }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [failed, setFailed] = useState(() => new Set())
  const isMobile = useIsMobile()

  // מסננים תמונות שלא קיימות/נכשלו → אין "חורים" וניתן להגדיר 1..10 מראש
  const list = (images || []).filter((s) => s && !failed.has(s))
  if (!list.length) return null

  const flexVal = (i) => (hovered === null ? 1 : hovered === i ? 2.1 : 0.7)
  const open = (i) => setSelected(i)
  const close = () => setSelected(null)
  const next = (e) => { e.stopPropagation(); setSelected((s) => (s + 1) % list.length) }
  const prev = (e) => { e.stopPropagation(); setSelected((s) => (s - 1 + list.length) % list.length) }
  const onErr = (src) => setFailed((f) => { const n = new Set(f); n.add(src); return n })

  return (
    <div className="xgal">
      <div className="xgal__row">
        {list.map((src, i) => (
          <motion.button
            type="button"
            key={src}
            className="xgal__item"
            style={{ flex: 1 }}
            animate={{ flex: isMobile ? 1 : flexVal(i) }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => { if (!isMobile) setHovered(i) }}
            onMouseLeave={() => { if (!isMobile) setHovered(null) }}
            onClick={() => open(i)}
            aria-label={`הגדלת תמונה ${i + 1}`}
          >
            <img className="xgal__img" src={src} alt={`גלריית ביצוע ${i + 1}`} loading="lazy" decoding="async" onError={() => onErr(src)} />
            <span className="xgal__shade" style={{ opacity: hovered === i ? 0 : 0.16 }} aria-hidden="true" />
            <span className="xgal__zoom" aria-hidden="true"><Icon name="search" size={20} /></span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected !== null && list[selected] && (
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
              onClick={next}
              style={{ cursor: list.length > 1 ? 'pointer' : 'default' }}
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
