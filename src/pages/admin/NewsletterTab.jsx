import { useEffect, useState, useRef, useMemo } from 'react'
import { listSubscribers, deleteSubscriber, fetchSettings, setSetting } from '../../lib/cms.js'
import { toast } from '../../lib/toast.js'

/* ============================================================
   NewsletterTab — מאגר נרשמי הניוזלטר (השאירו מייל בהסכמה).
   • רשימה + חיפוש + מחיקה
   • ייצוא CSV (לייבוא לכל מערכת ESP: Mailchimp / Brevo / ActiveCampaign)
   • וובהוק לאוטומציות: כל נרשם חדש נשלח אוטומטית ל-URL שמוגדר כאן
     (Make / Zapier / n8n / ESP) — שמירה אוטומטית.
   ============================================================ */
export default function NewsletterTab() {
  const [subs, setSubs] = useState(null)     // null = טוען
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [webhook, setWebhook] = useState('')
  const [whStatus, setWhStatus] = useState('saved')
  const whTimer = useRef()

  const load = () => {
    listSubscribers()
      .then((rows) => { setSubs(rows); setErr('') })
      .catch((e) => {
        const m = e.message || 'שגיאה'
        setErr(/schema cache|does not exist|find the table|relation/i.test(m) ? 'TABLE_MISSING' : m)
        setSubs([])
      })
  }
  useEffect(() => {
    load()
    fetchSettings().then((s) => setWebhook(s.newsletter_webhook || '')).catch(() => {})
  }, [])

  const saveWebhook = (value) => {
    setWebhook(value)
    clearTimeout(whTimer.current)
    setWhStatus('saving')
    whTimer.current = setTimeout(async () => {
      try { await setSetting('newsletter_webhook', value.trim()); setWhStatus('saved') }
      catch { setWhStatus('error'); toast.error('שמירת הוובהוק נכשלה') }
    }, 700)
  }

  const remove = (row) => {
    setSubs((prev) => prev.filter((s) => s.id !== row.id))
    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      try { await deleteSubscriber(row.id); toast.success('הנרשם הוסר מהמאגר') }
      catch { toast.error('המחיקה נכשלה'); load() }
    }, 5000)
    toast(`"${row.email}" יוסר מהמאגר`, {
      duration: 5000,
      action: { label: 'ביטול', onClick: () => { undone = true; clearTimeout(timer); load() } },
    })
  }

  const exportCsv = () => {
    const rows = filtered
    const head = 'email,subscribed_at,source'
    const body = rows.map((s) => `${s.email},${new Date(s.created_at).toISOString()},${s.source || 'site'}`).join('\n')
    const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(`יוצא קובץ עם ${rows.length} נרשמים`)
  }

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(filtered.map((s) => s.email).join(', '))
      toast.success('כל הכתובות הועתקו ללוח')
    } catch { toast.error('ההעתקה נכשלה') }
  }

  const filtered = useMemo(() => {
    const list = subs || []
    const needle = q.trim().toLowerCase()
    return needle ? list.filter((s) => s.email.includes(needle)) : list
  }, [subs, q])

  if (err === 'TABLE_MISSING') {
    return (
      <div className="adm-set" dir="rtl">
        <div className="adm-leads__setup">
          <strong>טבלת הניוזלטר עדיין לא נוצרה ב-Supabase.</strong>
          <span>היכנסו ל-Supabase → SQL Editor → הריצו את <code>supabase/migration.sql</code> המעודכן (החלק של newsletter_subscribers), ואז רעננו.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-set nlt" dir="rtl">
      {/* מאגר הנרשמים */}
      <section className="adm-set__card">
        <h3 className="adm-set__card-title">
          מאגר נרשמים
          {subs && <span className="nlt__count">{subs.length}</span>}
        </h3>
        <p className="adm-set__hint">כל מי שהשאיר את כתובת המייל שלו בטופס הניוזלטר באתר, עם תאריך ההרשמה. הנתונים שמורים בענן.</p>

        <div className="nlt__toolbar">
          <input
            type="search" className="nlt__search" dir="ltr"
            placeholder="חיפוש לפי אימייל…" aria-label="חיפוש נרשם"
            value={q} onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="adm-leads__btn" onClick={copyEmails} disabled={!filtered.length}>העתקת כל הכתובות</button>
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={exportCsv} disabled={!filtered.length}>⬇ ייצוא CSV ל-ESP</button>
        </div>

        {subs === null && <p className="ptab__muted">טוען…</p>}
        {subs !== null && filtered.length === 0 && (
          <p className="ptab__muted">{q ? `אין תוצאות עבור "${q}".` : 'עדיין אין נרשמים — ברגע שמישהו יירשם בניוזלטר באתר, הוא יופיע כאן.'}</p>
        )}
        {filtered.length > 0 && (
          <div className="nlt__table" role="table" aria-label="נרשמי ניוזלטר">
            <div className="nlt__tr nlt__tr--head" role="row">
              <span>אימייל</span><span>נרשם בתאריך</span><span>מקור</span><span />
            </div>
            {filtered.map((s) => (
              <div className="nlt__tr" role="row" key={s.id}>
                <span dir="ltr" className="nlt__email">{s.email}</span>
                <span>{new Date(s.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="nlt__source">{s.source || 'site'}</span>
                <button type="button" className="adm-set__rec-del" onClick={() => remove(s)} aria-label={`הסרת ${s.email}`}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* וובהוק לאוטומציות */}
      <section className="adm-set__card">
        <h3 className="adm-set__card-title">וובהוק לאוטומציות (ESP)
          <span className={`adm-set__status adm-set__status--${whStatus}`}>
            {whStatus === 'saving' ? 'שומר…' : whStatus === 'error' ? 'שגיאה' : '✓ נשמר'}
          </span>
        </h3>
        <p className="adm-set__hint">
          כל נרשם חדש יישלח אוטומטית (POST, JSON) לכתובת שתגדירו כאן — חיבור ישיר ל-Make / Zapier / n8n
          או ישירות ל-ESP. כך אפשר לבנות אוטומציה של צירוף לרשימת תפוצה ושליחת ניוזלטרים בלי קוד.
        </p>
        <label className="adm-set__field" style={{ marginTop: '0.5rem' }}>
          <span>כתובת Webhook (ריק = כבוי)</span>
          <input
            type="url" dir="ltr" placeholder="https://hook.eu1.make.com/..."
            value={webhook} onChange={(e) => saveWebhook(e.target.value)}
          />
        </label>
        <details className="adm-set__setup">
          <summary>מה נשלח בוובהוק?</summary>
          <p><code>{'{ "event": "newsletter_subscribe", "email": "...", "source": "site", "ts": "..." }'}</code> — מיד עם כל הרשמה. בנוסף, תמיד אפשר לייצא CSV ולייבא ידנית לכל מערכת דיוור.</p>
        </details>
      </section>
    </div>
  )
}
