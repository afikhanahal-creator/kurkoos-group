import { useState } from 'react'
import { supabase, hasSupabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/useAuth.js'
import ProjectsTab from './ProjectsTab.jsx'
import CountersTab from './CountersTab.jsx'
import LogosTab from './LogosTab.jsx'
import LeadsTab from './LeadsTab.jsx'
import FontsTab from './FontsTab.jsx'
import './admin.css'

/* אייקונים מינימליים (inline — ללא תלות חיצונית) */
const Ico = {
  projects: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" /><path d="M9 9v0M9 12v0M9 15v0" /></svg>,
  counters: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 19V10M10 19V5M16 19v-7M22 19H2" /></svg>,
  logos: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="14" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="M21 15l-5-4-9 7" /></svg>,
  leads: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  logout: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
  external: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  fonts: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 20V5a1 1 0 0 1 1-1h7M9 20h6M17 20v-9a1 1 0 0 1 1-1h2M9 4v16" /></svg>,
}

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
    if (error) setErr('פרטי התחברות שגויים. נסו שוב.')
  }

  return (
    <div className="adm-login" dir="rtl">
      <div className="adm-login__aside" aria-hidden="true">
        <img className="adm-login__logo" src="/kurkoos-logo-white.svg" alt="Kurkoos Group" />
        <h2>קורקוס גרופ</h2>
        <p>מערכת ניהול התוכן — פרויקטים, נכסים, מונים ולוגואים, במקום אחד.</p>
      </div>
      <form className="adm-login__box" onSubmit={submit}>
        <span className="adm-login__lock"><Ico.lock width={22} height={22} /></span>
        <h1 className="adm-login__title">כניסת מנהל</h1>
        <p className="adm-login__sub">התחברו כדי לנהל את תוכן האתר</p>
        <label>אימייל
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" placeholder="name@kurkoos.co.il" />
        </label>
        <label>סיסמה
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
        </label>
        {err && <p className="adm-login__err">{err}</p>}
        <button type="submit" className="btn btn--primary adm-login__submit" disabled={busy}>{busy ? 'מתחבר…' : 'כניסה למערכת'}</button>
      </form>
    </div>
  )
}

const TABS = [
  { id: 'projects', label: 'פרויקטים ונכסים', sub: 'נהלו פרויקטים, נכסים ועמודי תצוגה', icon: 'projects' },
  { id: 'counters', label: 'מונים ומספרים', sub: 'הנתונים שמופיעים באתר', icon: 'counters' },
  { id: 'logos', label: 'לוגואים', sub: 'קרוסלת השותפים והלקוחות', icon: 'logos' },
  { id: 'leads', label: 'לידים', sub: 'ניהול פניות ולקוחות פוטנציאליים', icon: 'leads' },
  { id: 'fonts', label: 'פונטים', sub: 'הפונטים של האתר — בחירה או העלאה', icon: 'fonts' },
]

export default function Admin() {
  const session = useAuth()
  const [tab, setTab] = useState('projects')

  if (!hasSupabase) return <div className="adm-msg">החיבור ל‑Supabase לא מוגדר (חסרים משתני סביבה).</div>
  if (session === undefined) return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען…</div>
  if (session === null) return <Login />

  const active = TABS.find((t) => t.id === tab) || TABS[0]
  const email = session.user?.email || ''
  const initials = (email[0] || 'A').toUpperCase()

  return (
    <div className="adm" dir="rtl">
      <aside className="adm__sidebar">
        <div className="adm__logo">
          <img className="adm__logo-img" src="/kurkoos-logo-white.svg" alt="Kurkoos Group" />
          <span className="adm__logo-caption">ניהול תוכן</span>
        </div>

        <nav className="adm__nav" aria-label="ניווט ראשי">
          {TABS.map((t) => {
            const I = Ico[t.icon]
            return (
              <button
                key={t.id}
                type="button"
                className={`adm__nav-item ${tab === t.id ? 'adm__nav-item--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <I width={20} height={20} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="adm__sidebar-foot">
          <a className="adm__view-site" href="/" target="_blank" rel="noopener noreferrer">
            <Ico.external width={16} height={16} /> צפייה באתר
          </a>
          <div className="adm__user">
            <span className="adm__avatar">{initials}</span>
            <span className="adm__user-meta"><strong>{email.split('@')[0]}</strong><small>{email}</small></span>
            <button type="button" className="adm__logout" onClick={() => supabase.auth.signOut()} aria-label="יציאה">
              <Ico.logout width={18} height={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="adm__main">
        <header className="adm__topbar">
          <div className="adm__topbar-head">
            <h1 className="adm__page-title">{active.label}</h1>
            <p className="adm__page-sub">{active.sub}</p>
          </div>
        </header>
        <main className="adm__content">
          {tab === 'projects' && <ProjectsTab />}
          {tab === 'counters' && <CountersTab />}
          {tab === 'logos' && <LogosTab />}
          {tab === 'leads' && <LeadsTab />}
          {tab === 'fonts' && <FontsTab />}
        </main>
      </div>
    </div>
  )
}
