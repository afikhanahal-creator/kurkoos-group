/* סכימת שדות לטפסים — הטפסים נבנים מכאן (schema-driven).
   הוספת שדה כאן = השדה מופיע אוטומטית בטופס. */

export const PROJECT_STATUS = [
  { value: 'planning', label: 'בתכנון' },
  { value: 'marketing', label: 'בשיווק' },
  { value: 'construction', label: 'בבנייה' },
  { value: 'completed', label: 'הושלם' },
  { value: 'sold', label: 'נמכר' },
]

// העמודים שבהם הפרויקט יכול להופיע. בחירת כמה = הפרויקט משוכפל לכל העמודים.
export const PROJECT_PAGES = [
  { value: 'development', label: 'יזמות', hint: '/divisions/development' },
  { value: 'execution', label: 'ביצוע', hint: '/divisions/execution' },
  { value: 'featured', label: 'פרויקטים נבחרים', hint: '/projects' },
  { value: 'brokerage', label: 'תיווך', hint: '/divisions/brokerage' },
]

export const PROPERTY_TYPE = [
  { value: 'apartment', label: 'דירה' },
  { value: 'garden_apartment', label: 'דירת גן' },
  { value: 'penthouse', label: 'פנטהאוז' },
  { value: 'duplex', label: 'דופלקס' },
  { value: 'villa', label: 'וילה' },
  { value: 'commercial', label: 'מסחרי' },
]

export const PROPERTY_STATUS = [
  { value: 'available', label: 'זמין' },
  { value: 'reserved', label: 'בהמתנה' },
  { value: 'sold', label: 'נמכר' },
]

export const projectSchema = [
  {
    section: 'פרטים בסיסיים',
    fields: [
      { key: 'name', label: 'שם הפרויקט', type: 'text', required: true },
      { key: 'slug', label: 'מזהה כתובת (אנגלית, ללא רווחים)', type: 'text', required: true, hint: 'משמש בכתובת הדף: /projects/<slug>' },
      { key: 'subtitle', label: 'כותרת משנה', type: 'text' },
      { key: 'status', label: 'סטטוס', type: 'select', options: PROJECT_STATUS },
      { key: 'location', label: 'עיר', type: 'text' },
      { key: 'address', label: 'כתובת מלאה (תופיע על המפה)', type: 'text', hint: 'הכתובת המדויקת — נטענת אוטומטית למפה בעמוד הפרויקט' },
      { key: 'gush', label: 'גוש', type: 'text' },
      { key: 'chelka', label: 'חלקה', type: 'text' },
      { key: 'description', label: 'תיאור הפרויקט', type: 'textarea' },
    ],
  },
  {
    section: 'עמודים ופרסום',
    fields: [
      {
        key: 'pages',
        label: 'באילו עמודים יופיע?',
        type: 'multiselect',
        options: PROJECT_PAGES,
        hint: 'בחרו עמוד אחד או יותר — הפרויקט יופיע בכל אחד מהם',
      },
      { key: 'is_published', label: 'מפורסם באתר', type: 'bool' },
    ],
  },
  {
    section: 'SEO',
    fields: [
      { key: 'seo_title', label: 'כותרת SEO', type: 'text' },
      { key: 'seo_description', label: 'תיאור SEO', type: 'textarea' },
    ],
  },
]

export const propertySchema = [
  {
    section: 'פרטים בסיסיים',
    fields: [
      { key: 'unit_number', label: 'מספר יחידה', type: 'text' },
      { key: 'type', label: 'סוג נכס', type: 'select', options: PROPERTY_TYPE },
      { key: 'status', label: 'סטטוס', type: 'select', options: PROPERTY_STATUS },
      { key: 'rooms', label: 'חדרים', type: 'number' },
      { key: 'floor', label: 'קומה', type: 'text' },
    ],
  },
  {
    section: 'מידות',
    fields: [
      { key: 'size_sqm', label: 'שטח (מ"ר)', type: 'number' },
      { key: 'garden_sqm', label: 'גינה (מ"ר)', type: 'number' },
      { key: 'balcony_sqm', label: 'מרפסת (מ"ר)', type: 'number' },
    ],
  },
  {
    section: 'מחיר',
    fields: [
      { key: 'price', label: 'מחיר (₪)', type: 'number' },
      { key: 'price_visible', label: 'הצג מחיר באתר', type: 'bool' },
    ],
  },
  {
    section: 'תוכן',
    fields: [
      { key: 'description', label: 'תיאור הנכס', type: 'textarea' },
    ],
  },
  {
    section: 'נראות',
    fields: [
      { key: 'is_published', label: 'מפורסם באתר', type: 'bool' },
    ],
  },
]

// ערכי ברירת מחדל ליצירת רשומה חדשה
export const newProjectDefaults = () => ({
  name: 'פרויקט חדש',
  slug: 'project-' + Math.random().toString(36).slice(2, 7),
  status: 'planning',
  is_published: false,
  pages: [],
  gallery: [],
})

export const newPropertyDefaults = (projectId) => ({
  project_id: projectId,
  unit_number: '',
  type: 'apartment',
  status: 'available',
  price_visible: true,
  is_published: true,
  gallery: [],
})
