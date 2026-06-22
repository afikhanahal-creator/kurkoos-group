import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { createLead } from '../../lib/cms.js'
import Modal from './Modal.jsx'
import Icon from './Icon.jsx'
import './ContactPopup.css'

const TOPICS = ['development', 'construction', 'supervision', 'brokerage', 'other']

export default function ContactPopup({ open, onClose }) {
  const { t } = useI18n()
  const L = useLocalized()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('development')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    const fd = new FormData(e.currentTarget)
    const lead = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      project: { he: t(`contactExtra.topics.${topic}`), en: t(`contactExtra.topics.${topic}`) },
      source: 'contact',
      status: 'new',
    }
    try {
      await createLead(lead, { read: false })   // אנונימי — בלי קריאה חוזרת (RLS)
      setSent(true)
    } catch (err) {
      setError(L({ he: 'אירעה שגיאה בשליחה. נסו שוב, או חייגו אלינו ישירות.', en: 'Something went wrong. Please try again or call us directly.' }))
      if (typeof console !== 'undefined') console.error('createLead failed:', err?.message || err)
    } finally {
      setBusy(false)
    }
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
              <input name="name" type="text" required placeholder={`${t('contact.name')}*`} autoComplete="name" />
              <input name="phone" type="tel" required placeholder={`${t('contact.phone')}*`} autoComplete="tel" />
              <input name="email" type="email" required placeholder={`${t('contact.email')}*`} autoComplete="email" />
              <textarea name="message" rows={3} placeholder={t('contact.message')} />
              {error && <p role="alert" style={{ color: '#c0392b', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{error}</p>}
              <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
                {busy ? L({ he: 'שולח…', en: 'Sending…' }) : t('contact.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}
