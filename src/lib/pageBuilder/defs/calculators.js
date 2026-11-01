import { factSection } from '../../../data/pageFacts.js'

/* מחשבוני נדל"ן: פתיחה, מחשבון משכנתא, מחשבון תשואה, שאלות, קישורים וטופס */
export default {
  route: '/real-estate-calculators',
  group: 'guides',
  label: 'מחשבוני נדל"ן',
  sections: [
    ['hero', 'פתיחה', 'hero'],
    ['mortgage', 'מחשבון משכנתא', 'chart'],
    ['yield', 'מחשבון תשואה', 'chart'],
    /* סקשן עובדות מ-data/pageFacts.js, כל הטקסטים והקישורים נערכים בעורך (CALC_FACTS) */
    factSection('calc', 'read', 'check'),
    ['faq', 'שאלות נפוצות', 'faq'],
    ['links', 'המשך קריאה', 'page'],
    ['lead', 'טופס', 'form'],
  ],
}
