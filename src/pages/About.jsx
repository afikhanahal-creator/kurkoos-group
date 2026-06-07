import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import KineticText from '../components/ui/KineticText.jsx'
import Stats from '../components/sections/Stats.jsx'
import ValueChain from '../components/sections/ValueChain.jsx'
import Partners from '../components/sections/Partners.jsx'
import Contact from '../components/sections/Contact.jsx'
import './About.css'

export default function About() {
  const { t, lang } = useI18n()

  const vision = lang === 'he'
    ? {
        eyebrow: 'החזון שלנו',
        heading: 'החזון של קורקוס גרופ',
        paragraphs: [
          'אנחנו מאמינים שבית הוא הרבה יותר ממבנה. הוא המקום שבו החיים קורים, המשפחה צומחת והחלומות הופכים למציאות.',
          'מתוך האמונה הזו הוקמה קורקוס גרופ על ידי שלומי קורקוס, איש מקצוע בעל מעל 30 שנות ניסיון בעולם הבנייה. לאחר עשרות פרויקטים שהוביל לאורך השנים, ומתוך היכרות עמוקה עם השטח, חומרי הגלם ותהליכי הביצוע, נולד החזון ליצור חברת נדל"ן שפועלת אחרת. כזו שאינה מתפשרת על איכות, על שירות או על אמינות.',
          'קורקוס גרופ פועלת לאורך כל שרשרת הערך של עולם הנדל"ן, החל מהיזמות והתכנון, דרך הבנייה והפיקוח ועד לשיווק וליווי הלקוחות. עבורנו, שליטה מלאה בכל שלב בתהליך היא המפתח ליצירת תוצאה מושלמת, תוך שמירה על סטנדרטים גבוהים ובלתי מתפשרים.',
          'אנו מאמינים שבנייה איכותית מתחילה באנשים. בצוות מקצועי ומנוסה, בשקיפות מלאה מול הלקוחות, בהקשבה אמיתית לצרכים ובמחויבות לכל פרט, קטן כגדול. זו הסיבה שכל פרויקט מנוהל על ידינו באופן אישי ומקצועי, מהשלבים הראשונים ועד למסירת המפתח.',
          'החזון שלנו הוא להוביל סטנדרט חדש של איכות מגורים, כזה המשלב תכנון חכם, עיצוב מוקפד, מפרט עשיר וביצוע ברמה הגבוהה ביותר. לא רק לבנות בתים, אלא ליצור סביבות מגורים שמעניקות ערך אמיתי לדיירים ומשביחות את איכות חייהם לאורך שנים.',
          'גם לאחר האכלוס המחויבות שלנו אינה מסתיימת. אנו ממשיכים לעמוד לצד לקוחותינו באחריות מלאה, מתוך הבנה שבניית אמון חשובה לא פחות מבניית בית.',
        ],
        tagline: 'קורקוס גרופ. יוזמים, בונים ומלווים מתוך אחריות, מקצועיות ותשוקה למצוינות.',
      }
    : {
        eyebrow: 'Our vision',
        heading: 'The Kurkoos Group Vision',
        paragraphs: [
          'We believe a home is far more than a structure. It is the place where life happens, where family grows, and where dreams become reality.',
          'From this belief, Kurkoos Group was founded by Shlomi Kurkoos, a professional with over 30 years of experience in construction. After leading dozens of projects over the years, and through an intimate familiarity with the site, the raw materials and the execution process, a vision was born to create a real estate company that works differently. One that does not compromise on quality, on service or on reliability.',
          'Kurkoos Group operates across the entire real estate value chain, from development and planning, through construction and supervision, to marketing and client guidance. For us, full control over every stage of the process is the key to a flawless result, while maintaining high and uncompromising standards.',
          'We believe that quality construction begins with people. With a professional and experienced team, full transparency with our clients, genuine attention to their needs, and true commitment to every detail, large or small. That is why every project is managed by us personally and professionally, from the very first stages to the handover of the key.',
          'Our vision is to lead a new standard of residential quality, one that combines smart planning, meticulous design, a rich specification and execution at the highest level. Not merely to build houses, but to create living environments that deliver real value to residents and enhance their quality of life for years to come.',
          'Even after move in, our commitment does not end. We continue to stand by our clients with full responsibility, understanding that building trust matters no less than building a home.',
        ],
        tagline: 'Kurkoos Group. Initiating, building and accompanying with responsibility, professionalism and a passion for excellence.',
      }

  return (
    <>
      <PageHeader
        eyebrow={t('nav.about')}
        title={t('hero.eyebrow')}
        crumbs={[{ label: t('nav.about') }]}
      />

      <section className="section about-vision">
        <div className="container">
          <Reveal className="about-vision__inner">
            <span className="eyebrow">{vision.eyebrow}</span>
            <KineticText as="h2" className="section-title about-vision__heading" text={vision.heading} />
            {vision.paragraphs.map((p, i) => (
              <p className="about-vision__p" key={i}>{p}</p>
            ))}
            <div className="about-vision__closing">
              <p className="about-vision__tagline">{vision.tagline}</p>
              <img
                src="/aminot-badge.png"
                alt={lang === 'he' ? 'חותם אמינות Dun & Bradstreet' : 'Dun & Bradstreet reliability seal'}
                className="about-vision__badge"
                width="160"
                height="160"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <Stats />
      <ValueChain />
      <Partners />
      <Contact />
    </>
  )
}
