/* ============================================================
   פרויקטים — מבנה נתונים מלא עם תמונות, גלריה וסרטונים.
   ------------------------------------------------------------
   התמונות כרגע הן תמונות דמו איכותיות (Unsplash).
   להחלפה בתמונות שלך: שים קבצים ב-public/projects/<slug>/
   והחלף את הנתיב, למשל cover: '/projects/park-residence/cover.jpg'

   status: 'planning' | 'construction' | 'marketing' | 'completed'
   video:  { type: 'youtube', id: '...' } או { type: 'file', src: '...' }
   ============================================================ */

// עוזר ליצירת כתובת תמונת דמו מ-Unsplash
const img = (id, w = 1280) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

export const projects = [
  {
    slug: 'park-residence',
    name: { he: 'פארק רזידנס', en: 'Park Residence' },
    city: { he: 'תל אביב', en: 'Tel Aviv' },
    status: 'marketing',
    category: 'residential',
    year: 2025,
    units: 96,
    type: { he: 'מגורי יוקרה', en: 'Luxury residential' },
    short: {
      he: 'מגדל מגורים בן 24 קומות עם נוף לפארק, לובי מלונאי ומפרט טכני עשיר.',
      en: 'A 24-storey residential tower overlooking the park, with a hotel-style lobby and rich specification.',
    },
    description: {
      he: 'פרויקט הדגל של הקבוצה: מגדל מגורים יוקרתי המשלב אדריכלות עכשווית, שטחים ירוקים ותחושת קהילה. כל דירה תוכננה למקסם אור טבעי ונוף פתוח.',
      en: 'The group’s flagship: a luxury residential tower combining contemporary architecture, green spaces and a sense of community. Every apartment is designed to maximize natural light and open views.',
    },
    cover: img('1545324418-cc1a3fa10c00'),
    gallery: [
      img('1545324418-cc1a3fa10c00'),
      img('1600585154340-be6161a56a0c'),
      img('1600607687939-ce8a6c25118c'),
    ],
    video: { type: 'youtube', id: '' },
    features: [
      { he: 'לובי בסטנדרט מלונאי', en: 'Hotel-standard lobby' },
      { he: 'בריכה וחדר כושר', en: 'Pool & gym' },
      { he: 'חניון תת-קרקעי', en: 'Underground parking' },
    ],
    floors: 24,
    towers: 1,
    architects: { he: 'יסקי מור סיון אדריכלים', en: 'Yaski Mor Sivan Architects' },
    mapQuery: 'Rothschild Blvd, Tel Aviv',
    environment: {
      title: { he: 'בלב תל אביב הירוקה', en: 'In the heart of green Tel Aviv' },
      text: {
        he: 'הפרויקט ממוקם בסמיכות לפארק, לשדרות הירוקות ולמוקדי הבילוי והתרבות של העיר — איזון מושלם בין שלווה עירונית לנגישות מלאה לתחבורה, חינוך ומסחר.',
        en: 'Located steps from the park, the green boulevards and the city’s culture and leisure hubs — a perfect balance of urban calm and full access to transit, education and commerce.',
      },
      image: img('1502672260266-1c1ef2d93688'),
    },
    plans: [img('1600585154340-be6161a56a0c'), img('1600607687939-ce8a6c25118c')],
    planGroups: [
      {
        rooms: 2,
        label: { he: 'דירות 2 חדרים', en: '2-room apartments' },
        plans: [
          { label: { he: 'דגם A', en: 'Type A' }, img: img('1600585154340-be6161a56a0c') },
          { label: { he: 'דגם B', en: 'Type B' }, img: img('1600607687939-ce8a6c25118c') },
        ],
      },
      {
        rooms: 3,
        label: { he: 'דירות 3 חדרים', en: '3-room apartments' },
        plans: [
          { label: { he: 'דגם A', en: 'Type A' }, img: img('1600566753086-00f18fb6b3ea') },
          { label: { he: 'דגם B', en: 'Type B' }, img: img('1600210492493-0946911123ea') },
          { label: { he: 'דגם C', en: 'Type C' }, img: img('1600585154340-be6161a56a0c') },
        ],
      },
      {
        rooms: 4,
        label: { he: 'דירות 4 חדרים', en: '4-room apartments' },
        plans: [
          { label: { he: 'דגם A', en: 'Type A' }, img: img('1600607687939-ce8a6c25118c') },
          { label: { he: 'דגם B', en: 'Type B' }, img: img('1600566753086-00f18fb6b3ea') },
        ],
      },
      {
        rooms: 5,
        label: { he: 'דירות 5 חדרים', en: '5-room apartments' },
        plans: [
          { label: { he: 'דגם A', en: 'Type A' }, img: img('1600210492493-0946911123ea') },
          { label: { he: 'דגם B', en: 'Type B' }, img: img('1600585154340-be6161a56a0c') },
        ],
      },
      {
        rooms: 6,
        label: { he: 'דירות 6 חדרים (פנטהאוז)', en: '6-room apartments (penthouse)' },
        plans: [
          { label: { he: 'פנטהאוז', en: 'Penthouse' }, img: img('1600607687939-ce8a6c25118c') },
        ],
      },
    ],
    galleryGroups: [
      { label: { he: 'הפרויקט', en: 'Project' }, images: [img('1545324418-cc1a3fa10c00'), img('1496307653780-42ee777d4833')] },
      { label: { he: 'הדמיות פנים', en: 'Interiors' }, images: [img('1600585154340-be6161a56a0c'), img('1600607687939-ce8a6c25118c')] },
      { label: { he: 'שטחים ציבוריים', en: 'Public areas' }, images: [img('1512917774080-9991f1c4c750'), img('1564013799919-ab600027ffc6')] },
    ],
  },
  {
    slug: 'marina-towers',
    name: { he: 'מגדלי המרינה', en: 'Marina Towers' },
    city: { he: 'הרצליה', en: 'Herzliya' },
    status: 'construction',
    category: 'commercial',
    year: 2026,
    units: 140,
    type: { he: 'מגורים ומסחר', en: 'Mixed-use' },
    short: {
      he: 'שני מגדלים עם חזית מסחרית תוססת ומרפסות ים, במיקום מבוקש סמוך למרינה.',
      en: 'Two towers with a vibrant commercial frontage and sea-view balconies, steps from the marina.',
    },
    description: {
      he: 'מתחם מגורים ומסחר המשלב חיי עיר עם שלווה של קו החוף. תכנון מוקפד יוצר איזון בין פרטיות לקהילתיות.',
      en: 'A mixed-use complex blending lively city life with the calm of the coastline. Careful planning balances privacy and community.',
    },
    cover: img('1496307653780-42ee777d4833'),
    gallery: [img('1496307653780-42ee777d4833'), img('1493809842364-78817add7ffb')],
    video: { type: 'youtube', id: '' },
    features: [
      { he: 'מרפסות עם נוף לים', en: 'Sea-view balconies' },
      { he: 'רחוב מסחרי', en: 'Commercial street' },
      { he: 'גינה קהילתית', en: 'Community garden' },
    ],
    floors: 30,
    towers: 2,
    architects: { he: 'משרד אדריכלים ים-נוף', en: 'Sea-View Architects' },
    mapQuery: 'Herzliya Marina',
    environment: {
      title: { he: 'על קו המים של הרצליה', en: 'On the Herzliya waterline' },
      text: {
        he: 'מיקום מבוקש סמוך למרינה, לחופים ולאזור העסקים — שילוב נדיר של חיי עיר תוססים עם שלווה של קו החוף ושטחים ירוקים.',
        en: 'A sought-after location near the marina, the beaches and the business district — a rare blend of vibrant city life with the calm of the coastline and green spaces.',
      },
      image: img('1493809842364-78817add7ffb'),
    },
    plans: [img('1496307653780-42ee777d4833')],
  },
  {
    slug: 'green-heights',
    name: { he: 'גרין הייטס', en: 'Green Heights' },
    city: { he: 'רעננה', en: 'Raanana' },
    status: 'completed',
    category: 'residential',
    year: 2023,
    units: 64,
    type: { he: 'מגורים', en: 'Residential' },
    short: {
      he: 'פרויקט בוטיק ירוק עם דירות גן ופנטהאוזים, שזכה לפרס בנייה ירוקה.',
      en: 'A green boutique project with garden apartments and penthouses, winner of a green-building award.',
    },
    description: {
      he: 'פרויקט מגורים בסטנדרט בנייה ירוקה, עם מערכות חיסכון באנרגיה, גגות ירוקים ועיצוב נוף עשיר.',
      en: 'A residential project built to green standards, with energy-saving systems, green roofs and rich landscaping.',
    },
    cover: img('1564013799919-ab600027ffc6'),
    gallery: [img('1564013799919-ab600027ffc6'), img('1512917774080-9991f1c4c750')],
    video: { type: 'youtube', id: '' },
    features: [
      { he: 'תקן בנייה ירוקה', en: 'Green-building certified' },
      { he: 'דירות גן ופנטהאוז', en: 'Garden & penthouse units' },
      { he: 'מערכות חכמות', en: 'Smart-home systems' },
    ],
    floors: 8,
    towers: 1,
    architects: { he: 'גרין אדריכלים', en: 'Green Architects' },
    mapQuery: 'Raanana',
    environment: {
      title: { he: 'ירוק, שקט ומחובר', en: 'Green, quiet and connected' },
      text: {
        he: 'שכונה בוטיק שקטה במרכז רעננה, מוקפת פארקים ושבילי הליכה, בקרבת מוסדות חינוך מובילים ומרכזי מסחר — איכות חיים גבוהה לכל המשפחה.',
        en: 'A quiet boutique neighborhood in central Raanana, surrounded by parks and walking trails, near leading schools and commercial centers — high quality of life for the whole family.',
      },
      image: img('1512917774080-9991f1c4c750'),
    },
    plans: [img('1564013799919-ab600027ffc6')],
  },
  {
    slug: 'city-center-renewal',
    name: { he: 'התחדשות מרכז העיר', en: 'City Center Renewal' },
    city: { he: 'בת ים', en: 'Bat Yam' },
    status: 'planning',
    category: 'renewal',
    year: 2027,
    units: 210,
    type: { he: 'התחדשות עירונית', en: 'Urban renewal' },
    short: {
      he: 'פרויקט פינוי-בינוי רחב היקף המחדש שכונה שלמה עם דיור מודרני ומרחב ציבורי.',
      en: 'A large-scale evacuation-reconstruction project renewing an entire neighborhood with modern housing and public space.',
    },
    description: {
      he: 'התחדשות עירונית בקנה מידה גדול, המשלבת שדרוג איכות החיים של הדיירים הקיימים עם תוספת יחידות דיור ומרחב ציבורי מזמין.',
      en: 'Large-scale urban renewal combining an upgraded quality of life for existing residents with added housing and inviting public space.',
    },
    cover: img('1486325212027-8081e485255e'),
    gallery: [img('1486325212027-8081e485255e'), img('1449824913935-59a10b8d2000')],
    video: { type: 'youtube', id: '' },
    features: [
      { he: 'פינוי-בינוי', en: 'Evacuation-reconstruction' },
      { he: 'מרחב ציבורי חדש', en: 'New public realm' },
      { he: 'דיור בר-השגה', en: 'Affordable housing mix' },
    ],
    floors: 18,
    towers: 3,
    architects: { he: 'אורבן סטודיו אדריכלים', en: 'Urban Studio Architects' },
    mapQuery: 'Bat Yam',
    environment: {
      title: { he: 'לב חדש לבת ים', en: 'A new heart for Bat Yam' },
      text: {
        he: 'התחדשות עירונית רחבת היקף המחדשת שכונה שלמה — מרחב ציבורי מזמין, שדרוג תשתיות, מוסדות חינוך ומסחר, וקרבה לים ולתחבורה.',
        en: 'Large-scale urban renewal revitalizing an entire neighborhood — inviting public space, upgraded infrastructure, education and commerce, and proximity to the sea and transit.',
      },
      image: img('1449824913935-59a10b8d2000'),
    },
    plans: [img('1486325212027-8081e485255e')],
  },
]

export function getProject(slug) {
  return projects.find((p) => p.slug === slug)
}

export default projects
