import { useMemo } from 'react'
import './LogoCarousel.css'

// ערבוב Fisher-Yates — מחזיר עותק מעורבב
const shuffleArr = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/* ============================================================
   LogoCarousel — סרט לוגואים רץ בלולאה אינסופית (marquee).
   מציג את *כל* הלוגואים, כולם בדיוק באותו גודל (תיבה אחידה +
   object-fit: contain), וזורם ברצף חלק. עוצר בריחוף.
   logos: [{ id, name, image_url }]
   ============================================================ */
export default function LogoCarousel({ logos = [], shuffle = false }) {
  const list = useMemo(() => (shuffle ? shuffleArr(logos) : logos), [logos, shuffle])
  if (!list.length) return null

  // משכפלים את הרשימה פעמיים → לולאה רציפה וחלקה (translateX -50%)
  const track = [...list, ...list]
  // משך מחזור פרופורציונלי לכמות הלוגואים → מהירות אחידה ונעימה
  const duration = Math.max(22, list.length * 3.4)

  return (
    <div className="logo-marquee" role="list" aria-label="שותפים ולקוחות">
      <div className="logo-marquee__track" style={{ '--marquee-duration': `${duration}s` }}>
        {track.map((logo, i) => {
          const src = logo.image_url || logo.logo || logo.image || logo.url
          return (
            <div
              className="logo-marquee__item"
              key={`${logo.id ?? logo.name ?? 'logo'}-${i}`}
              role="listitem"
              aria-hidden={i >= list.length ? 'true' : undefined}
            >
              {src
                ? <img className="logo-marquee__img" src={src} alt={logo.name || ''} loading="lazy" />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
