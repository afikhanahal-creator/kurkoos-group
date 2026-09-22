import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../../lib/cms.js'
import { trackingDisabled } from '../../lib/track.js'

/* ============================================================
   Google Analytics 4 — נטען רק כשמזהה מדידה (G-XXXXXXX) מוגדר.
   המזהה נלקח מהגדרות האתר (מפתח ga_measurement_id, ניתן לעריכה
   מהאדמין ללא דיפלוי) עם נפילה-לאחור למשתנה סביבה.

   שלוש נקודות שמשפיעות ישירות על אמינות הנתונים:

   1. באתר SPA צריך לדווח page_view ידנית על כל מעבר עמוד, אבל
      הכותרת של העמוד החדש נקבעת ב-Seo.jsx שיושב עמוק יותר בעץ.
      אפקט של רכיב אח שרונדר קודם רץ לפניו, ולכן דיווח מיידי שלח
      ל-Google את הכותרת של העמוד הקודם, בכל מעבר עמוד. לכן כאן
      ממתינים לכותרת של העמוד החדש לפני השליחה.
   2. עמודי /admin לא נמדדים בכלל, גם לא נטען בהם תג. קודם רק
      ה-page_view דולג, אבל התג עצמו נטען והתחיל סשן, כך שהגלישה
      שלנו במערכת הניהול נספרה כתנועה באתר.
   3. מי שמסמן באדמין "אל תספור את הביקורים שלי" לא נמדד בדפדפן
      הזה, כדי שהבדיקות שלנו לא ייכנסו לסטטיסטיקה.
   ============================================================ */
export default function Analytics() {
  const settings = useSettings()
  const location = useLocation()
  const lastTitle = useRef('')
  // מזהה המדידה של קורקוס גרופ. אפשר לעקוף מהאדמין (טאב תנועה וסטטיסטיקות)
  // או ממשתנה סביבה — בלי לגעת בקוד.
  const id = String(settings.ga_measurement_id || import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-5ESLP5HKZC').trim()
  const valid = /^G-[A-Z0-9]{6,14}$/i.test(id)
  const isAdmin = location.pathname.startsWith('/admin')
  const off = isAdmin || trackingDisabled()

  // טעינת gtag פעם אחת, ולא בעמודי האדמין
  useEffect(() => {
    if (!valid || off || window.__kcGaLoaded) return
    window.__kcGaLoaded = true
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    // send_page_view: false — הדיווח נעשה ידנית לפי ה-Router (SPA)
    window.gtag('config', id, { send_page_view: false })
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(s)
  }, [valid, id, off])

  /* page_view על כל ניווט — אחרי שהעמוד החדש הספיק לקבוע את הכותרת שלו.
     ממתינים לשינוי ב-<title>, ואם העמוד לא משנה אותה (או שהיא זהה
     לקודמת) שולחים בכל מקרה אחרי השהיה קצרה, כדי לא לאבד צפייה. */
  useEffect(() => {
    if (!valid || off || typeof window.gtag !== 'function') return
    let sent = false
    const send = () => {
      if (sent) return
      sent = true
      lastTitle.current = document.title
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    const titleEl = document.querySelector('title')
    const obs = titleEl && document.title === lastTitle.current
      ? new MutationObserver(() => { if (document.title !== lastTitle.current) send() })
      : null
    if (obs) obs.observe(titleEl, { childList: true, characterData: true, subtree: true })
    else queueMicrotask(send)          // הכותרת כבר שונה מהקודמת, אין למה לחכות
    const t = setTimeout(send, 1200)   // רשת ביטחון לעמודים שלא קובעים כותרת
    return () => { obs?.disconnect(); clearTimeout(t); send() }
  }, [valid, off, location.pathname, location.search])

  return null
}
