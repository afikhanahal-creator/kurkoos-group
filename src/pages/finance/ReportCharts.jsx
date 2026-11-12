import { useState } from 'react'
import { money, monthLabel } from './format.js'

/* Charts of the reports screen. Every bar carries its figure, and resting the pointer on it (or reaching it with the
   keyboard) opens a card with everything behind it: how many documents, the total, the VAT and the average. */
const compact = (v) => {
  const n = Math.abs(Number(v) || 0)
  if (n >= 1_000_000) return `${(v / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 100_000) return `${Math.round(v / 1000)}K`
  return Math.round(v).toLocaleString('he-IL')
}
const docsWord = (c) => (c === 1 ? 'מסמך אחד' : `${c.toLocaleString('he-IL')} מסמכים`)

/* the floating card: placed on the page (not inside the scrolling chart), so nothing clips it */
export function useTip(side) {
  const [tip, setTip] = useState(null)
  // beside a column (whichever side has room), under a row (above it when the screen ends)
  const show = (key) => (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (side) { const left = r.left > 250; setTip({ key, at: left ? 'left' : 'right', x: left ? r.left - 10 : r.right + 10, y: Math.max(12, Math.min(innerHeight - 230, r.top + 24)) }) } else { const below = r.bottom + 230 < innerHeight; setTip({ key, at: below ? 'below' : 'above', x: Math.min(innerWidth - 130, Math.max(130, r.left + r.width / 2)), y: below ? r.bottom + 6 : r.top - 6 }) }
  }
  const hide = () => setTip(null)
  return [tip, show, hide]
}
export function Tip({ tip, title, rows }) {
  return (
    <span className={`fin-rtip is-${tip.at}`} role="tooltip" style={{ left: tip.x, top: tip.y }}>
      <b>{title}</b>
      {rows.map(([k, v]) => <span key={k}><i>{k}</i><em>{v}</em></span>)}
    </span>
  )
}

/* a month chart: the bars are the amounts or the number of documents, by the switch at the top */
export function MonthChart({ months, rows, onOpen }) {
  const [mode, setMode] = useState('amount')
  const [tip, show, hide] = useTip(true)
  const at = mode === 'amount' ? 4 : 1
  const max = Math.max(...rows.map((r) => Math.abs(r[at])), 1)
  return (
    <div className="fin-rchart">
      <div className="fin-rchart__head">
        <div className="fin-seg" role="group" aria-label="מה העמודות מציגות">
          <button type="button" className={mode === 'amount' ? 'is-on' : ''} aria-pressed={mode === 'amount'} onClick={() => setMode('amount')}>סכום</button>
          <button type="button" className={mode === 'count' ? 'is-on' : ''} aria-pressed={mode === 'count'} onClick={() => setMode('count')}>מספר מסמכים</button>
        </div>
      </div>
      <div className="fin-scroll-x fin-rchart__wrap" onScroll={hide} ref={(el) => { if (el && el.dataset.at !== String(months.length)) { el.dataset.at = String(months.length); el.scrollLeft = -el.scrollWidth } }}>
        <div className="fin-rchart__cols" style={{ '--n': months.length }}>
          {months.map((m, n) => {
            const r = rows[n]; const c = r[1]; const v = r[at]
            return (
              <button key={m} type="button" className={`fin-rchart__col ${c ? '' : 'is-zero'}`} aria-disabled={!c} onClick={() => c && onOpen(n)}
                onMouseEnter={show(n)} onMouseLeave={hide} onFocus={show(n)} onBlur={hide}
                aria-label={`${monthLabel(m)}: ${money(r[4])}, ${docsWord(c)}${c ? '. פתיחת הרשימה' : ''}`}>
                <span className="fin-rchart__n">{c ? (mode === 'amount' ? compact(v) : v) : ''}</span>
                <span className="fin-rchart__bar" style={{ height: `${v ? Math.max(3, (Math.abs(v) / max) * 100) : 0}%` }} />
                <span className="fin-rchart__m">{new Date(`${m}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'short' })}{m.endsWith('-01') || n === 0 ? ` ${m.slice(2, 4)}` : ''}</span>
                <span className="fin-rchart__sub">{c ? (mode === 'amount' ? <>{c}<i> מסמכים</i><b> מס׳</b></> : compact(r[4])) : '—'}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="fin-muted fin-small">מתחת לכל חודש: {mode === 'amount' ? 'מספר המסמכים' : 'הסכום בשקלים'}. ריחוף מציג את כל הפרטים, ולחיצה פותחת את מסמכי החודש.</p>
      {tip && (() => { const r = rows[tip.key]; return <Tip tip={tip} title={monthLabel(months[tip.key])} rows={[['מסמכים', r[1].toLocaleString('he-IL')], ['סה״כ', money(r[4])], ['לפני מע״מ', money(r[2])], ['מע״מ', money(r[3])], ...(r[1] ? [['ממוצע למסמך', money(r[4] / r[1])]] : [])]} /> })()}
    </div>
  )
}

/* a ranked list (companies, projects, suppliers, months): name, bar, figure, and under the name how many documents
   and what part of the whole. The same card opens on hover. */
export function RankBars({ rows, format = money, onPick, empty = 'אין נתונים לתקופה.' }) {
  const [tip, show, hide] = useTip()
  if (!rows.length) return <p className="fin-muted">{empty}</p>
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const all = rows.reduce((a, r) => a + Math.abs(r.value), 0) || 1
  const share = (r) => `${Math.round((Math.abs(r.value) / all) * 100)}%`
  return (
    <ul className="fin-rbars">
      {rows.map((r, i) => {
        const Row = onPick && r.count ? 'button' : 'div'
        return (
          <li key={r.key ?? r.name}>
            <Row {...(Row === 'button' ? { type: 'button', onClick: () => onPick(r) } : { tabIndex: 0 })} className="fin-rbars__row" onMouseEnter={show(i)} onMouseLeave={hide} onFocus={show(i)} onBlur={hide}>
              <span className="fin-rbars__name">{r.name}</span>
              <span className="fin-rbars__value">{format(r.value)}</span>
              <span className="fin-rbars__track"><span className="fin-rbars__fill" style={{ width: `${Math.max(1.5, (Math.abs(r.value) / max) * 100)}%` }} /></span>
              <span className="fin-rbars__meta">{r.count != null ? `${docsWord(r.count)} · ` : ''}{share(r)} מהסך</span>
            </Row>
          </li>
        )
      })}
      {tip && rows[tip.key] && (() => { const r = rows[tip.key]; return <Tip tip={tip} title={r.name} rows={[...(r.count != null ? [['מסמכים', r.count.toLocaleString('he-IL')]] : []), ...(r.detail || [['סה״כ', format(r.value)]]), ['חלק מהסך', share(r)], ...(r.count ? [['ממוצע למסמך', format(r.value / r.count)]] : [])]} /> })()}
    </ul>
  )
}

/* the headline figures of a report */
export function ReportFigures({ items }) {
  return <dl className="fin-rfigs">{items.map(([k, v, note]) => <div key={k}><dt>{k}</dt><dd>{v}</dd>{note && <small>{note}</small>}</div>)}</dl>
}
