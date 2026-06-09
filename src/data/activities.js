/* ============================================================
   תחומי הפעילות של הקבוצה (כרטיסים בעמוד הבית).
   icon = שם אייקון מתוך components/ui/Icon.jsx
   ============================================================ */

export const activities = [
  {
    id: 'development',
    icon: 'building',
    to: '/divisions/development',
    title: { he: 'יזמות נדל"ן', en: 'Real-estate development' },
    desc: {
      he: 'איתור קרקעות, ייזום פרויקטים והובלה שלהם מהרעיון הראשוני ועד למסירה, עם ניהול סיכונים חכם ומיצוי הערך המלא עבורכם.',
      en: 'Land acquisition, project initiation and leadership from concept to handover, with smart risk management that maximizes value for you.',
    },
  },
  {
    id: 'construction',
    icon: 'crane',
    to: '/divisions/execution',
    title: { he: 'בנייה וביצוע', en: 'Construction & execution' },
    desc: {
      he: 'ביצוע בנייה באיכות גבוהה, עם צוותי שטח מנוסים, חומרים מהשורה הראשונה ועמידה קפדנית בלוחות זמנים.',
      en: 'High-quality construction with experienced field teams, premium materials and strict schedule adherence.',
    },
  },
  {
    id: 'supervision',
    icon: 'shield',
    to: '/divisions/supervision',
    title: { he: 'פיקוח על פרויקטים', en: 'Project supervision' },
    desc: {
      he: 'פיקוח הנדסי צמוד, בקרת איכות ותקציב, וניהול מקצועי שמבטיח שכל פרט מבוצע בדיוק כפי שתוכנן.',
      en: 'Close engineering supervision, quality and budget control, ensuring every detail is executed exactly as planned.',
    },
  },
  {
    id: 'brokerage',
    icon: 'handshake',
    to: '/divisions/brokerage',
    title: { he: 'תיווך ושיווק', en: 'Brokerage & marketing' },
    desc: {
      he: 'ליווי מלא ברכישה ובמכירה, שיווק פרויקטים והתאמת הנכס המדויק לצרכים ולחלום של כל לקוח.',
      en: 'Full guidance in buying and selling, project marketing and matching the exact property to each client’s needs.',
    },
  },
]

export default activities
