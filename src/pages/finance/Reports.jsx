import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import { SOURCE, STATUS, claimableVat, counts, date, docDate, money, monthLabel, nameOf, period, shiftMonth, signedNet, signedTotal, thisMonth, toCsv, toExcel } from './format.js'
import { saveBlob } from './zip.js'
import { Bars, Card, Empty, Icon, PageHead } from './ui.jsx'

/* All totals come from stored records (validated by people), never from AI. */
const REPORTS = [
  ['monthly', 'הוצאות חודשיות'], ['company', 'לפי חברה'], ['project', 'לפי פרויקט'], ['supplier', 'לפי ספק'], ['vat', 'סיכום מע״מ'],
  ['missing', 'חשבוניות חסרות'], ['unprocessed', 'לא מעובדים'], ['duplicates', 'כפילויות'], ['collection', 'סטטיסטיקת איסוף'],
]

export default function Reports() {
  const { documents, businesses, projects, categories, role, go } = useFinance()
  const [params] = useSearchParams()
  const [kind, setKind] = useState('monthly')
  const [biz, setBiz] = useState(params.get('company') || '')
  const [to, setTo] = useState(thisMonth())
  const [span, setSpan] = useState(12)
  const from = shiftMonth(to, -(span - 1))
  const months = Array.from({ length: span }, (_, i) => shiftMonth(from, i))
  const scoped = useMemo(() => documents.filter((d) => !biz || d.business_id === biz), [documents, biz])
  const booked = useMemo(() => scoped.filter((d) => counts(d) && period(d) >= from && period(d) <= to && (role !== 'accountant' || ['approved', 'sent'].includes(d.status))), [scoped, from, to, role])

  const report = useMemo(() => {
    const sum = (list) => [list.length, list.reduce((a, d) => a + signedNet(d), 0), list.reduce((a, d) => a + (d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(d.vat_amount) || 0), 0), list.reduce((a, d) => a + signedTotal(d), 0)]
    const group = (keyFn, labelFn) => {
      const g = {}
      for (const d of booked) { const k = keyFn(d) || '__none'; (g[k] ||= []).push(d) }
      return Object.entries(g).map(([k, list]) => [labelFn(k), ...sum(list)]).sort((a, b) => b[4] - a[4])
    }
    const moneyHead = ['מסמכים', 'לפני מע״מ', 'מע״מ', 'סה״כ']
    switch (kind) {
      case 'monthly': return { head: ['חודש', ...moneyHead], rows: months.map((m) => [monthLabel(m), ...sum(booked.filter((d) => period(d) === m))]), chart: 4 }
      case 'company': return { head: ['חברה', ...moneyHead], rows: group((d) => d.business_id, (k) => nameOf(businesses, k) || 'לא משויך'), chart: 4 }
      case 'project': return { head: ['פרויקט', ...moneyHead], rows: group((d) => d.project_id, (k) => nameOf(projects, k) || 'ללא פרויקט'), chart: 4 }
      case 'supplier': return { head: ['ספק', ...moneyHead], rows: group((d) => d.supplier_name, (k) => (k === '__none' ? 'לא ידוע' : k)), chart: 4 }
      case 'vat': return {
        head: ['חודש', 'מסמכים', 'מע״מ במסמכים', 'מע״מ לקיזוז', 'לא לקיזוז'],
        rows: months.map((m) => {
          const l = booked.filter((d) => period(d) === m)
          const vat = l.reduce((a, d) => a + (d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(d.vat_amount) || 0), 0)
          const claim = l.reduce((a, d) => a + claimableVat(d, categories), 0)
          return [monthLabel(m), l.length, vat, claim, vat - claim]
        }),
        chart: 3,
      }
      case 'missing': {
        const by = {}
        for (const d of scoped.filter(counts)) if (d.supplier_name) (by[d.supplier_name] ||= new Set()).add(period(d))
        const rows = []
        for (const [name, set] of Object.entries(by)) {
          const prev = [1, 2, 3, 4].map((n) => shiftMonth(to, -n)).filter((m) => set.has(m)).length
          if (prev >= 3 && !set.has(to)) rows.push([name, `${prev} מתוך 4 החודשים הקודמים`, monthLabel(to)])
        }
        return { head: ['ספק קבוע', 'הופיע ב-', 'חסר ל-'], rows, note: 'ספק שהגיעה ממנו חשבונית ב-3 לפחות מ-4 החודשים הקודמים, ולא בחודש הנבחר.' }
      }
      case 'unprocessed': {
        const old = Date.now() - 3 * 86400_000
        const list = scoped.filter((d) => d.status === 'failed' || d.status === 'processing' || (d.status === 'review' && new Date(d.created_at).getTime() < old))
        return { head: ['מסמך', 'סטטוס', 'נאסף', 'ניסיונות', 'סה״כ'], rows: list.map((d) => [d.supplier_name || d.file_name, STATUS[d.status].label, date(d.created_at), d.attempts || 0, Number(d.total_amount) || 0]), ids: list.map((d) => d.id), note: 'מסמכים שנכשלו, שעדיין בעיבוד, או שמחכים לאישור יותר משלושה ימים.' }
      }
      case 'duplicates': {
        const list = scoped.filter((d) => d.status === 'duplicate' || (d.issues || []).some((i) => i.code === 'possible_duplicate'))
        return { head: ['ספק', 'מספר', 'תאריך', 'סה״כ', 'סטטוס'], rows: list.map((d) => [d.supplier_name || d.file_name, d.doc_number || '', date(docDate(d)), Number(d.total_amount) || 0, STATUS[d.status].label]), ids: list.map((d) => d.id) }
      }
      case 'collection': return {
        head: ['חודש', 'נאספו', ...Object.values(SOURCE).slice(0, 4), 'עובדו', 'נכשלו'],
        rows: months.map((m) => {
          const l = scoped.filter((d) => String(d.created_at).slice(0, 7) === m)
          return [monthLabel(m), l.length, ...Object.keys(SOURCE).slice(0, 4).map((s) => l.filter((d) => d.source === s).length), l.filter((d) => d.processed_at && d.status !== 'failed').length, l.filter((d) => d.status === 'failed').length]
        }),
        chart: 1, count: true,
      }
      default: return { head: [], rows: [] }
    }
  }, [kind, booked, scoped, months, businesses, projects, categories, to])

  const name = `${REPORTS.find((r) => r[0] === kind)[1]}_${from}_${to}${biz ? `_${nameOf(businesses, biz)}` : ''}`
  const isMoney = (i) => !report.count && typeof report.rows[0]?.[i] === 'number' && report.head[i] !== 'מסמכים' && report.head[i] !== 'ניסיונות'
  const totals = report.rows.length && report.chart ? report.head.map((_, i) => (i === 0 ? 'סה״כ' : report.rows.reduce((a, r) => a + (typeof r[i] === 'number' ? r[i] : 0), 0))) : null

  return (
    <div className="fin-stack">
      <PageHead title="דוחות" sub={role === 'accountant' ? 'מבוסס על מסמכים מאושרים בלבד' : 'כל הסכומים מחושבים מהרשומות השמורות, לא ע״י AI'}>
        <button type="button" className="fin-btn" onClick={() => saveBlob(new Blob([toCsv(report.head, report.rows)], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)} disabled={!report.rows.length}><Icon name="download" size={18} /> CSV</button>
        <button type="button" className="fin-btn" onClick={() => saveBlob(new Blob([toExcel(name, report.head, report.rows)], { type: 'application/vnd.ms-excel' }), `${name}.xls`)} disabled={!report.rows.length}><Icon name="download" size={18} /> Excel</button>
      </PageHead>
      <div className="fin-tabs fin-tabs--scroll" role="tablist" aria-label="סוג דוח">
        {REPORTS.map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={kind === k} className={`fin-tab ${kind === k ? 'is-active' : ''}`} onClick={() => setKind(k)}>{v}</button>)}
      </div>
      <div className="fin-filters">
        {businesses.length > 1 && <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
        <label className="fin-inline-label">עד חודש <input type="month" className="fin-select" value={to} max={thisMonth()} onChange={(e) => setTo(e.target.value || thisMonth())} /></label>
        <select className="fin-select" value={span} onChange={(e) => setSpan(Number(e.target.value))} aria-label="טווח"><option value={1}>חודש אחד</option><option value={3}>3 חודשים</option><option value={6}>6 חודשים</option><option value={12}>12 חודשים</option><option value={24}>24 חודשים</option></select>
      </div>
      {report.note && <p className="fin-muted">{report.note}</p>}
      {!report.rows.length ? <Empty title="אין נתונים לדוח הזה" icon="reports">נסו טווח אחר או חברה אחרת.</Empty> : (
        <div className="fin-grid fin-grid--report">
          {report.chart && <Card title="תצוגה"><Bars rows={report.rows.filter((r) => r[report.chart]).slice(0, 12).map((r) => ({ name: String(r[0]), value: r[report.chart] }))} format={report.count ? (v) => String(v) : money} /></Card>}
          <div className="fin-table-wrap">
            <table className="fin-table fin-table--plain">
              <thead><tr>{report.head.map((h, i) => <th key={h} className={i && typeof report.rows[0][i] === 'number' ? 'fin-num' : ''}>{h}</th>)}</tr></thead>
              <tbody>{report.rows.map((r, n) => <tr key={n} onClick={report.ids ? () => go(`/documents/${report.ids[n]}`) : undefined} className={report.ids ? 'is-link' : ''}>{r.map((c, i) => <td key={i} className={typeof c === 'number' ? 'fin-num' : ''}>{typeof c === 'number' && isMoney(i) ? money(c) : c}</td>)}</tr>)}</tbody>
              {totals && <tfoot><tr>{totals.map((t, i) => <td key={i} className={i ? 'fin-num' : ''}>{typeof t === 'number' ? (isMoney(i) ? money(t) : t) : t}</td>)}</tr></tfoot>}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
