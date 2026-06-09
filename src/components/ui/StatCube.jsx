import { useRef } from 'react'
import { motion, useSpring, useMotionTemplate } from 'framer-motion'

/* קוביית סטטיסטיקה אינטראקטיבית עם נפח (3D) — הטיה לפי מיקום הסמן, דחיפה קדימה
   (translateZ) שמגדילה את הנפח בריחוף, הרמה, צל דינמי ונצנוץ אור שעוקב אחרי הסמן.
   שומר על העיצוב הקיים של .pd-stat. פעיל רק עם עכבר/הצבעה מדויקת ומכבד reduce-motion. */

const TILT = 12 // מעלות מקסימום לכל ציר (עדין)
const PUSH = 26 // כמה הקוביה "נדחפת" קדימה בריחוף (px translateZ) — נפח עדין
const SPRING = { stiffness: 280, damping: 18, mass: 0.6 }

const canTilt =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function StatCube({ className = '', children }) {
  const ref = useRef(null)
  const rotateX = useSpring(0, SPRING)
  const rotateY = useSpring(0, SPRING)
  const z = useSpring(0, SPRING) // דחיפה קדימה → נפח 3D בריחוף
  const scale = useSpring(1, SPRING)
  const lift = useSpring(0, SPRING)
  const gx = useSpring(50, SPRING) // מיקום הנצנוץ (%) — אופקי
  const gy = useSpring(50, SPRING) // מיקום הנצנוץ (%) — אנכי
  const shX = useSpring(0, SPRING) // היסט צל אופקי
  const shY = useSpring(8, SPRING) // היסט צל אנכי
  const shBlur = useSpring(16, SPRING)
  const shAlpha = useSpring(0.05, SPRING)

  const handleMove = (e) => {
    if (!canTilt) return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const px = (e.clientX - r.left) / r.width // 0..1
    const py = (e.clientY - r.top) / r.height // 0..1
    rotateY.set((px - 0.5) * TILT * 2)
    rotateX.set((0.5 - py) * TILT * 2)
    z.set(PUSH)
    scale.set(1.035)
    lift.set(-6)
    gx.set(px * 100)
    gy.set(py * 100)
    shX.set((0.5 - px) * 20)
    shY.set(14 + (1 - py) * 8)
    shBlur.set(28)
    shAlpha.set(0.16)
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
    shY.set(8)
    shBlur.set(16)
    shAlpha.set(0.05)
  }

  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.65), rgba(255,255,255,0) 60%)`
  const boxShadow = useMotionTemplate`${shX}px ${shY}px ${shBlur}px rgba(16,85,114,${shAlpha})`

  return (
    <motion.div
      ref={ref}
      className={`pd-stat ${className}`}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{
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
