import { Link } from 'react-router-dom'
import site from '../../data/site.js'
import { track } from '../../lib/track.js'
import Icon from './Icon.jsx'
import '../../pages/SharonHub.css'

export { PRIVATE_HOUSE_GUIDES } from '../../data/villasPage.js'

/* ============================================================
   סיום של מקטע שאלות נפוצות: מי שקרא עד כאן ועדיין מתלבט מקבל כפתור
   ברור לטופס, ומתחתיו המדריכים כתגיות לחיצות ולא כשורת קישורים.
   `to` שמתחיל ב-# גולל לטופס שבאותו עמוד, אחרת מוביל לעמוד הטופס.
   ============================================================ */

export const BUILD_GUIDES = [
  { to: '/constructions/kama-ole-livnot-bayit-prati', label: 'כמה עולה לבנות בית פרטי' },
  { to: '/constructions/kablan-mafteach-o-nihul-atzmi', label: 'קבלן מפתח או ניהול עצמי' },
  { to: '/constructions/livchor-chevrat-bniya-bayit-prati', label: 'איך בוחרים חברת בנייה' },
  { to: '/construction-supervision/mefakeach-bniya-bayit-prati', label: 'מה בודק מפקח בנייה' },
]

export default function FaqCta({ to = '/contact?topic=construction&src=faq', placement = 'faq', guides = BUILD_GUIDES }) {
  const tel = String(site.contact?.phone || '').replace(/[^\d+]/g, '')
  const onForm = () => track('cta_click', { placement: `${placement}_form` })
  return (
    <div className="faq-cta">
      <div className="faq-cta__box">
        <strong className="faq-cta__title">לא מצאתם את התשובה?</strong>
        <p className="faq-cta__text">השאירו פרטים ונחזור אליכם עם תשובה לשאלה שלכם, בלי התחייבות.</p>
        <div className="faq-cta__actions">
          {to.startsWith('#') ? (
            <a href={to} className="btn btn--primary btn--lg faq-cta__btn" onClick={onForm}>
              להשארת פרטים <Icon name="arrowLeft" size={18} />
            </a>
          ) : (
            <Link to={to} className="btn btn--primary btn--lg faq-cta__btn" onClick={onForm}>
              להשארת פרטים <Icon name="arrowLeft" size={18} />
            </Link>
          )}
          {tel && (
            <a href={`tel:${tel}`} className="faq-cta__phone" onClick={() => track('phone_click', { placement })}>
              <Icon name="phone" size={16} /> {site.contact.phoneDisplay}
            </a>
          )}
        </div>
      </div>

      {guides.length > 0 && (
        <div className="faq-cta__guides">
          <span className="faq-cta__guides-title">מדריכים שכדאי לקרוא לפני שמחליטים</span>
          <div className="faq-cta__chips">
            {guides.map((g) => (
              <Link key={g.to} to={g.to} className="faq-cta__chip">{g.label}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
