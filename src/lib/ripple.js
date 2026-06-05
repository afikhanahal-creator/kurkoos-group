/* ============================================================
   אפקט אדווה (ripple) גלובלי לכל כפתור באתר.
   מאזין יחיד ברמת ה-document (event delegation) — חל אוטומטית על
   כל <button> ועל אלמנטים עם .btn או [data-ripple], כולל כאלה
   שנוצרים דינמית. לביטול על כפתור מסוים: data-no-ripple.
   ============================================================ */

const SELECTOR = 'button, .btn, [data-ripple]'

function spawnRipple(e) {
  // לחיצת עכבר ראשית / מגע בלבד
  if (e.button !== undefined && e.button !== 0) return

  const el = e.target.closest?.(SELECTOR)
  if (!el || el.disabled || el.hasAttribute('data-no-ripple')) return

  // האלמנט חייב מיכל יחסי וחיתוך כדי לאכלס את האדווה
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  el.style.overflow = 'hidden'

  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = (e.clientX || rect.left + rect.width / 2) - rect.left
  const y = (e.clientY || rect.top + rect.height / 2) - rect.top

  const span = document.createElement('span')
  span.className = 'ripple'
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${x - size / 2}px`
  span.style.top = `${y - size / 2}px`
  span.addEventListener('animationend', () => span.remove())
  el.appendChild(span)
}

let initialized = false
export function initRipples() {
  if (initialized) return
  initialized = true
  document.addEventListener('pointerdown', spawnRipple, { passive: true })
}

export default initRipples
