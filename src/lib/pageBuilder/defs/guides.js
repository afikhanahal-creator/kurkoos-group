/* חמשת עמודי הרשימה של המדריכים. לכולם אותו מבנה: כותרת, ואחריה
   הסינון לפי נושא ורשת הכתבות. כל עמוד נשמר בעורך בנתיב שלו. */
export default {
  route: '/yazamut-nadlan',
  group: 'guides',
  label: 'מדריך יזמות',
  pages: [
    ['/yazamut-nadlan', 'מדריך יזמות', 'guides'],
    ['/constructions', 'מדריך הבנייה', 'guides'],
    ['/construction-supervision', 'מדריך הפיקוח', 'guides'],
    ['/real-estate-guide', 'מדריך לרוכש ולמוכר', 'guides'],
    ['/madrich-yazamim', 'מדריך ליזמים צעירים', 'guides'],
  ],
  routes: [
    { route: '/yazamut-nadlan' },
    { route: '/constructions' },
    { route: '/construction-supervision' },
    { route: '/real-estate-guide' },
    { route: '/madrich-yazamim' },
  ],
  sections: [
    ['header', 'כותרת העמוד', 'heading'],
    ['list', 'רשימת הכתבות', 'cards'],
  ],
}
