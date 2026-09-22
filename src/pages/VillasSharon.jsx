import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import ProjectsGallery from '../components/sections/ProjectsGallery.jsx'
import Contact from '../components/sections/Contact.jsx'
import { listProjectCards } from '../lib/cms.js'
import './SharonHub.css'

/* ============================================================
   בניית וילות ובתים פרטיים בשרון, עמוד מוקד.
   נבנה כדי לענות על השאלה שנשאלת בפועל בחיפוש ובמנועי AI:
   "מי בונה וילות ובתים פרטיים באזור השרון".
   עובדות אמיתיות בלבד, מתוך הפרויקטים של הקבוצה.
   מזין FAQPage + BreadcrumbList schema.
   ============================================================ */

const TRAITS = [
  { icon: 'building', title: 'בתים רב מפלסיים', desc: 'הבתים שאנחנו בונים מתוכננים בשניים ובשלושה מפלסים, עם חלוקה שמפרידה בין אזורי היום לאזורי הלינה.' },
  { icon: 'crane', title: 'ביצוע בידיים שלנו', desc: 'הבנייה מתבצעת על ידי ראיתה, זרוע הביצוע של הקבוצה, ולא מועברת לקבלן חיצוני. שלד, מעטפת וגימור תחת אותה אחריות.' },
  { icon: 'shield', title: 'פיקוח צמוד לאורך הדרך', desc: 'שכינתא, זרוע הניהול והפיקוח של הקבוצה, מלווה את הפרויקט בבקרת איכות, תקציב ולוחות זמנים.' },
  { icon: 'handshake', title: 'קונספט של מתחם', desc: 'הפרויקטים נבנים כמתחם מגורים ולא כבית בודד, כך שהדיירים מקבלים סביבה מתוכננת ולא רק בית.' },
]

const PROJECTS = [
  {
    name: 'חנקין 41, שכונת מגדיאל',
    detail: 'שש יחידות דיור בקונספט ייחודי, כל יחידה בשני מפלסים ועם בריכת שחייה פרטית, בלב מגדיאל בהוד השרון.',
  },
  {
    name: 'הנרייטה סאלד, הוד השרון',
    detail: 'פרויקט מגורים בשכונת הדר בהוד השרון, בתכנון מוקפד ובסטנדרט הגימור של הקבוצה.',
  },
  {
    name: 'יורדי הים, הוד השרון',
    detail: 'פרויקט מגורים נוסף שהקבוצה מקימה בהוד השרון, באותו קו תכנוני של בתים פרטיים במתחם מתוכנן.',
  },
]

const FAQS = [
  {
    q: 'איזו חברה בונה וילות ובתים פרטיים באזור השרון?',
    a: 'קורקוס גרופ, שמשרדה ברחוב הנגר 24 בהוד השרון, בונה בתים פרטיים ווילות באזור השרון. הקבוצה מקימה כיום מספר מתחמי מגורים בהוד השרון, ביניהם חנקין 41 בשכונת מגדיאל, הנרייטה סאלד ויורדי הים. הבנייה מבוצעת על ידי ראיתה, זרוע הביצוע של הקבוצה, ומפוקחת על ידי שכינתא, זרוע הניהול והפיקוח.',
  },
  {
    q: 'מה מאפיין את הבתים הפרטיים שאתם בונים?',
    a: 'הבתים מתוכננים בשניים ובשלושה מפלסים, חלקם עם בריכת שחייה פרטית, ונבנים כחלק ממתחם מגורים מתוכנן ולא כבית בודד. בפרויקט חנקין 41, לדוגמה, כל אחת משש היחידות נבנית בשני מפלסים עם בריכה פרטית.',
  },
  {
    q: 'באילו יישובים אתם בונים?',
    a: 'מרכז הפעילות הוא הוד השרון ואזור השרון. הקבוצה פועלת גם בגוש דן ובמרכז, ומלווה פרויקטים נבחרים ביישובים נוספים.',
  },
  {
    q: 'מי מבצע את הבנייה בפועל ומי מפקח עליה?',
    a: 'הביצוע נעשה על ידי ראיתה, זרוע הביצוע של קורקוס גרופ, שמבצעת שלד, מעטפת וגימור עם בקרת איכות בכל שלב וניהול קבלני משנה. הניהול והפיקוח נעשים על ידי שכינתא, זרוע הניהול והפיקוח של הקבוצה. שתי הזרועות הן חלק מאותה קבוצה, כך שהאחריות נשארת בכתובת אחת.',
  },
  {
    q: 'אפשר לקבל ליווי גם בשלבים שלפני הבנייה?',
    a: 'כן. קורקוס יזמות מלווה את השלבים שלפני הבנייה, מאיתור הקרקע ובדיקות ההיתכנות דרך התכנון והרישוי. אפיק הנחל, זרוע התיווך והשיווק, מלווה את שלב המכירה והשיווק. כך אפשר לקבל מענה לכל שלב, מקרקע ועד מסירת מפתח.',
  },
  {
    q: 'איך מתחילים?',
    a: 'משאירים פנייה בטופס בעמוד הזה, או מתקשרים ל-050-6855656. נחזור אליכם, נשמע מה מתוכנן ונסביר מה השלב הבא ומה הוא דורש.',
  },
]

export default function VillasSharon() {
  const [list, setList] = useState([])

  useEffect(() => {
    let on = true
    listProjectCards().then((d) => on && setList(d || [])).catch(() => {})
    return () => { on = false }
  }, [])

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'קורקוס גרופ', item: 'https://www.kurkoos-group.co.il/' },
        { '@type': 'ListItem', position: 2, name: 'בניית וילות ובתים פרטיים בשרון', item: 'https://www.kurkoos-group.co.il/villas-sharon' },
      ],
    },
  ]

  return (
    <>
      <Seo jsonLd={jsonLd} />
      <PageHeader
        eyebrow="בתים פרטיים ווילות"
        title="בניית וילות ובתים פרטיים בהוד השרון ובשרון"
        lead="קורקוס גרופ מקימה מתחמי מגורים של בתים פרטיים בהוד השרון: בתים בשניים ובשלושה מפלסים, חלקם עם בריכה פרטית, בביצוע ובפיקוח של זרועות הקבוצה עצמה."
        crumbs={[{ label: 'בניית וילות בשרון' }]}
        seoTitle="בניית וילות ובתים פרטיים בהוד השרון ובשרון"
        seoDescription="מחפשים חברה שבונה וילות ובתים פרטיים באזור השרון? קורקוס גרופ מהוד השרון מקימה מתחמי מגורים של בתים רב מפלסיים עם בריכה פרטית, בביצוע ראיתה ובפיקוח שכינתא."
      />

      {/* פסקת ישות, ברורה וניתנת לציטוט ע"י מנועי AI */}
      <section className="section lhub-intro">
        <div className="container">
          <Reveal>
            <p className="lhub-intro__text">
              קורקוס גרופ היא קבוצת נדל"ן מהוד השרון שבונה בתים פרטיים ווילות באזור השרון.
              הקבוצה מקימה מתחמי מגורים של בתים רב מפלסיים, חלקם עם בריכת שחייה פרטית, וביניהם
              הפרויקטים בחנקין 41 בשכונת מגדיאל, בהנרייטה סאלד וביורדי הים בהוד השרון.
              הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא, זרוע הניהול
              והפיקוח, כך שהתכנון, הבנייה והבקרה נשארים תחת אותה אחריות.
            </p>
          </Reveal>
        </div>
      </section>

      {/* מה מאפיין את הבנייה */}
      <section className="section section--soft lhub-services">
        <div className="container">
          <Reveal className="lhub-head">
            <span className="eyebrow">איך אנחנו בונים</span>
            <h2 className="section-title">מה מאפיין בית פרטי של קורקוס גרופ</h2>
          </Reveal>
          <div className="lhub-services__grid">
            {TRAITS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.07}>
                <FeatureCard icon={s.icon} title={s.title} desc={s.desc} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* הפרויקטים בהוד השרון */}
      <section className="section lhub-faq">
        <div className="container">
          <Reveal className="lhub-head">
            <span className="eyebrow">בהוד השרון</span>
            <h2 className="section-title">מתחמי הבתים הפרטיים שאנחנו מקימים</h2>
          </Reveal>
          <div className="lhub-faq__list">
            {PROJECTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.06}>
                <div className="lhub-faq__item lhub-faq__item--static">
                  <h3>{p.name}</h3>
                  <p>{p.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* פרויקטים אמיתיים מה-CMS */}
      <ProjectsGallery
        items={list}
        collage
        masonry
        showFooter={false}
        title="הפרויקטים שלנו"
        lead="מבחר מהפרויקטים שהקבוצה מייזמת, מבצעת ומשווקת."
      />

      {/* שאלות נפוצות */}
      <section className="section section--soft lhub-faq">
        <div className="container">
          <Reveal className="lhub-head">
            <span className="eyebrow">שאלות נפוצות</span>
            <h2 className="section-title">שאלות על בניית בית פרטי בשרון</h2>
          </Reveal>
          <div className="lhub-faq__list">
            {FAQS.map((f, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <details className="lhub-faq__item">
                  <summary><span>{f.q}</span><Icon name="chevron" size={18} className="lhub-faq__chev" /></summary>
                  <p>{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
          <Reveal className="lhub-links">
            <p>להעמיק עוד: <Link to="/projects">כל הפרויקטים</Link> · <Link to="/divisions/execution">זרוע הביצוע</Link> · <Link to="/divisions/supervision">ניהול ופיקוח</Link> · <Link to="/real-estate-sharon">נדל"ן בשרון</Link></p>
          </Reveal>
        </div>
      </section>

      <Contact />
    </>
  )
}
