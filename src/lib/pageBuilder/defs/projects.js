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
    ['buyerFaq', 'שאלות רוכשים', 'faq'],
  ],
}
