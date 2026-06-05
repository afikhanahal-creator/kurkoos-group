import { useRef, useEffect, useId } from 'react'
import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from 'framer-motion'
import './InfiniteGrid.css'

/* ============================================================
   InfiniteGrid — רקע רשת נע אינסופי עם חשיפת "פנס" בעכבר.
   מבוסס Aceternity/infinite-grid, הומר ל-JS + CSS (בלי Tailwind),
   גרסת רקע נקייה לשילוב מאחורי סקשנים.
   props: size, color, baseOpacity, revealOpacity, speed
   ============================================================ */
export default function InfiniteGrid({
  size = 44,
  color = 'rgba(255,255,255,0.6)',
  baseOpacity = 0.07,
  revealOpacity = 0.32,
  speed = 0.4,
}) {
  const ref = useRef(null)
  const rawId = useId().replace(/:/g, '')
  const baseId = `ig-${rawId}-b`
  const revId = `ig-${rawId}-r`

  const mouseX = useMotionValue(-9999)
  const mouseY = useMotionValue(-9999)
  const offX = useMotionValue(0)
  const offY = useMotionValue(0)

  useEffect(() => {
    const onMove = (e) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      mouseX.set(e.clientX - r.left)
      mouseY.set(e.clientY - r.top)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mouseX, mouseY])

  useAnimationFrame(() => {
    offX.set((offX.get() + speed) % size)
    offY.set((offY.get() + speed) % size)
  })

  const mask = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, black, transparent)`
  const d = `M ${size} 0 L 0 0 0 ${size}`

  return (
    <div className="infinite-grid" ref={ref} aria-hidden="true">
      {/* שכבת בסיס */}
      <div className="ig__layer" style={{ opacity: baseOpacity }}>
        <svg width="100%" height="100%">
          <defs>
            <motion.pattern id={baseId} width={size} height={size} patternUnits="userSpaceOnUse" x={offX} y={offY}>
              <path d={d} fill="none" stroke={color} strokeWidth="1" />
            </motion.pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${baseId})`} />
        </svg>
      </div>

      {/* שכבת חשיפה בעכבר */}
      <motion.div className="ig__layer" style={{ opacity: revealOpacity, maskImage: mask, WebkitMaskImage: mask }}>
        <svg width="100%" height="100%">
          <defs>
            <motion.pattern id={revId} width={size} height={size} patternUnits="userSpaceOnUse" x={offX} y={offY}>
              <path d={d} fill="none" stroke={color} strokeWidth="1" />
            </motion.pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${revId})`} />
        </svg>
      </motion.div>
    </div>
  )
}
