import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import Seo from '../components/ui/Seo.jsx'
import './NotFound.css'

/* ============================================================
   עמוד 404.
   הוא גם התשובה לכתובות ישנות שכבר לא קיימות, ולכן הוא לא יכול להיות
   רק מספר וכפתור לדף הבית. מי שהגיע לכאן מגוגל או מקישור ישן צריך למצוא
   דרך להמשיך, אחרת הוא פשוט חוזר אחורה.
   ============================================================ */

const LINKS = [
  { to: '/projects', he: 'הפרויקטים', en: 'Projects' },
  { to: '/villas-sharon', he: 'בניית וילות ובתים פרטיים', en: 'Villas and private homes' },
  { to: '/divisions/execution', he: 'ביצוע ובנייה', en: 'Execution and construction' },
  { to: '/divisions/supervision', he: 'ניהול ופיקוח פרויקטים', en: 'Project management and supervision' },
  { to: '/divisions/development', he: 'יזמות נדל"ן', en: 'Real estate development' },
  { to: '/divisions/brokerage', he: 'תיווך ושיווק נכסים', en: 'Brokerage' },
  { to: '/real-estate-guide', he: 'המדריך לרוכש ולמוכר', en: 'Buyer and seller guide' },
  { to: '/real-estate-glossary', he: 'מילון מונחי נדל"ן', en: 'Real estate glossary' },
]

export default function NotFound() {
  const { t, lang } = useI18n()
  const he = lang !== 'en'
  return (
    <section className="section nf">
      {/* noindex: כתובת שלא קיימת לא אמורה להיכנס לאינדקס */}
      <Seo title={he ? 'העמוד לא נמצא' : 'Page not found'} noindex />
      <div className="container nf__inner">
        <motion.h1
          className="nf__code"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          404
        </motion.h1>
        <motion.p
          className="nf__lead"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {he
            ? 'העמוד שחיפשתם לא קיים, או שהכתובת שלו השתנתה.'
            : 'The page you were looking for does not exist, or its address has changed.'}
        </motion.p>

        <motion.nav
          className="nf__links"
          aria-label={he ? 'עמודים מרכזיים' : 'Main pages'}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="nf__link">{he ? l.he : l.en}</Link>
          ))}
        </motion.nav>

        <motion.div
          className="nf__cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Link to="/" className="btn btn--primary btn--lg">{t('nav.home')}</Link>
          <Link to="/#contact" className="btn btn--dark btn--lg">{he ? 'דברו איתנו' : 'Contact us'}</Link>
        </motion.div>
      </div>
    </section>
  )
}
