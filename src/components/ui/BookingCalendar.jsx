import { useState, useEffect, useMemo, useRef } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { fetchSettings } from '../../lib/cms.js'
import Icon from './Icon.jsx'
import './BookingCalendar.css'

/* ============================================================
   יומן תיאום פגישה — בחירת תאריך פותחת בורר שעות (סלוטים פנויים).
   השעות הפנויות נשלטות מהאדמין (site_settings.booking_hours):
     { start:'09:00', end:'18:00', step:30, days:[0..6] }  (0=ראשון..6=שבת)
   ברירת מחדל: א׳–ו׳, 09:00–18:00, כל 30 דק׳. סלוטים שעברו היום מוסתרים.
   בחירת שעה ממלאת את הודעת הטופס בתאריך+שעה.
   ============================================================ */
const WD = {
  he: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
}
const DEFAULT_HOURS = { start: '09:00', end: '18:00', step: 30, days: [0, 1, 2, 3, 4, 5] }

function parseHours(v) {
  if (!v) return DEFAULT_HOURS
  try { const o = typeof v === 'string' ? JSON.parse(v) : v; return { ...DEFAULT_HOURS, ...o } } catch { return DEFAULT_HOURS }
}
function genSlots(cfg) {
  const [sh, sm] = String(cfg.start).split(':').map(Number)
  const [eh, em] = String(cfg.end).split(':').map(Number)
  const step = Number(cfg.step) || 30
  const out = []
  let t = sh * 60 + (sm || 0)
  const end = eh * 60 + (em || 0)
  while (t < end) { out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`); t += step }
  return out
}

export default function BookingCalendar({ title, onPickDate, ctaTargetId = 'pd-name' }) {
  const { isRTL } = useI18n()
  const L = useLocalized()
  const [selected, setSelected] = useState(null)
  const [time, setTime] = useState(null)
  const [hoursCfg, setHoursCfg] = useState(DEFAULT_HOURS)
  // החודש המוצג (ברירת מחדל = החודש הנוכחי) + מצב פתיחת בורר החודשים
  const [view, setView] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })
  const [monthOpen, setMonthOpen] = useState(false)
  const monthRef = useRef(null)

  // טעינת שעות הפעילות שהוגדרו באדמין (אם קיימות)
  useEffect(() => {
    let on = true
    fetchSettings().then((s) => { if (on && s) setHoursCfg(parseHours(s.booking_hours)) }).catch(() => {})
    return () => { on = false }
  }, [])

  const locale = isRTL ? 'he-IL' : 'en-US'
  const today = new Date()
  const realY = today.getFullYear()
  const realM = today.getMonth()
  const todayDate = today.getDate()
  const year = view.y
  const month = view.m
  const isCurrentMonth = year === realY && month === realM
  const monthName = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long' })

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const openDay = (d) => hoursCfg.days.includes(new Date(year, month, d).getDay())
  // בחודש הנוכחי — רק מהיום והלאה; בחודשים עתידיים — כל הימים הפתוחים זמינים
  const available = (d) => openDay(d) && (!isCurrentMonth || d >= todayDate)

  // עד 5 "מועדים פנויים" קרובים — מודגשים כעיגולים מלאים
  const slots = []
  for (let d = (isCurrentMonth ? todayDate + 1 : 1); d <= daysInMonth && slots.length < 5; d++) {
    if (openDay(d)) slots.push(d)
  }
  const isSlot = (d) => slots.includes(d)

  // אפשרויות לבורר החודשים — החודש הנוכחי + 5 קדימה (סה"כ 6)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(realY, realM + i, 1)
    return { y: dt.getFullYear(), m: dt.getMonth(), label: dt.toLocaleDateString(locale, { month: 'long', year: 'numeric' }) }
  })
  const pickMonth = (o) => { setView({ y: o.y, m: o.m }); setSelected(null); setTime(null); setMonthOpen(false) }

  // סגירת בורר החודשים בלחיצה מחוץ לו
  useEffect(() => {
    if (!monthOpen) return
    const onDoc = (e) => { if (monthRef.current && !monthRef.current.contains(e.target)) setMonthOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [monthOpen])

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const headTitle = title || L({ he: 'קבעו פגישה', en: 'Book a meeting' })

  // סלוטים של שעות — לתאריך שנבחר (מסתיר שעות שעברו אם זה היום)
  const timeSlots = useMemo(() => {
    const all = genSlots(hoursCfg)
    if (isCurrentMonth && selected === todayDate) {
      const nowMin = today.getHours() * 60 + today.getMinutes() + 30 // חוצץ 30 דק׳ קדימה
      return all.filter((s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m > nowMin })
    }
    return all
  }, [hoursCfg, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const focusForm = () => {
    const el = typeof document !== 'undefined' && document.getElementById(ctaTargetId)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }) }
  }

  const pickDate = (d) => { setSelected(d); setTime(null) }
  const pickTime = (tm) => {
    setTime(tm)
    onPickDate?.(`${selected} ${monthName}`, tm)
  }

  return (
    <div className="bcal" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bcal__head">
        <span className="bcal__eyebrow">{L({ he: 'קביעת מועד', en: 'Book a slot' })}</span>
        <h3 className="bcal__title">{headTitle}</h3>
        <p className="bcal__sub">
          {L({ he: 'בחרו תאריך ואז שעה פנויה — ונחזור אליכם לאישור', en: 'Pick a date then an open time — we’ll confirm' })}
        </p>
        <button type="button" className="bcal__cta" onClick={focusForm}>
          {L({ he: 'מלאו פרטים', en: 'Fill in details' })}
        </button>
      </div>

      <div className="bcal__panel">
        <div className="bcal__panel-inner">
          <div className="bcal__row">
            <div className="bcal__month-wrap" ref={monthRef}>
              <button
                type="button"
                className="bcal__month-btn"
                onClick={() => setMonthOpen((o) => !o)}
                aria-expanded={monthOpen}
                aria-haspopup="listbox"
              >
                {monthName} {year}
                <svg className={`bcal__month-chev ${monthOpen ? 'is-open' : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {monthOpen && (
                <div className="bcal__month-pop" role="listbox" aria-label={L({ he: 'בחירת חודש', en: 'Select month' })}>
                  {monthOptions.map((o) => (
                    <button
                      key={`${o.y}-${o.m}`}
                      type="button"
                      role="option"
                      aria-selected={o.y === year && o.m === month}
                      className={`bcal__month-opt ${o.y === year && o.m === month ? 'is-sel' : ''}`}
                      onClick={() => pickMonth(o)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              const isToday = isCurrentMonth && d === todayDate
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
                  onClick={() => pickDate(d)}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* בורר שעות — נפתח לאחר בחירת תאריך */}
          {selected != null && (
            <div className="bcal__times">
              <div className="bcal__times-head">
                <Icon name="clock" size={14} />
                {L({ he: `בחרו שעה · ${selected} ${monthName}`, en: `Pick a time · ${monthName} ${selected}` })}
              </div>
              {timeSlots.length === 0 ? (
                <p className="bcal__times-empty">{L({ he: 'אין שעות פנויות בתאריך זה — בחרו תאריך אחר.', en: 'No open times on this date — pick another day.' })}</p>
              ) : (
                <div className="bcal__times-grid">
                  {timeSlots.map((tm) => (
                    <button
                      key={tm}
                      type="button"
                      className={`bcal__time ${time === tm ? 'is-selected' : ''}`}
                      onClick={() => pickTime(tm)}
                    >
                      {tm}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
