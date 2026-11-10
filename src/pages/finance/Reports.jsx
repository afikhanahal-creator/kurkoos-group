import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import { openDocs } from './links.js'
import { SOURCE, STATUS, claimableVat, counts, date, docDate, money, monthLabel, nameOf, period, shiftMonth, signedNet, signedTotal, thisMonth, toCsv, recentMonths } from './format.js'
import { saveBlob } from './zip.js'
import { buildXlsx, XLSX_MIME } from './xlsx.js'
import * as api from './api.js'

/* a report table as a real right-to-left workbook: numbers stay numbers, ISO dates become dates */
const reportXlsx = (name, head, rows) => buildXlsx([{ name, columns: head.map((h, i) => { const col = rows.map((r) => r[i]).filter((v) => v !== '' && v !== null && v !== undefined); const isNum = col.length > 0 && col.every((v) => typeof v === 'number'); const isDate = col.length > 0 && col.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v))); return { header: String(h), type: isDate ? 'date' : isNum ? (col.every(Number.isInteger) && !/סה״כ|מע״מ|סכום|לפני/.test(h) ? 'int' : 'money') : 'text', width: Math.min(40, Math.max(10, String(h).length + 4)) } }), rows }], { title: name })
import { Bars, Card, Empty, Icon, PageHead } from './ui.jsx'
import Select from './Select.jsx'
import Overview from './Overview.jsx'
import { reportOf } from './CompanySettings.jsx'

/* All totals come from stored records (validated by people), never from AI. */
const REPORTS = [
  ['monthly', 'הוצאות חודשיות'], ['overview', 'תמונת מצב'], ['company', 'לפי חברה'], ['project', 'לפי פרויקט'], ['supplier', 'לפי ספק'], ['vat', 'סיכום מע״מ'],
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
    let groupLists = null
    const group = (keyFn, labelFn) => {
      const g = {}
      for (const d of booked) { const k = keyFn(d) || '__none'; (g[k] ||= []).push(d) }
      const out = Object.entries(g).map(([k, list]) => ({ row: [labelFn(k), ...sum(list)], list })).sort((a, b) => b.row[4] - a.row[4])
      groupLists = out.map((x) => x.list)
      return out.map((x) => x.row)
    }
    const moneyHead = ['מסמכים', 'לפני מע״מ', 'מע״מ', 'סה״כ']
    switch (kind) {
      case 'monthly': return { head: ['חודש', ...moneyHead], rows: months.map((m) => [monthLabel(m), ...sum(booked.filter((d) => period(d) === m))]), chart: 4, lists: months.map((m) => booked.filter((d) => period(d) === m)), monthKeys: months }
      case 'company': { const rows = group((d) => d.business_id, (k) => nameOf(businesses, k) || 'לא משויך'); return { head: ['חברה', ...moneyHead], rows, chart: 4, lists: groupLists } }
      case 'project': { const rows = group((d) => d.project_id, (k) => nameOf(projects, k) || 'ללא פרויקט'); return { head: ['פרויקט', ...moneyHead], rows, chart: 4, lists: groupLists } }
      case 'supplier': { const rows = group((d) => d.supplier_name, (k) => (k === '__none' ? 'לא ידוע' : k)); return { head: ['ספק', ...moneyHead], rows, chart: 4, lists: groupLists } }
      case 'vat': {
        // the company's VAT period (Settings › חברות ודיווח): a bi-monthly filer sees January–February, March–April…
        const co = businesses.find((b) => b.id === biz)
        const bi = co && reportOf(co).vat_period === 'bimonthly'
        const periods = bi ? [...new Set(months.map((m) => { const [y, mm] = m.split('-').map(Number); return `${y}-${String(mm % 2 === 0 ? mm - 1 : mm).padStart(2, '0')}` }))] : months
        const inPeriod = (d, m) => (bi ? [m, shiftMonth(m, 1)].includes(period(d)) : period(d) === m)
        const label = (m) => (bi ? `${monthLabel(m).split(' ')[0]}–${monthLabel(shiftMonth(m, 1))}` : monthLabel(m))
        return {
        head: [bi ? 'תקופת דיווח (דו-חודשי)' : 'חודש', 'מסמכים', 'מע״מ במסמכים', 'מע״מ לקיזוז', 'לא לקיזוז'],
        note: co ? `${co.name}: דיווח מע״מ ${bi ? 'דו-חודשי' : reportOf(co).vat_period === 'none' ? '— עוסק פטור, אין קיזוז' : 'חודשי'} (לפי הגדרות החברה).` : undefined,
        rows: periods.map((m) => {
          const l = booked.filter((d) => inPeriod(d, m))
          const vat = l.reduce((a, d) => a + (d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(d.vat_amount) || 0), 0)
          const claim = l.reduce((a, d) => a + claimableVat(d, categories), 0)
          return [label(m), l.length, vat, claim, vat - claim]
        }),
        chart: 3,
      } }
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
  // the month reports read newest first, top to bottom (November, October, September…); the CSV/Excel exports stay in
  // calendar order, as accounting software expects
  const byMonth = ['monthly', 'vat', 'collection'].includes(kind)
  const shown = report.rows.map((r, n) => ({ r, n }))
  if (byMonth) shown.reverse()
  // a row (or a month's column) opens its documents as a list, oldest first
  const openRow = (n) => { const list = report.lists?.[n]; if (list?.length) openDocs(go, [...list].sort((a, b) => String(docDate(a)).localeCompare(String(docDate(b)))), `${String(report.rows[n][0])} · ${list.length === 1 ? 'מסמך אחד' : `${list.length} מסמכים`}`) }
  const isMoney = (i) => !report.count && typeof report.rows[0]?.[i] === 'number' && report.head[i] !== 'מסמכים' && report.head[i] !== 'ניסיונות'
  const totals = report.rows.length && report.chart ? report.head.map((_, i) => (i === 0 ? 'סה״כ' : report.rows.reduce((a, r) => a + (typeof r[i] === 'number' ? r[i] : 0), 0))) : null

  return (
    <div className="fin-stack">
      <PageHead title="דוחות" sub={role === 'accountant' ? 'מבוסס על מסמכים מאושרים בלבד' : 'כל הסכומים מחושבים מהרשומות השמורות, לא ע״י AI'}>
        <button type="button" className="fin-btn" onClick={() => saveBlob(new Blob([toCsv(report.head, report.rows)], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)} disabled={!report.rows.length}><Icon name="download" size={18} /> CSV</button>
        <button type="button" className="fin-btn" onClick={() => { saveBlob(new Blob([reportXlsx(name, report.head, report.rows)], { type: XLSX_MIME }), `${name}.xlsx`); api.logAction('exported_excel', { report: kind, rows: report.rows.length }) }} disabled={!report.rows.length}><Icon name="download" size={18} /> Excel</button>
      </PageHead>
      <div className="fin-tabs fin-tabs--scroll" role="tablist" aria-label="סוג דוח">
        {REPORTS.map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={kind === k} className={`fin-tab ${kind === k ? 'is-active' : ''}`} onClick={() => setKind(k)}>{v}</button>)}
      </div>
      {kind === 'overview' ? <Overview /> : <>
      <div className="fin-filters">
        {businesses.length > 1 && <Select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
        <Select className="fin-select" value={to} onChange={(e) => setTo(e.target.value || thisMonth())} aria-label="עד חודש">{recentMonths().map((k) => <option key={k} value={k}>עד {monthLabel(k)}</option>)}</Select>
        <Select className="fin-select" value={span} onChange={(e) => setSpan(Number(e.target.value))} aria-label="טווח"><option value={1}>חודש אחד</option><option value={3}>3 חודשים</option><option value={6}>6 חודשים</option><option value={12}>12 חודשים</option><option value={24}>24 חודשים</option></Select>
      </div>
      {report.note && <p className="fin-muted">{report.note}</p>}
      {!report.rows.length ? <Empty title="אין נתונים לדוח הזה" icon="reports">נסו טווח אחר או חברה אחרת.</Empty> : (
        <div className="fin-grid fin-grid--report">
          {report.monthKeys && (
            <Card title="מסמכים לפי חודש">
              <div className="fin-scroll-x fin-mcount-wrap">
                <div className="fin-mcount" style={{ '--n': report.monthKeys.length }}>
                  {report.monthKeys.map((m, n) => {
                    const c = report.lists[n].length; const max = Math.max(...report.lists.map((l) => l.length), 1)
                    return (
                      <button key={m} type="button" className={`fin-mcount__col ${c ? '' : 'is-zero'}`} disabled={!c} onClick={() => openRow(n)} aria-label={`${monthLabel(m)}: ${c} מסמכים${c ? ', פתיחת הרשימה' : ''}`}>
                        <span className="fin-mcount__n">{c || ''}</span>
                        <span className="fin-mcount__bar" style={{ height: `${c ? Math.max(4, (c / max) * 100) : 0}%` }} />
                        <span className="fin-mcount__m">{new Date(`${m}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'short' })}{m.endsWith('-01') || n === 0 ? ` ${m.slice(2, 4)}` : ''}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="fin-muted fin-small">לחיצה על חודש פותחת את המסמכים שלו, מסודרים לפי תאריך.</p>
            </Card>
          )}
          {report.chart && <Card title="תצוגה"><Bars rows={shown.map(({ r }) => r).filter((r) => r[report.chart]).slice(0, 12).map((r) => ({ name: String(r[0]), value: r[report.chart] }))} format={report.count ? (v) => String(v) : money} /></Card>}
          <div className="fin-table-wrap">
            <table className="fin-table fin-table--plain">
              <thead><tr>{report.head.map((h, i) => <th key={h} className={i && typeof report.rows[0][i] === 'number' ? 'fin-num' : ''}>{h}</th>)}</tr></thead>
              <tbody>{shown.map(({ r, n }) => <tr key={n} onClick={report.ids ? () => go(`/documents/${report.ids[n]}`) : report.lists?.[n]?.length ? () => openRow(n) : undefined} className={[report.ids || report.lists?.[n]?.length ? 'is-link' : '', r.some((c) => typeof c === 'number') && r.every((c) => typeof c !== 'number' || c === 0) ? 'is-zero' : ''].filter(Boolean).join(' ')}>{r.map((c, i) => <td key={i} className={i === 0 ? 'fin-td-main' : typeof c === 'number' ? 'fin-num' : ''} data-label={i ? report.head[i] : undefined}>{typeof c === 'number' && isMoney(i) ? money(c) : c}</td>)}</tr>)}</tbody>
              {totals && <tfoot><tr>{totals.map((t, i) => <td key={i} className={i ? 'fin-num' : 'fin-td-main'} data-label={i ? report.head[i] : undefined}>{typeof t === 'number' ? (isMoney(i) ? money(t) : t) : t}</td>)}</tr></tfoot>}
            </table>
          </div>
        </div>
      )}
      </>}
    </div>
  )
}
