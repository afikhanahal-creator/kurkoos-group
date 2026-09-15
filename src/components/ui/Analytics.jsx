import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../../lib/cms.js'

/* ============================================================
   Google Analytics 4 — נטען רק כשמזהה מדידה (G-XXXXXXX) מוגדר.
   המזהה נלקח מהגדרות האתר (מפתח ga_measurement_id, ניתן לעריכה
   מהאדמין ללא דיפלוי) עם נפילה-לאחור למשתנה סביבה.
   באתר SPA צריך לדווח page_view ידנית על כל מעבר עמוד — נעשה כאן.
   עמודי /admin אינם נמדדים.
   ============================================================ */
export default function Analytics() {
  const settings = useSettings()
  const location = useLocation()
  const id = String(settings.ga_measurement_id || import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim()
  const valid = /^G-[A-Z0-9]{6,14}$/i.test(id)

  // טעינת gtag פעם אחת
  useEffect(() => {
    if (!valid || window.__kcGaLoaded) return
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
  }, [valid, id])

  // page_view על כל ניווט
  useEffect(() => {
    if (!valid || typeof window.gtag !== 'function') return
    if (location.pathname.startsWith('/admin')) return
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: typeof document !== 'undefined' ? document.title : '',
    })
  }, [valid, location.pathname, location.search])

  return null
}
