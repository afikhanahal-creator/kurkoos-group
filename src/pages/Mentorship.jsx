import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import { stages, pillars, faqs } from '../data/mentorship.js'
import '../components/sections/Activities.css'   // card-effect: נוזל/ברק/זוהר/הטיה 3D
import './Mentorship.css'

const iconMap = {
  pin: 'location',
  check: 'check',
  handshake: 'handshake',
  shield: 'shield',
  building: 'building',
  crane: 'crane',
}

/* ---- FAQ Accordion ---- */
function FaqItem({ item, isOpen, onToggle }) {
  const bodyRef = useRef(null)
  const [maxH, setMaxH] = useState(0)
  useEffect(() => {
    if (bodyRef.current) setMaxH(isOpen ? bodyRef.current.scrollHeight : 0)
  }, [isOpen])
  return (
    <div className={`mfaq__item ${isOpen ? 'is-open' : ''}`}>
      <button className="mfaq__q" onClick={onToggle} aria-expanded={isOpen}>
        <span>{item.q.he}</span>
        <Icon name="chevron" size={20} className="mfaq__chevron" />
      </button>
      <div className="mfaq__body" style={{ maxHeight: maxH }}>
        <p className="mfaq__a" ref={bodyRef}>{item.a.he}</p>
      </div>
    </div>
  )
}

/* ================================================================
   עמוד ראשי
   ================================================================ */
export default function Mentorship() {
  const [openFaq, setOpenFaq] = useState(null)
  const [openStage, setOpenStage] = useState(null)

  return (
    <>
      <PageHeader
        eyebrow="מנטורינג"
        title='ליווי יזמי נדל"ן'
        lead='תוכנית מנטורינג שמלווה יזמים צעירים מהרעיון ועד לעסקה העצמאית, עם שלומי קורקוס וצוות קורקוס גרופ, שלושים שנה של ניסיון בשטח.'
        crumbs={[{ label: 'מנטורינג' }]}
      />

      {/* ---- היכרות עם שלומי ---- */}
      <section className="mentor-intro">
        <div className="container">
          <Reveal className="mentor-intro__inner">
            <div className="mentor-intro__content">
              <span className="eyebrow mentor-intro__eyebrow">שלומי קורקוס, מייסד קורקוס גרופ</span>
              <h2 className="mentor-intro__heading">
                שלושים שנה בשטח.<br />בכל שלב של הדרך.
              </h2>
              <p className="mentor-intro__para">
                אני לא מלמד מה שקראתי בספר. אני מלמד מה שעשיתי, פרויקט אחר פרויקט, טעות אחר טעות, עסקה אחר עסקה. הקמתי ארבע חטיבות שמכסות את כל שלבי הפרויקט: ייזום, ביצוע, פיקוח ותיווך. יזם שעובד איתי לא צריך לרכז מידע ממספר גורמים. הכל נמצא תחת מטרייה אחת.
              </p>
              <p className="mentor-intro__para">
                הניסיון הזה לא נמכר בקורס מקוון ולא נרכש באקדמיה. הוא נצבר בשטח, בישיבות עם בנקים, בוועדות תכנון, במסירות שהלכו טוב ובמסירות שלימדו אותי יותר. מה שאני מציע הוא ליווי אישי וצמוד, כדי שהדרך שלכם תהיה קצרה ובטוחה יותר משלי.
              </p>
              <div className="mentor-intro__stats">
                <div className="mentor-intro__stat">
                  <span className="mentor-intro__stat-num">+30</span>
                  <span className="mentor-intro__stat-label">שנות ניסיון</span>
                </div>
                <div className="mentor-intro__stat">
                  <span className="mentor-intro__stat-num">4</span>
                  <span className="mentor-intro__stat-label">חטיבות עסקיות</span>
                </div>
                <div className="mentor-intro__stat">
                  <span className="mentor-intro__stat-num">1:1</span>
                  <span className="mentor-intro__stat-label">ליווי אישי</span>
                </div>
              </div>
            </div>
            <aside className="mentor-intro__side">
              <img
                src="/AD2EB011-F33E-40FC-9639-627E92C2A4D7.jpeg"
                alt="שלומי קורקוס, מייסד קורקוס גרופ"
                className="mentor-intro__photo"
                loading="lazy"
              />
              <div className="mentor-intro__quote-card">
                <p className="mentor-intro__quote-text">
                  "יזמות נדל"ן היא מקצוע. לא השקעה. לא הימור. מקצוע שלומדים עם מנטור שכבר עשה את הדרך."
                </p>
                <span className="mentor-intro__quote-sig">שלומי קורקוס</span>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ---- יתרונות — card-effect ---- */}
      <section className="section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">למה ליווי יזמי</span>
            <h2 className="section-title">נכנסים לעסקה עם מי שכבר עשה את הדרך</h2>
            <p className="mentor-section-lead">
              ליווי יזמי הוא לא לימוד מהצד. הוא שותפות בשטח. ניסיון של שלושים שנה, רשת קשרים חיה ומסגרת מקצועית מלאה עומדים לצידכם בכל החלטה, מהאיתור הראשון ועד מסירת המפתח. זה ההבדל בין לדעת על נדל"ן לבין לעשות נדל"ן.
            </p>
          </Reveal>
          <div className="mentor-pillars">
            {pillars.map((p, i) => (
              <Reveal key={i}>
                <div className="mentor-pillar card-effect">
                  <div className="card-inner">
                    <span className="card__liquid" aria-hidden="true" />
                    <span className="card__shine" aria-hidden="true" />
                    <span className="card__glow" aria-hidden="true" />
                    <div className="card__content mentor-pillar__content">
                      <div className="card__image mentor-pillar__icon">
                        <Icon name={iconMap[p.icon] || 'check'} size={28} />
                      </div>
                      <div className="card__text">
                        <h3 className="card__title">{p.title.he}</h3>
                        <p className="card__description">{p.desc.he}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- השוואה ---- */}
      <section className="section section--alt">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">הדרך לעסקה הראשונה</span>
            <h2 className="section-title">מה נדרש כדי לסגור עסקת נדל"ן</h2>
          </Reveal>
          <div className="mentor-compare">
            <div className="mentor-compare__col">
              <h3 className="mentor-compare__head">מה העסקה דורשת</h3>
              <ul className="mentor-compare__list">
                {[
                  'ניתוח שוק מעמיק ואיתור הזדמנות מוקדמת',
                  'בדיקת היתכנות ודוח 0 מבוסס מספרים',
                  'משא ומתן שמגן על הרווח',
                  'ליווי משפטי שמכיר את המלכודות',
                  'מימון בנקאי בתנאים שעובדים לפרויקט',
                  'ניהול היתרים ובירוקרטיה',
                  'פיקוח שטח שמגן על האיכות והתקציב',
                  'שיווק ומכירות שמממשים את הרווח',
                  'מסירה שבונה מוניטין לפרויקט הבא',
                  'רשת קשרים שפותחת דלתות',
                ].map((item, i) => (
                  <li key={i} className="mentor-compare__item">
                    <Icon name="check" size={14} className="mentor-compare__check" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mentor-compare__col mentor-compare__col--accent">
              <h3 className="mentor-compare__head">מה הליווי מספק</h3>
              <ul className="mentor-compare__list">
                {[
                  'ניסיון של 30 שנה שמקצר עשור של טעויות',
                  'תבניות עבודה ודוחות מהשטח',
                  'ליווי אישי בכל שלב, לא ייעוץ כללי',
                  'גישה לרשת של עורכי דין, שמאים ובנקים',
                  'ארבע חטיבות עסקיות תחת מטרייה אחת',
                  'מנגנון בדיקת עסקה לפני שחותמים',
                  'זמינות שוטפת, שאלות ותשובות בזמן אמת',
                  'ליווי מסגירת העסקה ועד למסירת המפתח',
                  'הפקת לקחים משותפת בסיום כל שלב',
                  'שותפות שמבוססת על הצלחה',
                ].map((item, i) => (
                  <li key={i} className="mentor-compare__item">
                    <Icon name="check" size={14} className="mentor-compare__check mentor-compare__check--accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 10 שלבים — click-expand ---- */}
      <section className="section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">תוכנית הליווי</span>
            <h2 className="section-title">עשרה שלבים. דרך אחת.</h2>
            <p className="mentor-section-lead">
              כל שלב בנוי על הידע שנצבר בשלב שלפניו. לחצו על כל שלב לפרטים נוספים.
            </p>
          </Reveal>
          <div className="mentor-stages">
            {stages.map((s) => {
              const isOpen = openStage === s.id
              return (
                <Reveal
                  key={s.id}
                  as="article"
                  className={`mentor-stage ${isOpen ? 'is-open' : ''}`}
                  onClick={() => setOpenStage(isOpen ? null : s.id)}
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenStage(isOpen ? null : s.id)
                    }
                  }}
                >
                  <div className="mentor-stage__header">
                    <span className="mentor-stage__num">{s.num}</span>
                    <Icon name="chevron" size={14} className="mentor-stage__chevron" />
                  </div>
                  <h3 className="mentor-stage__title">{s.title.he}</h3>
                  <p className="mentor-stage__desc">{s.desc.he}</p>
                  <div className="mentor-stage__expand">
                    <ul className="mentor-stage__tools">
                      {s.tools.map((tool, ti) => (
                        <li key={ti} className="mentor-stage__tool">
                          <Icon name="check" size={11} className="mentor-stage__tool-ic" />
                          <span>{tool.he}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---- שאלות נפוצות ---- */}
      <section className="section">
        <div className="container mentor-faq-wrap">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">שאלות נפוצות</span>
            <h2 className="section-title">שאלות שכדאי לשאול לפני שמתחילים</h2>
          </Reveal>
          <div className="mentor-faq">
            {faqs.map((f, i) => (
              <FaqItem
                key={i}
                item={f}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA — רקע לבן ---- */}
      <section className="mentor-cta">
        <div className="container">
          <Reveal className="mentor-cta__inner">
            <div className="mentor-cta__text">
              <span className="mentor-cta__eyebrow">בואו נדבר</span>
              <h2 className="mentor-cta__title">הצעד הראשון הוא שיחה</h2>
              <p className="mentor-cta__desc">
                אין כאן טופס שמציב אתכם בתור. אנחנו מדברים עם יזמים ברצינות, מבינים את הרקע שלכם, ומחליטים ביחד אם הליווי מתאים. שיחת ההיכרות ללא עלות וללא מחויבות.
              </p>
              <div className="mentor-cta__actions">
                <a href="/#contact" className="btn btn--primary btn--lg">
                  השאירו פרטים לשיחת היכרות
                  <Icon name="arrow" size={18} className="mentor-cta__arrow" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- המדריך ליזמי נדל"ן צעירים — בתחתית הדף ---- */}
      <section className="section mentor-guide-section">
        <div className="container">
          <Reveal className="division-guide__band" variant="scale">
            <div>
              <span className="eyebrow">ידע מהשטח</span>
              <h2 className="division-guide__title">המדריך ליזמי נדל"ן צעירים</h2>
              <p className="division-guide__desc">כתבות מקצועיות שנכתבו מניסיון ישיר, לפי עשרת שלבי תוכנית הליווי: מאיתור העסקה ועד מסירת המפתח.</p>
            </div>
            <Link to="/madrich-yazamim" className="btn btn--primary btn--lg">
              קראו את המדריך
              <Icon name="arrow" size={20} className="division-guide__arrow" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
