/* ============================================================
   הגדרות אתר כלליות — פרטי קשר, רשתות חברתיות, ניווט.
   ערוך כאן את פרטי הקבוצה.
   ============================================================ */

export const site = {
  name: { he: 'קורקוס גרופ', en: 'Kurkoos Group' },
  logoText: { he: 'קורקוס', en: 'KURKOOS' },
  /* כתובת האתר בפרודקשן — משמשת ל-URLs מוחלטים ב-structured data (SEO).
     עדכן אם הדומיין שונה. */
  url: 'https://www.kurkoos-group.co.il',

  contact: {
    phone: '03-0000000',
    phoneDisplay: '03-000-0000',
    whatsapp: '972500000000',
    email: 'info@kurkoos-group.co.il',
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
        { label: { he: 'קיימות ו-ESG', en: 'Sustainability & ESG' }, to: '/sustainability' },
        { label: { he: 'חדשנות', en: 'Innovation' }, to: '/innovation' },
      ],
    },
    {
      label: { he: 'יזמות', en: 'Development' },
      to: '/divisions/development',
      children: [
        { label: { he: 'ייזום נדל"ן', en: 'Real-estate development' }, to: '/divisions/development' },
        { label: { he: 'מקרקע ועד מפתח', en: 'From land to key' }, to: '/divisions/development#why' },
        { label: { he: 'פרויקטים בייזום', en: 'Projects in development' }, to: '/divisions/development#projects' },
        { label: { he: 'המדריך ליזמות נדל"ן', en: 'Development guide' }, to: '/blog' },
      ],
    },
    {
      label: { he: 'ביצוע', en: 'Execution' },
      to: '/divisions/execution',
      children: [
        { label: { he: 'ביצוע ובנייה', en: 'Execution & construction' }, to: '/divisions/execution' },
        { label: { he: 'איכות ובטיחות', en: 'Quality & safety' }, to: '/divisions/execution#why' },
        { label: { he: 'פרויקטים בביצוע', en: 'Projects under construction' }, to: '/divisions/execution#projects' },
        { label: { he: 'המדריך לתהליך הבנייה', en: 'Construction-process guide' }, to: '/blog' },
      ],
    },
    {
      label: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
      to: '/divisions/supervision',
      children: [
        { label: { he: 'פיקוח הנדסי', en: 'Engineering supervision' }, to: '/divisions/supervision' },
        { label: { he: 'בקרת איכות ותקציב', en: 'Quality & budget control' }, to: '/divisions/supervision#why' },
        { label: { he: 'פרויקטים בפיקוח', en: 'Supervised projects' }, to: '/divisions/supervision#projects' },
        { label: { he: 'המדריך לפיקוח בנייה', en: 'Supervision guide' }, to: '/blog' },
      ],
    },
    { key: 'contact', to: '/#contact' },
  ],
}

export default site
