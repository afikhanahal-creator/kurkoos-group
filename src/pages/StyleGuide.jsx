import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Icon from '../components/ui/Icon.jsx'
import './StyleGuide.css'

/* דף Style Guide חי — מתעד את שכבת ה-Flat Design 2.0 (tokens + רכיבים). */

const colors = [
  ['--color-primary-900', 'primary-900'],
  ['--color-primary-700', 'primary-700'],
  ['--color-primary-500', 'primary-500'],
  ['--color-primary-300', 'primary-300'],
  ['--color-primary-100', 'primary-100'],
  ['--color-accent-600', 'accent-600'],
  ['--color-accent-500', 'accent-500'],
  ['--color-accent-100', 'accent-100'],
  ['--color-surface', 'surface'],
  ['--color-surface-alt', 'surface-alt'],
  ['--color-border', 'border'],
  ['--color-text', 'text'],
  ['--color-text-muted', 'text-muted'],
  ['--color-success', 'success'],
  ['--color-warning', 'warning'],
  ['--color-error', 'error'],
  ['--color-info', 'info'],
]

const shadows = ['--shadow-1', '--shadow-2', '--shadow-3', '--shadow-4']
const radii = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-pill']

export default function StyleGuide() {
  return (
    <>
      <PageHeader eyebrow="Flat Design 2.0" title="Style Guide" lead="שכבת העיצוב של קורקוס גרופ — tokens ורכיבים." crumbs={[{ label: 'Style Guide' }]} noindex />

      <section className="section sg">
        <div className="container">
          {/* צבעים */}
          <h2 className="sg__title">צבעים / Color tokens</h2>
          <div className="sg__swatches">
            {colors.map(([token, name]) => (
              <div className="sg__swatch" key={token}>
                <span className="sg__chip" style={{ background: `var(${token})` }} />
                <code>{name}</code>
              </div>
            ))}
          </div>

          {/* טיפוגרפיה */}
          <h2 className="sg__title">טיפוגרפיה / Type scale</h2>
          <div className="sg__type">
            <p style={{ font: '700 var(--fs-hero)/1.1 var(--font-heading)' }}>Display · כותרת ראשית</p>
            <p style={{ font: '700 var(--fs-h1)/1.2 var(--font-heading)' }}>H1 · כותרת עמוד</p>
            <p style={{ font: '600 var(--fs-h2)/1.25 var(--font-heading)' }}>H2 · כותרת סקשן</p>
            <p style={{ font: '600 var(--fs-h3)/1.3 var(--font-heading)' }}>H3 · כותרת כרטיס</p>
            <p style={{ font: '400 var(--fs-body-lg)/1.6 var(--font-body)' }}>Body Large · פסקת פתיחה</p>
            <p style={{ font: '400 var(--fs-body)/1.6 var(--font-body)' }}>Body · טקסט רגיל לקריאה נוחה.</p>
            <p style={{ font: '500 var(--fs-small)/1.5 var(--font-body)', color: 'var(--color-text-muted)' }}>Small · כיתוב ומטא</p>
            <p className="sg__price">₪ 2,450,000 <span style={{ fontSize: '0.5em', color: 'var(--color-text-muted)' }}>price</span></p>
          </div>

          {/* כפתורים */}
          <h2 className="sg__title">כפתורים / Buttons</h2>
          <div className="sg__row">
            <button className="btn btn--primary">Primary</button>
            <button className="btn btn--dark">Dark</button>
            <button className="btn btn--ghost">Ghost</button>
            <button className="btn btn--primary" disabled style={{ opacity: 0.5, pointerEvents: 'none' }}>Disabled</button>
          </div>

          {/* תגיות */}
          <h2 className="sg__title">תגיות / Badges</h2>
          <div className="sg__row">
            <span className="sg__badge sg__badge--success">למכירה</span>
            <span className="sg__badge sg__badge--warning">נותרו מעט</span>
            <span className="sg__badge sg__badge--accent">חדש</span>
            <span className="sg__badge sg__badge--info">בלעדי</span>
          </div>

          {/* צללים */}
          <h2 className="sg__title">אלבטיה / Elevation</h2>
          <div className="sg__row">
            {shadows.map((s) => (
              <div key={s} className="sg__elev" style={{ boxShadow: `var(${s})` }}><code>{s.replace('--shadow-', 'shadow ')}</code></div>
            ))}
          </div>

          {/* רדיוס */}
          <h2 className="sg__title">רדיוס / Radius</h2>
          <div className="sg__row">
            {radii.map((r) => (
              <div key={r} className="sg__radius" style={{ borderRadius: `var(${r})` }}><code>{r.replace('--radius-', '')}</code></div>
            ))}
          </div>

          <p className="sg__back"><Link to="/" className="btn btn--ghost"><Icon name={'arrow'} size={18} /> חזרה לאתר</Link></p>
        </div>
      </section>
    </>
  )
}
