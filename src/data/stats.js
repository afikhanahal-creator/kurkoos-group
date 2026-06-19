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
]

export default stats
