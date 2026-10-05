import { useState, useRef, useCallback } from 'react'
import { createLead } from './cms.js'
import { track } from './track.js'

/* ============================================================
   לוגיקה משותפת לכל טפסי הלידים באתר (סקשן צור קשר, החלון הקופץ,
   עמוד /contact וטופס עמוד הפרויקט):
   - שדות חובה: שם וטלפון בלבד. דוא"ל רשות, ואם מולא הוא נבדק.
   - בדיקת טלפון ישראלי אחידה לכל הטפסים.
   - form_start פעם אחת לטופס, בהקלדה הראשונה.
   - מצב שליחה (busy) שחוסם שליחה כפולה.
   - כשכל ניסיונות השמירה נכשלו: lead_error בלי שום פרט אישי, והטופס
     מציג כפתור וואטסאפ עם הפרטים כדי שהפנייה לא תלך לאיבוד.
   ============================================================ */

/* טלפון ישראלי: 9 או 10 ספרות שמתחילות ב-0, או אותו מספר עם 972+ במקום
   ה-0. רווחים, מקפים וסוגריים בין הספרות מותרים, כי כך אנשים מקלידים. */
export function isValidPhone(value) {
  const raw = String(value || '').trim()
  if (!raw || !/^[\d\s\-+().]+$/.test(raw)) return false
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+972')) digits = '0' + digits.slice(4)
  else if (digits.startsWith('972')) digits = '0' + digits.slice(3)
  if (digits.startsWith('00')) return false
  return /^0\d{8,9}$/.test(digits)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isValidEmail = (v) => EMAIL_RE.test(String(v || '').trim())

const EMPTY = { name: '', phone: '', email: '', message: '' }

/* קוד שגיאה בלבד, בלי ההודעה: הודעות של מסד הנתונים עלולות לכלול את
   השורה שנכשלה, כלומר שם וטלפון, ואלה לא נשלחים לאנליטיקס לעולם. */
const errorCode = (err) => String(err?.code || err?.name || 'unknown').replace(/[^\w.-]/g, '').slice(0, 40) || 'unknown'

export function useLeadForm({ form, idPrefix }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)
  const busyRef = useRef(false)

  // התחלת מילוי: נספר פעם אחת לכל טופס
  const onStart = useCallback(() => {
    if (started.current) return
    started.current = true
    track('form_start', { form })
  }, [form])

  const setField = (key) => (e) => {
    const v = e.target.value
    setValues((s) => ({ ...s, [key]: v }))
    setErrors((er) => (er[key] ? { ...er, [key]: undefined } : er))
    onStart()
  }

  // ביציאה משדה שמולא: מציגים מיד שגיאת פורמט, לא רק בלחיצה על שליחה
  const blurField = (key) => () => {
    const v = String(values[key] || '').trim()
    if (!v) return
    if (key === 'phone' && !isValidPhone(v)) setErrors((er) => ({ ...er, phone: 'phone' }))
    if (key === 'email' && !isValidEmail(v)) setErrors((er) => ({ ...er, email: 'email' }))
  }

  const validate = () => {
    const next = {}
    if (!values.name.trim()) next.name = 'required'
    if (!values.phone.trim()) next.phone = 'required'
    else if (!isValidPhone(values.phone)) next.phone = 'phone'
    if (values.email.trim() && !isValidEmail(values.email)) next.email = 'email'
    setErrors(next)
    return next
  }

  /* build מקבל את הערכים הנקיים ומחזיר את שורת הליד. meta נשלח לאנליטיקס
     ולכן חייב להכיל רק נתונים לא אישיים (טופס, נושא, פרויקט, ערוץ). */
  const submit = async (build, meta = {}) => {
    if (busyRef.current) return
    const errs = validate()
    const first = ['name', 'phone', 'email'].find((k) => errs[k])
    if (first) {
      try { document.getElementById(`${idPrefix}-${first}`)?.focus() } catch { /* noop */ }
      return
    }
    busyRef.current = true
    setBusy(true)
    setFailed(false)
    const clean = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      // דוא"ל ריק נשלח כ-null ולא כמחרוזת ריקה: העמודה מאפשרת null,
      // ומדיניות ההכנסה בודקת אורך רק כשיש ערך
      email: values.email.trim() || null,
      message: values.message.trim(),
    }
    try {
      await createLead(build(clean), { read: false })
      track('generate_lead', { form, ...meta })
      setSent(true)
    } catch (err) {
      setFailed(true)
      track('lead_error', { form, ...meta, reason: errorCode(err) })
      if (typeof console !== 'undefined') console.error('createLead failed:', err?.message || err)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return { form, idPrefix, values, setValues, errors, busy, sent, failed, setField, blurField, onStart, submit }
}
