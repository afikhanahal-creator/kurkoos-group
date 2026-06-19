import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Reveal from '../ui/Reveal.jsx'
import './BuildingShowcase.css'

/* ============================================================
   BuildingShowcase — סיור תלת-ממד בבניין (model-viewer).
   טעינה חכמה: הספרייה (model-viewer) + קובץ ה-GLB נטענים *ברקע* מיד אחרי
   שהעמוד נפתח (requestIdleCallback) — לא בטעינה הראשונית עצמה, כך שאין
   הקפאה, ועד שגוללים לסקשן המודל כבר "באוויר" ומוכן. עד שהמודל נטען מוצג
   poster קליל. המודל נדחס מ-6.6MB ל-~710KB (טקסטורות webp, גאומטריה מלאה).
   ============================================================ */

const MODEL_SRC = '/villa-model.glb'

const STR = {
  he: {
    title: 'סיור תלת-ממד בבניין',
    lead: 'הסתובבו סביב המודל, התקרבו והתבוננו בפרויקט מכל זווית — ישירות מהדפדפן.',
    loadingLabel: 'טוען מודל תלת-ממד…',
    ready: 'גררו לסיבוב · צביטה לזום',
    error: 'לא הצלחנו לטעון את המודל. נסו לרענן את העמוד.',
  },
  en: {
    title: '3D building tour',
    lead: 'Orbit the model, zoom in and explore the project from every angle — right in your browser.',
    loadingLabel: 'Loading 3D model…',
    ready: 'Drag to rotate · pinch to zoom',
    error: 'Could not load the model. Try refreshing the page.',
  },
}

export default function BuildingShowcase() {
  const { lang } = useI18n()
  const s = STR[lang] || STR.he
  const [libReady, setLibReady] = useState(false)   // ה-custom element הוגדר
  const [loaded, setLoaded] = useState(false)        // המודל סיים להיטען
  const [failed, setFailed] = useState(false)
  const mvRef = useRef(null)

  // טעינת הספרייה ברקע אחרי פתיחת העמוד — לא מתחרה בטעינה הראשונית.
  useEffect(() => {
    let cancelled = false
    const load = () => {
      import('@google/model-viewer')
        .then(() => { if (!cancelled) setLibReady(true) })
        .catch(() => { if (!cancelled) setFailed(true) })
    }
    let id
    if ('requestIdleCallback' in window) {
      id = window.requestIdleCallback(load, { timeout: 2500 })
    } else {
      id = setTimeout(load, 1200)
    }
    return () => {
      cancelled = true
      if ('cancelIdleCallback' in window && typeof id === 'number') {
        try { window.cancelIdleCallback(id) } catch { /* noop */ }
      } else {
        clearTimeout(id)
      }
    }
  }, [])

  // מאזינים לאירועי load / error של model-viewer.
  useEffect(() => {
    if (!libReady) return
    const el = mvRef.current
    if (!el) return
    const onLoad = () => setLoaded(true)
    const onError = () => setFailed(true)
    el.addEventListener('load', onLoad)
    el.addEventListener('error', onError)
    // אם המודל כבר נטען לפני שהספקנו להאזין
    if (el.loaded) setLoaded(true)
    return () => {
      el.removeEventListener('load', onLoad)
      el.removeEventListener('error', onError)
    }
  }, [libReady])

  return (
    <section className="section building-showcase" id="model-3d">
      <div className="container">
        <Reveal className="building-showcase__head">
          <h2 className="section-title">{s.title}</h2>
          <p className="section-lead">{s.lead}</p>
        </Reveal>

        <Reveal className="building-showcase__stage">
          {libReady && !failed && (
            <model-viewer
              ref={mvRef}
              src={MODEL_SRC}
              camera-controls=""
              auto-rotate=""
              touch-action="pan-y"
              shadow-intensity="1"
              exposure="1.05"
              environment-image="neutral"
              loading="eager"
              reveal="auto"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          )}

          {/* poster — מוצג עד שהמודל מוכן (או אם נכשל) */}
          {!loaded && (
            <div className={`building-showcase__poster${failed ? ' is-error' : ''}`}>
              <span className="building-showcase__cube" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M12 2 3 7v10l9 5 9-5V7z" />
                  <path d="M3 7l9 5 9-5" />
                  <path d="M12 12v10" />
                </svg>
              </span>
              <span className="building-showcase__status">
                {failed ? s.error : s.loadingLabel}
              </span>
              {!failed && <span className="building-showcase__spinner" aria-hidden="true" />}
            </div>
          )}

          {loaded && <span className="building-showcase__hint">{s.ready}</span>}
        </Reveal>
      </div>
    </section>
  )
}
