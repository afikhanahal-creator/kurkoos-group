/* ============================================================
   הגדרות אתר כלליות — פרטי קשר, רשתות חברתיות, ניווט.
   ערוך כאן את פרטי הקבוצה.
   ============================================================ */

export const site = {
  name: { he: 'קורקוס גרופ', en: 'Kurkoos Group' },
  logoText: { he: 'קורקוס', en: 'KURKOOS' },
  /* כתובת האתר בפרודקשן — משמשת ל-URLs מוחלטים ב-structured data (SEO).
     עדכן אם הדומיין שונה. */
  url: 'https://kurkoos-group.co.il',

  contact: {
    phone: '03-0000000',
    phoneDisplay: '03-000-0000',
    whatsapp: '972506855656',
    email: 'kurkoosgroup.sales@gmail.com',
    address: { he: 'רחוב הנגר 24, הוד השרון, מגדלי Amy קומה 2', en: '24 HaNagar St., Hod HaSharon, Amy Towers, Floor 2' },
    hours: { he: "א'–ה' 09:00–18:00", en: 'Sun–Thu 09:00–18:00' },
  },

  social: [
    { name: 'Facebook', url: 'https://facebook.com', icon: 'facebook' },
  ],

  /* ניווט ראשי — מבוסס תחומים (דיוויזיות), במבנה של תדהר.
     פריט עם children מציג תפריט נפתח (mega-menu).
     label: {he,en} גובר על מפתח התרגום nav.<key>. */
  nav: [
    {
      key: 'about',
      to: '/about',
      children: [
        { label: { he: 'אודות הקבוצה', en: 'About the group' }, to: '/about' },
        { label: { he: 'הצוות וההנהלה', en: 'Team & management' }, to: '/team' },
        { label: { he: 'שרשרת הערך', en: 'Value chain' }, to: '/about#value-chain' },
      ],
    },
    {
      label: { he: 'יזמות', en: 'Development' },
      to: '/divisions/development',
      children: [
        { label: { he: 'ייזום נדל"ן', en: 'Real-estate development' }, to: '/divisions/development' },
        { label: { he: 'קורקוס יזמות', en: 'Kurkoos Development' }, to: '/divisions/development#why' },
        { label: { he: 'פרויקטים נבחרים', en: 'Selected projects' }, to: '/divisions/development#projects' },
        { label: { he: 'המדריך ליזמות נדל"ן', en: 'The development guide' }, to: '/yazamut-nadlan' },
      ],
    },
    {
      label: { he: 'ביצוע', en: 'Execution' },
      to: '/divisions/execution',
      children: [
        { label: { he: 'ביצוע ובנייה', en: 'Execution & Construction' }, to: '/divisions/execution' },
        { label: { he: 'ראיתה. ביצוע מנצח.', en: 'Raita. Winning execution.' }, to: '/divisions/execution#why' },
        { label: { he: 'פרויקטים נבחרים', en: 'Selected projects' }, to: '/divisions/execution#projects' },
        { label: { he: 'המדריך לתהליך הבנייה', en: 'The construction-process guide' }, to: '/constructions' },
      ],
    },
    {
      label: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
      to: '/divisions/supervision',
      children: [
        { label: { he: 'פיקוח פרויקטים', en: 'Project supervision' }, to: '/divisions/supervision' },
        { label: { he: 'שכינתא ניהול ויזום פרוייקטים', en: 'Shechinta Project Management' }, to: '/divisions/supervision#why' },
        { label: { he: 'פרויקטים נבחרים', en: 'Selected projects' }, to: '/divisions/supervision#projects' },
        { label: { he: 'המדריך לפיקוח בנייה', en: 'The construction-supervision guide' }, to: '/construction-supervision' },
      ],
    },
    {
      label: { he: 'תיווך', en: 'Brokerage' },
      to: '/divisions/brokerage',
      children: [
        { label: { he: 'תיווך ושיווק', en: 'Brokerage & Marketing' }, to: '/divisions/brokerage' },
        { label: { he: 'אפיק הנחל', en: 'Afik Hanachal' }, to: '/divisions/brokerage#why' },
        { label: { he: 'פרויקטים בשיווק', en: 'Projects in marketing' }, to: '/divisions/brokerage#projects' },
        { label: { he: 'המדריך לרוכש ולמוכר', en: 'The buyer & seller guide' }, to: '/real-estate-guide' },
      ],
    },
    { key: 'contact', to: '/#contact' },
  ],
}

export default site
