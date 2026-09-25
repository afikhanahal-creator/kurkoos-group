import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import ProjectsGallery from '../components/sections/ProjectsGallery.jsx'
import Contact from '../components/sections/Contact.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import { listProjectCards, cmsRowToCard, getProjectBySlug } from '../lib/cms.js'
import { srcOfResponsive, optimizeSrc } from '../lib/responsiveImage.js'
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
function matchCard(cards, slug) {
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
   ============================================================ */

const PROJECTS = [
  {
    slug: 'yordei-hayam',
    name: 'יורדי הים 3',
    tagline: 'חוויית וילה פרטית על חצי דונם בלב שכונת גרינברג',
    kind: 'שתי וילות פרטיות',
    status: 'בתכנון',
    architect: 'רמי שחר',
    specs: [
      ['יחידות', 'שתי וילות'],
      ['מגרש', 'למעלה מחצי דונם לכל יחידה'],
      ['שטח בנוי', 'כ-300 מ"ר'],
      ['מפלסים', 'שלושה'],
      ['בריכה', 'בריכת שחייה מאושרת 4x9 מטר'],
    ],
    about:
      'פרויקט בוטיק יוקרתי הכולל שתי יחידות מגורים ייחודיות, המתוכננות בקפידה על מגרשים רחבי ידיים של למעלה מחצי דונם לכל יחידה. כל בית משתרע על פני כ-300 מ"ר בנוי בשלושה מפלסים, ומציע תכנון אדריכלי מוקפד המשלב מרחבי אירוח מרווחים, קומת מרתף הכוללת שתי סוויטות פרטיות וחדר גג מפנק. המפרט כולל גינה פרטית רחבה עם בריכת שחייה מאושרת בגודל 4x9 מטר, לצד סטנדרט בנייה גבוה וחומרי גמר איכותיים.',
    area:
      'שכונת גרינברג מתאפיינת באווירת מגורים שקטה, עם רחובות פנימיים רגועים ותנועה מקומית בלבד. האזור משלב בנייה נמוכה ובתים פרטיים לצד מרקם עירוני מתפתח, עם מרחבים פתוחים ושבילים ירוקים, וקרבה למוקדי חינוך, שירותים ופארקים מרכזיים בהוד השרון.',
    highlights: ['גינה פרטית', 'בריכת שחייה', 'קומת מרתף'],
  },
  {
    slug: 'henrietta-szold',
    name: 'הנרייטה סאלד 22-24',
    tagline: 'מיני שכונה פרטית עם בריכות במערב הוד השרון',
    kind: 'ארבע יחידות דו משפחתיות',
    status: 'בבנייה',
    architect: 'בני נדלסטיצ\'ר',
    specs: [
      ['יחידות', 'ארבע יחידות דו משפחתיות, שמונה משפחות'],
      ['מגרש', '380 מ"ר לכל יחידה, בטאבו כבעלות פרטית'],
      ['שטח בנוי', 'כ-300 מ"ר'],
      ['מפלסים', 'שלושה: מרתף, קרקע וקומה ראשונה'],
      ['חדרים', '7 חדרים, 4 חדרי רחצה, 2 מרפסות'],
      ['בריכה', 'בריכת שחייה 3x6 מטר'],
    ],
    about:
      'מתחם אינטימי של ארבע יחידות דו משפחתיות עם כניסה פרטית ומאובטחת לדיירי המתחם בלבד. לכל יחידה מגרש בשטח 380 מ"ר הרשום בטאבו כבעלות פרטית. המבנה משתרע על פני כ-300 מ"ר בנוי בשלושה מפלסים, הכוללים 7 חדרים, 4 חדרי רחצה ו-2 מרפסות. התכנון כולל כניסה נפרדת למפלס המרתף, המאפשרת יצירת יחידה עצמאית, לצד חצר פרטית המשלבת בריכת שחייה בגודל 3x6 מטר. הפרויקט מבוצע תחת היתרי בנייה מאושרים.',
    area:
      'האזור משלב נוף כפרי פתוח ושדות ירוקים עם שקט אופייני. מדובר במיני שכונה אינטימית של ארבע יחידות דו משפחתיות, המתוכננות להעניק פרטיות מקסימלית במרחב המאופיין בבנייה צמודת קרקע נמוכה, עם נגישות נוחה בלב השרון.',
    highlights: ['2 מרפסות', 'גינה פרטית', 'בריכת שחייה'],
  },
  {
    slug: 'hankin-41',
    name: 'חנקין 41',
    tagline: 'שש דירות יוקרה בתכנון אדריכלי מוקפד בלב הירוק של מגדיאל',
    kind: 'בניין בוטיק, שש דירות',
    status: 'בבנייה',
    architect: 'בני נדלסטיצ\'ר',
    specs: [
      ['יחידות', 'שש דירות, בניין אחד'],
      ['גינה', 'גינה פרטית בשטח כ-150 מ"ר'],
      ['חניה', 'שתי חניות נפרדות בחניון תת קרקעי לכל דירה'],
      ['מפרט', 'מרפסות מרווחות, מפרט איכותי'],
    ],
    about:
      'בלב שכונת מגדיאל המבוקשת בהוד השרון, בסביבה ירוקה ושקטה עם נגישות מצוינת לכל מוקדי החיים בעיר, מוקם פרויקט בוטיק אקסקלוסיבי עם שישה דיירים בלבד. הפרויקט כולל תכנון אדריכלי מוקפד, מפרט איכותי, מרפסות מרווחות, שתי חניות נפרדות בחניון תת קרקעי לכל דירה וגינה פרטית מרשימה בשטח של כ-150 מ"ר.',
    area:
      'מגדיאל היא הלב הפועם של הוד השרון, שכונה ותיקה ומבוקשת המשלבת אווירה קהילתית ושקטה עם נגישות עירונית. רחובות ירוקים, פארקים מטופחים, מוסדות חינוך מובילים ומרכזי מסחר במרחק דקות ספורות. התושבים נהנים מגישה מהירה לכבישים 531 ו-40, לרכבת ולמרכזי התעסוקה של גוש דן והשרון.',
    highlights: ['גינה פרטית', '2 חניות נפרדות'],
  },
]

const TRAITS = [
  { icon: 'building', title: 'בתים בשלושה מפלסים', desc: 'הווילות מתוכננות על שלושה מפלסים, כ-300 מ"ר בנוי, עם קומת מרתף שמאפשרת סוויטות פרטיות או יחידה עצמאית.' },
  { icon: 'crane', title: 'ביצוע בידיים שלנו', desc: 'הבנייה מתבצעת על ידי ראיתה, זרוע הביצוע של הקבוצה, ולא מועברת לקבלן חיצוני. שלד, מעטפת וגימור תחת אותה אחריות.' },
  { icon: 'shield', title: 'פיקוח צמוד לאורך הדרך', desc: 'שכינתא, זרוע הניהול והפיקוח של הקבוצה, מלווה את הפרויקט בבקרת איכות, תקציב ולוחות זמנים.' },
  { icon: 'handshake', title: 'מגרש בבעלות פרטית', desc: 'בהנרייטה סאלד כל יחידה מקבלת מגרש של 380 מ"ר הרשום בטאבו כבעלות פרטית, עם כניסה מאובטחת לדיירי המתחם בלבד.' },
]

const FAQS = [
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

export default function VillasSharon() {
  const [open, setOpen] = useState(PROJECTS[0].slug)
  const [gallery, setGallery] = useState([])   // כרטיסים בצורה שהגלריה מבינה (cover, name, slug)
  const [media, setMedia] = useState({})       // slug בעמוד → { card, images }

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
        await Promise.all(PROJECTS.map(async (p) => {
          const card = matchCard(cards, p.slug)
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
  }, [])

  /* תמונת הקאבר של העמוד: הכריכה של הפרויקט הראשון שיש לו תמונה באדמין.
     כך גם הקאבר מתעדכן משם, ולא מתמונה קבועה בקוד. */
  const heroCover = PROJECTS.map((p) => media[p.slug]?.card?.cover).find(Boolean) || ''
  const heroImage = heroCover ? optimizeSrc(heroCover, 1920) : undefined
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
            const cover = m?.card?.cover || ''
            // הכריכה לא חוזרת פעמיים: אם היא גם הראשונה בגלריה, מדלגים עליה
            const thumbs = (m?.images || []).filter((u) => u !== cover).slice(0, 4)
            const projectUrl = m?.card?.slug ? `/projects/${m.card.slug}` : null
            return (
            <Reveal key={p.slug} className="vsh-panel">
              {cover && (
                <div className="vsh-media">
                  <Link to={projectUrl || '/projects'} className="vsh-media__hero" aria-label={`${p.name}: לעמוד הפרויקט`}>
                    <SmartImage src={cover} alt={`${p.name}, ${p.kind}`} label={p.name} className="vsh-media__img" w={1400} sizes="(max-width: 860px) 100vw, 900px" />
                    <span className="vsh-media__cta">לעמוד הפרויקט</span>
                  </Link>
                  {thumbs.length > 0 && (
                    <div className="vsh-media__thumbs">
                      {thumbs.map((u, i) => (
                        <Link key={u} to={projectUrl || '/projects'} className="vsh-media__thumb" aria-label={`${p.name}, תמונה ${i + 2}`}>
                          <SmartImage src={u} alt={`${p.name}, תמונה ${i + 2}`} label={p.name} w={600} sizes="(max-width: 860px) 45vw, 220px" quality="auto:eco" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="vsh-panel__head">
                <div>
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
          <Reveal className="lhub-links">
            <p>להעמיק עוד: <Link to="/projects">כל הפרויקטים</Link> · <Link to="/divisions/execution">זרוע הביצוע</Link> · <Link to="/divisions/supervision">ניהול ופיקוח</Link> · <Link to="/real-estate-sharon">נדל"ן בשרון</Link></p>
          </Reveal>
        </div>
      </section>

      <Contact />
    </>
  )
}
