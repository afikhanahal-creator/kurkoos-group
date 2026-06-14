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

  // "יחידה" שחוזרת מספיק פעמים כדי למלא גם מסך רחב (לא ריק / לא חתוך),
  // ואז משכפלים אותה פעמיים → לולאה אינסופית חלקה (translateX -50%).
  const MIN_ITEMS = 18
  const repeat = Math.max(2, Math.ceil(MIN_ITEMS / list.length))
  const unit = Array.from({ length: repeat }, () => list).flat()
  const track = [...unit, ...unit]
  // משך מחזור פרופורציונלי לאורך היחידה → מהירות אחידה ונעימה בכל כמות
  const duration = Math.max(24, unit.length * 2.6)

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
