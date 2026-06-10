/* ============================================================
   מערכת Toast קלה (ללא תלות חיצונית), RTL/עברית.
   שימוש:  import { toast } from '../../lib/toast.js'
           toast.success('נשמר')
           toast.error('השמירה נכשלה')
           toast.info('הפעולה בוטלה')
           toast('הודעה', { action: { label: 'ביטול', onClick } , duration: 5000 })
   רכיב התצוגה <Toaster /> מאזין ומציג. מנגנון pub/sub פשוט.
   ============================================================ */

let listeners = new Set()
let counter = 0

function emit(type, message, opts = {}) {
  const id = ++counter
  const toastObj = {
    id,
    type,
    message,
    duration: opts.duration ?? (type === 'error' ? 6000 : 3500),
    action: opts.action || null,
  }
  listeners.forEach((fn) => fn({ kind: 'add', toast: toastObj }))
  return id
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function dismissToast(id) {
  listeners.forEach((fn) => fn({ kind: 'remove', id }))
}

export const toast = Object.assign(
  (message, opts) => emit('default', message, opts),
  {
    success: (message, opts) => emit('success', message, opts),
    error: (message, opts) => emit('error', message, opts),
    info: (message, opts) => emit('info', message, opts),
    dismiss: dismissToast,
  }
)
