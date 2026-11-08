import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import { claimableVat, counts, date, docDate, money, monthKey, monthLabel, signedTotal } from './format.js'
import { Empty, Kpi, StatusPill, UploadZone } from './ui.jsx'

const thisMonth = () => new Date().toISOString().slice(0, 7)
const shiftMonth = (k, n) => { const d = new Date(`${k}-01T00:00:00`); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7) }

function Bars({ rows, total }) {
  if (!rows.length) return <p className="fin-muted">אין נתונים לתקופה.</p>
  return (
    <ul className="fin-bars">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="fin-bars__name">{r.name}</span>
          <span className="fin-bars__track"><span className="fin-bars__fill" style={{ width: `${Math.max(2, (r.value / (total || 1)) * 100)}%` }} /></span>
          <span className="fin-bars__value">{money(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  const { documents, categories, businesses, mailboxes, reload, go } = useFinance()
  const [month, setMonth] = useState(thisMonth())
  const [biz, setBiz] = useState('')

  const scoped = useMemo(() => documents.filter((d) => counts(d) && (!biz || d.business_id === biz)), [documents, biz])
  const inMonth = useMemo(() => scoped.filter((d) => monthKey(docDate(d)) === month), [scoped, month])

  const stats = useMemo(() => {
    const total = inMonth.reduce((s, d) => s + signedTotal(d), 0)
    const vat = inMonth.reduce((s, d) => s + claimableVat(d, categories), 0)
    const byCat = {}
    const bySup = {}
    for (const d of inMonth) {
      byCat[d.category || 'ללא קטגוריה'] = (byCat[d.category || 'ללא קטגוריה'] || 0) + signedTotal(d)
      bySup[d.supplier_name || 'לא ידוע'] = (bySup[d.supplier_name || 'לא ידוע'] || 0) + signedTotal(d)
    }
    const sort = (o) => Object.entries(o).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    const trend = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((k) => ({ k, value: scoped.filter((d) => monthKey(docDate(d)) === k).reduce((s, d) => s + signedTotal(d), 0) }))
    return { total, vat, cats: sort(byCat).slice(0, 8), sups: sort(bySup).slice(0, 6), trend }
  }, [inMonth, scoped, categories, month])

  const toReview = documents.filter((d) => d.status === 'review' && (!biz || d.business_id === biz))
  const failed = documents.filter((d) => d.status === 'failed').length
  const trendMax = Math.max(...stats.trend.map((t) => t.value), 1)

  return (
    <div className="fin-stack">
      <div className="fin-toolbar">
        <div className="fin-month">
          <button type="button" className="fin-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="החודש הקודם">›</button>
          <strong>{monthLabel(month)}</strong>
          <button type="button" className="fin-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="החודש הבא" disabled={month >= thisMonth()}>‹</button>
        </div>
        {businesses.length > 1 && (
          <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה">
            <option value="">כל החברות</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      <div className="fin-kpis">
        <Kpi label="הוצאות החודש" value={money(stats.total)} hint={`${inMonth.length} מסמכים`} />
        <Kpi label="מע״מ תשומות לקיזוז" value={money(stats.vat)} hint="לפי אחוז הקיזוז של כל קטגוריה" tone="brand" />
        <Kpi label="ממתינים לבדיקה" value={toReview.length} hint={toReview.length ? 'לחצו על מסמכים כדי לאשר' : 'הכול נבדק'} tone={toReview.length ? 'warn' : 'ok'} />
        <Kpi label="תיבות מחוברות" value={mailboxes.filter((m) => m.status === 'active').length} hint={failed ? `${failed} מסמכים שלא נקראו` : 'סריקה אוטומטית פעם ביום'} tone={failed ? 'bad' : undefined} />
      </div>

      <UploadZone businessId={biz} onDone={reload} compact />

      <div className="fin-grid">
        <section className="fin-card">
          <h2 className="fin-card__title">לפי קטגוריה</h2>
          <Bars rows={stats.cats} total={stats.cats[0]?.value} />
        </section>
        <section className="fin-card">
          <h2 className="fin-card__title">הספקים הגדולים</h2>
          <Bars rows={stats.sups} total={stats.sups[0]?.value} />
        </section>
        <section className="fin-card">
          <h2 className="fin-card__title">חצי שנה אחרונה</h2>
          <div className="fin-trend" role="img" aria-label={stats.trend.map((t) => `${monthLabel(t.k)}: ${money(t.value)}`).join(', ')}>
            {stats.trend.map((t) => (
              <button type="button" key={t.k} className={`fin-trend__col ${t.k === month ? 'is-active' : ''}`} onClick={() => setMonth(t.k)} title={money(t.value)}>
                <span className="fin-trend__bar" style={{ height: `${Math.max(3, (t.value / trendMax) * 100)}%` }} />
                <span className="fin-trend__label">{new Date(`${t.k}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'short' })}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="fin-card">
          <div className="fin-card__head">
            <h2 className="fin-card__title">ממתינים לבדיקה</h2>
            {toReview.length > 0 && <button type="button" className="fin-link" onClick={() => go('/documents?status=review')}>לכל המסמכים</button>}
          </div>
          {toReview.length ? (
            <ul className="fin-list">
              {toReview.slice(0, 6).map((d) => (
                <li key={d.id}>
                  <button type="button" className="fin-list__row" onClick={() => go(`/documents/${d.id}`)}>
                    <span><strong>{d.supplier_name || d.file_name}</strong><small>{date(docDate(d))} · {d.category || 'ללא קטגוריה'}</small></span>
                    <span className="fin-list__end">{money(d.total_amount, d.currency)}<StatusPill status={d.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <Empty title="אין מסמכים שמחכים">כל מה שנכנס נבדק ואושר.</Empty>}
        </section>
      </div>
    </div>
  )
}
