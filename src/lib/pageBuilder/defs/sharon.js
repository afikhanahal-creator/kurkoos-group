import { factSection } from '../../../data/pageFacts.js'

/* עמוד נדל"ן בשרון: כותרת, פסקת פתיחה, שירותים, פרויקטים, שאלות ויצירת קשר */
export default {
  route: '/real-estate-sharon',
  group: 'main',
  label: 'נדל"ן בשרון',
  sections: [
    ['header', 'כותרת העמוד', 'heading'],
    ['intro', 'פסקת פתיחה', 'text'],
    ['services', 'השירותים שלנו', 'grid'],
    /* סקשני עובדות מ-data/pageFacts.js, כל הטקסטים והקישורים נערכים בעורך (SHARON_FACTS) */
    factSection('sharon', 'local', 'building'),
    factSection('sharon', 'cities', 'pin'),
    ['projects', 'פרויקטים נבחרים', 'building'],
    ['faq', 'שאלות נפוצות', 'faq'],
    'contact',
  ],
}
