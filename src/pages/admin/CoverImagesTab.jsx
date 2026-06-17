import { useState, useEffect } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import { divisions } from '../../data/divisions.js'
import { srcOfResponsive } from '../../lib/responsiveImage.js'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import ImageManager from './ImageManager.jsx'
import { toast } from '../../lib/toast.js'
import './CoverImagesTab.css'

/* ============================================================
   CoverImagesTab — ניהול תמונות הקאבר/באנר בכל האתר ממקום אחד.
   תת-טאב לכל עמוד: באנרי החטיבות (תמונה בודדת לכל חטיבה) + גלריית הביצוע
   (ריבוי תמונות עם גרירה לסידור). נשמר ב-site_settings; האתר קורא override
   עם נפילה-לאחור לתמונות הקבועות. אותו דפוס אחסון כמו שאר ה-CMS.
   ============================================================ */

function parseObj(raw) {
  if (!raw) return {}
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return {} }
}
function parseArr(raw) {
  if (!raw) return []
  try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : [] } catch { return [] }
}

export default function CoverImagesTab() {
  const [divMap, setDivMap] = useState(null)   // { slug: imageValue }
  const [exGallery, setExGallery] = useState([])
  const [active, setActive] = useState(divisions[0]?.slug || 'execution-gallery')

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDivMap(parseObj(s.cover_divisions))
        setExGallery(parseArr(s.cover_execution_gallery))
      })
      .catch(() => { setDivMap({}); setExGallery([]) })
  }, [])

  const saveDiv = (slug, value) => {
    setDivMap((prev) => {
      const next = { ...(prev || {}) }
      if (value) next[slug] = value
      else delete next[slug]
      setSetting('cover_divisions', JSON.stringify(next))
        .then(() => toast.success('תמונת הבאנר נשמרה'))
        .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
      return next
    })
  }

  const saveEx = (arr) => {
    setExGallery(arr)
    setSetting('cover_execution_gallery', JSON.stringify(arr))
      .then(() => toast.success('הגלריה נשמרה'))
      .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
  }

  if (!divMap) {
    return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען…</div>
  }

  const tabs = [
    ...divisions.map((d) => ({ id: d.slug, label: d.menuTitle?.he || d.name?.he || d.slug, kind: 'division' })),
    { id: 'execution-gallery', label: 'גלריית ביצוע', kind: 'gallery' },
  ]
  const current = tabs.find((t) => t.id === active) || tabs[0]
  const activeDivision = divisions.find((d) => d.slug === current.id)

  return (
    <div className="cov">
      <p className="cov__intro">
        ניהול תמונות הקאבר/באנר בכל האתר. בחרו עמוד, והעלו/גררו/החליפו/הסירו תמונה — כל שינוי
        נשמר אוטומטית ומופיע באתר. ללא תמונה מותאמת — מוצגת תמונת ברירת המחדל.
      </p>

      <div className="cov__layout">
        <nav className="cov__tabs" aria-label="עמודים">
          {tabs.map((t) => {
            const set = t.kind === 'division' ? !!srcOfResponsive(divMap[t.id]) : exGallery.length > 0
            return (
              <button
                key={t.id}
                type="button"
                className={`cov__tab ${t.id === current.id ? 'is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span className="cov__tab-label">{t.label}</span>
                {set && <span className="cov__tab-dot" title="הוגדרה תמונה מותאמת" />}
              </button>
            )
          })}
        </nav>

        <div className="cov__content">
          {current.kind === 'division' ? (
            <>
              <div className="cov__content-head">
                <h2 className="cov__content-title">באנר — {current.label}</h2>
                <span className="cov__content-path">/divisions/{current.id}</span>
              </div>
              <ResponsiveImageField
                value={divMap[current.id]}
                folder="covers"
                surfaceLabel={`באנר ${current.label}`}
                desktopAspect="16 / 9"
                mobileAspect="4 / 5"
                onChange={(v) => saveDiv(current.id, v)}
              />
              {!srcOfResponsive(divMap[current.id]) && activeDivision && (
                <p className="cov__fallback">כרגע מוצגת תמונת ברירת המחדל של החטיבה. העלו תמונה כדי להחליף.</p>
              )}
            </>
          ) : (
            <>
              <div className="cov__content-head">
                <h2 className="cov__content-title">גלריית הביצוע</h2>
                <span className="cov__content-path">עמוד ביצוע · "הופכים תוכניות לביצוע"</span>
              </div>
              <ImageManager
                value={exGallery}
                onChange={saveEx}
                folder="execution-gallery"
                max={12}
              />
              {exGallery.length === 0 && (
                <p className="cov__fallback">כרגע מוצגות תמונות ברירת המחדל מהשטח. הוסיפו תמונות כדי להחליף את הגלריה.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
