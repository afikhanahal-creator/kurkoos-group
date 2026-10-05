import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import heDict from '../../i18n/he.js'
import enDict from '../../i18n/en.js'
import { LEAD_TOPICS as TOPICS } from '../../lib/contact.js'
import { useLeadForm } from '../../lib/leadForm.js'
import { getLastProject, trailSummary } from '../../lib/visitTrail.js'
import Modal from './Modal.jsx'
import { LeadFields, LeadSubmit, LeadSuccess, LeadFailure } from './LeadForm.jsx'
import './ContactPopup.css'

/* initialTopic: הנושא שמסומן בפתיחה. כפתור שפותח את החלון עם הקשר
   (למשל "הערכת עלות" ב-Hero) מעביר אותו דרך openContactPopup(topic). */
export default function ContactPopup({ open, onClose, initialTopic }) {
  const { t } = useI18n()
  const [topic, setTopic] = useState('development')
  const lf = useLeadForm({ form: 'contact_popup', idPrefix: 'cp' })

  // בכל פתיחה: הנושא שהתבקש, ואם לא התבקש נושא נשארים על הקודם
  useEffect(() => {
    if (open && initialTopic && TOPICS.includes(initialTopic)) setTopic(initialTopic)
  }, [open, initialTopic])

  const submit = (e) => {
    e.preventDefault()
    lf.submit((v) => ({
      ...v,
      // תיוג מדויק בשתי השפות ל-CRM + הפרויקט שבו התעניין הגולש בביקור הזה
      project: (() => {
        const interest = getLastProject()
        const he = heDict.contactExtra.topics[topic] + (interest ? ` · התעניין ב: ${interest.name}` : '')
        const en = enDict.contactExtra.topics[topic] + (interest ? ` · Interested in: ${interest.name}` : '')
        return interest ? { he, en, slug: interest.slug || '' } : { he, en }
      })(),
      notes: trailSummary() ? `מסע באתר: ${trailSummary()}` : undefined,
      source: 'contact',
      status: 'new',
    }), { topic })
  }

  return (
    <Modal open={open} onClose={onClose} className="contact-popup" label={t('contact.title')}>
      <div className="contact-popup__inner">
        <span className="eyebrow">{t('contact.eyebrow')}</span>
        <h2 className="contact-popup__title">{t('contact.title')}</h2>

        {lf.sent ? (
          <LeadSuccess form="contact_popup" />
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
                  aria-pressed={topic === tp}
                >
                  {t(`contactExtra.topics.${tp}`)}
                </button>
              ))}
            </div>
            <form className="contact-popup__form" onSubmit={submit} onInput={lf.onStart} noValidate>
              <LeadFields lf={lf} />
              <LeadFailure lf={lf} topicLabel={heDict.contactExtra.topics[topic]} />
              <LeadSubmit lf={lf} />
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}
