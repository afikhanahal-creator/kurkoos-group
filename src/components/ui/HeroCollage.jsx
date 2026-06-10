import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import useCountUp from '../../hooks/useCountUp.js'
import './HeroCollage.css'

/* מספר שסופר מ-0 ליעד כשנכנס לתצוגה — שומר על קידומת/סיומת (כמו "+" או "K").
   value הוא מחרוזת מוכנה (למשל "3200+"); מחלצים את החלק המספרי ומנפישים אותו. */
function StatValue({ value }) {
  const str = String(value ?? '')
  const m = str.match(/[\d,.]+/)
  const target = m ? Number(m[0].replace(/[^\d.]/g, '')) : NaN
  const [n, ref] = useCountUp(Number.isNaN(target) ? 0 : target)
  if (!m || Number.isNaN(target)) return <span ref={ref}>{str}</span>
  return (
    <span ref={ref}>
      {str.slice(0, m.index)}{n.toLocaleString('en-US')}{str.slice(m.index + m[0].length)}
    </span>
  )
}

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
              {it.url
                ? <img src={it.url} alt={it.name} draggable={false} loading="lazy" />
                : <span className="hc-card__ph" aria-hidden="true" />}

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
              <p className="hc-stat__v"><StatValue value={s.value} /></p>
              <p className="hc-stat__l">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
