import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import { HOME_FAQ_TITLE, HOME_FAQS } from '../../data/homeFaq.js'
import '../../pages/SharonHub.css'

/* שאלות ותשובות בעמוד הבית. הטקסט מ-data/homeFaq.js, אותו מקור שה-prerender
   כותב ל-HTML הסטטי, וה-FAQPage נבנה בעמוד הבית מאותן שאלות בדיוק. */
export default function HomeFaq() {
  return (
    <section className="section section--soft lhub-faq" aria-labelledby="home-faq-title">
      <div className="container">
        <Reveal className="lhub-head">
          <span className="eyebrow">שאלות ותשובות</span>
          <h2 className="section-title" id="home-faq-title">{HOME_FAQ_TITLE}</h2>
        </Reveal>
        <div className="lhub-faq__list">
          {HOME_FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i, 5) * 0.04}>
              <details className="lhub-faq__item">
                <summary><span>{f.q}</span><Icon name="chevron" size={18} className="lhub-faq__chev" /></summary>
                <p>{f.a} <Link to={f.to}>{f.more}</Link></p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
