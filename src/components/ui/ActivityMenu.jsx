import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalized } from '../../i18n/index.jsx'
import { normalizeResponsiveImage, srcOfResponsive, optimizeSrc } from '../../lib/responsiveImage.js'
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
  const [inView, setInView] = useState(false)
  const rootRef = useRef(null)

  const idx = len ? ((step % len) + len) % len : 0
  const next = useCallback(() => setStep((s) => s + 1), [])

  // מתחילים מ"יזמות" (הפריט הראשון) בכל פעם שהסקשן נכנס למסך
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStep(0)
          setInView(true)
        } else {
          setInView(false)
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || paused || len < 2) return
    const id = setInterval(next, AUTO_PLAY)
    return () => clearInterval(id)
  }, [next, paused, len, inView])

  if (!len) return null
  const current = items[idx] || items[0]

  return (
    <div
      className="actmenu"
      ref={rootRef}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      {/* פאנל ימין — רקע כהה + רשת ריבועים + צ'יפים אדומים */}
      <div className="actmenu__panel">
        {/* רשת עדינה יותר — פחות "אפקט לבן" שמבלבל ליד קו התפר */}
        <InfiniteGrid color="rgba(255,255,255,0.32)" baseOpacity={0.05} revealOpacity={0.13} />
        {/* האפלת קצה התפר (לכיוון התמונה) — תפר נקי ועדין */}
        <span className="actmenu__seam" aria-hidden="true" />
        <div className="actmenu__chips">
          {items.map((a, i) => {
            const d = wrap(-(len / 2), len / 2, i - idx)
            const active = i === idx
            return (
              <motion.div
                key={a.id}
                className="actmenu__chip-slot"
                animate={{
                  /* +CHIP_H/2 ממרכז את קבוצת ארבעת הכפתורים אנכית (2 מעל / 2 מתחת) */
                  y: d * CHIP_H + CHIP_H / 2,
                  /* כל ארבעת הכפתורים תמיד גלויים; הרחוקים דהויים יותר */
                  opacity: 1 - Math.abs(d) * 0.3,
                }}
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
                  <Icon name="arrow" size={14} className="actmenu__chip-arrow" aria-hidden="true" />
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* מחוון התקדמות עדין — מראה מתי תוחלף הכרטיסייה הבאה (UI חכם) */}
        {len > 1 && inView && (
          <span
            key={idx}
            className="actmenu__progress"
            style={{ animationDuration: `${AUTO_PLAY}ms`, animationPlayState: paused ? 'paused' : 'running' }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* תמונה — צד שמאל, קצה פנימי (ליד הצ'יפים) שטוח */}
      <div className="actmenu__stage" style={{ '--actmenu-bg': `url("${optimizeSrc(srcOfResponsive(current.image), 700)}")` }}>
        {/* רקע מטושטש של אותה תמונה — ממלא את הכרטיס כשהתמונה הוקטנה (zoom-out) או ב-contain */}
        <span className="actmenu__backdrop" aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={current.id}
            className="actmenu__img"
            src={optimizeSrc(srcOfResponsive(current.image), 700)}
            alt=""
            /* תצוגת המובייל מתוך ה-CMS (focal point / fit) — מקומפוננטה מובייל בלבד */
            style={(() => {
              const v = normalizeResponsiveImage(current.image)?.views.mobile
              return v ? {
                objectFit: v.objectFit,
                objectPosition: v.objectPosition,
                transform: `scale(${v.zoom || 1})`,
                transformOrigin: v.objectPosition,
                borderRadius: `${v.radius || 0}px`,
              } : undefined
            })()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
