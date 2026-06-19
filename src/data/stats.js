/* מספרים שמופיעים בסקשן "במספרים" (אנימציית count-up).
   ברירת מחדל בנימה בוטיקית — אמון/איכות/אישיות (ולא רק נפח). ניתן לערוך/להחליף
   דרך הניהול → "מונים ומספרים" (גובר על ברירת המחדל). */
export const stats = [
  { id: 'years', value: 30, suffix: '+', label: { he: 'שנות ניסיון', en: 'Years of experience' } },
  { id: 'satisfaction', value: 98, suffix: '%', label: { he: 'שביעות רצון לקוחות', en: 'Client satisfaction' } },
  { id: 'ontime', value: 100, suffix: '%', label: { he: 'מסירה בזמן', en: 'On-time delivery' } },
  { id: 'projects', value: 80, suffix: '+', label: { he: 'פרויקטים בוטיק', en: 'Boutique projects' } },
]

/* מונים נוספים מומלצים — להוספה/החלפה דרך הניהול לפי הצורך. */
export const statsSuggestions = [
  { value: 1500, suffix: '+', label: { he: 'משפחות מרוצות', en: 'Happy families' } },
  { value: 10, suffix: '', label: { he: 'שנות אחריות וליווי', en: 'Years of warranty & support' } },
  { value: 100, suffix: '%', label: { he: 'ליווי אישי לכל לקוח', en: 'Personal guidance for every client' } },
  { value: 95, suffix: '%', label: { he: 'לקוחות שממליצים', en: 'Clients who recommend us' } },
]

export default stats
