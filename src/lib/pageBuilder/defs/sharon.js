/* עמוד נדל"ן בשרון: כותרת, פסקת פתיחה, שירותים, פרויקטים, שאלות ויצירת קשר */
export default {
  route: '/real-estate-sharon',
  group: 'main',
  label: 'נדל"ן בשרון',
  sections: [
    ['header', 'כותרת העמוד', 'heading'],
    ['intro', 'פסקת פתיחה', 'text'],
    ['services', 'השירותים שלנו', 'grid'],
    /* סקשני עובדות מ-data/pageFacts.js (SHARON_FACTS) */
    ['local', 'הפרויקטים בהוד השרון', 'building'],
    ['cities', 'בניית בית פרטי לפי עיר', 'pin'],
    ['projects', 'פרויקטים נבחרים', 'building'],
    ['faq', 'שאלות נפוצות', 'faq'],
    'contact',
  ],
}
