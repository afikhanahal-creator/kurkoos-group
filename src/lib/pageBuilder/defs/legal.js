/* העמודים המשפטיים: הצהרת נגישות, מדיניות פרטיות ותנאי שימוש.
   לכולם אותו מבנה: כותרת, ואחריה המסמך. כל עמוד נשמר בעורך בנתיב שלו.
   הכותרת מגיעה מ-pages.legal.<kind>, ולכן אינה מופיעה כאן כטקסט משותף. */
export default {
  route: '/accessibility',
  group: 'legal',
  label: 'הצהרת נגישות',
  pages: [
    ['/accessibility', 'הצהרת נגישות', 'legal'],
    ['/privacy', 'מדיניות פרטיות', 'legal'],
    ['/terms', 'תנאי שימוש', 'legal'],
  ],
  routes: [
    { route: '/accessibility' },
    { route: '/privacy' },
    { route: '/terms' },
  ],
  sections: [
    ['header', 'כותרת העמוד', 'heading'],
    ['doc', 'המסמך', 'page'],
  ],
}
