import { useState } from 'react'
import { supabase, hasSupabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/useAuth.js'
import ProjectsTab from './ProjectsTab.jsx'
import CountersTab from './CountersTab.jsx'
import LogosTab from './LogosTab.jsx'
import './admin.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setErr('פרטי התחברות שגויים. נסי שוב.')
  }

  return (
    <div className="adm-login">
      <form className="adm-login__box" onSubmit={submit}>
        <h1 className="adm-login__title">כניסת מנהל</h1>
        <p className="adm-login__sub">קורקוס גרופ · ניהול תוכן</p>
        <label>אימייל
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>סיסמה
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {err && <p className="adm-login__err">{err}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'מתחבר…' : 'כניסה'}</button>
      </form>
    </div>
  )
}

const TABS = [
  { id: 'projects', label: 'פרויקטים ונכסים' },
  { id: 'counters', label: 'מונים ומספרים' },
  { id: 'logos', label: 'לוגואים' },
]

export default function Admin() {
  const session = useAuth()
  const [tab, setTab] = useState('projects')

  if (!hasSupabase) return <div className="adm-msg">החיבור ל‑Supabase לא מוגדר (חסרים משתני סביבה).</div>
  if (session === undefined) return <div className="adm-msg">טוען…</div>
  if (session === null) return <Login />

  return (
    <div className="adm" dir="rtl">
      <header className="adm__bar">
        <div className="adm__brand">קורקוס גרופ · ניהול תוכן</div>
        <nav className="adm__tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`adm__tab ${tab === t.id ? 'adm__tab--active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="adm__user">
          <span>{session.user?.email}</span>
          <button type="button" className="adm__logout" onClick={() => supabase.auth.signOut()}>יציאה</button>
        </div>
      </header>
      <main className="adm__content">
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'counters' && <CountersTab />}
        {tab === 'logos' && <LogosTab />}
      </main>
    </div>
  )
}
