/* iPhone browsers sometimes leave the layout viewport at the height it had while the keyboard was open (or while the
   address bar was showing): everything that is `position: fixed; bottom: 0` then floats in the middle of the screen
   until the next scroll. The visual viewport is always right, so the gap between the two is measured and the bottom bar
   is moved down by it (--fin-vv-fix, zero or negative). While the keyboard is open the gap is positive and nothing moves:
   the bar stays under the keyboard, as before. */
export function bottomFix(innerHeight, vvHeight, vvOffsetTop = 0, scale = 1) {
  if (!Number.isFinite(innerHeight) || !Number.isFinite(vvHeight) || Math.abs(scale - 1) > 0.01) return 0   // pinch zoom: leave it alone
  const gap = Math.round(innerHeight - (vvHeight + vvOffsetTop))
  return gap < -1 ? gap : 0
}

export function watchViewport() {
  const vv = window.visualViewport
  if (!vv) return () => {}
  const root = document.documentElement
  let last = null; let raf = 0
  const apply = () => {
    raf = 0
    const fix = bottomFix(window.innerHeight, vv.height, vv.offsetTop, vv.scale)
    if (fix !== last) { last = fix; if (fix) root.style.setProperty('--fin-vv-fix', `${fix}px`); else root.style.removeProperty('--fin-vv-fix') }
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(apply) }
  // after the keyboard closes the browser may not report anything: look again shortly after, and nudge the layout
  const settle = () => { queue(); setTimeout(() => { window.scrollTo(window.scrollX, window.scrollY); queue() }, 120); setTimeout(queue, 400) }
  vv.addEventListener('resize', queue); vv.addEventListener('scroll', queue)
  window.addEventListener('resize', queue); window.addEventListener('orientationchange', settle); window.addEventListener('pageshow', settle)
  document.addEventListener('focusout', settle); document.addEventListener('visibilitychange', settle)
  queue()
  return () => {
    vv.removeEventListener('resize', queue); vv.removeEventListener('scroll', queue)
    window.removeEventListener('resize', queue); window.removeEventListener('orientationchange', settle); window.removeEventListener('pageshow', settle)
    document.removeEventListener('focusout', settle); document.removeEventListener('visibilitychange', settle)
    if (raf) cancelAnimationFrame(raf); root.style.removeProperty('--fin-vv-fix')
  }
}
