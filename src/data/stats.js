/* מספרים שמופיעים בסקשן "במספרים" (אנימציית count-up).
   ברירת מחדל בנימה בוטיקית — אמון/איכות/אישיות (ולא רק נפח). ניתן לערוך/להחליף
   דרך הניהול → "מונים ומספרים" (גובר על ברירת המחדל). */
export const stats = [
  { id: 'years', value: 30, suffix: '+', label: { he: 'שנות ניסיון', en: 'Years of experience' } },
  { id: 'satisfaction', value: 98, suffix: '%', label: { he: 'שביעות רצון לקוחות', en: 'Client satisfaction' } },
  { id: 'ontime', value: 100, suffix: '%', label: { he: 'מסירה בזמן', en: 'On-time delivery' } },
  { id: 'projects', value: 80, suffix: '+', label: { he: 'פרויקטים בוטיק', en: 'Boutique projects' } },
]

/* מונים נוספים מומלצים לחברת בוטיק — אמון / איכות / אישיות / בלעדיות.
   להוספה או החלפה דרך הניהול → "מונים ומספרים" לפי הצורך. */
export const statsSuggestions = [
  // אמון
  { value: 98, suffix: '%', label: { he: 'שביעות רצון לקוחות', en: 'Client satisfaction' } },
  { value: 100, suffix: '%', label: { he: 'מסירה בזמן', en: 'On-time delivery' } },
  { value: 95, suffix: '%', label: { he: 'לקוחות שממליצים', en: 'Clients who recommend us' } },
  { value: 1500, suffix: '+', label: { he: 'משפחות מרוצות', en: 'Happy families' } },
  // איכות
  { value: 10, suffix: '', label: { he: 'שנות אחריות וליווי', en: 'Years of warranty & support' } },
  { value: 100, suffix: '%', label: { he: 'עמידה בתקציב', en: 'On-budget delivery' } },
  { value: 7, suffix: '', label: { he: 'תקני בנייה ירוקה', en: 'Green-building standards' } },
  // אישיות
  { value: 1, suffix: ':1', label: { he: 'מנהל פרויקט אישי', en: 'Dedicated project manager' } },
  { value: 24, suffix: '/7', label: { he: 'זמינות לאורך הדרך', en: 'Availability throughout' } },
  { value: 4, suffix: '', label: { he: 'דורות של בנייה למשפחה', en: 'Generations of building' } },
  // בלעדיות / בוטיק
  { value: 80, suffix: '+', label: { he: 'פרויקטים בוטיק', en: 'Boutique projects' } },
  { value: 100, suffix: '%', label: { he: 'דירות שנמכרו לפני אכלוס', en: 'Sold before move-in' } },
  { value: 30, suffix: '+', label: { he: 'אדריכלים ומהנדסים בצוות', en: 'Architects & engineers' } },
  // ---- באטץ' שני: מונים מעניינים ומבדלים ----
  { value: 4.9, suffix: '/5', label: { he: 'דירוג לקוחות ממוצע', en: 'Average client rating' } },
  { value: 70, suffix: '%', label: { he: 'לקוחות שהגיעו מהמלצה', en: 'Clients from referrals' } },
  { value: 12, suffix: '', label: { he: 'ערים שבהן אנחנו בונים', en: 'Cities we build in' } },
  { value: 200, suffix: '+', label: { he: 'נקודות בקרת איכות לדירה', en: 'Quality checkpoints per home' } },
  { value: 12, suffix: '', label: { he: 'חודשי ליווי אחרי מסירה', en: 'Months of post-handover support' } },
  { value: 50, suffix: '+', label: { he: 'אפשרויות התאמה אישית לדירה', en: 'Personalization options' } },
  { value: 40, suffix: '%', label: { he: 'שטחים פתוחים וירוקים', en: 'Open & green space' } },
  { value: 98, suffix: '%', label: { he: 'שביעות רצון שנה אחרי האכלוס', en: 'Satisfaction a year after move-in' } },
  { value: 25, suffix: '+', label: { he: 'משפחות שרכשו דירה שנייה', en: 'Families who bought again' } },
  { value: 5, suffix: '', label: { he: 'פרסי עיצוב ואדריכלות', en: 'Design & architecture awards' } },
  { value: 15, suffix: '+', label: { he: 'מעצבים ואדריכלים מובילים בשת"פ', en: 'Leading designers we partner with' } },
  { value: 90, suffix: '%', label: { he: 'דירות עם מפרט משודרג', en: 'Homes with upgraded spec' } },
]

export default stats
