import { useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './Newsletter.css'

export default function Newsletter() {
  const { t } = useI18n()
  const [done, setDone] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    // TODO: חבר לשירות דיוור (Mailchimp / API).
    setDone(true)
  }

  return (
    <div className="newsletter">
      <div>
        <h3 className="newsletter__title">{t('newsletter.title')}</h3>
        <p className="newsletter__lead">{t('newsletter.lead')}</p>
      </div>
      {done ? (
        <p className="newsletter__done"><Icon name="check" size={20} /> {t('newsletter.done')}</p>
      ) : (
        <form className="newsletter__form" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder={t('newsletter.placeholder')}
            aria-label={t('newsletter.placeholder')}
          />
          <button type="submit" className="btn btn--primary">{t('newsletter.submit')}</button>
        </form>
      )}
    </div>
  )
}
