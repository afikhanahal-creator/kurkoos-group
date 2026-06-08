import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './BookingCalendar.css'

/* ============================================================
   יומן תיאום פגישה — רכיב ויזואלי מותג (Flat 2.0).
   מציג את החודש הנוכחי, בעברית ומימין-לשמאל (RTL), עם בחירת יום זמין.
   ימי עבר ושבת חסומים; "היום" מודגש; היום הנבחר נצבע בטורקיז המותג.
   ============================================================ */
const WD = {
  he: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'], // ראשון → שבת
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
}

export default function BookingCalendar({ title }) {
  const { isRTL } = useI18n()
  const L = useLocalized()
  const [selected, setSelected] = useState(null)

  const locale = isRTL ? 'he-IL' : 'en-US'
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const todayDate = today.getDate()
  const monthName = today.toLocaleDateString(locale, { month: 'long' })

  const firstWeekday = new Date(year, month, 1).getDay() // 0 = ראשון
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // יום זמין = מהיום והלאה, ולא שבת (סוף שבוע בישראל)
  const isSaturday = (d) => new Date(year, month, d).getDay() === 6
  const available = (d) => d >= todayDate && !isSaturday(d)

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const headTitle = title || L({ he: 'לתיאום פגישה', en: 'Schedule a meeting' })
  const pickedText = selected
    ? L({
        he: `בחרתם ${selected} ב${monthName} — מלאו פרטים ונאשר טלפונית`,
        en: `You picked ${monthName} ${selected} — fill in your details and we’ll confirm by phone`,
      })
    : null

  return (
    <div className="bcal" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bcal__head">
        <span className="bcal__eyebrow">{L({ he: 'קביעת מועד', en: 'Book a slot' })}</span>
        <h3 className="bcal__title">{headTitle}</h3>
        <p className="bcal__note">
          <Icon name="clock" size={15} />
          {L({ he: 'שיחת היכרות אישית · 30 דק׳', en: 'Personal intro call · 30 min' })}
        </p>
      </div>

      <div className="bcal__cal">
        <div className="bcal__month">
          <span className="bcal__month-name">{monthName} {year}</span>
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
            const cls =
              'bcal__cell ' +
              (avail ? 'is-available' : 'is-off') +
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
                onClick={() => setSelected(d)}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bcal__foot">
        {selected ? (
          <p className="bcal__picked">
            <Icon name="check" size={16} /> {pickedText}
          </p>
        ) : (
          <p className="bcal__hint">
            {L({ he: 'בחרו יום שנוח לכם — נחזור אליכם לתיאום סופי', en: 'Pick a day that suits you — we’ll confirm the final time' })}
          </p>
        )}
      </div>
    </div>
  )
}
