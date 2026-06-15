import { useRef, useEffect } from 'react'
import './LogoCarousel.css'

/* ============================================================
   LogoCarousel — סרט לוגואים רץ ברצף בעזרת גלילה נטיבית (scrollLeft +
   requestAnimationFrame). שיטה מוכחת שעובדת ב-iOS Safari (כמו קרוסלת
   הפרויקטים). הרשימה משוכפלת → איפוס בלתי-נראה בגבול → לולאה רציפה.
   לוגואים צפים (בלי ריבוע), בגודל אחיד (contain → לא חתוכים).
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url

export default function LogoCarousel({ logos = [] }) {
  const list = (logos || []).filter((l) => srcOf(l) || l.name)
  const scrollerRef = useRef(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || list.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf
    let pos = 0
    let paused = false
    const speed = 1 // פיקסל שלם לפריים (~60px/שנייה) — מהיר יותר, ובלי ריצוד תת-פיקסל

    const step = () => {
      const copy = el.scrollWidth / 2   // רוחב עותק אחד
      if (!paused && copy) {
        pos += speed
        if (pos >= copy) pos -= copy     // איפוס חלק בגבול → לולאה רציפה
        el.scrollLeft = Math.round(pos)  // פיקסלים שלמים → בלי ריצוד
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    const pause = () => { paused = true }
    const resume = () => { pos = el.scrollLeft; paused = false }
    el.addEventListener('pointerdown', pause)
    el.addEventListener('pointerup', resume)
    el.addEventListener('pointercancel', resume)
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('touchend', resume)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('pointerup', resume)
      el.removeEventListener('pointercancel', resume)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('touchend', resume)
    }
  }, [list.length])

  if (!list.length) return null
  const track = [...list, ...list]

  return (
    <div className="logo-marquee" ref={scrollerRef} role="list" aria-label="שותפים ולקוחות">
      <div className="logo-marquee__track">
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
                ? <img
                    className="logo-marquee__img"
                    src={src}
                    alt={logo.name || ''}
                    loading="eager"
                    decoding="async"
                    onLoad={(e) => {
                      const im = e.currentTarget
                      const r = im.naturalWidth / im.naturalHeight
                      // לוגו ריבועי = בד"כ עם שוליים שקופים פנימיים → מגדילים כדי שייראה באותו גודל
                      if (r >= 0.82 && r <= 1.25) im.classList.add('is-square')
                    }}
                  />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
