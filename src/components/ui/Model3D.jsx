import { useEffect, useRef, useState } from 'react'
import VillaBlueprint from './VillaBlueprint.jsx'
import './Model3D.css'

/* ============================================================
   Model3D — מציג מודל GLB בעזרת <model-viewer> של גוגל.
   טעינה "עצלה" אגרסיבית לטובת מהירות: ספריית model-viewer
   נטענת מ-CDN (כ-module) רק כשהמרכיב מתקרב למסך, וגם המודל
   עצמו (GLB) נטען רק אז — כך שטעינת העמוד הראשונית לא מושפעת
   כלל מהמשקל של התלת-מימד. ללא AR.
   אם הספרייה/המודל לא נטענים (רשת/חסימה) — מוצג איור הווילה
   כגיבוי, כך שהסקשן לעולם לא ריק.
   ============================================================ */

const MV_SRC =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'

let mvPromise = null
function loadModelViewer() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.customElements?.get('model-viewer')) return Promise.resolve()
  if (mvPromise) return mvPromise
  mvPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.type = 'module'
    s.src = MV_SRC
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
  return mvPromise
}

export default function Model3D({ src, alt = '', className = '' }) {
  const ref = useRef(null)
  // idle → loading → ready (script נטען) / error (גיבוי)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let io
    let timeout
    const start = () => {
      setStatus('loading')
      // אם משהו תקוע מעבר ל-15ש' — נציג גיבוי במקום ספינר אינסופי
      timeout = setTimeout(() => setStatus((s) => (s === 'ready' ? s : 'error')), 15000)
      loadModelViewer()
        .then(() => { clearTimeout(timeout); setStatus('ready') })
        .catch(() => { clearTimeout(timeout); setStatus('error') })
    }
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) { start(); io.disconnect() }
          }),
        { rootMargin: '300px' } // מתחילים לטעון מעט לפני שמגיעים
      )
      io.observe(el)
    } else {
      start()
    }
    return () => { io && io.disconnect(); clearTimeout(timeout) }
  }, [])

  return (
    <div ref={ref} className={`model3d ${className}`}>
      {status === 'ready' ? (
        <model-viewer
          src={src}
          alt={alt}
          camera-controls=""
          auto-rotate=""
          auto-rotate-delay="600"
          rotation-per-second="16deg"
          interaction-prompt="none"
          touch-action="pan-y"
          shadow-intensity="1"
          shadow-softness="0.9"
          exposure="1"
          environment-image="neutral"
          loading="eager"
          reveal="auto"
          onError={() => setStatus('error')}
        />
      ) : status === 'error' ? (
        <VillaBlueprint className="model3d__fallback" />
      ) : (
        <div className="model3d__placeholder" aria-label={alt} role="img">
          <span className="model3d__spinner" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
