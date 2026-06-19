import { useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Reveal from '../ui/Reveal.jsx'
import './BuildingShowcase.css'

/* ============================================================
   BuildingShowcase — סיור תלת-ממד בבניין (model-viewer).
   חשוב לביצועים: גם הספרייה (model-viewer) וגם קובץ ה-GLB נטענים *רק*
   כשהמשתמש לוחץ "צפו במודל" — לא בטעינת העמוד. כך העמוד אף פעם לא נתקע,
   גם במובייל. המודל עצמו נדחס ל-~190KB (meshopt + webp) מ-6.6MB המקוריים.
   ============================================================ */

const MODEL_SRC = '/villa-model.glb'

const STR = {
  he: {
    title: 'סיור תלת-ממד בבניין',
    lead: 'הסתובבו סביב המודל, התקרבו והתבוננו בפרויקט מכל זווית — ישירות מהדפדפן.',
    cta: 'צפו במודל בתלת-ממד',
    loading: 'טוען מודל…',
    hint: 'גררו לסיבוב · צביטה לזום',
  },
  en: {
    title: '3D building tour',
    lead: 'Orbit the model, zoom in and explore the project from every angle — right in your browser.',
    cta: 'View the 3D model',
    loading: 'Loading model…',
    hint: 'Drag to rotate · pinch to zoom',
  },
}

export default function BuildingShowcase() {
  const { lang } = useI18n()
  const s = STR[lang] || STR.he
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)

  // טעינה לפי דרישה: רק בלחיצה מורידים את הספרייה ומציגים את הצופה.
  const launch = async () => {
    if (active || loading) return
    setLoading(true)
    try {
      await import('@google/model-viewer')
      setActive(true)
    } catch {
      setLoading(false)
    }
  }

  return (
    <section className="section building-showcase" id="model-3d">
      <div className="container">
        <Reveal className="building-showcase__head">
          <h2 className="section-title">{s.title}</h2>
          <p className="section-lead">{s.lead}</p>
        </Reveal>

        <Reveal className="building-showcase__stage">
          {active ? (
            <model-viewer
              src={MODEL_SRC}
              camera-controls=""
              auto-rotate=""
              touch-action="pan-y"
              shadow-intensity="1"
              exposure="1.05"
              environment-image="neutral"
              reveal="auto"
              loading="eager"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          ) : (
            <button type="button" className="building-showcase__poster" onClick={launch} aria-label={s.cta}>
              <span className="building-showcase__cube" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M12 2 3 7v10l9 5 9-5V7z" />
                  <path d="M3 7l9 5 9-5" />
                  <path d="M12 12v10" />
                </svg>
              </span>
              <span className="building-showcase__cta">{loading ? s.loading : s.cta}</span>
              <span className="building-showcase__hint">{s.hint}</span>
            </button>
          )}
        </Reveal>
      </div>
    </section>
  )
}
