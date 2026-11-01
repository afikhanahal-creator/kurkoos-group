/* עמוד כל הפרויקטים: קולאז' הפרויקטים ושאלות הרוכשים */
export default {
  route: '/projects',
  group: 'main',
  label: 'פרויקטים',
  sections: [
    ['collage', 'קולאז\' הפרויקטים', 'building', [
      { key: 'pages.projects.title', label: 'כותרת' },
      { key: 'pages.projects.lead', label: 'טקסט מוביל', multiline: true },
    ]],
    /* סקשני עובדות מ-data/pageFacts.js (PROJECTS_FACTS) */
    ['list', 'הפרויקטים בפירוט', 'building'],
    ['more', 'לפי סוג הפרויקט', 'page'],
    ['buyerFaq', 'שאלות רוכשים', 'faq'],
  ],
}
