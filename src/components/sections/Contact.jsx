import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
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
  const [topic, setTopic] = useState('development')

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: חבר לשירות שליחה אמיתי (EmailJS / API / Formspree).
    setSent(true)
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
            onPickDate={(label) => {
              const el = document.getElementById('cf-message')
              if (el && !el.value) {
                el.value = L({ he: `אשמח לתאם פגישה ל-${label}`, en: `I'd like to book a meeting on ${label}` })
              }
            }}
          />
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
                <button type="submit" className="btn contact__submit">{t('contact.submit')}</button>
              </form>
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}
