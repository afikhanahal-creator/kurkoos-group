import { HOUSE_PAGES } from '../../../data/houseLanding.js'

/* עמודי הנחיתה לבניית בית פרטי: שני עמודי שירות ועמוד לכל עיר. כולם
   באותו מבנה, והתוכן שלהם מגיע מ-data/houseLanding.js */
const LANDING_LABELS = {
  '/kablan-bniya-bayit-prati': 'קבלן לבית פרטי',
  '/bniyat-vila-sharon': 'בניית וילה בשרון',
  '/bniyat-bayit-prati': 'בניית בית פרטי בכל הארץ',
  '/migrashim-vekarkaot': 'מגרשים וקרקעות',
}

export default {
  route: '/kablan-bniya-bayit-prati',
  routes: [{ route: '/bniyat-vila-sharon' }, { route: '/bniyat-bayit-prati' }, { route: '/bniyat-bayit-prati/:city' }, { route: '/migrashim-vekarkaot' }],
  group: 'land',
  label: 'קבלן לבית פרטי',
  pages: HOUSE_PAGES.map((p) => (p.city ? [p.path, p.city, 'city'] : [p.path, LANDING_LABELS[p.path] || p.navLabel, 'land'])),
  sections: [
    ['hero', 'כותרת ושלט האתר', 'hero'],
    ['proof', 'בקצרה', 'chart'],
    ['jump', 'בעמוד הזה', 'page'],
    ['intro', 'תשובה ישירה ושתי הזרועות', 'text'],
    ['steps', 'השלבים', 'chain'],
    ['band', 'קריאה לפעולה', 'cursor'],
    ['projects', 'פרויקטים', 'building'],
    ['check', 'מה בודקים לפני שבונים', 'check'],
    ['faq', 'שאלות נפוצות', 'faq'],
    ['links', 'עוד בנושא', 'book'],
    ['lead', 'טופס הערכת עלות', 'form'],
  ],
}
