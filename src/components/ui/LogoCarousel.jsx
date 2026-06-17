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
      // מגדילים את התוכן לגובה אחיד; תקרה גבוהה יותר כדי שגם לוגואים קטנים/מרופדים
      // יגיעו לאותו גודל נראה כמו השאר
      const k = Math.max(1, Math.min(2.2, 1.06 / ratio))
      img.style.transform = `scale(${k})`
    }
  } catch { /* תמונה לא-קריאה (CORS) — מדלגים */ }
}

export default function LogoCarousel({ logos = [] }) {
  const list = (logos || []).filter((l) => srcOf(l) || l.name)
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || list.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf
    let pos = 0
    let paused = false
    let last = performance.now()
    const speed = 90 // פיקסלים לשנייה — מעט יותר מהיר

    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000) // שניות (מוגבל לקפיצות)
      last = now
      const copy = track.scrollWidth / 2 // רוחב עותק אחד (הרשימה משוכפלת)
      if (!paused && copy) {
        pos += speed * dt
        if (pos >= copy) pos -= copy // איפוס חלק בגבול → לולאה רציפה
        // טרנספורם ב-GPU (translate3d) — חלק, בלי ריצוד גלילה תת-פיקסל
        track.style.transform = `translate3d(${-pos}px, 0, 0)`
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    const pause = () => { paused = true }
    const resume = () => { last = performance.now(); paused = false }
    track.addEventListener('pointerdown', pause)
    track.addEventListener('pointerup', resume)
    track.addEventListener('pointercancel', resume)
    track.addEventListener('mouseenter', pause)
    track.addEventListener('mouseleave', resume)
    track.addEventListener('touchstart', pause, { passive: true })
    track.addEventListener('touchend', resume)

    return () => {
      cancelAnimationFrame(raf)
      track.removeEventListener('pointerdown', pause)
      track.removeEventListener('pointerup', resume)
      track.removeEventListener('pointercancel', resume)
      track.removeEventListener('mouseenter', pause)
      track.removeEventListener('mouseleave', resume)
      track.removeEventListener('touchstart', pause)
      track.removeEventListener('touchend', resume)
    }
  }, [list.length])

  if (!list.length) return null
  const track = [...list, ...list]

  return (
    <div className="logo-marquee" role="list" aria-label="שותפים ולקוחות">
      <div className="logo-marquee__track" ref={trackRef}>
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
                    /* לוגו מה-CMS: גודל/מיקום ידני בדיוק כמו במערכת (בלי fit אוטומטי).
                       לוגו סטטי: מדידת תוכן אוטומטית (fitLogo) לאחידות. */
                    style={logo.cms ? { transform: `translate(${logo.pos_x || 0}%, ${logo.pos_y || 0}%) scale(${logo.scale || 1})` } : undefined}
                    onLoad={logo.cms ? undefined : fitLogo}
                  />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
