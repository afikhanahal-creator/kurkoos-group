import { useRef, useState, useEffect } from 'react'
import { uploadMedia, deleteMedia } from '../../lib/cms.js'
import { toast } from '../../lib/toast.js'
import ImageEditor from './ImageEditor.jsx'
import { normalizeResponsiveImage, posFromFocal, DEFAULT_VIEW } from '../../lib/responsiveImage.js'
import './ResponsiveImageField.css'

/* ============================================================
   ResponsiveImageField — שדה תמונה אחיד ל-CMS עם אומנות-כיוון רספונסיבית:
   • העלאה / החלפה / חיתוך (ImageEditor) / הסרה.
   • מעבר תצוגה מובייל ⇄ דסקטופ (מסגרת תצוגה מדויקת).
   • לכל breakpoint: נקודת מיקוד נגררת (focal), object-fit, יחס תצוגה.
   • שמירה עצמאית לכל breakpoint (עריכת אחד לא דורסת את השני).
   • העתקת הגדרות בין דסקטופ למובייל (פעולה מפורשת).
   ערך: מחרוזת (legacy) או { src, alt, views: { mobile, desktop } }.
   ============================================================ */
const FITS = [
  { id: 'cover', label: 'מילוי (cover)' },
  { id: 'contain', label: 'התאמה (contain)' },
]
const ORIENTS = [
  { id: '4 / 3', label: 'לרוחב' },
  { id: '3 / 4', label: 'לאורך' },
  { id: '1 / 1', label: 'ריבוע' },
  { id: '16 / 9', label: 'רחב' },
]

export default function ResponsiveImageField({
  value,
  onChange,
  folder = 'general',
  label,
  desktopAspect = '16 / 9',
  mobileAspect = '4 / 5',
  breakpoints = ['desktop', 'mobile'],
  surfaceLabel = '',
  chrome = 'card',
  chromeLabel = '',
  allowOrientation = false,
}) {
  const base = normalizeResponsiveImage(value)
  const inputRef = useRef(null)
  const frameRef = useRef(null)
  const [bp, setBp] = useState(breakpoints[0] || 'desktop')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [draft, setDraft] = useState(base)

  // סנכרון ה-draft כשמקור התמונה משתנה (העלאה/חיתוך/הסרה התחייבו מיד)
  const baseSrc = base ? base.src : ''
  useEffect(() => { setDraft(normalizeResponsiveImage(value)) }, [baseSrc])

  const view = draft ? draft.views[bp] : DEFAULT_VIEW
  const aspect = view.aspectRatio || (bp === 'mobile' ? mobileAspect : desktopAspect)

  const baseView = base ? base.views[bp] : DEFAULT_VIEW
  const dirty = draft && JSON.stringify(view) !== JSON.stringify(baseView)

  const setView = (patch) => {
    setDraft((d) => {
      if (!d) return d
      const v = { ...d.views[bp], ...patch }
      if (patch.focalPoint) v.objectPosition = posFromFocal({ ...d.views[bp].focalPoint, ...patch.focalPoint })
      return { ...d, views: { ...d.views, [bp]: v } }
    })
  }

  const commit = (next) => { onChange(next); setDraft(next) }

  const handleUpload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadMedia(file, folder)
      const next = draft
        ? { ...draft, src: url }
        : { src: url, alt: '', views: { mobile: { ...DEFAULT_VIEW }, desktop: { ...DEFAULT_VIEW } } }
      commit(next)
      toast.success('התמונה הועלתה')
    } catch (e) { toast.error('שגיאה בהעלאה: ' + (e.message || e)) }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }

  const handleRemove = () => {
    if (draft?.src) deleteMedia(draft.src).catch(() => {})
    commit(null)
  }

  const applyCrop = async (blob) => {
    setBusy(true)
    try {
      const file = new File([blob], `img-${Date.now()}.webp`, { type: blob.type || 'image/webp' })
      const url = await uploadMedia(file, folder)
      const old = draft?.src
      // העריכה המתקדמת כבר "צרובה" בתמונה (חיתוך/זום/סיבוב/פינות/פילטרים),
      // לכן מאפסים את התצוגות לניטרלי — כך האתר מציג בדיוק את מה שהוגדר בעורך,
      // בלי להחיל שוב זום/מיקוד/פינות מעל התוצאה.
      const next = {
        src: url,
        alt: draft?.alt || '',
        views: { mobile: { ...DEFAULT_VIEW }, desktop: { ...DEFAULT_VIEW } },
      }
      commit(next)
      if (old) deleteMedia(old).catch(() => {})
      setEditing(false)
      toast.success('העריכה נשמרה')
    } catch (e) { toast.error('שגיאה בעריכה: ' + (e.message || e)) }
    finally { setBusy(false) }
  }

  // גרירת נקודת המיקוד
  const moveFocal = (e) => {
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setView({ focalPoint: { x, y } })
  }
  const onPointerDown = (e) => {
    if (view.objectFit !== 'cover') return // נקודת מיקוד רלוונטית ל-cover
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    moveFocal(e)
  }
  const onPointerMove = (e) => { if (dragging) moveFocal(e) }
  const onPointerUp = () => setDragging(false)

  const saveBp = () => {
    if (!draft) return
    onChange(draft) // האובייקט כולל את שני ה-breakpoints; שונה רק ה-bp הפעיל → עצמאי
    toast.success(bp === 'mobile' ? 'תצוגת המובייל נשמרה' : 'תצוגת הדסקטופ נשמרה')
  }
  const copyToOther = () => {
    if (!draft) return
    const other = bp === 'mobile' ? 'desktop' : 'mobile'
    const next = { ...draft, views: { ...draft.views, [other]: { ...draft.views[bp] } } }
    commit(next)
    toast.success(other === 'mobile' ? 'הועתק לתצוגת המובייל' : 'הועתק לתצוגת הדסקטופ')
  }

  return (
    <div className="rif">
      {label && <div className="rif__label">{label}</div>}

      {/* פעולות קובץ — סרגל עליון נקי */}
      <div className="rif__toolbar">
        <button type="button" className="rif__act rif__act--primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          <span className="rif__act-ic" aria-hidden="true">⤒</span>
          {busy ? 'מעלה…' : draft ? 'החלפת תמונה' : 'העלאת תמונה'}
        </button>
        {draft && (
          <>
            <button type="button" className="rif__act" disabled={busy} onClick={() => setEditing(true)}>
              <span className="rif__act-ic" aria-hidden="true">✎</span> עריכה מתקדמת
            </button>
            <button type="button" className="rif__act rif__act--danger" disabled={busy} onClick={handleRemove}>
              <span className="rif__act-ic" aria-hidden="true">🗑</span> הסרה
            </button>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleUpload(e.target.files?.[0])} />
      </div>

      {!draft && (
        <button type="button" className="rif__dropzone" disabled={busy} onClick={() => inputRef.current?.click()}>
          <span className="rif__dropzone-ic" aria-hidden="true">＋</span>
          <strong>העלאת תמונה</strong>
          <small>ללא תמונה — מוצגת ברירת המחדל של האתר</small>
        </button>
      )}

      {draft && (
        <>
          {/* מתג מובייל / דסקטופ — רק לפי ה-breakpoints שבהם התמונה באמת מוצגת */}
          {breakpoints.length > 1 && (
            <div className="rif__bptabs" role="tablist">
              {breakpoints.includes('desktop') && (
                <button type="button" role="tab" aria-selected={bp === 'desktop'} className={`rif__bptab ${bp === 'desktop' ? 'is-active' : ''}`} onClick={() => setBp('desktop')}>🖥️ דסקטופ</button>
              )}
              {breakpoints.includes('mobile') && (
                <button type="button" role="tab" aria-selected={bp === 'mobile'} className={`rif__bptab ${bp === 'mobile' ? 'is-active' : ''}`} onClick={() => setBp('mobile')}>📱 מובייל</button>
              )}
            </div>
          )}

          {/* תצוגה מקדימה חיה — בדיוק כמו הכרטיסייה/הרכיב באתר */}
          <div className="rif__preview">
            {(() => {
              const imgEl = (
                <div
                  ref={frameRef}
                  className="rif__imgarea"
                  style={{ borderRadius: `${view.radius || 0}px` }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <img
                    className="rif__img"
                    src={draft.src}
                    alt=""
                    draggable="false"
                    style={{
                      /* בזום-אאוט (מתחת ל-100%) מציגים את כל התמונה (contain) בלי חיתוך,
                         לפי הפרופורציות — עם שוליים נקיים (בלי רקע מטושטש) */
                      objectFit: (view.zoom || 1) < 1 ? 'contain' : view.objectFit,
                      objectPosition: view.objectPosition,
                      transform: `scale(${view.zoom || 1})`,
                      transformOrigin: view.objectPosition,
                    }}
                  />
                  {view.objectFit === 'cover' && (
                    <span
                      className="rif__focal"
                      style={{ left: `${(view.focalPoint?.x ?? 0.5) * 100}%`, top: `${(view.focalPoint?.y ?? 0.5) * 100}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
              // split = כרטיס המובייל (תמונה משמאל + פאנל). בדסקטופ הכרטיס הוא לרוחב
              // (תמונה מלמעלה) — אז מציגים מסגרת "card" כדי שהתצוגה תתאים לאתר.
              if (chrome === 'split' && bp === 'mobile') {
                // כרטיס תחום הפעילות: תמונה משמאל + פאנל כהה עם צ'יפ אדום מימין
                return (
                  <div className="rif__realcard rif__realcard--split">
                    {imgEl}
                    <div className="rif__panel" aria-hidden="true">
                      <span className="rif__panelchip">{chromeLabel || surfaceLabel || 'תחום'}</span>
                    </div>
                  </div>
                )
              }
              // ברירת מחדל: כרטיס ביחס האמיתי של הרכיב, עם עיגול פינות לפי הבחירה
              return (
                <div
                  className="rif__realcard rif__realcard--card"
                  style={{ aspectRatio: view.aspectRatio || (bp === 'mobile' ? mobileAspect : desktopAspect), borderRadius: `${view.radius || 0}px` }}
                >
                  {imgEl}
                </div>
              )
            })()}
            <p className="rif__hint">
              {surfaceLabel && <strong className="rif__surface">כך זה ייראה ב{surfaceLabel} · {bp === 'mobile' ? 'מובייל' : 'דסקטופ'}</strong>}
              {view.objectFit === 'cover' ? 'גררו את הנקודה הכחולה על התמונה כדי לבחור איזה חלק יוצג' : 'מצב "התאמה" — כל התמונה נראית (בלי חיתוך)'}
            </p>
          </div>

          {/* בקרות עיצוב — פאנל מסודר עם שורות ברורות */}
          <div className="rif__settings">
            {allowOrientation && (
              <div className="rif__row">
                <span className="rif__row-lbl">כיוון</span>
                <div className="rif__seg rif__seg--grow">
                  {ORIENTS.map((o) => (
                    <button key={o.id} type="button" className={`rif__segbtn ${view.aspectRatio === o.id ? 'is-active' : ''}`} onClick={() => setView({ aspectRatio: o.id })}>{o.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="rif__row">
              <span className="rif__row-lbl">הצגה</span>
              <div className="rif__seg rif__seg--grow">
                {FITS.map((f) => (
                  <button key={f.id} type="button" className={`rif__segbtn ${view.objectFit === f.id ? 'is-active' : ''}`} onClick={() => setView({ objectFit: f.id })}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="rif__row">
              <span className="rif__row-lbl">זום</span>
              <div className="rif__slider">
                <button type="button" className="rif__rndbtn" onClick={() => setView({ zoom: Math.max(0.4, Math.round(((view.zoom || 1) - 0.1) * 100) / 100) })} aria-label="הקטנה">−</button>
                <input type="range" min="0.4" max="3" step="0.05" value={view.zoom || 1} onChange={(e) => setView({ zoom: Number(e.target.value) })} aria-label="זום" />
                <button type="button" className="rif__rndbtn" onClick={() => setView({ zoom: Math.min(3, Math.round(((view.zoom || 1) + 0.1) * 100) / 100) })} aria-label="הגדלה">+</button>
                <span className="rif__val">{Math.round((view.zoom || 1) * 100)}%</span>
              </div>
            </div>
            <div className="rif__row">
              <span className="rif__row-lbl">פינות</span>
              <div className="rif__seg">
                <button type="button" className={`rif__segbtn ${(!view.radius) ? 'is-active' : ''}`} onClick={() => setView({ radius: 0 })}>חדות</button>
                <button type="button" className={`rif__segbtn ${view.radius > 0 ? 'is-active' : ''}`} onClick={() => setView({ radius: view.radius > 0 ? view.radius : 16 })}>מעוגלות</button>
              </div>
              <div className="rif__slider rif__slider--inline">
                <input type="range" min="0" max="48" step="1" value={view.radius || 0} onChange={(e) => setView({ radius: Number(e.target.value) })} aria-label="עוצמת עיגול" />
                <span className="rif__val">{view.radius || 0}px</span>
              </div>
            </div>
          </div>

          {/* סרגל שמירה בולט */}
          <div className={`rif__savebar ${dirty ? 'is-dirty' : ''}`}>
            <div className="rif__savebar-state">
              {dirty
                ? <span className="rif__dot rif__dot--on" />
                : <span className="rif__dot" />}
              {dirty ? 'יש שינויים שלא נשמרו' : 'הכול שמור'}
            </div>
            <div className="rif__savebar-actions">
              {breakpoints.length > 1 && (
                <button type="button" className="rif__copy" onClick={copyToOther}>
                  העתקה ל{bp === 'mobile' ? 'דסקטופ' : 'מובייל'}
                </button>
              )}
              <button type="button" className="rif__save" disabled={!dirty} onClick={saveBp}>
                {dirty ? `שמירת תצוגת ${bp === 'mobile' ? 'מובייל' : 'דסקטופ'}` : '✓ נשמר'}
              </button>
            </div>
          </div>
        </>
      )}

      {editing && draft && (
        <ImageEditor src={draft.src} busy={busy} onApply={applyCrop} onClose={() => setEditing(false)} />
      )}
    </div>
  )
}
