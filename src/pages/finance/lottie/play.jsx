import { useEffect, useRef } from 'react'
import { ANIMS, LOOPS } from './anims.js'

/* The player is fetched the first time an animation is needed (the light SVG build), never with the first screen.
   With "reduce motion" on, the animation is shown as its finished picture and does not move. */
let lib = null
const load = () => (lib ||= import('lottie-web/build/player/lottie_light').then((m) => m.default || m))
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* play(node, name): draws the animation into the node. Returns a function that stops and removes it. */
export function play(node, name, { loop = LOOPS.has(name), onDone } = {}) {
  const make = ANIMS[name]
  if (!node || !make) return () => {}
  let anim = null; let gone = false
  load().then((lottie) => {
    if (gone || !node.isConnected) return
    const data = make()
    anim = lottie.loadAnimation({ container: node, renderer: 'svg', loop: loop && !reduced(), autoplay: !reduced(), animationData: data, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } })
    if (reduced()) anim.goToAndStop(LOOPS.has(name) ? 0 : data.op - 1, true)
    else if (!loop && onDone) anim.addEventListener('complete', onDone)
  }).catch(() => {})
  return () => { gone = true; try { anim?.destroy() } catch { /* already gone */ } }
}

/* <Lottie name="empty" size={96} />: decoration only, so it is hidden from screen readers */
export default function Lottie({ name, size = 96, loop, className = '' }) {
  const ref = useRef(null)
  useEffect(() => play(ref.current, name, { loop }), [name, loop])
  return <span ref={ref} className={`fin-lottie ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
}
