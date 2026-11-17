import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import LATEST from '../../data/_latest-articles.js'
import { COLUMNS } from '../../lib/seo.js'
import '../../pages/SharonHub.css'

/* "מהמדריכים": 6 הכתבות האחרונות, עם קישור רגיל לכל אחת. צ'קליסט האינדוקס:
   קישור מדף הבית לפוסטים האחרונים, כדי שגוגל יגיע אליהם מהר. הרשימה נוצרת בזמן
   build (scripts/generate-sitemap-paths.mjs), וכתבה עם תאריך עתידי לא מוצגת עד
   התאריך שלה. אותו עיצוב כמו השאלות בעמוד הבית (lhub-faq), בלי רכיב עיצוב חדש. */
export const LATEST_GUIDES_TITLE = 'מהמדריכים: הכתבות האחרונות'
export function latestGuides(n = 6, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })) {
  return LATEST.filter((a) => String(a.date).slice(0, 10) <= today).slice(0, n)
}

export default function LatestGuides() {
  const items = latestGuides()
  if (!items.length) return null
  return (
    <section className="section lhub-faq" aria-labelledby="home-latest-title">
      <div className="container">
        <Reveal className="lhub-head">
          <span className="eyebrow">מדריכים</span>
          <h2 className="section-title" id="home-latest-title">{LATEST_GUIDES_TITLE}</h2>
        </Reveal>
        <ul className="lhub-faq__list" style={{ listStyle: 'none', padding: 0 }}>
          {items.map((a, i) => (
            <Reveal as="li" key={a.path} delay={Math.min(i, 5) * 0.04} className="lhub-faq__item">
              <Link to={a.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.05rem 1.3rem', textDecoration: 'none', color: 'var(--color-text, #16202e)' }}>
                <span>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted, #5a6a7a)' }}>{COLUMNS[a.column]?.index}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>{a.title}</span>
                </span>
                <Icon name="arrowLeft" size={18} className="lhub-faq__chev" />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
