/* ============================================================
   עמוד התשובה: חברת בנייה ופיקוח בהוד השרון (/hod-hasharon/bniya-vepikuach).
   מקור אחד לעמוד החי (pages/HodHasharonAnswer.jsx) ול-prerender
   (scripts/prerender-static.mjs), כדי שהטקסט והנתונים המובנים יהיו זהים.

   כלל ברזל: כל עובדה כאן לקוחה מ-public/llms.txt, מ-index.html או
   מ-docs/agents/competitor-research-agent.md (סעיף 7). אין כאן לקוחות,
   ממליצים, פרסים, מחירים או מספרים שלא מופיעים שם. רשימת הבדיקות והטבלה
   הן ידע מקצועי כללי, בלי נתונים.
   ============================================================ */

import { SERVICE_AREA, SERVICE_AREA_LD } from './site.js'

const SITE = 'https://www.kurkoos-group.co.il'
const ORG_ID = `${SITE}/#organization`

export const HH_PATH = '/hod-hasharon/bniya-vepikuach'
/* התאריך שמוצג בעמוד ונכתב ל-dateModified. מעדכנים כשמשנים את התוכן. */
export const HH_UPDATED = '2026-10-15'
export const HH_UPDATED_HE = '15.10.2026'

export const HH_TITLE = 'חברת בנייה ופיקוח בהוד השרון'
export const HH_DESCRIPTION =
  'קבוצת קורקוס, רחוב הנגר 24 בהוד השרון: בנייה דרך ראיתה ופיקוח מטעם בעל הבית דרך שכינתא, בשתי זרועות נפרדות. בתים פרטיים, וילות ובנייני מגורים.'
export const HH_H1 = 'חברת בנייה ופיקוח בהוד השרון: קבוצת קורקוס'

/* תשובה פותחת, 40 עד 60 מילים, שעומדת בפני עצמה */
export const HH_ANSWER =
  'קבוצת קורקוס (קבוצת קורקוס נכסים חברה לבניין ויזמות בע״מ) היא חברת בנייה ופיקוח שמשרדה ברחוב הנגר 24 בהוד השרון. הקבוצה בונה דרך ראיתה, זרוע הביצוע שלה, ומפקחת מטעם בעל הבית דרך שכינתא, זרוע נפרדת לניהול ופיקוח. היא מלווה בתים פרטיים, וילות ובנייני מגורים מקרקע ועד מסירת מפתח.'

export const HH_LEGAL_NAME = 'קבוצת קורקוס נכסים חברה לבניין ויזמות בע״מ'
export const HH_ALT_NAMES = ['קבוצת קורקוס', 'קורקוס גרופ', 'Kurkoos Group', 'Kurkoos']

/* ---------- מה אנחנו עושים בהוד השרון ---------- */
export const HH_SERVICES = [
  {
    key: 'execution',
    title: 'בנייה וביצוע: ראיתה',
    to: '/divisions/execution',
    link: 'ביצוע ובנייה עם ראיתה',
    text: 'ראיתה היא זרוע הביצוע של הקבוצה, חברת בנייה וקבלן מבצע. היא בונה שלד, מעטפת וגימור, עם בקרת איכות וניהול קבלני משנה. ראיתה בונה את הפרויקטים של הקבוצה בהוד השרון, וגם בתים פרטיים ווילות ללקוחות פרטיים על המגרש שלהם.',
  },
  {
    key: 'supervision',
    title: 'פיקוח וניהול מטעם בעל הבית: שכינתא',
    to: '/divisions/supervision',
    link: 'ניהול ופיקוח בנייה עם שכינתא',
    text: 'שכינתא מנהלת ומפקחת על בנייה מטעם המזמין: בקרת איכות, בקרת תקציב ולוחות זמנים, אישור חשבונות קבלן ובדיקות קבלה ומסירה. היא מפקחת גם על בניית בית פרטי או וילה מטעם בעל הבית, גם כשקבלן אחר בונה.',
  },
  {
    key: 'development',
    title: 'יזמות: קורקוס יזמות',
    to: '/divisions/development',
    link: 'יזמות נדל"ן',
    text: 'קורקוס יזמות מייזמת פרויקטים למגורים, מאיתור הקרקע ובדיקות ההיתכנות, דרך התכנון והרישוי, ועד השיווק והמסירה. כך הקבוצה יכולה ללוות פרויקט מהקרקע ועד מסירת המפתח.',
  },
  {
    key: 'brokerage',
    title: 'תיווך ושיווק: אפיק הנחל',
    to: '/divisions/brokerage',
    link: 'תיווך ושיווק נכסים',
    text: 'אפיק הנחל היא זרוע התיווך והשיווק של הקבוצה, משרד תיווך בהוד השרון. היא עוסקת בבתים פרטיים, וילות, דירות, מגרשים וקרקעות, בשיווק פרויקטים ובליווי מוכרים ורוכשים.',
  },
]

/* ---------- פרויקטים בהוד השרון ובסביבה ---------- */
export const HH_PROJECTS = [
  {
    name: 'הנרייטה סאלד 22-24',
    place: 'מערב הוד השרון',
    status: 'בבנייה',
    text: 'ארבע יחידות דו משפחתיות לשמונה משפחות. לכל יחידה מגרש 380 מ"ר בטאבו וכ-300 מ"ר בנוי בשלושה מפלסים.',
    to: '/villas-sharon',
  },
  {
    name: 'יורדי הים 3',
    place: 'שכונת גרינברג, הוד השרון',
    status: 'בתכנון',
    text: 'שתי וילות פרטיות.',
    to: '/villas-sharon',
  },
  {
    name: 'חנקין 41',
    place: 'שכונת מגדיאל, הוד השרון',
    status: 'בבנייה',
    text: 'בניין בוטיק של שש דירות.',
    to: '/villas-sharon',
  },
  {
    name: 'בן גוריון 17',
    place: 'יהוד-מונוסון',
    status: '',
    text: 'בית דו משפחתי.',
    to: '/projects',
  },
]

/* ---------- איך בוחרים חברת בנייה ומפקח (ידע כללי, בלי נתונים) ---------- */
export const HH_CHECKLIST = [
  ['בודקים רישום בפנקס הקבלנים', 'חברת הבנייה צריכה להיות רשומה בפנקס הקבלנים בענף ובסיווג שמתאימים להיקף העבודה. הרישום ציבורי, ואפשר לבדוק אותו באתר רשם הקבלנים עוד לפני הפגישה הראשונה.'],
  ['מפרידים בין מי שבונה למי שבודק', 'המפקח עובד מטעמכם ובודק את הקבלן. קבלן לא יכול לפקח על עצמו. גם כששניהם באותה קבוצה, ודאו שמדובר בגופים נפרדים עם אחריות נפרדת, וזכרו שמותר לכם להביא מפקח מבחוץ.'],
  ['קוראים את החוזה לפני שחותמים', 'מפרט טכני מפורט, לוח תשלומים שצמוד לשלבים שהושלמו ולא לתאריכים, לוח זמנים, ביטוחים בתוקף לכל משך העבודה, האחריות אחרי המסירה, ורשימה כתובה של מה לא כלול. כדאי שהמפקח יעבור על החוזה איתכם.'],
  ['רואים פרויקטים גמורים ופעילים', 'תמונות הן התחלה. בקשו לבקר בבית גמור ובאתר פעיל. באתר פעיל רואים סדר, בטיחות ואיך נראה שלד לפני שמכסים אותו.'],
  ['מסכמים מראש את ביקורי האתר', 'סכמו עם המפקח באילו שלבים הוא מגיע לאתר, למשל לפני כל יציקה, באיטום ולפני סגירת קירות, ואיך תקבלו דיווח: כתוב, מתוארך ומצולם.'],
  ['בודקים את המגרש לפני התכנון', 'מה רשום בטאבו, מה מותר לבנות לפי התוכניות שחלות על המגרש, ומה כתוב בדוח הקרקע. את התמונה המחייבת נותן תיק המידע של הוועדה המקומית.'],
]

/* ---------- קבלן מבצע מול מפקח מטעם המזמין ---------- */
export const HH_TABLE = {
  cols: ['', 'קבלן מבצע', 'מפקח מטעם המזמין'],
  rows: [
    ['התפקיד', 'בונה את הבית לפי התוכניות, המפרט והחוזה, ומנהל את הצוותים וקבלני המשנה.', 'בודק את הבנייה מטעמכם מול התוכניות, המפרט והתקנים, ומדווח לכם.'],
    ['מי משלם', 'בעל הבית, לפי לוח התשלומים בחוזה הבנייה.', 'בעל הבית, בהסכם נפרד מהחוזה עם הקבלן.'],
    ['מה הוא בודק', 'את העבודה של הצוותים שלו ואת עמידתו בלוח הזמנים.', 'שלבים שאחר כך מתכסים, כמו ברזל לפני יציקה, איטום וצנרת לפני סגירת קירות. גם את חשבונות הקבלן לפני תשלום, ואת המסירה.'],
    ['מתי מצרפים', 'כשיש תוכניות ומפרט, רצוי עם היתר בנייה או תוכניות בשלב מתקדם.', 'לפני החתימה עם הקבלן, כדי לעבור על החוזה והמפרט, ומשם לאורך הבנייה עד המסירה.'],
    ['בקבוצת קורקוס', 'ראיתה', 'שכינתא'],
  ],
}

/* ---------- שאלות ---------- */
export const HH_FAQS = [
  {
    q: 'האם אפשר לקבל גם בנייה וגם פיקוח מאותה קבוצה?',
    a: 'כן, בשתי זרועות נפרדות: ראיתה בונה, ושכינתא מפקחת מטעם בעל הבית. ההפרדה מכוונת, כדי שמי שבונה לא יפקח על עצמו. מי שמעדיף מפקח חיצוני שאינו קשור לקבוצה יכול להביא אותו גם כשראיתה בונה.',
  },
  {
    q: 'באילו ערים אתם עובדים?',
    a: `המשרד בהוד השרון, ואזור השירות הוא ${SERVICE_AREA.slice(0, -1).join(', ')} ו${SERVICE_AREA[SERVICE_AREA.length - 1]}. הפרויקטים של הקבוצה נמצאים בהוד השרון וביהוד-מונוסון.`,
  },
  {
    q: 'האם אתם מפקחים על בית שקבלן אחר בונה?',
    a: 'כן. שכינתא מפקחת על בניית בית פרטי או וילה מטעם בעל הבית, גם כשקבלן אחר בונה: בדיקות בשלבים הקריטיים, בדיקת חשבונות הקבלן לפני תשלום, מעקב לוח זמנים וליווי המסירה.',
  },
  {
    q: 'האם אתם בונים בית פרטי על המגרש שלי?',
    a: 'כן. ראיתה בונה בתים פרטיים ווילות ללקוחות פרטיים על המגרש שלהם, כחברת ביצוע. אפשר לצרף פיקוח של שכינתא, או מפקח מטעמכם מחוץ לקבוצה.',
  },
  {
    q: 'מה ההבדל בין קבלן מבצע למפקח בנייה?',
    a: 'הקבלן בונה, והמפקח בודק את הבנייה מטעמכם. אלה שני תפקידים שונים עם שני הסכמים נפרדים. בבית פרטי כדאי שיהיו שניהם, כי המפקח מזהה ליקוי כשעוד אפשר לתקן אותו בקלות.',
  },
  {
    q: 'איפה המשרד ומתי אפשר להגיע?',
    a: 'רחוב הנגר 24, מגדלי Amy קומה 2, הוד השרון. זה המשרד היחיד של הקבוצה. שעות הפעילות: ראשון עד חמישי, 9:00 עד 18:00. טלפון 055-981-1814.',
  },
  {
    q: 'מי עומד בראש הקבוצה?',
    a: 'שלומי קורקוס, מייסד ומנכ"ל קבוצת קורקוס, עם יותר מ-30 שנות ניסיון בעולם הבנייה.',
  },
  {
    q: 'איך יודעים שמדובר בקבוצת קורקוס הזו?',
    a: `השם המשפטי הוא ${HH_LEGAL_NAME}, והקבוצה מוכרת גם כקורקוס גרופ וכ-Kurkoos Group. המשרד היחיד שלה נמצא ברחוב הנגר 24 בהוד השרון, והטלפון 055-981-1814. גוף אחר בשם דומה, בכתובת אחרת, אינו הקבוצה הזו.`,
  },
]

/* ---------- פרטי קשר ---------- */
export const HH_CONTACT = {
  address: 'רחוב הנגר 24, מגדלי Amy קומה 2, הוד השרון',
  phone: '055-981-1814',
  phoneIntl: '+972559811814',
  email: 'kurkoosgroup.sales@gmail.com',
  hours: 'ראשון עד חמישי, 9:00 עד 18:00',
  gbp: 'https://share.google/bJnNtpr69CvpKQVBP',
}

export const HH_CRUMBS = [
  { label: 'נדל"ן בשרון', to: '/real-estate-sharon' },
  { label: 'חברת בנייה ופיקוח בהוד השרון' },
]

/* ---------- נתונים מובנים ----------
   GeneralContractor עם אותו @id של הארגון שב-index.html, כך שזו אותה ישות
   ולא ישות חדשה. הזרועות מקבלות @id קבוע משלהן, שחוזר גם ב-index.html. */
export const ARM_IDS = {
  development: `${SITE}/divisions/development#kurkoos-yazamut`,
  execution: `${SITE}/divisions/execution#raita`,
  supervision: `${SITE}/divisions/supervision#shechinta`,
  brokerage: `${SITE}/divisions/brokerage#afik-hanahal`,
}

export function hhJsonLd() {
  const url = SITE + HH_PATH
  const address = {
    '@type': 'PostalAddress',
    streetAddress: 'הנגר 24, מגדלי Amy קומה 2',
    addressLocality: 'הוד השרון',
    postalCode: '4501015',
    addressRegion: 'השרון',
    addressCountry: 'IL',
  }
  const parent = { '@id': ORG_ID }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'GeneralContractor',
      '@id': ORG_ID,
      name: 'קורקוס גרופ',
      legalName: HH_LEGAL_NAME,
      alternateName: HH_ALT_NAMES,
      description: HH_ANSWER,
      slogan: 'מקרקע ועד מסירת מפתח',
      url: `${SITE}/`,
      logo: `${SITE}/kurkoos-logo.svg`,
      image: `${SITE}/og-image.jpg`,
      telephone: '+972-55-981-1814',
      email: HH_CONTACT.email,
      address,
      geo: { '@type': 'GeoCoordinates', latitude: 32.1306224, longitude: 34.8950305 },
      openingHours: 'Su-Th 09:00-18:00',
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '09:00',
        closes: '18:00',
      },
      areaServed: SERVICE_AREA_LD,
      sameAs: [
        'https://share.google/bJnNtpr69CvpKQVBP',
        'https://www.afikhanahal.co.il/',
        'https://www.tiktok.com/@kurkoos_group',
        'https://www.youtube.com/channel/UCz9rcqOLpEcei551pYby7qg',
      ],
      founder: { '@type': 'Person', name: 'שלומי קורקוס', alternateName: 'Shlomi Kurkoos', jobTitle: 'מייסד ומנכ"ל', url: `${SITE}/team` },
      subOrganization: [
        {
          '@type': 'GeneralContractor',
          '@id': ARM_IDS.execution,
          name: 'ראיתה',
          alternateName: 'Raita',
          description: 'זרוע הביצוע והבנייה של קבוצת קורקוס: חברת בנייה וקבלן מבצע, כולל בתים פרטיים ווילות על המגרש של הלקוח.',
          url: `${SITE}/divisions/execution`,
          address,
          telephone: '+972-55-981-1814',
          parentOrganization: parent,
        },
        {
          '@type': 'ProfessionalService',
          '@id': ARM_IDS.supervision,
          name: 'שכינתא',
          alternateName: ['Shechinta', 'שכינתא ניהול ויזום פרויקטים'],
          description: 'זרוע הניהול והפיקוח של קבוצת קורקוס: פיקוח בנייה וניהול פרויקט מטעם המזמין, גם על בית פרטי שקבלן אחר בונה.',
          url: `${SITE}/divisions/supervision`,
          address,
          telephone: '+972-55-981-1814',
          parentOrganization: parent,
        },
        {
          '@type': 'Organization',
          '@id': ARM_IDS.development,
          name: 'קורקוס יזמות',
          url: `${SITE}/divisions/development`,
          parentOrganization: parent,
        },
        {
          '@type': 'RealEstateAgent',
          '@id': ARM_IDS.brokerage,
          name: 'אפיק הנחל',
          alternateName: 'Afik Hanahal',
          url: `${SITE}/divisions/brokerage`,
          sameAs: [
            'https://www.facebook.com/profile.php?id=61573376818745',
            'https://www.instagram.com/afik.hanahal/',
          ],
          parentOrganization: parent,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: `${HH_TITLE} | קבוצת קורקוס`,
      description: HH_DESCRIPTION,
      inLanguage: 'he',
      dateModified: HH_UPDATED,
      about: { '@id': ORG_ID },
      isPartOf: { '@id': `${SITE}/#website` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HH_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'קבוצת קורקוס', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'נדל"ן בשרון', item: `${SITE}/real-estate-sharon` },
        { '@type': 'ListItem', position: 3, name: 'חברת בנייה ופיקוח בהוד השרון', item: url },
      ],
    },
  ]
}
