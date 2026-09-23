import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import './NotFound.css'

/* ============================================================
   עמוד 404.
   הוא גם התשובה לכתובות ישנות שכבר לא קיימות, ולכן הוא לא יכול להיות
   רק מספר וכפתור לדף הבית. מי שהגיע לכאן מגוגל או מקישור ישן צריך למצוא
   דרך להמשיך, אחרת הוא פשוט חוזר אחורה.

   העמוד בנוי מאותם חלקים כמו שאר העמודים הפנימיים: כותרת עמוד כהה
   למעלה וכרטיסים מתחתיה, כדי שהוא ירגיש חלק מהאתר ולא מסך שגיאה.
   ============================================================ */

const LINKS = [
  {
    to: '/projects',
    he: { t: 'הפרויקטים', d: 'מה הקבוצה בונה עכשיו ומה כבר נמסר' },
    en: { t: 'Projects', d: 'What the group is building now' },
  },
  {
    to: '/villas-sharon',
    he: { t: 'בניית וילות ובתים פרטיים', d: 'מקרקע פרטית ועד מסירת מפתח' },
    en: { t: 'Villas and private homes', d: 'From private land to handover' },
  },
  {
    to: '/divisions/execution',
    he: { t: 'ביצוע ובנייה', d: 'ראיתה, זרוע הביצוע של הקבוצה' },
    en: { t: 'Execution and construction', d: 'The group’s execution arm' },
  },
  {
    to: '/divisions/supervision',
    he: { t: 'ניהול ופיקוח פרויקטים', d: 'שכינתא, פיקוח צמוד לאורך הבנייה' },
    en: { t: 'Project management and supervision', d: 'Close supervision throughout' },
  },
  {
    to: '/divisions/development',
    he: { t: 'יזמות נדל"ן', d: 'איתור קרקע, תכנון וליווי העסקה' },
    en: { t: 'Real estate development', d: 'Land, planning and the deal' },
  },
  {
    to: '/divisions/brokerage',
    he: { t: 'תיווך ושיווק נכסים', d: 'אפיק הנחל, קנייה, מכירה והשכרה' },
    en: { t: 'Brokerage', d: 'Buying, selling and renting' },
  },
  {
    to: '/real-estate-guide',
    he: { t: 'המדריך לרוכש ולמוכר', d: 'כל שלב בעסקה, בשפה ברורה' },
    en: { t: 'Buyer and seller guide', d: 'Every stage, in plain language' },
  },
  {
    to: '/real-estate-glossary',
    he: { t: 'מילון מונחי נדל"ן', d: 'המונחים שחוזרים בכל חוזה' },
    en: { t: 'Real estate glossary', d: 'The terms behind every contract' },
  },
]

export default function NotFound() {
  const { t, lang } = useI18n()
  const he = lang !== 'en'

  return (
    <>
      {/* noindex: כתובת שלא קיימת לא אמורה להיכנס לאינדקס */}
      <PageHeader
        noindex
        eyebrow="404"
        title={he ? 'העמוד לא נמצא' : 'Page not found'}
        lead={he
          ? 'העמוד שחיפשתם לא קיים, או שהכתובת שלו השתנתה. אלה העמודים המרכזיים באתר, וכנראה שמה שחיפשתם נמצא באחד מהם.'
          : 'The page you were looking for does not exist, or its address has changed. Here are the main pages on the site.'}
      />

      <section className="section nf">
        <div className="container">
          <div className="nf__grid">
            {LINKS.map((l, i) => {
              const c = he ? l.he : l.en
              return (
                <Reveal key={l.to} variant="up" delay={Math.min(i, 5) * 0.05}>
                  <Link to={l.to} className="nf__card">
                    <span className="nf__card-title">{c.t}</span>
                    <span className="nf__card-desc">{c.d}</span>
                    <span className="nf__card-go" aria-hidden="true"><Icon name="arrow" size={17} /></span>
                  </Link>
                </Reveal>
              )
            })}
          </div>

          <div className="nf__cta">
            <Link to="/" className="btn btn--primary btn--lg">{t('nav.home')}</Link>
            <Link to="/contact" className="btn btn--dark btn--lg">{he ? 'השארת פרטים' : 'Leave your details'}</Link>
          </div>
        </div>
      </section>
    </>
  )
}
