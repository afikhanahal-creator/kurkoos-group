/* מחשבוני נדל"ן: פתיחה, מחשבון משכנתא, מחשבון תשואה, שאלות, קישורים וטופס */
export default {
  route: '/real-estate-calculators',
  group: 'guides',
  label: 'מחשבוני נדל"ן',
  sections: [
    ['hero', 'פתיחה', 'hero'],
    ['mortgage', 'מחשבון משכנתא', 'chart'],
    ['yield', 'מחשבון תשואה', 'chart'],
    /* סקשן עובדות מ-data/pageFacts.js (CALC_FACTS) */
    ['read', 'איך קוראים את התוצאה', 'check'],
    ['faq', 'שאלות נפוצות', 'faq'],
    ['links', 'המשך קריאה', 'page'],
    ['lead', 'טופס', 'form'],
  ],
}
