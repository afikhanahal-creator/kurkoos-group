import { useEffect, useRef, useState } from 'react'

/* סופר מ-0 לערך היעד בכל פעם שהאלמנט נכנס לתצוגה (מתאפס ביציאה → רץ מחדש). */
export default function useCountUp(target, { duration = 1800 } = {}) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setValue(target)
      return
    }

    const run = () => {
      cancelAnimationFrame(rafRef.current)
      const start = performance.now()
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
        setValue(Math.round(target * eased))
        if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run()                      // נכנס לתצוגה → סופר מחדש מ-0
          } else {
            cancelAnimationFrame(rafRef.current)
            setValue(0)                // יצא מהתצוגה → איפוס, כדי שיספור שוב בכניסה הבאה
          }
        })
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return [value, ref]
}
