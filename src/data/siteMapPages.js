/* ============================================================
   מפת האתר למשתמשים (/mapat-atar). מקור אחד לעמוד החי ול-prerender.
   הכתבות לא כתובות כאן: הן נמשכות מקבצי הטורים, כך שכל כתבה חדשה
   נכנסת למפה בלי תחזוקה. עמוד קבוע חדש באתר: להוסיף אותו גם כאן.
   ============================================================ */
export const SITE_MAP_PATH = '/mapat-atar'
export const SITE_MAP_TITLE = 'מפת האתר'
export const SITE_MAP_INTRO = 'כל העמודים והמדריכים באתר קבוצת קורקוס במקום אחד: השירותים, עמודי בניית הבית הפרטי לפי עיר, הפרויקטים, הכלים וכל הכתבות בחמשת הטורים.'

export const SITE_MAP_GROUPS = [
  {
    id: 'main',
    title: 'הקבוצה',
    links: [
      ['/', 'דף הבית'],
      ['/about', 'אודות הקבוצה'],
      ['/team', 'הצוות'],
      ['/projects', 'הפרויקטים'],
      ['/careers', 'דרושים'],
      ['/contact', 'השארת פרטים ויצירת קשר'],
    ],
  },
  {
    id: 'divisions',
    title: 'הזרועות והשירותים',
    links: [
      ['/divisions/development', 'יזמות נדל"ן'],
      ['/divisions/execution', 'ביצוע ובנייה'],
      ['/divisions/supervision', 'ניהול ופיקוח פרויקטים'],
      ['/divisions/brokerage', 'תיווך ושיווק נכסים'],
      ['/divisions/residential', 'מגורים'],
      ['/livy-yazamim', 'ליווי יזמי נדל"ן'],
    ],
  },
  {
    id: 'house',
    title: 'בניית בית פרטי, וילות ומגרשים',
    links: [
      ['/bniyat-bayit-prati', 'בניית בית פרטי בכל הארץ'],
      ['/kablan-bniya-bayit-prati', 'קבלן בנייה לבית פרטי'],
      ['/bniyat-vila-sharon', 'בניית וילה בשרון'],
      ['/villas-sharon', 'בניית וילות ובתים פרטיים בהוד השרון'],
      ['/migrashim-vekarkaot', 'מגרשים וקרקעות'],
      ['/hod-hasharon/bniya-vepikuach', 'חברת בנייה ופיקוח בהוד השרון'],
      ['/real-estate-sharon', 'נדל"ן בהוד השרון ובאזור המרכז'],
    ],
  },
  {
    id: 'cities',
    title: 'בניית בית פרטי לפי עיר',
    links: [
      ['/bniyat-bayit-prati/hod-hasharon', 'הוד השרון'],
      ['/bniyat-bayit-prati/raanana', 'רעננה'],
      ['/bniyat-bayit-prati/herzliya', 'הרצליה'],
      ['/bniyat-bayit-prati/kfar-saba', 'כפר סבא'],
      ['/bniyat-bayit-prati/ramat-hasharon', 'רמת השרון'],
      ['/bniyat-bayit-prati/tel-aviv', 'תל אביב'],
      ['/bniyat-bayit-prati/kiryat-ono', 'קריית אונו'],
      ['/bniyat-bayit-prati/yehud-monosson', 'יהוד מונוסון'],
    ],
  },
  {
    id: 'tools',
    title: 'כלים ומידע',
    links: [
      ['/shelot-ve-tshuvot', 'שאלות ותשובות'],
      ['/real-estate-glossary', 'מילון מונחי נדל"ן'],
      ['/real-estate-calculators', 'מחשבוני נדל"ן'],
      ['/blog', 'הבלוג'],
    ],
  },
  {
    id: 'legal',
    title: 'מידע משפטי',
    links: [
      ['/accessibility', 'הצהרת נגישות'],
      ['/privacy', 'מדיניות פרטיות'],
      ['/terms', 'תקנון ותנאי שימוש'],
    ],
  },
]
