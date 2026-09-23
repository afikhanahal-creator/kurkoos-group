import { Link } from 'react-router-dom'
import site from '../../data/site.js'
import { track } from '../../lib/track.js'
import Icon from './Icon.jsx'
import './ArticleCta.css'

/* ============================================================
   סיום כתבה: מעבר מקריאה לפנייה.
   59 עמודי הכתבות הם רוב התנועה האורגנית של האתר, והם הסתיימו עד היום
   ב"לכל הכתבות" ובכתבות נוספות בלבד. קורא שסיים כתבה על בדק בית או על
   מס רכישה לא קיבל שום דרך ליצור קשר, ולכן התנועה הזו לא הפכה ללידים.
   הבלוק כאן צמוד לנושא הטור: הוא מציע את החטיבה הרלוונטית, ולא "צרו קשר"
   כללי, כי פנייה מתוך הקשר ממירה הרבה יותר טוב.
   ============================================================ */

const COLUMNS = {
  yazamut: {
    eyebrow: 'יזמות נדל"ן',
    title: 'מתכננים פרויקט יזמי?',
    text: 'קורקוס גרופ מלווה יזמים מאיתור הקרקע ובדיקות ההיתכנות, דרך התכנון והרישוי, ועד השיווק והמסירה.',
    to: '/divisions/development',
    linkLabel: 'לחטיבת היזמות',
  },
  constructions: {
    eyebrow: 'ביצוע ובנייה',
    title: 'מתכננים לבנות?',
    text: 'ראיתה, זרוע הביצוע של קורקוס גרופ, מבצעת פרויקטים למגורים משלב השלד ועד הגימור, עם בקרת איכות וניהול קבלני משנה.',
    to: '/divisions/execution',
    linkLabel: 'לחטיבת הביצוע',
  },
  supervision: {
    eyebrow: 'ניהול ופיקוח',
    title: 'רוצים מפקח מטעמכם באתר?',
    text: 'שכינתא מלווה פרויקטים בפיקוח הנדסי מטעם המזמין: בקרת תקציב ולוחות זמנים, בדיקות איכות וקבלה.',
    to: '/divisions/supervision',
    linkLabel: 'לחטיבת הפיקוח',
  },
  brokerage: {
    eyebrow: 'תיווך ושיווק',
    title: 'קונים או מוכרים נכס?',
    text: 'ליווי מלא לרוכשים ולמוכרים באזור השרון והמרכז, מהערכת השווי ועד החתימה.',
    to: '/divisions/brokerage',
    linkLabel: 'לחטיבת התיווך',
  },
  mentorguide: {
    eyebrow: 'ליווי יזמים',
    title: 'רוצים ליווי אישי בדרך?',
    text: 'תוכנית מנטורינג ליזמי נדל"ן צעירים עם שלומי קורקוס וצוות הקבוצה, על בסיס שלושים שנות ניסיון בשטח.',
    to: '/livy-yazamim',
    linkLabel: 'לתוכנית הליווי',
  },
}

export default function ArticleCta({ column = 'yazamut' }) {
  const c = COLUMNS[column] || COLUMNS.yazamut
  const tel = String(site.contact?.phone || '').replace(/[^\d+]/g, '')
  const wa = site.contact?.whatsapp

  const hit = (how) => track('article_cta', { column, how })

  return (
    <section className="art-cta">
      <div className="container art-cta__inner">
        <span className="art-cta__eyebrow">{c.eyebrow}</span>
        <h2 className="art-cta__title">{c.title}</h2>
        <p className="art-cta__text">{c.text}</p>

        <div className="art-cta__actions">
          {tel && (
            <a href={`tel:${tel}`} className="btn btn--primary art-cta__btn" onClick={() => hit('phone')}>
              <Icon name="phone" size={18} /> {site.contact.phoneDisplay}
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn art-cta__btn art-cta__btn--wa"
              onClick={() => hit('whatsapp')}
            >
              וואטסאפ
            </a>
          )}
          <Link to="/#contact" className="btn art-cta__btn art-cta__btn--ghost" onClick={() => hit('form')}>
            השארת פרטים
          </Link>
        </div>

        <Link to={c.to} className="art-cta__more" onClick={() => hit('service')}>
          {c.linkLabel} <Icon name="arrow" size={16} />
        </Link>
      </div>
    </section>
  )
}
