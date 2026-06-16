import { useState, useEffect } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import activities from '../../data/activities.js'
import ImageManager from './ImageManager.jsx'
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

  useEffect(() => {
    fetchSettings()
      .then((s) => setMap(parseMap(s.activity_images)))
      .catch(() => setMap({}))
  }, [])

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
          const url = map[a.id]
          return (
            <section className="acts-card" key={a.id}>
              <header className="acts-card__head">
                <h3 className="acts-card__title">{a.title.he}</h3>
                <span className="acts-card__short">{a.short?.he}</span>
              </header>

              <ImageManager
                value={url ? [url] : []}
                max={1}
                folder="activities"
                onChange={(arr) => save(a.id, arr[0] || null)}
              />

              {!url && (
                <small className="acts-card__hint">
                  כרגע מוצגת תמונת ברירת המחדל של התחום. העלו תמונה כדי להחליף.
                </small>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
