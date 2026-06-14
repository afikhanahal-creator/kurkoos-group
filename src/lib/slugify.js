/* יצירת slug לכתובת מתוך שם הפרויקט (עברית → לטינית).
   משמש למילוי אוטומטי של שדה ה-slug באדמין כל עוד לא נערך ידנית. */

// מיפוי אותיות עבריות לתעתיק לטיני קריא
const HE_MAP = {
  א: 'a', ב: 'b', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'h', ט: 't',
  י: 'y', כ: 'k', ך: 'k', ל: 'l', מ: 'm', ם: 'm', נ: 'n', ן: 'n', ס: 's',
  ע: 'a', פ: 'p', ף: 'p', צ: 'tz', ץ: 'tz', ק: 'k', ר: 'r', ש: 'sh', ת: 't',
}

export function slugify(input) {
  const str = String(input || '').trim()
  if (!str) return ''
  let out = ''
  for (const ch of str) {
    if (HE_MAP[ch] != null) out += HE_MAP[ch]
    else out += ch
  }
  return out
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // הסרת ניקוד/דיאקריטיקה לטינית
    .replace(/['"׳״]/g, '')             // גרשיים
    .replace(/[^a-z0-9]+/g, '-')        // כל השאר → מקף
    .replace(/^-+|-+$/g, '')            // ניקוי מקפים בקצוות
    .replace(/-{2,}/g, '-')             // איחוד מקפים כפולים
    .slice(0, 60)
}
