/* ============================================================
   מדידת אירועי המרה — שולח אירועים ל-Google Analytics (gtag)
   כשהוא טעון. בטוח לחלוטין: אם אין gtag (חוסם פרסומות, סביבת
   פיתוח) — לא קורה כלום ושום פונקציונליות לא נפגעת.
   אירועים בשימוש:
   - generate_lead   (שליחת טופס ליד; param form + project)
   - newsletter_signup
   - phone_click / whatsapp_click / email_click
   ============================================================ */
/* מפתח ההחרגה. מי שמסמן באדמין "אל תספור את הביקורים שלי" מקבל
   את הדגל הזה בדפדפן שלו, וכל המדידה נכבית בו. זה קיים כדי שהבדיקות
   שלנו באתר לא ייכנסו לסטטיסטיקה: באתר עם עשרות משתמשים בחודש, כמה
   סיבובים שלנו באתר מזיזים את המספרים משמעותית. */
export const NO_TRACK_KEY = 'kc_no_track'

export function trackingDisabled() {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(NO_TRACK_KEY) === '1' }
  catch { return false }
}

export function setTrackingDisabled(on) {
  try {
    if (on) localStorage.setItem(NO_TRACK_KEY, '1')
    else localStorage.removeItem(NO_TRACK_KEY)
  } catch { /* דפדפן שחוסם אחסון — פשוט לא נזכור את הבחירה */ }
}

/* אירועי פנייה בשם שלנו. ב-Google Analytics אפשר ליצור אירוע מתוך אירוע
   אחר ("Create event"), והנכס שלנו רשם phone_click ו-email_click על כמעט
   כל צפייה בעמוד: 489 "לחיצות טלפון" מ-97 מתוך 144 משתמשים בשבוע שבו
   נכנסו שני לידים. שם שמתחיל ב-kc_ נשלח רק מכאן, רק מלחיצה אמיתית, ושום
   כלל בתוך גוגל לא יוצר אותו. הדשבורד סופר רק את השמות האלה.
   השם המקורי ממשיך להישלח לצידו, כדי שדוחות גוגל ופרסום לא יישברו. */
export const KC_EVENTS = {
  generate_lead: 'kc_lead',
  phone_click: 'kc_phone',
  whatsapp_click: 'kc_whatsapp',
  email_click: 'kc_email',
}

export function track(name, params = {}) {
  try {
    if (trackingDisabled()) return
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params)
      if (KC_EVENTS[name]) window.gtag('event', KC_EVENTS[name], params)
    }
  } catch { /* מדידה לעולם לא מפילה את האתר */ }
}
