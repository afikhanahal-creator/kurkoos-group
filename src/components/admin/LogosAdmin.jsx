import { useState, useEffect } from 'react'
import { fetchSettings, setSetting, uploadMedia, clearCmsCache } from '../../lib/cms.js'
import Icon from '../ui/Icon.jsx'

const SLOTS = [
  { key: 'logo_main', name: 'לוגו ראשי (כהה)', hint: 'מופיע בראש האתר על רקע בהיר', bg: '#fff' },
  { key: 'logo_white', name: 'לוגו לבן', hint: 'מופיע על רקע כהה (פוטר/באנרים)', bg: '#07222e' },
]

export default function LogosAdmin() {
  const [settings, setSettings] = useState({})
  const [scale, setScale] = useState(1)
  const [busy, setBusy] = useState(null)
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    clearCmsCache()
    fetchSettings().then((s) => { setSettings(s); setScale(Number(s.logo_scale) || 1) })
  }, [])

  const flashSaved = (slot) => { setSaved(slot); setTimeout(() => setSaved((s) => (s === slot ? null : s)), 2500) }

  const saveScale = async (val) => {
    setError(null)
    try {
      await setSetting('logo_scale', val)
      setSettings((s) => ({ ...s, logo_scale: val }))
      flashSaved('scale')
    } catch (e) { setError({ slot: 'scale', msg: e.message }) }
  }

  const onUpload = async (slot, file) => {
    if (!file) return
    setError(null)
    setBusy(slot)
    try {
      const url = await uploadMedia(file, 'logos')
      await setSetting(slot, url)
      setSettings((s) => ({ ...s, [slot]: url }))
      flashSaved(slot)
    } catch (e) {
      setError({ slot, msg: e.message })
    }
    setBusy(null)
  }

  const reset = async (slot) => {
    setBusy(slot)
    setError(null)
    try {
      await setSetting(slot, null)
      setSettings((s) => ({ ...s, [slot]: null }))
      flashSaved(slot)
    } catch (e) { setError({ slot, msg: e.message }) }
    setBusy(null)
  }

  return (
    <div className="adm">
      <p className="adm__hint">
        העלו קובץ לוגו (מומלץ PNG שקוף או SVG). ההעלאה <strong>נשמרת אוטומטית</strong> ומופיעה באתר מיד.
        “איפוס” מחזיר ללוגו ברירת המחדל.
      </p>

      {/* שליטת גודל הלוגו באתר */}
      <div className="adm__logo-size">
        <div className="adm__logo-top">
          <span className="adm__logo-name">גודל הלוגו באתר</span>
          {saved === 'scale' && <span className="adm__saved-pill"><Icon name="check" size={14} /> נשמר</span>}
        </div>
        <span className="adm__logo-hint">גררו כדי להגדיל או להקטין את הלוגו בכל האתר. השינוי נשמר עם שחרור.</span>
        <div className="adm__logo-size-row">
          <input
            type="range" min="0.6" max="1.8" step="0.05" value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            onMouseUp={(e) => saveScale(Number(e.target.value))}
            onTouchEnd={(e) => saveScale(Number(e.target.value))}
            onKeyUp={(e) => saveScale(Number(e.target.value))}
          />
          <span className="adm__logo-size-val">{Math.round(scale * 100)}%</span>
          <button type="button" className="btn btn--ghost" onClick={() => { setScale(1); saveScale(1) }}>איפוס</button>
        </div>
        {error?.slot === 'scale' && <span className="adm__logo-error">שגיאה: {error.msg}</span>}
      </div>

      <div className="adm__logos">
        {SLOTS.map((slot) => (
          <div className="adm__logo-card" key={slot.key}>
            <div className="adm__logo-top">
              <span className="adm__logo-name">{slot.name}</span>
              {saved === slot.key && <span className="adm__saved-pill"><Icon name="check" size={14} /> נשמר</span>}
            </div>
            <span className="adm__logo-hint">{slot.hint}</span>

            <div className="adm__logo-preview" style={{ background: slot.bg }}>
              {busy === slot.key
                ? <span className="adm__logo-empty">מעלה…</span>
                : settings[slot.key]
                  ? <img src={settings[slot.key]} alt={slot.name} />
                  : <span className="adm__logo-empty">ברירת מחדל</span>}
            </div>

            {error?.slot === slot.key && <span className="adm__logo-error">שגיאה: {error.msg}</span>}

            <div className="adm__logo-actions">
              <label className="btn btn--primary adm__upload">
                <Icon name="arrowUp" size={16} /> {busy === slot.key ? 'מעלה…' : 'העלאת לוגו'}
                <input type="file" accept="image/*,.svg" hidden disabled={busy === slot.key}
                  onChange={(e) => { onUpload(slot.key, e.target.files[0]); e.target.value = '' }} />
              </label>
              {settings[slot.key] && (
                <button type="button" className="btn btn--ghost" onClick={() => reset(slot.key)} disabled={busy === slot.key}>
                  איפוס
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
