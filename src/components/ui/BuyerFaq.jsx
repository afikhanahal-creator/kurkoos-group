import Reveal from './Reveal.jsx'
import Icon from './Icon.jsx'
import FaqCta from './FaqCta.jsx'
import { BUYER_FAQS } from '../../data/buyerFaqs.js'
import '../../pages/SharonHub.css'

/* שאלות רוכשים, בעיצוב ה-FAQ של שאר העמודים. בלי Structured Data כאן:
   אותו FAQPage בכל עמוד פרויקט היה נראה לגוגל ככפילות. ה-FAQPage מוצהר
   פעם אחת, בעמוד הווילות. */
export default function BuyerFaq({ title = 'שאלות שרוכשים שואלים לפני שמחליטים', soft = true, ctaTo, placement = 'buyer_faq' }) {
  return (
    <section className={`section${soft ? ' section--soft' : ''} lhub-faq`}>
      <div className="container">
        <Reveal className="lhub-head">
          <span className="eyebrow">לפני שפונים</span>
          <h2 className="section-title">{title}</h2>
        </Reveal>
        <div className="lhub-faq__list">
          {BUYER_FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i, 5) * 0.04}>
              <details className="lhub-faq__item">
                <summary><span>{f.q}</span><Icon name="chevron" size={18} className="lhub-faq__chev" /></summary>
                <p>{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <FaqCta to={ctaTo} placement={placement} />
        </Reveal>
      </div>
    </section>
  )
}
