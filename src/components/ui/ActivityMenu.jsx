import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './ActivityMenu.css'

/* ============================================================
   ActivityMenu — תצוגת מובייל לתחומי הפעילות (במקום הכרטיסיות).
   עיבוד של FeatureCarousel (shadcn/Tailwind/motion) ל-JSX + framer-motion + CSS:
   • תפריט בצד ימין — צ'יפים מתגלגלים אנכית, הפעיל מודגש (כותרת בלבד).
   • תמונה בצד שמאל — ערימת כרטיסים (active/prev/next), עם משפט קצר בתחתית.
   • לחיצה על צ'יפ מנווטת לדף התחום (יזמות/ביצוע/פיקוח/תיווך).
   • ניגון אוטומטי; נעצר בנגיעה. בלי "Live Session" ובלי כפתור לבן על התמונה.
   ============================================================ */

const AUTO_PLAY = 3200
const CHIP_H = 68

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

  const cardStatus = (i) => {
    let d = i - idx
    if (d > len / 2) d -= len
    if (d < -len / 2) d += len
    if (d === 0) return 'active'
    if (d === -1) return 'prev'
    if (d === 1) return 'next'
    return 'hidden'
  }

  return (
    <div
      className="actmenu"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      {/* תפריט ימין — צ'יפים מתגלגלים אנכית (כותרת בלבד) */}
      <div className="actmenu__chips">
        {items.map((a, i) => {
          const d = wrap(-(len / 2), len / 2, i - idx)
          const active = i === idx
          return (
            <motion.div
              key={a.id}
              className="actmenu__chip-slot"
              animate={{ y: d * CHIP_H, opacity: 1 - Math.abs(d) * 0.34 }}
              transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 1 }}
            >
              <Link
                to={a.to}
                className={`actmenu__chip ${active ? 'is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
              >
                <span className="actmenu__chip-icon" aria-hidden="true">
                  <Icon name={a.icon} size={18} />
                </span>
                <span className="actmenu__chip-label">{L(a.title)}</span>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* תמונה שמאל — ערימת כרטיסים, משפט קצר בתחתית (RTL) */}
      <div className="actmenu__stage">
        {items.map((a, i) => {
          const st = cardStatus(i)
          const active = st === 'active'
          const prev = st === 'prev'
          const nxt = st === 'next'
          return (
            <motion.div
              key={a.id}
              className="actmenu__card"
              initial={false}
              animate={{
                y: active ? 0 : prev || nxt ? '5%' : 0,
                scale: active ? 1 : prev || nxt ? 0.9 : 0.8,
                opacity: active ? 1 : prev || nxt ? 0.32 : 0,
                rotate: prev ? -2.5 : nxt ? 2.5 : 0,
                zIndex: active ? 20 : prev || nxt ? 10 : 0,
              }}
              style={{ pointerEvents: active ? 'auto' : 'none' }}
              transition={{ type: 'spring', stiffness: 260, damping: 25, mass: 0.8 }}
            >
              <img
                className={`actmenu__img ${active ? '' : 'is-dim'}`}
                src={a.image}
                alt=""
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              <AnimatePresence>
                {active && (
                  <motion.p
                    className="actmenu__caption"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {L(a.short)}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
