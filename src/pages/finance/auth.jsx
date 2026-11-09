import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import * as api from './api.js'
import { ProviderLogo } from './logos.jsx'
import { Icon } from './ui.jsx'

/* Sign-in for the finance system. The auth server (Supabase) hashes passwords, limits attempts and issues the session;
   this screen adds what a person needs: show the password, reset it, clear messages, sign-in with Google / Microsoft
   when those providers are enabled, the welcome step of an invited person (choose a password), and the second step
   (a code from an authenticator app) for the roles that require it. Secrets never pass through here. */
const DEVICE_KEY = 'kc_fin_device'
export const deviceId = () => { try { let v = localStorage.getItem(DEVICE_KEY); if (!v) { v = crypto.randomUUID().replace(/-/g, ''); localStorage.setItem(DEVICE_KEY, v) } return v } catch { return null } }
/* GoTrue returns the QR as raw SVG text (self-hosted) or as a data URL (Supabase cloud): both become an image source */
export const qrSrc = (q) => (String(q || '').startsWith('data:') ? q : `data:image/svg+xml;utf8,${encodeURIComponent(String(q || ''))}`)
/* the invitation link and the recovery link arrive with a type in the URL hash */
export { initialAuthType as linkType } from '../../lib/supabase.js'
const SSO = { google: { label: 'Google', provider: 'google' }, azure: { label: 'Microsoft', provider: 'azure', scopes: 'email' }, microsoft: { label: 'Microsoft', provider: 'azure', scopes: 'email' } }

/* The two-pane frame: the story of the product on one side, the task on the other. One column on a phone. */
export function AuthLayout({ children, aside = true }) {
  return (
    <div className="fin-login fin-auth" dir="rtl">
      <main className="fin-auth__pane">
        <img src="/kurkoos-logo-h.svg" alt="קבוצת קורקוס" className="fin-auth__logo" />
        {children}
        <p className="fin-auth__legal">מערכת פרטית של קבוצת קורקוס. הכניסה למוזמנים בלבד, והכניסות נרשמות.</p>
      </main>
      {aside && (
        <aside className="fin-auth__story" aria-hidden="true">
          <div className="fin-auth__story-in">
            <h2>מפסיקים לרדוף אחרי חשבוניות</h2>
            <p>כל חשבונית שמגיעה במייל או בוואטסאפ נקראת, מתויגת לחברה ולפרויקט ומחכה במקום אחד. לרו״ח נשאר רק לייצא.</p>
            <ul className="fin-auth__sources">
              <li className="is-wa"><ProviderLogo name="whatsapp" size={24} /></li>
              <li><Icon name="mail" size={22} /></li>
              <li><Icon name="upload" size={22} /></li>
            </ul>
            <div className="fin-auth__scan">
              <div className="fin-auth__receipt">
                <strong>חשמל ישראל</strong>
                <span>03.11 · ‎1,249.90 ₪</span>
                <i className="fin-auth__beam" />
              </div>
              <span className="fin-auth__read"><Icon name="check" size={13} /> נקראה</span>
            </div>
            <div className="fin-auth__summary">
              <header><strong>סקירה חודשית</strong><em>הדגמה</em></header>
              <div className="fin-auth__row"><span><Icon name="upload" size={14} /></span><span>‎642.50 ₪</span><b>רכב</b><span className="fin-auth__row-name">פז חברת נפט</span></div>
              <div className="fin-auth__row"><span><ProviderLogo name="whatsapp" size={14} /></span><span>‎1,180.00 ₪</span><b>חומרי בניין</b><span className="fin-auth__row-name">מתכת הצפון</span></div>
              <footer><span>מע״מ ‎2,014.33 ₪</span><strong>סה״כ ‎13,122.80 ₪</strong></footer>
            </div>
            <ul className="fin-auth__checks">
              <li><Icon name="check" size={15} /> נכנס לבד</li>
              <li><Icon name="check" size={15} /> מתויג לבד</li>
              <li><Icon name="check" size={15} /> ייצוא לרו״ח בלחיצה</li>
            </ul>
          </div>
        </aside>
      )}
    </div>
  )
}

function PasswordField({ value, onChange, autoComplete = 'current-password', label = 'סיסמה', minLength }) {
  const [show, setShow] = useState(false)
  return (
    <label>{label}
      <span className="fin-login__pw">
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} required autoComplete={autoComplete} dir="ltr" minLength={minLength} />
        <button type="button" className="fin-icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'} aria-pressed={show}><Icon name={show ? 'moon' : 'sun'} size={17} /></button>
      </span>
    </label>
  )
}

export function Login({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('login')   // login | reset
  const [sso, setSso] = useState([])
  const fails = useRef(0)
  useEffect(() => {
    // which sign-in providers the server says are enabled (set after enabling them in Supabase Auth); none by default
    fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'public-config' }) }).then((r) => r.json()).then((d) => setSso((d.sso || []).filter((k) => SSO[k]))).catch(() => {})
  }, [])
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (!error) { fails.current = 0; onSignedIn?.(); return }
    fails.current++
    // the server keeps a line per failed attempt (email and time only); the auth server locks on its own
    fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login-failed', email: email.trim() }) }).catch(() => {})
    const msg = String(error.message || '')
    if (/banned|not allowed/i.test(msg)) setErr('החשבון הזה חסום. פנו למנהל המערכת.')
    else if (/rate limit|too many/i.test(msg)) setErr('יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.')
    else if (/not confirmed/i.test(msg)) setErr('המייל עוד לא אושר. פתחו את מייל ההזמנה ולחצו על הקישור.')
    else setErr(fails.current >= 3 ? 'האימייל או הסיסמה שגויים. אפשר לאפס את הסיסמה למטה.' : 'האימייל או הסיסמה שגויים.')
  }
  const reset = async (e) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/finance/settings?reset=1` })
    setBusy(false)
    // the same message whether the address exists or not: the screen never says who has an account
    if (error && /rate limit/i.test(error.message)) setErr('יותר מדי בקשות. נסו שוב בעוד כמה דקות.')
    else setInfo('אם הכתובת רשומה במערכת, נשלח אליה עכשיו קישור לאיפוס הסיסמה. הקישור בתוקף שעה.')
  }
  const social = async (k) => {
    setErr('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: SSO[k].provider, options: { redirectTo: `${window.location.origin}/admin/finance`, scopes: SSO[k].scopes } })
    if (error) setErr(`הכניסה עם ${SSO[k].label} לא זמינה כרגע: ${error.message}`)
  }
  return (
    <AuthLayout>
      <form className="fin-login__box fin-auth__form" onSubmit={mode === 'login' ? submit : reset} noValidate>
        <h1>{mode === 'login' ? 'ברוכים הבאים ל-Kurkoos Finance' : 'איפוס סיסמה'}</h1>
        <p className="fin-auth__sub">{mode === 'login' ? 'החשבוניות של הקבוצה, במקום אחד. היכנסו עם המייל שהוזמנתם איתו.' : 'נשלח לך למייל קישור לבחירת סיסמה חדשה.'}</p>
        {mode === 'login' && sso.length > 0 && (
          <>
            <div className="fin-auth__sso">
              {sso.map((k) => <button key={k} type="button" className="fin-btn fin-auth__sso-btn" onClick={() => social(k)}><ProviderLogo name={k === 'azure' ? 'outlook' : 'gmail'} size={18} /> המשך עם {SSO[k].label}</button>)}
            </div>
            <div className="fin-auth__or"><span>או במייל</span></div>
          </>
        )}
        <label>אימייל<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" inputMode="email" dir="ltr" autoFocus placeholder="name@company.co.il" /></label>
        {mode === 'login' && <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />}
        {err && <p className="fin-error" role="alert">{err}</p>}
        {info && <p className="fin-note" role="status">{info}</p>}
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || !email || (mode === 'login' && !password)}>{busy ? 'רגע…' : mode === 'login' ? 'כניסה' : 'שליחת קישור לאיפוס'}</button>
        <button type="button" className="fin-link" onClick={() => { setMode((m) => (m === 'login' ? 'reset' : 'login')); setErr(''); setInfo('') }}>{mode === 'login' ? 'שכחתי את הסיסמה' : 'חזרה לכניסה'}</button>
        {mode === 'login' && <p className="fin-auth__invite">עוד אין לך חשבון? ההצטרפות היא בהזמנה ממנהל המערכת: קיבלת מייל הזמנה? פתח/י אותו ובחר/י סיסמה.</p>}
      </form>
    </AuthLayout>
  )
}

/* The invited person's first visit: the invitation link signed them in; they choose a password and their name. */
export function InviteWelcome({ email, onDone }) {
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setErr('')
    if (pw.length < 10) { setErr('הסיסמה צריכה להיות באורך 10 תווים לפחות.'); return }
    if (pw !== pw2) { setErr('שתי הסיסמאות לא זהות.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw, data: name.trim() ? { full_name: name.trim() } : undefined })
    setBusy(false)
    if (error) { setErr(/weak|pwned|easy/i.test(error.message) ? 'הסיסמה חלשה או מוכרת מדליפות. בחרו סיסמה אחרת.' : error.message); return }
    try { history.replaceState(null, '', window.location.pathname) } catch { /* noop */ }
    onDone()
  }
  return (
    <AuthLayout>
      <form className="fin-login__box fin-auth__form" onSubmit={save} noValidate>
        <h1>ברוכים הבאים</h1>
        <p className="fin-auth__sub">ההזמנה אושרה עבור <bdi dir="ltr">{email}</bdi>. עוד שני שדות וזהו.</p>
        <label>שם מלא<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="כפי שיופיע ביומן ובמיילים" /></label>
        <PasswordField label="סיסמה (10 תווים לפחות)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={10} />
        <PasswordField label="הסיסמה שוב" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={10} />
        {err && <p className="fin-error" role="alert">{err}</p>}
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || pw.length < 10 || !pw2}>{busy ? 'שומר…' : 'כניסה למערכת'}</button>
      </form>
    </AuthLayout>
  )
}

/* The second step. Required roles: a code from an authenticator app on every sign-in; the first time, the app is
   set up here with a QR code. Nothing in the system opens before this passes (and the database refuses too). */
export function SecondStep({ mfaRequired, onDone }) {
  const [factors, setFactors] = useState(null)
  const [enroll, setEnroll] = useState(null)     // { id, qr, secret }
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [tries, setTries] = useState(0)
  useEffect(() => { supabase.auth.mfa.listFactors().then(({ data }) => setFactors((data?.totp || []).filter((f) => f.status === 'verified'))) }, [])
  const startEnroll = async () => {
    setErr(''); setBusy(true)
    // an unfinished earlier attempt (the page was closed mid-way) is removed first, or the next enrol is refused
    const { data: all } = await supabase.auth.mfa.listFactors()
    for (const f of (all?.all || []).filter((f) => f.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {})
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Kurkoos Finance ${new Date().toLocaleDateString('he-IL')}` })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setEnroll({ id: data.id, qr: qrSrc(data.totp.qr_code), secret: data.totp.secret })
  }
  const verify = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const factorId = enroll?.id || factors?.[0]?.id
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId })
    if (e1) { setBusy(false); setErr(e1.message); return }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.replace(/\D/g, '') })
    setBusy(false)
    if (error) { setTries((t) => t + 1); setCode(''); api.callServer('auth-event', { kind: 'mfa_failed', device_id: deviceId() }).catch(() => {}); setErr(tries >= 4 ? 'הקוד שגוי שוב. בדקו שהשעון בטלפון מדויק, או התחברו מחדש.' : 'הקוד שגוי או שפג תוקפו. נסו את הקוד הבא.'); return }
    api.callServer('auth-event', { kind: enroll ? 'mfa_enrolled' : 'mfa_verified', device_id: deviceId() }).catch(() => {})
    onDone()
  }
  const signOut = () => supabase.auth.signOut()
  if (factors === null) return <div className="fin-boot" role="status" aria-label="טוען"><img src="/kurkoos-logo.svg" alt="" /><span /></div>
  const hasFactor = factors.length > 0
  return (
    <AuthLayout>
      <form className="fin-login__box fin-auth__form" onSubmit={verify} noValidate>
        {!hasFactor && !enroll ? (
          <>
            <span className="fin-auth__shield"><Icon name="shield" size={26} /></span>
            <h1>אימות דו-שלבי</h1>
            <p className="fin-auth__sub">{mfaRequired ? 'לתפקיד שלך נדרשת כניסה בשני שלבים: סיסמה, ואז קוד מאפליקציית אימות בטלפון (Google Authenticator, Microsoft Authenticator, 1Password).' : 'אפשר להוסיף לחשבון קוד מאפליקציית אימות בטלפון.'}</p>
            <button type="button" className="fin-btn fin-btn--primary" onClick={startEnroll} disabled={busy}><Icon name="shield" size={17} /> {busy ? 'מכין…' : 'הגדרת אפליקציית אימות'}</button>
            {!mfaRequired && <button type="button" className="fin-link" onClick={onDone}>לא עכשיו</button>}
          </>
        ) : (
          <>
            <h1>{enroll ? 'סריקת הקוד באפליקציה' : 'קוד מהאפליקציה'}</h1>
            {enroll && (
              <>
                <img src={enroll.qr} alt="קוד QR לאפליקציית האימות" className="fin-login__qr" />
                <details className="fin-disclosure fin-disclosure--quiet"><summary>אי אפשר לסרוק? הזנה ידנית</summary><code dir="ltr" className="fin-login__secret">{enroll.secret}</code></details>
                <p className="fin-auth__sub">אחרי הסריקה, הקלידו את הקוד בן 6 הספרות שהאפליקציה מציגה.</p>
              </>
            )}
            {!enroll && <p className="fin-auth__sub">פתחו את אפליקציית האימות בטלפון והקלידו את הקוד של Kurkoos Finance.</p>}
            <label>קוד אימות<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" dir="ltr" className="fin-login__code" autoFocus aria-label="קוד אימות בן 6 ספרות" /></label>
            {err && <p className="fin-error" role="alert">{err}</p>}
            <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || code.length !== 6}>{busy ? 'בודק…' : 'אימות'}</button>
          </>
        )}
        <button type="button" className="fin-link" onClick={signOut}>יציאה</button>
      </form>
    </AuthLayout>
  )
}

/* signs out after a quiet period (any key, tap or scroll resets it); a minute before, a bar says so */
export function useIdleSignOut(minutes, enabled) {
  const [soon, setSoon] = useState(false)
  useEffect(() => {
    if (!enabled || !minutes) return undefined
    let last = Date.now(); let warned = false
    const bump = () => { last = Date.now(); if (warned) { warned = false; setSoon(false) } }
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'visibilitychange']
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const t = setInterval(async () => {
      const idle = (Date.now() - last) / 60_000
      if (idle >= minutes) { clearInterval(t); try { await api.callServer('auth-event', { kind: 'idle_timeout', device_id: deviceId() }) } catch { /* the session may already be gone */ } await supabase.auth.signOut(); return }
      if (idle >= minutes - 1 && !warned) { warned = true; setSoon(true) }
    }, 5000)
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, bump)) }
  }, [minutes, enabled])
  return soon
}
