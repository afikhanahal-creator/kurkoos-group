import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './CardDeck.css'

/* ============================================================
   CardDeck — ערימת כרטיסים נלחצת (port ל-JSX של animata card-stack).
   הכרטיס העליון מוצג במלואו, השאר "מציצים" מאחור בקנה-מידה והטיה.
   לחיצה/הקשה => הכרטיס העליון "נזרק" החוצה והבא עולה במקומו, במחזור
   אינסופי. ללא חצים/לב/תגובה — התוכן (FeatureCard שלנו) מוזרק דרך
   renderCard, כך שאפקט ה-hover/תנועה מדף הבית ממשיך לעבוד.
   מותאם ל-Vite + framer-motion (לא Tailwind/shadcn).
   ============================================================ */

const DEPTH = 3
const ORIGIN = '50% 0%'
const EXIT_Y = '210%'
const COOLDOWN_MS = 280

// היסטי "הצצה" כאחוז מגובה הכרטיס — הערימה מתכווצת יחד עם הכרטיס
const PRESETS = [
  { y: '0%', scale: 1, rotate: 0, zIndex: 20 },
  { y: '-5%', scale: 0.84, rotate: -1, zIndex: 5 },
  { y: '-7.5%', scale: 0.72, rotate: 1, zIndex: 0 },
]

const PROMOTE = { type: 'spring', duration: 0.34, bounce: 0 }
const THROW = { type: 'spring', duration: 0.42, bounce: 0.06 }
const PRESS_SCALE = 0.985

// אימפולס זריקה אקראי קל — סחיפה צידית + סיבוב, כמו במקור
function throwImpulse() {
  const drift = Math.random() - 0.5
  return {
    x: `${(drift * 7).toFixed(2)}%`,
    rotate: drift * 6 + (Math.random() - 0.5) * 1.5,
  }
}

export default function CardDeck({ items, renderCard, className = '', ariaLabel = 'Next card' }) {
  const [list, setList] = useState(items)
  const [busy, setBusy] = useState(false)
  const [pressed, setPressed] = useState(false)
  const throwRef = useRef(throwImpulse())
  const timerRef = useRef(null)

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => { setList(items) }, [items])
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const advance = useCallback(() => {
    if (list.length <= 1 || busy) return
    throwRef.current = throwImpulse()
    setList((cur) => {
      const next = [...cur]
      next.push(next.shift())
      return next
    })
    if (!reduce) {
      setBusy(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setBusy(false), COOLDOWN_MS)
    }
  }, [list.length, busy, reduce])

  const visible = list.slice(0, DEPTH)

  return (
    <div className={`card-deck ${className}`}>
      <button
        type="button"
        className="card-deck__trigger"
        aria-label={ariaLabel}
        onClick={advance}
        onPointerDown={() => { if (!busy && !reduce) setPressed(true) }}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
      >
        <div className="card-deck__viewport">
          <AnimatePresence initial={false} mode="sync">
            {visible.map((item, i) => {
              const p = PRESETS[i] || PRESETS[PRESETS.length - 1]
              const isTop = i === 0
              return (
                <motion.div
                  key={item.id}
                  className="card-deck__card"
                  style={{ transformOrigin: ORIGIN }}
                  initial={reduce ? false : { y: p.y, rotate: p.rotate, scale: p.scale, opacity: 1, zIndex: p.zIndex }}
                  animate={{
                    y: p.y,
                    rotate: p.rotate,
                    scale: p.scale * (isTop && pressed ? PRESS_SCALE : 1),
                    opacity: 1,
                    zIndex: p.zIndex,
                  }}
                  exit={
                    reduce
                      ? { opacity: 0, transition: { duration: 0 } }
                      : {
                          y: EXIT_Y,
                          x: throwRef.current.x,
                          rotate: throwRef.current.rotate,
                          scale: 0.9,
                          opacity: 0,
                          zIndex: 30,
                          transition: { ...THROW, opacity: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
                        }
                  }
                  transition={reduce ? { duration: 0 } : PROMOTE}
                  aria-hidden={!isTop}
                >
                  {renderCard(item, i)}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </button>
    </div>
  )
}
