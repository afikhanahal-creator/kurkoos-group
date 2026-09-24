import { useEffect, useRef, useState } from 'react'
import { useLocalized } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import { useSettings } from '../../lib/cms.js'
import { track } from '../../lib/track.js'
import PropertyMap from './PropertyMap.jsx'
import Icon from './Icon.jsx'
import './OfficeMap.css'

/* ============================================================
   OfficeMap — כרטיס "איך מגיעים אלינו".
   שלוש החלטות שחשוב להכיר לפני שמשנים כאן משהו:

   1. המפה היא PropertyMap, אותו רכיב שמשרת את עמודי הפרויקטים.
      כך היא יורשת את סגנון המותג (חול חם, כחול, סמן הקוביה עם
      הלוגו) במקום להיראות כמו מפת גוגל סטנדרטית שהודבקה לאתר.

   2. היא נטענת רק כשגוללים אליה. הסקריפט של גוגל כבד, והמפה
      יושבת מתחת לקיפול, ולכן אין סיבה שהיא תשלם על עצמה בזמן
      הטעינה של העמוד.

   3. למיכל המפה יש aspect-ratio קבוע, כך שהמקום שלה שמור מראש
      והמעבר מהשלד למפה לא מזיז שום דבר בעמוד (CLS נשאר אפס).
   ============================================================ */

export default function OfficeMap() {
  const L = useLocalized()
  const s = useSettings()

  // אותה נפילה-לאחור כמו ב-Footer: מה שהוגדר באדמין גובר על site.js
  const address = s.contact_address ? { he: s.contact_address, en: s.contact_address } : site.contact.address
  const hours = s.contact_hours ? { he: s.contact_hours, en: s.contact_hours } : site.contact.hours
  const phone = s.contact_phone || site.contact.phone
  const office = site.contact.office || {}

  const addressText = L(address)
  // קישור הניווט הרשמי של Google Maps. במובייל הוא נפתח ישירות
  // באפליקציית המפות עם מסלול, ולא בעמוד אינטרנט.
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressText)}`

  const holderRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = holderRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() }
    }, { rootMargin: '320px' })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <div className="office-map">
      <div className="office-map__map" ref={holderRef}>
        {visible
          ? <PropertyMap
              variant="office"
              lat={office.lat}
              lng={office.lng}
              query={addressText}
              label={L(site.name)}
              sublabel={L({ he: 'הנגר 24, הוד השרון', en: '24 HaNagar St., Hod HaSharon' })}
              zoom={16}
            />
          : <span className="office-map__skeleton" aria-hidden="true" />}
      </div>

      <div className="office-map__info">
        <span className="office-map__eyebrow">{L({ he: 'איך מגיעים אלינו', en: 'Finding us' })}</span>
        <h3 className="office-map__title">
          {L({ he: 'המשרד שלנו בהוד השרון', en: 'Our office in Hod HaSharon' })}
        </h3>

        <ul className="office-map__facts">
          <li><Icon name="location" size={17} /> <span>{addressText}</span></li>
          <li><Icon name="clock" size={17} /> <span>{L(hours)}</span></li>
        </ul>

        <div className="office-map__actions">
          <a
            className="btn btn--primary btn--sm"
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('directions_click', { placement: 'contact_office_map' })}
          >
            {L({ he: 'נווטו אלינו', en: 'Get directions' })} <Icon name="arrow" size={16} />
          </a>
          <a
            className="btn btn--ghost btn--sm"
            href={`tel:${String(phone).replace(/[^+\d]/g, '')}`}
            onClick={() => track('phone_click', { placement: 'contact_office_map' })}
          >
            <Icon name="phone" size={16} /> {s.contact_phone || site.contact.phoneDisplay}
          </a>
        </div>
      </div>
    </div>
  )
}
