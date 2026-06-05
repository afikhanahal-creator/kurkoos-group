import { Link } from 'react-router-dom'
import { useLocalized } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import './Logo.css'

/* ============================================================
   לוגו KURKOOS GROUP.
   קבצים: public/kurkoos-logo-h.svg (כהה) / kurkoos-logo-h-white.svg (לבן).
   להחלפה בלוגו רשמי — שמור באותם שמות.
   ============================================================ */
export default function Logo({ variant = 'dark' }) {
  const L = useLocalized()
  const src = variant === 'light' ? '/kurkoos-logo-h-white.svg' : '/kurkoos-logo-h.svg'

  return (
    <Link to="/" className={`logo logo--${variant}`} aria-label={L(site.name)}>
      <img src={src} alt={L(site.name)} className="logo__img" />
    </Link>
  )
}
