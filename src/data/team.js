/* ============================================================
   חברי הצוות. תמונות דמו (Unsplash) — החלף בנתיב מקומי /team/*.jpg.
   הוסף איש צוות = הוסף אובייקט למערך.
   ============================================================ */

const photo = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`

/* סדר התצוגה ב-RTL: האיבר הראשון מימין, האחרון משמאל.
   מצד שמאל לימין על המסך: שלומי, יעקב, מוטי, בני
   ⇐ ולכן הסדר במערך (ימין→שמאל): בני, מוטי, יעקב, שלומי. */
export const team = [
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
    imgPos: '56% 20%',   /* מרים את ראשו עוד טיפה — לגובה ראשו של שלומי */
    imgZoom: 1.22,   /* עוד זום-אין; transform-origin עליון שומר על גובה הראש */
    imgBright: 1.2,  /* +20% בהירות — אפקט תאורת פורטרייט */
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
    imgPos: 'center 32%',   /* מרים את ראשו עוד טיפה — לגובה ראשו של שלומי */
    imgBright: 1.2,  /* +20% בהירות — אפקט תאורת פורטרייט */
    bio: {
      he: 'מלווה את הפרויקטים מהתכנון ועד המסירה, בתיאום מול כל הגורמים.',
      en: 'Accompanies projects from planning to handover, coordinating with all stakeholders.',
    },
    linkedin: '',
  },
  {
    id: 'shlomi',
    name: { he: 'שלומי קורקוס', en: 'Shlomi Kurkoos' },
    role: { he: 'מנכ"ל ומייסד', en: 'CEO & Founder' },
    photo: '/AD2EB011-F33E-40FC-9639-627E92C2A4D7.jpeg',
    imgPos: 'center 12%',   /* מקזז את דחיפת הזום כלפי מטה — הראש נשאר בגובה יעקב ומוטי */
    imgZoom: 1.2,    /* עוד זום-אין; transform-origin עליון שומר על גובה הראש */
    imgBright: 1.2,  /* +20% בהירות — אפקט תאורת פורטרייט */
    bio: {
      he: 'מוביל את הקבוצה מאז הקמתה עם חזון של בנייה איכותית ושקיפות מלאה מול הלקוח.',
      en: 'Leads the group since its founding with a vision of quality construction and full client transparency.',
    },
    linkedin: '',
  },
]

export default team
