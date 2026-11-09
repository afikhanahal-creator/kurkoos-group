import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import * as api from './api.js'
import { Icon } from './ui.jsx'

/* Sign-in for the finance system. The auth server (Supabase) hashes passwords, limits attempts and issues the session;
   this screen adds what a person needs: show the password, reset it, clear messages, and the second step (a code from an
   authenticator app) for the roles that require it. Secrets never pass through here: the TOTP secret is shown once as
   a QR code and lives on the auth server. */
const DEVICE_KEY = 'kc_fin_device'
/* GoTrue returns the QR as raw SVG text (self-hosted) or as a data URL (Supabase cloud): both become an image source */
export const qrSrc = (q) => (String(q || '').startsWith('data:') ? q : `data:image/svg+xml;utf8,${encodeURIComponent(String(q || ''))}`)
export const deviceId = () => { try { let v = localStorage.getItem(DEVICE_KEY); if (!v) { v = crypto.randomUUID().replace(/-/g, ''); localStorage.setItem(DEVICE_KEY, v) } return v } catch { return null } }

export function Login({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('login')   // login | reset
  const fails = useRef(0)
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
  return (
    <div className="fin-login" dir="rtl">
      <form className="fin-login__box" onSubmit={mode === 'login' ? submit : reset} noValidate>
        <img src="/kurkoos-logo.svg" alt="קבוצת קורקוס" className="fin-login__logo" />
        <h1>KURKOOS FINANCE</h1>
        <p>{mode === 'login' ? 'מערכת הכספים של קבוצת קורקוס. הכניסה למורשים בלבד.' : 'נשלח לך קישור לבחירת סיסמה חדשה.'}</p>
        <label>אימייל<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" inputMode="email" dir="ltr" autoFocus /></label>
        {mode === 'login' && (
          <label>סיסמה
            <span className="fin-login__pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" dir="ltr" />
              <button type="button" className="fin-icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'} aria-pressed={show}><Icon name={show ? 'moon' : 'sun'} size={17} /></button>
            </span>
          </label>
        )}
        {err && <p className="fin-error" role="alert">{err}</p>}
        {info && <p className="fin-note" role="status">{info}</p>}
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || !email || (mode === 'login' && !password)}>{busy ? 'רגע…' : mode === 'login' ? 'כניסה' : 'שליחת קישור לאיפוס'}</button>
        <button type="button" className="fin-link" onClick={() => { setMode((m) => (m === 'login' ? 'reset' : 'login')); setErr(''); setInfo('') }}>{mode === 'login' ? 'שכחתי את הסיסמה' : 'חזרה לכניסה'}</button>
        <small className="fin-login__foot">הכניסות נרשמות. אין להעביר את פרטי הכניסה לאחרים.</small>
      </form>
    </div>
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
    <div className="fin-login" dir="rtl">
      <form className="fin-login__box" onSubmit={verify} noValidate>
        <img src="/kurkoos-logo.svg" alt="קבוצת קורקוס" className="fin-login__logo" />
        {!hasFactor && !enroll ? (
          <>
            <h1>אימות דו-שלבי</h1>
            <p>{mfaRequired ? 'לתפקיד שלך נדרשת כניסה בשני שלבים: סיסמה, ואז קוד מאפליקציית אימות בטלפון (Google Authenticator, Microsoft Authenticator, 1Password).' : 'אפשר להוסיף לחשבון קוד מאפליקציית אימות בטלפון.'}</p>
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
                <p>אחרי הסריקה, הקלידו את הקוד בן 6 הספרות שהאפליקציה מציגה.</p>
              </>
            )}
            <label>קוד אימות<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" dir="ltr" className="fin-login__code" autoFocus aria-label="קוד אימות בן 6 ספרות" /></label>
            {err && <p className="fin-error" role="alert">{err}</p>}
            <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || code.length !== 6}>{busy ? 'בודק…' : 'אימות'}</button>
          </>
        )}
        <button type="button" className="fin-link" onClick={signOut}>יציאה</button>
      </form>
    </div>
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
