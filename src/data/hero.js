/* ============================================================
   שקופיות ה-Hero (כמו הקרוסלה של תדהר).
   כל שקופית: מספר מתגלגל + תווית, כותרת בשתי שורות, תמונה לקובייה.
   ------------------------------------------------------------
   image: נתיב לתמונת פרויקט (public/hero/). אם חסר — מוצג גרדיאנט ממותג.
   ============================================================ */

export const heroSlides = [
  {
    id: 1,
    stat: { value: 3200, suffix: '+', label: { he: 'יחידות דיור', en: 'Housing units' }, sub: { he: 'ועוד בדרך', en: 'and more on the way' } },
    lines: { he: ['בונים את הבית', 'הבא שלכם'], en: ['Building your', 'next home'] },
    image: '/divisions/kurkoos-showcase-poster.jpg',
  },
  {
    id: 2,
    stat: { value: 80, suffix: '+', label: { he: 'פרויקטים', en: 'Projects' }, sub: { he: 'ברחבי הארץ', en: 'across the country' } },
    lines: { he: ['מהקרקע', 'ועד המפתח'], en: ['From land', 'to key'] },
    image: '/execution-gallery/1.jpg',
  },
  {
    id: 3,
    stat: { value: 10, suffix: '', label: { he: 'שנות אחריות', en: 'Years warranty' }, sub: { he: 'על כל דירה', en: 'on every home' } },
    lines: { he: ['אחריות מלאה', 'ללא פשרות'], en: ['Full warranty', 'no compromise'] },
    image: '/divisions/humash-22-24.png',
  },
  {
    id: 4,
    stat: { value: 25, suffix: '+', label: { he: 'שנות ניסיון', en: 'Years experience' }, sub: { he: 'בכל שרשרת הערך', en: 'across the value chain' } },
    lines: { he: ['יזמות, בנייה,', 'פיקוח ותיווך'], en: ['Develop, build,', 'supervise, broker'] },
    image: '/execution-gallery/6.jpg',
  },
]

/* סרטון פתיח שמתנגן פעם אחת בטעינת האתר ואז נעלם.
   שים קובץ ב-public/intro.mp4 והפעל enabled. */
export const introVideo = {
  enabled: false, // שנה ל-true כשיהיה לך סרטון ב-public/intro.mp4
  src: '/intro.mp4',
}

/* "סרט חברה" שנפתח במודאל מכפתור ה-Hero.
   YouTube: { type:'youtube', id:'XXXX' }  |  קובץ: { type:'file', src:'/film.mp4' } */
export const companyFilm = {
  type: 'youtube',
  id: '', // הדבק מזהה YouTube, למשל 'dQw4w9WgXcQ'
  src: '/film.mp4',
}

export default heroSlides
