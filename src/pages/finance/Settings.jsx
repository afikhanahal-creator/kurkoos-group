import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { ROLE, nameOf } from './format.js'
import { Card, Icon, PageHead, Pill, useAsync } from './ui.jsx'

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
        <Card title="החשבון שלי">
          <ul className="fin-kv">
            <li><span>אימייל</span><strong dir="ltr">{u?.email}</strong></li>
            <li><span>תפקיד</span><strong>{ROLE[role]}</strong></li>
            <li><span>חברות</span><strong>{me?.business_ids?.length ? me.business_ids.map((b) => nameOf(businesses, b)).join(', ') : 'כולן'}</strong></li>
          </ul>
        </Card>
        {can('operate') && (
          <Card title="חיבורי השרת">
            {status.loading ? <p className="fin-muted">בודק…</p> : status.data?.error ? <p className="fin-error">{status.data.error}</p> : (
              <ul className="fin-setup">{ENV.map(([k, env, what]) => <li key={k}>{ok(k) ? <Pill tone="ok">מוגדר</Pill> : <Pill tone="warn">חסר</Pill>}<span>{what}</span><code dir="ltr">{env}</code></li>)}</ul>
            )}
            <p className="fin-muted">המפתחות נשמרים רק ב-Vercel › Settings › Environment Variables, אף פעם לא בקוד. ההוראות המלאות: docs/finance/README.md</p>
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
