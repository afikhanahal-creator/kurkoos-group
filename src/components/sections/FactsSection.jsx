import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import './FactsSection.css'

/* ============================================================
   סקשן עובדות: כותרת, פסקאות, כרטיסים ושורת קישורים. משמש את עמודי
   האודות, הצוות, הפרויקטים, נדל"ן בשרון והמחשבונים, כל אחד עם בלוקים
   משלו מ-data/pageFacts.js. אותה שפה חזותית כמו כרטיסי השאלות בעמוד
   השרון: רקע לבן, מסגרת דקה ופינות מעוגלות.
   ============================================================ */
export default function FactsSection({ block }) {
  if (!block) return null
  const { id, eyebrow, title, paras = [], items = [], links = [], soft } = block
  const titleId = `facts-${id}-title`
  return (
    <section className={`section facts${soft ? ' section--soft' : ''}`} aria-labelledby={titleId}>
      <div className="container">
        <Reveal className="facts__head">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 className="section-title" id={titleId}>{title}</h2>
        </Reveal>
        {paras.length > 0 && (
          <Reveal className="facts__text">
            {paras.map((p, i) => <p key={i}>{p}</p>)}
          </Reveal>
        )}
        {items.length > 0 && (
          <ul className="facts__grid">
            {items.map((it, i) => (
              <Reveal as="li" key={it.t} delay={i * 0.05} className="facts__card">
                <h3>{it.t}</h3>
                <p>{it.d}</p>
                {it.to && <Link to={it.to} className="facts__more">{it.link || it.t}</Link>}
              </Reveal>
            ))}
          </ul>
        )}
        {links.length > 0 && (
          <Reveal className="facts__links">
            <ul>
              {links.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  )
}
