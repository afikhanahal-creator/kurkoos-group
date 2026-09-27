import { Link } from 'react-router-dom'
import { track } from '../../lib/track.js'
import Icon from './Icon.jsx'
import './ArticleCta.css'

/* ============================================================
   כרטיס פנייה בסוף גוף הכתבה, במקום שבו הקורא מסיים לקרוא.
   הכפתור הראשי מוביל ישר לטופס, עם הנושא כבר מסומן וייחוס לכתבה,
   והקישור לעמוד השירות נשאר כאפשרות משנית.
   ============================================================ */

export const contactHrefFor = (topic) => `/contact?topic=${topic}&src=article`

export default function ArticleLeadCard({ column, topic, title, text, serviceTo, serviceLabel }) {
  const hit = (how) => track('article_cta', { column, how, place: 'body' })
  return (
    <div className="art-lead">
      <div className="art-lead__txt">
        <strong className="art-lead__title">{title}</strong>
        <span className="art-lead__text">{text}</span>
      </div>
      <div className="art-lead__actions">
        <Link to={contactHrefFor(topic)} className="btn btn--primary btn--lg art-lead__btn" onClick={() => hit('form')}>
          להשארת פרטים <Icon name="arrowLeft" size={18} />
        </Link>
        {serviceTo && (
          <Link to={serviceTo} className="art-lead__more" onClick={() => hit('service')}>
            {serviceLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
