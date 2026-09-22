import { useEffect, useMemo, useState } from 'react'
import { listLeads, listSubscribers } from '../../lib/cms.js'
import { fetchDashboard, fetchRealtime, rows, totalsOf } from '../../lib/analyticsApi.js'

/* ============================================================
   סקירה כללית — עמוד הבית של מערכת הניהול.
   לוח מחוונים ברוחב מלא: מה קורה עכשיו, מה קרה השבוע, ומה דורש
   פעולה. כל מקור נתונים נטען בנפרד וכשל באחד לא מפיל את השאר.
   ============================================================ */

const fmtNum = (n) => (n == null ? '—' : Math.round(n).toLocaleString('he-IL'))
const fmtPct = (n) => (n == null || !isFinite(n) ? '—' : `${(n * 100).toFixed(1)}%`)
const DAY = 86400000

/* הסבר קצר בריחוף על כל מדד — בשפה של מנהל, לא של אנליסט */
const TIPS = {
  leads7: 'כמה פניות (לידים) נכנסו מהאתר בשבוע האחרון: טפסים, פניות מפרויקטים ומדף הבית. לחיצה פותחת את מערכת הלידים.',
  attention: 'לידים חדשים שאף אחד עוד לא טיפל בהם מעל 3 ימים. ליד שחוזרים אליו מהר נסגר בסיכוי גבוה יותר.',
  users7: 'כמה אנשים שונים ביקרו באתר בשבוע האחרון, לפי גוגל אנליטיקס. הקו הקטן מציג את המגמה יום אחרי יום.',
  conversions7: 'פעולות שוות זהב שנמדדו השבוע: שליחת טופס, לחיצה על וואטסאפ או על טלפון. זה החיבור בין תנועה לעסקים.',
  subs: 'סך כל הנרשמים לרשימת התפוצה של האתר, קהל שאפשר לחזור אליו בדיוור.',
  recentLeads: 'הפניות האחרונות שנכנסו מהאתר, מהחדשה לישנה. תגית הצבע מציינת מאיפה הגיעה הפנייה.',
  topPages: 'העמודים שקיבלו הכי הרבה צפיות בשבוע האחרון. עמוד חזק עם מעט פניות הוא הזדמנות לשיפור.',
  channels: 'מאיפה הגיעו הגולשים השבוע. חיפוש בגוגל הוא תנועה שהרווחנו, כניסה ישירה היא אנשים שכבר מכירים אותנו.',
  chart: 'מספר המבקרים בכל יום בשבוע האחרון. ריחוף על הגרף מציג את הפירוט המלא של אותו יום.',
  live: 'גולשים שנמצאים באתר ברגע זה, ובאילו עמודים הם צופים. מתעדכן כל דקה.',
}

const CHANNEL_HE = {
  'Organic Search': 'חיפוש בגוגל', Direct: 'כניסה ישירה', 'Organic Social': 'רשתות חברתיות',
  Social: 'רשתות חברתיות', Referral: 'הפניות מאתרים', 'Paid Search': 'חיפוש ממומן', Email: 'אימייל', Unassigned: 'לא משויך',
}

const SOURCE_HE = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }
const SOURCE_C = { project: '#105572', home: '#2e9e6b', contact: '#8c6d1f', manual: '#666' }

const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

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

/* "20260922" -> { label: "22.09", day: "שני" } */
function parseGaDate(d) {
  const s = String(d)
  if (s.length !== 8) return { label: s, day: '' }
  const dt = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)))
  return { label: `${s.slice(6, 8)}.${s.slice(4, 6)}`, day: DAY_HE[dt.getUTCDay()] || '' }
}

/* צבע יציב לאווטאר לפי השם — אותו ליד מקבל תמיד את אותו גוון */
function hueOf(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 360
  return h
}

function Spark({ values, w = 120, h = 30 }) {
  if (!values || values.length < 2) return null
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - (v / max) * (h - 6)}`).join(' ')
  return (
    <svg className="ovw-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" dir="ltr">
      <polyline points={pts} fill="none" />
    </svg>
  )
}

/* ---------- גרף התנועה השבועי ---------- */
function TrafficChart({ days }) {
  const [hover, setHover] = useState(null)
  if (!days || days.length < 2) return <p className="ovw__empty">אין עדיין מספיק נתונים לגרף.</p>

  const W = 780, H = 210, PL = 34, PR = 12, PT = 16, PB = 30
  const max = Math.max(1, ...days.map((d) => d.users))
  const x = (i) => PL + (i / (days.length - 1)) * (W - PL - PR)
  const y = (v) => PT + (1 - v / max) * (H - PT - PB)
  const line = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.users).toFixed(1)}`).join('')
  const area = `${line}L${x(days.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
  const gridVals = [0, max / 2, max]

  return (
    <div className="ovw-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" dir="ltr" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="ovwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16688c" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#16688c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="ovw-chart__grid" />
            <text x={PL - 6} y={y(v) + 4} className="ovw-chart__ytick" textAnchor="end">{Math.round(v)}</text>
          </g>
        ))}
        <path d={area} className="ovw-chart__area" />
        <path d={line} className="ovw-chart__line" />
        {days.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={y(d.users)} r={hover === i ? 5 : 3.2} className="ovw-chart__dot" />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} className="ovw-chart__cross" />}
        {days.map((d, i) => (
          <rect key={`h${d.date}`} x={x(i) - (W - PL - PR) / days.length / 2} y={PT}
            width={(W - PL - PR) / days.length} height={H - PT - PB}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {days.map((d, i) => (
          <text key={`t${d.date}`} x={x(i)} y={H - 9} className="ovw-chart__xtick" textAnchor="middle">{d.label}</text>
        ))}
      </svg>
      {hover != null && (
        <div className="ovw-chart__tip" style={{ insetInlineStart: `min(max(${(x(hover) / W) * 100}%, 62px), calc(100% - 62px))` }}>
          <b>יום {days[hover].day} · {days[hover].label}</b>
          <span>{fmtNum(days[hover].users)} משתמשים</span>
          <span>{fmtNum(days[hover].sessions)} ביקורים</span>
          <span>{fmtNum(days[hover].views)} צפיות</span>
        </div>
      )}
    </div>
  )
}

/* ---------- שורת מד עם פס יחסי ---------- */
function MeterRow({ label, sub, value, share, tone = 'blue' }) {
  return (
    <li className="ovw-meter">
      <div className="ovw-meter__top">
        <span className="ovw-meter__label" title={label}>{label}</span>
        <b className="ovw-meter__val">{fmtNum(value)}</b>
      </div>
      <div className={`ovw-meter__track is-${tone}`}><i style={{ width: `${Math.max(2, share * 100)}%` }} /></div>
      {sub && <span className="ovw-meter__sub" dir="ltr">{sub}</span>}
    </li>
  )
}

export default function OverviewTab({ onNavigate }) {
  const [leads, setLeads] = useState(null)          // null = טוען, [] = אין
  const [subs, setSubs] = useState(null)
  const [ga, setGa] = useState(null)                // אובייקט | 'none'
  const [rt, setRt] = useState(null)

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
        const prev = totalsOf(R.totalsPrev)
        const days = rows(R.timeseries).map((r) => ({
          date: r.d[0], ...parseGaDate(r.d[0]), users: r.m[0], sessions: r.m[1], views: r.m[2],
        }))
        const topPages = rows(R.pages).slice(0, 5).map((r) => ({ path: r.d[0], title: r.d[1], views: r.m[0] }))
        const ch = rows(R.channels)
        const chTotal = ch.reduce((a, c) => a + c.m[2], 0) || 1
        const channels = ch.slice(0, 5).map((c) => ({ name: CHANNEL_HE[c.d[0]] || c.d[0], sessions: c.m[2], share: c.m[2] / chTotal }))
        setGa({
          users: tot[0], prevUsers: prev[0], sessions: tot[2], views: tot[4],
          engagement: tot[5], conversions: tot[8], prevConversions: prev[8],
          days, topPages, channels, topChannel: channels[0] || null,
        })
      })
      .catch(() => on && setGa('none'))
    const pullRt = () => fetchRealtime().then((d) => on && setRt(d.rt || { now: d.realtime })).catch(() => {})
    pullRt()
    const t = setInterval(pullRt, 60_000)
    return () => { on = false; clearInterval(t) }
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
      .slice(0, 6)
    return { in7, prev7, attention, latest, total: leads.length }
  }, [leads])

  /* תובנות במילים: מה קורה באתר ומה כדאי לעשות, מחושב מהנתונים האמיתיים בלבד */
  const insights = useMemo(() => {
    const out = []
    if (leadStats?.attention > 0) {
      out.push({ tone: 'warn', tab: 'leads', title: 'דורש פעולה היום', text: `${leadStats.attention === 1 ? 'ליד אחד ממתין' : leadStats.attention + ' לידים ממתינים'} מעל 3 ימים ללא מענה, שווה לחזור אליהם היום.` })
    }
    if (leadStats && leadStats.prev7 > 0) {
      const up = leadStats.in7 >= leadStats.prev7
      out.push({ tone: up ? 'good' : 'bad', tab: 'leads', title: up ? 'מגמת לידים' : 'ירידה בלידים', text: `${leadStats.in7} לידים נכנסו השבוע מול ${leadStats.prev7} בשבוע שעבר${up ? ', מגמה חיובית.' : ', ירידה ששווה תשומת לב.'}` })
    } else if (leadStats && leadStats.in7 > 0) {
      out.push({ tone: 'good', tab: 'leads', title: 'לידים השבוע', text: `${leadStats.in7 === 1 ? 'ליד אחד נכנס' : leadStats.in7 + ' לידים נכנסו'} מהאתר בשבוע האחרון.` })
    }
    if (ga && ga !== 'none') {
      if (ga.sessions > 0 && ga.conversions > 0) {
        out.push({ tone: 'good', tab: 'analytics', title: 'שיעור המרה', text: `${fmtPct(ga.conversions / ga.sessions)} מהביקורים השבוע הסתיימו בפנייה.` })
      } else if (ga.sessions >= 5 && !ga.conversions) {
        out.push({ tone: 'warn', tab: 'analytics', title: 'תנועה בלי המרות', text: 'יש תנועה אבל עדיין אין המרות השבוע, שווה לבדוק שהטפסים בולטים מספיק.' })
      }
      if (ga.topChannel) out.push({ tone: 'info', tab: 'analytics', title: 'מקור מוביל', text: `${ga.topChannel.name} הביא ${Math.round(ga.topChannel.share * 100)}% מהביקורים השבוע.` })
      if (ga.topPages?.[0]) out.push({ tone: 'info', tab: 'analytics', title: 'העמוד החזק', text: `${ga.topPages[0].title || ga.topPages[0].path} עם ${fmtNum(ga.topPages[0].views)} צפיות.` })
    }
    return out.slice(0, 4)
  }, [leadStats, ga])

  const nav = (id) => () => onNavigate?.(id)
  const gaReady = ga && ga !== 'none'
  const dateStr = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' })

  const rtNow = rt?.now || null
  const rtUsers = rtNow
    ? Number(rtNow.totals?.[0]?.metricValues?.[0]?.value) || (rtNow.rows || []).reduce((a, r) => a + (Number(r.metricValues?.[0]?.value) || 0), 0)
    : null
  const rtPages = rows(rtNow).filter((r) => r.m[0] > 0).slice(0, 5)
  /* חצי השעה האחרונה. minutesAgo מגיע כמחרוזת "0" עד "29", 0 זו הדקה הנוכחית. */
  const rtMinutes = useMemo(() => {
    const m = rows(rt?.byMinute)
    if (!m.length) return null
    const buckets = Array.from({ length: 30 }, (_, i) => m.find((r) => Number(r.d[0]) === 29 - i)?.m[0] || 0)
    return { buckets, peak: Math.max(1, ...buckets), total: buckets.reduce((a, b) => a + b, 0) }
  }, [rt])
  const maxViews = Math.max(1, ...(gaReady ? ga.topPages.map((p) => p.views) : [1]))

  const delta = (cur, prev) => {
    if (prev == null || !prev || cur == null) return null
    const d = (cur - prev) / prev
    if (Math.abs(d) < 0.005) return { dir: 'flat', txt: 'ללא שינוי' }
    return { dir: d > 0 ? 'up' : 'down', txt: `${d > 0 ? '↑' : '↓'} ${Math.abs(d * 100).toFixed(0)}% מול השבוע הקודם` }
  }
  const dUsers = gaReady ? delta(ga.users, ga.prevUsers) : null
  const dConv = gaReady ? delta(ga.conversions, ga.prevConversions) : null

  return (
    <div className="ovw" dir="rtl">
      {/* ===== כותרת ===== */}
      <header className="ovw__hero">
        <div className="ovw__hero-txt">
          <h3 className="ovw__hi">{greeting()} 👋</h3>
          <span className="ovw__date">{dateStr}</span>
        </div>
        <div className="ovw__hero-side">
          {rtUsers != null && (
            <span className="ovw__live" data-tip={TIPS.live}><i />{rtUsers === 1 ? 'גולש אחד באתר עכשיו' : `${rtUsers} גולשים באתר עכשיו`}</span>
          )}
          <div className="ovw__hero-acts">
            <button type="button" onClick={nav('leads')}>מערכת הלידים</button>
            <button type="button" onClick={nav('analytics')}>תנועה וסטטיסטיקות</button>
            <a href="/" target="_blank" rel="noopener noreferrer">צפייה באתר ↗</a>
          </div>
        </div>
      </header>

      {/* ===== מדדי מפתח ===== */}
      <section className="ovw__kpis">
        <button type="button" className="ovw__kpi ovw__kpi--leads" data-tip={TIPS.leads7} onClick={nav('leads')}>
          <i>לידים · 7 ימים</i>
          <b>{leadStats ? leadStats.in7 : '—'}</b>
          {leadStats && leadStats.prev7 > 0
            ? <span className={`ovw__trend ${leadStats.in7 >= leadStats.prev7 ? 'is-up' : 'is-down'}`}>{leadStats.in7 >= leadStats.prev7 ? '↑' : '↓'} מול {leadStats.prev7} בשבוע הקודם</span>
            : <span className="ovw__hint">{leadStats ? `${leadStats.total} לידים בסך הכול` : 'בשבוע האחרון'}</span>}
        </button>
        <button type="button" className={`ovw__kpi ovw__kpi--attn${leadStats?.attention ? ' ovw__kpi--warn' : ''}`} data-tip={TIPS.attention} onClick={nav('leads')}>
          <i>דורשים טיפול</i>
          <b>{leadStats ? leadStats.attention : '—'}</b>
          <span className="ovw__hint">לידים חדשים מעל 3 ימים</span>
        </button>
        <button type="button" className="ovw__kpi ovw__kpi--users" data-tip={TIPS.users7} onClick={nav('analytics')}>
          <i>משתמשים · 7 ימים</i>
          <b>{gaReady ? fmtNum(ga.users) : '—'}</b>
          {gaReady
            ? (dUsers ? <span className={`ovw__trend is-${dUsers.dir}`}>{dUsers.txt}</span> : <Spark values={ga.days.map((d) => d.users)} />)
            : <span className="ovw__hint">{ga === 'none' ? 'אין עדיין נתוני תנועה' : 'טוען…'}</span>}
        </button>
        <button type="button" className="ovw__kpi ovw__kpi--conv" data-tip={TIPS.conversions7} onClick={nav('analytics')}>
          <i>המרות · 7 ימים</i>
          <b>{gaReady ? fmtNum(ga.conversions) : '—'}</b>
          {gaReady && dConv ? <span className={`ovw__trend is-${dConv.dir}`}>{dConv.txt}</span> : <span className="ovw__hint">טפסים, וואטסאפ וטלפון</span>}
        </button>
        <button type="button" className="ovw__kpi ovw__kpi--subs" data-tip={TIPS.subs} onClick={nav('newsletter')}>
          <i>רשומים לניוזלטר</i>
          <b>{subs ? subs.length : '—'}</b>
          <span className="ovw__hint">סך הכול</span>
        </button>
      </section>

      {/* ===== תובנות ===== */}
      {insights.length > 0 && (
        <section className="ovw__insights">
          {insights.map((ins, i) => (
            <button key={i} type="button" className={`ovw__insight is-${ins.tone}`} onClick={nav(ins.tab)}>
              <b>{ins.title}</b>
              <span>{ins.text}</span>
            </button>
          ))}
        </section>
      )}

      {/* ===== גרף + זמן אמת ===== */}
      <div className="ovw__grid">
        <section className="ovw__card ovw__card--chart">
          <header className="ovw__card-head">
            <h4 data-tip={TIPS.chart} tabIndex={0}>תנועה בשבוע האחרון</h4>
            <button type="button" className="ovw__more" onClick={nav('analytics')}>לדוח המלא ←</button>
          </header>
          {ga == null && <p className="ovw__empty">טוען…</p>}
          {ga === 'none' && <p className="ovw__empty">נתוני התנועה יופיעו כאן ברגע שגוגל אנליטיקס יתחיל לדווח.</p>}
          {gaReady && <>
            <TrafficChart days={ga.days} />
            <div className="ovw__chart-foot">
              <span><i>ביקורים</i><b>{fmtNum(ga.sessions)}</b></span>
              <span><i>צפיות עמוד</i><b>{fmtNum(ga.views)}</b></span>
              <span><i>שיעור מעורבות</i><b>{fmtPct(ga.engagement)}</b></span>
              <span><i>צפיות לביקור</i><b>{ga.sessions ? (ga.views / ga.sessions).toFixed(1) : '—'}</b></span>
            </div>
          </>}
        </section>

        <section className="ovw__card ovw__card--live">
          <header className="ovw__card-head">
            <h4 data-tip={TIPS.live} tabIndex={0}>עכשיו באתר</h4>
          </header>
          <div className="ovw__live-num"><b>{rtUsers == null ? '·' : rtUsers}</b><span>גולשים ברגע זה</span></div>
          {rtMinutes && (
            <div className="ovw__live-30">
              <div className="ovw__live-bars" title="פעילות ב-30 הדקות האחרונות">
                {rtMinutes.buckets.map((v, i) => (
                  <i key={i} className={v ? '' : 'is-empty'} style={{ height: `${Math.max(4, (v / rtMinutes.peak) * 100)}%` }} />
                ))}
              </div>
              <span>{rtMinutes.total ? `${fmtNum(rtMinutes.total)} צפיות בחצי השעה האחרונה` : 'אין פעילות בחצי השעה האחרונה'}</span>
            </div>
          )}
          {rtPages.length > 0 ? (
            <ul className="ovw__live-pages">
              {rtPages.map((r) => (
                <li key={r.d[0]}><span title={r.d[0]}>{r.d[0] || '(ללא כותרת)'}</span><b>{r.m[0]}</b></li>
              ))}
            </ul>
          ) : <p className="ovw__empty">{rtUsers == null ? 'טוען…' : 'אף אחד לא נמצא באתר ברגע זה.'}</p>}
          <p className="ovw__note">מתעדכן כל דקה. גוגל מדווח בזמן אמת לפי כותרת העמוד.</p>
        </section>
      </div>

      {/* ===== שלוש עמודות ===== */}
      <div className="ovw__cols3">
        <section className="ovw__card">
          <header className="ovw__card-head">
            <h4 data-tip={TIPS.recentLeads} tabIndex={0}>לידים אחרונים</h4>
            <button type="button" className="ovw__more" onClick={nav('leads')}>לכל הלידים ←</button>
          </header>
          {!leadStats && <p className="ovw__empty">טוען…</p>}
          {leadStats && leadStats.latest.length === 0 && <p className="ovw__empty">אין עדיין לידים. פניות מהאתר יופיעו כאן.</p>}
          {leadStats && leadStats.latest.length > 0 && (
            <ul className="ovw__leads">
              {leadStats.latest.map((l) => {
                const name = l.name || 'ללא שם'
                const h = hueOf(name)
                return (
                  <li key={l.id}>
                    <span className="ovw__av" style={{ background: `linear-gradient(135deg, hsl(${h} 46% 42%), hsl(${(h + 38) % 360} 52% 32%))` }}>{name.trim().charAt(0)}</span>
                    <span className="ovw__lead-main">
                      <span className="ovw__lead-name">{name}</span>
                      <span className="ovw__lead-when">{timeAgo(l.created_at)}</span>
                    </span>
                    <span className="ovw__lead-src" style={{ background: SOURCE_C[l.source] || '#888' }}>{SOURCE_HE[l.source] || l.source || '—'}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="ovw__card">
          <header className="ovw__card-head">
            <h4 data-tip={TIPS.topPages} tabIndex={0}>העמודים החזקים השבוע</h4>
            <button type="button" className="ovw__more" onClick={nav('analytics')}>לדוח המלא ←</button>
          </header>
          {ga == null && <p className="ovw__empty">טוען…</p>}
          {ga === 'none' && <p className="ovw__empty">יופיע כאן ברגע שיצטברו נתונים.</p>}
          {gaReady && ga.topPages.length === 0 && <p className="ovw__empty">אין עדיין מספיק נתונים השבוע.</p>}
          {gaReady && ga.topPages.length > 0 && (
            <ul className="ovw__meters">
              {ga.topPages.map((p) => (
                <MeterRow key={p.path} label={p.title || p.path} sub={p.path} value={p.views} share={p.views / maxViews} tone="blue" />
              ))}
            </ul>
          )}
        </section>

        <section className="ovw__card">
          <header className="ovw__card-head">
            <h4 data-tip={TIPS.channels} tabIndex={0}>מאיפה הגיעו השבוע</h4>
            <button type="button" className="ovw__more" onClick={nav('analytics')}>לדוח המלא ←</button>
          </header>
          {ga == null && <p className="ovw__empty">טוען…</p>}
          {ga === 'none' && <p className="ovw__empty">יופיע כאן ברגע שיצטברו נתונים.</p>}
          {gaReady && ga.channels.length === 0 && <p className="ovw__empty">אין עדיין מספיק נתונים השבוע.</p>}
          {gaReady && ga.channels.length > 0 && (
            <ul className="ovw__meters">
              {ga.channels.map((c) => (
                <MeterRow key={c.name} label={c.name} sub={`${Math.round(c.share * 100)}% מהביקורים`} value={c.sessions} share={c.share} tone="green" />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
