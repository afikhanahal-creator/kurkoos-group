import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { booked, dayOf } from './insights.js'
import { money, signedTotal } from './format.js'

/* The overview's visual kit: one hover panel for every figure, a consistent colour per category and company,
   a sparkline, a donut and a line chart. All of it draws what it is given; nothing here computes money on its own
   except the trend buckets, which sum the same booked documents the overview counts. */

// ---------- colours: the same category has the same colour on every screen ----------
const FIXED = [[/ללא קטגוריה/, '#5b7fa6'], [/שכיר|נכס|דמי ניהול/, '#e08a3c'], [/תחבור|רכב|דלק|נסיע/, '#239b8e'], [/פרסום|שיווק/, '#d96c76'], [/חשמל|מים|ארנונה|גז/, '#7667c8'], [/תחזוק|תיקונ/, '#102f43'], [/תוכנ|מנוי/, '#8a98a8'], [/מימון|ריבית|בנק|עמלות/, '#e9a23b']]
const POOL = ['#287ba5', '#3a9b70', '#b0679a', '#5f8f3e', '#c2703d', '#4c6fb5', '#8d6e4f', '#2f8f9d']
export function categoryColor(name) {
  const n = String(name || 'ללא קטגוריה')
  for (const [re, c] of FIXED) if (re.test(n)) return c
  let h = 0; for (const ch of n) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return POOL[h % POOL.length]
}
export const COMPANY_COLORS = ['#287ba5', '#239b8e', '#7667c8', '#e9a23b', '#3a9b70', '#d96c76', '#4c6fb5', '#8d6e4f']
export const companyColor = (businesses, id) => { const i = businesses.findIndex((b) => b.id === id); return i < 0 ? '#8a98a8' : COMPANY_COLORS[i % COMPANY_COLORS.length] }

// ---------- the hover panel ----------
/* const tip = useTip(); <button {...tip.on(() => <Rows />)} /> … {tip.el}
   Mouse and keyboard focus open it; it floats above everything, flips under the anchor when there is no room above and
   never leaves the viewport. On touch it opens only where the caller asks (tap: true), since a tap usually navigates. */
export function useTip() {
  const [t, setT] = useState(null)
  const box = useRef(null)
  const [pos, setPos] = useState(null)
  const hide = useCallback(() => setT(null), [])
  useLayoutEffect(() => {
    if (!t || !box.current) { setPos(null); return }
    const r = t.rect; const b = box.current.getBoundingClientRect(); const vw = window.innerWidth; const vh = window.innerHeight
    let top = r.top - b.height - 10; if (top < 8) top = Math.min(vh - b.height - 8, r.bottom + 10)
    const left = Math.max(8, Math.min(vw - b.width - 8, r.left + r.width / 2 - b.width / 2))
    setPos({ top: Math.max(8, top), left })
  }, [t])
  useEffect(() => {
    if (!t) return undefined
    const off = (e) => { if (e.type !== 'keydown' || e.key === 'Escape') hide() }
    window.addEventListener('scroll', off, true); window.addEventListener('keydown', off); window.addEventListener('resize', off)
    return () => { window.removeEventListener('scroll', off, true); window.removeEventListener('keydown', off); window.removeEventListener('resize', off) }
  }, [t, hide])
  const show = (el, content) => setT({ rect: el.getBoundingClientRect(), content })
  const on = (content, { tap = false } = {}) => ({
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') show(e.currentTarget, content) },
    onPointerLeave: (e) => { if (e.pointerType === 'mouse') hide() },
    onFocus: (e) => { if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget, content) },
    onBlur: hide,
    ...(tap ? { onPointerDown: (e) => { if (e.pointerType !== 'mouse') show(e.currentTarget, content) } } : {}),
  })
  const host = typeof document !== 'undefined' ? document.querySelector('.fin') || document.body : null
  const el = t && host ? createPortal(
    <div ref={box} className="fin-tip" role="tooltip" style={pos ? { top: pos.top, left: pos.left, opacity: 1 } : { top: 0, left: 0, opacity: 0 }}>{typeof t.content === 'function' ? t.content() : t.content}</div>, host) : null
  return { on, el, show, hide }
}
/* the usual content: a title and label / value rows */
export function TipRows({ title, sub, rows = [], note }) {
  return (
    <>
      {title && <strong className="fin-tip__title">{title}</strong>}
      {sub && <span className="fin-tip__sub">{sub}</span>}
      {rows.filter(Boolean).length > 0 && <dl>{rows.filter(Boolean).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      {note && <span className="fin-tip__note">{note}</span>}
    </>
  )
}

// ---------- sparkline ----------
export function Sparkline({ values, label }) {
  if (!values || values.length < 2) return null
  const W = 120; const H = 36; const max = Math.max(...values, 1); const min = Math.min(...values, 0)
  const x = (i) => (i / (values.length - 1)) * (W - 4) + 2; const y = (v) => H - 3 - ((v - min) / (max - min || 1)) * (H - 6)
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg className="fin-spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
      <polygon points={`2,${H - 1} ${pts} ${W - 2},${H - 1}`} fill="currentColor" opacity="0.1" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" fill="currentColor" />
    </svg>
  )
}

// ---------- donut ----------
/* rows: [{ key, name, total, share, count, color }]. Only positive amounts get a slice. */
export function Donut({ rows, center, sub, tip, onPick, active, onHover }) {
  const R = 54; const C = 2 * Math.PI * R
  const parts = rows.filter((r) => r.total > 0); const all = parts.reduce((a, r) => a + r.total, 0)
  let acc = 0
  return (
    <div className="fin-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="התפלגות ההוצאות לפי קטגוריה">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--wash)" strokeWidth="18" />
        {all > 0 && parts.map((r) => {
          const len = (r.total / all) * C; const off = acc; acc += len
          const on = active === r.key
          return (
            <circle key={r.key} cx="70" cy="70" r={R} fill="none" stroke={r.color} strokeWidth={on ? 23 : 18} strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"
              className={`fin-donut__seg ${active && !on ? 'is-dim' : ''}`} tabIndex={0} role="button" aria-label={`${r.name}: ${money(r.total)}, ${Math.round(r.share * 100)}%`}
              {...tip.on(() => <TipRows title={r.name} rows={[['סכום', money(r.total)], ['חלק מההוצאות', `${(r.share * 100).toFixed(1)}%`], ['מסמכים', r.count]]} />, { tap: true })}
              onMouseEnter={() => onHover?.(r.key)} onMouseLeave={() => onHover?.(null)} onClick={() => onPick?.(r)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(r) } }} />
          )
        })}
      </svg>
      <div className="fin-donut__center"><strong>{center}</strong><span>{sub}</span></div>
    </div>
  )
}

// ---------- trend buckets ----------
const iso = (t) => t.toISOString().slice(0, 10)
const addDays = (d, n) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return iso(t) }
const HE_M = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']
const dm = (d) => `${Number(d.slice(8, 10))}.${Number(d.slice(5, 7))}`
/* the buckets of a period: [{ key, from, to, label }] */
export function bucketsOf(from, to, gran) {
  const out = []
  if (gran === 'month') {
    let [y, m] = from.slice(0, 7).split('-').map(Number)
    while (`${y}-${String(m).padStart(2, '0')}` <= to.slice(0, 7) && out.length < 60) { const k = `${y}-${String(m).padStart(2, '0')}`; out.push({ key: k, from: `${k}-01`, to: `${k}-31`, label: `${HE_M[m - 1]} ${String(y).slice(2)}` }); m++; if (m > 12) { m = 1; y++ } }
  } else if (gran === 'week') {
    let s = addDays(from, -new Date(`${from}T00:00:00Z`).getUTCDay())
    while (s <= to && out.length < 80) { const e = addDays(s, 6); out.push({ key: s, from: s, to: e, label: `${dm(s < from ? from : s)}–${dm(e > to ? to : e)}` }); s = addDays(s, 7) }
  } else { let d = from; while (d <= to && out.length < 120) { out.push({ key: d, from: d, to: d, label: dm(d) }); d = addDays(d, 1) } }
  return out
}
export const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400_000) + 1
/* which granularities make sense for a period this long */
export const gransFor = (from, to) => { const n = daysBetween(from, to); return [n <= 92 && 'day', n >= 14 && n <= 400 && 'week', n >= 60 && 'month'].filter(Boolean) }
/* sums of the booked shekel documents per bucket, as one total line or a line per group (top 4 and "others") */
export function trendSeries(documents, { from, to, gran, by = 'total', nameOf = (k) => k, colorOf = () => '#287ba5' }) {
  const buckets = bucketsOf(from, to, gran)
  const docs = documents.filter((d) => booked(d) && (!d.currency || d.currency === 'ILS') && dayOf(d) >= from && dayOf(d) <= to)
  const idx = (d) => { const t = dayOf(d); return buckets.findIndex((b) => t >= b.from && t <= b.to) }
  const keyOf = by === 'company' ? (d) => d.business_id || '' : by === 'category' ? (d) => d.category || '' : () => 'total'
  const groups = new Map()
  for (const d of docs) { const i = idx(d); if (i < 0) continue; const k = keyOf(d); const g = groups.get(k) || { key: k, total: 0, values: buckets.map(() => 0), counts: buckets.map(() => 0) }; g.values[i] += signedTotal(d); g.counts[i]++; g.total += signedTotal(d); groups.set(k, g) }
  let list = [...groups.values()].sort((a, b) => b.total - a.total)
  if (by !== 'total' && list.length > 5) {
    const rest = list.slice(4); const other = { key: '__other', total: 0, values: buckets.map(() => 0), counts: buckets.map(() => 0) }
    for (const g of rest) { other.total += g.total; g.values.forEach((v, i) => { other.values[i] += v; other.counts[i] += g.counts[i] }) }
    list = [...list.slice(0, 4), other]
  }
  const series = list.map((g) => ({ ...g, name: by === 'total' ? 'סך ההוצאות' : g.key === '__other' ? 'אחרים' : nameOf(g.key), color: by === 'total' ? '#287ba5' : g.key === '__other' ? '#8a98a8' : colorOf(g.key) }))
  return { buckets, series }
}

// ---------- line chart ----------
const shortNum = (v) => { const a = Math.abs(v); return a >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(v / 1e3)}K` : String(Math.round(v)) }
export function TrendLines({ buckets, series, prev, tip }) {
  const [hi, setHi] = useState(null)
  const W = 760; const H = 240; const L = 46; const Rp = 12; const T = 14; const B = 30
  const all = [...series.flatMap((s) => s.values), ...(prev || [])]
  const max = Math.max(1, ...all); const min = Math.min(0, ...all)
  const step = 10 ** Math.floor(Math.log10(max)); const unit = [1, 2, 2.5, 5, 10].map((m) => m * step).find((u) => max / u <= 4) || step * 10
  const top = Math.ceil(max / unit) * unit; const lo = min < 0 ? -Math.ceil(-min / unit) * unit : 0
  const n = buckets.length
  // right to left: the first bucket is on the right, as Hebrew reads
  const x = (i) => (n === 1 ? (L + W - Rp) / 2 : W - Rp - (i / (n - 1)) * (W - L - Rp))
  const y = (v) => T + (1 - (v - lo) / (top - lo || 1)) * (H - T - B)
  const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const ticks = useMemo(() => { const o = []; for (let v = lo; v <= top + 1e-6; v += unit) o.push(v); return o }, [lo, top, unit])
  const every = Math.max(1, Math.ceil(n / 9))
  const tipFor = (i) => () => (
    <TipRows title={buckets[i].label} rows={[...series.map((s) => [<span key={s.key} className="fin-tip__key"><i style={{ background: s.color }} />{s.name}</span>, money(s.values[i])]), series.length > 1 && ['סה״כ', money(series.reduce((a, s) => a + s.values[i], 0))], prev && ['בתקופה הקודמת', money(prev[i] || 0)], ['מסמכים', series.reduce((a, s) => a + s.counts[i], 0)]]} />
  )
  if (!n) return <p className="fin-muted">אין נתונים לתקופה.</p>
  return (
    <div className="fin-lines">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="מגמת ההוצאות לאורך התקופה" onMouseLeave={() => { setHi(null); tip.hide() }}>
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - Rp} y1={y(v)} y2={y(v)} className="fin-lines__grid" /><text x={L - 8} y={y(v) + 4} textAnchor="end" className="fin-lines__tick">{shortNum(v)}</text></g>)}
        {buckets.map((b, i) => (i % every === 0 || i === n - 1) && <text key={b.key} x={x(i)} y={H - 8} textAnchor="middle" className="fin-lines__tick">{b.label}</text>)}
        {prev && n > 1 && <path d={path(prev)} className="fin-lines__prev" />}
        {series.map((s) => (n > 1 ? <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /> : null))}
        {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} className="fin-lines__cross" />}
        {series.map((s) => s.values.map((v, i) => ((n <= 31 && n > 0) || i === hi) && (v !== 0 || i === hi) ? <circle key={`${s.key}${i}`} cx={x(i)} cy={y(v)} r={i === hi ? 5 : 3} fill={s.color} stroke="var(--sheet)" strokeWidth="1.5" /> : null))}
        {buckets.map((b, i) => {
          const w = n === 1 ? W - L - Rp : (W - L - Rp) / (n - 1)
          return <rect key={b.key} x={x(i) - w / 2} y={T} width={w} height={H - T - B} fill="transparent" tabIndex={0} role="button" aria-label={`${b.label}: ${money(series.reduce((a, s) => a + s.values[i], 0))}`}
            onMouseEnter={(e) => { setHi(i); tip.show(e.currentTarget, tipFor(i)) }} onFocus={(e) => { setHi(i); tip.show(e.currentTarget, tipFor(i)) }} onBlur={() => { setHi(null); tip.hide() }} onPointerDown={(e) => { if (e.pointerType !== 'mouse') { setHi(i); tip.show(e.currentTarget, tipFor(i)) } }} />
        })}
      </svg>
      <ul className="fin-lines__legend">
        {series.map((s) => <li key={s.key}><i style={{ background: s.color }} />{s.name}<b>{money(s.total)}</b></li>)}
        {prev && <li><i className="is-prev" />התקופה הקודמת</li>}
      </ul>
    </div>
  )
}

// ---------- insights the overview adds to the alerts it already has ----------
/* Each: { key, level: info | warn | crit, title, text, amount, company, action, to | ids }. Only when the data supports it. */
export function extraInsights(o, { businesses = [], period, enoughHistory }) {
  const out = []
  const total = o.kpi.spend
  if (!enoughHistory) out.push({ key: 'nohistory', level: 'info', title: 'אין מספיק היסטוריה להשוואה', text: `בתקופה הקודמת (${period.prevFrom.split('-').reverse().join('.')} עד ${period.prevTo.split('-').reverse().join('.')}) אין מסמכים, ולכן אחוזי השינוי לא מוצגים.`, action: null })
  for (const c of o.byCompany.filter((r) => r.key && r.prev >= 1000 && r.change !== null && Math.abs(r.change) >= 25 && Math.abs(r.total - r.prev) >= 1000).slice(0, 3)) {
    out.push({ key: `co-${c.key}`, level: c.change > 0 ? 'warn' : 'info', title: `הוצאות ${c.name} ${c.change > 0 ? 'עלו' : 'ירדו'} ב-${Math.abs(Math.round(c.change))}%`, text: `${money(c.total)} בתקופה, לעומת ${money(c.prev)} בתקופה הקודמת.`, amount: c.total - c.prev, company: c.name, action: 'לסקירת החברה', company_id: c.key })
  }
  const topSup = o.bySupplier[0]
  if (topSup && total > 0 && topSup.total / total >= 0.35 && o.bySupplier.length >= 3) out.push({ key: 'concentration', level: topSup.total / total >= 0.6 ? 'warn' : 'info', title: `${Math.round((topSup.total / total) * 100)}% מההוצאות אצל ספק אחד`, text: `${topSup.name}: ${money(topSup.total)} מתוך ${money(total)} בתקופה.`, amount: topSup.total, action: 'למסמכי הספק', to: topSup.id ? `/suppliers/${topSup.id}` : null, ids: topSup.ids })
  for (const c of o.byCategory.filter((r) => r.key && r.prev >= 1000 && r.change !== null && Math.abs(r.change) >= 15 && Math.abs(r.total - r.prev) >= 1000).slice(0, 2)) {
    out.push({ key: `cat-${c.key}`, level: 'info', title: `הוצאות ${c.name} ${c.change > 0 ? 'גדלו' : 'קטנו'} ב-${Math.abs(Math.round(c.change))}%`, text: `${money(c.total)} בתקופה, לעומת ${money(c.prev)} בתקופה הקודמת.`, amount: c.total - c.prev, action: 'למסמכי הקטגוריה', to: c.id ? `/categories/${c.id}` : null, ids: c.ids })
  }
  const uncategorized = o.byCategory.find((r) => !r.key)
  if (uncategorized && total > 0 && uncategorized.total / total >= 0.2) out.push({ key: 'nocat', level: 'warn', title: `${Math.round((uncategorized.total / total) * 100)}% מההוצאות בלי קטגוריה`, text: `${uncategorized.count} מסמכים בסך ${money(uncategorized.total)} לא משויכים לקטגוריה, ולכן ההתפלגות חלקית.`, amount: uncategorized.total, action: 'לשיוך קטגוריות', ids: uncategorized.ids })
  return out.map((x) => ({ ...x, company: x.company || (businesses.length === 1 ? businesses[0].name : '') }))
}
