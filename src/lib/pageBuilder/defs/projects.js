import { factSection } from '../../../data/pageFacts.js'

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
    /* סקשני עובדות מ-data/pageFacts.js, כל הטקסטים והקישורים נערכים בעורך (PROJECTS_FACTS) */
    factSection('projects', 'list', 'building'),
    factSection('projects', 'more', 'page'),
    ['buyerFaq', 'שאלות רוכשים', 'faq'],
  ],
}
