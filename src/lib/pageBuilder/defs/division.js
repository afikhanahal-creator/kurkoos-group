/* עמודי החטיבות: הסדר הקבוע מהקוד. כל סקשן הוא סקשן של העמוד עצמו.
   חלק מהסקשנים מוצגים רק בחלק מהחטיבות (התנאי נשאר בתוך הסקשן),
   ולכל חטיבה יש מבנה משלה בעורך לפי הכתובת שלה. */
const T = (key, label, multiline = false) => ({ key, label, multiline })

export default {
  route: '/divisions/:slug',
  group: 'div',
  label: 'חטיבות',
  pages: [
    ['/divisions/residential', 'מגורים', 'div'],
    ['/divisions/execution', 'ביצוע', 'div'],
    ['/divisions/development', 'יזמות', 'div'],
    ['/divisions/supervision', 'פיקוח', 'div'],
    ['/divisions/brokerage', 'תיווך', 'div'],
  ],
  sections: [
    ['hero', 'באנר', 'hero'],
    ['showcase', 'סרטון התקדמות הבנייה', 'play'],
    ['intro', 'פתיחה', 'text'],
    ['why', 'למה אנחנו', 'cards', [T('activities.eyebrow', 'תווית עליונה')]],
    ['beforeAfter', 'לפני ואחרי', 'images'],
    ['site', 'האתר שלנו', 'page'],
    /* הגלריה "הופכים תוכניות לביצוע" (רק בעמוד הביצוע). התמונות נערכות כאן בעורך, או בלשונית תמונות קאבר:
       אותה הגדרה (cover_execution_gallery), ולכן שני המקומות תמיד מסונכרנים */
    ['gallery', 'תיעוד מהשטח: הופכים תוכניות לביצוע', 'images', [], {
      images: { setting: 'cover_execution_gallery', label: 'תמונות הגלריה', folder: 'execution-gallery', max: 12, only: '/divisions/execution', fallback: 'execution' },
      manage: { tab: 'covers', label: 'תמונות קאבר' },
    }],
    /* סרטונים מהשטח (רק בעמוד הביצוע, מתחת לגלריה): הסרטונים והטקסטים נשמרים ב-execution_showcase */
    ['reels', 'סרטונים מהשטח', 'play', [], {
      showcase: { setting: 'execution_showcase', folder: 'execution-showcase', max: 16, only: '/divisions/execution' },
    }],
    ['projects', 'פרויקטים', 'building', [T('projects.title', 'כותרת'), T('projects.lead', 'טקסט מוביל', true)]],
    ['testimonials', 'המלצות', 'quote', [T('testimonials.eyebrow', 'תווית עליונה'), T('testimonials.title', 'כותרת'), T('testimonials.lead', 'טקסט מוביל', true)]],
    ['guide', 'מדריך', 'book', [T('common.readMore', 'קרא עוד')]],
    ['faq', 'שאלות נפוצות', 'faq'],
    ['contact', 'צור קשר', 'mail', [T('contact.eyebrow', 'תווית עליונה'), T('contact.title', 'כותרת'), T('contactExtra.choose', 'בחירת נושא')]],
  ],
}
