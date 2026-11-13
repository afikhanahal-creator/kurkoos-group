// Moments: one short, meaningful motion for each thing a person sends out of their hands or takes back.
//   upload   → the files fly from where they were dropped into "חשבוניות חדשות", whose badge answers with a pulse
//   download → a sheet slides down out of the button into the bottom edge, as into a tray
//   send     → a paper plane leaves the button on a curve, leaving a fading trail
//   save     → a cloud in the button breathes once (Drive)
//   approve  → a check stamp lands on the row
// Each ends with a toast that says what really happened. Motion follows the hyperframes-animation rules: transform and
// opacity only, positions measured once at the start, decelerating eases, ≤ 900ms, nothing loops, and under
// prefers-reduced-motion only the toast remains. Built on the Web Animations API (no library, nothing to load).

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'          // expo-out: arrives softly
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
const reduced = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
const root = () => {
  let r = document.getElementById('fin-moments')
  if (!r) { r = document.createElement('div'); r.id = 'fin-moments'; r.className = 'fin-moments'; r.setAttribute('aria-hidden', 'true'); (document.querySelector('.fin') || document.body).appendChild(r) }
  return r
}
const toastRoot = () => {
  let r = document.getElementById('fin-toasts')
  if (!r) { r = document.createElement('div'); r.id = 'fin-toasts'; r.className = 'fin-toasts'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite'); (document.querySelector('.fin') || document.body).appendChild(r) }
  return r
}
const rectOf = (el) => (el && el.getBoundingClientRect ? el.getBoundingClientRect() : null)
const centre = (r) => (r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 })
const visible = (el) => { const r = rectOf(el); return !!r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth }
const SVG = {
  doc: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  plane: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path class="fin-moment__tick" d="M5 12.5 10 17 19 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 11l6 6 6-6M5 20h14"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
}
// every kind of moment has its own animation; the toast shows it where the still icon used to be
const LOTTIE = { check: 'approve', plane: 'send', doc: 'upload', down: 'download', cloud: 'save', alert: 'fail', merge: 'merge', trash: 'remove', message: 'message' }
const lottieInto = (node, name) => { if (!node || !name) return; import('./lottie/play.jsx').then(({ play }) => { if (!node.isConnected) return; node.textContent = ''; node.classList.add('has-lottie'); play(node, name) }).catch(() => {}) }
const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d }
const done = (anim, node) => anim.finished.then(() => node.remove(), () => node.remove())

/* the toast: what happened, in words. A link-like action is optional. Stays 4.5s, or until closed. */
export function toast({ title, sub = '', tone = 'ok', icon, action } = {}) {
  if (typeof document === 'undefined') return
  const r = toastRoot()
  const t = el(`fin-toast is-${tone}`, `<span class="fin-toast__icon">${SVG[icon || (tone === 'attn' ? 'alert' : 'check')] || SVG.check}</span><span class="fin-toast__text"><strong></strong><small></small></span>`)
  t.querySelector('strong').textContent = title || ''
  t.querySelector('small').textContent = sub
  if (!sub) t.querySelector('small').remove()
  if (action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'fin-toast__act'; b.textContent = action.label; b.onclick = () => { action.onClick(); close() }; t.appendChild(b) }
  const x = document.createElement('button'); x.type = 'button'; x.className = 'fin-toast__x'; x.setAttribute('aria-label', 'סגירה'); x.textContent = '×'; x.onclick = () => close(); t.appendChild(x)
  r.appendChild(t)
  lottieInto(t.querySelector('.fin-toast__icon'), LOTTIE[icon || (tone === 'attn' ? 'alert' : 'check')])
  while (r.children.length > 3) r.firstChild.remove()
  if (!reduced()) t.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_OUT })
  let timer = setTimeout(() => close(), 4500)
  t.addEventListener('pointerenter', () => clearTimeout(timer))
  t.addEventListener('pointerleave', () => { timer = setTimeout(() => close(), 2000) })
  function close() {
    clearTimeout(timer)
    if (!t.isConnected) return
    if (reduced()) { t.remove(); return }
    done(t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' }), t)
  }
}

/* the target answers: a soft ring and a small bounce on the badge or icon that received something */
function answer(target) {
  if (!target || reduced()) return
  target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 420, easing: EASE_OUT, delay: 0 })
  const r = rectOf(target); if (!r) return
  const ring = el('fin-moment__ring', '')
  Object.assign(ring.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` })
  root().appendChild(ring)
  done(ring.animate([{ opacity: 0.55, transform: 'translate(-50%, -50%) scale(0.6)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(2.4)' }], { duration: 640, easing: EASE_OUT }), ring)
}

/* upload: up to three sheets fly along an arc into the inbox */
function flyTo(fromRect, toEl, { count = 1, icon = 'doc' } = {}) {
  const to = visible(toEl) ? centre(rectOf(toEl)) : null
  if (!to || reduced()) return Promise.resolve()
  const from = centre(fromRect)
  const n = Math.min(3, Math.max(1, count))
  const flights = []
  for (let i = 0; i < n; i++) {
    const chip = el('fin-moment__chip', SVG[icon])
    const ox = (i - (n - 1) / 2) * 22
    Object.assign(chip.style, { left: `${from.x + ox}px`, top: `${from.y}px` })
    root().appendChild(chip)
    const dx = to.x - (from.x + ox); const dy = to.y - from.y
    // an arc: up first (a lift out of the hand), then down into the target
    const lift = Math.min(140, Math.abs(dx) * 0.3 + 60)
    const a = chip.animate([
      { transform: 'translate(-50%, -50%) scale(0.6) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.05) rotate(-6deg)', opacity: 1, offset: 0.14 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(0.95) rotate(${dx > 0 ? 8 : -8}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35) rotate(0deg)`, opacity: 0.2 },
    ], { duration: 820, easing: EASE_IN_OUT, delay: i * 90, fill: 'forwards' })
    flights.push(done(a, chip))
  }
  return Promise.all(flights).then(() => answer(toEl))
}

/* the inbox on this screen size: "חשבוניות חדשות" in the menu, or the documents tab on a phone */
const inbox = () => [...document.querySelectorAll('.fin__nav-item')].find((a) => /חשבוניות חדשות|כל המסמכים/.test(a.textContent) && visible(a))
  || [...document.querySelectorAll('.fin-tabbar a')].find((a) => /מסמכים/.test(a.textContent) && visible(a))

export const moments = {
  upload({ from, count = 1, names = [] } = {}) {
    const r = rectOf(from) || { left: innerWidth / 2 - 10, top: innerHeight / 2 - 10, width: 20, height: 20 }
    const target = inbox()
    flyTo(r, target?.querySelector('em') || target, { count })
    this.big('received', count === 1 ? 'המסמך עלה' : `${count} מסמכים עלו`)
    toast({ icon: 'doc', title: count === 1 ? 'המסמך התקבל' : `${count} מסמכים התקבלו`, sub: names.length === 1 ? `${names[0]} · נקרא עכשיו, ויחכה לבדיקה בחשבוניות חדשות` : 'נקראים עכשיו, ויחכו לבדיקה בחשבוניות חדשות', icon: 'doc' })
  },
  download({ from, name = '', count = 1 } = {}) {
    const f = from || document.activeElement
    if (!reduced() && visible(f)) {
      const c = centre(rectOf(f))
      const sheet = el('fin-moment__chip is-down', SVG.down)
      Object.assign(sheet.style, { left: `${c.x}px`, top: `${c.y}px` })
      root().appendChild(sheet)
      done(sheet.animate([
        { transform: 'translate(-50%, -50%) scale(0.7)', opacity: 0 },
        { transform: 'translate(-50%, calc(-50% + 6px)) scale(1)', opacity: 1, offset: 0.25 },
        { transform: `translate(-50%, calc(-50% + ${Math.min(160, innerHeight - c.y - 24)}px)) scale(0.6)`, opacity: 0 },
      ], { duration: 700, easing: EASE_IN_OUT, fill: 'forwards' }), sheet)
    }
    toast({ title: count > 1 ? `${count} קבצים הורדו` : 'הקובץ הורד', sub: name, icon: 'down' })
  },
  send({ from, title = 'נשלח', sub = '' } = {}) {
    const f = from || document.activeElement
    if (!reduced() && visible(f)) {
      const c = centre(rectOf(f))
      const plane = el('fin-moment__plane', SVG.plane)
      Object.assign(plane.style, { left: `${c.x}px`, top: `${c.y}px` })
      root().appendChild(plane)
      // RTL: "forward" is to the left; the plane climbs away towards the top-left corner
      const tx = -Math.min(c.x - 30, 360); const ty = -Math.min(c.y - 30, 240)
      done(plane.animate([
        { transform: 'translate(-50%, -50%) rotate(-90deg) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -50%) rotate(-100deg) scale(1.1)', opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${tx * 0.45}px), calc(-50% + ${ty * 0.2}px)) rotate(-120deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(-135deg) scale(0.5)`, opacity: 0 },
      ], { duration: 900, easing: EASE_IN_OUT, fill: 'forwards' }), plane)
      for (let i = 1; i <= 4; i++) {
        const dot = el('fin-moment__trail', '')
        Object.assign(dot.style, { left: `${c.x}px`, top: `${c.y}px` })
        root().appendChild(dot)
        done(dot.animate([
          { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
          { transform: `translate(calc(-50% + ${tx * 0.12 * i}px), calc(-50% + ${ty * 0.05 * i}px)) scale(1)`, opacity: 0.5, offset: 0.4 },
          { transform: `translate(calc(-50% + ${tx * 0.14 * i}px), calc(-50% + ${ty * 0.06 * i}px)) scale(0.2)`, opacity: 0 },
        ], { duration: 700, easing: EASE_OUT, delay: 60 * i, fill: 'forwards' }), dot)
      }
    }
    toast({ title, sub, icon: 'plane' })
  },
  save({ from, title = 'נשמר בענן', sub = '' } = {}) {
    const f = from || document.activeElement
    if (!reduced() && visible(f)) answer(f)
    toast({ title, sub, icon: 'cloud' })
  },
  approve({ from, title = 'אושר', sub = '' } = {}) {
    const f = from || document.activeElement
    if (!reduced() && visible(f)) {
      const c = centre(rectOf(f))
      const stamp = el('fin-moment__stamp', SVG.check)
      Object.assign(stamp.style, { left: `${c.x}px`, top: `${c.y}px` })
      root().appendChild(stamp)
      done(stamp.animate([
        { transform: 'translate(-50%, -50%) scale(1.8) rotate(-12deg)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(0.92) rotate(0deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ], { duration: 820, easing: EASE_OUT, fill: 'forwards' }), stamp)
    }
    toast({ title, sub })
  },
  fail({ title = 'הפעולה לא הצליחה', sub = '' } = {}) { toast({ title, sub, tone: 'attn' }) },
  // a large animation in the middle of the screen for the few actions that deserve it (a batch approved, sent, merged)
  // a large animation in the middle of the screen for a second or two, optionally with one line under it; it never
  // takes a click (the screen under it stays usable)
  big(name, caption = '') {
    if (reduced() || typeof document === 'undefined') return
    const box = el(`fin-moment__big ${caption ? 'has-caption' : ''}`, '<span class="fin-moment__art"></span>')
    if (caption) { const c = document.createElement('strong'); c.className = 'fin-moment__caption'; c.textContent = caption; box.appendChild(c) }
    root().appendChild(box)
    const art = box.querySelector('.fin-moment__art')
    box.animate([{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.86)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }], { duration: 260, easing: EASE_OUT })
    const leave = () => { if (box.isConnected) done(box.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(0.96)' }], { duration: 280, fill: 'forwards' }), box) }
    import('./lottie/play.jsx').then(({ play }) => { play(art, name, { onDone: () => setTimeout(leave, caption ? 500 : 0) }); setTimeout(() => box.remove(), 3600) }).catch(() => box.remove())
  },
  // a photo taken with the camera was received and read
  capture({ name = '' } = {}) { this.big('snapped', name ? `${name} נקלט` : 'הצילום נקלט') },
  merge({ title = 'המסמכים מוזגו', sub = '' } = {}) { this.big('merge'); toast({ title, sub, icon: 'merge' }) },
  remove({ title = 'נמחק', sub = '' } = {}) { toast({ title, sub, icon: 'trash' }) },
  message({ title = 'התקבלה הודעה', sub = '' } = {}) { toast({ title, sub, icon: 'message' }) },
}
