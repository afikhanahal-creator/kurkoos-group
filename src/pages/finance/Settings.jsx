import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { ROLE, nameOf } from './format.js'
import { useState } from 'react'
import { Card, Icon, PageHead, Pill, useAsync, Skeleton } from './ui.jsx'

function SmartSettings() {
  const { settings, can, reload } = useFinance()
  const [f, setF] = useState(() => ({ mode: settings.supplier_mode || 'controlled', sup: Number(settings.supplier_auto_threshold ?? 0.92), cat: Number(settings.category_auto_threshold ?? 0.85), proj: Number(settings.project_auto_threshold ?? 0.9), second: Number(settings.second_approval_amount ?? 50000), cpa: typeof settings.accountant_email === 'string' ? settings.accountant_email : '' }))
  const [msg, setMsg] = useState('')
  const admin = can('manage')
  const save = async () => {
    try {
      await api.saveSetting('supplier_mode', f.mode)
      await api.saveSetting('supplier_auto_threshold', f.sup)
      await api.saveSetting('category_auto_threshold', f.cat)
      await api.saveSetting('project_auto_threshold', f.proj)
      await api.saveSetting('second_approval_amount', f.second)
      const cpa = f.cpa.trim().toLowerCase()
      if (cpa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cpa)) { setMsg('כתובת המייל של רו״ח לא תקינה'); return }
      await api.saveSetting('accountant_email', cpa)
      setMsg('ההגדרות נשמרו. הן חלות על מסמכים שיעובדו מעכשיו.'); reload()
    } catch (e) { setMsg(e.message) }
  }
  const Slider = ({ k, label, hint }) => (
    <label className="fin-slider"><span>{label}<strong>{Math.round(f[k] * 100)}%</strong></span>
      <input type="range" min="0.5" max="1" step="0.01" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} disabled={!admin} />
      <small>{hint}</small>
    </label>
  )
  return (
    <Card title="זיהוי ושיוך אוטומטי" className="fin-card--wide">
      <fieldset className="fin-radio-cards" disabled={!admin}>
        <legend className="fin-sr">מצב יצירת ספקים</legend>
        <label className={f.mode === 'controlled' ? 'is-on' : ''}><input type="radio" name="mode" checked={f.mode === 'controlled'} onChange={() => setF({ ...f, mode: 'controlled' })} /><strong>מבוקר</strong><span>ספק חדש שזוהה בחשבונית נוצר כהצעה וממתין לאישור של מנהל כספים.</span></label>
        <label className={f.mode === 'automatic' ? 'is-on' : ''}><input type="radio" name="mode" checked={f.mode === 'automatic'} onChange={() => setF({ ...f, mode: 'automatic' })} /><strong>אוטומטי</strong><span>ספק חדש נוצר מיד, אם יש לו ח.פ, הוודאות מעל הסף ואין לו כפילות.</span></label>
      </fieldset>
      <div className="fin-sliders">
        {f.mode === 'automatic' && Slider({ k: 'sup', label: 'סף ליצירת ספק', hint: 'ודאות מינימלית בזיהוי השם ומספר העוסק' })}
        {Slider({ k: 'cat', label: 'סף לשיוך קטגוריה', hint: 'מתחת לסף: הצעה בלבד, אדם מחליט' })}
        {Slider({ k: 'proj', label: 'סף לשיוך פרויקט', hint: 'ספק שעובד בכמה פרויקטים לא משויך לפי שמו' })}
      </div>
      <label className="fin-inline-label">אישור כפול לחשבונית מעל <input type="number" className="fin-select fin-select--sm" value={f.second} onChange={(e) => setF({ ...f, second: Number(e.target.value) })} disabled={!admin} /> ₪</label>
      <label className="fin-field fin-field--cpa"><span className="fin-field__label">המייל הקבוע של רואה החשבון</span>
        <input type="email" dir="ltr" value={f.cpa} onChange={(e) => setF({ ...f, cpa: e.target.value })} placeholder="cpa@example.co.il" disabled={!admin} autoComplete="off" />
        <small className="fin-muted">מוצע בכל שליחה לרו״ח ובדוח החודשי. רו״ח שונה לחברה מוגדר בפרטי החברה.</small>
      </label>
      {admin && <div className="fin-form__actions"><button type="button" className="fin-btn fin-btn--primary" onClick={save}>שמירת ההגדרות</button></div>}
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {!admin && <p className="fin-muted fin-small">רק מנהל מערכת משנה את ההגדרות האלה.</p>}
    </Card>
  )
}

const ENV = [
  ['claude', 'ANTHROPIC_API_KEY', 'קריאת המסמכים ע״י Claude'],
  ['gmail', 'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET', 'חיבור Gmail / Google Workspace'],
  ['outlook', 'MS_CLIENT_ID + MS_CLIENT_SECRET', 'חיבור Outlook / Microsoft 365'],
  ['cron', 'CRON_SECRET', 'הריצה היומית האוטומטית'],
  ['email', 'RESEND_API_KEY', 'סיכום יומי והתראות במייל'],
]

export default function Settings() {
  const { role, me, businesses, can, go } = useFinance()
  const u = useSession()
  const status = useAsync(() => api.callServer('status').catch((e) => ({ error: e.message })), [])
  const ok = (k) => (k === 'gmail' || k === 'outlook' ? status.data?.providers?.[k] : status.data?.[k])
  return (
    <div className="fin-stack">
      <PageHead title="הגדרות" />
      <div className="fin-grid">
        {can('operate') && <SmartSettings />}
        <Card title="החשבון שלי">
          <ul className="fin-kv">
            <li><span>אימייל</span><strong dir="ltr">{u?.email}</strong></li>
            <li><span>תפקיד</span><strong>{ROLE[role]}</strong></li>
            <li><span>חברות</span><strong>{me?.business_ids?.length ? me.business_ids.map((b) => nameOf(businesses, b)).join(', ') : 'כולן'}</strong></li>
          </ul>
        </Card>
        {can('operate') && (
          <Card title="חיבורי השרת">
            {status.loading ? <Skeleton lines={4} /> : status.data?.error ? <p className="fin-muted"><Pill tone="warn">לא זמין כרגע</Pill> בדיקת החיבורים לא הצליחה. נסו לרענן בעוד דקה.</p> : (
              <ul className="fin-setup">{ENV.map(([k, , what]) => <li key={k}>{ok(k) ? <Pill tone="ok">פועל</Pill> : <Pill tone="warn">לא מחובר</Pill>}<span>{what}</span></li>)}</ul>
            )}
            {can('manage') && (
              <details className="fin-disclosure fin-disclosure--quiet">
                <summary>פרטים טכניים</summary>
                <ul className="fin-setup">{ENV.map(([k, env, what]) => <li key={k}><span>{what}</span><code dir="ltr">{env}</code></li>)}</ul>
                <p className="fin-muted fin-small">המפתחות נשמרים רק בהגדרות השרת (Vercel), אף פעם לא בקוד. ההוראות המלאות: docs/finance/README.md</p>
              </details>
            )}
          </Card>
        )}
        {can('manage') && (
          <Card title="הגדרה ראשונה">
            <ol className="fin-checklist">
              <li><button type="button" className="fin-link" onClick={() => go('/companies')}>החברות בקבוצה</button>: שם, ח.פ, מייל רו״ח</li>
              <li><button type="button" className="fin-link" onClick={() => go('/projects')}>הפרויקטים הפעילים</button> ומילות מפתח לזיהוי</li>
              <li><button type="button" className="fin-link" onClick={() => go('/mailboxes')}>חיבור תיבות המייל</button></li>
              <li><button type="button" className="fin-link" onClick={() => go('/users')}>הזמנת הצוות ורואה החשבון</button></li>
              <li><button type="button" className="fin-link" onClick={() => go('/automations')}>כללי שיוך</button> לספקים הקבועים</li>
            </ol>
          </Card>
        )}
        <Card title="אבטחה">
          <ul className="fin-bullets">
            <li><Icon name="shield" size={16} /> הרשאות נאכפות במסד הנתונים (RLS), לא רק במסכים</li>
            <li><Icon name="shield" size={16} /> הקבצים בדלי פרטי. אין קישורים ציבוריים למסמכים</li>
            <li><Icon name="shield" size={16} /> טוקנים של Google ו-Microsoft נשמרים בשרת בלבד, בהרשאת קריאה</li>
            <li><Icon name="shield" size={16} /> כל פעולה נרשמת ביומן. מסמך מאושר לא משתנה בלי שאדם יחזיר אותו לבדיקה</li>
            <li><Icon name="shield" size={16} /> הצפנה בתעבורה (HTTPS) ובמנוחה (Supabase)</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
