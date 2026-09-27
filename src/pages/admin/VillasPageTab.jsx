import { useState, useEffect, useRef } from 'react'
import { fetchSettings, setSetting, listProjectCards, cmsRowToCard, getProjectBySlug } from '../../lib/cms.js'
import { srcOfResponsive, optimizeSrc } from '../../lib/responsiveImage.js'
import { VILLAS_PROJECTS, parseVillasSettings } from '../../data/villasPage.js'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import ImageManager from './ImageManager.jsx'
import { toast } from '../../lib/toast.js'
import './CoverImagesTab.css'
import './VillasPageTab.css'

/* ============================================================
   VillasPageTab — עריכת עמוד "בניית וילות ובתים פרטיים" (/villas-sharon).
   בוחרים את תמונת הכותרת, ולכל פרויקט בעמוד: ההדמיה הגדולה, עד ארבע תמונות
   קטנות, הפרויקט המקושר במערכת (שממנו נמשכות התמונות כשלא נבחרו כאן),
   הסדר וההסתרה. הכול נשמר בהגדרה אחת (villas_page), והעמוד קורא אותה.
   ============================================================ */

const nameOf = (p) => (typeof p?.name === 'string' ? p.name : (p?.name?.he || p?.name?.en || p?.slug || ''))
const MAX_THUMBS = 4

export default function VillasPageTab() {
  const [data, setData] = useState(null)      // { header, order, projects }
  const [cards, setCards] = useState([])      // הפרויקטים במערכת, לבחירת קישור ולתצוגת ברירת המחדל
  const [active, setActive] = useState('header')
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    Promise.all([fetchSettings(), listProjectCards().catch(() => [])])
      .then(([s, rows]) => {
        const parsed = parseVillasSettings(s.villas_page)
        ref.current = parsed
        setData(parsed)
        setCards((rows || []).map(cmsRowToCard))
      })
      .catch(() => { const p = parseVillasSettings(null); ref.current = p; setData(p) })
  }, [])

  const persist = async (next, msg = 'נשמר, העמוד באתר יתעדכן') => {
    ref.current = next
    setData(next)
    setSaving(true)
    try {
      await setSetting('villas_page', JSON.stringify(next))
      toast.success(msg)
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  const patchProject = (slug, patch, msg) => {
    const cur = ref.current
    const prev = cur.projects[slug] || {}
    persist({ ...cur, projects: { ...cur.projects, [slug]: { ...prev, ...patch } } }, msg)
  }

  const move = (slug, dir) => {
    const order = [...ref.current.order]
    const i = order.indexOf(slug)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    persist({ ...ref.current, order }, 'הסדר נשמר')
  }

  if (!data) {
    return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען…</div>
  }

  const bySlug = new Map(cards.map((c) => [c.slug, c]))
  // אותה התאמה אוטומטית כמו בעמוד: קודם slug זהה, אחרת לפי שם
  const NAME_KEYS = { 'yordei-hayam': ['יורדי הים'], 'henrietta-szold': ['הנרייטה', 'סאלד'], 'hankin-41': ['חנקין'] }
  const autoCard = (slug) => bySlug.get(slug) || cards.find((c) => (NAME_KEYS[slug] || []).some((k) => nameOf(c).includes(k))) || null
  const linkedCard = (slug) => {
    const manual = data.projects[slug]?.cms
    return (manual && bySlug.get(manual)) || autoCard(slug)
  }

  const ordered = data.order.map((s) => VILLAS_PROJECTS.find((p) => p.slug === s)).filter(Boolean)
  const current = ordered.find((p) => p.slug === active) || null
  const firstShown = ordered.find((p) => !data.projects[p.slug]?.hidden)
  const defaultHeader = firstShown
    ? (srcOfResponsive(data.projects[firstShown.slug]?.hero) || linkedCard(firstShown.slug)?.cover || '')
    : ''

  return (
    <div className="vpt">
      <div className="vpt__bar">
        <p className="cov__intro">
          כאן עורכים את התמונות של עמוד הווילות: תמונת הכותרת, ולכל פרויקט את ההדמיה הגדולה
          ועד {MAX_THUMBS} תמונות קטנות. כשלא נבחרה תמונה, העמוד מושך אותה אוטומטית מעמוד הפרויקט
          במערכת. אפשר גם לשנות את סדר הפרויקטים ולהסתיר פרויקט מהעמוד.
        </p>
        <a className="vpt__open" href="/villas-sharon" target="_blank" rel="noopener noreferrer">פתיחת העמוד באתר ↗</a>
      </div>

      <div className="cov__layout">
        <nav className="cov__tabs" aria-label="חלקי העמוד">
          <span className="cov__tab-group">כותרת</span>
          <button type="button" className={`cov__tab ${active === 'header' ? 'is-active' : ''}`} onClick={() => setActive('header')}>
            <span className="cov__tab-label">תמונת הכותרת</span>
            {srcOfResponsive(data.header) && <span className="cov__tab-dot" title="נבחרה תמונה" />}
          </button>

          <span className="cov__tab-group">הפרויקטים, לפי סדר ההצגה</span>
          {ordered.map((p, i) => {
            const ov = data.projects[p.slug] || {}
            const set = srcOfResponsive(ov.hero) || (Array.isArray(ov.thumbs) && ov.thumbs.length) || ov.cms
            return (
              <div key={p.slug} className={`vpt__proj ${ov.hidden ? 'is-hidden' : ''}`}>
                <button type="button" className={`cov__tab ${active === p.slug ? 'is-active' : ''}`} onClick={() => setActive(p.slug)}>
                  <span className="vpt__num">{i + 1}</span>
                  <span className="cov__tab-label">{p.name}</span>
                  {ov.hidden ? <span className="vpt__hidden-tag">מוסתר</span> : (set ? <span className="cov__tab-dot" title="נבחרו תמונות" /> : null)}
                </button>
                <span className="vpt__ord">
                  <button type="button" onClick={() => move(p.slug, -1)} disabled={i === 0 || saving} aria-label="הקדמה" title="הקדמה">↑</button>
                  <button type="button" onClick={() => move(p.slug, 1)} disabled={i === ordered.length - 1 || saving} aria-label="אחור" title="אחור">↓</button>
                </span>
              </div>
            )
          })}
        </nav>

        <div className="cov__content">
          {active === 'header' || !current ? (
            <>
              <div className="cov__content-head">
                <h2 className="cov__content-title">תמונת הכותרת של העמוד</h2>
                <span className="cov__content-path">/villas-sharon</span>
              </div>
              <ResponsiveImageField
                value={data.header || defaultHeader}
                folder="villas"
                surfaceLabel="כותרת עמוד הווילות"
                desktopAspect="21 / 9"
                mobileAspect="4 / 5"
                onChange={(v) => persist({ ...data, header: v || '' }, v ? 'תמונת הכותרת נשמרה' : 'חזרה לתמונה האוטומטית')}
              />
              {!srcOfResponsive(data.header) && (
                <p className="cov__fallback">
                  {defaultHeader
                    ? 'מוצגת כעת ההדמיה של הפרויקט הראשון בעמוד. החליפו אותה כדי לקבוע תמונת כותרת קבועה.'
                    : 'אין עדיין תמונה. העלו תמונה, או הגדירו הדמיה לאחד הפרויקטים.'}
                </p>
              )}
            </>
          ) : (
            <ProjectEditor
              key={current.slug}
              project={current}
              ov={data.projects[current.slug] || {}}
              cards={cards}
              linked={linkedCard(current.slug)}
              auto={autoCard(current.slug)}
              saving={saving}
              onPatch={(patch, msg) => patchProject(current.slug, patch, msg)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* אותו חישוב כמו בעמוד: ההדמיה קודם מהבחירה כאן, אחרת מהפרויקט המקושר;
   התמונות הקטנות קודם מהבחירה כאן, אחרת מגלריית הפרויקט, בלי ההדמיה, עד ארבע. */
function effectiveMedia(ov, linked, gallery) {
  const hero = srcOfResponsive(ov.hero) || linked?.cover || ''
  const own = (Array.isArray(ov.thumbs) ? ov.thumbs : []).map(srcOfResponsive).filter(Boolean)
  const auto = (gallery || []).map(srcOfResponsive).filter(Boolean)
  const thumbs = (own.length ? own : auto).filter((u) => u !== hero).slice(0, MAX_THUMBS)
  return { hero, thumbs, isOwn: own.length > 0, auto: auto.filter((u) => u !== hero).slice(0, MAX_THUMBS) }
}

function ProjectEditor({ project, ov, cards, linked, auto, saving, onPatch }) {
  const [gallery, setGallery] = useState(null)   // null = טוען, [] = אין גלריה
  const linkedSlug = linked?.slug || ''

  // גלריית הפרויקט המקושר, כדי להראות בדיוק מה העמוד מציג כשלא נבחר כאן כלום
  useEffect(() => {
    let on = true
    if (!linkedSlug) { setGallery([]); return undefined }
    setGallery(null)
    getProjectBySlug(linkedSlug)
      .then((row) => { if (on) setGallery(Array.isArray(row?.gallery) ? row.gallery : []) })
      .catch(() => { if (on) setGallery([]) })
    return () => { on = false }
  }, [linkedSlug])

  const eff = effectiveMedia(ov, linked, gallery || [])
  const heroDefault = linked?.cover || ''

  return (
    <>
      <div className="cov__content-head">
        <h2 className="cov__content-title">{project.name}</h2>
        <span className="cov__content-path">{project.kind} · {project.status}</span>
        <label className="vpt__toggle">
          <input
            type="checkbox"
            checked={!ov.hidden}
            disabled={saving}
            onChange={(e) => onPatch({ hidden: !e.target.checked }, e.target.checked ? 'הפרויקט מוצג בעמוד' : 'הפרויקט הוסתר מהעמוד')}
          />
          <span>מוצג בעמוד</span>
        </label>
      </div>

      {/* מה שהעמוד מציג עכשיו, בדיוק באותו סידור: הדמיה ומתחתיה עד ארבע תמונות */}
      <div className="vpt__preview">
        <div className="vpt__preview-head">
          <h3 className="vpt__h">כך זה מוצג בעמוד עכשיו</h3>
          <span className="vpt__preview-src">
            {eff.hero ? (srcOfResponsive(ov.hero) ? 'הדמיה שנבחרה כאן' : 'הדמיה מעמוד הפרויקט') : 'אין הדמיה'}
            {' · '}
            {gallery === null ? 'טוען תמונות…' : `${eff.thumbs.length} תמונות קטנות ${eff.isOwn ? 'שנבחרו כאן' : 'מגלריית הפרויקט'}`}
          </span>
        </div>
        <div className="vpt__mock">
          <div className="vpt__mock-hero">
            {eff.hero ? <img src={optimizeSrc(eff.hero, 900)} alt="" /> : <span className="vpt__mock-empty">אין הדמיה</span>}
          </div>
          <div className="vpt__mock-thumbs">
            {Array.from({ length: MAX_THUMBS }).map((_, i) => {
              const u = eff.thumbs[i]
              return (
                <div key={i} className={`vpt__mock-thumb ${u ? '' : 'is-empty'}`}>
                  {u ? <img src={optimizeSrc(u, 400)} alt="" /> : <span>{i + 1}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="vpt__link">
        <label className="adm-set__field">
          <span>הפרויקט המקושר במערכת</span>
          <select
            value={ov.cms || ''}
            disabled={saving}
            onChange={(e) => onPatch({ cms: e.target.value }, 'הקישור נשמר')}
          >
            <option value="">אוטומטי{auto ? ` (${nameOf(auto)})` : ' (לא נמצא פרויקט מתאים)'}</option>
            {cards.map((c) => <option key={c.slug} value={c.slug}>{nameOf(c)}</option>)}
          </select>
        </label>
        <p className="cov__fallback">
          ממנו נמשכות ההדמיה והתמונות כשלא נבחרו כאן, ואליו מוביל הכפתור "לעמוד הפרויקט".
          {linked ? '' : ' כרגע אין פרויקט מקושר, ולכן בלי תמונות שנבחרו כאן לא יוצגו תמונות.'}
        </p>
      </div>

      <h3 className="vpt__h">ההדמיה הגדולה</h3>
      <ResponsiveImageField
        value={ov.hero || heroDefault}
        folder="villas"
        surfaceLabel={`הדמיה, ${project.name}`}
        desktopAspect="16 / 9"
        mobileAspect="4 / 3"
        onChange={(v) => onPatch({ hero: v || '' }, v ? 'ההדמיה נשמרה' : 'חזרה להדמיה מעמוד הפרויקט')}
      />
      {!srcOfResponsive(ov.hero) && (
        <p className="cov__fallback">
          {heroDefault ? 'מוצגת כעת תמונת השער של הפרויקט המקושר. החליפו אותה כדי לקבוע הדמיה לעמוד הזה בלבד.' : 'אין הדמיה. העלו תמונה או קשרו פרויקט.'}
        </p>
      )}

      <div className="vpt__thumbs-head">
        <h3 className="vpt__h">התמונות הקטנות מתחת להדמיה <small>עד {MAX_THUMBS}</small></h3>
        {eff.isOwn && (
          <button type="button" className="vpt__reset" disabled={saving} onClick={() => onPatch({ thumbs: [] }, 'חזרה לתמונות מגלריית הפרויקט')}>
            חזרה לאוטומטי (מגלריית הפרויקט)
          </button>
        )}
      </div>
      {gallery === null ? (
        <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען את תמונות הפרויקט…</div>
      ) : (
        <ImageManager
          value={eff.isOwn ? (Array.isArray(ov.thumbs) ? ov.thumbs : []) : eff.auto}
          onChange={(arr) => onPatch({ thumbs: arr }, 'התמונות הקטנות נשמרו')}
          folder="villas"
          max={MAX_THUMBS}
          allowRoundCorners={false}
        />
      )}
      <p className="cov__fallback">
        {eff.isOwn
          ? 'אלה התמונות שנבחרו לעמוד הזה. גררו לסידור, הסירו או הוסיפו.'
          : (eff.auto.length
            ? 'אלה התמונות שהעמוד מציג עכשיו, מגלריית הפרויקט המקושר. כל שינוי כאן (סידור, הסרה, הוספה) נשמר כבחירה לעמוד הזה בלבד, בלי לגעת בפרויקט עצמו.'
            : 'לפרויקט המקושר אין תמונות בגלריה, ולכן העמוד לא מציג תמונות קטנות. הוסיפו כאן תמונות כדי שיופיעו.')}
      </p>
    </>
  )
}
