import { useEffect, useState, useRef } from 'react'
import { fetchSettings, setSetting, uploadMedia } from '../../lib/cms.js'
import { GOOGLE_FONTS, fontStack, applyFonts, TYPE_LEVELS, TYPE_WEIGHTS, FONT_FILES, WEIGHT_USAGE, parseTypeScale, applyTypeScale } from '../../lib/fonts.js'
import { toast } from '../../lib/toast.js'

/* ============================================================
   FontsTab — ניהול הפונטים של האתר.
   לכל תפקיד (כותרות / גוף): בחירה מרשימת פונטים ברישיון חופשי,
   או העלאת קובץ פונט מותאם (woff2/woff/ttf/otf). הבחירה נשמרת
   ב-site_settings (font_heading / font_body) ומוחלת מיד + בכל
   טעינת אתר דרך FontLoader.
   ============================================================ */

const ROLES = [
  { key: 'font_heading', label: 'פונט כותרות', sample: 'קורקוס גרופ · בונים את העתיד' },
  { key: 'font_body', label: 'פונט גוף', sample: 'יזמות, בנייה, פיקוח ותיווך נדל״ן ברמה הגבוהה ביותר. ABC 0123' },
]

/* ============================================================
   עורך הסולם הטיפוגרפי — גודל (px) ומשקל לכל רמת טקסט (Hero,
   H1–H5, מוביל, גוף, קטן). ריק = ברירת המחדל של העיצוב.
   נשמר אוטומטית (debounce) ומוחל מיד על האתר + בתצוגה החיה.
   ============================================================ */
const WEIGHT_NAMES = { 300: 'דק', 400: 'רגיל', 500: 'בינוני', 600: 'חצי מודגש', 700: 'מודגש', 800: 'עבה', 900: 'שחור' }
const famVar = (fam) => (fam === 'body' ? 'var(--font-body)' : 'var(--font-heading)')
const famName = (fam) => (fam === 'body' ? 'Almoni' : 'Heebo')
/* המשקל שהדפדפן באמת מציג, לפי קבצי הפונט שמותקנים */
const shownWeight = (fam, w) => (FONT_FILES[famName(fam)] || {}).weights?.[w] ?? w

/* ============================================================
   עורך הסולם הטיפוגרפי. כל שורה מציגה את הטקסט בגודל, במשקל ובפונט
   שהאתר מציג היום במחשב (או בנייד, לפי המתג), כך שרואים בדיוק מה
   משנים. גודל שנבחר כאן הוא הגודל במחשב; בנייד נשאר הגודל של העיצוב.
   ============================================================ */
function TypeScaleEditor() {
  const [scale, setScale] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | saved
  const [view, setView] = useState('d')         // d = מחשב, m = נייד
  const timer = useRef()

  useEffect(() => {
    fetchSettings().then((s) => setScale(parseTypeScale(s.type_scale))).catch(() => {})
  }, [])

  const update = (key, field, raw) => {
    const num = raw === '' || raw == null ? null : Number(raw)
    setScale((prev) => {
      const cur = { ...(prev[key] || {}) }
      if (num && num > 0) cur[field] = num; else delete cur[field]
      const next = { ...prev }
      if (Object.keys(cur).length) next[key] = cur; else delete next[key]
      applyTypeScale({ type_scale: next })
      clearTimeout(timer.current)
      setStatus('saving')
      timer.current = setTimeout(async () => {
        try { await setSetting('type_scale', JSON.stringify(next)); setStatus('saved'); setTimeout(() => setStatus('idle'), 1800) }
        catch { setStatus('idle'); toast.error('שמירת הטיפוגרפיה נכשלה. נסו שוב') }
      }, 800)
      return next
    })
  }

  const resetAll = () => {
    setScale({})
    applyTypeScale({ type_scale: {} })
    clearTimeout(timer.current)
    setSetting('type_scale', JSON.stringify({}))
      .then(() => toast.success('הסולם הטיפוגרפי חזר לעיצוב המקורי'))
      .catch(() => toast.error('האיפוס נכשל. נסו שוב'))
  }

  const hasAny = Object.keys(scale).length > 0

  return (
    <section className="tsc">
      <header className="tsc__head">
        <div>
          <h3 className="tsc__title">גדלים ומשקלים, בגודל האמיתי</h3>
          <p className="tsc__sub">כל שורה מוצגת בדיוק כמו באתר היום. שדה ריק משאיר את העיצוב המקורי. גודל שמשנים חל על המחשב; בנייד נשאר הגודל של העיצוב.</p>
        </div>
        <div className="tsc__head-actions">
          <div className="tsc__view" role="radiogroup" aria-label="תצוגה">
            <button type="button" role="radio" aria-checked={view === 'd'} className={view === 'd' ? 'is-on' : ''} onClick={() => setView('d')}>מחשב</button>
            <button type="button" role="radio" aria-checked={view === 'm'} className={view === 'm' ? 'is-on' : ''} onClick={() => setView('m')}>נייד</button>
          </div>
          {status === 'saving' && <span className="tsc__status" role="status">שומר…</span>}
          {status === 'saved' && <span className="tsc__status tsc__status--ok" role="status">נשמר</span>}
          {hasAny && <button type="button" className="tsc__reset-all" onClick={resetAll}>חזרה לעיצוב המקורי</button>}
        </div>
      </header>

      <div className="tsc__rows">
        {TYPE_LEVELS.map((lvl) => {
          const cfg = scale[lvl.key] || {}
          const sp = lvl.spec
          const size = view === 'd' ? (cfg.size || sp.d) : sp.m
          const weight = cfg.weight || sp.w
          const shown = shownWeight(sp.fam, weight)
          const previewStyle = {
            fontFamily: famVar(sp.fam),
            fontSize: `${size}px`,
            fontWeight: weight,
            lineHeight: sp.lh,
            letterSpacing: sp.ls ? `${sp.ls}em` : undefined,
          }
          const changed = !!(cfg.size || cfg.weight)
          return (
            <div className={`tsc__row${changed ? ' is-changed' : ''}`} key={lvl.key}>
              <div className="tsc__rowhead">
                <span className="tsc__tag">{lvl.tag}</span>
                <span className="tsc__label">{lvl.label}</span>
                <span className="tsc__spec" dir="rtl">
                  <b>{famName(sp.fam)}</b> · מחשב {cfg.size || sp.d}px · נייד {sp.m}px · משקל {weight} {WEIGHT_NAMES[weight]}
                </span>
                {shown !== weight && <span className="tsc__warn">הקובץ המותקן מציג {shown}</span>}
                {changed && <span className="tsc__chg">שונה</span>}
              </div>
              <p className="tsc__preview" style={previewStyle} dir="rtl">{lvl.sample}</p>
              <p className="tsc__where">מופיע ב: {sp.where}</p>
              <div className="tsc__controls">
                <label className="tsc__field">
                  <span>גודל במחשב (px)</span>
                  <input type="number" min="8" max="120" step="0.5" dir="ltr" placeholder={`${sp.d} (באתר)`} value={cfg.size ?? ''} onChange={(e) => update(lvl.key, 'size', e.target.value)} />
                </label>
                <label className="tsc__field">
                  <span>משקל</span>
                  <select value={cfg.weight ?? ''} onChange={(e) => update(lvl.key, 'weight', e.target.value)}>
                    <option value="">כמו באתר: {sp.w} {WEIGHT_NAMES[sp.w]}</option>
                    {TYPE_WEIGHTS.map((w) => {
                      const sh = shownWeight(sp.fam, w)
                      return <option key={w} value={w}>{w} {WEIGHT_NAMES[w]}{sh !== w ? ` (מוצג כ-${sh})` : ''}</option>
                    })}
                  </select>
                </label>
                {changed && (
                  <button type="button" className="tsc__row-reset" onClick={() => { update(lvl.key, 'size', ''); update(lvl.key, 'weight', '') }}>חזרה למקור</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ============================================================
   מפת המשקלים: כל משקל של כל פונט בגודל אמיתי, מה מותקן, מה הדפדפן
   מציג בפועל, וכמה מהטקסט באתר כתוב בו. עוזר לבחור אילו משקלים לקנות.
   ============================================================ */
function WeightMap() {
  const [text, setText] = useState('בונים את הבית הבא שלכם · 1234567890')
  return (
    <section className="tsc wmap">
      <header className="tsc__head">
        <div>
          <h3 className="tsc__title">מפת המשקלים</h3>
          <p className="tsc__sub">כל משקל מוצג בגודל 32 פיקסלים. "מוצג כ" אומר שהקובץ של המשקל הזה לא מותקן, והדפדפן משתמש בקרוב אליו. האחוז הוא החלק מכל הטקסט באתר שכתוב במשקל הזה.</p>
        </div>
        <label className="tsc__field wmap__text"><span>טקסט לדוגמה</span><input value={text} onChange={(e) => setText(e.target.value)} dir="rtl" /></label>
      </header>
      {Object.entries(FONT_FILES).map(([fam, info]) => (
        <div key={fam} className="wmap__fam">
          <h4 className="wmap__name">{fam} <small>{info.source} · {fam === 'Heebo' ? 'פונט הכותרות' : 'פונט הגוף'}</small></h4>
          <ol className="wmap__list">
            {TYPE_WEIGHTS.map((w) => {
              const shown = info.weights[w]
              const use = (WEIGHT_USAGE[fam] || {})[w]
              return (
                <li key={w} className={`wmap__row${shown !== w ? ' is-faux' : ''}`}>
                  <span className="wmap__w"><b>{w}</b> {WEIGHT_NAMES[w]}</span>
                  <span className="wmap__sample" style={{ fontFamily: `'${fam}', var(--font-body)`, fontWeight: w }} dir="rtl">{text}</span>
                  <span className="wmap__meta">
                    {shown !== w ? <em className="wmap__badge wmap__badge--faux">מוצג כ-{shown}</em> : <em className="wmap__badge">מותקן</em>}
                    {use ? <em className="wmap__use">{use}% מהטקסט</em> : <em className="wmap__use wmap__use--none">לא בשימוש</em>}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}

export default function FontsTab() {
  const [fonts, setFonts] = useState({ font_heading: null, font_body: null })
  const [savingKey, setSavingKey] = useState('')
  const [uploadingKey, setUploadingKey] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchSettings().then((s) => setFonts({ font_heading: s.font_heading || null, font_body: s.font_body || null })).catch(() => {})
  }, [])

  const persist = async (key, value) => {
    const next = { ...fonts, [key]: value }
    setFonts(next)
    applyFonts(next)            // החלה מיידית (תצוגה חיה)
    setSavingKey(key); setErr('')
    try { await setSetting(key, value) } catch (e) { setErr('שמירה נכשלה: ' + (e.message || e)) } finally { setSavingKey('') }
  }

  // בחירה מתפריט: '' = ברירת מחדל (מותג) · 'google:Family' = פונט Google
  const onSelect = (key, raw) => {
    if (!raw) return persist(key, null)
    const family = raw.replace('google:', '')
    const meta = GOOGLE_FONTS.find((f) => f.family === family)
    persist(key, { source: 'google', family, weights: meta?.weights || [400, 700], stack: fontStack(family, meta?.category) })
  }

  const onUpload = async (key, file) => {
    if (!file) return
    const okExt = /\.(woff2?|ttf|otf)$/i.test(file.name)
    if (!okExt) { setErr('פורמט לא נתמך. העלו woff2 / woff / ttf / otf.'); return }
    setUploadingKey(key); setErr('')
    try {
      const url = await uploadMedia(file, 'fonts')
      const family = file.name.replace(/\.(woff2?|ttf|otf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Custom Font'
      await persist(key, { source: 'custom', family, url, stack: `'${family}', system-ui, sans-serif` })
    } catch (e) {
      setErr('העלאה נכשלה: ' + (e.message || e))
    } finally { setUploadingKey('') }
  }

  const currentValue = (cfg) => (cfg && cfg.source === 'google' ? `google:${cfg.family}` : '')

  return (
    <div className="ftab">
      <p className="ftab__lead">
        בחרו פונט מהרשימה (כולם ברישיון חופשי לשימוש מסחרי) או העלו קובץ פונט משלכם.
        השינוי מוחל על כל האתר מיד ונשמר אוטומטית.
      </p>
      {err && <p className="ftab__err">{err}</p>}

      <div className="ftab__grid">
        {ROLES.map((role) => {
          const cfg = fonts[role.key]
          return (
            <section className="ftab__card" key={role.key}>
              <header className="ftab__card-head">
                <h3>{role.label}</h3>
                {savingKey === role.key && <span className="ftab__saving">שומר…</span>}
              </header>

              {/* תצוגה מקדימה חיה — מוצגת בפונט הפעיל */}
              <div
                className="ftab__preview"
                style={{ fontFamily: cfg?.stack || `var(${role.key === 'font_heading' ? '--font-heading' : '--font-body'})`, fontWeight: role.key === 'font_heading' ? 700 : 400 }}
              >
                {role.sample}
              </div>

              <label className="ftab__field">
                <span>בחירת פונט</span>
                <select value={currentValue(cfg)} onChange={(e) => onSelect(role.key, e.target.value)}>
                  <option value="">ברירת מחדל (פונט המותג)</option>
                  <optgroup label="Sans (ללא תגים)">
                    {GOOGLE_FONTS.filter((f) => f.category === 'sans').map((f) => <option key={f.family} value={`google:${f.family}`}>{f.family}</option>)}
                  </optgroup>
                  <optgroup label="Serif (עם תגים)">
                    {GOOGLE_FONTS.filter((f) => f.category === 'serif').map((f) => <option key={f.family} value={`google:${f.family}`}>{f.family}</option>)}
                  </optgroup>
                  <optgroup label="Display (דקורטיבי)">
                    {GOOGLE_FONTS.filter((f) => f.category === 'display').map((f) => <option key={f.family} value={`google:${f.family}`}>{f.family}</option>)}
                  </optgroup>
                  {cfg?.source === 'custom' && <option value={`google:${cfg.family}`} disabled>{cfg.family} (מותאם)</option>}
                </select>
              </label>

              <div className="ftab__or">או</div>

              <label className="ftab__upload">
                <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf" hidden onChange={(e) => onUpload(role.key, e.target.files[0])} />
                {uploadingKey === role.key ? 'מעלה…' : '⬆ העלאת קובץ פונט (woff2 / ttf)'}
              </label>

              {cfg && (
                <div className="ftab__current">
                  פעיל: <strong>{cfg.family}</strong> {cfg.source === 'custom' ? '· קובץ שהועלה' : '· Google Fonts'}
                  <button type="button" className="ftab__reset" onClick={() => persist(role.key, null)}>איפוס לברירת מחדל</button>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* סולם טיפוגרפי — גדלים ומשקלים לכל רמת כותרת/טקסט */}
      <TypeScaleEditor />
      <WeightMap />

      <p className="ftab__note">
        💡 לאתר ציבורי שכבר פתוח — הפונט החדש יופיע ברענון הדף (Ctrl+Shift+R). הרישיון של הפונטים ברשימה הוא SIL OFL, מותר לשימוש מסחרי.
      </p>
    </div>
  )
}