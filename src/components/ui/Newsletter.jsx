import { useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import { subscribeNewsletter } from '../../lib/cms.js'
import { track } from '../../lib/track.js'
import { newsletterContext } from '../../lib/visitTrail.js'
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
      await subscribeNewsletter(email, 'site', newsletterContext())
      track('newsletter_signup', {})
      setDone(true)
    } catch {
      setErr('ההרשמה נכשלה, נסו שוב בעוד רגע.')
    } finally { setBusy(false) }
  }

  return (
    <div className="newsletter">
      <div>
        <h2 className="newsletter__title">{t('newsletter.title')}</h2>
        <p className="newsletter__lead">{t('newsletter.lead')}</p>
      </div>
      {/* הודעת הצלחה מוקראת לקורא מסך (אזור חי שקיים מראש) */}
      <div aria-live="polite" className="newsletter__live">
        {done && <p className="newsletter__done"><Icon name="check" size={20} /> {t('newsletter.done')}</p>}
      </div>
      {done ? null : (
        <form className="newsletter__form" onSubmit={submit}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('newsletter.placeholder')}
            aria-label={t('newsletter.placeholder')}
            autoComplete="email"
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? 'newsletter-err' : undefined}
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? '…' : t('newsletter.submit')}
          </button>
          {err && <p className="newsletter__err" id="newsletter-err" role="alert">{err}</p>}
        </form>
      )}
    </div>
  )
}
