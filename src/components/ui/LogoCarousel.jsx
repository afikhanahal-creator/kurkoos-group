import { useRef, useEffect } from 'react'
import './LogoCarousel.css'

/* ============================================================
   LogoCarousel — סרט לוגואים רץ ברצף בעזרת גלילה נטיבית (scrollLeft +
   requestAnimationFrame). שיטה מוכחת שעובדת ב-iOS Safari (כמו קרוסלת
   הפרויקטים). הרשימה משוכפלת → איפוס בלתי-נראה בגבול → לולאה רציפה.
   לוגואים צפים (בלי ריבוע), בגודל אחיד (contain → לא חתוכים).
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url

/* מודד את שטח התוכן האמיתי של הלוגו (מתעלם משוליים שקופים פנימיים) ומגדיל
   אותו כך שהתוכן הנראה יגיע לגובה אחיד — "מקצר שוליים" ומיישר גדלים. */
const fitLogo = (e) => {
  const img = e.currentTarget
  if (img.dataset.fit) return
  img.dataset.fit = '1'
  try {
    const nw = img.naturalWidth, nh = img.naturalHeight
    if (!nw || !nh) return
    const s = Math.min(1, 160 / Math.max(nw, nh))
    const cw = Math.max(1, Math.round(nw * s))
    const ch = Math.max(1, Math.round(nh * s))
    const cv = document.createElement('canvas')
    cv.width = cw; cv.height = ch
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, cw, ch)
    const d = ctx.getImageData(0, 0, cw, ch).data
    let top = ch, bottom = -1
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (d[(y * cw + x) * 4 + 3] > 24) { if (y < top) top = y; bottom = y; break }
      }
    }
    if (bottom >= top) {
      const ratio = (bottom - top + 1) / ch       // יחס גובה-התוכן לגובה-התמונה
      const k = Math.max(1, Math.min(1.85, 1.04 / ratio))
      img.style.transform = `scale(${k})`
    }
  } catch { /* תמונה לא-קריאה (CORS) — מדלגים */ }
}

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
                    onLoad={fitLogo}
                  />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
