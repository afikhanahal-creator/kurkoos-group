import { useEffect, useState } from 'react'
import { fetchSettings, setSetting, uploadMedia } from '../../lib/cms.js'
import { GOOGLE_FONTS, fontStack, applyFonts } from '../../lib/fonts.js'

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

      <p className="ftab__note">
        💡 לאתר ציבורי שכבר פתוח — הפונט החדש יופיע ברענון הדף (Ctrl+Shift+R). הרישיון של הפונטים ברשימה הוא SIL OFL, מותר לשימוש מסחרי.
      </p>
    </div>
  )
}