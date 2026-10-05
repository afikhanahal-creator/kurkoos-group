import site from '../data/site.js'

/* ============================================================
   מקור יחיד למספר הטלפון והוואטסאפ של כפתורי הפנייה באתר.
   המספר עצמו יושב ב-site.contact (src/data/site.js). זה אותו מספר
   שהכפתור הצף של הוואטסאפ משתמש בו מאז ומעולם, ולכן גם הבר התחתון
   במובייל, כפתורי הוואטסאפ שבטפסים וקישור החיוג נשענים עליו.
   החלפת מספר = עריכה אחת ב-site.js, ושום קובץ אחר לא צריך לגעת בו.
   ============================================================ */
export const CONTACT_WA = String(site.contact.whatsapp).replace(/\D/g, '')
export const CONTACT_PHONE_DISPLAY = site.contact.phoneDisplay || site.contact.phone

/* קישור חיוג בפורמט בינלאומי, נגזר מאותו מספר וואטסאפ */
export const telHref = () => `tel:+${CONTACT_WA}`

/* קישור וואטסאפ עם הודעה פתוחה מראש (לא חובה) */
export const waHref = (text) =>
  `https://wa.me/${CONTACT_WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`

/* ---------- פתיחת חלון "השאירו פרטים" מכל מקום באתר ----------
   החלון עצמו יושב ב-Header. כל כפתור אחר (הבר התחתון, ה-Hero) שולח
   אירוע, וה-Header פותח את החלון עם הנושא המבוקש מסומן מראש. */
export const CONTACT_POPUP_EVENT = 'kc:open-contact'

export function openContactPopup(topic) {
  try {
    window.dispatchEvent(new CustomEvent(CONTACT_POPUP_EVENT, { detail: { topic: topic || null } }))
  } catch { /* דפדפן ישן מאוד: פשוט לא נפתח */ }
}

/* נושאי הפנייה בטפסים, ומיפוי מעמוד חטיבה לנושא המתאים לו */
export const LEAD_TOPICS = ['development', 'construction', 'supervision', 'brokerage', 'mentorship', 'other']

export const DIVISION_TOPIC = {
  development: 'development',
  execution: 'construction',
  supervision: 'supervision',
  brokerage: 'brokerage',
}
