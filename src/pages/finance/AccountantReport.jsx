import { useEffect, useMemo, useState } from 'react'
import { DocPic } from './Peek.jsx'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, date, dateTime, money } from './format.js'
import { useCompliance } from './Compliance.jsx'
import { STATUS } from './compliance.js'
import { STATUS_TAG, TYPE_TAG, accountantCsv, accountantHtml, accountantWorkbook, reportLine, reportName, reportSummary } from './accountantReport.js'
import { XLSX_MIME } from './xlsx.js'
import { saveBlob } from './zip.js'
import { printHtml } from './print.js'
import { moments } from './moments.js'
import DateRange, { sayRange } from './DateRange.jsx'
import DocumentPanel from './DocumentPanel.jsx'
import SendToAccountant from './SendToAccountant.jsx'
import Select from './Select.jsx'
import { Empty, Icon, PageHead, Pill, useAsync } from './ui.jsx'

/* The accountant's report and its sending, one screen (it used to be two: "דוח לרואה החשבון" and "שליחה לרו״ח").
   1. the period (a month in one tap, or any range on a large calendar) and the company;
   2. what is ready: only approved documents go in by default; what still waits for a look is counted, can be opened
      and fixed right here (the pencil on each row), or let in on purpose;
   3. the summary of the expenses, by company;
   4. the file: a styled right-to-left Excel (a sheet per company when there are several), PDF to print, CSV, or the
      email to the accountant with the original files.
   The figures are the compliance check's answer for the chosen documents. Which documents are ticked is kept only while
   the screen is open; nothing financial goes to the browser's storage. */
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const NOT_SENT = (d) => d.status !== 'sent' && !d.sent_at && !d.exported_at
const READY = (d) => ['approved', 'sent'].includes(d.status)
const STATUS_LABEL = { ...Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[1]])), partial: 'קיזוז חלקי' }
const pad = (x) => String(x).padStart(2, '0')
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const lastOf = (y, m) => new Date(y, m + 1, 0).getDate()
function periods(now = new Date()) {
  const y = now.getFullYear(); const m = now.getMonth()
  const pm = m === 0 ? 11 : m - 1; const py = m === 0 ? y - 1 : y
  const q = Math.floor(m / 3) * 3
  const pq = q === 0 ? 9 : q - 3; const pqy = q === 0 ? y - 1 : y
  const name = (mm, yy) => new Date(yy, mm, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  return [
    { key: 'last', label: 'החודש שעבר', hint: name(pm, py), from: `${py}-${pad(pm + 1)}-01`, to: `${py}-${pad(pm + 1)}-${lastOf(py, pm)}` },
    { key: 'this', label: 'החודש', hint: name(m, y), from: `${y}-${pad(m + 1)}-01`, to: isoOf(now) },
    { key: 'pq', label: 'הרבעון הקודם', hint: `${name(pq, pqy)} – ${name(pq + 2, pqy)}`, from: `${pqy}-${pad(pq + 1)}-01`, to: `${pqy}-${pad(pq + 3)}-${lastOf(pqy, pq + 2)}` },
    { key: 'year', label: 'השנה', hint: String(y), from: `${y}-01-01`, to: isoOf(now) },
    { key: 'all', label: 'כל התקופות', hint: 'בלי סינון לפי תאריך', from: '', to: '' },
  ]
}

export default function AccountantReport() {
  const { businesses, can, go, patchDoc, reload, documents } = useFinance()
  const audit = useCompliance()
  const [copies, setCopies] = useState({})
  useEffect(() => { let on = true; api.loadCloudCopies().then((c) => { if (on) setCopies(c || {}) }).catch(() => {}); return () => { on = false } }, [])
  const links = useMemo(() => Object.fromEntries(Object.entries(copies).filter(([, c]) => c?.web_link).map(([id, c]) => [id, c.web_link])), [copies])
  // every document that can be in a report, as a report line (the check is over all documents, so links between an
  // invoice, its receipt and its credit note hold whatever is ticked)
  const all = useMemo(() => audit.rows.filter((x) => !['excluded', 'reading'].includes(x.c.status)).map((x) => reportLine(x.doc, x.c, { businesses, links, origin: typeof location !== 'undefined' ? location.origin : '' }))
    .sort((a, b) => String(b.date || b.period).localeCompare(String(a.date || a.period)) || a.supplier.localeCompare(b.supplier, 'he')), [audit, businesses, links])

  // what was ticked on the documents screen arrives as ids (ids only: no figure is kept in the browser's storage)
  const handed = useMemo(() => { try { const v = JSON.parse(sessionStorage.getItem('fin-report-ids') || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }, [])
  useEffect(() => { try { sessionStorage.removeItem('fin-report-ids') } catch { /* nothing to forget */ } }, [])

  const P = useMemo(() => periods(), [])
  // documents handed over from the documents screen are shown whatever their date
  const [period, setPeriod] = useState(handed.length ? { key: 'all', from: '', to: '' } : { key: P[0].key, from: P[0].from, to: P[0].to })
  const [company, setCompany] = useState('')
  const [withWaiting, setWithWaiting] = useState(handed.length > 0)
  const [f, setF] = useState({ q: '', supplier: '', type: '', category: '', status: '', unsent: false })
  const [moreOpen, setMoreOpen] = useState(false)
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))

  const inPeriod = (l) => { const day = l.date || (l.period ? `${l.period}-01` : ''); return (!period.from || (day && day >= period.from)) && (!period.to || (day && day <= period.to)) }
  const periodLines = useMemo(() => all.filter(inPeriod), [all, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const byCompany = useMemo(() => {
    const m = new Map()
    for (const l of periodLines) { const k = l.doc.business_id || 'none'; m.set(k, (m.get(k) || 0) + 1) }
    return m
  }, [periodLines])
  const base = useMemo(() => periodLines.filter((l) => {
    const q = f.q.trim().toLowerCase()
    return (!company || (company === 'none' ? !l.doc.business_id : l.doc.business_id === company))
      && (!q || `${l.supplier} ${l.number} ${l.description} ${l.vatId}`.toLowerCase().includes(q)) && (!f.supplier || l.supplier === f.supplier)
      && (!f.type || l.typeKey === f.type) && (!f.category || l.category === f.category) && (!f.status || l.statusKey === f.status) && (!f.unsent || NOT_SENT(l.doc))
  }), [periodLines, company, f])
  const waiting = useMemo(() => base.filter((l) => !READY(l.doc)), [base])
  const shown = useMemo(() => (withWaiting ? base : base.filter((l) => READY(l.doc))), [base, withWaiting])
  const opts = useMemo(() => ({
    suppliers: [...new Set(periodLines.map((l) => l.supplier))].sort((a, b) => a.localeCompare(b, 'he')),
    types: [...new Set(periodLines.map((l) => l.typeKey))], categories: [...new Set(periodLines.map((l) => l.category))].sort((a, b) => a.localeCompare(b, 'he')), statuses: [...new Set(periodLines.map((l) => l.statusKey))],
  }), [periodLines])

  // the selection: everything shown, until a row is unticked (then only what is ticked); handed-over ids win
  const [sel, setSel] = useState(() => (handed.length ? new Set(handed) : null))
  const isOn = (id) => (sel ? sel.has(id) : true)
  const toggle = (id) => setSel((s) => { const x = new Set(s || shown.map((l) => l.id)); if (x.has(id)) x.delete(id); else x.add(id); return x })
  const allShown = shown.length > 0 && shown.every((l) => isOn(l.id))
  const pickShown = () => setSel(allShown ? new Set() : null)
  // a new period, company or filter starts from "everything shown" again
  const reset = () => { setSel(null); setLimit(60) }
  const picked = useMemo(() => shown.filter((l) => isOn(l.id)), [shown, sel]) // eslint-disable-line react-hooks/exhaustive-deps
  const sum = useMemo(() => reportSummary(picked), [picked])
  const companies = useMemo(() => { const m = new Map(); for (const l of picked) { const g = m.get(l.company) || { name: l.company, docs: 0, total: 0 }; g.docs++; if (l.counted && l.cur === 'ILS') g.total += Number(l.total) || 0; m.set(l.company, g) } return [...m.values()].sort((a, b) => b.total - a.total) }, [picked])
  const companyName = company && company !== 'none' ? businesses.find((b) => b.id === company)?.name || '' : ''
  const name = reportName(picked, { company: companyName })
  const [split, setSplit] = useState(true)        // a sheet per company in the Excel, when there are several
  const [limit, setLimit] = useState(60)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [editing, setEditing] = useState(null)     // the document open for a fix, over this screen
  const [sending, setSending] = useState(null)
  const [done, setDone] = useState(null)
  const history = useAsync(() => (can('operate') ? api.loadDeliveries(8) : Promise.resolve([])), [done])
  const periodText = period.key === 'custom' ? sayRange(period.from, period.to) : P.find((p) => p.key === period.key)?.hint || ''

  const make = async (format) => {
    if (!picked.length) return
    setBusy(format); setMsg(null)
    try {
      const file = name.title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim()
      if (format === 'excel') saveBlob(new Blob([accountantWorkbook(picked, { company: companyName, byCompany: split && companies.length > 1 })], { type: XLSX_MIME }), `${file}.xlsx`)
      else if (format === 'csv') saveBlob(new Blob([accountantCsv(picked)], { type: 'text/csv;charset=utf-8' }), `${file}.csv`)
      else printHtml(accountantHtml(picked, { company: companyName }))
      api.logAction(format === 'csv' ? 'exported_csv' : format === 'excel' ? 'exported_excel' : 'printed', { count: picked.length, ids: picked.slice(0, 200).map((l) => l.id), title: name.title, report: 'accountant' })
      if (format !== 'pdf') moments.save?.({ title: format === 'excel' ? 'הדוח לרואה החשבון מוכן' : 'קובץ ה-CSV מוכן', sub: `${n(picked.length)} מסמכים · ${file}` })
      setMsg(['ok', format === 'pdf' ? 'נפתח חלון ההדפסה: בוחרים "שמירה כ-PDF" כדי לקבל קובץ.' : `הקובץ "${file}" ירד למחשב, עם ${n(picked.length)} מסמכים.`])
    } catch (e) { setMsg(['bad', e.message || 'הפקת הדוח נכשלה']) } finally { setBusy('') }
  }
  const moreActive = ['supplier', 'type', 'category', 'status'].filter((k) => f[k]).length + (f.unsent ? 1 : 0)
  const editDoc = editing ? documents.find((d) => d.id === editing) : null

  return (
    <div className="fin-stack fin-rep">
      <PageHead title="דוח ושליחה לרו״ח" sub="בוחרים תקופה וחברה, בודקים שהכול מאושר, ומפיקים דוח Excel מקצועי או שולחים לרואה החשבון במייל אחד עם הקבצים המקוריים.">
        {can('operate') && <button type="button" className="fin-btn" onClick={() => go('/compliance')}><Icon name="shield" size={17} /> ציות ומס</button>}
      </PageHead>
      {msg && <p className={msg[0] === 'ok' ? 'fin-note' : 'fin-error fin-error--block'} role={msg[0] === 'ok' ? 'status' : 'alert'}>{msg[1]}</p>}
      {done && (
        <section className="fin-sentcard" role="status" aria-label="המייל נשלח">
          <span className="fin-sentcard__icon" aria-hidden="true"><Icon name="check" size={22} /></span>
          <div>
            <strong>נשלח לרואה החשבון</strong>
            <p>{done.sent === 1 ? 'מסמך אחד' : `${done.sent} מסמכים`} נשלחו אל <b dir="ltr">{done.to.join(', ')}</b>, עם הקבצים המקוריים וקובץ הסיכום.{done.marked ? ` ${done.marked === 1 ? 'המסמך סומן' : `${done.marked} מסמכים סומנו`} "נשלח לרו״ח".` : ''}</p>
          </div>
          <div className="fin-sentcard__acts"><button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setDone(null)}>סגירה</button></div>
        </section>
      )}

      {/* 1. the period and the company */}
      <section className="fin-panel-block fin-rep__when" aria-label="תקופה וחברה">
        <div className="fin-rep__step">
          <h3><span className="fin-rep__num" aria-hidden="true">1</span> תקופה</h3>
          <div className="fin-rep__periods" role="radiogroup" aria-label="תקופת הדוח">
            {P.map((p) => (
              <button key={p.key} type="button" role="radio" aria-checked={period.key === p.key} className={`fin-rep__period ${period.key === p.key ? 'is-on' : ''}`} onClick={() => { setPeriod({ key: p.key, from: p.from, to: p.to }); reset() }}>
                <strong>{p.label}</strong><small>{p.hint}</small>
              </button>
            ))}
            <span className={`fin-rep__period fin-rep__period--range ${period.key === 'custom' ? 'is-on' : ''}`}>
              <DateRange from={period.key === 'custom' ? period.from : ''} to={period.key === 'custom' ? period.to : ''} label="טווח תאריכים אחר"
                onChange={(from, to) => { setPeriod(from || to ? { key: 'custom', from, to } : { key: P[0].key, from: P[0].from, to: P[0].to }); reset() }} />
            </span>
          </div>
        </div>
        {businesses.length > 0 && (
          <div className="fin-rep__step">
            <h3><span className="fin-rep__num" aria-hidden="true">2</span> חברה</h3>
            <div className="fin-rep__companies" role="radiogroup" aria-label="חברה">
              <button type="button" role="radio" aria-checked={!company} className={`fin-rep__company ${!company ? 'is-on' : ''}`} onClick={() => { setCompany(''); reset() }}>כל החברות <em>{n(periodLines.length)}</em></button>
              {businesses.filter((b) => byCompany.get(b.id) || company === b.id).map((b) => (
                <button key={b.id} type="button" role="radio" aria-checked={company === b.id} className={`fin-rep__company ${company === b.id ? 'is-on' : ''}`} onClick={() => { setCompany(b.id); reset() }}>{b.name} <em>{n(byCompany.get(b.id) || 0)}</em></button>
              ))}
              {byCompany.get('none') > 0 && <button type="button" role="radio" aria-checked={company === 'none'} className={`fin-rep__company is-none ${company === 'none' ? 'is-on' : ''}`} onClick={() => { setCompany('none'); reset() }}>לא משויך <em>{n(byCompany.get('none'))}</em></button>}
            </div>
          </div>
        )}
        <div className="fin-rep__tools">
          <label className="fin-rep__search"><Icon name="search" size={16} /><input type="search" value={f.q} onChange={(e) => { set('q')(e); reset() }} placeholder="חיפוש ספק, מספר מסמך או תיאור" aria-label="חיפוש" /></label>
          <button type="button" className={`fin-btn ${moreActive ? 'is-on' : ''}`} aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}><Icon name="filter" size={16} /> סינון נוסף{moreActive ? ` (${moreActive})` : ''}</button>
        </div>
        {moreOpen && (
          <div className="fin-rep__filters">
            <Select className="fin-select" value={f.supplier} onChange={(e) => { set('supplier')(e); reset() }} aria-label="ספק"><option value="">כל הספקים</option>{opts.suppliers.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
            <Select className="fin-select" value={f.type} onChange={(e) => { set('type')(e); reset() }} aria-label="סוג מסמך"><option value="">כל סוגי המסמכים</option>{opts.types.map((t) => <option key={t} value={t}>{DOC_TYPE[t] || 'לא ידוע'}</option>)}</Select>
            <Select className="fin-select" value={f.category} onChange={(e) => { set('category')(e); reset() }} aria-label="קטגוריית הוצאה"><option value="">כל הקטגוריות</option>{opts.categories.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            <Select className="fin-select" value={f.status} onChange={(e) => { set('status')(e); reset() }} aria-label="סטטוס חשבונאי"><option value="">כל הסטטוסים</option>{opts.statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
            <label className="fin-rep__check"><input type="checkbox" checked={f.unsent} onChange={(e) => { set('unsent')(e); reset() }} /> <span>רק מה שטרם הועבר לרואה החשבון</span></label>
            {moreActive > 0 && <button type="button" className="fin-link" onClick={() => { setF((v) => ({ ...v, supplier: '', type: '', category: '', status: '', unsent: false })); reset() }}>ניקוי הסינון</button>}
          </div>
        )}
      </section>

      {/* 2. is everything approved? the goal is a report with nothing left to check */}
      {waiting.length > 0 ? (
        <section className={`fin-rep__ready ${withWaiting ? 'is-in' : 'is-wait'}`} role="status" aria-label="מסמכים שעוד לא אושרו">
          <span className="fin-rep__ready-icon" aria-hidden="true"><Icon name="alert" size={20} /></span>
          <div>
            <strong>{waiting.length === 1 ? 'מסמך אחד בתקופה עוד לא אושר' : `${n(waiting.length)} מסמכים בתקופה עוד לא אושרו`}</strong>
            <p>{withWaiting ? 'הם מופיעים ברשימה ונכנסים לדוח. כדאי לבדוק ולאשר אותם קודם, כדי שהדוח יצא בלי מסמכים לבדיקה.' : 'הם לא נכנסים לדוח. בודקים ומאשרים אותם, ואז הם מצטרפים מעצמם.'}</p>
          </div>
          <div className="fin-rep__ready-acts">
            <button type="button" className="fin-btn fin-btn--primary" onClick={() => { if (waiting[0]) setEditing(waiting[0].id) }}><Icon name="edit" size={16} /> לבדיקה ואישור</button>
            <label className="fin-rep__check"><input type="checkbox" checked={withWaiting} onChange={(e) => { setWithWaiting(e.target.checked); reset() }} /> <span>לכלול אותם בכל זאת</span></label>
          </div>
        </section>
      ) : base.length > 0 && (
        <p className="fin-rep__ready is-ok" role="status"><Icon name="check" size={18} /> כל המסמכים בתקופה מאושרים. הדוח מוכן.</p>
      )}

      {/* 3. the summary of what goes in */}
      {picked.length > 0 && (
        <section className="fin-panel-block fin-rep__summary" aria-label="סיכום הוצאות">
          <header className="fin-vat__head"><h3>סיכום הוצאות</h3><span className="fin-muted">{name.title}{periodText ? ` · ${periodText}` : ''}</span></header>
          <dl className="fin-rep__figs is-open">
            <div><dt>מסמכים</dt><dd>{n(picked.length)}</dd></div>
            <div><dt>סכום כולל</dt><dd>{money(sum.total)}</dd></div>
            <div><dt>לפני מע״מ</dt><dd>{money(sum.net)}</dd></div>
            <div><dt>סך המע״מ</dt><dd>{money(sum.vat)}</dd></div>
            <div><dt>מע״מ מותר לניכוי</dt><dd>{money(sum.vatAllowed)}</dd></div>
            <div><dt>הוצאות מוכרות</dt><dd>{money(sum.recognised)}</dd></div>
            <div className={sum.review ? 'is-wait' : ''}><dt>מסמכים לבדיקה</dt><dd>{n(sum.review)}</dd></div>
          </dl>
          {companies.length > 1 && (
            <table className="fin-rep__bycomp">
              <caption className="fin-sr">לפי חברה</caption>
              <thead><tr><th scope="col">חברה</th><th scope="col">מסמכים</th><th scope="col">סכום כולל</th></tr></thead>
              <tbody>{companies.map((c) => <tr key={c.name}><th scope="row">{c.name}</th><td>{n(c.docs)}</td><td>{money(c.total)}</td></tr>)}</tbody>
            </table>
          )}
          {(sum.foreign > 0 || sum.notCounted > 0) && <p className="fin-rep__small is-open">{[sum.notCounted ? `${n(sum.notCounted)} אישורי תשלום של חשבונית שבמערכת מופיעים בדוח ואינם נספרים בסכומים` : '', sum.foreign ? `${n(sum.foreign)} מסמכים במטבע זר מופיעים בדוח ואינם בסכומים בשקלים` : ''].filter(Boolean).join(' · ')}</p>}
        </section>
      )}

      {/* the documents */}
      <section className="fin-panel-block" aria-label="מסמכים לבחירה">
        <header className="fin-vat__head fin-rep__listhead">
          <h3>{n(shown.length)} מסמכים {withWaiting ? 'בתקופה' : 'מאושרים בתקופה'}</h3>
          <span className="fin-rep__pick">
            <button type="button" className="fin-btn fin-btn--sm" onClick={pickShown} disabled={!shown.length}>{allShown ? 'הסרת כולם מהבחירה' : `בחירת כל ה-${n(shown.length)}`}</button>
          </span>
        </header>
        {!shown.length ? (
          <Empty title={waiting.length ? 'אין עדיין מסמכים מאושרים בתקופה' : 'אין מסמכים בתקופה הזו'} icon="docs" action={waiting.length ? <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEditing(waiting[0].id)}>לבדיקת {waiting.length === 1 ? 'המסמך' : `${n(waiting.length)} המסמכים`}</button> : null}>
            {waiting.length ? 'מאשרים את המסמכים שמחכים, או מסמנים "לכלול אותם בכל זאת".' : 'בוחרים תקופה אחרת, חברה אחרת, או מנקים את החיפוש.'}
          </Empty>
        ) : (
          <ul className="fin-rep__list">
            {shown.slice(0, limit).map((l) => (
              <li key={l.id} className={`${isOn(l.id) ? 'is-on' : ''} ${READY(l.doc) ? '' : 'is-waiting'}`}>
                <label className="fin-rep__row">
                  <input type="checkbox" checked={isOn(l.id)} onChange={() => toggle(l.id)} aria-label={`בחירת ${l.supplier}${l.number ? ` מספר ${l.number}` : ''}`} />
                  <span className="fin-rep__who has-pic"><DocPic doc={l.doc} /><span className="fin-who__text"><strong><bdi>{l.supplier}</bdi></strong><small>{[l.number && `מס׳ ${l.number}`, l.date ? date(l.date) : 'בלי תאריך', l.category, l.company].filter(Boolean).join(' · ')}</small></span></span>
                  <span className={`fin-rep__tag is-${TYPE_TAG[l.typeKey] || 'red'}`}>{l.type}</span>
                  <span className="fin-rep__sum"><b>{l.total === null ? '—' : money(l.total, l.cur)}</b>{!l.counted && <small>לא נספר: אישור תשלום</small>}</span>
                  <span className={`fin-rep__tag is-${READY(l.doc) ? STATUS_TAG[l.statusKey] || 'grey' : 'yellow'}`}>{READY(l.doc) ? l.status : 'לא אושר עדיין'}</span>
                </label>
                {can('edit') && <button type="button" className="fin-icon-btn fin-rep__edit" onClick={() => setEditing(l.id)} aria-label={`עריכת ${l.supplier}${l.number ? ` ${l.number}` : ''} לפני הדוח`} title="עריכה לפני הדוח"><Icon name="edit" size={17} /></button>}
              </li>
            ))}
          </ul>
        )}
        {shown.length > limit && <p className="fin-vat__more"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 60)}>הצגת עוד {n(Math.min(60, shown.length - limit))}</button></p>}
      </section>

      {(history.data || []).length > 0 && (
        <section className="fin-panelcard" aria-label="שליחות אחרונות">
          <header><h3>שליחות אחרונות לרואה החשבון</h3><button type="button" className="fin-link" onClick={() => go('/exports')}>היסטוריית ייצוא</button></header>
          <ul className="fin-deliveries">
            {history.data.map((h) => (
              <li key={h.id}>
                <span className="fin-deliveries__main"><strong>{h.documents_count === 1 ? 'מסמך אחד' : `${h.documents_count} מסמכים`}{h.period ? ` · ${h.period}` : ''}</strong><small><bdi dir="ltr">{h.recipients.join(', ')}</bdi> · {dateTime(h.created_at)}</small></span>
                <span className="fin-deliveries__side">{h.total != null && <strong>{money(h.total)}</strong>}<Pill tone={h.status === 'sent' ? 'ok' : 'bad'}>{h.status === 'sent' ? 'נמסר לשרת הדואר' : 'השליחה נכשלה'}</Pill></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. the file or the email */}
      <section className={`fin-rep__bar ${picked.length ? 'is-on' : ''}`} aria-label="הדוח שיופק" aria-live="polite">
        {!picked.length ? <p className="fin-rep__hint"><Icon name="info" size={16} /> מסמנים מסמכים ברשימה, או בוחרים את כל המוצגים. הסיכום והכפתורים יופיעו כאן.</p> : <>
          <header><strong>{n(picked.length)} מסמכים נבחרו</strong><b className="fin-rep__total">{money(sum.total)}</b><span>{name.title}</span>
            {sum.review > 0 && <em className="fin-rep__warn">{n(sum.review)} דורשים בדיקה</em>}</header>
          <div className="fin-rep__actions">
            <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy} onClick={() => make('excel')}><Icon name="table" size={18} /> {busy === 'excel' ? 'מכין…' : <>הפקת דוח<span className="fin-rep__fmt"> לרואה החשבון</span> (Excel)</>}</button>
            {can('operate') && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => { setDone(null); setSending(picked.map((l) => l.doc)) }}><Icon name="send" size={17} /> שליחה במייל<span className="fin-rep__fmt"> לרו״ח</span></button>}
            <button type="button" className="fin-btn" disabled={!!busy} onClick={() => make('pdf')}><Icon name="file" size={17} /> PDF<span className="fin-rep__fmt"> להדפסה</span></button>
            <button type="button" className="fin-btn" disabled={!!busy} onClick={() => make('csv')}><Icon name="download" size={17} /> CSV</button>
            {companies.length > 1 && <label className="fin-rep__check fin-rep__split"><input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} /> <span>גיליון לכל חברה ({n(companies.length)})</span></label>}
          </div>
        </>}
      </section>

      {editDoc && (
        <DocumentPanel
          key={editDoc.id}
          doc={editDoc}
          onClose={() => setEditing(null)}
          onSaved={(d) => patchDoc?.(d)}
          onDeleted={() => { setEditing(null); reload() }}
          onApproved={() => { const next = waiting.find((l) => l.id !== editDoc.id); setEditing(next ? next.id : null) }}
          waitingAfter={waiting.filter((l) => l.id !== editDoc.id).length}
        />
      )}
      {sending && <SendToAccountant docs={sending} period={periodText} markDefault onClose={() => setSending(null)} onSent={(r) => { setSending(null); setDone(r) }} />}
    </div>
  )
}
