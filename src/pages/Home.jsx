import Seo from '../components/ui/Seo.jsx'
import PageRenderer from '../lib/pageBuilder/PageRenderer.jsx'
import HOME_DEF from '../lib/pageBuilder/defs/home.js'
import { usePageLayout } from '../lib/pageBuilder/layout.js'
import { HOME_FAQS } from '../data/homeFaq.js'

/* FAQPage מהשאלות שמוצגות בעמוד (HomeFaq), אותו מקור שה-prerender משתמש בו */
const HOME_FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

const HOME_TITLE = 'בניית וילות ובתים פרטיים, יזמות ופיקוח בנייה בהוד השרון'
const HOME_DESC = 'קבוצת קורקוס (קורקוס גרופ) מהוד השרון בונה וילות ובתים פרטיים, גם ללקוחות פרטיים על המגרש שלהם, ומפקחת על בנייה מטעם המזמין. יזמות, ביצוע, פיקוח ותיווך נדל"ן בהוד השרון ובאזור המרכז, מהקרקע ועד המפתח.'

/* מבנה העמוד מגיע מעורך העמודים (לשונית "עמודים" בניהול). בלי גרסה מפורסמת,
   הסדר הקבוע מהקוד: פתיחה, תחומים, סיפור, פרויקטים, שרשרת ערך, מספרים,
   המלצות, שותפים, שאלות ויצירת קשר. */
export default function Home() {
  const { layout, seo } = usePageLayout('/', HOME_DEF)
  return (
    <>
      <Seo title={seo.title || HOME_TITLE} description={seo.description || HOME_DESC} jsonLd={HOME_FAQ_LD} />
      <div className="home">
        <PageRenderer layout={layout} />
      </div>
    </>
  )
}
