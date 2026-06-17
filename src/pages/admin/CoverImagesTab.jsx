import { useState, useEffect, useRef } from 'react'
import { fetchSettings, setSetting, listProjectCards, cmsRowToCard, uploadMedia } from '../../lib/cms.js'
import { divisions } from '../../data/divisions.js'
import projectsLocal from '../../data/projects.js'
import { executionGallery } from '../../data/executionGallery.js'
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

// חטיבות אמיתיות בלבד — "מגורים" (residential) הוסר כי העמוד לא קיים
const DIVISIONS = divisions.filter((d) => d.slug !== 'residential')

// לוגואים קבועים לעמודי הקאבר (חייב להישאר זהה ל-Division.jsx)
const DEFAULT_DIVISION_LOGOS = {
  execution: '/divisions/raita-logo.png',
  brokerage: '/afik-hanahal-logo.png',
  development: '/divisions/development-logo.png',
}

/* שדה לוגו לעמוד קאבר — העלאה / החלפה / הסרה. כל הלוגואים מוצגים באתר
   באותו מיקום ובאותו גודל (.division-hero__logo). תצוגה על רקע כהה כמו הקאבר. */
function LogoField({ value, defaultSrc, onChange }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  // value: url=מותאם · ''=הוסר (יוצג אייקון) · undefined=ברירת מחדל
  const shown = value !== undefined ? value : (defaultSrc || '')
  const handle = async (file) => {
    if (!file) return
    setBusy(true)
    try { const url = await uploadMedia(file, 'cover-logos'); onChange(url); toast.success('הלוגו נשמר') }
    catch (e) { toast.error('שגיאה בהעלאה: ' + (e.message || e)) }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }
  return (
    <div className="cov-logo">
      <div className="cov-logo__head">
        <h3 className="cov-logo__title">לוגו הקאבר</h3>
        <span className="cov-logo__note">מוצג באתר באותו מיקום ובאותו גודל בכל העמודים</span>
      </div>
      <div className="cov-logo__row">
        <div className="cov-logo__preview">
          {shown
            ? <img src={shown} alt="" />
            : <span className="cov-logo__empty">ללא לוגו — יוצג אייקון התחום</span>}
        </div>
        <div className="cov-logo__actions">
          <button type="button" className="rif__act rif__act--primary" disabled={busy} onClick={() => inputRef.current?.click()}>
            <span className="rif__act-ic" aria-hidden="true">⤒</span>
            {busy ? 'מעלה…' : (shown ? 'החלפת לוגו' : 'העלאת לוגו')}
          </button>
          {shown && (
            <button type="button" className="rif__act rif__act--danger" disabled={busy} onClick={() => onChange('')}>
              <span className="rif__act-ic" aria-hidden="true">🗑</span> הסרה
            </button>
          )}
          {value !== undefined && defaultSrc && (
            <button type="button" className="rif__act" disabled={busy} onClick={() => onChange(undefined)}>
              שחזור לברירת המחדל
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files?.[0])} />
        </div>
      </div>
    </div>
  )
}

const projName = (p) => (p?.name?.he || p?.name?.en || (typeof p?.name === 'string' ? p.name : '') || p?.slug || 'פרויקט')

export default function CoverImagesTab() {
  const [divMap, setDivMap] = useState(null)   // { slug: imageValue }
  const [divLogos, setDivLogos] = useState({}) // { slug: logoUrl | '' } — לוגו הקאבר לכל עמוד
  const [exGallery, setExGallery] = useState([])
  const [projMap, setProjMap] = useState({})   // { slug: imageValue } — קאבר לכל פרויקט
  const [projects, setProjects] = useState([]) // רשימת הפרויקטים (CMS + מקומיים)
  const [active, setActive] = useState(DIVISIONS[0]?.slug || 'execution-gallery')

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDivMap(parseObj(s.cover_divisions))
        setDivLogos(parseObj(s.cover_division_logos))
        setExGallery(parseArr(s.cover_execution_gallery))
        setProjMap(parseObj(s.cover_projects))
      })
      .catch(() => { setDivMap({}); setDivLogos({}); setExGallery([]); setProjMap({}) })
    // פרויקטים: CMS מפורסמים; נפילה-לאחור למקומיים
    listProjectCards()
      .then((rows) => {
        const list = (rows && rows.length) ? rows.map(cmsRowToCard) : projectsLocal
        // ייחוד לפי slug
        const seen = new Set()
        setProjects(list.filter((p) => { const k = p.slug; if (!k || seen.has(k)) return false; seen.add(k); return true }))
      })
      .catch(() => setProjects(projectsLocal))
  }, [])

  const saveProj = (slug, value) => {
    setProjMap((prev) => {
      const next = { ...(prev || {}) }
      if (value) next[slug] = value
      else delete next[slug]
      setSetting('cover_projects', JSON.stringify(next))
        .then(() => toast.success('תמונת הקאבר נשמרה'))
        .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
      return next
    })
  }

  // שמירת לוגו הקאבר: url=מותאם · ''=הוסר · undefined=שחזור לברירת המחדל (מוחק מהמפה)
  const saveDivLogo = (slug, value) => {
    setDivLogos((prev) => {
      const next = { ...(prev || {}) }
      if (value === undefined) delete next[slug]
      else next[slug] = value
      setSetting('cover_division_logos', JSON.stringify(next))
        .then(() => toast.success(value === undefined ? 'הוחזר לברירת המחדל' : (value ? 'הלוגו נשמר' : 'הלוגו הוסר')))
        .catch((e) => toast.error('שמירה נכשלה: ' + (e.message || e)))
      return next
    })
  }

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
    ...DIVISIONS.map((d) => ({ id: d.slug, label: d.menuTitle?.he || d.name?.he || d.slug, kind: 'division', group: 'חטיבות' })),
    { id: 'execution-gallery', label: 'גלריית ביצוע', kind: 'gallery', group: 'גלריות' },
    ...projects.map((p) => ({ id: `proj:${p.slug}`, label: projName(p), kind: 'project', slug: p.slug, group: 'פרויקטים' })),
  ]
  const current = tabs.find((t) => t.id === active) || tabs[0]
  const activeDivision = DIVISIONS.find((d) => d.slug === current.id)
  const activeProject = current.kind === 'project' ? projects.find((p) => p.slug === current.slug) : null

  // ערך אפקטיבי: override שנשמר במערכת, ואם אין — התמונה הקיימת באתר (ברירת המחדל),
  // כדי שהתמונות הקיימות יופיעו כ"קיימות" וניתן יהיה לערוך/להחליף אותן ישירות.
  const divValue = divMap[current.id] || activeDivision?.hero?.image || ''
  const projValue = projMap[current.slug] || activeProject?.cover || ''
  const exValue = exGallery.length ? exGallery : executionGallery

  return (
    <div className="cov">
      <p className="cov__intro">
        ניהול תמונות הקאבר/באנר בכל האתר. בחרו עמוד, והעלו/גררו/החליפו/הסירו תמונה — כל שינוי
        נשמר אוטומטית ומופיע באתר. ללא תמונה מותאמת — מוצגת תמונת ברירת המחדל.
      </p>

      <div className="cov__layout">
        <nav className="cov__tabs" aria-label="עמודים">
          {tabs.map((t, i) => {
            const set = t.kind === 'project'
              ? !!srcOfResponsive(projMap[t.slug])
              : t.kind === 'division'
                ? !!srcOfResponsive(divMap[t.id])
                : exGallery.length > 0
            const showGroup = i === 0 || tabs[i - 1].group !== t.group
            return (
              <div key={t.id} className="cov__tab-wrap">
                {showGroup && <span className="cov__tab-group">{t.group}</span>}
                <button
                  type="button"
                  className={`cov__tab ${t.id === current.id ? 'is-active' : ''}`}
                  onClick={() => setActive(t.id)}
                >
                  <span className="cov__tab-label">{t.label}</span>
                  {set && <span className="cov__tab-dot" title="הוגדרה תמונה מותאמת" />}
                </button>
              </div>
            )
          })}
        </nav>

        <div className="cov__content">
          {current.kind === 'project' ? (
            <>
              <div className="cov__content-head">
                <h2 className="cov__content-title">קאבר — {current.label}</h2>
                <span className="cov__content-path">/projects/{current.slug}</span>
              </div>
              <ResponsiveImageField
                value={projValue}
                folder="covers"
                surfaceLabel={`קאבר ${current.label}`}
                desktopAspect="4 / 3"
                mobileAspect="4 / 5"
                onChange={(v) => saveProj(current.slug, v)}
              />
              {!srcOfResponsive(projMap[current.slug]) && (
                <p className="cov__fallback">מוצגת כעת תמונת השער הקיימת של הפרויקט. ערכו/החליפו אותה — וההגדרה תישמר לאתר.</p>
              )}
            </>
          ) : current.kind === 'division' ? (
            <>
              <div className="cov__content-head">
                <h2 className="cov__content-title">באנר — {current.label}</h2>
                <span className="cov__content-path">/divisions/{current.id}</span>
              </div>
              <LogoField
                value={divLogos[current.id]}
                defaultSrc={DEFAULT_DIVISION_LOGOS[current.id]}
                onChange={(v) => saveDivLogo(current.id, v)}
              />
              <ResponsiveImageField
                value={divValue}
                folder="covers"
                surfaceLabel={`באנר ${current.label}`}
                desktopAspect="16 / 9"
                mobileAspect="4 / 5"
                onChange={(v) => saveDiv(current.id, v)}
              />
              {!srcOfResponsive(divMap[current.id]) && activeDivision && (
                <p className="cov__fallback">מוצגת כעת תמונת הבאנר הקיימת של החטיבה. ערכו/החליפו אותה — וההגדרה תישמר לאתר.</p>
              )}
            </>
          ) : (
            <>
              <div className="cov__content-head">
                <h2 className="cov__content-title">גלריית הביצוע</h2>
                <span className="cov__content-path">עמוד ביצוע · "הופכים תוכניות לביצוע"</span>
              </div>
              <ImageManager
                value={exValue}
                onChange={saveEx}
                folder="execution-gallery"
                max={12}
              />
              {exGallery.length === 0 && (
                <p className="cov__fallback">מוצגות כעת תמונות הגלריה הקיימות מהשטח. גררו לסידור, הוסיפו או הסירו — והשינוי יישמר לאתר.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
