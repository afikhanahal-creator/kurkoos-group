/* בניית וילות ובתים פרטיים בשרון: הסדר הקבוע מהקוד. הטקסטים מגיעים מקבצי
   הנתונים (data/villasPage.js) ומהגדרות "בתים פרטיים ווילות" באדמין */
export default {
  route: '/villas-sharon',
  group: 'land',
  label: 'וילות בשרון',
  sections: [
    ['header', 'כותרת העמוד', 'hero'],
    ['brief', 'בקצרה', 'check'],
    ['intro', 'מי בונה לכם את הבית', 'text'],
    ['projects', 'הפרויקטים והמפרט', 'building'],
    ['gallery', 'תמונות מהשטח', 'images'],
    ['traits', 'איך אנחנו בונים', 'cards'],
    ['cta', 'סיור בפרויקטים', 'cursor'],
    ['faq', 'שאלות נפוצות', 'faq'],
    'contact',
  ],
}
