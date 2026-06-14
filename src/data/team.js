/* ============================================================
   חברי הצוות. תמונות דמו (Unsplash) — החלף בנתיב מקומי /team/*.jpg.
   הוסף איש צוות = הוסף אובייקט למערך.
   ============================================================ */

const photo = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`

export const team = [
  {
    id: 'shlomi',
    name: { he: 'שלומי קורקוס', en: 'Shlomi Kurkoos' },
    role: { he: 'מנכ"ל ומייסד', en: 'CEO & Founder' },
    photo: photo('1560250097-0b93528c311a'),
    bio: {
      he: 'מוביל את הקבוצה מאז הקמתה עם חזון של בנייה איכותית ושקיפות מלאה מול הלקוח.',
      en: 'Leads the group since its founding with a vision of quality construction and full client transparency.',
    },
    linkedin: '',
  },
  {
    id: 'benny',
    name: { he: 'בני קורקוס', en: 'Benny Kurkoos' },
    role: { he: 'מנהל עבודה וביצוע', en: 'Site & Execution Manager' },
    photo: photo('1507003211169-0a1dd7228f2d'),
    bio: {
      he: 'אחראי על ניהול הביצוע בשטח ועמידה בלוחות הזמנים והתקציב.',
      en: 'Responsible for on-site execution management and meeting schedule and budget.',
    },
    linkedin: '',
  },
  {
    id: 'moti',
    name: { he: 'מוטי בן עמי', en: 'Moti Ben Ami' },
    role: { he: 'מנהל עבודה וביצוע', en: 'Site & Execution Manager' },
    photo: '/6D41D358-693B-4F94-95D7-AFAEC6439126.png',
    bio: {
      he: 'מנהל צוותי שטח ומבטיח איכות ביצוע ובטיחות בכל שלבי הבנייה.',
      en: 'Manages field teams and ensures execution quality and safety at every construction stage.',
    },
    linkedin: '',
  },
  {
    id: 'yaakov',
    name: { he: 'יעקב קורקוס', en: 'Yaakov Kurkoos' },
    role: { he: 'מנהל פרויקטים', en: 'Project Manager' },
    photo: '/B59B1CBE-8EFB-449E-B0F3-359571EF70D9.png',
    bio: {
      he: 'מלווה את הפרויקטים מהתכנון ועד המסירה, בתיאום מול כל הגורמים.',
      en: 'Accompanies projects from planning to handover, coordinating with all stakeholders.',
    },
    linkedin: '',
  },
]

export default team
