import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import { supabase } from '../../lib/supabase.js'
import { trackingDisabled, setTrackingDisabled } from '../../lib/track.js'
import { fetchDashboard, fetchRealtime, fetchPageDetail, testConnection, rows, totalsOf } from '../../lib/analyticsApi.js'
import './AnalyticsTab.css'

/* ============================================================
   AnalyticsTab — מערכת אנליטיקס Data-First על נתוני GA4 אמיתיים.
   הנתונים הם המוצר; העיצוב משרת אותם: היררכיה, צפיפות מידע,
   השוואות ו-Drill-Down — בלי קישוטים. אין נתוני דמו בשום מצב.
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
  if (id === 'lm') return { start: iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))), end: iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0))) }
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
const fmtPct = (n, d = 1) => (n == null || Number.isNaN(n) ? '—' : (n * 100).toFixed(d) + '%')
const fmtDur = (sec) => { if (!sec) return '0:00'; const m = Math.floor(sec / 60); return `${m}:${String(Math.round(sec % 60)).padStart(2, '0')}` }
const dLabel = (d) => `${d.slice(6, 8)}.${d.slice(4, 6)}`
const CHANNEL_HE = { 'Organic Search': 'חיפוש אורגני', Direct: 'ישיר', 'Paid Search': 'חיפוש ממומן', 'Organic Social': 'רשתות חברתיות', 'Paid Social': 'סושיאל ממומן', Referral: 'אתרים מפנים', Email: 'אימייל', Display: 'דיספליי', Unassigned: 'לא משויך', 'Cross-network': 'רב-ערוצי' }
const DEVICE_HE = { desktop: 'דסקטופ', mobile: 'מובייל', tablet: 'טאבלט' }

/* ---------- delta ---------- */
function Delta({ cur, prev, invert = false, dim = false }) {
  if (prev == null || !prev || cur == null) return <span className="an-delta an-delta--na">—</span>
  const d = (cur - prev) / prev
  if (Math.abs(d) < 0.002) return <span className="an-delta an-delta--na">0%</span>
  const up = d > 0
  const good = invert ? !up : up
  return (
    <span className={`an-delta ${dim ? '' : good ? 'is-good' : 'is-bad'}`}>
      {up ? '↑' : '↓'}{Math.abs(d * 100).toFixed(1)}%
    </span>
  )
}

/* ---------- sparkline ---------- */
function Spark({ values, w = 96, h = 26 }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const span = Math.max(1, max - min)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ')
  return <svg className="an-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} dir="ltr"><polyline points={pts} fill="none" /></svg>
}

/* ---------- bucketing (יומי/שבועי/חודשי) ---------- */
function bucket(series, gran) {
  if (gran === 'day' || series.length === 0) return series
  const keyOf = (d) => {
    if (gran === 'month') return d.slice(0, 6)
    const dt = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00Z`)
    const day = (dt.getUTCDay() + 1) % 7
    dt.setUTCDate(dt.getUTCDate() - day)
    return iso(dt).replace(/-/g, '')
  }
  const map = new Map()
  for (const r of series) {
    const k = keyOf(r.d[0])
    const e = map.get(k) || { d: [k], m: [0, 0, 0, 0] }
    r.m.forEach((v, i) => { e.m[i] += v })
    map.set(k, e)
  }
  return [...map.values()]
}

/* ---------- anomalies (z-score על התנועה היומית) ---------- */
function findAnomalies(series, mi = 0) {
  if (series.length < 8) return []
  const vals = series.map((r) => r.m[mi])
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1
  return series
    .map((r, i) => ({ r, i, z: (r.m[mi] - mean) / std }))
    .filter((x) => Math.abs(x.z) > 2.2 && Math.abs(x.r.m[mi] - mean) > mean * 0.25)
}

/* ---------- הגרף המרכזי: השוואה, tooltip, granularity, anomalies ---------- */
const METRICS = [
  { i: 0, id: 'users', label: 'משתמשים' },
  { i: 1, id: 'sessions', label: 'ביקורים' },
  { i: 2, id: 'views', label: 'צפיות' },
  { i: 3, id: 'conv', label: 'פניות' },
]

/* ארבע פעולות הפנייה, באותו סדר ובאותם שמות כמו CONVERSION_EVENTS בשרת.
   השמות בעברית הם מה שבעל העסק רואה; שמות האירועים הם מה שגוגל סופר. */
const CONV_TYPES = [
  { ev: 'generate_lead', label: 'טופס ליד', hint: 'שליחת טופס באתר: דף הבית, עמוד פרויקט, עמוד השארת פרטים' },
  { ev: 'phone_click', label: 'טלפון', hint: 'לחיצה על מספר הטלפון. גוגל לא יודע אם השיחה יצאה בפועל' },
  { ev: 'whatsapp_click', label: 'וואטסאפ', hint: 'לחיצה על כפתור וואטסאפ, כולל הכפתור הצף' },
  { ev: 'email_click', label: 'מייל', hint: 'לחיצה על כתובת מייל' },
]

/* טווח קודם באותו אורך, זהה לחישוב בשרת, לספירת הלידים מהמערכת */
function prevRangeOf(start, end) {
  const s = new Date(start + 'T00:00:00Z'), e = new Date(end + 'T00:00:00Z')
  const days = Math.round((e - s) / 86400000) + 1
  const ps = new Date(s); ps.setUTCDate(ps.getUTCDate() - days)
  const pe = new Date(s); pe.setUTCDate(pe.getUTCDate() - 1)
  return { start: iso(ps), end: iso(pe) }
}
function HeroChart({ series, prevSeries }) {
  const [metric, setMetric] = useState(0)
  const [gran, setGran] = useState('day')
  const [compare, setCompare] = useState(true)
  const [hover, setHover] = useState(null)
  const wrapRef = useRef(null)

  const cur = useMemo(() => bucket(series, gran), [series, gran])
  const prev = useMemo(() => bucket(prevSeries, gran), [prevSeries, gran])
  const anomalies = useMemo(() => (gran === 'day' ? findAnomalies(cur, metric) : []), [cur, metric, gran])

  if (!cur.length) return <p className="an-empty">אין נתונים בטווח שנבחר</p>

  const W = 960, H = 300, PL = 46, PB = 26, PT = 14, PR = 10
  const n = cur.length
  const max = Math.max(1, ...cur.map((r) => r.m[metric]), ...(compare ? prev.map((r) => r.m[metric]) : [0]))
  const x = (i, len = n) => PL + (len < 2 ? (W - PL - PR) / 2 : (i / (len - 1)) * (W - PL - PR))
  const y = (v) => PT + (1 - v / max) * (H - PT - PB)
  const line = (list) => list.map((r, i) => `${i ? 'L' : 'M'}${x(i, list.length).toFixed(1)},${y(r.m[metric]).toFixed(1)}`).join('')
  const area = `${line(cur)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`
  const ticks = cur.length > 12 ? cur.filter((_, i) => i % Math.ceil(cur.length / 9) === 0) : cur

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const rel = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((rel - PL) / (W - PL - PR)) * (n - 1))
    if (i >= 0 && i < n) setHover({ i, px: (x(i) / W) * rect.width })
    else setHover(null)
  }
  const hv = hover != null ? cur[hover.i] : null
  const hvPrev = hover != null && prev[hover.i] ? prev[hover.i] : null
  const granLabel = { day: 'יומי', week: 'שבועי', month: 'חודשי' }

  return (
    <div className="an-hero">
      <div className="an-hero__bar">
        <div className="an-seg">
          {METRICS.map((m) => (
            <button key={m.id} type="button" className={metric === m.i ? 'is-on' : ''} onClick={() => setMetric(m.i)}>{m.label}</button>
          ))}
        </div>
        <div className="an-hero__bar-side">
          <label className="an-check"><input type="checkbox" checked={compare} onChange={() => setCompare(!compare)} /> תקופה קודמת</label>
          <div className="an-seg an-seg--sm">
            {['day', 'week', 'month'].map((g) => (
              <button key={g} type="button" className={gran === g ? 'is-on' : ''} onClick={() => { setGran(g); setHover(null) }}>{granLabel[g]}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="an-hero__plot" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" dir="ltr">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PL} x2={W - PR} y1={y(max * f)} y2={y(max * f)} className="an-grid" />
              <text x={PL - 7} y={y(max * f) + 4} className="an-axis" textAnchor="end">{fmtNum(max * f)}</text>
            </g>
          ))}
          {ticks.map((r) => (
            <text key={r.d[0]} x={x(cur.indexOf(r))} y={H - 7} className="an-axis" textAnchor="middle">
              {gran === 'month' ? `${r.d[0].slice(4, 6)}/${r.d[0].slice(2, 4)}` : dLabel(r.d[0])}
            </text>
          ))}
          <path d={area} className="an-area" />
          {compare && prev.length > 1 && <path d={line(prev)} className="an-line--prev" fill="none" />}
          <path d={line(cur)} className="an-line" fill="none" />
          {anomalies.map((a) => (
            <circle key={a.r.d[0]} cx={x(a.i)} cy={y(a.r.m[metric])} r="4.5" className={a.z > 0 ? 'an-dot--spike' : 'an-dot--drop'} />
          ))}
          <circle cx={x(n - 1)} cy={y(cur[n - 1].m[metric])} r="3.5" className="an-dot--last" />
          {hover != null && <line x1={x(hover.i)} x2={x(hover.i)} y1={PT} y2={H - PB} className="an-cross" />}
        </svg>
        {hv && (
          <div className="an-tip" style={{ insetInlineStart: `min(max(${hover.px}px, 70px), calc(100% - 90px))` }}>
            <b>{gran === 'month' ? `${hv.d[0].slice(4, 6)}/${hv.d[0]}`.slice(0, 7) : dLabel(hv.d[0])}</b>
            <span>{METRICS[metric].label}: <b>{fmtNum(hv.m[metric])}</b></span>
            {hvPrev && <span className="an-tip__prev">תקופה קודמת: {fmtNum(hvPrev.m[metric])}</span>}
          </div>
        )}
      </div>

      {anomalies.length > 0 && (
        <p className="an-anom-note">
          זוהו {anomalies.length} ימים חריגים: {anomalies.map((a) => `${dLabel(a.r.d[0])} (${a.z > 0 ? 'קפיצה' : 'ירידה'} — ${fmtNum(a.r.m[metric])})`).join(' · ')}
        </p>
      )}
    </div>
  )
}

/* ---------- טבלה עם מיון/חיפוש ---------- */
function useSort(def) {
  const [sort, setSort] = useState(def)
  const toggle = (key) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))
  return [sort, toggle]
}
function Th({ label, k, sort, onSort, num = true }) {
  return (
    <th className={num ? 'is-num' : ''} onClick={() => onSort(k)} role="button">
      {label}{sort.key === k ? (sort.desc ? ' ↓' : ' ↑') : ''}
    </th>
  )
}

/* ---------- Drill-down לעמוד ---------- */
function PageDrill({ path, range }) {
  const [state, setState] = useState({ phase: 'loading' })
  useEffect(() => {
    let on = true
    setState({ phase: 'loading' })
    fetchPageDetail(path, range.start, range.end)
      .then((d) => on && setState({ phase: 'ready', d }))
      .catch((e) => on && setState({ phase: 'error', message: String(e.message || e) }))
    return () => { on = false }
  }, [path, range.start, range.end])

  if (state.phase === 'loading') return <div className="an-drill an-drill--loading">טוען נתוני עמוד…</div>
  if (state.phase === 'error') return <div className="an-drill an-drill--loading">שגיאה: {state.message}</div>
  const ts = rows(state.d.reports.timeseries)
  const srcs = rows(state.d.reports.sources)
  const devs = rows(state.d.reports.devices)
  const devTotal = devs.reduce((a, d) => a + d.m[0], 0)
  return (
    <div className="an-drill">
      <div className="an-drill__col an-drill__col--chart">
        <span className="an-h6">צפיות לאורך התקופה</span>
        {ts.length > 1 ? <Spark values={ts.map((r) => r.m[0])} w={260} h={54} /> : <span className="an-muted">מעט נתונים</span>}
      </div>
      <div className="an-drill__col">
        <span className="an-h6">מקורות לעמוד זה</span>
        {srcs.length ? srcs.slice(0, 5).map((s) => (
          <div key={s.d[0]} className="an-row"><span dir="ltr">{s.d[0]}</span><b>{fmtNum(s.m[0])}</b></div>
        )) : <span className="an-muted">—</span>}
      </div>
      <div className="an-drill__col">
        <span className="an-h6">מכשירים</span>
        {devs.map((d) => (
          <div key={d.d[0]} className="an-row"><span>{DEVICE_HE[d.d[0]] || d.d[0]}</span><b>{devTotal ? Math.round((d.m[0] / devTotal) * 100) : 0}%</b></div>
        ))}
      </div>
    </div>
  )
}

/* ---------- CSV ---------- */
function exportCsv(name, head, lines) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + [head.map(esc).join(','), ...lines.map((l) => l.map(esc).join(','))].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${name}-${iso(new Date())}.csv`
  a.click(); URL.revokeObjectURL(a.href)
}

/* ---------- תובנות (מהנתונים בלבד) ---------- */
function buildInsights({ tot, prevTot, channels, pages, devices, anomalies }) {
  const out = []
  const pct = (a, b) => (b ? ((a - b) / b) * 100 : null)
  const du = pct(tot[0], prevTot[0])
  if (du != null && Math.abs(du) >= 5) out.push({ tone: du > 0 ? 'good' : 'bad', text: `התנועה ${du > 0 ? 'עלתה' : 'ירדה'} ב-${Math.abs(du).toFixed(0)}% מול התקופה הקודמת (${fmtNum(prevTot[0])} → ${fmtNum(tot[0])} משתמשים).` })
  if (channels.length) {
    const top = channels[0]
    out.push({ tone: 'info', text: `${CHANNEL_HE[top.d[0]] || top.d[0]} הוא מקור התנועה הגדול ביותר — ${((top.m[2] / Math.max(1, tot[2])) * 100).toFixed(0)}% מהביקורים.` })
    const overallCR = tot[2] ? tot[8] / tot[2] : 0
    const quality = channels.filter((c) => c.m[2] >= 10 && c.m[4] / c.m[2] > overallCR * 1.5 && c.m[4] > 1)
    quality.slice(0, 1).forEach((c) => out.push({ tone: 'good', text: `${CHANNEL_HE[c.d[0]] || c.d[0]} מביא פחות תנועה אך ממיר פי ${(c.m[4] / c.m[2] / Math.max(overallCR, 0.0001)).toFixed(1)} מהממוצע — תנועה איכותית.` }))
  }
  if (devices.length >= 2) {
    const total = devices.reduce((a, d) => a + d.m[0], 0)
    const mob = devices.find((d) => d.d[0] === 'mobile'), desk = devices.find((d) => d.d[0] === 'desktop')
    if (mob && desk && total) {
      const mCR = mob.m[1] ? mob.m[3] / mob.m[1] : 0, dCR = desk.m[1] ? desk.m[3] / desk.m[1] : 0
      if (dCR > 0 && mCR < dCR * 0.6 && mob.m[0] / total > 0.4) {
        out.push({ tone: 'warn', text: `המובייל מהווה ${Math.round((mob.m[0] / total) * 100)}% מהתנועה אך ממיר ${Math.round((1 - mCR / dCR) * 100)}% פחות מהדסקטופ — שווה בדיקת חוויית מובייל.` })
      }
    }
  }
  if (pages.length) {
    const heavy = pages.filter((p) => p.m[0] >= Math.max(20, (tot[4] || 0) * 0.04))
    const low = heavy.map((p) => ({ p, avg: p.m[1] ? p.m[2] / p.m[1] : 0 })).sort((a, b) => a.avg - b.avg)[0]
    if (low && low.avg < 12) out.push({ tone: 'warn', text: `"${low.p.d[1] || low.p.d[0]}" מקבל תנועה גבוהה אך זמן מעורבות נמוך במיוחד (${fmtDur(low.avg)}).` })
  }
  anomalies.slice(0, 1).forEach((a) => out.push({ tone: a.z > 0 ? 'info' : 'warn', text: `ב-${dLabel(a.r.d[0])} נרשמה ${a.z > 0 ? 'קפיצה' : 'ירידה'} חריגה בתנועה (${fmtNum(a.r.m[0])} משתמשים) — חורג משמעותית מהממוצע.` }))
  return out
}

/* ============================================================ */
/* ============================================================
   פאנל זמן אמת. שלושה דברים, וכל אחד מסומן במפורש לאיזה חלון זמן
   הוא שייך, כדי שלא ייראה שהכל "עכשיו":
   • כמה גולשים ביקרו ב-30 הדקות האחרונות, ועקומת הצפיות באותו חלון
   • באילו עמודים הם צופים כרגע
   • מאיזה מקור הגיעו — נתון של היום, לא של הרגע, כי ל-API של זמן
     אמת של Google אין בכלל מימדי מקור תנועה
   ============================================================ */
/* החרגה עצמית. באתר עם עשרות משתמשים בחודש, כמה סיבובים שלנו באתר
   מזיזים את המספרים באחוזים ניכרים. הדגל נשמר בדפדפן הזה בלבד. */
function SelfExclude() {
  const [off, setOff] = useState(trackingDisabled())
  return (
    <label className="an-selfex" data-tip="מסמן את הדפדפן הזה כ״אל תספור״. הביקורים שלך באתר לא ייכנסו לסטטיסטיקה, כך שהמספרים משקפים גולשים אמיתיים בלבד. ההגדרה נשמרת בדפדפן הזה בלבד.">
      <input
        type="checkbox"
        checked={off}
        onChange={(e) => { setTrackingDisabled(e.target.checked); setOff(e.target.checked) }}
      />
      אל תספור את הביקורים שלי
    </label>
  )
}

function LivePanel({ rt, users }) {
  const pages = rows(rt?.now).filter((r) => r.m[0] > 0)
  const minutes = rows(rt?.byMinute)
  const channels = rows(rt?.todayChannels)
  const sources = rows(rt?.todaySources)

  // minutesAgo מגיע כמחרוזת "0" עד "29" — 0 זו הדקה הנוכחית
  const buckets = Array.from({ length: 30 }, (_, i) => {
    const hit = minutes.find((r) => Number(r.d[0]) === 29 - i)
    return hit ? hit.m[0] : 0
  })
  const peak = Math.max(1, ...buckets)
  const halfHour = buckets.reduce((a, b) => a + b, 0)

  return (
    <section className="an-live-panel">
      <div className="an-live-panel__head">
        <div>
          <h3>פעילות ב-30 הדקות האחרונות</h3>
          <span className="an-sub">מתעדכן כל דקה · Google Analytics מחזיק חלון של 30 דקות אחורה</span>
        </div>
        <SelfExclude />
      </div>

      <div className="an-live-panel__grid">
        <div className="an-live-now">
          <span className="an-live-now__num">{users == null ? '· · ·' : users}</span>
          <span className="an-live-now__lbl">גולשים ב-30 הדקות האחרונות</span>
          <div className="an-live-spark" title="פעילות ב-30 הדקות האחרונות">
            {buckets.map((v, i) => (
              <i key={i} style={{ height: `${Math.max(3, (v / peak) * 100)}%` }} className={v ? '' : 'is-empty'} />
            ))}
          </div>
          <span className="an-live-now__foot">
            {halfHour ? `${halfHour} צפיות בחצי השעה האחרונה` : 'אין פעילות בחצי השעה האחרונה'}
          </span>
        </div>

        <div className="an-live-list">
          <h4>עמודים שנצפים כרגע</h4>
          {pages.length ? (
            <ul>
              {pages.map((r) => (
                <li key={r.d[0]}><span className="an-live-list__name" title={r.d[0]}>{r.d[0] || '(ללא כותרת)'}</span><b>{r.m[0]}</b></li>
              ))}
            </ul>
          ) : <p className="an-empty an-empty--sm">אף אחד לא ביקר באתר ב-30 הדקות האחרונות</p>}
          <p className="an-live-note">
            Google מדווח בזמן אמת לפי כותרת העמוד ולא לפי הכתובת, ולכן מוצגות כאן הכותרות.
          </p>
        </div>

        <div className="an-live-list">
          <h4>מאיפה הגיעו <span className="an-live-badge">היום</span></h4>
          {channels.length ? (
            <ul>
              {channels.map((r) => (
                <li key={r.d[0]}><span className="an-live-list__name">{CHANNEL_HE[r.d[0]] || r.d[0]}</span><b>{r.m[1]}</b></li>
              ))}
            </ul>
          ) : <p className="an-empty an-empty--sm">אין עדיין ביקורים היום</p>}
          {sources.length > 0 && (
            <p className="an-live-note">
              מקורות מדויקים: {sources.slice(0, 4).map((r) => `${r.d[0]}${r.d[1] && r.d[1] !== '(none)' ? ` / ${r.d[1]}` : ''} (${r.m[1]})`).join(' · ')}
            </p>
          )}
          <p className="an-live-note">
            המקור הוא נתון של היום ולא של הרגע: ל-API של זמן אמת של Google אין מימד מקור תנועה.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function AnalyticsTab() {
  const [preset, setPreset] = useState('30d')
  const [state, setState] = useState({ phase: 'loading' })
  const [rt, setRt] = useState(null)
  const [propId, setPropId] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [openPage, setOpenPage] = useState(null)
  const [pageQ, setPageQ] = useState('')
  const [srcQ, setSrcQ] = useState('')
  const [pSort, pToggle] = useSort({ key: 0, desc: true })
  const [sSort, sToggle] = useSort({ key: 1, desc: true })

  const range = useMemo(() => presetRange(preset), [preset])

  const load = useCallback(() => {
    setState((s) => (s.phase === 'ready' ? { ...s, refreshing: true } : { phase: 'loading' }))
    fetchDashboard(range.start, range.end)
      .then((out) => (out.configured ? setState({ phase: 'ready', data: out }) : setState({ phase: 'setup', missing: out.missing })))
      .catch((e) => setState({ phase: 'error', message: String(e.message || e) }))
  }, [range.start, range.end])
  useEffect(load, [load])
  useEffect(() => { fetchSettings().then((s) => setPropId(String(s.ga4_property_id || ''))).catch(() => {}) }, [])

  /* לידים שנשמרו בפועל בלוח הלידים, לאותו טווח ולטווח הקודם. זה המספר
     הקובע: גוגל סופר רק דפדפנים שמאפשרים מדידה, והמערכת סופרת כל טופס
     שנשלח. לידים שהוזנו ידנית לא נספרים, כי הם לא הגיעו מהאתר. */
  const [leadCounts, setLeadCounts] = useState({ cur: null, prev: null })
  useEffect(() => {
    if (!supabase) return
    let on = true
    const count = async ({ start, end }) => {
      const { data, error } = await supabase
        .from('leads').select('id, source')
        .gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59.999Z`)
      if (error) throw error
      return (data || []).filter((l) => l.source !== 'manual').length
    }
    Promise.all([count(range), count(prevRangeOf(range.start, range.end))])
      .then(([cur, prev]) => on && setLeadCounts({ cur, prev }))
      .catch(() => on && setLeadCounts({ cur: null, prev: null }))
    return () => { on = false }
  }, [range.start, range.end])
  useEffect(() => {
    if (state.phase !== 'ready') return
    let on = true
    const pull = () => fetchRealtime().then((d) => on && setRt(d.rt || { now: d.realtime })).catch(() => {})
    pull()
    const t = setInterval(pull, 60_000)
    return () => { on = false; clearInterval(t) }
  }, [state.phase])

  const saveProp = async () => {
    try {
      await setSetting('ga4_property_id', propId.replace(/\D/g, ''))
      setSaveMsg('נשמר — בודק חיבור…')
      const t = await testConnection().catch((e) => ({ error: String(e.message || e) }))
      setSaveMsg(t.ok ? 'החיבור תקין ✓' : t.error ? `שגיאת חיבור: ${t.error}` : 'החיבור עדיין לא מוגדר במלואו')
      load()
    } catch (e) { setSaveMsg('שמירה נכשלה: ' + (e.message || e)) }
  }

  if (state.phase === 'loading') return <div className="an"><div className="an-skeleton">טוען נתונים מ-Google Analytics…</div></div>

  if (state.phase === 'setup' || state.phase === 'error') {
    return (
      <div className="an">
        <section className="an-setup">
          <h3>חיבור Google Analytics לדשבורד</h3>
          {state.phase === 'error' && <p className="an-error" dir="ltr">{state.message}</p>}
          <p className="an-muted">
            תג המדידה כבר פועל באתר. כדי שהדשבורד יקרא את הנתונים נדרש חיבור קריאה חד-פעמי (כ-5 דקות):
          </p>
          <ol className="an-steps">
            <li><a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener noreferrer">הפעלת Analytics Data API</a> בענן של Google (Enable; צרו פרויקט אם תתבקשו)</li>
            <li><a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">Service Accounts</a> ← Create service account (שם: analytics-reader) ← Done</li>
            <li>בחשבון שנוצר: Keys ← Add key ← Create new key ← JSON (יירד קובץ)</li>
            <li>ב-Vercel ← Settings ← Environment Variables: <code>GA_SA_CLIENT_EMAIL</code> (client_email מהקובץ) ו-<code>GA_SA_PRIVATE_KEY</code> (private_key, כולל BEGIN/END) ← Redeploy</li>
            <li>ב-Analytics ← Admin ← Property access management ← הוסיפו את אימייל חשבון השירות כ-Viewer</li>
            <li>ב-Analytics ← Admin ← Property settings העתיקו את ה-Property ID והדביקו כאן:</li>
          </ol>
          <div className="an-inline">
            <input dir="ltr" placeholder="Property ID — למשל 501234567" value={propId} onChange={(e) => setPropId(e.target.value)} />
            <button type="button" onClick={saveProp}>שמירה ובדיקת חיבור</button>
          </div>
          {saveMsg && <p className="an-status">{saveMsg}</p>}
        </section>
      </div>
    )
  }

  /* ---------- נתונים ---------- */
  const R = state.data.reports
  const tot = totalsOf(R.totals)
  const prevTot = totalsOf(R.totalsPrev)

  /* ---- פניות ----
     כל מספרי הפניות מגיעים מדוחות מסוננים לארבעת אירועי הפנייה (ראו
     CONVERSION_EVENTS בשרת), ולא ממדד keyEvents של גוגל, שסופר רק מה
     שסומן ידנית בהגדרות הנכס. כל דוח מסונן מחזיר שלושה מדדים:
     [0] פעולות, [1] אנשים, [2] ביקורים שבהם הייתה פנייה.
     לכל טבלה נבחר המדד שהגיוני בה: לשיעור פנייה לפי ערוץ/מקור/מכשיר
     סופרים ביקורים עם פנייה, כך שהאחוז לעולם לא עובר 100. לעמודים
     סופרים פעולות שנעשו מתוך העמוד. לגרף היומי סופרים אנשים ליום. */
  const convByKey = (rep, keyOf, mi) => { const m = new Map(); rows(rep).forEach((r) => m.set(keyOf(r), r.m[mi] || 0)); return m }
  const withConv = (list, rep, idx, mi, keyOf = (r) => r.d.join('|')) => {
    const m = convByKey(rep, keyOf, mi)
    return list.map((r) => { const mm = [...r.m]; mm[idx] = m.get(keyOf(r)) || 0; return { ...r, m: mm } })
  }
  const byType = (rep) => Object.fromEntries(rows(rep).map((r) => [r.d[0], { count: r.m[0], users: r.m[1], sessions: r.m[2] }]))
  const convTot = totalsOf(R.convTotals), convTotPrev = totalsOf(R.convTotalsPrev)
  const cv = { actions: convTot[0] || 0, users: convTot[1] || 0, sessions: convTot[2] || 0, by: byType(R.conv) }
  const cvPrev = { actions: convTotPrev[0] || 0, users: convTotPrev[1] || 0, sessions: convTotPrev[2] || 0, by: byType(R.convPrev) }

  const series = withConv(rows(R.timeseries), R.convTimeseries, 3, 1)
  const prevSeries = withConv(rows(R.timeseriesPrev || null), R.convTimeseriesPrev, 3, 1)
  const channels = withConv(rows(R.channels), R.convChannels, 4, 2)
  const sources = withConv(rows(R.sources), R.convSources, 3, 2)
  const pages = withConv(rows(R.pages), R.convPages, 3, 0, (r) => r.d[0])
  const devices = withConv(rows(R.devices), R.convDevices, 3, 2)
  const countries = withConv(rows(R.countries), R.convCountries, 2, 2)
  const cities = rows(R.cities).filter((c) => c.d[0] !== '(not set)')
  const events = rows(R.events)
  const anomalies = findAnomalies(series, 0)
  const overallCR = tot[2] ? cv.sessions / tot[2] : 0
  const prevCR = prevTot[2] ? cvPrev.sessions / prevTot[2] : null
  // התובנות קוראות את ההמרות מאינדקס 8 של הסיכומים; מזינים לשם את הפניות שלנו
  const totIns = [...tot]; totIns[8] = cv.sessions
  const insights = buildInsights({ tot: totIns, prevTot, channels, pages, devices, anomalies })
  /* הסך המדויק מגיע מ-metricAggregations של GA4, שמנכה משתמש שנמצא
     בכמה עמודים. סכימת השורות (הגיבוי) הייתה סופרת אותו פעמיים. */
  const rtNow = rt?.now || null
  const rtUsers = rtNow
    ? Number(rtNow.totals?.[0]?.metricValues?.[0]?.value)
      || (rtNow.rows || []).reduce((a, r) => a + (Number(r.metricValues?.[0]?.value) || 0), 0)
    : null
  // נכס חדש: Google מעבד דוחות 24-48 שעות — עד אז אין שורות כלל.
  // מציגים מצב המתנה מעוצב במקום שלד טבלאות ריק שנראה שבור.
  const hasData = series.length > 0 || (tot[0] || 0) > 0 || channels.length > 0 || pages.length > 0
  const devTotal = devices.reduce((a, d) => a + d.m[0], 0)
  const chTotal = channels.reduce((a, c) => a + c.m[2], 0)

  const sortRows = (list, sort, get) => [...list].sort((a, b) => (get(sort.key, b) - get(sort.key, a)) * (sort.desc ? 1 : -1))
  const pagesView = sortRows(
    pages.filter((p) => !pageQ || (p.d[0] + ' ' + (p.d[1] || '')).toLowerCase().includes(pageQ.toLowerCase())),
    pSort,
    (k, r) => (k === 'time' ? (r.m[1] ? r.m[2] / r.m[1] : 0) : r.m[k]),
  )
  const sourcesView = sortRows(
    sources.filter((s) => !srcQ || (s.d[0] + s.d[1]).toLowerCase().includes(srcQ.toLowerCase())),
    sSort,
    (k, r) => (k === 'cr' ? (r.m[1] ? r.m[3] / r.m[1] : 0) : r.m[k]),
  )

  /* הסבר קצר לכל מדד — מוצג בריחוף, כדי שכל מספר יהיה ברור גם בלי רקע באנליטיקס */
  const TIPS = {
    'משתמשים': 'כמה אנשים שונים ביקרו באתר בתקופה. כל אדם נספר פעם אחת גם אם חזר כמה פעמים.',
    'ביקורים': 'כמה כניסות היו לאתר בסך הכול. אדם שנכנס פעמיים נספר כשני ביקורים.',
    'צפיות עמוד': 'כמה עמודים נצפו בסך הכול. מספר גבוה ביחס לביקורים אומר שגולשים ממשיכים לדפדף באתר.',
    'שיעור מעורבות': 'אחוז הביקורים שבהם הגולש באמת התעניין: שהה באתר, צפה בכמה עמודים או ביצע פעולה. גבוה יותר = תוכן שעובד.',
    'פניות': 'כמה אנשים שונים פנו אלינו בתקופה: שלחו טופס, לחצו על טלפון, על וואטסאפ או על מייל. אדם שעשה כמה פעולות נספר פעם אחת. פירוט לפי סוג בכרטיס "פניות" שמתחת.',
    'משתמשים חדשים': 'כמה מהמבקרים הגיעו לאתר בפעם הראשונה. מדד לחשיפה לקהלים חדשים.',
    'ביקורים מעורבים': 'ביקורים שבהם הגולש באמת התעניין ולא יצא מיד.',
    'צפיות לביקור': 'כמה עמודים רואה גולש ממוצע בכל ביקור. גבוה יותר = האתר מוביל את הגולש הלאה.',
    'משך ביקור ממוצע': 'כמה זמן שוהה גולש ממוצע באתר בביקור אחד.',
    'שיעור נטישה': 'אחוז הביקורים שהסתיימו בלי שום התעניינות (יציאה מיידית). נמוך = טוב.',
    'אירועים': 'סך כל הפעולות שנמדדו: לחיצות, גלילות, צפיות ופעולות פנייה.',
    'שיעור פנייה': 'מתוך כל הביקורים, כמה אחוז כללו פנייה (טופס, טלפון, וואטסאפ או מייל). ביקור עם שתי פעולות נספר פעם אחת. זה המספר החשוב ביותר לשיפור.',
  }

  const primary = [
    { label: 'משתמשים', v: tot[0], p: prevTot[0], sp: series.map((r) => r.m[0]) },
    { label: 'ביקורים', v: tot[2], p: prevTot[2], sp: series.map((r) => r.m[1]) },
    { label: 'צפיות עמוד', v: tot[4], p: prevTot[4], sp: series.map((r) => r.m[2]) },
    { label: 'שיעור מעורבות', v: tot[5], p: prevTot[5], fmt: fmtPct },
    { label: 'פניות', v: cv.users, p: cvPrev.users, sp: series.map((r) => r.m[3]) },
  ]
  const secondary = [
    ['משתמשים חדשים', fmtNum(tot[1]), <Delta key="d" cur={tot[1]} prev={prevTot[1]} dim />],
    ['ביקורים מעורבים', fmtNum(tot[3]), <Delta key="d" cur={tot[3]} prev={prevTot[3]} dim />],
    ['צפיות לביקור', tot[2] ? (tot[4] / tot[2]).toFixed(2) : '—', null],
    ['משך ביקור ממוצע', fmtDur(tot[9]), null],
    ['שיעור נטישה', fmtPct(tot[6]), <Delta key="d" cur={tot[6]} prev={prevTot[6]} invert dim />],
    ['אירועים', fmtNum(tot[7]), null],
    ['שיעור פנייה', fmtPct(overallCR, 2), <Delta key="d" cur={overallCR} prev={prevCR} dim />],
  ]

  return (
    <div className="an">
      {/* ===== סרגל עליון ===== */}
      <header className="an-top">
        <div>
          <h3 className="an-title">תנועת האתר</h3>
          <span className="an-sub" dir="ltr">{range.start} → {range.end}</span>
          <span className="an-sub"> · השוואה לתקופה מקבילה קודמת · Google Analytics</span>
        </div>
        <div className="an-top__side">
          <span className="an-live">{rtUsers == null ? '· · ·' : rtUsers} ב-30 הדקות האחרונות<i /></span>
          <div className="an-seg">
            {PRESETS.map((p) => <button key={p.id} type="button" className={preset === p.id ? 'is-on' : ''} onClick={() => setPreset(p.id)}>{p.label}</button>)}
          </div>
        </div>
      </header>

      <LivePanel rt={rt} users={rtUsers} />

      {!hasData && (
        <section className="an-await">
          <span className="an-await__badge">החיבור פעיל ✓</span>
          <h4>Google מעבד את הנתונים הראשונים</h4>
          <p>
            תג המדידה באתר עובד והנתונים נאספים. Google מעבד דוחות לנכס חדש תוך
            24–48 שעות — מהרגע הזה הדשבורד יתמלא מעצמו, בלי שום פעולה נוספת.
          </p>
          <p className="an-await__rt">
            בדיקה מיידית: פתחו את האתר בטלפון והביטו במונה <b>"ב-30 הדקות האחרונות"</b> למעלה —
            נתוני זמן-אמת מגיעים תוך שניות, עוד לפני הדוחות המלאים.
          </p>
        </section>
      )}

      {hasData && <>
      {/* ===== שורת מדדים ראשית ===== */}
      <section className="an-metrics">
        {primary.map((m) => (
          <div key={m.label} className="an-metric" data-tip={TIPS[m.label] || undefined} tabIndex={0}>
            <span className="an-metric__label">{m.label}</span>
            <span className="an-metric__value">{(m.fmt || fmtNum)(m.v)}</span>
            <span className="an-metric__foot">
              <Delta cur={m.v} prev={m.p} />
              {m.sp && <Spark values={m.sp} />}
            </span>
          </div>
        ))}
      </section>
      <section className="an-secondary">
        {secondary.map(([l, v, d]) => <span key={l} className="an-secondary__item" data-tip={TIPS[l] || undefined} tabIndex={0}><i>{l}</i><b>{v}</b>{d}</span>)}
      </section>

      {/* ===== פניות: מה נספר, כמה, ומה זה אומר ===== */}
      <section className="an-section an-conv">
        <div className="an-sect-head">
          <h4 className="an-h5" data-tip="פנייה = אחת מארבע פעולות: שליחת טופס, לחיצה על טלפון, על וואטסאפ או על מייל. ההגדרה קבועה בקוד של האתר ולא תלויה בשום הגדרה ב-Google Analytics." tabIndex={0}>פניות</h4>
          <span className="an-sub">מה שהתנועה באמת מייצרת</span>
        </div>

        <div className="an-conv__head">
          <div className="an-conv__big">
            <span className="an-conv__big-label">אנשים שפנו אלינו בתקופה</span>
            <span className="an-conv__big-value">{fmtNum(cv.users)} <Delta cur={cv.users} prev={cvPrev.users} /></span>
            <span className="an-conv__big-sub">
              מתוך <b>{fmtNum(tot[0])}</b> משתמשים · <b>{fmtPct(overallCR, 1)}</b> מהביקורים כללו פנייה · <b>{fmtNum(cv.actions)}</b> פעולות פנייה בסך הכול
            </span>
          </div>
          <p className="an-conv__explain">
            <b>מה נספר:</b> שליחת טופס, לחיצה על מספר הטלפון, על כפתור וואטסאפ או על כתובת מייל.
            <b> מה לא נספר:</b> אם השיחה יצאה בפועל או מה נאמר בה, את זה גוגל לא יודע.
            אדם שלחץ פעמיים נספר פעם אחת ב"אנשים" ופעמיים ב"פעולות".
          </p>
        </div>

        <div className="an-conv__tiles">
          {CONV_TYPES.map((t) => {
            const c = cv.by[t.ev] || { count: 0, users: 0 }
            const pc = cvPrev.by[t.ev] || { count: 0, users: 0 }
            return (
              <div key={t.ev} className="an-conv__tile" data-tip={t.hint} tabIndex={0}>
                <span className="an-conv__tile-label"><i />{t.label}</span>
                <span className="an-conv__tile-value">{fmtNum(c.count)} <Delta cur={c.count} prev={pc.count} dim /></span>
                <span className="an-conv__tile-sub">{fmtNum(c.users)} אנשים</span>
              </div>
            )
          })}
          <div className="an-conv__tile an-conv__tile--truth" data-tip="נספר מלוח הלידים באדמין ולא מגוגל: כל טופס שנשלח מהאתר בתקופה, בלי לידים שהוזנו ידנית. גוגל סופר רק דפדפנים שמאפשרים מדידה, ולכן זה המספר הקובע." tabIndex={0}>
            <span className="an-conv__tile-label"><i />לידים שנשמרו במערכת</span>
            <span className="an-conv__tile-value">{leadCounts.cur == null ? '—' : fmtNum(leadCounts.cur)} <Delta cur={leadCounts.cur} prev={leadCounts.prev} /></span>
            <span className="an-conv__tile-sub">מלוח הלידים, לא מגוגל</span>
          </div>
        </div>

        <p className="an-conv__note">
          הפרש בין "טופס ליד" ל"לידים שנשמרו במערכת" הוא תקין: חוסמי פרסומות ומי שביטל מדידה לא נספרים בגוגל, אבל הטופס שלהם כן נשמר.
          אם המערכת מראה <b>פחות</b> מגוגל, זה סימן לבדוק את הטופס.
        </p>
      </section>

      {/* ===== הגרף המרכזי ===== */}
      <section className="an-section">
        <HeroChart series={series} prevSeries={prevSeries} />
      </section>

      {/* ===== תובנות ===== */}
      {insights.length > 0 && (
        <section className="an-section">
          <h4 className="an-h5">תובנות</h4>
          <ul className="an-insights">{insights.map((ins, i) => <li key={i} className={`is-${ins.tone}`}>{ins.text}</li>)}</ul>
        </section>
      )}

      {/* ===== Acquisition ===== */}
      {channels.length > 0 && <section className="an-section">
        <div className="an-sect-head">
          <h4 className="an-h5" data-tip="מאיפה הגולשים מגיעים: חיפוש בגוגל (Organic), כניסה ישירה, רשתות חברתיות, קישורים מאתרים אחרים. כאן רואים מה מביא תנועה ומה שווה לחזק." tabIndex={0}>מקורות תנועה</h4>
          <button type="button" className="an-csv" onClick={() => exportCsv('channels', ['ערוץ', 'משתמשים', 'ביקורים', 'נתח', 'מעורבות', 'פניות', 'שיעור פנייה'], channels.map((c) => [CHANNEL_HE[c.d[0]] || c.d[0], c.m[0], c.m[2], fmtPct(chTotal ? c.m[2] / chTotal : 0), fmtPct(c.m[3]), c.m[4], fmtPct(c.m[2] ? c.m[4] / c.m[2] : 0, 2)]))}>CSV</button>
        </div>
        <table className="an-table">
          <thead><tr><th>ערוץ</th><th className="is-num">משתמשים</th><th className="is-num">ביקורים</th><th className="is-num">נתח</th><th className="is-num">מעורבות</th><th className="is-num">פניות</th><th className="is-num">שיעור פנייה</th></tr></thead>
          <tbody>
            {channels.map((c) => {
              const cr = c.m[2] ? c.m[4] / c.m[2] : 0
              const quality = cr > overallCR * 1.4 && c.m[4] > 1
              return (
                <tr key={c.d[0]}>
                  <td className="an-td-main">
                    {CHANNEL_HE[c.d[0]] || c.d[0]}
                    <span className="an-share"><i style={{ width: `${chTotal ? (c.m[2] / chTotal) * 100 : 0}%` }} /></span>
                  </td>
                  <td className="is-num">{fmtNum(c.m[0])}</td>
                  <td className="is-num">{fmtNum(c.m[2])}</td>
                  <td className="is-num an-dim">{fmtPct(chTotal ? c.m[2] / chTotal : 0, 0)}</td>
                  <td className="is-num">{fmtPct(c.m[3], 0)}</td>
                  <td className="is-num">{c.m[4] || 0}</td>
                  <td className={`is-num ${quality ? 'an-quality' : ''}`}>{fmtPct(cr, 2)}{quality ? ' ★' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="an-footnote">פניות = ביקורים שבהם הייתה פנייה (טופס, טלפון, וואטסאפ או מייל). ★ = שיעור פנייה גבוה משמעותית מהממוצע ({fmtPct(overallCR, 2)}), תנועה איכותית</p>
      </section>}

      {/* ===== מקורות מפורטים ===== */}
      {sources.length > 0 && <section className="an-section">
        <div className="an-sect-head">
          <h4 className="an-h5" data-tip="פירוט מדויק יותר של מקורות התנועה, למשל google / organic (חיפוש בגוגל) או facebook / social." tabIndex={0}>מקור / מדיום</h4>
          <div className="an-sect-tools">
            <input className="an-search" placeholder="חיפוש מקור…" value={srcQ} onChange={(e) => setSrcQ(e.target.value)} />
            <button type="button" className="an-csv" onClick={() => exportCsv('sources', ['מקור', 'מדיום', 'משתמשים', 'ביקורים', 'מעורבות', 'פניות'], sources.map((s) => [s.d[0], s.d[1], s.m[0], s.m[1], fmtPct(s.m[2]), s.m[3]]))}>CSV</button>
          </div>
        </div>
        <table className="an-table">
          <thead><tr>
            <th>מקור / מדיום</th>
            <Th label="משתמשים" k={0} sort={sSort} onSort={sToggle} />
            <Th label="ביקורים" k={1} sort={sSort} onSort={sToggle} />
            <Th label="מעורבות" k={2} sort={sSort} onSort={sToggle} />
            <Th label="פניות" k={3} sort={sSort} onSort={sToggle} />
            <Th label="שיעור פנייה" k="cr" sort={sSort} onSort={sToggle} />
          </tr></thead>
          <tbody>
            {sourcesView.map((s, i) => {
              const cr = s.m[1] ? s.m[3] / s.m[1] : 0
              return (
                <tr key={i}>
                  <td className="an-td-main" dir="ltr">{s.d[0]} <span className="an-dim">/ {s.d[1]}</span></td>
                  <td className="is-num">{fmtNum(s.m[0])}</td>
                  <td className="is-num">{fmtNum(s.m[1])}</td>
                  <td className="is-num">{fmtPct(s.m[2], 0)}</td>
                  <td className="is-num">{s.m[3] || 0}</td>
                  <td className={`is-num ${cr > overallCR * 1.4 && s.m[3] > 1 ? 'an-quality' : ''}`}>{fmtPct(cr, 2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>}

      {/* ===== עמודים + Drill-down ===== */}
      {pages.length > 0 && <section className="an-section">
        <div className="an-sect-head">
          <h4 className="an-h5" data-tip="העמודים הנצפים ביותר באתר. לחיצה על עמוד פותחת פירוט. 'פניות' = כמה פעולות פנייה (טופס, טלפון, וואטסאפ, מייל) נעשו מתוך העמוד הזה. עמוד עם הרבה צפיות ומעט פניות = הזדמנות לשיפור." tabIndex={0}>עמודים</h4>
          <div className="an-sect-tools">
            <input className="an-search" placeholder="חיפוש עמוד…" value={pageQ} onChange={(e) => setPageQ(e.target.value)} />
            <button type="button" className="an-csv" onClick={() => exportCsv('pages', ['עמוד', 'נתיב', 'צפיות', 'משתמשים', 'זמן ממוצע', 'פניות'], pages.map((p) => [p.d[1], p.d[0], p.m[0], p.m[1], fmtDur(p.m[1] ? p.m[2] / p.m[1] : 0), p.m[3]]))}>CSV</button>
          </div>
        </div>
        <table className="an-table an-table--click">
          <thead><tr>
            <th>עמוד</th>
            <Th label="צפיות" k={0} sort={pSort} onSort={pToggle} />
            <Th label="משתמשים" k={1} sort={pSort} onSort={pToggle} />
            <Th label="זמן ממוצע" k="time" sort={pSort} onSort={pToggle} />
            <Th label="פניות" k={3} sort={pSort} onSort={pToggle} />
          </tr></thead>
          <tbody>
            {pagesView.map((p) => (
              <PageRowGroup key={p.d[0]} p={p} open={openPage === p.d[0]} onToggle={() => setOpenPage(openPage === p.d[0] ? null : p.d[0])} range={range} max={pages[0]?.m[0]} />
            ))}
          </tbody>
        </table>
        <p className="an-footnote">לחיצה על עמוד פותחת פירוט: מגמה, מקורות ומכשירים של אותו עמוד</p>
      </section>}

      {/* ===== קהל: מכשירים + גיאוגרפיה ===== */}
      {(devices.length > 0 || countries.length > 0) && <div className="an-cols">
        <section className="an-section">
          <h4 className="an-h5" data-tip="מאיזה מכשיר גולשים: נייד, מחשב או טאבלט. רוב התנועה בנדל״ן מגיעה מהנייד." tabIndex={0}>מכשירים</h4>
          <table className="an-table">
            <thead><tr><th>מכשיר</th><th className="is-num">נתח</th><th className="is-num">משתמשים</th><th className="is-num">שיעור פנייה</th></tr></thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.d[0]}>
                  <td className="an-td-main">{DEVICE_HE[d.d[0]] || d.d[0]}<span className="an-share"><i style={{ width: `${devTotal ? (d.m[0] / devTotal) * 100 : 0}%` }} /></span></td>
                  <td className="is-num">{devTotal ? Math.round((d.m[0] / devTotal) * 100) : 0}%</td>
                  <td className="is-num">{fmtNum(d.m[0])}</td>
                  <td className="is-num">{fmtPct(d.m[1] ? d.m[3] / d.m[1] : 0, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="an-section">
          <h4 className="an-h5" data-tip="מאיפה גיאוגרפית מגיעים הגולשים. ריכוז בערי השרון = קהל היעד הנכון." tabIndex={0}>מדינות וערים</h4>
          <div className="an-geo">
            <div>
              {countries.slice(0, 7).map((c) => <div key={c.d[0]} className="an-row"><span>{c.d[0]}</span><span className="an-dim">{c.m[2] ? `${c.m[2]} פניות · ` : ''}</span><b>{fmtNum(c.m[0])}</b></div>)}
            </div>
            <div>
              {cities.slice(0, 7).map((c) => <div key={c.d[0]} className="an-row"><span>{c.d[0]}</span><b>{fmtNum(c.m[0])}</b></div>)}
            </div>
          </div>
        </section>
      </div>}

      {/* ===== אירועים ===== */}
      {events.length > 0 && <section className="an-section">
        <div className="an-sect-head">
          <h4 className="an-h5" data-tip="כל הפעולות שנמדדו באתר, טכני. הפניות שבכרטיס למעלה הן ארבעה מהאירועים כאן: generate_lead (טופס), phone_click (טלפון), whatsapp_click (וואטסאפ), email_click (מייל). שאר האירועים הם מדידה של גלילה, צפייה ולחיצות אחרות." tabIndex={0}>אירועים</h4>
          <button type="button" className="an-csv" onClick={() => exportCsv('events', ['אירוע', 'כמות', 'משתמשים', 'לכל משתמש'], events.map((e) => [e.d[0], e.m[0], e.m[1], e.m[1] ? (e.m[0] / e.m[1]).toFixed(1) : '']))}>CSV</button>
        </div>
        <table className="an-table">
          <thead><tr><th>אירוע</th><th className="is-num">כמות</th><th className="is-num">משתמשים</th><th className="is-num">לכל משתמש</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.d[0]}>
                <td className="an-td-main" dir="ltr">{e.d[0]}</td>
                <td className="is-num">{fmtNum(e.m[0])}</td>
                <td className="is-num">{fmtNum(e.m[1])}</td>
                <td className="is-num an-dim">{e.m[1] ? (e.m[0] / e.m[1]).toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>}

      {/* ===== זמן אמת ===== */}
      {rt?.rows?.length > 0 && (
        <section className="an-section">
          <h4 className="an-h5">פעילות עכשיו</h4>
          <table className="an-table">
            <thead><tr><th>עמוד</th><th className="is-num">גולשים פעילים</th></tr></thead>
            <tbody>
              {rt.rows.map((r, i) => (
                <tr key={i}><td className="an-td-main">{r.dimensionValues[0].value}</td><td className="is-num">{r.metricValues[0].value}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      </>}

      {/* ===== הגדרות ===== */}
      <details className="an-settings">
        <summary>הגדרות חיבור</summary>
        <div className="an-inline">
          <input dir="ltr" value={propId} onChange={(e) => setPropId(e.target.value)} placeholder="GA4 Property ID" />
          <button type="button" onClick={saveProp}>שמירה ובדיקה</button>
          {saveMsg && <span className="an-status">{saveMsg}</span>}
        </div>
      </details>
    </div>
  )
}

/* שורת עמוד + שורת Drill-down מתחתיה */
function PageRowGroup({ p, open, onToggle, range, max }) {
  return (
    <>
      <tr className={open ? 'is-open' : ''} onClick={onToggle}>
        <td className="an-td-main">
          <span className="an-page-t">{p.d[1] || p.d[0]}</span>
          <span className="an-page-p" dir="ltr">{p.d[0]}</span>
          <span className="an-share"><i style={{ width: `${max ? (p.m[0] / max) * 100 : 0}%` }} /></span>
        </td>
        <td className="is-num">{fmtNum(p.m[0])}</td>
        <td className="is-num">{fmtNum(p.m[1])}</td>
        <td className="is-num">{fmtDur(p.m[1] ? p.m[2] / p.m[1] : 0)}</td>
        <td className="is-num">{p.m[3] || 0}</td>
      </tr>
      {open && <tr className="an-drill-row"><td colSpan={5}><PageDrill path={p.d[0]} range={range} /></td></tr>}
    </>
  )
}
