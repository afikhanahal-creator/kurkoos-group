import CompanySettings from './CompanySettings.jsx'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { supabase } from '../../lib/supabase.js'
import { deviceId, qrSrc } from './auth.jsx'
import { ROLE, nameOf } from './format.js'
import { useEffect, useState } from 'react'
import { Card, Icon, PageHead, Pill, useAsync, Skeleton, askConfirm } from './ui.jsx'

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
      <label className="fin-inline-label">אישור כפול לחשבונית מעל <input type="number" inputMode="decimal" className="fin-select fin-select--sm" value={f.second} onChange={(e) => setF({ ...f, second: Number(e.target.value) })} disabled={!admin} /> ₪</label>
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

/* the person's own protection: the second step, every device they are signed in on, and a way out of all of them */
function MySecurity() {
  const [state, setState] = useState({ factors: null, msg: '', err: '', busy: false, enroll: null, code: '' })
  const sec = useAsync(() => api.mySecurity(), [])
  const load = async () => { const { data } = await supabase.auth.mfa.listFactors(); setState((s) => ({ ...s, factors: (data?.totp || []).filter((f) => f.status === 'verified') })) }
  useEffect(() => { load() }, [])
  const set = (p) => setState((s) => ({ ...s, ...p }))
  const start = async () => {
    set({ busy: true, err: '', msg: '' })
    const { data: all } = await supabase.auth.mfa.listFactors()
    for (const f of (all?.all || []).filter((f) => f.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {})
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Kurkoos Finance ${new Date().toLocaleDateString('he-IL')}` })
    set({ busy: false, err: error?.message || '', enroll: error ? null : { id: data.id, qr: qrSrc(data.totp.qr_code), secret: data.totp.secret } })
  }
  const confirm = async (e) => {
    e.preventDefault(); set({ busy: true, err: '' })
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: state.enroll.id })
    const { error } = e1 ? { error: e1 } : await supabase.auth.mfa.verify({ factorId: state.enroll.id, challengeId: ch.id, code: state.code })
    if (error) { set({ busy: false, err: 'הקוד שגוי. נסו את הקוד הבא באפליקציה.' }); return }
    api.callServer('auth-event', { kind: 'mfa_enrolled', device_id: deviceId() }).catch(() => {})
    set({ busy: false, enroll: null, code: '', msg: 'אימות דו-שלבי הופעל. מעכשיו הכניסה דורשת גם קוד מהאפליקציה.' }); load()
  }
  const remove = async (f) => {
    if (sec.data?.mfa_required) { set({ err: 'לתפקיד שלך אימות דו-שלבי הוא חובה. אפשר להחליף אפליקציה אבל לא להסיר.' }); return }
    if (!(await askConfirm({ text: 'להסיר את אימות הדו-שלבי? הכניסה תדרוש סיסמה בלבד.', ok: 'הסרה', danger: true }))) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
    if (error) set({ err: error.message }); else { api.callServer('auth-event', { kind: 'mfa_removed', device_id: deviceId() }).catch(() => {}); set({ msg: 'אימות הדו-שלבי הוסר.' }); load() }
  }
  const signOutAll = async () => {
    if (!(await askConfirm({ text: 'לצאת מכל המכשירים? גם המכשיר הזה יתנתק ותצטרכו להתחבר שוב.', ok: 'יציאה' }))) return
    try { await api.callServer('auth-event', { kind: 'signed_out_all', device_id: deviceId() }) } catch { /* the sessions are ended by the server; signing out here too */ }
    await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut())
  }
  const on = (state.factors || []).length > 0
  return (
    <Card title="האבטחה שלי" className="fin-card--wide">
      <div className="fin-mysec">
        <div className="fin-mysec__row">
          <span className={`fin-mysec__icon ${on ? 'is-on' : ''}`}><Icon name="shield" size={20} /></span>
          <span className="fin-mysec__text"><strong>אימות דו-שלבי {on ? 'פעיל' : 'כבוי'}</strong><small>{sec.data?.mfa_required ? 'חובה לתפקיד שלך. ' : ''}{on ? 'בכל כניסה נדרש קוד מאפליקציית האימות בטלפון.' : 'קוד מאפליקציה בטלפון (Google Authenticator, Microsoft Authenticator, 1Password) בנוסף לסיסמה.'}</small></span>
          {state.factors === null ? null : on ? <button type="button" className="fin-btn fin-btn--sm" onClick={() => remove(state.factors[0])}>הסרה</button> : <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" onClick={start} disabled={state.busy}>הפעלה</button>}
        </div>
        {state.enroll && (
          <form className="fin-mysec__enroll" onSubmit={confirm}>
            <img src={state.enroll.qr} alt="קוד QR לאפליקציית האימות" className="fin-login__qr" />
            <div>
              <p>סרקו את הקוד באפליקציית האימות, ואז הקלידו את הקוד בן 6 הספרות שהיא מציגה.</p>
              <details className="fin-disclosure fin-disclosure--quiet"><summary>הזנה ידנית</summary><code dir="ltr" className="fin-login__secret">{state.enroll.secret}</code></details>
              <div className="fin-mysec__code"><input value={state.code} onChange={(e) => set({ code: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" autoComplete="one-time-code" dir="ltr" className="fin-login__code" aria-label="קוד אימות" /><button type="submit" className="fin-btn fin-btn--primary" disabled={state.busy || state.code.length !== 6}>אישור</button><button type="button" className="fin-link" onClick={() => set({ enroll: null, code: '' })}>ביטול</button></div>
            </div>
          </form>
        )}
        <div className="fin-mysec__row">
          <span className="fin-mysec__icon"><Icon name="logout" size={20} /></span>
          <span className="fin-mysec__text"><strong>יציאה מכל המכשירים</strong><small>מנתק את החשבון בכל טלפון ומחשב שהוא מחובר בהם. מומלץ אחרי אובדן טלפון. המערכת גם מתנתקת לבד אחרי {sec.data?.idle_minutes || 30} דקות בלי פעילות.</small></span>
          <button type="button" className="fin-btn fin-btn--sm" onClick={signOutAll}>יציאה מהכול</button>
        </div>
        {state.err && <p className="fin-error fin-error--block" role="alert">{state.err}</p>}
        {state.msg && <p className="fin-note" role="status">{state.msg}</p>}
      </div>
    </Card>
  )
}

/* the recovery link from "forgot my password" lands here: a new password, then the normal screen */
function NewPassword() {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [done, setDone] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setErr('')
    if (pw.length < 10) { setErr('הסיסמה צריכה להיות באורך 10 תווים לפחות.'); return }
    if (pw !== pw2) { setErr('שתי הסיסמאות לא זהות.'); return }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setErr(/weak|pwned|easy/i.test(error.message) ? 'הסיסמה חלשה או מוכרת מדליפות. בחרו סיסמה אחרת.' : error.message)
    else { setDone(true); setMsg('הסיסמה הוחלפה. החיבורים האחרים של החשבון נותקו.'); api.callServer('auth-event', { kind: 'signed_out_all', device_id: deviceId() }).catch(() => {}) }
  }
  if (done) return <Card title="סיסמה חדשה"><p className="fin-note" role="status">{msg}</p></Card>
  return (
    <Card title="בחירת סיסמה חדשה" className="fin-card--wide">
      <form className="fin-form__grid" onSubmit={save} noValidate>
        <label className="fin-field"><span className="fin-field__label">סיסמה חדשה</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" dir="ltr" minLength={10} /></label>
        <label className="fin-field"><span className="fin-field__label">שוב</span><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" dir="ltr" /></label>
        {err && <p className="fin-error fin-field--wide" role="alert">{err}</p>}
        <div className="fin-form__actions fin-field--wide"><button type="submit" className="fin-btn fin-btn--primary">שמירת הסיסמה</button></div>
      </form>
    </Card>
  )
}

/* system-wide sign-in policy (admins): which roles need the second step, and the idle sign-out */
function SecurityPolicy() {
  const { settings, can, reload, go } = useFinance()
  const admin = can('manage')
  const [roles, setRoles] = useState(() => (Array.isArray(settings.mfa_required_roles) ? settings.mfa_required_roles : []))
  const [idle, setIdle] = useState(() => Number(settings.idle_minutes ?? 30))
  const [msg, setMsg] = useState('')
  const check = useAsync(() => supabase.rpc('fin_session_check_ok').then((r) => r.data), [])
  const save = async () => {
    setMsg('')
    if (!roles.includes('admin') && !(await askConfirm({ text: 'להסיר את חובת האימות הדו-שלבי ממנהלי המערכת? למנהל יש גישה לכל המידע.', ok: 'להסיר בכל זאת', danger: true }))) return
    try { await api.saveSetting('mfa_required_roles', roles); await api.saveSetting('idle_minutes', Math.max(5, Math.min(480, idle))); setMsg('מדיניות הכניסה נשמרה. היא חלה מהכניסה הבאה של כל משתמש.'); reload() } catch (e) { setMsg(e.message) }
  }
  const toggle = (r) => setRoles((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))
  return (
    <Card title="מדיניות כניסה" className="fin-card--wide">
      <fieldset className="fin-cset__body" disabled={!admin}>
        <div className="fin-cset__grid">
          <div className="fin-cset__field is-wide"><span className="fin-cset__label">אימות דו-שלבי חובה ל:</span>
            <div className="fin-checkrow">{Object.entries(ROLE).map(([k, v]) => <label key={k} className="fin-check"><input type="checkbox" checked={roles.includes(k)} onChange={() => toggle(k)} /> {v}</label>)}</div>
            <small className="fin-cset__hint">האכיפה במסד הנתונים: בלי הקוד מהאפליקציה, תפקיד מסומן לא רואה נתונים, גם לא דרך ה-API.</small>
          </div>
          <label className="fin-cset__field"><span className="fin-cset__label">ניתוק אחרי חוסר פעילות (דקות)</span><input type="number" inputMode="numeric" min={5} max={480} value={idle} onChange={(e) => setIdle(Number(e.target.value))} /><small className="fin-cset__hint">דקה לפני הניתוק מופיעה אזהרה</small></label>
          <div className="fin-cset__field"><span className="fin-cset__label">ניתוק מיידי של חיבורים</span><span>{check.loading ? '…' : check.data === true ? <Pill tone="ok">פעיל</Pill> : <Pill tone="warn">לא זמין במסד הזה</Pill>}</span><small className="fin-cset__hint">{check.data === true ? 'חסימה ויציאה מכל המכשירים עוצרות גישה מיד' : 'חסימה עדיין חוסמת כניסה; חיבור פתוח נסגר כשהטוקן פג (עד שעה)'}</small></div>
        </div>
      </fieldset>
      {admin && <div className="fin-form__actions"><button type="button" className="fin-btn fin-btn--primary" onClick={save}>שמירת המדיניות</button><button type="button" className="fin-link" onClick={() => go('/users?tab=security')}>כניסות ואבטחה ←</button></div>}
      {msg && <p className="fin-note" role="status">{msg}</p>}
    </Card>
  )
}

const SECTIONS = [
  { id: 'account', label: 'החשבון שלי', icon: 'users', roles: null },
  { id: 'companies', label: 'חברות ודיווח', icon: 'company', roles: ['admin', 'finance_manager'] },
  { id: 'engine', label: 'זיהוי ושיוך', icon: 'sparkle', roles: ['admin', 'finance_manager'] },
  { id: 'security', label: 'אבטחת המערכת', icon: 'shield', roles: ['admin'] },
  { id: 'server', label: 'חיבורי השרת', icon: 'plug', roles: ['admin', 'finance_manager'] },
  { id: 'more', label: 'עוד הגדרות', icon: 'settings', roles: ['admin', 'finance_manager'] },
]

export default function Settings() {
  const { role, me, businesses, can, go } = useFinance()
  const [params, setParams] = useSearchParams()
  const [recovery, setRecovery] = useState(() => { try { return new URLSearchParams(window.location.search).get('reset') === '1' } catch { return false } })
  useEffect(() => { const { data } = supabase.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') setRecovery(true) }); return () => data.subscription.unsubscribe() }, [])
  const u = useSession()
  const sections = SECTIONS.filter((x) => !x.roles || x.roles.includes(role))
  const tab = sections.some((x) => x.id === params.get('tab')) ? params.get('tab') : recovery ? 'account' : sections[0].id
  const pick = (id) => { const p = new URLSearchParams(params); p.set('tab', id); setParams(p, { replace: true }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const status = useAsync(() => (tab === 'server' ? api.callServer('status').catch((e) => ({ error: e.message })) : Promise.resolve(null)), [tab])
  const ok = (k) => (k === 'gmail' || k === 'outlook' ? status.data?.providers?.[k] : status.data?.[k])
  const current = sections.find((x) => x.id === tab)
  return (
    <div className="fin-settings">
      <nav className="fin-settings__nav" aria-label="נושאי הגדרות">
        <h2 className="fin-pagehead__title">הגדרות</h2>
        <ul role="tablist">{sections.map((x) => <li key={x.id}><button type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'is-on' : ''} onClick={() => pick(x.id)}><Icon name={x.icon} size={18} /> {x.label}</button></li>)}</ul>
      </nav>
      <div className="fin-settings__main" role="tabpanel" aria-label={current?.label}>
        <h3 className="fin-settings__title">{current?.label}</h3>
        {tab === 'account' && (
          <div className="fin-stack">
            {recovery && <NewPassword />}
            <Card title="פרטי החשבון">
              <ul className="fin-kv">
                <li><span>אימייל</span><strong dir="ltr">{u?.email}</strong></li>
                <li><span>תפקיד</span><strong>{ROLE[role]}</strong></li>
                <li><span>חברות</span><strong>{me?.business_ids?.length ? me.business_ids.map((b) => nameOf(businesses, b)).join(', ') : 'כולן'}</strong></li>
              </ul>
            </Card>
            <MySecurity />
          </div>
        )}
        {tab === 'companies' && <CompanySettings />}
        {tab === 'engine' && <div className="fin-stack"><SmartSettings /></div>}
        {tab === 'security' && <div className="fin-stack"><SecurityPolicy />
          <Card title="איך המערכת מוגנת">
            <ul className="fin-bullets">
              <li><Icon name="shield" size={16} /> הרשאות נאכפות במסד הנתונים (RLS), לא רק במסכים</li>
              <li><Icon name="shield" size={16} /> הקבצים בדלי פרטי. אין קישורים ציבוריים למסמכים</li>
              <li><Icon name="shield" size={16} /> טוקנים של Google ו-Microsoft נשמרים בשרת בלבד, בהרשאת קריאה</li>
              <li><Icon name="shield" size={16} /> כל פעולה נרשמת ביומן, וכל כניסה וניסיון שנכשל ביומן הכניסות</li>
              <li><Icon name="shield" size={16} /> המערכת לא נמדדת ב-Google Analytics ולא נסרקת ע״י מנועי חיפוש</li>
            </ul>
          </Card></div>}
        {tab === 'server' && (
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
        {tab === 'more' && (
          <ul className="fin-settings__links">
            {[['/users', 'users', 'משתמשים והרשאות', 'הזמנות, תפקידים, חסימה וכניסות'], ['/categories', 'tag', 'קטגוריות הוצאה', 'הוספה ועריכה, אחוז מע״מ לקיזוז'], ['/automations', 'rules', 'כללים ואוטומציה', 'שיוך קבוע של ספקים, סף סכום'], ['/mailboxes', 'mail', 'תיבות מייל', 'Gmail ו-Outlook מחוברים'], ['/scanners', 'phone', 'מספרי WhatsApp', 'הטלפונים ששולחים חשבוניות'], ['/integrations', 'plug', 'תוכנת הנהלת חשבונות', 'ייצוא ומתאמים'], ['/cloud', 'cloud', 'סנכרון לענן', 'Google Drive ו-Dropbox'], ['/delivery', 'webhook', 'שליחה אוטומטית', 'Webhook ומייל לכל מסמך']]
              .filter(([path]) => can('manage') || !['/users', '/delivery'].includes(path))
              .map(([path, icon, title, sub]) => <li key={path}><button type="button" onClick={() => go(path)}><span className="fin-settings__icon"><Icon name={icon} size={19} /></span><span><strong>{title}</strong><small>{sub}</small></span><Icon name="next" size={16} /></button></li>)}
          </ul>
        )}
      </div>
    </div>
  )
}
