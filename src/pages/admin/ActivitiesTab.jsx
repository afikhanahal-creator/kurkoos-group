import { useState, useEffect } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import activities from '../../data/activities.js'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import { srcOfResponsive, pickResponsive } from '../../lib/responsiveImage.js'
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

  // שמירת תמונת מקור לפי מכשיר — דסקטופ ומובייל נשמרים בנפרד לחלוטין.
  // המבנה במסד: activity_images[id] = { desktop, mobile }. ערך ישן (יחיד) מהגר
  // אוטומטית — הוא משמש כברירת מחדל לשני המכשירים עד שמחליפים אחד מהם.
  const saveBp = (id, bp, val) => {
    setMap((prev) => {
      const cur = (prev || {})[id]
      const entry = {
        desktop: pickResponsive(cur, 'desktop'),
        mobile: pickResponsive(cur, 'mobile'),
      }
      entry[bp] = val || null
      const next = { ...(prev || {}) }
      if (!entry.desktop && !entry.mobile) delete next[id]
      else next[id] = entry
      setSetting('activity_images', JSON.stringify(next))
        .then(() => toast.success(bp === 'mobile' ? 'תמונת המובייל נשמרה' : 'תמונת הדסקטופ נשמרה'))
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
        ניהול התמונות של ארבעת תחומי הפעילות בעמוד הבית. לכל תחום יש שתי תמונות
        <strong> נפרדות לחלוטין</strong>: אחת ל-🖥️ <strong>דסקטופ</strong> (ארבע הכרטיסיות) ואחת
        ל-📱 <strong>מובייל</strong> (תפריט התחומים). כל כפתור מעלה/מחליף/עורך את התמונה שלו בלבד —
        עריכה באחד לא משפיעה על השני. ללא תמונה מותאמת — מוצגת תמונת ברירת המחדל של התחום.
      </p>

      <div className="acts-tab__grid">
        {activities.map((a) => {
          const deskVal = pickResponsive(map[a.id], 'desktop')
          const mobVal = pickResponsive(map[a.id], 'mobile')
          return (
            <section className="acts-card acts-card--split" key={a.id}>
              <header className="acts-card__head">
                <h3 className="acts-card__title">{a.title.he}</h3>
                <span className="acts-card__short">{a.short?.he}</span>
              </header>

              <div className="acts-card__device">
                <span className="acts-card__device-label">🖥️ תמונת דסקטופ <small>(ארבע הכרטיסיות)</small></span>
                <ResponsiveImageField
                  value={deskVal}
                  folder="activities"
                  breakpoints={['desktop']}
                  surfaceLabel="כרטיס תחום הפעילות"
                  desktopAspect="16 / 10"
                  onChange={(v) => saveBp(a.id, 'desktop', v)}
                />
                {!srcOfResponsive(deskVal) && (
                  <small className="acts-card__hint">ללא תמונת דסקטופ — מוצגת ברירת המחדל של התחום.</small>
                )}
              </div>

              <div className="acts-card__device">
                <span className="acts-card__device-label">📱 תמונת מובייל <small>(תפריט התחומים)</small></span>
                <ResponsiveImageField
                  value={mobVal}
                  folder="activities"
                  breakpoints={['mobile']}
                  surfaceLabel="כרטיס תחום הפעילות"
                  chrome="split"
                  chromeLabel={a.title.he}
                  mobileAspect="3 / 5"
                  onChange={(v) => saveBp(a.id, 'mobile', v)}
                />
                {!srcOfResponsive(mobVal) && (
                  <small className="acts-card__hint">ללא תמונת מובייל — מוצגת ברירת המחדל של התחום.</small>
                )}
              </div>
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
