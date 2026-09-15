import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import { fetchDashboard, fetchRealtime, testConnection, rows, totalsOf } from '../../lib/analyticsApi.js'
import './AnalyticsTab.css'

/* ============================================================
   AnalyticsTab — דשבורד תנועה מלא על נתוני Google Analytics 4.
   כל מספר כאן מגיע מ-GA4 Data API דרך צד השרת. אין נתוני דמו:
   כשאין חיבור — מוצג מסך הקמה, לא מספרים מזויפים.
   ============================================================ */

const PRESETS = [
  { id: '7d', label: '7 ימים', days: 7 },
  { id: '30d', label: '30 יום', days: 30 },
  { id: '90d', label: '90 יום', days: 90 },
  { id: 'tm', label: 'החודש' },
  { id: 'lm', label: 'חודש שעבר' },
]

const iso = (d) => d.toISOString().slice(0, 10)
function presetRange(id) {
  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  if (id === 'tm') return { start: iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))), end: iso(today) }
  if (id === 'lm') {
    const s = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))
    const e = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0))
    return { start: iso(s), end: iso(e) }
  }
  const days = PRESETS.find((p) => p.id === id)?.days || 30
  const s = new Date(today); s.setUTCDate(s.getUTCDate() - (days - 1))
  return { start: iso(s), end: iso(today) }
}

const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000) return (n / 1000).toFixed(1) + 'K'
  return Math.round(n).toLocaleString('he-IL')
}
const fmtPct = (n) => (n == null ? '—' : (n * 100).toFixed(1) + '%')
const fmtDur = (sec) => {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
const CHANNEL_HE = {
  'Organic Search': 'חיפוש אורגני', Direct: 'ישיר', 'Paid Search': 'חיפוש ממומן',
  'Organic Social': 'רשתות חברתיות', 'Paid Social': 'סושיאל ממומן', Referral: 'אתרים מפנים',
  Email: 'אימייל', Display: 'דיספליי', Unassigned: 'לא משויך', 'Cross-network': 'רב-ערוצי',
}
const EVENT_HE = {
  page_view: 'צפיית עמוד', session_start: 'תחילת ביקור', first_visit: 'ביקור ראשון',
  scroll: 'גלילה', click: 'קליק', user_engagement: 'מעורבות', form_submit: 'שליחת טופס',
  form_start: 'התחלת מילוי טופס', file_download: 'הורדת קובץ',
}

/* ---------- כרטיס KPI עם השוואה ---------- */
function Kpi({ label, value, prev, fmt = fmtNum, invert = false }) {
  let delta = null
  if (prev != null && prev !== 0 && value != null) delta = (value - prev) / prev
  const up = delta != null && delta > 0.001
  const down = delta != null && delta < -0.001
  const good = invert ? down : up
  const bad = invert ? up : down
  return (
    <div className="antab__kpi">
      <span className="antab__kpi-label">{label}</span>
      <span className="antab__kpi-value">{fmt(value)}</span>
      {delta != null && (
        <span className={`antab__kpi-delta ${good ? 'is-good' : ''} ${bad ? 'is-bad' : ''}`}>
          {up ? '▲' : down ? '▼' : '•'} {Math.abs(delta * 100).toFixed(1)}%
          <i>מול התקופה הקודמת</i>
        </span>
      )}
    </div>
  )
}

/* ---------- גרף קווים SVG ---------- */
const SERIES = [
  { key: 0, id: 'users', label: 'משתמשים', color: '#16688c' },
  { key: 1, id: 'sessions', label: 'ביקורים', color: '#2e9e6b' },
  { key: 2, id: 'views', label: 'צפיות', color: '#8c6d1f' },
  { key: 3, id: 'conv', label: 'המרות', color: '#a90b0c' },
]
function TrendChart({ series }) {
  const [on, setOn] = useState({ users: true, sessions: true, views: false, conv: false })
  if (!series.length) return <p className="antab__empty">אין נתונים בטווח שנבחר</p>
  const W = 900, H = 260, PL = 44, PB = 28, PT = 12
  const act = SERIES.filter((s) => on[s.id])
  const max = Math.max(1, ...act.flatMap((s) => series.map((r) => r.m[s.key] || 0)))
  const x = (i) => PL + (i / Math.max(1, series.length - 1)) * (W - PL - 8)
  const y = (v) => PT + (1 - v / max) * (H - PT - PB)
  const path = (k) => series.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.m[k] || 0).toFixed(1)}`).join('')
  const labels = series.length > 14 ? series.filter((_, i) => i % Math.ceil(series.length / 10) === 0) : series
  const dLabel = (d) => `${d.slice(6, 8)}.${d.slice(4, 6)}`
  return (
    <div>
      <div className="antab__legend">
        {SERIES.map((s) => (
          <button key={s.id} type="button" className={`antab__legend-btn ${on[s.id] ? 'is-on' : ''}`}
            style={{ '--c': s.color }} onClick={() => setOn((p) => ({ ...p, [s.id]: !p[s.id] }))}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="antab__chart-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="antab__chart" preserveAspectRatio="none" dir="ltr">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PL} x2={W - 8} y1={y(max * f)} y2={y(max * f)} className="antab__grid" />
              <text x={PL - 6} y={y(max * f) + 4} className="antab__axis" textAnchor="end">{fmtNum(max * f)}</text>
            </g>
          ))}
          {labels.map((r) => {
            const i = series.indexOf(r)
            return <text key={r.d[0]} x={x(i)} y={H - 8} className="antab__axis" textAnchor="middle">{dLabel(r.d[0])}</text>
          })}
          {act.map((s) => <path key={s.id} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" />)}
        </svg>
      </div>
    </div>
  )
}

/* ---------- פס התפלגות ---------- */
function Bar({ value, max, color }) {
  return <span className="antab__bar"><i style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%`, background: color || 'var(--an-accent)' }} /></span>
}

/* ---------- ייצוא CSV ---------- */
function exportCsv(name, head, lines) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + [head.map(esc).join(','), ...lines.map((l) => l.map(esc).join(','))].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${name}-${iso(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ---------- תובנות אוטומטיות (מחושבות מהנתונים בלבד) ---------- */
function buildInsights({ tot, prevTot, channels, pages, devices }) {
  const out = []
  const pct = (a, b) => (b ? ((a - b) / b) * 100 : null)
  const users = tot[0], prevUsers = prevTot[0]
  const du = pct(users, prevUsers)
  if (du != null && Math.abs(du) >= 5) {
    out.push({ tone: du > 0 ? 'good' : 'bad', text: `התנועה ${du > 0 ? 'עלתה' : 'ירדה'} ב-${Math.abs(du).toFixed(0)}% לעומת התקופה הקודמת (${fmtNum(prevUsers)} → ${fmtNum(users)} משתמשים).` })
  }
  if (channels.length) {
    const top = channels[0]
    out.push({ tone: 'info', text: `מקור התנועה הגדול ביותר: ${CHANNEL_HE[top.d[0]] || top.d[0]} — ${fmtNum(top.m[2])} ביקורים (${((top.m[2] / Math.max(1, tot[2])) * 100).toFixed(0)}% מהתנועה).` })
    const best = [...channels].filter((c) => c.m[2] >= 5).sort((a, b) => b.m[4] / b.m[2] - a.m[4] / a.m[2])[0]
    if (best && best.m[4] > 0) out.push({ tone: 'good', text: `המקור האיכותי ביותר להמרות: ${CHANNEL_HE[best.d[0]] || best.d[0]} (${best.m[4]} המרות מ-${fmtNum(best.m[2])} ביקורים).` })
  }
  if (devices.length >= 2) {
    const total = devices.reduce((a, d) => a + d.m[0], 0)
    const mob = devices.find((d) => d.d[0] === 'mobile')
    const desk = devices.find((d) => d.d[0] === 'desktop')
    if (mob && total) {
      const share = (mob.m[0] / total) * 100
      out.push({ tone: 'info', text: `${share.toFixed(0)}% מהמשתמשים מגיעים מהמובייל.` })
      if (desk && mob.m[2] && desk.m[2] && mob.m[2] < desk.m[2] * 0.75) {
        out.push({ tone: 'warn', text: `שיעור המעורבות במובייל (${fmtPct(mob.m[2])}) נמוך משמעותית מהדסקטופ (${fmtPct(desk.m[2])}) — שווה בדיקת חוויית מובייל.` })
      }
    }
  }
  if (pages.length) {
    const top = pages[0]
    out.push({ tone: 'info', text: `העמוד הנצפה ביותר: ${top.d[1] || top.d[0]} (${fmtNum(top.m[0])} צפיות).` })
    const lowEng = pages.filter((p) => p.m[0] >= Math.max(20, (tot[4] || 0) * 0.03)).map((p) => ({ p, avg: p.m[1] ? p.m[2] / p.m[1] : 0 })).sort((a, b) => a.avg - b.avg)[0]
    if (lowEng && lowEng.avg < 15) out.push({ tone: 'warn', text: `העמוד "${lowEng.p.d[1] || lowEng.p.d[0]}" מקבל תנועה רבה אך זמן המעורבות בו נמוך (${fmtDur(lowEng.avg)}) — שווה לחזק את התוכן שם.` })
  }
  const dConv = pct(tot[8], prevTot[8])
  if (dConv != null && Math.abs(dConv) >= 10 && (tot[8] > 2 || prevTot[8] > 2)) {
    out.push({ tone: dConv > 0 ? 'good' : 'bad', text: `ההמרות (אירועי מפתח) ${dConv > 0 ? 'עלו' : 'ירדו'} ב-${Math.abs(dConv).toFixed(0)}%.` })
  }
  return out
}

/* ============================================================ */
export default function AnalyticsTab() {
  const [preset, setPreset] = useState('30d')
  const [state, setState] = useState({ phase: 'loading' })   // loading | setup | error | ready
  const [rt, setRt] = useState(null)
  const [propId, setPropId] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  const range = useMemo(() => presetRange(preset), [preset])

  const load = useCallback(() => {
    setState((s) => (s.phase === 'ready' ? { ...s, refreshing: true } : { phase: 'loading' }))
    fetchDashboard(range.start, range.end)
      .then((out) => {
        if (!out.configured) { setState({ phase: 'setup', missing: out.missing }); return }
        setState({ phase: 'ready', data: out })
      })
      .catch((e) => setState({ phase: 'error', message: String(e.message || e) }))
  }, [range.start, range.end])

  useEffect(load, [load])
  useEffect(() => { fetchSettings().then((s) => setPropId(String(s.ga4_property_id || ''))).catch(() => {}) }, [])

  // זמן-אמת: רענון כל 60 שניות כשיש חיבור
  useEffect(() => {
    if (state.phase !== 'ready') return
    let on = true
    const pull = () => fetchRealtime().then((d) => on && setRt(d.realtime)).catch(() => {})
    pull()
    const t = setInterval(pull, 60_000)
    return () => { on = false; clearInterval(t) }
  }, [state.phase])

  const saveProp = async () => {
    try {
      await setSetting('ga4_property_id', propId.replace(/\D/g, ''))
      setSaveMsg('נשמר ✓ — בודק חיבור…')
      const t = await testConnection().catch((e) => ({ error: String(e.message || e) }))
      setSaveMsg(t.ok ? 'החיבור תקין ✓' : t.error ? `שגיאת חיבור: ${t.error}` : 'החיבור עדיין לא מוגדר במלואו')
      load()
    } catch (e) { setSaveMsg('שמירה נכשלה: ' + (e.message || e)) }
  }

  /* ---------- מסכי מצב ---------- */
  if (state.phase === 'loading') {
    return <div className="antab"><div className="antab__skeleton">טוען נתונים מ-Google Analytics…</div></div>
  }

  if (state.phase === 'setup' || state.phase === 'error') {
    return (
      <div className="antab">
        <section className="antab__card">
          <div className="antab__head">
            <h3>חיבור Google Analytics לדשבורד</h3>
            <span className="antab__chip antab__chip--off">{state.phase === 'error' ? 'שגיאת חיבור' : 'ממתין להגדרה'}</span>
          </div>
          {state.phase === 'error' && <p className="antab__err">‏{state.message}</p>}
          <p className="antab__lead">
            תג המדידה כבר פועל באתר והנתונים נאספים בחשבון שלכם. כדי שהדשבורד כאן יציג אותם,
            צריך חיבור קריאה חד-פעמי (כ-5 דקות):
          </p>
          <ol className="antab__steps">
            <li>היכנסו ל-<a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud Console — הפעלת Analytics Data API</a> (עם אותו חשבון Google) ולחצו <b>Enable</b>. אם תתבקשו — צרו פרויקט חדש בשם kurkoos.</li>
            <li>עברו ל-<a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">Service Accounts</a> ← <b>Create service account</b> (שם: analytics-reader) ← Done.</li>
            <li>לחצו על החשבון שנוצר ← לשונית <b>Keys</b> ← Add key ← Create new key ← <b>JSON</b>. יירד קובץ.</li>
            <li>ב-<a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a> ← Project ← Settings ← Environment Variables הוסיפו שניים מתוך הקובץ: <code>GA_SA_CLIENT_EMAIL</code> (השדה client_email) ו-<code>GA_SA_PRIVATE_KEY</code> (השדה private_key, כולל BEGIN/END) ← ואז Redeploy.</li>
            <li>ב-<a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">Google Analytics</a> ← Admin ← Property access management ← <b>+</b> ← הדביקו את אימייל חשבון השירות ← תפקיד <b>Viewer</b>.</li>
            <li>ב-Analytics ← Admin ← Property settings העתיקו את <b>Property ID</b> (מספר) והדביקו כאן:</li>
          </ol>
          <div className="antab__row">
            <label className="antab__field">Property ID (מספרי)
              <input dir="ltr" placeholder="למשל 501234567" value={propId} onChange={(e) => setPropId(e.target.value)} />
            </label>
            <button type="button" className="antab__btn" onClick={saveProp}>שמירה ובדיקת חיבור</button>
          </div>
          {saveMsg && <p className="antab__status">{saveMsg}</p>}
        </section>
      </div>
    )
  }

  /* ---------- דשבורד ---------- */
  const { data } = state
  const R = data.reports
  const tot = totalsOf(R.totals)
  const prevTot = totalsOf(R.totalsPrev)
  const series = rows(R.timeseries)
  const channels = rows(R.channels)
  const sources = rows(R.sources)
  const pages = rows(R.pages)
  const devices = rows(R.devices)
  const countries = rows(R.countries)
  const cities = rows(R.cities)
  const events = rows(R.events)
  const insights = buildInsights({ tot, prevTot, channels, pages, devices })
  const rtUsers = rt ? rt.rows?.reduce((a, r) => a + (Number(r.metricValues?.[0]?.value) || 0), 0) ?? 0 : null

  const DEVICE_HE = { desktop: 'דסקטופ', mobile: 'מובייל', tablet: 'טאבלט' }
  const devTotal = devices.reduce((a, d) => a + d.m[0], 0)

  return (
    <div className="antab">
      {/* כותרת + טווח */}
      <div className="antab__toolbar">
        <div className="antab__toolbar-info">
          <h3>תנועת האתר</h3>
          <span className="antab__range-label">{range.start} — {range.end} · נתוני Google Analytics</span>
        </div>
        <div className="antab__presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`antab__preset ${preset === p.id ? 'is-on' : ''}`} onClick={() => setPreset(p.id)}>{p.label}</button>
          ))}
          <button type="button" className="antab__preset antab__preset--refresh" onClick={load} title="רענון">⟳</button>
        </div>
      </div>

      {/* זמן אמת */}
      <section className="antab__rt">
        <span className="antab__rt-dot" />
        <b>{rtUsers == null ? '…' : rtUsers}</b> גולשים באתר עכשיו
        {rt?.rows?.length > 0 && (
          <span className="antab__rt-pages">
            {rt.rows.slice(0, 3).map((r) => `${r.dimensionValues[0].value} (${r.metricValues[0].value})`).join(' · ')}
          </span>
        )}
      </section>

      {/* KPI */}
      <div className="antab__kpis">
        <Kpi label="משתמשים" value={tot[0]} prev={prevTot[0]} />
        <Kpi label="משתמשים חדשים" value={tot[1]} prev={prevTot[1]} />
        <Kpi label="ביקורים" value={tot[2]} prev={prevTot[2]} />
        <Kpi label="ביקורים מעורבים" value={tot[3]} prev={prevTot[3]} />
        <Kpi label="צפיות עמוד" value={tot[4]} prev={prevTot[4]} />
        <Kpi label="צפיות לביקור" value={tot[2] ? tot[4] / tot[2] : null} prev={prevTot[2] ? prevTot[4] / prevTot[2] : null} fmt={(v) => (v == null ? '—' : v.toFixed(2))} />
        <Kpi label="שיעור מעורבות" value={tot[5]} prev={prevTot[5]} fmt={fmtPct} />
        <Kpi label="שיעור נטישה" value={tot[6]} prev={prevTot[6]} fmt={fmtPct} invert />
        <Kpi label="משך ביקור ממוצע" value={tot[9]} prev={prevTot[9]} fmt={fmtDur} />
        <Kpi label="אירועים" value={tot[7]} prev={prevTot[7]} />
        <Kpi label="המרות (אירועי מפתח)" value={tot[8]} prev={prevTot[8]} />
        <Kpi label="שיעור המרה" value={tot[2] ? tot[8] / tot[2] : null} prev={prevTot[2] ? prevTot[8] / prevTot[2] : null} fmt={fmtPct} />
      </div>

      {/* תובנות */}
      {insights.length > 0 && (
        <section className="antab__card">
          <h4 className="antab__sect-title">תובנות</h4>
          <ul className="antab__insights">
            {insights.map((ins, i) => <li key={i} className={`is-${ins.tone}`}>{ins.text}</li>)}
          </ul>
        </section>
      )}

      {/* גרף מרכזי */}
      <section className="antab__card">
        <h4 className="antab__sect-title">מגמה יומית</h4>
        <TrendChart series={series} />
      </section>

      <div className="antab__grid2">
        {/* ערוצי תנועה */}
        <section className="antab__card">
          <div className="antab__sect-head">
            <h4 className="antab__sect-title">מקורות תנועה</h4>
            <button type="button" className="antab__csv" onClick={() => exportCsv('channels', ['ערוץ', 'משתמשים', 'חדשים', 'ביקורים', 'מעורבות', 'המרות'], channels.map((c) => [CHANNEL_HE[c.d[0]] || c.d[0], c.m[0], c.m[1], c.m[2], fmtPct(c.m[3]), c.m[4]]))}>CSV</button>
          </div>
          <table className="antab__table">
            <thead><tr><th>ערוץ</th><th>משתמשים</th><th>ביקורים</th><th>מעורבות</th><th>המרות</th></tr></thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.d[0]}>
                  <td className="antab__td-name">{CHANNEL_HE[c.d[0]] || c.d[0]}<Bar value={c.m[0]} max={channels[0]?.m[0]} /></td>
                  <td>{fmtNum(c.m[0])}</td><td>{fmtNum(c.m[2])}</td><td>{fmtPct(c.m[3])}</td><td>{c.m[4] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* מקורות ספציפיים */}
        <section className="antab__card">
          <div className="antab__sect-head">
            <h4 className="antab__sect-title">מקורות מפורטים</h4>
            <button type="button" className="antab__csv" onClick={() => exportCsv('sources', ['מקור', 'סוג', 'משתמשים', 'ביקורים', 'המרות'], sources.map((s) => [s.d[0], s.d[1], s.m[0], s.m[1], s.m[3]]))}>CSV</button>
          </div>
          <table className="antab__table">
            <thead><tr><th>מקור / סוג</th><th>משתמשים</th><th>ביקורים</th><th>המרות</th></tr></thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={i}>
                  <td className="antab__td-name" dir="ltr">{s.d[0]} / {s.d[1]}</td>
                  <td>{fmtNum(s.m[0])}</td><td>{fmtNum(s.m[1])}</td><td>{s.m[3] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* עמודים */}
      <section className="antab__card">
        <div className="antab__sect-head">
          <h4 className="antab__sect-title">העמודים הנצפים ביותר</h4>
          <button type="button" className="antab__csv" onClick={() => exportCsv('pages', ['עמוד', 'נתיב', 'צפיות', 'משתמשים', 'זמן ממוצע', 'המרות'], pages.map((p) => [p.d[1], p.d[0], p.m[0], p.m[1], fmtDur(p.m[1] ? p.m[2] / p.m[1] : 0), p.m[3]]))}>CSV</button>
        </div>
        <table className="antab__table">
          <thead><tr><th>עמוד</th><th>צפיות</th><th>משתמשים</th><th>זמן ממוצע</th><th>המרות</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.d[0]}>
                <td className="antab__td-name">
                  <span className="antab__page-title">{p.d[1] || p.d[0]}</span>
                  <span className="antab__page-path" dir="ltr">{p.d[0]}</span>
                  <Bar value={p.m[0]} max={pages[0]?.m[0]} />
                </td>
                <td>{fmtNum(p.m[0])}</td><td>{fmtNum(p.m[1])}</td>
                <td>{fmtDur(p.m[1] ? p.m[2] / p.m[1] : 0)}</td><td>{p.m[3] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="antab__grid3">
        {/* מכשירים */}
        <section className="antab__card">
          <h4 className="antab__sect-title">מכשירים</h4>
          {devices.map((d) => (
            <div key={d.d[0]} className="antab__mini-row">
              <span className="antab__mini-name">{DEVICE_HE[d.d[0]] || d.d[0]}</span>
              <Bar value={d.m[0]} max={devTotal} color="#16688c" />
              <span className="antab__mini-val">{devTotal ? Math.round((d.m[0] / devTotal) * 100) : 0}% · {fmtNum(d.m[0])}</span>
            </div>
          ))}
          <p className="antab__footnote">מעורבות: {devices.map((d) => `${DEVICE_HE[d.d[0]] || d.d[0]} ${fmtPct(d.m[2])}`).join(' · ')}</p>
        </section>

        {/* מדינות */}
        <section className="antab__card">
          <h4 className="antab__sect-title">מדינות</h4>
          {countries.map((c) => (
            <div key={c.d[0]} className="antab__mini-row">
              <span className="antab__mini-name">{c.d[0]}</span>
              <Bar value={c.m[0]} max={countries[0]?.m[0]} color="#2e9e6b" />
              <span className="antab__mini-val">{fmtNum(c.m[0])}</span>
            </div>
          ))}
        </section>

        {/* ערים */}
        <section className="antab__card">
          <h4 className="antab__sect-title">ערים</h4>
          {cities.filter((c) => c.d[0] !== '(not set)').slice(0, 8).map((c) => (
            <div key={c.d[0]} className="antab__mini-row">
              <span className="antab__mini-name">{c.d[0]}</span>
              <Bar value={c.m[0]} max={cities[0]?.m[0]} color="#8c6d1f" />
              <span className="antab__mini-val">{fmtNum(c.m[0])}</span>
            </div>
          ))}
        </section>
      </div>

      {/* אירועים */}
      <section className="antab__card">
        <div className="antab__sect-head">
          <h4 className="antab__sect-title">אירועים</h4>
          <button type="button" className="antab__csv" onClick={() => exportCsv('events', ['אירוע', 'כמות', 'משתמשים'], events.map((e) => [e.d[0], e.m[0], e.m[1]]))}>CSV</button>
        </div>
        <div className="antab__events">
          {events.map((e) => (
            <div key={e.d[0]} className="antab__event">
              <span className="antab__event-name" dir="ltr">{e.d[0]}</span>
              {EVENT_HE[e.d[0]] && <span className="antab__event-he">{EVENT_HE[e.d[0]]}</span>}
              <b>{fmtNum(e.m[0])}</b>
              <i>{fmtNum(e.m[1])} משתמשים</i>
            </div>
          ))}
        </div>
      </section>

      {/* הגדרות */}
      <section className="antab__card antab__card--muted">
        <button type="button" className="antab__collapse" onClick={() => setShowSetup((v) => !v)}>
          הגדרות חיבור {showSetup ? '▴' : '▾'}
        </button>
        {showSetup && (
          <div className="antab__row" style={{ marginTop: '0.8rem' }}>
            <label className="antab__field">GA4 Property ID
              <input dir="ltr" value={propId} onChange={(e) => setPropId(e.target.value)} />
            </label>
            <button type="button" className="antab__btn" onClick={saveProp}>שמירה ובדיקה</button>
            {saveMsg && <p className="antab__status">{saveMsg}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
