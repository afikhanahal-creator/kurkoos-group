import { useEffect, useMemo, useState } from 'react'
import { listLeads, listSubscribers } from '../../lib/cms.js'
import { fetchDashboard, fetchRealtime, rows, totalsOf } from '../../lib/analyticsApi.js'

/* ============================================================
   סקירה כללית — עמוד הבית של מערכת הניהול. תמונת מצב במבט אחד:
   לידים, תנועה, המרות ונרשמים, עם קיצורי דרך לטאבים המלאים.
   כל מקור נתונים נטען בנפרד וכשל באחד לא מפיל את השאר.
   ============================================================ */

const fmtNum = (n) => (n == null ? '—' : Math.round(n).toLocaleString('he-IL'))
const DAY = 86400000

const SOURCE_HE = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }
const SOURCE_C = { project: '#105572', home: '#2e9e6b', contact: '#8c6d1f', manual: '#666' }

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `לפני ${Math.max(1, m)} דק'`
  if (m < 60 * 24) return `לפני ${Math.floor(m / 60)} שע'`
  const d = Math.floor(m / (60 * 24))
  return d === 1 ? 'אתמול' : `לפני ${d} ימים`
}

function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'בוקר טוב'
  if (h >= 12 && h < 17) return 'צהריים טובים'
  if (h >= 17 && h < 22) return 'ערב טוב'
  return 'לילה טוב'
}

function Spark({ values, w = 130, h = 36 }) {
  if (!values || values.length < 2) return null
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - (v / max) * (h - 6)}`).join(' ')
  return (
    <svg className="ovw-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" />
    </svg>
  )
}

export default function OverviewTab({ onNavigate }) {
  const [leads, setLeads] = useState(null)          // null = טוען, [] = אין
  const [subs, setSubs] = useState(null)
  const [ga, setGa] = useState(null)                // { users, conversions, series, topPages } | 'none'
  const [rtUsers, setRtUsers] = useState(null)

  useEffect(() => {
    let on = true
    listLeads().then((d) => on && setLeads(d || [])).catch(() => on && setLeads([]))
    listSubscribers().then((d) => on && setSubs(d || [])).catch(() => on && setSubs([]))
    const end = new Date().toISOString().slice(0, 10)
    const start = new Date(Date.now() - 6 * DAY).toISOString().slice(0, 10)
    fetchDashboard(start, end)
      .then((out) => {
        if (!on) return
        if (!out?.configured) { setGa('none'); return }
        const R = out.reports
        const tot = totalsOf(R.totals)
        const series = rows(R.timeseries).map((r) => r.m[0])
        const topPages = rows(R.pages).slice(0, 3).map((r) => ({ path: r.d[0], title: r.d[1], views: r.m[0] }))
        setGa({ users: tot[0], conversions: tot[8], series, topPages })
      })
      .catch(() => on && setGa('none'))
    fetchRealtime()
      .then((d) => on && setRtUsers(d?.realtime?.rows?.reduce((a, r) => a + (Number(r.metricValues?.[0]?.value) || 0), 0) ?? 0))
      .catch(() => {})
    return () => { on = false }
  }, [])

  const leadStats = useMemo(() => {
    if (!leads) return null
    const now = Date.now()
    const in7 = leads.filter((l) => l.created_at && now - new Date(l.created_at).getTime() < 7 * DAY).length
    const prev7 = leads.filter((l) => {
      if (!l.created_at) return false
      const age = now - new Date(l.created_at).getTime()
      return age >= 7 * DAY && age < 14 * DAY
    }).length
    const attention = leads.filter((l) => (l.status || 'new') === 'new' && l.created_at && now - new Date(l.created_at).getTime() > 3 * DAY).length
    const latest = [...leads]
      .filter((l) => l.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
    return { in7, prev7, attention, latest }
  }, [leads])

  const nav = (id) => () => onNavigate?.(id)
  const gaReady = ga && ga !== 'none'
  const dateStr = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' })

  return (
    <div className="ovw" dir="rtl">
      {/* ברכה + סטטוס חי */}
      <header className="ovw__hello">
        <div>
          <h3 className="ovw__hi">{greeting()} 👋</h3>
          <span className="ovw__date">{dateStr}</span>
        </div>
        {rtUsers != null && (
          <span className="ovw__live"><i />{rtUsers} גולשים באתר עכשיו</span>
        )}
      </header>

      {/* מדדי מפתח — 7 הימים האחרונים */}
      <section className="ovw__kpis">
        <button type="button" className="ovw__kpi" onClick={nav('leads')}>
          <i>לידים · 7 ימים</i>
          <b>{leadStats ? leadStats.in7 : '—'}</b>
          {leadStats && leadStats.prev7 > 0 && (
            <span className={`ovw__trend ${leadStats.in7 >= leadStats.prev7 ? 'is-up' : 'is-down'}`}>
              {leadStats.in7 >= leadStats.prev7 ? '↑' : '↓'} מול {leadStats.prev7} בשבוע הקודם
            </span>
          )}
          {leadStats && leadStats.prev7 === 0 && <span className="ovw__hint">בשבוע האחרון</span>}
        </button>
        <button type="button" className={`ovw__kpi${leadStats?.attention ? ' ovw__kpi--warn' : ''}`} onClick={nav('leads')}>
          <i>דורשים טיפול</i>
          <b>{leadStats ? leadStats.attention : '—'}</b>
          <span className="ovw__hint">לידים חדשים מעל 3 ימים</span>
        </button>
        <button type="button" className="ovw__kpi" onClick={nav('analytics')}>
          <i>משתמשים · 7 ימים</i>
          <b>{gaReady ? fmtNum(ga.users) : '—'}</b>
          {gaReady ? <Spark values={ga.series} /> : <span className="ovw__hint">{ga === 'none' ? 'אין עדיין נתוני תנועה' : 'טוען…'}</span>}
        </button>
        <button type="button" className="ovw__kpi" onClick={nav('analytics')}>
          <i>המרות · 7 ימים</i>
          <b>{gaReady ? fmtNum(ga.conversions) : '—'}</b>
          <span className="ovw__hint">טפסים, וואטסאפ וטלפון</span>
        </button>
        <button type="button" className="ovw__kpi" onClick={nav('newsletter')}>
          <i>רשומים לניוזלטר</i>
          <b>{subs ? subs.length : '—'}</b>
          <span className="ovw__hint">סך הכול</span>
        </button>
      </section>

      <div className="ovw__cols">
        {/* לידים אחרונים */}
        <section className="ovw__card">
          <header className="ovw__card-head">
            <h4>לידים אחרונים</h4>
            <button type="button" className="ovw__more" onClick={nav('leads')}>לכל הלידים ←</button>
          </header>
          {!leadStats && <p className="ovw__empty">טוען…</p>}
          {leadStats && leadStats.latest.length === 0 && <p className="ovw__empty">אין עדיין לידים. פניות מהאתר יופיעו כאן.</p>}
          {leadStats && leadStats.latest.length > 0 && (
            <ul className="ovw__leads">
              {leadStats.latest.map((l) => (
                <li key={l.id}>
                  <span className="ovw__lead-name">{l.name || 'ללא שם'}</span>
                  <span className="ovw__lead-src" style={{ background: SOURCE_C[l.source] || '#888' }}>{SOURCE_HE[l.source] || l.source || '—'}</span>
                  <span className="ovw__lead-when">{timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* תנועה השבוע */}
        <section className="ovw__card">
          <header className="ovw__card-head">
            <h4>העמודים החזקים השבוע</h4>
            <button type="button" className="ovw__more" onClick={nav('analytics')}>לדוח המלא ←</button>
          </header>
          {ga == null && <p className="ovw__empty">טוען…</p>}
          {ga === 'none' && <p className="ovw__empty">נתוני התנועה יופיעו כאן ברגע שגוגל אנליטיקס יתחיל לדווח.</p>}
          {gaReady && ga.topPages.length === 0 && <p className="ovw__empty">אין עדיין מספיק נתונים השבוע.</p>}
          {gaReady && ga.topPages.length > 0 && (
            <ul className="ovw__pages">
              {ga.topPages.map((p) => (
                <li key={p.path}>
                  <span className="ovw__page-t">{p.title || p.path}</span>
                  <span className="ovw__page-v">{fmtNum(p.views)} צפיות</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* קיצורי דרך */}
      <section className="ovw__quick">
        <button type="button" onClick={nav('projects')}>ניהול פרויקטים</button>
        <button type="button" onClick={nav('leads')}>מערכת הלידים</button>
        <button type="button" onClick={nav('analytics')}>תנועה וסטטיסטיקות</button>
        <a href="/" target="_blank" rel="noopener noreferrer">צפייה באתר ↗</a>
      </section>
    </div>
  )
}
