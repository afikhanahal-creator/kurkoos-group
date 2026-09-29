import { useEffect, useMemo, useState } from 'react'
import { loadSeed as loadConstructions } from '../../lib/constructions.js'
import { loadSeed as loadSupervision } from '../../lib/supervision.js'
import { loadSeed as loadBrokerage } from '../../lib/brokerage.js'
import { loadSeed as loadYazamut } from '../../lib/yazamut.js'
import { loadSeed as loadMentor } from '../../lib/mentorguide.js'
import { COMPETITORS } from '../../data/competitors.js'
import calConstructions from '../../../constructions/content-calendar.md?raw'
import calSupervision from '../../../construction_supervision/content-calendar.md?raw'
import calBrokerage from '../../../brokerage/content-calendar.md?raw'
import calYazamut from '../../../yazamut_nadlan/content-calendar.md?raw'
import calMentor from '../../../mentor_guide/content-calendar.md?raw'
import { toast } from '../../lib/toast.js'
import './ContentEngineTab.css'

/* ============================================================
   ContentEngineTab — מנוע התוכן במקום אחד:
   • חמשת סוכני הכתיבה: כמה פורסם, מה האחרון, מתי הריצה הבאה.
   • הנושאים הבאים בתור של כל סוכן (מתוך content-calendar.md).
   • הכתבות של השבוע כפוסטים מוכנים לרשתות, להעתקה או לתזמון ב-Metricool.
   • המתחרים: מה עובד להם, מה התשובה שלנו, ומה עוד חסר.
   הכול נקרא מקבצי הקוד בזמן הבנייה, כך שהטאב תמיד מסונכרן עם האתר.
   ============================================================ */

const SITE = 'https://www.kurkoos-group.co.il'
const COLUMNS = [
  { id: 'constructions', label: 'ביצוע ובנייה', route: '/constructions', load: loadConstructions, cal: calConstructions, runAt: '08:10' },
  { id: 'supervision', label: 'פיקוח בנייה', route: '/construction-supervision', load: loadSupervision, cal: calSupervision, runAt: '08:20' },
  { id: 'brokerage', label: 'רוכש ומוכר', route: '/real-estate-guide', load: loadBrokerage, cal: calBrokerage, runAt: '08:30' },
  { id: 'yazamut', label: 'יזמות נדל"ן', route: '/yazamut-nadlan', load: loadYazamut, cal: calYazamut, runAt: '08:00' },
  { id: 'mentor', label: 'יזמים צעירים', route: '/madrich-yazamim', load: loadMentor, cal: calMentor, runAt: '08:40' },
]
const TABS = [
  { id: 'agents', label: 'סוכני הכתיבה' },
  { id: 'social', label: 'פוסטים לרשתות' },
  { id: 'competitors', label: 'מתחרים' },
]

const todayIL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
const fmt = (d) => { try { return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) } catch { return d } }
function nextSunday() {
  const t = new Date(`${todayIL()}T00:00:00`)
  const add = (7 - t.getDay()) % 7 || 7
  t.setDate(t.getDate() + add)
  return t
}

/* הנושאים הבאים מלוח הנושאים: שורות הטבלאות בקובץ. הלוחות לא אחידים
   (בחלק העמודה הראשונה היא מספר, בחלק תאריך), ולכן הנושא הוא התא הראשון
   שנראה כמו משפט, ומילת המפתח היא התא שאחריו. נושא נחשב נכתב אם יש כתבה
   חיה עם אותה מילת מפתח, או שתחילת הנושא מופיעה בכותרת של כתבה חיה. */
const norm = (t) => String(t || '').replace(/[*_`"״׳']/g, '').replace(/\s+/g, ' ').trim()
const isLabel = (t) => /^([A-Za-zא-ת]|\d+[.)]?|\d{1,2}[./]\d{1,2}([./]\d{2,4})?|[-:#\s]*)$/.test(t)
function parseQueue(md, live) {
  const kws = new Set(live.map((a) => norm(a.focusKeyword)).filter(Boolean))
  const titles = live.map((a) => norm(a.title))
  const rows = []
  const seen = new Set()
  const lines = String(md || '').split('\n')
  const isSep = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l || '') && (l || '').includes('-')
  const today = todayIL()
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    if (!line.trim().startsWith('|')) continue
    // שורת כותרת של טבלה: השורה שאחריה היא קו ההפרדה
    if (isSep(lines[li + 1]) || isSep(line)) continue
    const cells = line.split('|').slice(1, -1).map(norm)
    if (!cells.length) continue
    // לוח עם עמודת תאריך: נושא שהתאריך שלו כבר עבר נחשב נכתב
    const dm = cells.map((c) => c.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)).find(Boolean)
    const past = dm ? `${dm[3] ? (dm[3].length === 2 ? '20' + dm[3] : dm[3]) : today.slice(0, 4)}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}` < today : false
    const i = cells.findIndex((c) => c.length > 6 && !isLabel(c))
    if (i < 0) continue
    const topic = cells[i]
    if (['נושא', 'כותרת', 'נושא הכתבה'].includes(topic) || seen.has(topic)) continue
    seen.add(topic)
    const kw = cells[i + 1] && cells[i + 1].length < 40 ? cells[i + 1] : ''
    const head = topic.slice(0, 16)
    // כותרת הכתבה לא תמיד זהה לנוסח בלוח, ולכן בודקים חפיפה של מילים
    const words = topic.replace(/[.,:;!?()\-–]/g, ' ').split(' ').filter((w) => w.length > 2)
    const overlap = (t) => words.length && words.filter((w) => t.includes(w)).length / words.length >= 0.6
    const done = past || (kw && kws.has(kw)) || titles.some((t) => t.includes(head) || overlap(t))
    rows.push({ topic, kw, done })
  }
  return rows
}

function postText(a, col) {
  const url = `${SITE}${col.route}/${a.slug}`
  const lead = a.excerpt || ''
  return `${a.title}\n\n${lead}\n\nלכתבה המלאה: ${url}\n\nקבוצת קורקוס · הוד השרון`
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast.success('הועתק') }
  catch { toast.error('ההעתקה נחסמה בדפדפן. סמנו את הטקסט והעתיקו ידנית.') }
}

export default function ContentEngineTab() {
  const [tab, setTab] = useState('agents')
  const [data, setData] = useState(null) // { [colId]: articles[] }

  useEffect(() => {
    let on = true
    Promise.all(COLUMNS.map((c) => c.load().then((list) => [c.id, list || []]).catch(() => [c.id, []])))
      .then((pairs) => { if (on) setData(Object.fromEntries(pairs)) })
    return () => { on = false }
  }, [])

  const view = useMemo(() => {
    if (!data) return null
    const today = todayIL()
    return COLUMNS.map((c) => {
      const all = (data[c.id] || []).filter((a) => a && a.slug)
      const live = all.filter((a) => a.published !== false && String(a.date || '').slice(0, 10) <= today)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      const scheduled = all.filter((a) => a.published !== false && String(a.date || '').slice(0, 10) > today)
      const merged = all.filter((a) => a.published === false).length
      return { ...c, live, scheduled, merged, queue: parseQueue(c.cal, live) }
    })
  }, [data])

  if (!view) return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען את מנוע התוכן…</div>

  const sunday = nextSunday()
  const totalLive = view.reduce((n, c) => n + c.live.length, 0)
  const monthKey = todayIL().slice(0, 7)
  const thisMonth = view.reduce((n, c) => n + c.live.filter((a) => String(a.date).startsWith(monthKey)).length, 0)
  const recent = view.flatMap((c) => c.live.slice(0, 3).map((a) => ({ a, c })))
    .sort((x, y) => String(y.a.date).localeCompare(String(x.a.date))).slice(0, 10)

  return (
    <div className="ce">
      <div className="ce__stats">
        <div className="ce__stat"><b>{totalLive}</b><span>כתבות באתר</span></div>
        <div className="ce__stat"><b>{thisMonth}</b><span>פורסמו החודש</span></div>
        <div className="ce__stat"><b>{COLUMNS.length}</b><span>סוכני כתיבה</span></div>
        <div className="ce__stat"><b>{fmt(sunday)}</b><span>הריצה הבאה (יום א׳)</span></div>
      </div>

      <div className="ce__tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={`ce__tab${tab === t.id ? ' is-on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'agents' && (
        <div className="ce__grid">
          {view.map((c) => {
            const next = c.queue.filter((q) => !q.done).slice(0, 4)
            return (
              <section key={c.id} className="ce__card">
                <header className="ce__card-head">
                  <h3>{c.label}</h3>
                  <a href={c.route} target="_blank" rel="noopener noreferrer" className="ce__link">למדריך ↗</a>
                </header>
                <dl className="ce__facts">
                  <div><dt>כתבות חיות</dt><dd>{c.live.length}</dd></div>
                  <div><dt>אחרונה</dt><dd>{c.live[0] ? fmt(c.live[0].date) : 'אין'}</dd></div>
                  <div><dt>מתוזמנות</dt><dd>{c.scheduled.length}</dd></div>
                  <div><dt>ריצה הבאה</dt><dd>{fmt(sunday)} · {c.runAt}</dd></div>
                </dl>
                {c.live[0] && (
                  <p className="ce__last">
                    <span>האחרונה:</span> <a href={`${c.route}/${c.live[0].slug}`} target="_blank" rel="noopener noreferrer">{c.live[0].title}</a>
                  </p>
                )}
                <h4 className="ce__h4">הבאים בתור</h4>
                {next.length ? (
                  <ol className="ce__queue">{next.map((q) => <li key={q.topic}>{q.topic}{q.kw ? <small> · {q.kw}</small> : null}</li>)}</ol>
                ) : <p className="ce__muted">הסוכן בוחר נושא טרי לפי החדשות והלוח.</p>}
                {c.merged > 0 && <p className="ce__muted">{c.merged} כתבות כפולות אוחדו והועברו לכתבה החזקה.</p>}
              </section>
            )
          })}
        </div>
      )}

      {tab === 'social' && (
        <div className="ce__social">
          <div className="ce__note">
            כל כתבה חדשה היא פוסט מוכן לפייסבוק, לאינסטגרם ולינקדאין, עם קישור לאתר. מעתיקים לכאן או מתזמנים
            ב־<a href="https://app.metricool.com/planner" target="_blank" rel="noopener noreferrer">Metricool</a>.
            אפשר גם לבקש מ־Claude לעצב ולתזמן סדרת פוסטים ישירות ב־Metricool.
          </div>
          <ul className="ce__posts">
            {recent.map(({ a, c }) => (
              <li key={`${c.id}-${a.slug}`} className="ce__post">
                <div className="ce__post-meta"><span className="ce__pill">{c.label}</span><span>{fmt(a.date)}</span></div>
                <pre className="ce__post-text">{postText(a, c)}</pre>
                <button type="button" className="ce__btn" onClick={() => copy(postText(a, c))}>העתקת הפוסט</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'competitors' && (
        <div className="ce__table-wrap">
          <table className="ce__table">
            <thead><tr><th>מתחרה</th><th>תחום</th><th>מה עובד להם</th><th>התשובה שלנו</th><th>מה עוד חסר</th></tr></thead>
            <tbody>
              {COMPETITORS.map((m) => (
                <tr key={m.domain}>
                  <td><b>{m.name}</b><br /><a href={`https://${m.domain}`} target="_blank" rel="noopener noreferrer" className="ce__muted">{m.domain}</a></td>
                  <td>{m.field}</td>
                  <td>{m.strength}</td>
                  <td>{m.ours.map((o) => <div key={o.to}><a href={o.to} target="_blank" rel="noopener noreferrer">{o.label}</a></div>)}</td>
                  <td className="ce__gap">{m.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
