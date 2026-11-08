import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabase, hasSupabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/useAuth.js'
import * as api from './api.js'
import Dashboard from './Dashboard.jsx'
import Documents from './Documents.jsx'
import Suppliers from './Suppliers.jsx'
import Mailboxes from './Mailboxes.jsx'
import ExportPage from './ExportPage.jsx'
import Settings from './Settings.jsx'
import { Icon } from './ui.jsx'
import './finance.css'

/* ============================================================
   Kurkoos Finance — the group's internal invoice and bookkeeping system.
   Lives at /admin/finance (same sign-in as the admin). Data: supabase/finance.sql.
   Server: server/finance.js (Gmail, scanning, reading the documents with Claude).
   ============================================================ */

const BASE = '/admin/finance'
const NAV = [
  { to: '', label: 'סקירה', icon: 'home' },
  { to: '/documents', label: 'מסמכים', icon: 'docs' },
  { to: '/suppliers', label: 'ספקים', icon: 'suppliers' },
  { to: '/mailboxes', label: 'תיבות מייל', icon: 'mail' },
  { to: '/export', label: 'ייצוא לרו״ח', icon: 'export' },
  { to: '/settings', label: 'הגדרות', icon: 'settings' },
]

const Ctx = createContext(null)
export const useFinance = () => useContext(Ctx)

function useFinanceData(enabled) {
  const [state, setState] = useState({ loading: true, error: '', documents: [], businesses: [], categories: [], suppliers: [], mailboxes: [] })
  const reload = useCallback(async () => {
    try {
      const [documents, businesses, categories, suppliers, mailboxes] = await Promise.all([api.loadDocuments(), api.loadBusinesses(), api.loadCategories(), api.loadSuppliers(), api.loadMailboxes()])
      setState({ loading: false, error: '', documents, businesses, categories, suppliers, mailboxes })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: /does not exist|schema cache/.test(e.message) ? 'הטבלאות של המערכת עוד לא קיימות. מריצים את supabase/finance.sql ב-Supabase > SQL Editor' : e.message }))
    }
  }, [])
  useEffect(() => { if (enabled) reload() }, [enabled, reload])
  /* while Claude reads uploaded files, refresh every few seconds */
  const reading = state.documents.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!reading) return undefined
    const t = setInterval(reload, 4000)
    return () => clearInterval(t)
  }, [reading, reload])
  /* patch one document in place, without a full reload */
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
        <h1>הנהלת חשבונות</h1>
        <p>חשבוניות, קבלות וספקים של הקבוצה, במקום אחד.</p>
        <label>אימייל<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label>סיסמה<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {err && <p className="fin-error" role="alert">{err}</p>}
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy}>{busy ? 'מתחבר…' : 'כניסה'}</button>
      </form>
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
  useEffect(() => { document.title = 'הנהלת חשבונות · קבוצת קורקוס' }, [])
  useEffect(() => { setNavOpen(false) }, [pathname])

  const reviewCount = useMemo(() => data.documents.filter((d) => d.status === 'review').length, [data.documents])
  const ctx = useMemo(() => ({ ...data, go: (p) => navigate(`${BASE}${p}`) }), [data, navigate])

  if (!hasSupabase) return <p className="fin-msg">Supabase לא מוגדר בסביבה הזו.</p>
  if (session === undefined) return <div className="fin-msg">טוען…</div>
  if (!session) return <Login />

  const email = session.user?.email || ''
  const sub = pathname.slice(BASE.length) || ''

  return (
    <Ctx.Provider value={ctx}>
      <div className="fin" dir="rtl" data-theme={theme}>
        <aside className={`fin__side ${navOpen ? 'is-open' : ''}`} id="fin-side">
          <Link to={BASE} className="fin__brand">
            <img src="/kurkoos-logo-white.svg" alt="" />
            <span><strong>קבוצת קורקוס</strong><small>הנהלת חשבונות</small></span>
          </Link>
          <nav className="fin__nav" aria-label="ניווט המערכת">
            {NAV.map((n) => {
              const active = n.to === '' ? sub === '' || sub === '/' : sub.startsWith(n.to)
              return (
                <Link key={n.to} to={`${BASE}${n.to}`} className={`fin__nav-item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                  {n.to === '/documents' && reviewCount > 0 && <em className="fin__badge" aria-label={`${reviewCount} לבדיקה`}>{reviewCount}</em>}
                </Link>
              )
            })}
          </nav>
          <div className="fin__side-foot">
            <a href="/admin" className="fin__back"><Icon name="back" /> חזרה לניהול האתר</a>
            <div className="fin__user">
              <span className="fin__avatar">{email.slice(0, 1).toUpperCase()}</span>
              <span className="fin__user-mail">{email}</span>
              <button type="button" className="fin-icon-btn" onClick={() => supabase.auth.signOut()} aria-label="יציאה"><Icon name="logout" /></button>
            </div>
          </div>
        </aside>
        {navOpen && <button type="button" className="fin__scrim" aria-label="סגירת התפריט" onClick={() => setNavOpen(false)} />}

        <div className="fin__main">
          <header className="fin__top">
            <button type="button" className="fin-icon-btn fin__burger" onClick={() => setNavOpen(true)} aria-label="פתיחת התפריט" aria-expanded={navOpen} aria-controls="fin-side"><Icon name="menu" /></button>
            <h1 className="fin__title">{(NAV.find((n) => (n.to === '' ? sub === '' || sub === '/' : sub.startsWith(n.to))) || NAV[0]).label}</h1>
            <div className="fin__top-actions">
              <button type="button" className="fin-icon-btn" onClick={data.reload} aria-label="רענון" title="רענון"><Icon name="refresh" /></button>
              <button type="button" className="fin-icon-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            </div>
          </header>
          <main className="fin__content">
            {data.error && <p className="fin-error fin-error--block" role="alert">{data.error}</p>}
            {data.loading ? <div className="fin-msg">טוען נתונים…</div> : (
              <Routes>
                <Route path={BASE} element={<Dashboard />} />
                <Route path={`${BASE}/documents`} element={<Documents />} />
                <Route path={`${BASE}/documents/:id`} element={<Documents />} />
                <Route path={`${BASE}/suppliers`} element={<Suppliers />} />
                <Route path={`${BASE}/mailboxes`} element={<Mailboxes />} />
                <Route path={`${BASE}/export`} element={<ExportPage />} />
                <Route path={`${BASE}/settings`} element={<Settings />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            )}
          </main>
        </div>
      </div>
    </Ctx.Provider>
  )
}
