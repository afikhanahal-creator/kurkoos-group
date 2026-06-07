import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { supabase, isCmsEnabled } from '../lib/supabase.js'
import Icon from '../components/ui/Icon.jsx'
import StatsAdmin from '../components/admin/StatsAdmin.jsx'
import ProjectsAdmin from '../components/admin/ProjectsAdmin.jsx'
import LogosAdmin from '../components/admin/LogosAdmin.jsx'
import './Login.css'

/* ============================================================
   /login — כניסה אישית נסתרת (לא מקושרת בניווט) + פאנל ניהול.
   אימות אמיתי דרך Supabase Auth. אחרי התחברות: טאבים לעריכת
   פרויקטים, מונים ולוגואים — שמשתקפים באתר החי.
   ============================================================ */
const TABS = [
  { key: 'projects', he: 'פרויקטים', en: 'Projects' },
  { key: 'stats', he: 'מונים', en: 'Counters' },
  { key: 'logos', he: 'לוגואים', en: 'Logos' },
]

export default function Login() {
  const { lang } = useI18n()
  const he = lang === 'he'

  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('projects')

  useEffect(() => {
    if (!isCmsEnabled) { setReady(true); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setError(he ? 'פרטי התחברות שגויים.' : 'Invalid credentials.')
  }

  const signOut = () => supabase.auth.signOut()

  // ---- CMS לא מוגדר ----
  if (!isCmsEnabled) {
    return (
      <section className="login">
        <div className="login__card">
          <span className="login__icon"><Icon name="shield" size={26} /></span>
          <h1 className="login__title">{he ? 'המערכת אינה מחוברת' : 'CMS not connected'}</h1>
          <p className="login__sub">
            {he ? 'חסרים משתני הסביבה של Supabase. הגדירו אותם ופרסו מחדש.' : 'Supabase environment variables are missing. Configure and redeploy.'}
          </p>
        </div>
      </section>
    )
  }

  if (!ready) return <section className="login"><div className="login__card"><p>…</p></div></section>

  // ---- מסך התחברות ----
  if (!session) {
    return (
      <section className="login">
        <form className="login__card" onSubmit={signIn}>
          <span className="login__icon"><Icon name="shield" size={26} /></span>
          <h1 className="login__title">{he ? 'כניסה למערכת' : 'System login'}</h1>
          <p className="login__sub">{he ? 'אזור ניהול — כניסה מורשית בלבד.' : 'Admin area — authorized access only.'}</p>

          <label className="login__field">
            <span className="login__label">{he ? 'דוא"ל' : 'Email'}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" placeholder="name@example.com" />
          </label>
          <label className="login__field">
            <span className="login__label">{he ? 'סיסמה' : 'Password'}</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </label>

          {error && <p className="login__error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--lg login__submit" disabled={busy}>
            {busy ? (he ? 'מתחבר…' : 'Signing in…') : (he ? 'כניסה' : 'Enter')}
            <Icon name="arrow" size={18} />
          </button>
        </form>
      </section>
    )
  }

  // ---- פאנל ניהול ----
  return (
    <section className="admin">
      <div className="container">
        <header className="admin__head">
          <div>
            <span className="eyebrow">{he ? 'אזור ניהול' : 'Admin area'}</span>
            <h1 className="admin__title">{he ? 'ניהול תוכן — קורקוס גרופ' : 'Content management — Kurkoos Group'}</h1>
            <p className="admin__user">{session.user?.email}</p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={signOut}>{he ? 'יציאה' : 'Log out'}</button>
        </header>

        <nav className="admin__tabs">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              type="button"
              className={`admin__tab ${tab === tb.key ? 'is-active' : ''}`}
              onClick={() => setTab(tb.key)}
            >
              {he ? tb.he : tb.en}
            </button>
          ))}
        </nav>

        <div className="admin__panel">
          {tab === 'projects' && <ProjectsAdmin />}
          {tab === 'stats' && <StatsAdmin />}
          {tab === 'logos' && <LogosAdmin />}
        </div>
      </div>
    </section>
  )
}
