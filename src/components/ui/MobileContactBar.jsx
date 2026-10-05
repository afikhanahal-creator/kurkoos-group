import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { telHref, waHref, openContactPopup } from '../../lib/contact.js'
import { track } from '../../lib/track.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import Icon from './Icon.jsx'
import './MobileContactBar.css'

/* ============================================================
   בר פנייה קבוע בתחתית המסך במובייל (עד 768px), בכל העמודים
   הציבוריים: חייגו · וואטסאפ · השאירו פרטים.
   - המספרים נלקחים מ-lib/contact.js (מקור יחיד, מ-site.contact).
   - הלחיצות נמדדות בשמות שהדשבורד סופר: phone_click → kc_phone,
     whatsapp_click → kc_whatsapp, cta_click → kc_cta_click.
   - לא מוצג באדמין, במנוע (/engine) ובעמוד /contact, שבו הטופס הוא העמוד.
   - בזמן הקלדה בשדה הבר מתחבא, כדי לא לשבת מעל המקלדת והשדה.
   - body מקבל has-contactbar, וממנו נגזר ריווח תחתון לעמוד ומיקום
     באנר העוגיות, הבאנר השיווקי וכפתור הנגישות מעל הבר.
   ============================================================ */
const HIDDEN_ON = [/^\/admin(\/|$)/, /^\/engine(\/|$)/, /^\/contact\/?$/]

export default function MobileContactBar() {
  const { t } = useI18n()
  const L = useLocalized()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const [typing, setTyping] = useState(false)

  const show = isMobile && !HIDDEN_ON.some((re) => re.test(pathname))

  useEffect(() => {
    document.body.classList.toggle('has-contactbar', show)
    return () => document.body.classList.remove('has-contactbar')
  }, [show])

  // הקלדה בשדה טופס: מסתירים את הבר עד שהמיקוד יוצא מהשדה
  useEffect(() => {
    if (!show) return undefined
    const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    const onIn = (e) => { if (isField(e.target)) setTyping(true) }
    const onOut = () => setTimeout(() => setTyping(isField(document.activeElement)), 0)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
    }
  }, [show])

  if (!show) return null

  return (
    <nav className={`cbar${typing ? ' is-typing' : ''}`} aria-label={L({ he: 'יצירת קשר מהירה', en: 'Quick contact' })}>
      <a
        className="cbar__btn cbar__btn--call"
        href={telHref()}
        onClick={() => track('phone_click', { placement: 'mobile_bar' })}
      >
        <Icon name="phone" size={20} />
        <span>{L({ he: 'חייגו', en: 'Call' })}</span>
      </a>
      <a
        className="cbar__btn cbar__btn--wa"
        href={waHref(t('contact.waOpener'))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('whatsapp_click', { placement: 'mobile_bar' })}
      >
        <Icon name="whatsapp" size={20} />
        <span>{L({ he: 'וואטסאפ', en: 'WhatsApp' })}</span>
      </a>
      <button
        type="button"
        className="cbar__btn cbar__btn--form"
        onClick={() => { track('cta_click', { placement: 'mobile_bar_form' }); openContactPopup() }}
      >
        <Icon name="mail" size={20} />
        <span>{L({ he: 'השאירו פרטים', en: 'Leave details' })}</span>
      </button>
    </nav>
  )
}
