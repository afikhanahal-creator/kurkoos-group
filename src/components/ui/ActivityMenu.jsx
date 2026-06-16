import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import InfiniteGrid from './InfiniteGrid.jsx'
import './ActivityMenu.css'

/* ============================================================
   ActivityMenu — תצוגת מובייל לתחומי הפעילות (במקום הכרטיסיות).
   כרטיס אחיד: פאנל כהה מימין עם רשת ריבועים (InfiniteGrid) וצ'יפים
   אדומים מתגלגלים אנכית; תמונה גדולה משמאל שקצֵהּ הפנימי (ליד הצ'יפים)
   שטוח, באותו גובה כמו הצ'יפים. לחיצה על צ'יפ מנווטת לדף התחום.
   ============================================================ */

const AUTO_PLAY = 3700
const CHIP_H = 58

const wrap = (min, max, v) => {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}

export default function ActivityMenu({ items = [] }) {
  const L = useLocalized()
  const len = items.length
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)

  const idx = len ? ((step % len) + len) % len : 0
  const next = useCallback(() => setStep((s) => s + 1), [])

  useEffect(() => {
    if (paused || len < 2) return
    const id = setInterval(next, AUTO_PLAY)
    return () => clearInterval(id)
  }, [next, paused, len])

  if (!len) return null
  const current = items[idx] || items[0]

  return (
    <div
      className="actmenu"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      {/* פאנל ימין — רקע כהה + רשת ריבועים + צ'יפים אדומים */}
      <div className="actmenu__panel">
        <InfiniteGrid color="rgba(255,255,255,0.5)" baseOpacity={0.08} revealOpacity={0.2} />
        <div className="actmenu__chips">
          {items.map((a, i) => {
            const d = wrap(-(len / 2), len / 2, i - idx)
            const active = i === idx
            return (
              <motion.div
                key={a.id}
                className="actmenu__chip-slot"
                animate={{ y: d * CHIP_H, opacity: 1 - Math.abs(d) * 0.36 }}
                transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 1 }}
              >
                <Link
                  to={a.to}
                  className={`actmenu__chip ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="actmenu__chip-icon" aria-hidden="true">
                    <Icon name={a.icon} size={16} />
                  </span>
                  <span className="actmenu__chip-label">{L(a.title)}</span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* תמונה — צד שמאל, קצה פנימי (ליד הצ'יפים) שטוח */}
      <div className="actmenu__stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={current.id}
            className="actmenu__img"
            src={current.image}
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={`${current.id}-cap`}
            className="actmenu__caption"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.32 }}
          >
            {L(current.short)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
