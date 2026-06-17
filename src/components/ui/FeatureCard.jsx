import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import ResponsiveImage from './ResponsiveImage.jsx'
import { srcOfResponsive, optimizeSrc } from '../../lib/responsiveImage.js'
import '../sections/Activities.css'

/* ============================================================
   FeatureCard — כרטיס 3D אחיד לכל האתר (אפקט מדף הבית):
   ריחוף עם הטיה, נוזל מטושטש, ברק, זוהר ואייקון שמתרומם.
   icon, title, desc חובה. to + cta אופציונליים → מציגים פוטר
   "קראו עוד" והופכים את הכרטיס לקישור.
   ============================================================ */
export default function FeatureCard({ icon, title, desc, to, cta, image, className = '' }) {
  const rawImg = srcOfResponsive(image)
  const hasImage = !!rawImg
  const bgUrl = hasImage ? optimizeSrc(rawImg, 700) : ''
  const inner = (
    <div className="card-inner">
      <span className="card__liquid" aria-hidden="true" />
      <span className="card__shine" aria-hidden="true" />
      <span className="card__glow" aria-hidden="true" />
      <div className="card__content">
        <div
          className={`card__image ${hasImage ? 'card__image--photo' : ''}`}
          style={hasImage ? { '--card-bg': `url("${bgUrl}")` } : undefined}
        >
          {hasImage ? (
            <>
              {/* רקע מטושטש של אותה תמונה — ממלא את הכרטיס כשהתמונה הוקטנה (zoom-out) או ב-contain */}
              <span className="card__img-backdrop" aria-hidden="true" />
              <ResponsiveImage value={image} className="card__img" alt="" w={700} />
              <span className="card__img-badge" aria-hidden="true"><Icon name={icon} size={22} stroke={1.8} /></span>
            </>
          ) : (
            <Icon name={icon} size={48} stroke={1.5} />
          )}
        </div>
        <div className="card__text">
          <h3 className="card__title">{title}</h3>
          <p className="card__description">{desc}</p>
        </div>
        {cta && (
          <div className="card__footer">
            <span className="card__price">{cta}</span>
            <span className="card__button">
              <Icon name="arrow" size={16} />
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return to ? (
    <Link to={to} className={`card-effect ${className}`}>{inner}</Link>
  ) : (
    <div className={`card-effect ${className}`}>{inner}</div>
  )
}
