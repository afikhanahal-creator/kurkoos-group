import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import './HeroCollage.css'

/* ============================================================
   HeroCollage — גלריית "בנטו": כרטיסים לאורך + כרטיסים רחבים (לרוחב),
   כמו במקור. בריחוף עולה "תריס" עם שם + תיאור + קישור.
   items: [{ url, name, desc, to, layout }]
   layout: 'wide' (לרוחב, 2 עמודות) | 'tall' (גבוה) | רגיל (ברירת מחדל)
   ============================================================ */
export default function HeroCollage({ title, subtitle, stats = [], items = [], cta = '' }) {
  return (
    <section className="hero-collage">
      <div className="container hero-collage__head">
        <h1 className="hero-collage__title">{title}</h1>
        {subtitle && <p className="hero-collage__subtitle">{subtitle}</p>}
      </div>

      <div className="container">
        <div className="hc-grid">
          {items.map((it, i) => (
            <Link
              key={i}
              to={it.to}
              className={`hc-card hc-card--${it.layout || 'normal'}`}
              aria-label={it.name}
            >
              <img
                src={it.url}
                alt={it.name}
                draggable={false}
                loading="lazy"
              />

              {/* תווית שם תמידית */}
              <span className="hc-card__name">{it.name}</span>

              {/* תריס שעולה בריחוף */}
              <span className="hc-card__shutter">
                <span className="hc-card__shutter-bar" />
                <strong className="hc-card__shutter-title">{it.name}</strong>
                {it.desc && <span className="hc-card__shutter-desc">{it.desc}</span>}
                <span className="hc-card__shutter-cta">
                  {cta}
                  <Icon name="arrow" size={16} className="hc-card__arrow" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="container hero-collage__stats">
          {stats.map((s, i) => (
            <div key={i} className="hc-stat">
              <p className="hc-stat__v">{s.value}</p>
              <p className="hc-stat__l">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
