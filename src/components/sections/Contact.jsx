import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { createLead } from '../../lib/cms.js'
import Reveal from '../ui/Reveal.jsx'
import BookingCalendar from '../ui/BookingCalendar.jsx'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import Icon from '../ui/Icon.jsx'
import './Contact.css'

const TOPICS = ['development', 'construction', 'supervision', 'brokerage', 'other']

export default function Contact() {
  const { t } = useI18n()
  const L = useLocalized()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('development')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    const fd = new FormData(e.currentTarget)
    const lead = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      // עמודת project היא jsonb → שולחים אובייקט {he,en} (נושא הפנייה) ולא מחרוזת
      project: { he: t(`contactExtra.topics.${topic}`), en: t(`contactExtra.topics.${topic}`) },
      source: 'contact',                             // לא 'manual' → מפעיל התראת מייל
      status: 'new',
    }
    try {
      await createLead(lead, { read: false })   // שמירה ל-Supabase + התראת מייל אוטומטית (אנונימי — בלי קריאה חוזרת)
      setSent(true)
    } catch (err) {
      setError(L({
        he: 'אירעה שגיאה בשליחה. נסו שוב, או חייגו אלינו ישירות.',
        en: 'Something went wrong. Please try again or call us directly.',
      }))
      // למקרה שגיאה — נשאיר את הפרטים בלוג כדי לאבחן (RLS / רשת)
      if (typeof console !== 'undefined') console.error('createLead failed:', err?.message || err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section contact" id="contact">
      <span className="contact__plus-grid" aria-hidden="true" />
      <div className="container contact__inner">
        {/* יומן קביעת פגישה — דסקטופ בלבד (.contact__visual מוסתר ב-≤900px) */}
        <Reveal className="contact__visual contact__visual--cal" variant="right">
          <BookingCalendar
            title={L({ he: 'קבעו פגישה', en: 'Book a meeting' })}
            ctaTargetId="cf-name"
            onPickDate={(label, time) => {
              // בחירת שעה ממלאת את שדה ההודעה בטופס שמימין — לקיצור תהליך השליחה
              const when = time ? `${label} ${L({ he: 'בשעה', en: 'at' })} ${time}` : label
              const el = document.getElementById('cf-message')
              if (el) el.value = L({ he: `אשמח לתאם פגישה ל-${when}`, en: `I'd like to book a meeting for ${when}` })
            }}
          />
          {/* בחירת שעה ביומן ממלאת את שדה ההודעה בטופס; "מלאו פרטים" מדלג לשדה השם */}
        </Reveal>

        {/* פאנל טופס כהה */}
        <Reveal className="contact__panel" variant="left" delay={0.1}>
          <InfiniteGrid color="rgba(255,255,255,0.5)" baseOpacity={0.06} revealOpacity={0.22} />
          <span className="eyebrow contact__eyebrow">{t('contact.eyebrow')}</span>
          <h2 className="contact__title">{t('contact.title')}</h2>
          <p className="contact__choose">{t('contactExtra.choose')}</p>

          {sent ? (
            <div className="contact__success">
              <span className="contact__success-icon"><Icon name="check" size={40} /></span>
              <p>{t('contact.sent')}</p>
            </div>
          ) : (
            <>
              <div className="contact__topics">
                {TOPICS.map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    className={`contact__topic ${topic === tp ? 'is-active' : ''}`}
                    onClick={() => setTopic(tp)}
                  >
                    {t(`contactExtra.topics.${tp}`)}
                  </button>
                ))}
              </div>

              <form className="contact__form" onSubmit={handleSubmit}>
                <p className="contact__required">{t('contactExtra.required')}</p>
                <div className="field">
                  <input id="cf-name" name="name" type="text" required placeholder={`${t('contact.name')}*`} autoComplete="name" />
                </div>
                <div className="field">
                  <input id="cf-phone" name="phone" type="tel" required placeholder={`${t('contact.phone')}*`} autoComplete="tel" />
                </div>
                <div className="field">
                  <input id="cf-email" name="email" type="email" required placeholder={`${t('contact.email')}*`} autoComplete="email" />
                </div>
                <div className="field">
                  <textarea id="cf-message" name="message" rows={3} placeholder={t('contact.message')} />
                </div>
                {error && (
                  <p className="contact__error" role="alert" style={{ color: '#ffc4c4', margin: '0.2rem 0 0', fontSize: '0.9rem', fontWeight: 600 }}>
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn--primary contact__submit" disabled={busy}>
                  {busy ? L({ he: 'שולח…', en: 'Sending…' }) : t('contact.submit')}
                </button>
              </form>
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}
