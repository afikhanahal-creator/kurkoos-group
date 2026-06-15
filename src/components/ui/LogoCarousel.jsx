import { useRef, useEffect } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import './LogoCarousel.css'

/* ============================================================
   LogoCarousel — סרט לוגואים רץ ברצף (marquee) בהשראת InfiniteSlider.
   התנועה מונעת ב-JS (framer-motion animate על motion value) ולכן אמינה
   ולא נתקעת. כל לוגו בכרטיס אחיד (contain → גודל זהה, לא חתוך).
   משכפלים את הרשימה פעמיים ומזיזים עותק שלם → לולאה רציפה חלקה.
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url

export default function LogoCarousel({ logos = [] }) {
  const list = (logos || []).filter((l) => srcOf(l) || l.name)
  const x = useMotionValue(0)
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || list.length < 2) return
    let raf
    let controls
    const start = () => {
      const half = track.scrollWidth / 2   // רוחב עותק אחד
      if (!half) { raf = requestAnimationFrame(start); return }
      const speed = 55 // פיקסל/שנייה — תנועה רציפה וברורה לעין
      controls = animate(x, [0, -half], {
        ease: 'linear',
        duration: half / speed,
        repeat: Infinity,
        repeatType: 'loop',
      })
    }
    raf = requestAnimationFrame(start)
    return () => { cancelAnimationFrame(raf); controls && controls.stop() }
  }, [list.length, x])

  if (!list.length) return null
  const track = [...list, ...list]

  return (
    <div className="logo-marquee" role="list" aria-label="שותפים ולקוחות">
      <motion.div className="logo-marquee__track" ref={trackRef} style={{ x }}>
        {track.map((logo, i) => {
          const src = srcOf(logo)
          return (
            <div
              className="logo-marquee__item"
              role="listitem"
              key={i}
              aria-hidden={i >= list.length ? 'true' : undefined}
            >
              {src
                ? <img className="logo-marquee__img" src={src} alt={logo.name || ''} loading="lazy" decoding="async" />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
