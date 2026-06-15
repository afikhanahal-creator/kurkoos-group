import './LogoCarousel.css'

/* ============================================================
   LogoCarousel — סרט לוגואים רץ (marquee) ב-CSS טהור. משכפלים את
   הרשימה פעמיים ומריצים translateX 0 → -50% → לולאה רציפה חלקה.
   בלי מדידות JS (חסין). כל לוגו בכרטיס אחיד (contain, לא חתוך).
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url

export default function LogoCarousel({ logos = [] }) {
  const list = (logos || []).filter((l) => srcOf(l) || l.name)
  if (!list.length) return null
  const track = [...list, ...list]
  const duration = Math.max(30, list.length * 3.4)

  return (
    <div className="logo-marquee" role="list" aria-label="שותפים ולקוחות">
      <div className="logo-marquee__track" style={{ '--marquee-dur': `${duration}s` }}>
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
      </div>
    </div>
  )
}
