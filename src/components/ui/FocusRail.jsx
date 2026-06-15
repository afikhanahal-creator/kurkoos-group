import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon.jsx'
import './FocusRail.css'

/* ============================================================
   FocusRail — "קרוסלת עומק" תלת-מימדית (coverflow): כרטיס מרכזי גדול,
   הצדדיים מסובבים/מטושטשים. החלקה (drag), לחיצה על צדדי מקדמת, חצים
   ומונה. מימוש נטיבי (framer-motion + CSS) בהשראת רכיב shadcn/Tailwind.
   מותאם למובייל ול-RTL. props: images (מערך src).
   ============================================================ */
const wrap = (min, max, v) => { const r = max - min; return ((((v - min) % r) + r) % r) + min }
const BASE_SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 1 }
const TAP_SPRING = { type: 'spring', stiffness: 450, damping: 18, mass: 1 }

export default function FocusRail({ images = [] }) {
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(() => new Set())
  const onErr = (src) => setFailed((f) => { if (f.has(src)) return f; const n = new Set(f); n.add(src); return n })

  const list = (images || []).filter((s) => s && !failed.has(s))
  const count = list.length

  const prev = useCallback(() => setActive((p) => p - 1), [])
  const next = useCallback(() => setActive((p) => p + 1), [])
  const onDragEnd = (_e, info) => {
    const power = Math.abs(info.offset.x) * info.velocity.x
    if (power < -7000) next()
    else if (power > 7000) prev()
  }

  if (!count) return null
  const activeIndex = wrap(0, count, active)
  const visible = [-2, -1, 0, 1, 2]

  return (
    <div className="frail" dir="ltr">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`bg-${activeIndex}`}
          className="frail__bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <img src={list[activeIndex]} alt="" />
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="frail__stage"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={onDragEnd}
      >
        {visible.map((offset) => {
          const idx = wrap(0, count, active + offset)
          const src = list[idx]
          const isCenter = offset === 0
          const dist = Math.abs(offset)
          return (
            <motion.div
              key={active + offset}
              className={`frail__card ${isCenter ? 'is-center' : ''}`}
              style={{ zIndex: isCenter ? 20 : 10 - dist }}
              initial={false}
              animate={{
                x: `${offset * 60}%`,
                scale: isCenter ? 1 : 0.82,
                rotateY: offset * -18,
                opacity: isCenter ? 1 : Math.max(0.12, 1 - dist * 0.5),
                filter: `blur(${isCenter ? 0 : dist * 4}px) brightness(${isCenter ? 1 : 0.5})`,
              }}
              transition={{ default: BASE_SPRING, scale: TAP_SPRING }}
              onClick={() => { if (offset !== 0) setActive((p) => p + offset) }}
            >
              <img src={src} alt={`רגע מהביצוע ${idx + 1}`} draggable={false} onError={() => onErr(src)} />
              <span className="frail__sheen" aria-hidden="true" />
            </motion.div>
          )
        })}
      </motion.div>

      <div className="frail__controls">
        <button type="button" className="frail__nav frail__nav--prev" onClick={prev} aria-label="הקודם">
          <Icon name="chevron" size={20} />
        </button>
        <span className="frail__counter">{activeIndex + 1} / {count}</span>
        <button type="button" className="frail__nav frail__nav--next" onClick={next} aria-label="הבא">
          <Icon name="chevron" size={20} />
        </button>
      </div>
    </div>
  )
}
