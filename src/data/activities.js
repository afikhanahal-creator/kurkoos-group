/* ============================================================
   תחומי הפעילות של הקבוצה (כרטיסים בעמוד הבית).
   icon  = שם אייקון מתוך components/ui/Icon.jsx
   desc  = תיאור מלא (כרטיסי דסקטופ)
   short = משפט קצר מאוד (6-7 מילים) — לתפריט המובייל
   image = תמונת התחום (תמונת ה-hero של הדיוויזיה) — לתצוגת המובייל
   ============================================================ */

export const activities = [
  {
    id: 'development',
    icon: 'building',
    to: '/divisions/development',
    image: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=900&q=80',
    title: { he: 'יזמות נדל"ן', en: 'Real-estate development' },
    short: {
      he: 'איתור, תכנון והובלת פרויקטים משלב הרעיון',
      en: 'Sourcing, planning and leading projects from concept',
    },
    desc: {
      he: 'איתור קרקעות, ייזום פרויקטים והובלה שלהם מהרעיון הראשוני ועד למסירה, עם ניהול סיכונים חכם ומיצוי הערך המלא עבורכם.',
      en: 'Land acquisition, project initiation and leadership from concept to handover, with smart risk management that maximizes value for you.',
    },
  },
  {
    id: 'construction',
    icon: 'crane',
    to: '/divisions/execution',
    image: '/divisions/execution-bg.jpg',
    title: { he: 'בנייה וביצוע', en: 'Construction & execution' },
    short: {
      he: 'בונים באיכות גבוהה ובסטנדרטים מתקדמים',
      en: 'Building at high quality and advanced standards',
    },
    desc: {
      he: 'ביצוע בנייה באיכות גבוהה, עם צוותי שטח מנוסים, חומרים מהשורה הראשונה ועמידה קפדנית בלוחות זמנים.',
      en: 'High-quality construction with experienced field teams, premium materials and strict schedule adherence.',
    },
  },
  {
    id: 'supervision',
    icon: 'shield',
    to: '/divisions/supervision',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=900&q=80',
    title: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
    short: {
      he: 'מנהלים ומפקחים על כל שלבי הביצוע',
      en: 'Managing and supervising every stage of execution',
    },
    desc: {
      he: 'פיקוח הנדסי צמוד, בקרת איכות ותקציב, וניהול מקצועי שמבטיח שכל פרט מבוצע בדיוק כפי שתוכנן.',
      en: 'Close engineering supervision, quality and budget control, ensuring every detail is executed exactly as planned.',
    },
  },
  {
    id: 'brokerage',
    icon: 'handshake',
    to: '/divisions/brokerage',
    image: '/afik-hanahal-cover.png',
    title: { he: 'תיווך ושיווק', en: 'Brokerage & marketing' },
    short: {
      he: 'מחברים בין הזדמנויות לאנשים הנכונים',
      en: 'Connecting the right opportunities with the right people',
    },
    desc: {
      he: 'ליווי מלא ברכישה ובמכירה, שיווק פרויקטים והתאמת הנכס המדויק לצרכים ולחלום של כל לקוח.',
      en: 'Full guidance in buying and selling, project marketing and matching the exact property to each client’s needs.',
    },
  },
]

export default activities
