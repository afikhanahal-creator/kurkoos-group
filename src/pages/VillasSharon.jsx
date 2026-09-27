import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import FaqCta from '../components/ui/FaqCta.jsx'
import ProjectsGallery from '../components/sections/ProjectsGallery.jsx'
import Contact from '../components/sections/Contact.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import { listProjectCards, cmsRowToCard, getProjectBySlug, useSettings } from '../lib/cms.js'
import { srcOfResponsive, optimizeSrc } from '../lib/responsiveImage.js'
import { BUYER_FAQS } from '../data/buyerFaqs.js'
import { VILLAS_PROJECTS, parseVillasSettings, orderedVillasProjects } from '../data/villasPage.js'
import site from '../data/site.js'
import { track } from '../lib/track.js'
import './SharonHub.css'
import './VillasSharon.css'

/* העובדות שחוזרות בכל הפרויקטים בעמוד, מוצגות פעם אחת למעלה.
   כולן לקוחות מהמפרטים שלמטה, לא מספרים חדשים. */
const FACTS = [
  { v: 'כ-300', u: 'מ"ר בנוי' },
  { v: '3', u: 'מפלסים' },
  { v: 'בריכה', u: 'פרטית לכל בית' },
  { v: 'טאבו', u: 'מגרש בבעלות פרטית' },
]

/* התאמה בין הפרויקטים שבעמוד לפרויקטים במערכת הניהול. קודם לפי slug זהה,
   ואם ה-slug במערכת שונה, לפי השם. כך התמונות מגיעות תמיד מהאדמין,
   וגם שינוי slug שם לא מעלים אותן מכאן. */
const NAME_KEYS = {
  'yordei-hayam': ['יורדי הים'],
  'henrietta-szold': ['הנרייטה', 'סאלד'],
  'hankin-41': ['חנקין'],
}
const nameOf = (v) => (v && typeof v === 'object') ? String(v.he || v.en || '') : String(v || '')
function matchCard(cards, slug, cmsSlug = '') {
  // באדמין אפשר לקשר ידנית לפרויקט אחר במערכת. הקישור הידני קודם לכל התאמה אוטומטית
  if (cmsSlug) { const manual = cards.find((c) => String(c.slug) === cmsSlug); if (manual) return manual }
  const bySlug = cards.find((c) => String(c.slug) === slug)
  if (bySlug) return bySlug
  const keys = NAME_KEYS[slug] || []
  return cards.find((c) => keys.some((k) => nameOf(c.name).includes(k))) || null
}

/* ============================================================
   בניית וילות ובתים פרטיים בשרון, עמוד מוקד.
   נבנה כדי לענות על השאלה שנשאלת בפועל בחיפוש ובמנועי AI:
   "מי בונה וילות ובתים פרטיים באזור השרון".
   כל הנתונים כאן הם מפרטי הפרויקטים האמיתיים של הקבוצה.
   מזין FAQPage, BreadcrumbList ו-ItemList של הפרויקטים.
   הפרויקטים והמפרט שלהם ב-data/villasPage.js, משותף לאדמין.
   ============================================================ */

const TRAITS = [
  { icon: 'building', title: 'בתים בשלושה מפלסים', desc: 'הווילות מתוכננות על שלושה מפלסים, כ-300 מ"ר בנוי, עם קומת מרתף שמאפשרת סוויטות פרטיות או יחידה עצמאית.' },
  { icon: 'crane', title: 'ביצוע בידיים שלנו', desc: 'הבנייה מתבצעת על ידי ראיתה, זרוע הביצוע של הקבוצה, ולא מועברת לקבלן חיצוני. שלד, מעטפת וגימור תחת אותה אחריות.' },
  { icon: 'shield', title: 'פיקוח צמוד לאורך הדרך', desc: 'שכינתא, זרוע הניהול והפיקוח של הקבוצה, מלווה את הפרויקט בבקרת איכות, תקציב ולוחות זמנים.' },
  { icon: 'handshake', title: 'מגרש בבעלות פרטית', desc: 'בהנרייטה סאלד כל יחידה מקבלת מגרש של 380 מ"ר הרשום בטאבו כבעלות פרטית, עם כניסה מאובטחת לדיירי המתחם בלבד.' },
]

const BASE_FAQS = [
  {
    q: 'איזו חברה בונה וילות ובתים פרטיים באזור השרון?',
    a: 'קורקוס גרופ, שמשרדה ברחוב הנגר 24 בהוד השרון, בונה וילות ובתים פרטיים בהוד השרון ובאזור המרכז. כיום הקבוצה מקימה את יורדי הים 3 בשכונת גרינברג, שתי וילות פרטיות על חצי דונם כל אחת עם בריכת שחייה 4x9 מטר, ואת הנרייטה סאלד 22-24 במערב הוד השרון, ארבע יחידות דו משפחתיות לשמונה משפחות עם בריכה פרטית לכל יחידה. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא.',
  },
  {
    q: 'כמה גדולים הבתים ומה הם כוללים?',
    a: 'הווילות נבנות על כ-300 מ"ר בנוי בשלושה מפלסים. בהנרייטה סאלד כל בית כולל 7 חדרים, 4 חדרי רחצה ושתי מרפסות, עם כניסה נפרדת למפלס המרתף שמאפשרת יחידה עצמאית, וחצר פרטית עם בריכה 3x6 מטר. ביורדי הים 3 כל בית כולל מרחבי אירוח, קומת מרתף עם שתי סוויטות פרטיות, חדר גג, וגינה רחבה עם בריכה 4x9 מטר.',
  },
  {
    q: 'האם המגרש נרשם על שמי בטאבו?',
    a: 'בפרויקט הנרייטה סאלד 22-24 כל יחידה מקבלת מגרש בשטח 380 מ"ר הרשום בטאבו כבעלות פרטית. ביורדי הים 3 מדובר במגרשים של למעלה מחצי דונם לכל יחידה.',
  },
  {
    q: 'באילו שכונות בהוד השרון אתם בונים?',
    a: 'גרינברג, שכונה שקטה עם רחובות פנימיים ובנייה נמוכה, שם מוקם יורדי הים 3. מערב הוד השרון, מול שדות פתוחים, שם מוקם הנרייטה סאלד 22-24. ומגדיאל, שכונה ותיקה ומבוקשת עם נגישות מהירה לכבישים 531 ו-40, שם מוקם פרויקט הבוטיק חנקין 41.',
  },
  {
    q: 'מי מתכנן ומי מבצע את הפרויקטים?',
    a: 'הנרייטה סאלד 22-24 וחנקין 41 מתוכננים על ידי האדריכל בני נדלסטיצ\'ר, ויורדי הים 3 על ידי האדריכל רמי שחר. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של קורקוס גרופ, והניהול והפיקוח על ידי שכינתא, זרוע הניהול והפיקוח של הקבוצה. שתיהן חלק מאותה קבוצה, כך שהאחריות נשארת בכתובת אחת.',
  },
  {
    q: 'מה הסטטוס של הפרויקטים היום?',
    a: 'הנרייטה סאלד 22-24 וחנקין 41 נמצאים בבנייה, והנרייטה סאלד מבוצע תחת היתרי בנייה מאושרים. יורדי הים 3 נמצא בשלב התכנון.',
  },
  {
    q: 'איך מתאמים פגישה?',
    a: 'משאירים פנייה בטופס בעמוד הזה, או מתקשרים ל-055-981-1814. נחזור אליכם, נשמע מה מתאים לכם ונתאם סיור או פגישה על אחד הפרויקטים.',
  },
]

/* השאלות על הפרויקטים, ואחריהן שאלות הרוכשים מניתוח ביקורות המתחרים */
const FAQS = [...BASE_FAQS, ...BUYER_FAQS]

export default function VillasSharon() {
  /* ההגדרות מהאדמין (טאב "בתים פרטיים ווילות"): תמונת כותרת, סדר והסתרה,
     ולכל פרויקט הדמיה, תמונות קטנות ופרויקט מקושר במערכת. בלי הגדרה,
     הכול נמשך אוטומטית מעמודי הפרויקטים. */
  const settings = useSettings()
  const villas = useMemo(() => parseVillasSettings(settings.villas_page), [settings.villas_page])
  const PROJECTS = useMemo(() => orderedVillasProjects(settings.villas_page), [settings.villas_page])
  const [open, setOpen] = useState(VILLAS_PROJECTS[0].slug)
  const [gallery, setGallery] = useState([])   // כרטיסים בצורה שהגלריה מבינה (cover, name, slug)
  const [media, setMedia] = useState({})       // slug בעמוד → { card, images }
  // אם הפרויקט הפתוח הוסתר באדמין, עוברים לראשון שמוצג
  useEffect(() => { if (PROJECTS.length && !PROJECTS.some((p) => p.slug === open)) setOpen(PROJECTS[0].slug) }, [PROJECTS, open])

  // הקישורים הידניים לפרויקטים במערכת, מהאדמין. הטעינה חוזרת אם הם משתנים
  const cmsLinks = Object.fromEntries(VILLAS_PROJECTS.map((p) => [p.slug, villas.projects[p.slug]?.cms || '']))
  const cmsKey = JSON.stringify(cmsLinks)

  /* תמונות אמיתיות מהפרויקטים, מתוך מערכת הניהול.
     השורות הגולמיות מהמסד לא מכילות שדה cover, ולכן הן חייבות לעבור דרך
     cmsRowToCard לפני שהן מגיעות לגלריה. בלי זה הכרטיסים נוצרו בלי תמונה. */
  useEffect(() => {
    let on = true
    listProjectCards()
      .then(async (rows) => {
        if (!on) return
        const cards = (rows || []).map(cmsRowToCard)
        setGallery(cards)
        // לכל פרויקט בעמוד: הכריכה מהכרטיס, ועד ארבע תמונות נוספות מהגלריה שלו
        const found = {}
        await Promise.all(VILLAS_PROJECTS.map(async (p) => {
          const card = matchCard(cards, p.slug, cmsLinks[p.slug])
          if (!card) return
          let images = []
          try {
            const row = await getProjectBySlug(card.slug)
            images = (Array.isArray(row?.gallery) ? row.gallery : []).map(srcOfResponsive).filter(Boolean)
          } catch { /* אין גלריה, נשארים עם הכריכה */ }
          found[p.slug] = { card, images }
        }))
        if (on) setMedia(found)
      })
      .catch(() => {})
    return () => { on = false }
  }, [cmsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* תמונת הקאבר של העמוד: הכריכה של הפרויקט הראשון שיש לו תמונה באדמין.
     כך גם הקאבר מתעדכן משם, ולא מתמונה קבועה בקוד. */
  const heroCover = srcOfResponsive(villas.header)
    || PROJECTS.map((p) => srcOfResponsive(villas.projects[p.slug]?.hero) || media[p.slug]?.card?.cover).find(Boolean)
    || ''
  const heroImage = heroCover ? optimizeSrc(heroCover, 2200, 'auto:best') : undefined
  const phoneDigits = String(site.contact.phone).replace(/[^+\d]/g, '')

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
      '@type': 'ItemList',
      name: 'פרויקטי בתים פרטיים של קורקוס גרופ בהוד השרון',
      itemListElement: PROJECTS.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'ApartmentComplex',
          name: p.name,
          description: p.about,
          numberOfAccommodationUnits: p.slug === 'yordei-hayam' ? 2 : p.slug === 'henrietta-szold' ? 4 : 6,
          address: { '@type': 'PostalAddress', addressLocality: 'הוד השרון', addressRegion: 'השרון', addressCountry: 'IL' },
          provider: { '@id': 'https://www.kurkoos-group.co.il/#organization' },
        },
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
      <Seo
        title='בניית וילות ובתים פרטיים בהוד השרון ובאזור המרכז'
        description='קורקוס גרופ בונה וילות ובתים פרטיים בהוד השרון: יורדי הים 3 בגרינברג, שתי וילות על חצי דונם עם בריכה, והנרייטה סאלד 22-24 במערב העיר, ארבע יחידות דו משפחתיות עם בריכה ומגרש בטאבו.'
        jsonLd={jsonLd}
      />
      <PageHeader
        noSeo   /* ה-SEO של העמוד מוגדר ב-Seo שמעליו, מקור אחד בלבד */
        eyebrow="בתים פרטיים ווילות"
        title="בניית וילות ובתים פרטיים בהוד השרון ובאזור המרכז"
        lead="קורקוס גרופ מקימה וילות ובתים פרטיים בהוד השרון: בתים בשלושה מפלסים על כ-300 מ&quot;ר בנוי, עם בריכת שחייה פרטית ומגרש בבעלות פרטית, בביצוע ובפיקוח של זרועות הקבוצה עצמה."
        crumbs={[{ label: 'בניית וילות בשרון' }]}
        seoTitle="בניית וילות ובתים פרטיים בהוד השרון ובאזור המרכז"
        seoDescription="קורקוס גרופ בונה וילות ובתים פרטיים בהוד השרון: יורדי הים 3 בגרינברג, שתי וילות על חצי דונם עם בריכה, והנרייטה סאלד 22-24 במערב העיר, ארבע יחידות דו משפחתיות עם בריכה ומגרש בטאבו."
        image={heroImage}
        imageAlt="בית פרטי של קורקוס גרופ בהוד השרון"
        imagePos="center 68%"
      />

      {/* פתיחה: פסקת ישות (ברורה וניתנת לציטוט ע"י מנועי AI), העובדות
          שחוזרות בכל הפרויקטים, ואיור הווילה בשפת המותג לצד הטקסט */}
      <section className="section vsh-intro">
        <div className="container vsh-intro__grid">
          <Reveal className="vsh-intro__text">
            <span className="eyebrow">מי בונה לכם את הבית</span>
            <h2 className="section-title vsh-intro__title">בית פרטי, מהקרקע ועד המפתח, בידיים של קבוצה אחת</h2>
            <p className="lhub-intro__text vsh-intro__p">
              קורקוס גרופ היא קבוצת נדל"ן מהוד השרון הבונה וילות ובתים פרטיים באזור השרון.
              הקבוצה מקימה כיום את <b>יורדי הים 3</b> בשכונת גרינברג, שתי וילות פרטיות על מגרשים
              של למעלה מחצי דונם עם בריכת שחייה 4x9 מטר, ואת <b>הנרייטה סאלד 22-24</b> במערב
              הוד השרון, מתחם של ארבע יחידות דו משפחתיות לשמונה משפחות, כל אחת על מגרש 380 מ"ר
              בטאבו ועם בריכה פרטית. במקביל מוקם <b>חנקין 41</b> במגדיאל, בניין בוטיק של שש דירות.
              הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא.
            </p>
            <ul className="vsh-facts" aria-label="נתונים משותפים לפרויקטים">
              {FACTS.map((f) => (
                <li key={f.u}><b>{f.v}</b><span>{f.u}</span></li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="vsh-intro__art" variant="left" delay={0.1}>
            <img src="/villa-illustration.webp" alt="" width="1200" height="671" loading="lazy" decoding="async" />
          </Reveal>
        </div>
      </section>

      {/* הפרויקטים, עם המפרט המלא */}
      <section className="section section--soft vsh-projects">
        <div className="container">
          <Reveal className="lhub-head">
            <span className="eyebrow">הפרויקטים שלנו</span>
            <h2 className="section-title">מה אנחנו מקימים בהוד השרון</h2>
          </Reveal>

          <div className="vsh-tabs" role="tablist">
            {PROJECTS.map((p) => (
              <button
                key={p.slug}
                type="button"
                role="tab"
                aria-selected={open === p.slug}
                className={`vsh-tab${open === p.slug ? ' is-on' : ''}`}
                onClick={() => setOpen(p.slug)}
              >
                <b>{p.name}</b>
                <span>
                  <i className={`vsh-tab__dot${p.status === 'בבנייה' ? ' is-building' : ''}`} aria-hidden="true" />
                  {p.status} · {p.kind}
                </span>
              </button>
            ))}
          </div>

          {PROJECTS.filter((p) => p.slug === open).map((p) => {
            const m = media[p.slug]
            const ov = villas.projects[p.slug] || {}
            // ההדמיה והתמונות הקטנות: קודם מה שנבחר באדמין לעמוד הזה, אחרת מעמוד הפרויקט
            const cover = srcOfResponsive(ov.hero) || m?.card?.cover || ''
            const ownThumbs = (Array.isArray(ov.thumbs) ? ov.thumbs : []).map(srcOfResponsive).filter(Boolean)
            // הכריכה לא חוזרת פעמיים: אם היא גם הראשונה בגלריה, מדלגים עליה
            const thumbs = (ownThumbs.length ? ownThumbs : (m?.images || [])).filter((u) => u !== cover).slice(0, 4)
            const projectUrl = m?.card?.slug ? `/projects/${m.card.slug}` : null
            return (
            <Reveal key={p.slug} className="vsh-panel">
              {cover && (
                <div className="vsh-media">
                  <Link to={projectUrl || '/projects'} className="vsh-media__hero" aria-label={`${p.name}: לעמוד הפרויקט`}>
                    <SmartImage src={cover} alt="" aria-hidden="true" className="vsh-media__blur" w={1800} quality="auto:best" />
                    <SmartImage src={cover} alt={`${p.name}, ${p.kind}`} label={p.name} className="vsh-media__img" w={1800} quality="auto:best" sizes="(max-width: 860px) 100vw, 1100px" />
                    <span className="vsh-media__caption" aria-hidden="true">
                      <b>{p.name}</b>
                      <span>{p.kind} · {p.architect ? `אדריכל ${p.architect}` : ''}</span>
                    </span>
                    <span className="vsh-media__cta">לעמוד הפרויקט</span>
                  </Link>
                  {thumbs.length > 0 && (
                    <div className="vsh-media__thumbs">
                      {thumbs.map((u, i) => (
                        <Link key={u} to={projectUrl || '/projects'} className="vsh-media__thumb" aria-label={`${p.name}, תמונה ${i + 2}`}>
                          <SmartImage src={u} alt={`${p.name}, תמונה ${i + 2}`} label={p.name} w={800} sizes="(max-width: 860px) 45vw, 260px" quality="auto:good" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="vsh-panel__head">
                <div>
                  <span className="vsh-panel__kicker">{p.kind}</span>
                  <h3>{p.name}</h3>
                  <p className="vsh-panel__tag">{p.tagline}</p>
                </div>
                <span className={`vsh-status${p.status === 'בבנייה' ? ' is-building' : ''}`}>{p.status}</span>
              </div>

              <dl className="vsh-specs">
                {p.specs.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
                <div><dt>אדריכל</dt><dd>{p.architect}</dd></div>
              </dl>

              <div className="vsh-panel__cols">
                <div>
                  <h4>על הפרויקט</h4>
                  <p>{p.about}</p>
                  <ul className="vsh-chips">
                    {p.highlights.map((h) => <li key={h}>{h}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>על הסביבה</h4>
                  <p>{p.area}</p>
                </div>
              </div>
            </Reveal>
            )
          })}
        </div>
      </section>

      {/* תמונות מהפרויקטים */}
      {gallery.length > 0 && (
        <ProjectsGallery
          items={gallery}
          collage
          masonry
          showFooter={false}
          title="מהשטח"
          lead="תמונות מהפרויקטים שהקבוצה מייזמת, מבצעת ומשווקת."
        />
      )}

      {/* מה מאפיין את הבנייה */}
      <section className="section lhub-services">
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

      {/* קריאה לפעולה: סיור בפרויקט. מי שהגיע עד לכאן קרא את המפרט וראה
          את התמונות, וזה הרגע לתת לו דרך קצרה להמשיך, לפני השאלות הנפוצות */}
      <section className="section vsh-cta">
        <div className="container">
          <Reveal className="vsh-cta__box">
            <div className="vsh-cta__text">
              <span className="eyebrow vsh-cta__eyebrow">סיור בפרויקטים</span>
              <h2 className="vsh-cta__title">רוצים לראות בית כזה מקרוב?</h2>
              <p>נתאם סיור באחד הפרויקטים, נעבור יחד על המפרט והתוכניות, ונענה על כל שאלה. בלי התחייבות.</p>
            </div>
            <div className="vsh-cta__actions">
              <a href="#contact" className="btn btn--primary btn--lg" onClick={() => track('cta_click', { placement: 'villas_tour' })}>לתיאום סיור</a>
              <a
                href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent('שלום, אשמח לתאם סיור בפרויקט בתים פרטיים בהוד השרון')}`}
                target="_blank" rel="noopener noreferrer"
                className="btn vsh-cta__ghost btn--lg"
                onClick={() => track('whatsapp_click', { placement: 'villas_cta' })}
              >
                <Icon name="whatsapp" size={18} /> וואטסאפ
              </a>
              <a href={`tel:${phoneDigits}`} className="btn vsh-cta__ghost btn--lg" onClick={() => track('phone_click', { placement: 'villas_cta' })}>
                <Icon name="phone" size={18} /> {site.contact.phoneDisplay}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

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
          <Reveal>
            <FaqCta to="#contact" placement="villas_faq" />
          </Reveal>
        </div>
      </section>

      <Contact />
    </>
  )
}
