/* ============================================================
   מדידת אירועי המרה — שולח אירועים ל-Google Analytics (gtag)
   כשהוא טעון. בטוח לחלוטין: אם אין gtag (חוסם פרסומות, סביבת
   פיתוח) — לא קורה כלום ושום פונקציונליות לא נפגעת.
   אירועים בשימוש:
   - generate_lead   (שליחת טופס ליד; param form + project)
   - newsletter_signup
   - phone_click / whatsapp_click / email_click
   ============================================================ */
export function track(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params)
    }
  } catch { /* מדידה לעולם לא מפילה את האתר */ }
}
