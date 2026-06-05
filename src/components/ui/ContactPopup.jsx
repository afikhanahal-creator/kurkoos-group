import { useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Modal from './Modal.jsx'
import Icon from './Icon.jsx'
import './ContactPopup.css'

const TOPICS = ['development', 'construction', 'supervision', 'brokerage', 'other']

export default function ContactPopup({ open, onClose }) {
  const { t } = useI18n()
  const [sent, setSent] = useState(false)
  const [topic, setTopic] = useState('development')

  const submit = (e) => {
    e.preventDefault()
    setSent(true) // TODO: חבר לשירות שליחה אמיתי
  }

  return (
    <Modal open={open} onClose={onClose} className="contact-popup" label={t('contact.title')}>
      <div className="contact-popup__inner">
        <span className="eyebrow">{t('contact.eyebrow')}</span>
        <h2 className="contact-popup__title">{t('contact.title')}</h2>

        {sent ? (
          <div className="contact-popup__success">
            <span className="contact-popup__success-icon"><Icon name="check" size={36} /></span>
            <p>{t('contact.sent')}</p>
          </div>
        ) : (
          <>
            <p className="contact-popup__choose">{t('contactExtra.choose')}</p>
            <div className="contact-popup__topics">
              {TOPICS.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`contact-popup__topic ${topic === tp ? 'is-active' : ''}`}
                  onClick={() => setTopic(tp)}
                >
                  {t(`contactExtra.topics.${tp}`)}
                </button>
              ))}
            </div>
            <form className="contact-popup__form" onSubmit={submit}>
              <input type="text" required placeholder={`${t('contact.name')}*`} autoComplete="name" />
              <input type="tel" required placeholder={`${t('contact.phone')}*`} autoComplete="tel" />
              <input type="email" required placeholder={`${t('contact.email')}*`} autoComplete="email" />
              <textarea rows={3} placeholder={t('contact.message')} />
              <button type="submit" className="btn btn--primary btn--lg">{t('contact.submit')}</button>
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}
