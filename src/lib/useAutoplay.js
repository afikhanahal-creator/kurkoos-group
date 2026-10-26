import { useEffect } from 'react'

/* A muted background video that has to play in every browser.
   Safari (and Chrome under some autoplay policies) only allow autoplay when "muted" and "playsinline" are real
   attributes, not just properties, which React does not set. A play() that the browser blocks is retried when the
   file has loaded and on the first gesture anywhere on the page. */
export function useAutoplay(ref, play, src) {
  useEffect(() => {
    const v = ref.current
    if (!v) return undefined
    v.muted = true
    v.defaultMuted = true
    v.playsInline = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', 'true')
    if (!play || !src) { v.pause(); return undefined }
    const tryPlay = () => {
      if (!(v.getAttribute('src') || v.querySelector('source')) || !v.paused) return
      const p = v.play()
      if (p && p.catch) p.catch(() => {})
    }
    const gestures = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'click']
    const onGesture = () => { tryPlay(); gestures.forEach((e) => window.removeEventListener(e, onGesture)) }
    gestures.forEach((e) => window.addEventListener(e, onGesture, { passive: true }))
    v.addEventListener('loadeddata', tryPlay)
    v.addEventListener('canplay', tryPlay)
    /* sources that arrive after mount need an explicit load, or the element keeps the empty state */
    if (!v.currentSrc) { try { v.load() } catch (e) { /* ignore */ } }
    tryPlay()
    return () => {
      gestures.forEach((e) => window.removeEventListener(e, onGesture))
      v.removeEventListener('loadeddata', tryPlay)
      v.removeEventListener('canplay', tryPlay)
    }
  }, [ref, play, src])
}
