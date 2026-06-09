/* ============================================================
   תחומי הפעילות (דיוויזיות), שירותי הליבה של קורקוס גרופ.
   כל תחום מקבל דף נחיתה מלא: באנר, אינטרו, "למה אנחנו",
   פרויקטים, מדריך, סיפורי הצלחה.
   ------------------------------------------------------------
   slug     , נתיב הדף (/divisions/<slug>)
   icon     , שם אייקון מ-Icon.jsx
   category , מסנן את הפרויקטים הרלוונטיים; null = כל הפרויקטים
   ============================================================ */

const img = (id, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

export const divisions = [
  {
    slug: 'residential',
    icon: 'house',
    category: 'residential',
    name: { he: 'לגור בקורקוס', en: 'Living with Kurkoos' },
    menuTitle: { he: 'מגורים', en: 'Residential' },
    hero: {
      title: { he: 'לגור בקורקוס', en: 'Living with Kurkoos' },
      subtitle: {
        he: 'בתים שנבנים סביב האנשים שגרים בהם, מאיכות הבנייה ועד תחושת הקהילה.',
        en: 'Homes built around the people who live in them, from build quality to a sense of community.',
      },
      image: img('1545324418-cc1a3fa10c00'),
    },
    intro: {
      he: 'תחום המגורים של קורקוס מתמחה בייזום והקמה של פרויקטים למגורים ברמת גימור גבוהה, עם דגש על תכנון חכם, אור טבעי ומרחבים משותפים שמייצרים קהילה. אנחנו מלווים את הרוכשים מהרגע הראשון ועד מסירת המפתח, ובאחריות מלאה גם אחרי.',
      en: 'The Kurkoos residential division specializes in initiating and building high-finish residential projects, emphasizing smart planning, natural light and shared spaces that create community. We accompany buyers from day one to key handover, with full responsibility after, too.',
    },
    why: [
      { icon: 'shield', title: { he: 'איכות בלתי מתפשרת', en: 'Uncompromising quality' }, desc: { he: 'בקרת איכות בכל שלב, חומרים מהשורה הראשונה וגימור מוקפד.', en: 'Quality control at every stage, premium materials and meticulous finish.' } },
      { icon: 'handshake', title: { he: 'ליווי אישי', en: 'Personal guidance' }, desc: { he: 'מלווה רוכשים ייעודי לכל לקוח, לאורך כל הדרך.', en: 'A dedicated buyer representative for every client, all the way.' } },
      { icon: 'check', title: { he: 'שקיפות מלאה', en: 'Full transparency' }, desc: { he: 'דיווח שוטף על התקדמות הבנייה ולוחות הזמנים.', en: 'Ongoing reporting on construction progress and schedule.' } },
      { icon: 'building', title: { he: 'תכנון מתקדם', en: 'Advanced planning' }, desc: { he: 'אדריכלות עכשווית, מרחבים משותפים ובית חכם.', en: 'Contemporary architecture, shared spaces and smart homes.' } },
    ],
    guide: {
      title: { he: 'המדריך לרכישת דירה', en: 'The apartment-buying guide' },
      desc: { he: 'כל מה שצריך לדעת לפני שקונים דירה על הנייר, שלב אחר שלב.', en: 'Everything to know before buying off-plan, step by step.' },
    },
  },
  {
    slug: 'execution',
    icon: 'crane',
    category: null,
    name: { he: 'קורקוס ביצוע', en: 'Kurkoos Execution' },
    menuTitle: { he: 'ביצוע', en: 'Execution' },
    hero: {
      title: { he: 'ביצוע ובנייה', en: 'Execution & Construction' },
      subtitle: {
        he: 'מהיסודות ועד מסירת המפתח, בנייה איכותית, בזמן ובתקציב, עם צוותי שטח מהמנוסים בארץ.',
        en: 'From foundations to handover, quality construction, on time and on budget, with some of Israel’s most experienced field teams.',
      },
      // תמונת רקע מאתר בנייה אמיתי — שמור את הקובץ ב: public/divisions/execution-bg.jpg
      image: '/divisions/execution-bg.jpg',
    },
    intro: {
      he: 'זרוע הביצוע של קורקוס מתרגמת תכניות לבניינים. אנחנו מבצעים פרויקטים מורכבים בסטנדרט הגבוה ביותר, שלד, מעטפת וגימור, תוך בקרת איכות בכל שלב, ניהול קבלני משנה ועמידה קפדנית בלוחות זמנים ובתקציב. אנחנו בונים גם עבור הפרויקטים שלנו וגם כקבלן מבצע עבור יזמים וגופים מוסדיים.',
      en: 'The Kurkoos execution arm turns plans into buildings. We deliver complex projects to the highest standard, structure, envelope and finish, with quality control at every stage, subcontractor management and strict adherence to schedule and budget. We build both for our own projects and as a contractor for developers and institutional clients.',
    },
    why: [
      { icon: 'crane', title: { he: 'ביצוע מקצועי', en: 'Professional execution' }, desc: { he: 'צוותי שטח מנוסים ושיטות בנייה מתקדמות בכל פרויקט.', en: 'Experienced field teams and advanced construction methods on every project.' } },
      { icon: 'check', title: { he: 'בקרת איכות', en: 'Quality control' }, desc: { he: 'בקרה הדוקה מהשלד ועד הגימור, מול מפרט ותקנים.', en: 'Tight control from structure to finish, against spec and standards.' } },
      { icon: 'shield', title: { he: 'בטיחות בעבודה', en: 'Site safety' }, desc: { he: 'תרבות בטיחות מחמירה ועמידה מלאה בתקני הבנייה.', en: 'A strict safety culture and full compliance with building codes.' } },
      { icon: 'building', title: { he: 'עמידה בזמנים ובתקציב', en: 'On time, on budget' }, desc: { he: 'ניהול פרויקט קפדני ושקיפות מלאה בכל אבן דרך.', en: 'Rigorous project management and full transparency at every milestone.' } },
    ],
    guide: {
      title: { he: 'המדריך לתהליך הבנייה', en: 'The construction-process guide' },
      desc: { he: 'מה קורה באתר מהחפירה ועד מסירת המפתח, שלב אחר שלב.', en: 'What happens on site from excavation to handover, step by step.' },
    },
  },
  {
    slug: 'development',
    icon: 'building',
    category: null,
    name: { he: 'קורקוס יזמות', en: 'Kurkoos Development' },
    menuTitle: { he: 'יזמות', en: 'Development' },
    hero: {
      title: { he: 'ייזום נדל"ן', en: 'Real-estate development' },
      subtitle: {
        he: 'מאיתור הקרקע ועד מסירת המפתח, יוזמים פרויקטים שמייצרים ערך לרוכשים, לשותפים ולסביבה.',
        en: 'From land acquisition to key handover, initiating projects that create value for buyers, partners and the surroundings.',
      },
      image: img('1496307653780-42ee777d4833'),
    },
    intro: {
      he: 'זרוע הייזום של קורקוס היא המנוע שמניע כל פרויקט. אנחנו מאתרים קרקעות והזדמנויות, מובילים תכנון ורישוי מול הרשויות, בונים מבנה פיננסי איתן ומנהלים את הסיכון, ומלווים את הפרויקט מהרעיון הראשוני ועד שהדיירים מקבלים את המפתח. כל יזמה נמדדת בערך האמיתי שהיא מייצרת לכל הצדדים.',
      en: 'The Kurkoos development arm is the engine behind every project. We identify land and opportunities, lead planning and permitting with the authorities, build a solid financial structure and manage risk, guiding each project from the initial idea until residents receive their keys. Every venture is measured by the real value it creates for all sides.',
    },
    why: [
      { icon: 'building', title: { he: 'ראייה אסטרטגית', en: 'Strategic vision' }, desc: { he: 'איתור קרקעות והזדמנויות עם פוטנציאל ערך אמיתי.', en: 'Sourcing land and opportunities with real value potential.' } },
      { icon: 'shield', title: { he: 'איתנות פיננסית', en: 'Financial strength' }, desc: { he: 'מבנה הון יציב, ביטחונות וערבויות מלאות לאורך הפרויקט.', en: 'A stable capital structure, securities and full guarantees throughout.' } },
      { icon: 'check', title: { he: 'תכנון ורישוי', en: 'Planning & permitting' }, desc: { he: 'ניהול מקצועי של הליכים מול רשויות ומוסדות תכנון.', en: 'Professional management of processes with authorities and planning bodies.' } },
      { icon: 'handshake', title: { he: 'שותפות לטווח ארוך', en: 'Long-term partnership' }, desc: { he: 'יחסים הוגנים ושקופים עם בעלי קרקע ושותפים.', en: 'Fair, transparent relationships with landowners and partners.' } },
    ],
    guide: {
      title: { he: 'המדריך ליזמות נדל"ן', en: 'The development guide' },
      desc: { he: 'איך פרויקט נולד, מאיתור הקרקע ועד קבלת ההיתר.', en: 'How a project is born, from land sourcing to building permit.' },
    },
  },
  {
    slug: 'supervision',
    icon: 'shield',
    category: null,
    name: { he: 'קורקוס פיקוח', en: 'Kurkoos Supervision' },
    menuTitle: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
    hero: {
      title: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
      subtitle: {
        he: 'עיניים מקצועיות על כל פרט, פיקוח הנדסי צמוד שמבטיח איכות, בטיחות ועמידה בתקציב ובזמנים.',
        en: 'Professional eyes on every detail, close engineering supervision that ensures quality, safety, budget and schedule.',
      },
      image: img('1486325212027-8081e485255e'),
    },
    intro: {
      he: 'זרוע הפיקוח של קורקוס שומרת שכל פרויקט מבוצע בדיוק כפי שתוכנן. צוות המפקחים שלנו מלווה את הבנייה מההיתר ועד המסירה, בודק איכות וחומרים, מאשר חשבונות קבלן, מנהל לוחות זמנים ותקציב ואוכף תקני בטיחות. אנחנו מספקים שירותי פיקוח גם לפרויקטים שלנו וגם ללקוחות חיצוניים: יזמים, גופים מוסדיים ובעלי נכסים.',
      en: 'The Kurkoos supervision arm ensures every project is executed exactly as planned. Our supervisors accompany construction from permit to handover, checking quality and materials, approving contractor invoices, managing schedule and budget, and enforcing safety standards. We provide supervision for our own projects and for external clients alike: developers, institutional bodies and property owners.',
    },
    why: [
      { icon: 'shield', title: { he: 'פיקוח הנדסי צמוד', en: 'Close engineering oversight' }, desc: { he: 'נוכחות בשטח ובקרה רציפה לאורך כל הבנייה.', en: 'On-site presence and continuous control throughout construction.' } },
      { icon: 'check', title: { he: 'בקרת איכות וחומרים', en: 'Quality & materials control' }, desc: { he: 'בדיקה שיטתית מול המפרט ומול תקני הבנייה.', en: 'Systematic checking against the spec and building standards.' } },
      { icon: 'building', title: { he: 'בקרת תקציב וחשבונות', en: 'Budget & billing control' }, desc: { he: 'אישור חשבונות קבלן ומניעת חריגות תקציב.', en: 'Contractor-invoice approval and prevention of budget overruns.' } },
      { icon: 'crane', title: { he: 'ניהול לוחות זמנים', en: 'Schedule management' }, desc: { he: 'תיאום קבלנים ועמידה באבני הדרך של הפרויקט.', en: 'Contractor coordination and meeting project milestones.' } },
    ],
    guide: {
      title: { he: 'המדריך לפיקוח בנייה', en: 'The construction-supervision guide' },
      desc: { he: 'מה תפקיד המפקח ולמה הוא חוסך לכם זמן וכסף.', en: 'What a supervisor does and why it saves you time and money.' },
    },
  },
  {
    slug: 'brokerage',
    icon: 'brokerage',
    category: null,
    name: { he: 'קורקוס תיווך', en: 'Kurkoos Brokerage' },
    menuTitle: { he: 'תיווך', en: 'Brokerage' },
    hero: {
      title: { he: 'תיווך ושיווק', en: 'Brokerage & Marketing' },
      subtitle: {
        he: 'ליווי מלא ברכישה ובמכירה, שיווק פרויקטים והתאמת הנכס המדויק לצרכים ולחלום של כל לקוח.',
        en: 'Full guidance in buying and selling, project marketing and matching the exact property to each client’s needs.',
      },
      image: img('1560518883-ce09059eeffa'),
    },
    intro: {
      he: 'זרוע התיווך והשיווק של קורקוס מחברת בין אנשים לבתים. אנחנו משווקים את הפרויקטים של הקבוצה ושל לקוחותינו, מלווים רוכשים ומוכרים לאורך כל העסקה, ומתאימים לכל לקוח את הנכס המדויק לצרכים, לתקציב ולחלום שלו. עם היכרות עמוקה של השוק, שקיפות מלאה ושירות אישי, אנחנו הופכים את אחת ההחלטות הגדולות בחיים לתהליך בטוח ונעים.',
      en: 'The Kurkoos brokerage and marketing arm connects people with homes. We market the group’s projects and our clients’ properties, accompany buyers and sellers throughout the deal, and match each client with the exact property for their needs, budget and dream. With deep market knowledge, full transparency and personal service, we turn one of life’s biggest decisions into a safe, pleasant process.',
    },
    why: [
      { icon: 'handshake', title: { he: 'ליווי אישי לאורך העסקה', en: 'Personal guidance throughout' }, desc: { he: 'מתווך ייעודי שמלווה אתכם מהחיפוש ועד חתימת החוזה.', en: 'A dedicated agent guiding you from search to signing.' } },
      { icon: 'building', title: { he: 'שיווק פרויקטים', en: 'Project marketing' }, desc: { he: 'אסטרטגיית שיווק חכמה שמציגה כל פרויקט במלוא הערך שלו.', en: 'Smart marketing strategy that presents each project at its full value.' } },
      { icon: 'check', title: { he: 'התאמת הנכס המדויק', en: 'The right-fit property' }, desc: { he: 'הבנה עמוקה של הצרכים והתאמה מדויקת מתוך השוק כולו.', en: 'A deep grasp of your needs and a precise match from the whole market.' } },
      { icon: 'shield', title: { he: 'שקיפות וביטחון', en: 'Transparency & confidence' }, desc: { he: 'מידע מלא, מחירים הוגנים וליווי משפטי בכל שלב.', en: 'Full information, fair pricing and legal support at every stage.' } },
    ],
    guide: {
      title: { he: 'המדריך לרוכש ולמוכר', en: 'The buyer & seller guide' },
      desc: { he: 'איך לקנות או למכור נכון, צעד אחר צעד, בלי הפתעות.', en: 'How to buy or sell right, step by step, with no surprises.' },
    },
  },
]

export function getDivision(slug) {
  return divisions.find((d) => d.slug === slug)
}

export default divisions
