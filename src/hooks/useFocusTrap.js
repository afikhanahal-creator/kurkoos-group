import { useEffect, useRef } from 'react'

/* ============================================================
   מלכודת מיקוד לחלונות (ת״י 5568 / WCAG 2.4.3, 2.1.2):
   - בפתיחה: שומרים את האלמנט שפתח את החלון ומעבירים אליו את המיקוד
     (לשדה הראשון, או לאלמנט שסומן ב-data-autofocus, או לחלון עצמו).
   - Tab ו-Shift+Tab מסתובבים בתוך החלון בלבד.
   - בסגירה: המיקוד חוזר לאלמנט שפתח את החלון.
   ref: ref לאלמנט החלון. active: האם החלון פתוח.
   ============================================================ */
const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'summary',
  '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function focusablesIn(root) {
  if (!root) return []
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.closest('[inert]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 || r.height > 0 || el === document.activeElement
  })
}

export default function useFocusTrap(ref, active, { initialFocus = true, restoreFocus = true } = {}) {
  const opener = useRef(null)

  useEffect(() => {
    if (!active) return undefined
    opener.current = document.activeElement
    let raf = 0
    // החלון מונפש פנימה: ממתינים פריים כדי שהאלמנטים יהיו בעץ
    const focusIn = (tries = 0) => {
      const root = ref.current
      if (!root) { if (tries < 20) raf = requestAnimationFrame(() => focusIn(tries + 1)); return }
      if (!initialFocus) return
      if (root.contains(document.activeElement)) return
      const target = root.querySelector('[data-autofocus]') || focusablesIn(root)[0] || root
      if (target === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
    raf = requestAnimationFrame(() => focusIn())

    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const root = ref.current
      if (!root) return
      const list = focusablesIn(root)
      if (!list.length) { e.preventDefault(); root.focus(); return }
      const first = list[0]
      const last = list[list.length - 1]
      const cur = document.activeElement
      if (!root.contains(cur)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return }
      if (e.shiftKey && cur === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey, true)
      const back = opener.current
      if (restoreFocus && back && typeof back.focus === 'function' && document.contains(back)) {
        // אחרי שהחלון יוצא מהעץ
        setTimeout(() => { try { back.focus({ preventScroll: true }) } catch { /* noop */ } }, 0)
      }
    }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
}
