import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabase, hasSupabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/useAuth.js'
import * as api from './api.js'
import { ROLE, can } from './format.js'
import { Icon } from './ui.jsx'
import Dashboard from './Dashboard.jsx'
import Documents from './Documents.jsx'
import Companies from './Companies.jsx'
import Projects from './Projects.jsx'
import Suppliers from './Suppliers.jsx'
import Reports from './Reports.jsx'
import DataManagement from './DataManagement.jsx'
import Automations from './Automations.jsx'
import Agents from './Agents.jsx'
import Mailboxes from './Mailboxes.jsx'
import Integrations from './Integrations.jsx'
import ExportHistory from './ExportHistory.jsx'
import Users from './Users.jsx'
import Settings from './Settings.jsx'
import './finance.css'

/* ============================================================
   KURKOOS FINANCE AI — the group's internal invoice and bookkeeping system.
   /admin/finance · schema: supabase/finance.sql · server: server/finance.js + server/finance/
   What a person sees follows their role (format.js › can); the database enforces the same rules.
   ============================================================ */

export const BASE = '/admin/finance'
const ALL = ['admin', 'finance_manager', 'employee', 'accountant']
const OPS = ['admin', 'finance_manager']
export const NAV = [
  { to: '', label: 'לוח בקרה', icon: 'home', roles: ALL, el: <Dashboard /> },
  { to: '/documents', label: 'כל המסמכים', accLabel: 'מסמכים מאושרים', icon: 'docs', roles: ALL, el: <Documents preset="all" /> },
  { to: '/new', label: 'חשבוניות חדשות', icon: 'inbox', roles: ['admin', 'finance_manager', 'employee'], el: <Documents preset="new" />, badge: 'new' },
  { to: '/pending', label: 'ממתינים לאישור', icon: 'clock', roles: OPS, el: <Documents preset="pending" />, badge: 'pending' },
  { to: '/companies', label: 'חברות', icon: 'company', roles: OPS, el: <Companies /> },
  { to: '/projects', label: 'פרויקטים', icon: 'project', roles: OPS, el: <Projects /> },
  { to: '/suppliers', label: 'ספקים', icon: 'suppliers', roles: OPS, el: <Suppliers /> },
  { to: '/reports', label: 'דוחות', icon: 'reports', roles: ['admin', 'finance_manager', 'accountant'], el: <Reports /> },
  { to: '/data', label: 'ניהול נתונים', icon: 'data', roles: OPS, el: <DataManagement /> },
  { to: '/automations', label: 'כללי אוטומציה', icon: 'rules', roles: OPS, el: <Automations /> },
  { to: '/agents', label: 'סוכני AI', icon: 'agents', roles: OPS, el: <Agents /> },
  { to: '/mailboxes', label: 'חשבונות מייל מחוברים', icon: 'mail', roles: ['admin', 'finance_manager', 'employee'], el: <Mailboxes /> },
  { to: '/integrations', label: 'אינטגרציות הנהלת חשבונות', icon: 'plug', roles: OPS, el: <Integrations /> },
  { to: '/exports', label: 'היסטוריית ייצוא', icon: 'history', roles: ['admin', 'finance_manager', 'accountant'], el: <ExportHistory /> },
  { to: '/users', label: 'משתמשים והרשאות', icon: 'users', roles: ['admin'], el: <Users /> },
  { to: '/settings', label: 'הגדרות', icon: 'settings', roles: ALL, el: <Settings /> },
]

const Ctx = createContext(null)
export const useFinance = () => useContext(Ctx)

function useFinanceData(enabled) {
  const [state, setState] = useState({ loading: true, error: '', me: null, documents: [], businesses: [], projects: [], categories: [], suppliers: [], mailboxes: [], members: [] })
  const reload = useCallback(async () => {
    try {
      const me = await api.me()
      if (!me?.role) { setState((s) => ({ ...s, loading: false, error: '', me })); return }
      const [documents, businesses, projects, categories, suppliers, mailboxes, members] = await Promise.all([
        api.loadDocuments(), api.loadBusinesses(), api.loadProjects(), api.loadCategories(), api.loadSuppliers(), api.loadMailboxes(), api.loadMembers(),
      ])
      setState({ loading: false, error: '', me, documents, businesses, projects, categories, suppliers, mailboxes, members })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: /does not exist|schema cache|fin_me/.test(e.message) ? 'הטבלאות של המערכת עוד לא קיימות. מריצים את supabase/finance.sql ב-Supabase › SQL Editor' : e.message }))
    }
  }, [])
  useEffect(() => { if (enabled) reload() }, [enabled, reload])
  const reading = state.documents.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!reading) return undefined
    const t = setInterval(reload, 4000)
    return () => clearInterval(t)
  }, [reading, reload])
  const patchDoc = useCallback((doc) => setState((s) => ({ ...s, documents: s.documents.map((d) => (d.id === doc.id ? doc : d)) })), [])
  return { ...state, reload, patchDoc }
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
    <div className="fin-login" dir="rtl">
      <form className="fin-login__box" onSubmit={submit}>
        <img src="/kurkoos-logo.svg" alt="קבוצת קורקוס" className="fin-login__logo" />
        <h1>KURKOOS FINANCE AI</h1>
        <p>איסוף חשבוניות, בקרה ואישור, וייצוא לרואה החשבון.</p>
        <label>אימייל<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label>סיסמה<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {err && <p className="fin-error" role="alert">{err}</p>}
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy}>{busy ? 'מתחבר…' : 'כניסה'}</button>
      </form>
    </div>
  )
}

function NoAccess({ me, email, onClaimed }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const claim = async () => {
    setBusy(true); setErr('')
    try { await api.claimAdmin(); onClaimed() } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <div className="fin-login" dir="rtl">
      <div className="fin-login__box">
        <img src="/kurkoos-logo.svg" alt="קבוצת קורקוס" className="fin-login__logo" />
        {me?.has_members ? (
          <>
            <h1>אין לך גישה למערכת</h1>
            <p>החשבון <span dir="ltr">{email}</span> עוד לא הוזמן למערכת הנהלת החשבונות. בקשו ממנהל המערכת הזמנה.</p>
          </>
        ) : (
          <>
            <h1>הגדרה ראשונה</h1>
            <p>עוד אין משתמשים במערכת. מי שלוחץ כאן נהיה מנהל המערכת, ויכול להזמין את שאר הצוות ואת רואה החשבון.</p>
            <button type="button" className="fin-btn fin-btn--primary" onClick={claim} disabled={busy}>{busy ? 'מגדיר…' : 'אני מנהל/ת המערכת'}</button>
          </>
        )}
        {err && <p className="fin-error" role="alert">{err}</p>}
        <button type="button" className="fin-link" onClick={() => supabase.auth.signOut()}>התנתקות</button>
      </div>
    </div>
  )
}

const THEME_KEY = 'kurkoos-adm-theme'

export default function FinanceApp() {
  const session = useAuth()
  const data = useFinanceData(!!session)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(THEME_KEY) || 'light' } catch { return 'light' } })
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ } }, [theme])
  useEffect(() => { document.title = 'Kurkoos Finance AI · קבוצת קורקוס' }, [])
  useEffect(() => { setNavOpen(false) }, [pathname])
  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  const role = data.me?.role || null
  const ctx = useMemo(() => ({ ...data, role, can: (w) => can(role, w), go: (p) => navigate(`${BASE}${p}`) }), [data, role, navigate])
  const nav = NAV.filter((n) => role && n.roles.includes(role))
  const sub = pathname.slice(BASE.length).replace(/\/$/, '') || ''
  const active = nav.find((n) => (n.to === '' ? sub === '' : sub === n.to || sub.startsWith(`${n.to}/`))) || nav[0]
  const badges = useMemo(() => {
    const week = Date.now() - 7 * 86400_000
    return {
      new: data.documents.filter((d) => new Date(d.created_at).getTime() > week && ['review', 'processing'].includes(d.status)).length,
      pending: data.documents.filter((d) => d.status === 'review').length,
    }
  }, [data.documents])

  if (!hasSupabase) return <p className="fin-msg">Supabase לא מוגדר בסביבה הזו.</p>
  if (session === undefined || (session && data.loading && !data.me)) return <div className="fin-msg">טוען…</div>
  if (!session) return <Login />
  const email = session.user?.email || ''
  if (data.error && !data.me) return <div className="fin-login" dir="rtl"><div className="fin-login__box"><h1>שגיאה</h1><p className="fin-error">{data.error}</p></div></div>
  if (!role) return <NoAccess me={data.me} email={email} onClaimed={data.reload} />

  return (
    <Ctx.Provider value={ctx}>
      <div className="fin" dir="rtl" data-theme={theme}>
        <aside className={`fin__side ${navOpen ? 'is-open' : ''}`} id="fin-side" aria-label="תפריט המערכת">
          <Link to={BASE} className="fin__brand">
            <img src="/kurkoos-logo-white.svg" alt="" />
            <span><strong>KURKOOS FINANCE</strong><small>קבוצת קורקוס · AI</small></span>
          </Link>
          <nav className="fin__nav">
            {nav.map((n) => {
              const on = n === active
              const count = n.badge ? badges[n.badge] : 0
              return (
                <Link key={n.to} to={`${BASE}${n.to}`} className={`fin__nav-item ${on ? 'is-active' : ''}`} aria-current={on ? 'page' : undefined}>
                  <Icon name={n.icon} size={19} />
                  <span>{role === 'accountant' && n.accLabel ? n.accLabel : n.label}</span>
                  {count > 0 && <em className="fin__badge" aria-label={`${count} פריטים`}>{count}</em>}
                </Link>
              )
            })}
          </nav>
          <div className="fin__side-foot">
            {role === 'admin' && <a href="/admin" className="fin__back"><Icon name="back" size={16} /> ניהול האתר</a>}
            <div className="fin__user">
              <span className="fin__avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
              <span className="fin__user-meta"><strong>{ROLE[role]}</strong><small dir="ltr">{email}</small></span>
              <button type="button" className="fin-icon-btn" onClick={() => supabase.auth.signOut()} aria-label="יציאה" title="יציאה"><Icon name="logout" /></button>
            </div>
          </div>
        </aside>
        {navOpen && <button type="button" className="fin__scrim" aria-label="סגירת התפריט" onClick={() => setNavOpen(false)} />}

        <div className="fin__main">
          <header className="fin__top">
            <button type="button" className="fin-icon-btn fin__burger" onClick={() => setNavOpen(true)} aria-label="פתיחת התפריט" aria-expanded={navOpen} aria-controls="fin-side"><Icon name="menu" /></button>
            <h1 className="fin__title">{role === 'accountant' && active?.accLabel ? active.accLabel : active?.label}</h1>
            <div className="fin__top-actions">
              <button type="button" className="fin-icon-btn" onClick={data.reload} aria-label="רענון" title="רענון"><Icon name="refresh" /></button>
              <button type="button" className="fin-icon-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'} title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            </div>
          </header>
          <main className="fin__content" id="fin-main">
            {data.error && <p className="fin-error fin-error--block" role="alert">{data.error}</p>}
            <Routes>
              {nav.map((n) => <Route key={n.to} path={`${BASE}${n.to}`} element={n.el} />)}
              {nav.filter((n) => ['/documents', '/new', '/pending'].includes(n.to)).map((n) => <Route key={`${n.to}-id`} path={`${BASE}${n.to}/:id`} element={n.el} />)}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  )
}
