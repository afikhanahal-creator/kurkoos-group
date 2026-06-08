/* סכימת שדות לטפסים — הטפסים נבנים מכאן (schema-driven).
   הוספת שדה כאן = השדה מופיע אוטומטית בטופס. */

export const PROJECT_STATUS = [
  { value: 'planning', label: 'בתכנון' },
  { value: 'marketing', label: 'בשיווק' },
  { value: 'construction', label: 'בבנייה' },
  { value: 'completed', label: 'הושלם' },
  { value: 'sold', label: 'נמכר' },
]

// תצוגת כרטיס הפרויקט בגלריית "כל הפרויקטים" — משפיע על הפריסה בעמוד
export const PROJECT_CARD_LAYOUT = [
  { value: 'normal', label: 'רגיל (לאורך)' },
  { value: 'wide', label: 'רחב (לרוחב)' },
  { value: 'tall', label: 'גבוה' },
]

// מקטעים בעמוד הפרויקט — בחירה אילו חלקים יוצגו (נשמר בענן לכל פרויקט)
export const PROJECT_SECTIONS = [
  { value: 'project', label: 'הפרויקט' },
  { value: 'environment', label: 'הסביבה' },
  { value: 'map', label: 'מפה' },
  { value: 'plans', label: 'תוכניות' },
  { value: 'gallery', label: 'גלריה' },
  { value: 'contact', label: 'לתיאום פגישה' },
  { value: 'developers', label: 'יזמי הפרויקט' },
  { value: 'more', label: 'פרויקטים נוספים' },
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
      { key: 'slug', label: 'מזהה כתובת (אנגלית, ללא רווחים)', type: 'text', required: true, dir: 'ltr', hint: 'משמש בכתובת הדף: /projects/<slug>' },
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
    section: 'נתוני הפרויקט',
    fields: [
      { key: 'towers', label: 'בניינים', type: 'number' },
      { key: 'units', label: 'יחידות דיור', type: 'number' },
      { key: 'floors', label: 'קומות', type: 'text', dir: 'ltr', hint: 'אפשר טווח, למשל "7-8"' },
      { key: 'architects', label: 'אדריכלים', type: 'text' },
      { key: 'year', label: 'שנת אכלוס', type: 'number' },
    ],
  },
  {
    section: 'סרטון',
    fields: [
      {
        key: 'video',
        label: 'סרטון YouTube',
        type: 'video',
        hint: 'הדביקו את מזהה הסרטון מ-YouTube (החלק שאחרי v= בכתובת). מפעיל את כפתור ה-Play בבאנר.',
      },
    ],
  },
  {
    section: 'מיקום על המפה',
    fields: [
      {
        key: 'coords',
        label: 'קואורדינטות (אופציונלי)',
        type: 'coords',
        hint: 'קו רוחב (lat) וקו אורך (lng) — מציגים סמן מפה מלוטש. ללא ערכים תוצג המפה לפי הכתובת.',
      },
    ],
  },
  {
    section: 'הסביבה',
    fields: [
      {
        key: 'environment',
        label: 'מקטע הסביבה',
        type: 'environment',
        hint: 'כותרת, טקסט ותמונה למקטע "הסביבה" בעמוד הפרויקט.',
      },
    ],
  },
  {
    section: 'תוכניות דירות',
    fields: [
      {
        key: 'plan_groups',
        label: 'תוכניות לפי מספר חדרים',
        type: 'plan_groups',
        hint: 'קבוצות תוכניות — לכל קבוצה מספר חדרים, כותרת ורשימת תשריטים (כותרת + תמונה).',
      },
    ],
  },
  {
    section: 'גלריה לפי קטגוריות',
    fields: [
      {
        key: 'gallery_groups',
        label: 'קטגוריות גלריה',
        type: 'gallery_groups',
        hint: 'חלוקת הגלריה ללשוניות — לכל קטגוריה כותרת ורשימת תמונות. ריק = גלריה אחת רגילה.',
      },
    ],
  },
  {
    section: 'מאפיינים',
    fields: [
      {
        key: 'amenities',
        label: 'מאפייני הפרויקט',
        type: 'features',
        hint: 'רשימת מאפיינים שתופיע במקטע "הפרויקט" (למשל: לובי מלונאי, בריכה, חניון).',
      },
    ],
  },
  {
    section: 'מקטעים בעמוד הפרויקט',
    fields: [
      {
        key: 'sections',
        label: 'אילו מקטעים יוצגו בעמוד?',
        type: 'multiselect',
        options: PROJECT_SECTIONS,
        hint: 'סמנו אילו חלקים יופיעו בעמוד הפרויקט. ללא בחירה — כל המקטעים מוצגים.',
      },
    ],
  },
  {
    section: 'יזמי הפרויקט',
    fields: [
      {
        key: 'developers',
        label: 'יזמים ושותפים',
        type: 'developers',
        hint: 'הוסיפו את הגופים שמקימים את הפרויקט — שם, לוגו וטקסט קצר. מופיע במקטע "יזמי הפרויקט".',
      },
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
      {
        key: 'card_layout',
        label: 'תצוגת הכרטיס בגלריית הפרויקטים',
        type: 'select',
        options: PROJECT_CARD_LAYOUT,
        hint: 'כך התמונה תופיע בעמוד "כל הפרויקטים" — רחב = לרוחב, גבוה = בולט לגובה',
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
  sections: PROJECT_SECTIONS.map((s) => s.value),
  card_layout: 'normal',
  gallery: [],
  amenities: [],
  video: {},
  coords: {},
  environment: {},
  plan_groups: [],
  gallery_groups: [],
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
