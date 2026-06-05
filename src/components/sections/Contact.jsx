import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import projects from '../../data/projects.js'
import Reveal from '../ui/Reveal.jsx'
import SmartImage from '../ui/SmartImage.jsx'
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

  const heroImg = projects[0]?.cover

  return (
    <section className="section contact" id="contact">
      <span className="contact__plus-grid" aria-hidden="true" />
      <div className="container contact__inner">
        {/* פאנל תמונה בזווית */}
        <Reveal className="contact__visual" variant="right">
          <span className="contact__visual-shape" aria-hidden="true" />
          <div className="contact__visual-img">
            <SmartImage src={heroImg} alt={L(site.name)} label={L(site.name)} />
          </div>
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
