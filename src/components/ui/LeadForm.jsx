import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { waHref } from '../../lib/contact.js'
import { track } from '../../lib/track.js'
import Icon from './Icon.jsx'
import './LeadForm.css'

/* ============================================================
   חלקי תצוגה משותפים לטפסי הלידים (ראו lib/leadForm.js):
   - LeadFields: שם, טלפון, דוא"ל והודעה, עם תווית גלויה מעל כל שדה
     והודעת שגיאה בטקסט מתחתיו (לא רק מסגרת אדומה).
   - LeadSubmit: "קבלו שיחה חוזרת", ו"שולח…" בזמן השליחה.
   - LeadSuccess: אישור קבלה + כפתור וואטסאפ למי שרוצה מהר יותר.
   - LeadFailure: כשהשמירה נכשלה, כפתור וואטסאפ עם הפרטים שהוקלדו.
   ============================================================ */

const ERRORS = {
  name: { required: { he: 'נא למלא שם', en: 'Please enter your name' } },
  phone: {
    required: { he: 'נא למלא מספר טלפון', en: 'Please enter a phone number' },
    phone: { he: 'מספר הטלפון לא תקין. הזינו מספר ישראלי, למשל 050-1234567', en: 'Invalid phone number. Please enter an Israeli number, e.g. 050-1234567' },
  },
  email: { email: { he: 'כתובת הדוא"ל לא תקינה', en: 'Invalid email address' } },
}

export function LeadFields({ lf, fieldClass = 'field', messageRows = 3, messagePlaceholder }) {
  const { t } = useI18n()
  const L = useLocalized()
  const id = (k) => `${lf.idPrefix}-${k}`
  const optional = L({ he: '(לא חובה)', en: '(optional)' })

  const field = (key, label, required, control) => {
    const err = lf.errors[key]
    const errMsg = err && ERRORS[key]?.[err] ? L(ERRORS[key][err]) : ''
    return (
      <div className={`${fieldClass} lf-field${err ? ' is-invalid' : ''}`}>
        <label className="lf-label" htmlFor={id(key)}>
          {label}
          {required
            ? <span className="lf-label__req" aria-hidden="true">*</span>
            : <span className="lf-label__opt">{optional}</span>}
        </label>
        {control({
          id: id(key),
          name: key,
          value: lf.values[key],
          onChange: lf.setField(key),
          onBlur: lf.blurField(key),
          'aria-invalid': err ? true : undefined,
          'aria-describedby': errMsg ? `${id(key)}-err` : undefined,
          className: err ? 'has-error' : undefined,
        })}
        {errMsg && <p className="lf-error" id={`${id(key)}-err`} role="alert">{errMsg}</p>}
      </div>
    )
  }

  return (
    <>
      {field('name', t('contact.name'), true, (p) => <input {...p} type="text" autoComplete="name" aria-required="true" />)}
      {field('phone', t('contact.phone'), true, (p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" aria-required="true" />)}
      {field('email', t('contact.email'), false, (p) => <input {...p} type="email" inputMode="email" autoComplete="email" />)}
      {field('message', t('contact.message'), false, (p) => <textarea {...p} rows={messageRows} placeholder={messagePlaceholder} />)}
    </>
  )
}

export function LeadSubmit({ lf, className = 'btn btn--primary btn--lg' }) {
  const L = useLocalized()
  return (
    <button type="submit" className={className} disabled={lf.busy} aria-busy={lf.busy || undefined}>
      {lf.busy ? L({ he: 'שולח…', en: 'Sending…' }) : L({ he: 'קבלו שיחה חוזרת', en: 'Get a call back' })}
    </button>
  )
}

export function LeadSuccess({ form, tone = 'light' }) {
  const { t } = useI18n()
  const L = useLocalized()
  return (
    <div className={`lf-outcome lf-outcome--ok lf-outcome--${tone}`} role="status">
      <span className="lf-outcome__icon"><Icon name="check" size={34} /></span>
      <p className="lf-outcome__title">{L({ he: 'קיבלנו. נחזור אליכם ביום העסקים הקרוב.', en: 'Got it. We will get back to you on the next business day.' })}</p>
      <a
        className="btn lf-wa"
        href={waHref(t('contact.waOpener'))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('whatsapp_click', { placement: `${form}_success` })}
      >
        <Icon name="whatsapp" size={20} />
        {L({ he: 'רוצים מהר יותר? כתבו לנו בוואטסאפ', en: 'Want it faster? Message us on WhatsApp' })}
      </a>
    </div>
  )
}

/* topicLabel: נושא הפנייה בעברית, כדי שההודעה בוואטסאפ תגיע עם ההקשר המלא */
export function LeadFailure({ lf, topicLabel, tone = 'light' }) {
  const L = useLocalized()
  if (!lf.failed) return null
  const v = lf.values
  const text = [
    'שלום, ניסיתי להשאיר פרטים באתר והשליחה לא עברה.',
    v.name.trim() && `שם: ${v.name.trim()}`,
    v.phone.trim() && `טלפון: ${v.phone.trim()}`,
    topicLabel && `נושא: ${topicLabel}`,
    v.message.trim() && `הודעה: ${v.message.trim().slice(0, 500)}`,
  ].filter(Boolean).join('\n')
  return (
    <div className={`lf-outcome lf-outcome--fail lf-outcome--${tone}`} role="alert">
      <p className="lf-outcome__msg">
        {L({
          he: 'השליחה לא הצליחה. כדי שהפנייה לא תלך לאיבוד, שלחו לנו את הפרטים בוואטסאפ בלחיצה אחת, או נסו שוב.',
          en: 'Sending failed. So your request is not lost, send us your details on WhatsApp in one tap, or try again.',
        })}
      </p>
      <a
        className="btn lf-wa"
        href={waHref(text)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('whatsapp_click', { placement: `${lf.form}_error` })}
      >
        <Icon name="whatsapp" size={20} />
        {L({ he: 'שלחו את הפרטים בוואטסאפ', en: 'Send details on WhatsApp' })}
      </a>
    </div>
  )
}
