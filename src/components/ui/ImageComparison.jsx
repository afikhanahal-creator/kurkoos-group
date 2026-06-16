import { useState, useRef, useCallback, useEffect } from 'react'
import { srcOfResponsive, responsiveStyle } from '../../lib/responsiveImage.js'
import './ResponsiveImage.css'
import './ImageComparison.css'

/* ============================================================
   ImageComparison — סליידר "לפני / אחרי": גוררים את הידית להשוואה בין
   שתי תמונות (למשל שרטוט מול בית גמור). הותאם מ-TSX/Tailwind ל-JSX + CSS.
   props: beforeImage, afterImage, altBefore, altAfter
   ============================================================ */
export default function ImageComparison({
  beforeImage,
  afterImage,
  altBefore = 'לפני',
  altAfter = 'אחרי',
}) {
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)

  const move = useCallback((clientX) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    let next = ((clientX - rect.left) / rect.width) * 100
    next = Math.max(0, Math.min(100, next))
    setPos(next)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => move(e.clientX)
    const onTouch = (e) => e.touches[0] && move(e.touches[0].clientX)
    const stop = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', stop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', stop)
    }
  }, [dragging, move])

  if (!srcOfResponsive(beforeImage) || !srcOfResponsive(afterImage)) return null

  return (
    <div className="imgcmp" ref={ref}>
      {/* שכבת בסיס: "אחרי" (הבית הגמור) — נראית בצד ימין */}
      <img className="imgcmp__before ri-img" src={srcOfResponsive(afterImage)} style={responsiveStyle(afterImage)} alt={altAfter} draggable="false" />
      {/* תווית "הבית הגמור" מוסתרת כשהשרטוט נפתח כמעט/לגמרי (אין בית גמור גלוי) */}
      <span className="imgcmp__tag imgcmp__tag--after" style={{ opacity: pos >= 90 ? 0 : 1 }}>{altAfter}</span>

      {/* שכבה עליונה נחתכת: "לפני" (השרטוט) — נראית בצד שמאל */}
      <div className="imgcmp__after" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img className="ri-img" src={srcOfResponsive(beforeImage)} style={responsiveStyle(beforeImage)} alt={altBefore} draggable="false" />
        <span className="imgcmp__tag imgcmp__tag--before">{altBefore}</span>
      </div>

      {/* ידית הגרירה */}
      <div
        className={`imgcmp__handle ${dragging ? 'is-dragging' : ''}`}
        style={{ left: `calc(${pos}% - 1px)` }}
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        role="slider"
        aria-label="גררו להשוואה בין לפני לאחרי"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4))
          if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4))
        }}
      >
        <span className="imgcmp__knob" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 3 12 9 18" />
            <polyline points="15 6 21 12 15 18" />
          </svg>
        </span>
      </div>
    </div>
  )
}
