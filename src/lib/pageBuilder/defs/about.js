import { factSection } from '../../../data/pageFacts.js'

/* עמוד אודות: כותרת, החזון, ואחריהם רכיבים משותפים מספריית העורך */
export default {
  route: '/about',
  group: 'main',
  label: 'אודות',
  sections: [
    ['header', 'כותרת העמוד', 'heading', [
      { key: 'pages.about.eyebrow', label: 'תווית עליונה' },
      { key: 'pages.about.title', label: 'כותרת' },
      { key: 'pages.about.lead', label: 'טקסט מוביל', multiline: true },
    ]],
    ['vision', 'החזון', 'book'],
    /* סקשני עובדות מ-data/pageFacts.js, כל הטקסטים והקישורים נערכים בעורך (ABOUT_FACTS) */
    factSection('about', 'arms', 'cards'),
    factSection('about', 'how', 'text'),
    'stats',
    'valueChain',
    'partners',
    'contact',
  ],
}
