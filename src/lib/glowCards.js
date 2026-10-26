/* The red hover light from the execution page screens, on the site's form and office cards.
   One light layer is added to each card the first time the pointer reaches it, so the cards' own ::before and ::after
   stay untouched. The pointer position is written straight to CSS variables (no React render). Desktop pointers only;
   keyboard focus inside a form keeps a steady red ring. */
const CARDS = [
  '.cpage__form-card', '.office-map', '.contact__panel', '.contact__visual--cal',
  '.hl-form', '.cx-form', '.pd-contact__panel', '.pb-lead__form', '.newsletter',
].join(',')

function rgb(v) { const m = String(v).match(/\d+(\.\d+)?/g); return m ? m.map(Number) : null }
const L = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
/* a card is dark when its own background is dark, or (for a gradient or image background) when its text is light */
function isDark(el) {
  const cs = getComputedStyle(el); const bg = rgb(cs.backgroundColor)
  if (bg && !(bg.length === 4 && bg[3] < 0.2)) return L(bg) < 0.45
  const fg = rgb(cs.color)
  return !!fg && L(fg) > 0.7
}

function prepare(el) {
  if (el.__kglow) return
  el.__kglow = true
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  el.classList.add('k-glow')
  if (isDark(el)) el.classList.add('k-glow--dark')
  const layer = document.createElement('span')
  layer.className = 'k-glow__light'
  layer.setAttribute('aria-hidden', 'true')
  el.appendChild(layer)
}

export function initGlowCards() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
  let raf = 0, last = null
  const move = (e) => {
    if (!fine.matches) return
    const el = e.target && e.target.closest ? e.target.closest(CARDS) : null
    if (!el) return
    prepare(el)
    last = { el, x: e.clientX, y: e.clientY }
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const { el: t, x, y } = last
      const r = t.getBoundingClientRect()
      t.style.setProperty('--gx', `${x - r.left}px`)
      t.style.setProperty('--gy', `${y - r.top}px`)
    })
  }
  document.addEventListener('pointermove', move, { passive: true })
  /* entering straight onto an iframe (the map) sends no pointermove to the page, so prepare on pointerover too */
  document.addEventListener('pointerover', (e) => { if (!fine.matches) return; const el = e.target.closest && e.target.closest(CARDS); if (el) prepare(el) }, { passive: true })
  /* keyboard users get the steady ring too */
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest(CARDS); if (el) prepare(el) })
}
