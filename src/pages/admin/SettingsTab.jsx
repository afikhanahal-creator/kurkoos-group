import { useState, useEffect, useRef, useCallback } from 'react'
import {
  listRecipients, createRecipient, updateRecipient, deleteRecipient,
  getNotifySettings, saveNotifySettings, sendTestNotification,
  fetchSettings, setSetting,
} from '../../lib/cms.js'

const WD_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const DEFAULT_BOOKING = { start: '09:00', end: '18:00', step: 30, days: [0, 1, 2, 3, 4, 5], blocked: [] }
const TODAY_STR = new Date().toISOString().slice(0, 10)
function parseBooking(v) {
  if (!v) return DEFAULT_BOOKING
  try { const o = typeof v === 'string' ? JSON.parse(v) : v; return { ...DEFAULT_BOOKING, ...o } } catch { return DEFAULT_BOOKING }
}

/* ============================================================
   SettingsTab — הגדרות התראות מייל על לידים חדשים.
   • מתג ראשי להפעלה/כיבוי של האוטומציה
   • ניהול נמענים: הוספה, עריכה (שם + מייל), הפעלה/השבתה, מחיקה
   • תוכן המייל: שורת נושא (עם {{name}} / {{project}}) ובחירת שדות
   • שמירה אוטומטית + שליחת מייל בדיקה
   על כל ליד שנכנס מהאתר נשלח מייל אוטומטי בזמן אמת לכל הנמענים הפעילים.
   ============================================================ */

const ALL_FIELDS = [
  { key: 'name', label: 'שם' },
  { key: 'phone', label: 'טלפון' },
  { key: 'email', label: 'אימייל' },
  { key: 'project', label: 'פרויקט' },
  { key: 'message', label: 'הודעה' },
  { key: 'source', label: 'מקור' },
  { key: 'notes', label: 'הערות' },
  { key: 'created_at', label: 'תאריך' },
]
const DEFAULT_FIELDS = ['name', 'phone', 'email', 'project', 'message', 'source', 'created_at']
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())

const XIcon = (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>

export default function SettingsTab() {
  const [recipients, setRecipients] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState('saved') // saved | saving | error
  const [testMsg, setTestMsg] = useState(null)   // { ok, text }
  const [testing, setTesting] = useState(false)
  const [booking, setBooking] = useState(DEFAULT_BOOKING)
  const [bookingStatus, setBookingStatus] = useState('saved')
  const timer = useRef()

  const load = () => {
    setLoading(true)
    Promise.all([listRecipients(), getNotifySettings(), fetchSettings().catch(() => ({}))])
      .then(([recs, st, site]) => {
        setRecipients(recs)
        setSettings(st || { enabled: true, subject: 'ליד חדש מהאתר: {{name}}', reply_to: '', include_fields: DEFAULT_FIELDS })
        setBooking(parseBooking(site?.booking_hours))
        setErr('')
      })
      .catch((e) => {
        const m = e.message || 'שגיאה'
        setErr(/schema cache|does not exist|find the table|relation/i.test(m) ? 'TABLE_MISSING' : m)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  // שמירת הגדרות (debounce)
  const persistSettings = useCallback(async (next) => {
    setStatus('saving')
    try { await saveNotifySettings(next); setStatus('saved') }
    catch (e) { console.error(e); setStatus('error'); setErr(e.message) }
  }, [])
  const patchSettings = (patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      clearTimeout(timer.current)
      setStatus('saving')
      timer.current = setTimeout(() => persistSettings({
        enabled: next.enabled, subject: next.subject, reply_to: next.reply_to, include_fields: next.include_fields,
      }), 600)
      return next
    })
  }
  const toggleField = (key) => {
    const cur = Array.isArray(settings.include_fields) ? settings.include_fields : DEFAULT_FIELDS
    patchSettings({ include_fields: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] })
  }

  // נמענים — שמירה אוטומטית פר-שורה (debounce)
  const recTimers = useRef({})
  const patchRecipientLocal = (id, patch) => setRecipients((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const scheduleRecipient = (id, patch) => {
    patchRecipientLocal(id, patch)
    clearTimeout(recTimers.current[id])
    setStatus('saving')
    recTimers.current[id] = setTimeout(async () => {
      try { await updateRecipient(id, patch); setStatus('saved') }
      catch (e) { setStatus('error'); setErr(e.message) }
    }, 600)
  }
  const addRecipient = async () => {
    try {
      const created = await createRecipient({ name: '', email: '', active: true, sort_order: recipients.length })
      setRecipients((rs) => [...rs, created])
    } catch (e) { setErr(e.message) }
  }
  const removeRecipient = async (id) => {
    setRecipients((rs) => rs.filter((r) => r.id !== id))
    try { await deleteRecipient(id) } catch (e) { setErr(e.message); load() }
  }

  // שמירת שעות פנויות לשיחה (booking_hours) — debounce
  const bookingTimer = useRef()
  const patchBooking = (patch) => {
    setBooking((b) => {
      const next = { ...b, ...patch }
      clearTimeout(bookingTimer.current)
      setBookingStatus('saving')
      bookingTimer.current = setTimeout(async () => {
        try { await setSetting('booking_hours', JSON.stringify(next)); setBookingStatus('saved') }
        catch (e) { setBookingStatus('error'); setErr(e.message) }
      }, 500)
      return next
    })
  }
  const toggleDay = (d) => {
    const days = booking.days.includes(d) ? booking.days.filter((x) => x !== d) : [...booking.days, d].sort()
    patchBooking({ days })
  }
  // חסימת תאריכים ספציפיים (חגים/חופשות) — גם אם היום פתוח בדרך כלל
  const [blockInput, setBlockInput] = useState('')
  const addBlocked = () => {
    if (!blockInput) return
    const list = booking.blocked || []
    if (!list.includes(blockInput)) patchBooking({ blocked: [...list, blockInput].sort() })
    setBlockInput('')
  }
  const removeBlocked = (d) => patchBooking({ blocked: (booking.blocked || []).filter((x) => x !== d) })

  const runTest = async () => {
    setTesting(true); setTestMsg(null)
    try {
      const out = await sendTestNotification()
      if (out.skipped === 'no_recipients') setTestMsg({ ok: false, text: 'אין נמענים פעילים — הוסיפו לפחות נמען אחד פעיל.' })
      else if (out.skipped === 'disabled') setTestMsg({ ok: false, text: 'האוטומציה כבויה — הפעילו אותה למעלה.' })
      else setTestMsg({ ok: true, text: `מייל בדיקה נשלח ל-${out.sent} נמענים. בדקו את תיבת הדואר.` })
    } catch (e) {
      setTestMsg({ ok: false, text: `שליחת הבדיקה נכשלה: ${e.message}. ודאו שהגדרתם RESEND_API_KEY ו-SERVICE ROLE ב-Vercel.` })
    } finally { setTesting(false) }
  }

  if (loading) return <div className="adm-leads__msg"><span className="adm-spin" /> טוען הגדרות…</div>

  if (err === 'TABLE_MISSING') {
    return (
      <div className="adm-set" dir="rtl">
        <div className="adm-leads__setup">
          <strong>טבלאות ההתראות עדיין לא נוצרו ב-Supabase.</strong>
          <span>היכנסו ל-Supabase → SQL Editor → הריצו את הסקריפט שב-<code>supabase/migration.sql</code> (החלק של lead_notify), ואז רעננו את העמוד.</span>
        </div>
      </div>
    )
  }

  const fields = Array.isArray(settings.include_fields) ? settings.include_fields : DEFAULT_FIELDS
  const activeCount = recipients.filter((r) => r.active && isEmail(r.email)).length

  return (
    <div className="adm-set" dir="rtl">
      {/* כותרת + סטטוס שמירה */}
      <div className="adm-set__bar">
        <span className={`adm-set__status adm-set__status--${status}`}>
          {status === 'saving' ? 'שומר…' : status === 'error' ? 'שגיאת שמירה' : '✓ נשמר אוטומטית'}
        </span>
        <span className="adm-set__sub">התראות מייל אוטומטיות על כל ליד חדש שנכנס מהאתר</span>
      </div>

      {err && err !== 'TABLE_MISSING' && <div className="adm-leads__err">{err}</div>}

      {/* מתג ראשי */}
      <section className="adm-set__card">
        <div className="adm-set__row adm-set__row--toggle">
          <div>
            <h3 className="adm-set__card-title">הפעלת ההתראות</h3>
            <p className="adm-set__hint">כשהמתג דולק, כל ליד חדש מהאתר ישלח מייל אוטומטי בזמן אמת לכל הנמענים הפעילים.</p>
          </div>
          <label className="ed__switch">
            <input type="checkbox" checked={!!settings.enabled} onChange={(e) => patchSettings({ enabled: e.target.checked })} />
            <span />
          </label>
        </div>
      </section>

      {/* נמענים */}
      <section className="adm-set__card">
        <h3 className="adm-set__card-title">נמענים <span className="adm-set__badge">{activeCount} פעילים</span></h3>
        <p className="adm-set__hint">כתובות המייל שיקבלו את פרטי הליד. אפשר להוסיף, לערוך, להשבית ולמחוק.</p>

        <div className="adm-set__recipients">
          {recipients.length === 0 && <p className="adm-set__empty">עדיין אין נמענים. הוסיפו את הכתובת הראשונה.</p>}
          {recipients.map((r) => (
            <div key={r.id} className={`adm-set__rec ${!r.active ? 'is-off' : ''}`}>
              <label className="adm-set__rec-toggle" title={r.active ? 'פעיל' : 'מושבת'}>
                <input type="checkbox" checked={!!r.active} onChange={(e) => scheduleRecipient(r.id, { active: e.target.checked })} />
              </label>
              <input
                className="adm-set__rec-name"
                placeholder="שם (אופציונלי)"
                value={r.name || ''}
                onChange={(e) => scheduleRecipient(r.id, { name: e.target.value })}
              />
              <input
                className={`adm-set__rec-email ${r.email && !isEmail(r.email) ? 'has-error' : ''}`}
                dir="ltr"
                placeholder="name@example.com"
                value={r.email || ''}
                onChange={(e) => scheduleRecipient(r.id, { email: e.target.value })}
              />
              <button type="button" className="adm-set__rec-del" onClick={() => removeRecipient(r.id)} aria-label="מחיקת נמען" title="מחיקה"><XIcon /></button>
            </div>
          ))}
        </div>
        <button type="button" className="adm-set__add" onClick={addRecipient}>+ הוסף נמען</button>
      </section>

      {/* תוכן המייל */}
      <section className="adm-set__card">
        <h3 className="adm-set__card-title">תוכן המייל</h3>

        <label className="adm-set__field">
          <span>שורת נושא</span>
          <input
            value={settings.subject || ''}
            onChange={(e) => patchSettings({ subject: e.target.value })}
            placeholder="ליד חדש מהאתר: {{name}}"
          />
          <small className="adm-set__hint">אפשר להשתמש ב-<code dir="ltr">{'{{name}}'}</code> ו-<code dir="ltr">{'{{project}}'}</code> שיוחלפו בפרטי הליד.</small>
        </label>

        <label className="adm-set__field">
          <span>כתובת לתשובה (Reply-To, אופציונלי)</span>
          <input dir="ltr" value={settings.reply_to || ''} onChange={(e) => patchSettings({ reply_to: e.target.value })} placeholder="sales@kurkoos.co.il" />
        </label>

        <div className="adm-set__field">
          <span>שדות שיופיעו במייל</span>
          <div className="ed__chips" role="group">
            {ALL_FIELDS.map((f) => {
              const on = fields.includes(f.key)
              return (
                <button key={f.key} type="button" className={`ed__chip ${on ? 'ed__chip--on' : ''}`} aria-pressed={on} onClick={() => toggleField(f.key)}>
                  <span className="ed__chip-check" aria-hidden="true">{on ? '✓' : '+'}</span>{f.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* שעות פנויות לשיחה (יומן תיאום פגישה) */}
      <section className="adm-set__card">
        <h3 className="adm-set__card-title">שעות פנויות לשיחה
          <span className={`adm-set__status adm-set__status--${bookingStatus}`}>
            {bookingStatus === 'saving' ? 'שומר…' : bookingStatus === 'error' ? 'שגיאה' : '✓ נשמר'}
          </span>
        </h3>
        <p className="adm-set__hint">בחרו את הימים והשעות שבהם פתוח לשיחה — אלו הסלוטים שיוצגו ביומן תיאום הפגישה באתר (אחרי בחירת תאריך).</p>

        <div className="adm-set__bk-row">
          <label className="adm-set__field"><span>משעה</span>
            <input type="time" value={booking.start} onChange={(e) => patchBooking({ start: e.target.value })} />
          </label>
          <label className="adm-set__field"><span>עד שעה</span>
            <input type="time" value={booking.end} onChange={(e) => patchBooking({ end: e.target.value })} />
          </label>
          <label className="adm-set__field"><span>משך סלוט</span>
            <select value={booking.step} onChange={(e) => patchBooking({ step: Number(e.target.value) })}>
              <option value={15}>15 דק׳</option>
              <option value={30}>30 דק׳</option>
              <option value={45}>45 דק׳</option>
              <option value={60}>שעה</option>
            </select>
          </label>
        </div>
        <div className="adm-set__field" style={{ marginTop: '0.6rem' }}>
          <span>ימים פתוחים</span>
          <div className="ed__chips" role="group">
            {WD_LABELS.map((lbl, d) => {
              const on = booking.days.includes(d)
              return (
                <button key={d} type="button" className={`ed__chip ${on ? 'ed__chip--on' : ''}`} aria-pressed={on} onClick={() => toggleDay(d)}>
                  <span className="ed__chip-check" aria-hidden="true">{on ? '✓' : '+'}</span>{lbl}
                </button>
              )
            })}
          </div>
        </div>
        <div className="adm-set__field" style={{ marginTop: '0.9rem' }}>
          <span>חסימת תאריכים (חגים / חופשות / ימים תפוסים)</span>
          <div className="adm-set__block-add">
            <input type="date" min={TODAY_STR} value={blockInput} onChange={(e) => setBlockInput(e.target.value)} />
            <button type="button" className="btn btn--primary" onClick={addBlocked} disabled={!blockInput}>חסום תאריך</button>
          </div>
          {(booking.blocked || []).length > 0 ? (
            <div className="adm-set__blocked-list">
              {(booking.blocked || []).map((d) => (
                <span key={d} className="adm-set__blocked-chip">
                  {new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  <button type="button" onClick={() => removeBlocked(d)} aria-label={`הסרת חסימה ל-${d}`}>✕</button>
                </span>
              ))}
            </div>
          ) : (
            <p className="adm-set__hint" style={{ marginTop: '0.4rem' }}>אין תאריכים חסומים. בחרו תאריך ולחצו "חסום תאריך" — הוא לא יופיע כפנוי ביומן.</p>
          )}
        </div>

        <details className="adm-set__setup">
          <summary>סנכרון עם יומן Google (אופציונלי)</summary>
          <p>השעות שמוגדרות כאן נשלטות ידנית. לסנכרון דו-כיווני אמיתי עם Google Calendar (חסימת שעות תפוסות אוטומטית + יצירת אירוע) נדרש חיבור OAuth של חשבון Google + פונקציית שרת. תגידו לי ואחבר זאת בנפרד.</p>
        </details>
      </section>

      {/* בדיקה */}
      <section className="adm-set__card">
        <h3 className="adm-set__card-title">בדיקת המערכת</h3>
        <p className="adm-set__hint">שולח מייל לדוגמה לכל הנמענים הפעילים כדי לוודא שההגדרות תקינות.</p>
        <div className="adm-set__test">
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={runTest} disabled={testing || !activeCount}>
            {testing ? 'שולח…' : '✉ שליחת מייל בדיקה'}
          </button>
          {testMsg && <span className={`adm-set__test-msg ${testMsg.ok ? 'is-ok' : 'is-err'}`}>{testMsg.text}</span>}
        </div>
        <details className="adm-set__setup">
          <summary>הגדרה ראשונית (פעם אחת) — מה צריך כדי שהמיילים יישלחו</summary>
          <ol>
            <li>הריצו את הסקריפט ב-<code>supabase/migration.sql</code> (חלק lead_notify) ב-Supabase.</li>
            <li>פתחו חשבון ב-<a href="https://resend.com" target="_blank" rel="noopener noreferrer">Resend</a>, אמתו דומיין וצרו <code>API Key</code>.</li>
            <li>ב-Vercel → Settings → Environment Variables הוסיפו:
              <code dir="ltr">SUPABASE_URL</code>, <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code>, <code dir="ltr">RESEND_API_KEY</code>, <code dir="ltr">NOTIFY_FROM</code>.</li>
            <li>פרסמו מחדש (Redeploy) — וזהו, ההתראות פעילות.</li>
          </ol>
        </details>
      </section>
    </div>
  )
}
