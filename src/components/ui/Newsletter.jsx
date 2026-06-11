import { useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import { subscribeNewsletter } from '../../lib/cms.js'
import Icon from './Icon.jsx'
import './Newsletter.css'

export default function Newsletter() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      // נשמר במאגר הנרשמים בענן + מפעיל וובהוק אוטומציות אם הוגדר באדמין
      await subscribeNewsletter(email, 'site')
      setDone(true)
    } catch {
      setErr('ההרשמה נכשלה — נסו שוב בעוד רגע.')
    } finally { setBusy(false) }
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('newsletter.placeholder')}
            aria-label={t('newsletter.placeholder')}
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? '…' : t('newsletter.submit')}
          </button>
          {err && <p className="newsletter__err" role="alert">{err}</p>}
        </form>
      )}
    </div>
  )
}
