import './LogoCarousel.css'

// ערבוב Fisher-Yates — מחזיר עותק מעורבב
const shuffleArr = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/* ============================================================
   LogoCarousel — סרט לוגואים רץ בלולאה (marquee), פשוט וחסין:
   מכפילים את הרשימה פעמיים ומריצים translateX 0 → -50%. כל לוגו
   בתוך כרטיס אחיד (object-fit: contain) → גודל זהה, אף פעם לא חתוך.
   בלי סינון/חישובים מורכבים — מציג תמיד את כל הלוגואים.
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url

export default function LogoCarousel({ logos = [], shuffle = false }) {
  const base = (logos || []).filter((l) => srcOf(l) || l.name)
  if (!base.length) return null
  const list = shuffle ? shuffleArr(base) : base
  // משכפלים פעמיים → לולאה רציפה חלקה (עותק אחד רחב מהמסך, אז אין רווח ריק)
  const track = [...list, ...list]
  const duration = Math.max(28, list.length * 3.2)

  return (
    <div className="logo-marquee" role="list" aria-label="שותפים ולקוחות">
      <div className="logo-marquee__track" style={{ '--marquee-duration': `${duration}s` }}>
        {track.map((logo, i) => {
          const src = srcOf(logo)
          return (
            <div
              className="logo-marquee__item"
              key={i}
              role="listitem"
              aria-hidden={i >= list.length ? 'true' : undefined}
            >
              {src
                ? <img className="logo-marquee__img" src={src} alt={logo.name || ''} loading="lazy" decoding="async" />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
