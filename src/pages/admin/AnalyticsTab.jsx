import { useState, useEffect } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import './AnalyticsTab.css'

/* ============================================================
   AnalyticsTab — חיבור Google Analytics וצפייה בתנועת האתר.
   - הדבקת מזהה מדידה (G-XXXXXXX) → התג נטען באתר מיידית, בלי דיפלוי
   - הטמעת דוח Looker Studio (אופציונלי) → גרף התנועה מוצג כאן בפנים
   ============================================================ */
const GA_RE = /^G-[A-Z0-9]{6,14}$/i

export default function AnalyticsTab() {
  const [gaId, setGaId] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setGaId(String(s.ga_measurement_id || ''))
        setEmbedUrl(String(s.analytics_embed_url || ''))
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const save = async (key, value, label) => {
    setStatus('שומר…')
    try {
      await setSetting(key, value.trim())
      setStatus(`${label} נשמר ✓`)
      setTimeout(() => setStatus(''), 2500)
    } catch (e) {
      setStatus('שמירה נכשלה: ' + (e.message || e))
    }
  }

  const gaOk = GA_RE.test(gaId.trim())
  const embedOk = embedUrl.trim().startsWith('https://lookerstudio.google.com/embed/')

  if (!loaded) return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען…</div>

  return (
    <div className="antab">
      {/* ---- סטטוס ---- */}
      <section className="antab__card">
        <div className="antab__head">
          <h3>Google Analytics — מדידת תנועה</h3>
          <span className={`antab__chip ${gaOk ? 'antab__chip--on' : 'antab__chip--off'}`}>
            {gaOk ? 'מחובר — האתר נמדד' : 'לא מוגדר עדיין'}
          </span>
        </div>
        <p className="antab__lead">
          הדביקו כאן את מזהה המדידה מחשבון Google Analytics — האתר יתחיל למדוד כניסות,
          מבקרים ועמודים נצפים מיד, בלי צורך בעדכון קוד.
        </p>
        <div className="antab__row">
          <label className="antab__field">
            מזהה מדידה (Measurement ID)
            <input
              dir="ltr"
              placeholder="G-XXXXXXXXXX"
              value={gaId}
              onChange={(e) => setGaId(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="antab__btn"
            disabled={gaId.trim() !== '' && !gaOk}
            onClick={() => save('ga_measurement_id', gaId, 'מזהה המדידה')}
          >
            שמירה
          </button>
        </div>
        {gaId.trim() !== '' && !gaOk && (
          <p className="antab__err">מזהה לא תקין — צריך להתחיל ב-G ואחריו אותיות/ספרות (למשל G-AB12CD34EF)</p>
        )}

        {!gaOk && (
          <ol className="antab__steps">
            <li>היכנסו ל-<a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">analytics.google.com</a> עם חשבון Google של העסק</li>
            <li>לחצו <b>Start measuring</b> ← צרו חשבון בשם "קורקוס גרופ"</li>
            <li>צרו נכס (Property) בשם "אתר קורקוס", אזור זמן ישראל, מטבע ILS</li>
            <li>בחרו פלטפורמה <b>Web</b> והזינו את כתובת האתר: kurkoos-group.co.il</li>
            <li>בסיום מוצג <b>Measurement ID</b> שמתחיל ב-G — העתיקו והדביקו כאן למעלה</li>
          </ol>
        )}

        {gaOk && (
          <p className="antab__hint">
            לצפייה בנתונים המלאים: <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">לוח הבקרה של Google Analytics</a>.
            הנתונים מתחילים להיאסף מרגע השמירה; ספירות ראשונות מופיעות תוך כשעה, ודוחות מלאים תוך 24 שעות.
          </p>
        )}
      </section>

      {/* ---- דוח מוטמע ---- */}
      <section className="antab__card">
        <div className="antab__head">
          <h3>דוח תנועה בתוך המערכת (אופציונלי)</h3>
          <span className={`antab__chip ${embedOk ? 'antab__chip--on' : 'antab__chip--off'}`}>
            {embedOk ? 'דוח מוטמע' : 'לא הוגדר'}
          </span>
        </div>
        <p className="antab__lead">
          רוצים לראות את הגרפים כאן בלי לצאת מהמערכת? צרו דוח ב-Looker Studio (חינם, של Google)
          המחובר ל-Analytics, בחרו <b>File ← Embed report</b>, העתיקו את כתובת ה-Embed והדביקו כאן.
        </p>
        <div className="antab__row">
          <label className="antab__field">
            כתובת הטמעה (Embed URL)
            <input
              dir="ltr"
              placeholder="https://lookerstudio.google.com/embed/reporting/..."
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="antab__btn"
            disabled={embedUrl.trim() !== '' && !embedOk}
            onClick={() => save('analytics_embed_url', embedUrl, 'כתובת הדוח')}
          >
            שמירה
          </button>
        </div>
        {embedUrl.trim() !== '' && !embedOk && (
          <p className="antab__err">הכתובת צריכה להתחיל ב-https://lookerstudio.google.com/embed/</p>
        )}
        {embedOk && (
          <div className="antab__frame">
            <iframe
              src={embedUrl.trim()}
              title="דוח תנועת האתר"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        )}
      </section>

      {status && <p className="antab__status">{status}</p>}
    </div>
  )
}
