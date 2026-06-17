import { useRef } from 'react'
import { motion, useSpring, useMotionTemplate } from 'framer-motion'

/* קוביית סטטיסטיקה אינטראקטיבית עם נפח (3D) — הטיה לפי מיקום הסמן, דחיפה קדימה
   (translateZ) שמגדילה את הנפח בריחוף, הרמה, צל דינמי ונצנוץ אור שעוקב אחרי הסמן.
   שומר על העיצוב הקיים של .pd-stat. פעיל רק עם עכבר/הצבעה מדויקת ומכבד reduce-motion. */

const TILT = 8 // מעלות מקסימום לכל ציר (עדין יותר)
const PUSH = 14 // דחיפה קדימה בריחוף — בליטה עדינה (סגנון תדהר)
const SPRING = { stiffness: 280, damping: 18, mass: 0.6 }

const canTilt =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function StatCube({ className = '', children, style: extraStyle }) {
  const ref = useRef(null)
  const rotateX = useSpring(0, SPRING)
  const rotateY = useSpring(0, SPRING)
  const z = useSpring(0, SPRING) // דחיפה קדימה → נפח 3D בריחוף
  const scale = useSpring(1, SPRING)
  const lift = useSpring(0, SPRING)
  const gx = useSpring(50, SPRING) // מיקום הנצנוץ (%) — אופקי
  const gy = useSpring(50, SPRING) // מיקום הנצנוץ (%) — אנכי
  const shX = useSpring(0, SPRING) // היסט צל אופקי
  const shY = useSpring(4, SPRING) // היסט צל אנכי — עדין במנוחה (סגנון תדהר)
  const shBlur = useSpring(14, SPRING)
  const shAlpha = useSpring(0.08, SPRING)

  const handleMove = (e) => {
    if (!canTilt) return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const px = (e.clientX - r.left) / r.width // 0..1
    const py = (e.clientY - r.top) / r.height // 0..1
    rotateY.set((px - 0.5) * TILT * 2)
    rotateX.set((0.5 - py) * TILT * 2)
    z.set(PUSH)
    scale.set(1.02)
    lift.set(-4)
    gx.set(px * 100)
    gy.set(py * 100)
    shX.set((0.5 - px) * 10)
    shY.set(8 + (1 - py) * 4)
    shBlur.set(18)
    shAlpha.set(0.1)
  }

  const reset = () => {
    rotateX.set(0)
    rotateY.set(0)
    z.set(0)
    scale.set(1)
    lift.set(0)
    gx.set(50)
    gy.set(50)
    shX.set(0)
    shY.set(4)
    shBlur.set(14)
    shAlpha.set(0.08)
  }

  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.65), rgba(255,255,255,0) 60%)`
  /* צל "מובלט" + הדגשת קצה עליון (inset) לתחושת קוביה מורמת ויוקרתית כמו תדהר */
  const boxShadow = useMotionTemplate`${shX}px ${shY}px ${shBlur}px rgba(16,85,114,${shAlpha}), inset 0 1px 0 rgba(255,255,255,0.55)`

  return (
    <motion.div
      ref={ref}
      className={`pd-stat ${className}`}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{
        ...(extraStyle || {}),
        transformPerspective: 800, // פרספקטיבה רכה = תלת-ממד עדין
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
        z,
        scale,
        y: lift,
        boxShadow,
      }}
    >
      {children}
      <motion.span className="pd-stat__glare" aria-hidden="true" style={{ background: glare }} />
    </motion.div>
  )
}
