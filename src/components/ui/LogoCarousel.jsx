import './LogoCarousel.css'

/* ============================================================
   LogoCarousel — רשת לוגואים אחידה: מציגה את *כל* הלוגואים בבת אחת,
   כל אחד בכרטיס זהה (object-fit: contain → גודל אחיד, אף פעם לא חתוך).
   פשוט וחסין — בלי אנימציה שעלולה "להחביא" לוגואים.
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url

export default function LogoCarousel({ logos = [] }) {
  const list = (logos || []).filter((l) => srcOf(l) || l.name)
  if (!list.length) return null

  return (
    <div className="logo-grid" role="list" aria-label="שותפים ולקוחות">
      {list.map((logo, i) => {
        const src = srcOf(logo)
        return (
          <div className="logo-grid__item" role="listitem" key={i}>
            {src
              ? <img className="logo-grid__img" src={src} alt={logo.name || ''} loading="lazy" decoding="async" />
              : <span className="logo-grid__name">{logo.name}</span>}
          </div>
        )
      })}
    </div>
  )
}
