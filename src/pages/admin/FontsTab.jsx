import { useEffect, useState, useRef } from 'react'
import { fetchSettings, setSetting, uploadMedia } from '../../lib/cms.js'
import { GOOGLE_FONTS, fontStack, applyFonts, TYPE_LEVELS, TYPE_WEIGHTS, parseTypeScale, applyTypeScale } from '../../lib/fonts.js'
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
function TypeScaleEditor() {
  const [scale, setScale] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | saved
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
      // החלה חיה מיידית על האתר/אדמין + שמירה אוטומטית בענן
      applyTypeScale({ type_scale: next })
      clearTimeout(timer.current)
      setStatus('saving')
      timer.current = setTimeout(async () => {
        try { await setSetting('type_scale', JSON.stringify(next)); setStatus('saved'); setTimeout(() => setStatus('idle'), 1800) }
        catch { setStatus('idle'); toast.error('שמירת הטיפוגרפיה נכשלה — נסו שוב') }
      }, 800)
      return next
    })
  }

  const resetAll = () => {
    setScale({})
    applyTypeScale({ type_scale: {} })
    clearTimeout(timer.current)
    setSetting('type_scale', JSON.stringify({}))
      .then(() => toast.success('הסולם הטיפוגרפי אופס לברירת המחדל'))
      .catch(() => toast.error('האיפוס נכשל — נסו שוב'))
  }

  const hasAny = Object.keys(scale).length > 0

  return (
    <section className="tsc">
      <header className="tsc__head">
        <div>
          <h3 className="tsc__title">גדלים ומשקלים (H1–H5)</h3>
          <p className="tsc__sub">שליטה מלאה בגודל ובעובי של כל רמת טקסט באתר. ריק = ברירת המחדל של העיצוב.</p>
        </div>
        <div className="tsc__head-actions">
          {status === 'saving' && <span className="tsc__status">שומר…</span>}
          {status === 'saved' && <span className="tsc__status tsc__status--ok">נשמר ✓</span>}
          {hasAny && <button type="button" className="tsc__reset-all" onClick={resetAll}>איפוס הכול</button>}
        </div>
      </header>

      <div className="tsc__rows">
        {TYPE_LEVELS.map((lvl) => {
          const cfg = scale[lvl.key] || {}
          const previewStyle = {
            fontFamily: lvl.key === 'body' || lvl.key === 'lead' || lvl.key === 'small' ? 'var(--font-body)' : 'var(--font-heading)',
            fontSize: cfg.size ? `${Math.min(cfg.size, 54)}px` : undefined,
            fontWeight: cfg.weight || (lvl.key.startsWith('h') || lvl.key === 'hero' ? 800 : 400),
          }
          return (
            <div className="tsc__row" key={lvl.key}>
              <span className="tsc__tag">{lvl.tag}</span>
              <div className="tsc__meta">
                <span className="tsc__label">{lvl.label}</span>
                <span className="tsc__preview" style={previewStyle} dir="rtl">{lvl.sample}</span>
              </div>
              <label className="tsc__field">
                <span>גודל (px)</span>
                <input
                  type="number" min="8" max="120" dir="ltr"
                  placeholder="ברירת מחדל"
                  value={cfg.size ?? ''}
                  onChange={(e) => update(lvl.key, 'size', e.target.value)}
                />
              </label>
              <label className="tsc__field">
                <span>משקל</span>
                <select value={cfg.weight ?? ''} onChange={(e) => update(lvl.key, 'weight', e.target.value)}>
                  <option value="">ברירת מחדל</option>
                  {TYPE_WEIGHTS.map((w) => (
                    <option key={w} value={w}>{w} — {w <= 300 ? 'דק' : w === 400 ? 'רגיל' : w === 500 ? 'בינוני' : w === 600 ? 'מודגש-קל' : w === 700 ? 'מודגש' : w === 800 ? 'עבה' : 'שחור'}</option>
                  ))}
                </select>
              </label>
              {(cfg.size || cfg.weight) && (
                <button type="button" className="tsc__row-reset" title="איפוס רמה זו" onClick={() => { update(lvl.key, 'size', ''); update(lvl.key, 'weight', '') }}>✕</button>
              )}
            </div>
          )
        })}
      </div>
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

      <p className="ftab__note">
        💡 לאתר ציבורי שכבר פתוח — הפונט החדש יופיע ברענון הדף (Ctrl+Shift+R). הרישיון של הפונטים ברשימה הוא SIL OFL, מותר לשימוש מסחרי.
      </p>
    </div>
  )
}