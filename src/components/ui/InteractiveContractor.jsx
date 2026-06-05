import { useEffect, useRef } from 'react'
import './InteractiveContractor.css'

/* מודל קבלן אינטראקטיבי — שתי שכבות PNG (גוף + ראש) עם אפקט תלת-מימד:
   הראש עוקב אחרי הסמן/מגע/הטיית המכשיר, ובמנוחה נע בעדינות מעצמו. */
const HEAD = { left: 29.97, top: 0, width: 37.46, pivotX: 50, pivotY: 90.9 }
const ASPECT = 1.9813 // גובה / רוחב של הדמות

export default function InteractiveContractor({
  bodySrc = '/contractor-body.png',
  headSrc = '/contractor-head.png',
  className = '',
}) {
  const rootRef = useRef(null)
  const headRef = useRef(null)
  const figRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const head = headRef.current
    const fig = figRef.current
    if (!root || !head || !fig) return

    let ux = 0, uy = 0, useUntil = 0, cx = 0, cy = 0, raf = 0
    const start = Date.now()

    const setU = (px, py) => { ux = px; uy = py; useUntil = Date.now() + 1800 }

    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e
      if (!p) return
      const r = root.getBoundingClientRect()
      setU(((p.clientX - r.left) / r.width) * 2 - 1, ((p.clientY - r.top) / r.height) * 2 - 1)
    }
    const onOrient = (e) => {
      if (e.gamma == null || e.beta == null) return
      setU(Math.max(-1, Math.min(1, e.gamma / 35)), Math.max(-1, Math.min(1, (e.beta - 40) / 35)))
    }

    const loop = () => {
      const t = (Date.now() - start) / 1000
      const ix = Math.sin(t * 0.8) * 0.6
      const iy = Math.sin(t * 1.15 + 1) * 0.3
      const useInput = Date.now() < useUntil
      const tx = useInput ? ux : ix
      const ty = useInput ? uy : iy
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      head.style.transform = `translateZ(45px) rotateY(${cx * 30}deg) rotateX(${-cy * 18}deg)`
      fig.style.transform = `rotateY(${cx * 5}deg) rotateX(${-cy * 3}deg)`
      raf = requestAnimationFrame(loop)
    }

    root.addEventListener('mousemove', onMove)
    root.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('deviceorientation', onOrient)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('mousemove', onMove)
      root.removeEventListener('touchmove', onMove)
      window.removeEventListener('deviceorientation', onOrient)
    }
  }, [])

  return (
    <div ref={rootRef} className={`contractor3d ${className}`} aria-hidden="true">
      <div ref={figRef} className="contractor3d__fig" style={{ aspectRatio: `${1 / ASPECT}` }}>
        <img src={bodySrc} alt="" draggable={false} className="contractor3d__body" />
        <img
          ref={headRef}
          src={headSrc}
          alt=""
          draggable={false}
          className="contractor3d__head"
          style={{
            left: `${HEAD.left}%`,
            top: `${HEAD.top}%`,
            width: `${HEAD.width}%`,
            transformOrigin: `${HEAD.pivotX}% ${HEAD.pivotY}%`,
          }}
        />
      </div>
    </div>
  )
}
