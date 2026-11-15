/* The Kurkoos mark, alive: four towers that rise from their base, and the name beside them. Drawn inline (not as an
   image) so each tower can move on its own. `loop` keeps the towers building, for a loading screen. Everything stands
   still under "reduce motion". The same drawing sits in finance-app.html for the moment before the app's code arrives. */
import { useEffect, useRef, useState } from 'react'

const TOWERS = [[23, 32, 5, 44], [34, 12, 8, 64], [46, 22, 6, 54], [56, 42, 4, 34]]

export function BrandMark({ size = 46, loop = false, className = '' }) {
  return (
    <svg className={`fin-brand ${loop ? 'is-loop' : 'is-in'} ${className}`} viewBox="16 6 52 76" width={Math.round(size * 52 / 76)} height={size} aria-hidden="true" focusable="false">
      {TOWERS.map(([x, y, w, h], i) => <rect key={x} x={x} y={y} width={w} height={h} rx="0.6" style={{ '--i': i }} />)}
    </svg>
  )
}

/* the full logo: the mark and the name. The picture has an accessible name; the moving parts are decoration. */
export function BrandLogo({ height = 56, className = '' }) {
  return (
    <svg className={`fin-brand fin-brand--logo is-in ${className}`} viewBox="14 0 300 96" height={height} width={Math.round(height * 300 / 96)} role="img" aria-label="קבוצת קורקוס">
      <g className="fin-brand__towers">{TOWERS.map(([x, y, w, h], i) => <rect key={x} x={x} y={y} width={w} height={h} rx="0.6" style={{ '--i': i }} />)}</g>
      <g className="fin-brand__name">
        <text x="86" y="56" fontFamily="Georgia, 'Times New Roman', 'Noto Serif', serif" fontSize="40" letterSpacing="2">KURK<tspan className="fin-brand__o1">O</tspan><tspan className="fin-brand__o2" dx="-15">O</tspan><tspan dx="2">S</tspan></text>
        <text className="fin-brand__group" x="88" y="83" fontFamily="Georgia, 'Times New Roman', 'Noto Serif', serif" fontSize="15" letterSpacing="9">GROUP</text>
      </g>
      <rect className="fin-brand__base" x="20" y="77.5" width="44" height="1.5" rx="0.75" />
    </svg>
  )
}

/* the loading screen: the towers keep building, with one quiet line under them */
export function BrandLoader({ label = 'טוען את המערכת' }) {
  return (
    <div className="fin-boot fin-boot--brand" role="status" aria-label={label}>
      <BrandMark size={64} loop />
      <span className="fin-boot__bar" aria-hidden="true" />
      <p className="fin-boot__label">{label}</p>
    </div>
  )
}

/* The logo's full entrance on the sign-in screen: the Lottie file made from the logo (docs/finance/brand), in which
   the two O's slide into their overlap. The player and the file are fetched after the first paint; until they arrive,
   under reduced motion, or if they fail, the drawn logo above stands in its place, so the space never jumps. */
export function LogoIntro({ height = 64, className = '' }) {
  const box = useRef(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let anim = null; let gone = false
    Promise.all([import('lottie-web/build/player/lottie_light'), import('./lottie/logo-intro.json')]).then(([m, data]) => {
      if (gone || !box.current) return
      anim = (m.default || m).loadAnimation({ container: box.current, renderer: 'svg', loop: false, autoplay: true, animationData: data.default || data, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } })
      setPlaying(true)
    }).catch(() => {})
    return () => { gone = true; try { anim?.destroy() } catch { /* already gone */ } }
  }, [])
  // the file is 1200x400 with the logo inside 900x288: the box is sized so the logo keeps the height asked for
  const h = Math.round(height * 400 / 288); const w = Math.round(h * 3)
  return (
    <span className={`fin-logointro ${className}`} style={{ width: w, height: h }} role="img" aria-label="קבוצת קורקוס">
      <span ref={box} className="fin-logointro__lottie" aria-hidden="true" />
      {!playing && <BrandLogo height={height} className="fin-logointro__still" />}
    </span>
  )
}
