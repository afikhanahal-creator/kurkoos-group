import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import ProjectsGallery from '../components/sections/ProjectsGallery.jsx'
import Contact from '../components/sections/Contact.jsx'
import projectsSeed from '../data/projects.js'
import { supabase } from '../lib/supabase.js'
import { listProjectCards, cmsRowToCard } from '../lib/cms.js'
import './SharonHub.css'

/* ============================================================
   נדל"ן בהוד השרון ובאזור המרכז, עמוד מוקד מקומי (Local Hub).
   עובדות אמיתיות בלבד: מיקום המשרד, זרועות הקבוצה, והפרויקטים
   מה-CMS. מזין FAQPage + BreadcrumbList schema.
   ============================================================ */

const SERVICES = [
  { to: '/divisions/development', icon: 'building', title: 'יזמות נדל"ן', desc: 'ייזום פרויקטים למגורים מאיתור הקרקע ובדיקות ההיתכנות ועד השיווק והמסירה.' },
  { to: '/divisions/execution', icon: 'crane', title: 'ביצוע ובנייה', desc: 'ביצוע פרויקטים באמצעות ראיתה, זרוע הביצוע של הקבוצה, עם בקרת איכות בכל שלב.' },
  { to: '/divisions/supervision', icon: 'shield', title: 'ניהול ופיקוח פרויקטים', desc: 'פיקוח מקצועי מטעם המזמין באמצעות שכינתא ניהול ויזום פרויקטים.' },
  { to: '/divisions/brokerage', icon: 'handshake', title: 'תיווך ושיווק נכסים', desc: 'תיווך, שיווק פרויקטים וליווי מוכרים ורוכשים באמצעות אפיק הנחל.' },
]

const FAQS = [
  { q: 'אילו שירותי נדל"ן קורקוס גרופ מציעה באזור השרון?', a: 'קורקוס גרופ מאגדת ארבע זרועות פעילות: יזמות נדל"ן (קורקוס יזמות), ביצוע ובנייה (ראיתה), ניהול ופיקוח פרויקטים (שכינתא) ותיווך ושיווק נכסים (אפיק הנחל). כך אפשר לקבל מענה לכל שלב בחיי פרויקט או עסקה, מקרקע ועד מסירת מפתח, תחת קורת גג אחת.' },
  { q: 'איפה נמצא המשרד שלכם?', a: 'המשרד שלנו נמצא ברחוב הנגר 24 בהוד השרון, מגדלי Amy קומה 2. שעות הפעילות: ימים א׳ עד ה׳ בין 9:00 ל-18:00, ואפשר תמיד להשאיר פנייה דרך האתר או בוואטסאפ ונחזור אליכם.' },
  { q: 'באילו אזורים אתם פועלים?', a: 'הבסיס שלנו בהוד השרון והפעילות מתרכזת באזור השרון והמרכז, לצד פרויקטים נבחרים בשיווק ובליווי ברחבי הארץ. את הפרויקטים העדכניים אפשר לראות בעמוד הפרויקטים שלנו.' },
  { q: 'מה היתרון בקבוצה שמאגדת יזמות, ביצוע ופיקוח יחד?', a: 'כשהייזום, הביצוע והבקרה יושבים באותה קבוצה, האחריות לא מתפזרת בין גורמים: מי שתכנן את הפרויקט הוא גם מי שאחראי שהוא ייבנה באיכות ובלוח הזמנים שהובטחו. בנוסף, הניסיון המצטבר מכל זרוע משרת את האחרות, הידע מהשטח משפר את התכנון, והידע התכנוני משפר את הביצוע.' },
]

export default function SharonHub() {
  const [list, setList] = useState(() => projectsSeed.slice(0, 6))

  useEffect(() => {
    if (!supabase) return
    let alive = true
    listProjectCards()
      .then((rows) => { if (alive && rows && rows.length) setList(rows.slice(0, 6).map(cmsRowToCard)) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'קורקוס גרופ', item: 'https://www.kurkoos-group.co.il/' },
        { '@type': 'ListItem', position: 2, name: 'נדל"ן בהוד השרון ובאזור המרכז', item: 'https://www.kurkoos-group.co.il/real-estate-sharon' },
      ],
    },
  ]

  return (
    <>
      <Seo
        title='נדל"ן בהוד השרון ובאזור המרכז: יזמות, ביצוע, פיקוח ותיווך'
        description='מחפשים חברת נדל"ן באזור השרון? קורקוס גרופ, שמשרדה בהוד השרון, מלווה פרויקטים ועסקאות באזור השרון והמרכז: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים, תיווך ושיווק נכסים.'
        jsonLd={jsonLd}
      />
      <PageHeader
        noSeo   /* ה-SEO של העמוד מוגדר ב-Seo שמעליו, מקור אחד בלבד */
        eyebrow="אזור הפעילות שלנו"
        title='נדל"ן בהוד השרון ובאזור המרכז'
        lead='קורקוס גרופ פועלת מהוד השרון ומלווה פרויקטים ועסקאות נדל"ן ברחבי השרון והמרכז: יזמות, ביצוע ובנייה, ניהול ופיקוח, תיווך ושיווק נכסים, מקרקע ועד מסירת מפתח.'
        crumbs={[{ label: 'נדל"ן בשרון' }]}
      />

      {/* פסקת ישות, ברורה וניתנת לציטוט ע"י מנועי AI */}
      <section className="section lhub-intro">
        <div className="container">
          <Reveal>
            <p className="lhub-intro__text">
              קורקוס גרופ היא קבוצת נדל"ן שמשרדה ברחוב הנגר 24 בהוד השרון. הקבוצה פועלת בארבעה תחומים משלימים:
              יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים, ותיווך ושיווק נכסים, עם פעילות באזור השרון והמרכז
              ופרויקטים נבחרים ברחבי הארץ. המבנה הזה מאפשר ללוות פרויקט או עסקה מהשלב הראשון ועד האחרון, עם כתובת אחת ואחריות אחת.
            </p>
          </Reveal>
        </div>
      </section>

      {/* השירותים באזור */}
      <section className="section section--soft lhub-services">
        <div className="container">
          <Reveal className="lhub-head">
            <span className="eyebrow">מה אנחנו עושים</span>
            <h2 className="section-title">שירותי הנדל"ן שלנו בשרון והמרכז</h2>
          </Reveal>
          {/* FeatureCard, אותו כרטיס ואותו אפקט תלת ממד כמו בדף הבית ובעמודי הדיוויזיות */}
          <div className="lhub-services__grid">
            {SERVICES.map((s, i) => (
              <Reveal key={s.to} delay={i * 0.07}>
                <FeatureCard icon={s.icon} title={s.title} desc={s.desc} to={s.to} cta="לעמוד השירות" />
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
        title="פרויקטים נבחרים"
        lead="מבחר מהפרויקטים שהקבוצה מובילה, מבצעת ומשווקת."
      />

      {/* שאלות נפוצות מקומיות */}
      <section className="section section--soft lhub-faq">
        <div className="container">
          <Reveal className="lhub-head">
            <span className="eyebrow">שאלות נפוצות</span>
            <h2 className="section-title">שאלות שנשאלות אצלנו במשרד</h2>
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
            <p>להעמיק עוד: <Link to="/villas-sharon">בניית וילות ובתים פרטיים</Link> · <Link to="/projects">כל הפרויקטים</Link> · <Link to="/real-estate-glossary">מילון מונחי נדל"ן</Link> · <Link to="/real-estate-calculators">מחשבוני נדל"ן</Link> · <Link to="/about">אודות הקבוצה</Link></p>
          </Reveal>
        </div>
      </section>

      <Contact />
    </>
  )
}
