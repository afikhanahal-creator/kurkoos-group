import { useState, useEffect } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import activities from '../../data/activities.js'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import { srcOfResponsive } from '../../lib/responsiveImage.js'
import { toast } from '../../lib/toast.js'
import './ActivitiesTab.css'

/* ============================================================
   ActivitiesTab — ניהול התמונות של "תחומי הפעילות" (תצוגת המובייל בעמוד הבית).
   לכל אחד מארבעת התחומים אפשר להעלות/לגרור תמונה, לערוך אותה (חיתוך/הזזה/כיוון
   דרך עורך התמונות) ולהסיר. התמונות נשמרות בהגדרה אחת (activity_images) כמיפוי
   id → כתובת. אם אין תמונה מותאמת — האתר נופל-לאחור לתמונת ברירת המחדל של התחום.
   ============================================================ */

// פענוח בטוח של ערך ההגדרה (יכול להיות אובייקט או מחרוזת JSON)
function parseMap(raw) {
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return {}
  }
}

export default function ActivitiesTab() {
  const [map, setMap] = useState(null) // null = טוען
  const [ba, setBa] = useState({}) // לפני/אחרי (עמוד יזמות): { before, after }

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setMap(parseMap(s.activity_images))
        setBa(parseMap(s.development_beforeafter))
      })
      .catch(() => { setMap({}); setBa({}) })
  }, [])

  const saveBa = (key, url) => {
    setBa((prev) => {
      const next = { ...(prev || {}) }
      if (url) next[key] = url
      else delete next[key]
      setSetting('development_beforeafter', JSON.stringify(next))
        .then(() => toast.success('התמונה נשמרה'))
        .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
      return next
    })
  }

  const save = async (id, url) => {
    setMap((prev) => {
      const next = { ...(prev || {}) }
      if (url) next[id] = url
      else delete next[id]
      // שמירה אסינכרונית מתוך ה-updater (ה-next המעודכן)
      setSetting('activity_images', JSON.stringify(next))
        .then(() => toast.success('התמונה נשמרה'))
        .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
      return next
    })
  }

  if (!map) {
    return (
      <div className="adm-msg adm-msg--loading">
        <span className="adm-spin" />טוען…
      </div>
    )
  }

  return (
    <div className="acts-tab">
      <p className="acts-tab__intro">
        ניהול התמונות של ארבעת תחומי הפעילות (תצוגת המובייל בעמוד הבית). אפשר לגרור/להעלות
        תמונה, לערוך אותה (חיתוך, הזזה וכיוון) או להסיר. ללא תמונה מותאמת — מוצגת תמונת
        ברירת המחדל של התחום.
      </p>

      <div className="acts-tab__grid">
        {activities.map((a) => {
          const val = map[a.id]
          return (
            <section className="acts-card" key={a.id}>
              <header className="acts-card__head">
                <h3 className="acts-card__title">{a.title.he}</h3>
                <span className="acts-card__short">{a.short?.he}</span>
              </header>

              <ResponsiveImageField
                value={val}
                folder="activities"
                breakpoints={['mobile']}
                surfaceLabel="כרטיס תחום הפעילות"
                mobileAspect="3 / 5"
                onChange={(v) => save(a.id, v)}
              />

              {!srcOfResponsive(val) && (
                <small className="acts-card__hint">
                  כרגע מוצגת תמונת ברירת המחדל של התחום. העלו תמונה כדי להחליף.
                </small>
              )}
            </section>
          )
        })}
      </div>

      {/* לפני/אחרי — עמוד יזמות */}
      <div className="acts-tab__section">
        <h2 className="acts-tab__section-title">לפני / אחרי — עמוד יזמות</h2>
        <p className="acts-tab__intro">
          סליידר השוואה שמופיע בעמוד היזמות מתחת לכרטיסיות. העלו תמונת "לפני" (למשל שרטוט)
          ותמונת "אחרי" (הבית הגמור). אפשר לערוך/לחתוך/להזיז כל תמונה. הסליידר יופיע באתר רק
          כששתי התמונות הוגדרו.
        </p>
        <div className="acts-tab__grid">
          <section className="acts-card">
            <header className="acts-card__head">
              <h3 className="acts-card__title">לפני (שרטוט)</h3>
            </header>
            <ResponsiveImageField
              value={ba.before}
              folder="beforeafter"
              surfaceLabel="סליידר לפני/אחרי"
              desktopAspect="16 / 9"
              mobileAspect="4 / 3"
              onChange={(v) => saveBa('before', v)}
            />
          </section>
          <section className="acts-card">
            <header className="acts-card__head">
              <h3 className="acts-card__title">אחרי (בית גמור)</h3>
            </header>
            <ResponsiveImageField
              value={ba.after}
              folder="beforeafter"
              surfaceLabel="סליידר לפני/אחרי"
              desktopAspect="16 / 9"
              mobileAspect="4 / 3"
              onChange={(v) => saveBa('after', v)}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
