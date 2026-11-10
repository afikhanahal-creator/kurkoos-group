import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabase, hasSupabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/useAuth.js'
import * as api from './api.js'
import { ROLE, can } from './format.js'
import { ConfirmHost, Icon, Modal, Skeleton, UploadZone } from './ui.jsx'
import { markLedger } from './ledger.js'
import Onboarding from './Onboarding.jsx'
import { prettyPhone } from './phone.js'
import { ProviderLogo } from './logos.jsx'
import { InviteWelcome, Login, SecondStep, linkType, useIdleSignOut, deviceId } from './auth.jsx'
import Dashboard from './Dashboard.jsx'
import Documents from './Documents.jsx'
import CommandPalette from './CommandPalette.jsx'
import '../../styles/fonts.css'
import './finance.css'
import './moments.css'
import { toast } from './moments.js'
import { money } from './format.js'
const MasterData = lazy(() => import('./MasterData.jsx'))
const EntityOverview = lazy(() => import('./EntityOverview.jsx'))
const Scanners = lazy(() => import('./Scanners.jsx'))
const Cloud = lazy(() => import('./Cloud.jsx'))
const Delivery = lazy(() => import('./Delivery.jsx'))
const SendCenter = lazy(() => import('./SendCenter.jsx'))
const Connections = lazy(() => import('./Connections.jsx'))
const Reports = lazy(() => import('./Reports.jsx'))
const DataManagement = lazy(() => import('./DataManagement.jsx'))
const Automations = lazy(() => import('./Automations.jsx'))
const Agents = lazy(() => import('./Agents.jsx'))
const Mailboxes = lazy(() => import('./Mailboxes.jsx'))
const Scans = lazy(() => import('./Scans.jsx'))
const Drive = lazy(() => import('./Drive.jsx'))
const Integrations = lazy(() => import('./Integrations.jsx'))
const ExportHistory = lazy(() => import('./ExportHistory.jsx'))
const Users = lazy(() => import('./Users.jsx'))
const Settings = lazy(() => import('./Settings.jsx'))
const Activity = lazy(() => import('./Activity.jsx'))
const Executive = lazy(() => import('./Executive.jsx'))
const Assistant = lazy(() => import('./Assistant.jsx'))
const CaptureReceipt = lazy(() => import('./CaptureReceipt.jsx'))

/* ============================================================
   KURKOOS FINANCE AI — the group's internal invoice and bookkeeping system.
   /admin/finance · schema: supabase/finance.sql · server: server/finance.js + server/finance/
   What a person sees follows their role (format.js › can); the database enforces the same rules.
   ============================================================ */

export const BASE = '/admin/finance'
const ALL = ['admin', 'finance_manager', 'employee', 'accountant']
const OPS = ['admin', 'finance_manager']
export const NAV = [
  // daily work: what arrived, what needs a look, what goes to the accountant
  // management: the group's financial picture opens first for managers
  { to: '', label: 'סקירה פיננסית', icon: 'reports', roles: OPS, el: <Executive />, group: 'הנהלה' },
  { to: '/assistant', label: 'שאלות על הנתונים', icon: 'sparkle', roles: [...OPS, 'accountant'], el: <Assistant />, group: 'הנהלה' },
  { to: '', label: 'מרכז בקרה', icon: 'home', roles: ['employee', 'accountant'], el: <Dashboard />, group: 'מסמכים' },
  { to: '/today', label: 'מרכז בקרה', icon: 'home', roles: OPS, el: <Dashboard />, group: 'מסמכים' },
  { to: '/documents', label: 'כל המסמכים', accLabel: 'מסמכים מאושרים', icon: 'docs', roles: ALL, el: <Documents preset="all" />, group: 'מסמכים' },
  { to: '/new', label: 'חשבוניות חדשות', icon: 'inbox', roles: ['admin', 'finance_manager', 'employee'], el: <Documents preset="new" />, badge: 'new', group: 'מסמכים' },
  { to: '/pending', label: 'ממתינים לבדיקה', icon: 'clock', roles: OPS, el: <Documents preset="pending" />, badge: 'pending', group: 'מסמכים' },
  { to: '/send', label: 'שליחה לרו״ח', icon: 'send', roles: OPS, el: <SendCenter />, badge: 'ready', group: 'מסמכים' },
  { to: '/drive', label: 'Google Drive', icon: 'folder', roles: ['admin', 'finance_manager'], el: <Drive />, group: 'מסמכים' },
  { to: '/exports', label: 'היסטוריית ייצוא', icon: 'history', roles: ['admin', 'finance_manager', 'accountant'], el: <ExportHistory />, group: 'מסמכים' },
  { to: '/suppliers', label: 'ספקים', icon: 'suppliers', roles: OPS, el: <MasterData kind="suppliers" />, badge: 'suppliers', group: 'נתוני יסוד', detail: <EntityOverview kind="suppliers" /> },
  { to: '/companies', label: 'חברות', icon: 'company', roles: OPS, el: <MasterData kind="businesses" />, group: 'נתוני יסוד', detail: <EntityOverview kind="businesses" /> },
  { to: '/projects', label: 'פרויקטים', icon: 'project', roles: OPS, el: <MasterData kind="projects" />, group: 'נתוני יסוד', detail: <EntityOverview kind="projects" /> },
  { to: '/categories', label: 'קטגוריות', icon: 'tag', roles: OPS, el: <MasterData kind="categories" />, group: 'נתוני יסוד', detail: <EntityOverview kind="categories" /> },
  // where documents come from
  { to: '/connections', label: 'חיבורים', icon: 'plug', roles: ['admin', 'finance_manager', 'employee'], el: <Connections />, group: 'קליטה' },
  { to: '/mailboxes', label: 'חשבונות אימייל', icon: 'mail', roles: ['admin', 'finance_manager', 'employee'], el: <Mailboxes />, group: 'קליטה' },
  { to: '/scans', label: 'ניהול סריקות', icon: 'history', roles: ['admin', 'finance_manager'], el: <Scans />, group: 'קליטה' },
  { to: '/scanners', label: 'מספרי WhatsApp', icon: 'phone', roles: ['admin', 'finance_manager', 'employee'], el: <Scanners />, group: 'קליטה' },
  // everything else, folded away until needed
  { to: '/reports', label: 'דוחות', icon: 'reports', roles: ['admin', 'finance_manager', 'accountant'], el: <Reports />, group: 'מתקדם' },
  { to: '/automations', label: 'כללים ואוטומציה', icon: 'rules', roles: OPS, el: <Automations />, group: 'מתקדם' },
  { to: '/agents', label: 'סוכני AI', icon: 'agents', roles: OPS, el: <Agents />, group: 'מתקדם' },
  { to: '/activity', label: 'יומן פעילות', icon: 'activity', roles: OPS, el: <Activity />, group: 'מתקדם' },
  { to: '/data', label: 'ניהול נתונים', icon: 'data', roles: OPS, el: <DataManagement />, group: 'מתקדם' },
  { to: '/integrations', label: 'תוכנת הנהלת חשבונות', icon: 'plug', roles: OPS, el: <Integrations />, group: 'מתקדם' },
  { to: '/cloud', label: 'סנכרון לענן', icon: 'cloud', roles: OPS, el: <Cloud />, group: 'מתקדם' },
  { to: '/delivery', label: 'שליחה אוטומטית', icon: 'webhook', roles: ['admin'], el: <Delivery />, group: 'מתקדם' },
  { to: '/users', label: 'הארגון ומשתמשים', icon: 'users', roles: ['admin'], el: <Users />, group: 'מתקדם' },
  { to: '/settings', label: 'הגדרות', icon: 'settings', roles: ALL, el: <Settings />, group: 'מתקדם' },
]
const GROUPS = ['הנהלה', 'מסמכים', 'נתוני יסוד', 'קליטה', 'מתקדם']
const FOLDED = 'מתקדם'

const Ctx = createContext(null)
export const useFinance = () => useContext(Ctx)

// the same "count|newest change" the server answers in api.docsStamp, computed from the rows already loaded
const stampOf = (docs) => `${docs.length}|${docs.reduce((m, d) => (d.updated_at && d.updated_at > m ? d.updated_at : m), '')}`
function useFinanceData(enabled, onChange) {
  const [state, setState] = useState({ loading: true, error: '', me: null, documents: [], businesses: [], projects: [], categories: [], suppliers: [], mailboxes: [], members: [], allocations: [], settings: {} })
  const loadedAt = useRef(0)
  const stamp = useRef(''); const prevDocs = useRef(null)
  const inflight = useRef(null)
  // one load at a time: a second call while a load runs (focus, a timer, a screen's refresh) shares it
  const reload = useCallback(() => {
    if (inflight.current) return inflight.current
    inflight.current = load().finally(() => { inflight.current = null })
    return inflight.current
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const load = async () => {
    try {
      const me = await api.me()
      if (!me?.role) { setState((s) => ({ ...s, loading: false, error: '', me })); return }
      const [documents, businesses, projects, categories, suppliers, mailboxes, members, allocations, settings] = await Promise.all([
        api.loadDocuments(), api.loadBusinesses(), api.loadProjects(), api.loadCategories(), api.loadSuppliers(), api.loadMailboxes(), api.loadMembers(), api.loadAllocations(), api.loadSettings(),
      ])
      loadedAt.current = Date.now()
      stamp.current = stampOf(documents)
      const before = prevDocs.current; prevDocs.current = documents
      if (before) onChange.current?.(before, documents)
      setState({ loading: false, error: '', me, documents, businesses, projects, categories, suppliers, mailboxes, members, allocations, settings })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: /does not exist|schema cache|fin_me/.test(e.message) ? 'הטבלאות של המערכת עוד לא קיימות. מריצים את supabase/finance.sql ב-Supabase › SQL Editor' : e.message }))
    }
  }
  useEffect(() => { if (enabled) reload() }, [enabled, reload])
  // others work in the system too: refresh quietly when the tab comes back into view, if the data is older than 20 s
  useEffect(() => {
    if (!enabled) return undefined
    // before the first load ends (loadedAt 0) a focus is not a reason to load everything again
    const on = () => { if (document.visibilityState === 'visible' && loadedAt.current && Date.now() - loadedAt.current > 20_000) reload() }
    document.addEventListener('visibilitychange', on); window.addEventListener('focus', on)
    return () => { document.removeEventListener('visibilitychange', on); window.removeEventListener('focus', on) }
  }, [enabled, reload])
  const reading = state.documents.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!reading) return undefined
    const t = setInterval(reload, 4000)
    return () => clearInterval(t)
  }, [reading, reload])
  // invoices keep arriving (mail, WhatsApp, scanners, colleagues): a tiny check every 15 s while the tab is in view, and
  // a full reload only when something really changed. While documents are being read the 4 s loop above covers it.
  useEffect(() => {
    if (!enabled) return undefined
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible' || reading) return
      const now = await api.docsStamp().catch(() => null)
      if (now && stamp.current && now !== stamp.current) reload()
    }, 15_000)
    return () => clearInterval(t)
  }, [enabled, reading, reload])
  const patchDoc = useCallback((doc) => setState((s) => ({ ...s, documents: s.documents.map((d) => (d.id === doc.id ? doc : d)) })), [])
  const refreshIfStale = useCallback(() => { if (Date.now() - loadedAt.current > 20_000) reload() }, [reload])
  // the bookkeeping pass (ledger.js): receipts that pay an invoice, proformas replaced by an invoice. Every screen reads
  // the same flags, so no figure counts the same money twice.
  const documents = useMemo(() => markLedger(state.documents), [state.documents])
  return { ...state, documents, reload, patchDoc, refreshIfStale }
}

function NoAccess({ me, email, onClaimed }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const claim = async () => {
    setBusy(true); setErr('')
    try { await api.claimAdmin(); onClaimed() } catch (e) { setErr(e.message); setBusy(false) }
  }
  // "no access" can be a stale answer (a check that failed for a moment, a saved result from before an invitation):
  // forget every saved check, take a fresh token and ask again; once by itself, then on the button
  const recheck = async () => {
    setBusy(true); setErr('')
    try {
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('fin-sec:')) sessionStorage.removeItem(k)
    } catch { /* noop */ }
    await supabase.auth.refreshSession().catch(() => {})
    await Promise.resolve(onClaimed()).catch(() => {})
    setBusy(false)
  }
  useEffect(() => { const t = setTimeout(recheck, 600); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fin-login" dir="rtl">
      <div className="fin-login__box">
        <img src="/kurkoos-logo.svg" alt="קבוצת קורקוס" className="fin-login__logo" />
        {me?.has_members ? (
          <>
            <h1>אין לך גישה למערכת</h1>
            <p>החשבון <strong dir="ltr">{email}</strong> עוד לא הוזמן למערכת הנהלת החשבונות. אם זה לא החשבון הנכון, נכנסים עם החשבון שהוזמן; אחרת מבקשים הזמנה ממנהל המערכת.</p>
            <button type="button" className="fin-btn fin-btn--primary" onClick={recheck} disabled={busy}>{busy ? 'בודק…' : 'בדיקה מחדש'}</button>
            <button type="button" className="fin-btn" onClick={() => supabase.auth.signOut({ scope: 'local' })} disabled={busy}>כניסה עם חשבון אחר</button>
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
  // an invited person arrives signed in from the invitation link: they choose a password before anything else
  const [welcome, setWelcome] = useState(() => linkType === 'invite')
  // after sign-in: my role, whether it requires the second step (TOTP), and the idle timeout. Data loads only once
  // the second step passed; the database refuses it before that anyway (fin_has_role checks the token's aal).
  const [sec, setSec] = useState(null)        // null = not checked yet · { role, mfa_required, idle_minutes, aal } · false = no member row
  useEffect(() => {
    if (!session) { setSec(null); return }
    let alive = true
    // a reload keeps the answer for the same token, so the screen appears as fast as before the gate existed
    const cacheKey = `fin-sec:${session.access_token.slice(-24)}`
    // the cached answer only paints the screen; the server is always asked again, because a block, an ended session or a
    // changed policy (MFA roles, idle minutes) must take effect on the next load, not when the token expires
    try { const c = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); if (c) setSec(c) } catch { /* noop */ }
    const check = async () => {
      // the session itself: an admin who blocks someone deletes their sessions, and the auth server then refuses the token
      const { error: gone } = await supabase.auth.getUser()
      if (!alive) return
      if (gone && [401, 403].includes(gone.status)) {
        try { sessionStorage.removeItem(cacheKey) } catch { /* noop */ }
        await supabase.auth.signOut({ scope: 'local' })
        return
      }
      const [me, { data: lvl }] = await Promise.all([api.mySecurity(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()])
      if (!alive) return
      const v = me ? { ...me, aal: lvl?.currentLevel || 'aal1', next: lvl?.nextLevel || 'aal1' } : false
      setSec(v)
      try { if (v && !(v.mfa_required && v.aal !== 'aal2') && !v.onboard) sessionStorage.setItem(cacheKey, JSON.stringify(v)); else sessionStorage.removeItem(cacheKey) } catch { /* noop */ }
    }
    check()
    // coming back to the tab after a while asks again
    const onShow = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onShow)
    return () => { alive = false; document.removeEventListener('visibilitychange', onShow) }
  }, [session?.access_token]) // eslint-disable-line react-hooks/exhaustive-deps
  // a required second step is pending when the role requires it and the token is still aal1
  const mfaPending = !!sec && sec.mfa_required && sec.aal !== 'aal2'
  const ready = !!session && sec !== null && !mfaPending
  // what changed since the last load, said in words: documents that arrived from elsewhere, and documents that finished
  // being read (with what was read), so nobody has to refresh to know a scan is done
  const onChange = useRef(null)
  const data = useFinanceData(ready, onChange)
  // once the data is in, the screens people open most are fetched in the background, so moving to them is instant
  // (each is a few KB; the rest still load on first use)
  useEffect(() => {
    if (!ready || data.loading) return undefined
    const warm = () => { import('./Executive.jsx'); import('./Reports.jsx'); import('./Assistant.jsx'); import('./MasterData.jsx'); import('./Integrations.jsx'); import('./Settings.jsx') }
    const ric = window.requestIdleCallback
    const id = ric ? ric(warm, { timeout: 4000 }) : setTimeout(warm, 2500)
    return () => { if (ric && window.cancelIdleCallback) window.cancelIdleCallback(id); else clearTimeout(id) }
  }, [ready, data.loading])
  // one line per sign-in (device, time); a sign-in from a new device also sends a mail
  useEffect(() => {
    if (!ready || !session?.access_token) return
    const key = `fin-signed-in:${session.access_token.slice(-24)}`
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1') } catch { /* noop */ }
    api.callServer('auth-event', { kind: 'signed_in', device_id: deviceId() }).catch(() => {})
  }, [ready, session?.access_token])
  const idleSoon = useIdleSignOut(Number(sec?.idle_minutes) || 0, ready)   // 0 = never sign out for inactivity
  const { pathname } = useLocation()
  const navigate = useNavigate()
  onChange.current = async (before, after) => {
    const was = new Map(before.map((d) => [d.id, d]))
    const myId = (await supabase.auth.getSession()).data.session?.user?.id
    // arrived from somewhere else (my own uploads already got their moment when I dropped them)
    const arrived = after.filter((d) => !was.has(d.id) && d.created_by !== myId)
    const read = after.filter((d) => was.get(d.id)?.status === 'processing' && !['processing', 'failed'].includes(d.status))
    const failed = after.filter((d) => was.get(d.id)?.status === 'processing' && d.status === 'failed')
    const SRC = { gmail: 'מהמייל', outlook: 'מהמייל', forward: 'ממייל שהועבר', whatsapp: 'מ-WhatsApp', upload: 'מהעלאה', camera: 'מצילום' }
    if (arrived.length) {
      const from = [...new Set(arrived.map((d) => SRC[d.source] || '').filter(Boolean))].join(', ')
      toast({ icon: 'doc', title: arrived.length === 1 ? 'מסמך חדש נקלט' : `${arrived.length} מסמכים חדשים נקלטו`, sub: [from, arrived.some((d) => d.status === 'processing') ? 'נקראים עכשיו' : ''].filter(Boolean).join(' · '),
        action: { label: 'הצגה', onClick: () => navigate(`${BASE}/new`) } })
    }
    if (read.length === 1) {
      const d = read[0]
      toast({ title: 'המסמך נקרא', sub: [d.supplier_name || d.file_name, d.total_amount != null ? money(d.total_amount, d.currency) : '', d.status === 'review' ? 'מחכה לבדיקה' : ''].filter(Boolean).join(' · '),
        action: { label: 'פתיחה', onClick: () => navigate(`${BASE}/documents/${d.id}`) } })
    } else if (read.length > 1) {
      toast({ title: `${read.length} מסמכים נקראו`, sub: 'מחכים לבדיקה בחשבוניות חדשות', action: { label: 'הצגה', onClick: () => navigate(`${BASE}/new`) } })
    }
    for (const d of failed.slice(0, 2)) toast({ tone: 'attn', title: 'מסמך לא נקרא', sub: `${d.file_name || 'מסמך'} · אפשר לנסות שוב או למלא ידנית`, action: { label: 'פתיחה', onClick: () => navigate(`${BASE}/documents/${d.id}`) } })
  }
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('fin-side') === 'rail' } catch { return false } })
  // the page title sits large in the page; the top bar repeats it only after it has scrolled away
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 56)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const [moreOpen, setMoreOpen] = useState(() => { try { return localStorage.getItem('fin-nav-more') === 'open' } catch { return false } })
  const toggleMore = () => setMoreOpen((v) => { try { localStorage.setItem('fin-nav-more', v ? 'closed' : 'open') } catch { /* private mode */ } return !v })
  const toggleRail = () => setCollapsed((v) => { try { localStorage.setItem('fin-side', v ? 'full' : 'rail') } catch { /* private mode */ } return !v })
  const [cmd, setCmd] = useState(false)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v) }
      else if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); setCmd(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(THEME_KEY) || 'light' } catch { return 'light' } })
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ } }, [theme])
  useEffect(() => { document.title = 'Kurkoos Finance AI · קבוצת קורקוס' }, [])
  useEffect(() => { setNavOpen(false); data.refreshIfStale?.() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  const role = data.me?.role || null
  // a private system: never indexed, never cached by a search engine (the server also sends X-Robots-Tag for /admin)
  useEffect(() => {
    let m = document.querySelector('meta[name="robots"]')
    const before = m?.getAttribute('content')
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'robots'); document.head.appendChild(m) }
    m.setAttribute('content', 'noindex, nofollow, noarchive')
    // installable from a phone: its own manifest and standalone metas, only while the finance app is on screen
    const added = []
    const tag = (name, attrs) => { const el = document.createElement(name); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); document.head.appendChild(el); added.push(el) }
    const otherManifest = document.querySelector('link[rel="manifest"]'); const prevManifestHref = otherManifest?.getAttribute('href'); if (otherManifest) otherManifest.setAttribute('href', '/finance.webmanifest'); else tag('link', { rel: 'manifest', href: '/finance.webmanifest' })
    const themeMeta = document.querySelector('meta[name="theme-color"]'); const prevTheme = themeMeta?.getAttribute('content'); if (themeMeta) themeMeta.setAttribute('content', '#07293a')
    tag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }); tag('meta', { name: 'mobile-web-app-capable', content: 'yes' }); tag('meta', { name: 'apple-mobile-web-app-title', content: 'Kurkoos Finance' }); tag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }); tag('link', { rel: 'apple-touch-icon', href: '/kurkoos-groip-logo.png' })
    const cleanupInstall = () => { added.forEach((el) => el.remove()); if (otherManifest && prevManifestHref) otherManifest.setAttribute('href', prevManifestHref); if (themeMeta && prevTheme) themeMeta.setAttribute('content', prevTheme) }
    // and no measurement: any Google tag loaded by a public page before stays silent here
    for (const k of Object.keys(window)) if (k.startsWith('ga-disable-')) window[k] = true
    return () => { cleanupInstall(); if (before) m.setAttribute('content', before); else m.remove() }
  }, [])
  const [capture, setCapture] = useState(false)
  const [uploading, setUploading] = useState(false)
  // the office WhatsApp number, for the top bar (one status call per sign-in)
  const [waNumber, setWaNumber] = useState('')
  useEffect(() => { if (!ready) return; api.callServer('status').then((r) => setWaNumber(r?.whatsapp?.configured ? r.whatsapp.number || '' : '')).catch(() => {}) }, [ready])
  const ctx = useMemo(() => ({ ...data, role, can: (w) => can(role, w), go: (p) => navigate(`${BASE}${p}`) }), [data, role, navigate])
  const nav = NAV.filter((n) => role && n.roles.includes(role))
  const sub = pathname.slice(BASE.length).replace(/\/$/, '') || ''
  const active = nav.find((n) => (n.to === '' ? sub === '' : sub === n.to || sub.startsWith(`${n.to}/`))) || nav[0]
  const badges = useMemo(() => {
    const week = Date.now() - 7 * 86400_000
    return {
      new: data.documents.filter((d) => new Date(d.created_at).getTime() > week && ['review', 'processing'].includes(d.status)).length,
      pending: data.documents.filter((d) => d.status === 'review').length,
      suppliers: data.suppliers.filter((x) => x.status === 'pending').length,
      ready: data.documents.filter((d) => d.status === 'approved' && !d.exported_at).length,
    }
  }, [data.documents, data.suppliers])

  if (!hasSupabase) return <p className="fin-msg">Supabase לא מוגדר בסביבה הזו.</p>
  if (!session && session !== undefined) return <Login />
  if (session === undefined || (session && sec === null)) return <div className="fin-boot" role="status" aria-label="טוען"><img src="/kurkoos-logo.svg" alt="" /><span /></div>
  if (welcome && session) return <InviteWelcome email={session.user?.email || ''} onDone={() => setWelcome(false)} />
  if (mfaPending) return <SecondStep mfaRequired onDone={() => supabase.auth.refreshSession().then(() => setSec((x) => ({ ...x, aal: 'aal2' })))} />
  if (sec !== false && data.loading && !data.me) return <div className="fin-boot" role="status" aria-label="טוען"><img src="/kurkoos-logo.svg" alt="" /><span /></div>
  const email = session.user?.email || ''
  const myName = data.members.find((m) => m.user_id === session.user?.id)?.full_name || ''
  if (data.error && !data.me) return <div className="fin-login" dir="rtl"><div className="fin-login__box"><h1>שגיאה</h1><p className="fin-error" role="alert">{data.error}</p></div></div>
  if (role && sec?.onboard) return <Onboarding session={session} sec={sec} onDone={() => setSec((x) => ({ ...x, onboard: false }))} />
  if (!role) return <NoAccess me={data.me} email={email} onClaimed={data.reload} />

  return (
    <Ctx.Provider value={ctx}>
      <div className={`fin ${collapsed ? 'is-collapsed' : ''} ${scrolled ? 'is-scrolled' : ''}`} dir="rtl" data-theme={theme}>
        <a href="#fin-main" className="fin-skip">דילוג לתוכן</a>
        <aside className={`fin__side ${navOpen ? 'is-open' : ''}`} id="fin-side" aria-label="תפריט המערכת">
          <div className="fin__drawer-head">
            <span className="fin__avatar fin__avatar--lg" aria-hidden="true">{(myName || email).trim().slice(0, 1).toUpperCase()}</span>
            <span className="fin__user-meta"><strong>{myName || ROLE[role]}</strong><small dir="ltr">{email}</small></span>
            <button type="button" className="fin-icon-btn" onClick={() => setNavOpen(false)} aria-label="סגירת התפריט"><Icon name="close" /></button>
          </div>
          <Link to={role === 'admin' ? `${BASE}/users` : `${BASE}/settings`} className="fin__org">
            <span className="fin__org-mark" aria-hidden="true">KG</span>
            <span className="fin__org-meta"><strong>קבוצת קורקוס</strong><small>{data.businesses.length === 1 ? 'חברה אחת' : `${data.businesses.length} חברות`} · {ROLE[role]}</small></span>
            <Icon name="next" size={17} />
          </Link>
          {['admin', 'finance_manager'].includes(role) && (
            <Link to={`${BASE}/scans`} className="fin__drawer-link" onClick={() => setNavOpen(false)}><Icon name="history" size={18} /><span>קבלות ישנות</span><small>סריקת חשבוניות מתקופה מוקדמת</small></Link>
          )}
          <div className="fin__brand-row">
            <Link to={BASE} className="fin__brand" aria-label="Kurkoos Finance, דף הבית">
              <img src="/kurkoos-logo.svg" alt="" />
              <span><strong>Kurkoos Finance</strong><small>קבוצת קורקוס</small></span>
            </Link>
            <button type="button" className="fin__collapse" onClick={toggleRail} aria-label={collapsed ? 'הרחבת התפריט' : 'כיווץ התפריט'} title={collapsed ? 'הרחבת התפריט' : 'כיווץ התפריט'} aria-pressed={collapsed}><Icon name="back" size={17} /></button>
          </div>
          {can(role, 'upload') && <button type="button" className="fin__upload" onClick={() => { setNavOpen(false); setUploading(true) }}><span><Icon name="plus" size={18} /></span> העלאת מסמכים</button>}
          <nav className="fin__nav">
            {GROUPS.filter((g) => nav.some((n) => n.group === g)).map((g) => {
            const foldable = g === FOLDED && nav.length > 12
            const open = !foldable || moreOpen || nav.some((n) => n.group === g && n === active)
            return (
            <div className={`fin__nav-group ${foldable ? 'is-foldable' : ''} ${open ? '' : 'is-folded'}`} key={g}>
            {foldable ? (
              <button type="button" className="fin__nav-label fin__nav-more" onClick={toggleMore} aria-expanded={open} aria-controls="fin-nav-more">{g}<Icon name="chev" size={14} /></button>
            ) : <span className="fin__nav-label">{g}</span>}
            <div className="fin__nav-items" id={foldable ? 'fin-nav-more' : undefined}>
            {nav.filter((n) => n.group === g).map((n) => {
              const on = n === active
              const count = n.badge ? badges[n.badge] : 0
              return (
                <Link key={n.to} to={`${BASE}${n.to}`} className={`fin__nav-item ${on ? 'is-active' : ''}`} aria-current={on ? 'page' : undefined} title={collapsed ? (role === 'accountant' && n.accLabel ? n.accLabel : n.label) : undefined}>
                  <Icon name={n.icon} size={19} />
                  <span>{role === 'accountant' && n.accLabel ? n.accLabel : n.label}</span>
                  {count > 0 && <em className={`fin__badge ${n.badge === 'pending' ? 'fin__badge--attn' : ''}`} aria-label={`${count} פריטים`}>{count}</em>}
                </Link>
              )
            })}
            </div>
            </div>
            )
            })}
          </nav>
          <div className="fin__side-foot">
            <ProfileMenu name={myName} email={email} role={role} theme={theme} setTheme={setTheme} waNumber={waNumber} go={(p) => { setNavOpen(false); navigate(`${BASE}${p}`) }} />
          </div>
        </aside>
        {navOpen && <button type="button" className="fin__scrim" aria-label="סגירת התפריט" onClick={() => setNavOpen(false)} />}

        <div className="fin__main">
          <header className="fin__top">
            <button type="button" className="fin-icon-btn fin__burger" onClick={() => setNavOpen(true)} aria-label="פתיחת התפריט" aria-expanded={navOpen} aria-controls="fin-side"><Icon name="menu" /></button>
            <h1 className="fin__title">{role === 'accountant' && active?.accLabel ? active.accLabel : active?.label}</h1>
            <button type="button" className="fin-searchbar" onClick={() => setCmd(true)} aria-label="חיפוש (Ctrl+K)">
              <Icon name="search" size={17} /><span>חיפוש מסמך, ספק או פרויקט</span><kbd>⌘K</kbd>
            </button>
            {waNumber && <WaChip number={waNumber} canManage={can(role, 'upload')} go={(p) => navigate(`${BASE}${p}`)} />}
            {['admin', 'finance_manager'].includes(role) && (
              <Link to={`${BASE}/scans`} className="fin-chiplink" title="סריקת חשבוניות מתקופה מוקדמת יותר">
                <Icon name="history" size={17} /><span>קבלות ישנות</span>
              </Link>
            )}
            <div className="fin__top-actions">
              <button type="button" className="fin-icon-btn" onClick={data.reload} aria-label="רענון" title="רענון"><Icon name="refresh" /></button>
              <button type="button" className="fin-icon-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'} title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            </div>
          </header>
          {idleSoon && <div className="fin-idlebar" role="alert"><Icon name="clock" size={16} /> בלי פעילות במשך {sec?.idle_minutes} דקות המערכת מתנתקת בעוד דקה. כל נגיעה מבטלת.</div>}
          <main className="fin__content" id="fin-main">
            {data.error && <p className="fin-error fin-error--block" role="alert">{data.error}</p>}
            <Suspense fallback={<div className="fin-stack" aria-busy="true"><Skeleton lines={6} /></div>}>
            <Routes>
              {nav.map((n) => <Route key={n.to} path={`${BASE}${n.to}`} element={n.el} />)}
              {nav.filter((n) => ['/documents', '/new', '/pending'].includes(n.to)).map((n) => <Route key={`${n.to}-id`} path={`${BASE}${n.to}/:id`} element={n.el} />)}
              {nav.filter((n) => n.detail).map((n) => <Route key={`${n.to}-detail`} path={`${BASE}${n.to}/:id`} element={n.detail} />)}
              <Route path="*" element={<Dashboard />} />
            </Routes>
            </Suspense>
          </main>
        </div>
        {/* phones: the main places one thumb away; "עוד" opens the full menu */}
        <nav className="fin-tabbar" aria-label="ניווט מהיר">
          {/* RTL: "עוד" on the right, under the menu button at the top; the camera stays in the middle */}
          <button type="button" onClick={() => setNavOpen(true)} aria-label="עוד" aria-expanded={navOpen} aria-controls="fin-side"><Icon name="menu" size={21} /><span>עוד</span></button>
          {[nav.find((n) => n.to === '')].filter(Boolean).map((n) => (
            <Link key={n.to || 'home'} to={`${BASE}${n.to}`} className={active === n ? 'is-on' : ''} aria-current={active === n ? 'page' : undefined}><Icon name={n.icon} size={21} /><span>{n.to === '' && ['admin', 'finance_manager'].includes(role) ? 'סקירה' : n.to === '' ? 'בית' : 'מסמכים'}</span></Link>
          ))}
          {can(role, 'upload') && <button type="button" className="fin-tabbar__add" onClick={() => setCapture(true)} aria-label="צילום או העלאת קבלה"><span><Icon name="camera" size={22} /></span></button>}
          {[nav.find((n) => n.to === '/documents')].filter(Boolean).map((n) => (
            <Link key={n.to || 'home'} to={`${BASE}${n.to}`} className={active === n ? 'is-on' : ''} aria-current={active === n ? 'page' : undefined}><Icon name={n.icon} size={21} /><span>{n.to === '' && ['admin', 'finance_manager'].includes(role) ? 'סקירה' : n.to === '' ? 'בית' : 'מסמכים'}</span></Link>
          ))}
          {nav.find((n) => n.to === '/reports') && <Link to={`${BASE}/reports`} className={active?.to === '/reports' ? 'is-on' : ''}><Icon name="reports" size={21} /><span>דוחות</span></Link>}
        </nav>
        {capture && <Suspense fallback={null}><CaptureReceipt onClose={() => setCapture(false)} /></Suspense>}
        {uploading && <Modal title="העלאת מסמכים" onClose={() => setUploading(false)} footer={<><button type="button" className="fin-btn" onClick={() => { setUploading(false); navigate(`${BASE}/documents?status=new`) }}>למסמכים החדשים</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setUploading(false)}>סגירה</button></>}><UploadZone onDone={data.reload} /><p className="fin-muted fin-small">PDF או תמונה, עד 12MB, אחד או כמה ביחד. המסמכים נקראים ברקע ומחכים לבדיקה ב"חשבוניות חדשות".</p></Modal>}
        <CommandPalette open={cmd} onClose={() => setCmd(false)} nav={nav} />
        <ConfirmHost />
      </div>
    </Ctx.Provider>
  )
}

/* "send on WhatsApp" in the top bar: the office number, copy, and the way to the connected numbers */
function WaChip({ number, canManage, go }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  const copy = async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(`+${number}`); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* visible to copy by hand */ } }
  return (
    <span className="fin-wachip" ref={box}>
      <button type="button" className="fin-wachip__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog">
        <span className="fin-wachip__icon"><ProviderLogo name="whatsapp" size={16} /></span>
        <span className="fin-wachip__text"><small>שליחה ב-WhatsApp</small><strong dir="ltr">{prettyPhone(number)}</strong></span>
      </button>
      <span role="button" tabIndex={0} className="fin-wachip__copy" onClick={copy} onKeyDown={(e) => { if (e.key === 'Enter') copy(e) }} aria-label="העתקת המספר" title="העתקת המספר"><Icon name={copied ? 'check' : 'copy'} size={15} /></span>
      {open && (
        <div className="fin-wachip__pop" role="dialog" aria-label="מספר ה-WhatsApp של המשרד">
          <strong>מספר ה-WhatsApp של קורקוס</strong>
          <p>שולחים אליו חשבוניות בצילום או כקובץ, והן נכנסות ישירות למערכת ונקראות.</p>
          <p className="fin-muted">השליחה זמינה ממספרים שאושרו בלבד.</p>
          {canManage && <button type="button" className="fin-link" onClick={() => { setOpen(false); go('/scanners') }}>ניהול מספרים מחוברים ←</button>}
        </div>
      )}
    </span>
  )
}

/* the person at the bottom of the menu: profile, managing the system, appearance, help, sign out. An internal system:
   no billing or plans. Opens upward; Escape or a click outside closes it. */
function ProfileMenu({ name, email, role, theme, setTheme, waNumber, go }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
    setTimeout(() => box.current?.querySelector('.fin-profile__pop button')?.focus(), 0)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  const item = (icon, label, onClick, cls = '') => <button type="button" role="menuitem" className={cls} onClick={() => { setOpen(false); onClick() }}><Icon name={icon} size={17} /> {label}</button>
  const admin = role === 'admin'; const ops = ['admin', 'finance_manager'].includes(role)
  return (
    <div className="fin-profile" ref={box}>
      {open && (
        <div className="fin-profile__pop" role="menu" aria-label="תפריט המשתמש">
          {item('users', 'הפרופיל שלי', () => go('/settings?tab=account'))}
          {ops && <><span className="fin-profile__label">ניהול המערכת</span>
            {item('settings', 'הגדרות', () => go('/settings'))}
            {item('company', 'חברות ודיווח', () => go('/settings?tab=companies'))}
            {admin && item('shield', 'משתמשים והרשאות', () => go('/users'))}
            {item('plug', 'חיבורים', () => go('/connections'))}
          </>}
          <span className="fin-profile__sep" />
          <div className="fin-profile__theme" role="group" aria-label="מראה">
            <button type="button" className={theme !== 'dark' ? 'is-on' : ''} aria-pressed={theme !== 'dark'} onClick={() => setTheme('light')}><Icon name="sun" size={15} /> בהיר</button>
            <button type="button" className={theme === 'dark' ? 'is-on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Icon name="moon" size={15} /> כהה</button>
          </div>
          <span className="fin-profile__sep" />
          {waNumber && <a role="menuitem" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><ProviderLogo name="whatsapp" size={16} /> שליחת מסמך ב-WhatsApp</a>}
          {admin && <a role="menuitem" href="/admin" onClick={() => setOpen(false)}><Icon name="back" size={17} /> ניהול האתר</a>}
          {item('logout', 'התנתקות', () => supabase.auth.signOut(), 'is-danger')}
        </div>
      )}
      <button type="button" className="fin-profile__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" aria-label={`תפריט המשתמש: ${name || email}`}>
        <span className="fin__avatar" aria-hidden="true">{(name || email).trim().slice(0, 1).toUpperCase()}</span>
        <span className="fin__user-meta"><strong>{name || ROLE[role]}</strong><small dir="ltr">{name ? ROLE[role] : email}</small></span>
        <Icon name="chev" size={15} style={{ transform: open ? 'none' : 'rotate(180deg)' }} />
      </button>
    </div>
  )
}
