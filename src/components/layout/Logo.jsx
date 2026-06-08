import { Link } from 'react-router-dom'
import { useLocalized } from '../../i18n/index.jsx'
import { useSettings } from '../../lib/cms.js'
import site from '../../data/site.js'
import './Logo.css'

/* ============================================================
   לוגו KURKOOS GROUP.
   קבצים: public/kurkoos-logo-h.svg (כהה) / kurkoos-logo-h-white.svg (לבן).
   הגודל נשלט מה-CMS דרך הגדרת logo_scale (מכפיל; ברירת מחדל 1).
   ============================================================ */
export default function Logo({ variant = 'dark' }) {
  const L = useLocalized()
  const settings = useSettings()
  const src = variant === 'light' ? '/kurkoos-logo-h-white.svg' : '/kurkoos-logo-h.svg'
  const scale = Number(settings.logo_scale) || 1

  return (
    <Link to="/" className={`logo logo--${variant}`} aria-label={L(site.name)} style={{ '--logo-scale': scale }}>
      <img src={src} alt={L(site.name)} className="logo__img" />
    </Link>
  )
}
