import { useState, useEffect } from 'react'

/* ============================================================
   useIsMobile — האם רוחב המסך מתחת ל-breakpoint (ברירת מחדל 768px).
   מאזין לשינויי גודל/אוריינטציה ומחזיר boolean ריאקטיבי.
   ============================================================ */
export default function useIsMobile(query = '(max-width: 768px)') {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false)
  const [isMobile, setIsMobile] = useState(get)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
