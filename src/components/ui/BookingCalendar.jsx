import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './BookingCalendar.css'

/* ============================================================
   יומן תיאום פגישה — בהשראת רכיב ה-bento (21st.dev), בפלטת קורקוס.
   עברית + RTL. ימי עבר/שבת חסומים; "היום" בטבעת אדומה; מועדים פנויים
   קרובים מודגשים כעיגולי טורקיז; היום הנבחר נצבע באדום וממלא את הודעת
   הטופס. דו-לשוני (נופל לאנגלית כשהאתר באנגלית).
   ============================================================ */
const WD = {
  he: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
}

export default function BookingCalendar({ title, onPickDate, ctaTargetId = 'pd-name' }) {
  const { isRTL } = useI18n()
  const L = useLocalized()
  const [selected, setSelected] = useState(null)

  const locale = isRTL ? 'he-IL' : 'en-US'
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const todayDate = today.getDate()
  const monthName = today.toLocaleDateString(locale, { month: 'long' })

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const isSaturday = (d) => new Date(year, month, d).getDay() === 6
  const available = (d) => d >= todayDate && !isSaturday(d)

  // עד 5 "מועדים פנויים" קרובים — מודגשים כעיגולים מלאים (כמו ברפרנס)
  const slots = []
  for (let d = todayDate + 1; d <= daysInMonth && slots.length < 5; d++) {
    if (!isSaturday(d)) slots.push(d)
  }
  const isSlot = (d) => slots.includes(d)

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const headTitle = title || L({ he: 'קבעו פגישה', en: 'Book a meeting' })

  const focusForm = () => {
    const el = typeof document !== 'undefined' && document.getElementById(ctaTargetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }
  }

  const pick = (d) => {
    setSelected(d)
    onPickDate?.(`${d} ${monthName}`)
  }

  return (
    <div className="bcal" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bcal__head">
        <span className="bcal__eyebrow">{L({ he: 'קביעת מועד', en: 'Book a slot' })}</span>
        <h3 className="bcal__title">{headTitle}</h3>
        <p className="bcal__sub">
          {L({ he: 'בחרו מועד שנוח לכם ונחזור אליכם לאישור סופי', en: 'Pick a convenient time and we’ll confirm the final slot' })}
        </p>
        <button type="button" className="bcal__cta" onClick={focusForm}>
          {L({ he: 'מלאו פרטים', en: 'Fill in details' })}
        </button>
      </div>

      <div className="bcal__panel">
        <div className="bcal__panel-inner">
          <div className="bcal__row">
            <span className="bcal__month-name">{monthName} {year}</span>
            <span className="bcal__sep" aria-hidden="true" />
            <span className="bcal__dur">
              <Icon name="clock" size={13} /> {L({ he: 'שיחה · 30 דק׳', en: '30 min call' })}
            </span>
          </div>

          <div className="bcal__weekdays" aria-hidden="true">
            {(isRTL ? WD.he : WD.en).map((w, i) => (
              <span key={i} className="bcal__wd">{w}</span>
            ))}
          </div>

          <div className="bcal__grid">
            {cells.map((d, i) => {
              if (d === null)
                return <span key={`e${i}`} className="bcal__cell bcal__cell--empty" aria-hidden="true" />
              const isToday = d === todayDate
              const avail = available(d)
              const sel = selected === d
              const slot = isSlot(d) && avail
              const cls =
                'bcal__cell ' +
                (avail ? 'is-available' : 'is-off') +
                (slot ? ' is-slot' : '') +
                (isToday ? ' is-today' : '') +
                (sel ? ' is-selected' : '')
              return (
                <button
                  key={d}
                  type="button"
                  className={cls}
                  disabled={!avail}
                  aria-pressed={sel}
                  aria-label={`${d} ${monthName}${isToday ? ` (${L({ he: 'היום', en: 'today' })})` : ''}`}
                  onClick={() => pick(d)}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          className="bcal__fab"
          onClick={focusForm}
          aria-label={L({ he: 'מעבר לטופס', en: 'Go to form' })}
        >
          <Icon name="arrowDiagonal" size={22} />
        </button>
      </div>
    </div>
  )
}
