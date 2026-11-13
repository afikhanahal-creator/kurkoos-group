import { useEffect, useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, date, money } from './format.js'
import { useCompliance } from './Compliance.jsx'
import { STATUS } from './compliance.js'
import { STATUS_TAG, TYPE_TAG, accountantCsv, accountantHtml, accountantWorkbook, reportLine, reportName, reportSummary } from './accountantReport.js'
import { XLSX_MIME } from './xlsx.js'
import { saveBlob } from './zip.js'
import { printHtml } from './print.js'
import { moments } from './moments.js'
import DateField from './DateField.jsx'
import Select from './Select.jsx'
import { Empty, Icon, PageHead } from './ui.jsx'

/* The report for the accountant: a person chooses which documents go in (one by one, or everything a filter shows),
   sees what the report will say before making it, and gets a styled right-to-left Excel workbook, a CSV, or a page to
   print as PDF. The figures are the compliance check's answer for the chosen documents; nothing here changes a
   document. Which documents are ticked is kept only while the screen is open. */
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const NOT_SENT = (d) => d.status !== 'sent' && !d.sent_at && !d.exported_at
const STATUS_LABEL = { ...Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[1]])), partial: 'קיזוז חלקי' }
const months = Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), new Date(2026, i, 1).toLocaleDateString('he-IL', { month: 'long' })])

export default function AccountantReport() {
  const { businesses, can, go } = useFinance()
  const audit = useCompliance()
  const [copies, setCopies] = useState({})
  useEffect(() => { let on = true; api.loadCloudCopies().then((c) => { if (on) setCopies(c || {}) }).catch(() => {}); return () => { on = false } }, [])
  const links = useMemo(() => Object.fromEntries(Object.entries(copies).filter(([, c]) => c?.web_link).map(([id, c]) => [id, c.web_link])), [copies])
  // every document that can be in a report, as a report line (the check is over all documents, so links between an
  // invoice, its receipt and its credit note hold whatever is ticked)
  const all = useMemo(() => audit.rows.filter((x) => !['excluded', 'reading'].includes(x.c.status)).map((x) => reportLine(x.doc, x.c, { businesses, links, origin: typeof location !== 'undefined' ? location.origin : '' }))
    .sort((a, b) => String(b.date || b.period).localeCompare(String(a.date || a.period)) || a.supplier.localeCompare(b.supplier, 'he')), [audit, businesses, links])

  const [f, setF] = useState({ q: '', supplier: '', company: '', year: '', month: '', from: '', to: '', type: '', category: '', status: '', unsent: false })
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const opts = useMemo(() => ({
    suppliers: [...new Set(all.map((l) => l.supplier))].sort((a, b) => a.localeCompare(b, 'he')),
    years: [...new Set(all.map((l) => (l.date || l.period).slice(0, 4)).filter((y) => /^\d{4}$/.test(y)))].sort().reverse(),
    types: [...new Set(all.map((l) => l.typeKey))], categories: [...new Set(all.map((l) => l.category))].sort((a, b) => a.localeCompare(b, 'he')), statuses: [...new Set(all.map((l) => l.statusKey))],
  }), [all])
  const shown = useMemo(() => all.filter((l) => {
    const day = l.date || `${l.period}-01`
    return (!f.q || `${l.supplier} ${l.number} ${l.description}`.toLowerCase().includes(f.q.trim().toLowerCase())) && (!f.supplier || l.supplier === f.supplier) && (!f.company || (f.company === 'none' ? !l.doc.business_id : l.doc.business_id === f.company))
      && (!f.year || day.slice(0, 4) === f.year) && (!f.month || day.slice(5, 7) === f.month) && (!f.from || (l.date && l.date >= f.from)) && (!f.to || (l.date && l.date <= f.to))
      && (!f.type || l.typeKey === f.type) && (!f.category || l.category === f.category) && (!f.status || l.statusKey === f.status) && (!f.unsent || NOT_SENT(l.doc))
  }), [all, f])

  // what was ticked on the documents screen arrives as ids (ids only: no figure is kept in the browser's storage)
  const [sel, setSel] = useState(() => { try { const v = JSON.parse(sessionStorage.getItem('fin-report-ids') || '[]'); return new Set(Array.isArray(v) ? v : []) } catch { return new Set() } })
  // read once, then forgotten (after the first paint, so a development double render still finds it)
  useEffect(() => { try { sessionStorage.removeItem('fin-report-ids') } catch { /* nothing to forget */ } }, [])
  useEffect(() => { if (!all.length) return; setSel((s) => { const have = new Set(all.map((l) => l.id)); const keep = new Set([...s].filter((id) => have.has(id))); return keep.size === s.size ? s : keep }) }, [all])
  const toggle = (id) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x })
  const allShown = shown.length > 0 && shown.every((l) => sel.has(l.id))
  const pickShown = () => setSel((s) => { const x = new Set(s); for (const l of shown) { if (allShown) x.delete(l.id); else x.add(l.id) } return x })
  const picked = useMemo(() => all.filter((l) => sel.has(l.id)), [all, sel])
  const sum = useMemo(() => reportSummary(picked), [picked])
  const company = f.company && f.company !== 'none' ? businesses.find((b) => b.id === f.company)?.name || '' : ''
  const name = reportName(picked, { company })
  const [limit, setLimit] = useState(60)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [more, setMore] = useState(false)   // on a phone the figures are folded, so the bar leaves room for the list

  const make = async (format) => {
    if (!picked.length) return
    setBusy(format); setMsg(null)
    try {
      const file = name.title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim()
      if (format === 'excel') saveBlob(new Blob([accountantWorkbook(picked, { company })], { type: XLSX_MIME }), `${file}.xlsx`)
      else if (format === 'csv') saveBlob(new Blob([accountantCsv(picked)], { type: 'text/csv;charset=utf-8' }), `${file}.csv`)
      else printHtml(accountantHtml(picked, { company }))
      api.logAction(format === 'csv' ? 'exported_csv' : format === 'excel' ? 'exported_excel' : 'printed', { count: picked.length, ids: picked.slice(0, 200).map((l) => l.id), title: name.title, report: 'accountant' })
      if (format !== 'pdf') moments.save?.({ title: format === 'excel' ? 'הדוח לרואה החשבון מוכן' : 'קובץ ה-CSV מוכן', sub: `${n(picked.length)} מסמכים · ${file}` })
      setMsg(['ok', format === 'pdf' ? 'נפתח חלון ההדפסה: בוחרים "שמירה כ-PDF" כדי לקבל קובץ.' : `הקובץ "${file}" ירד למחשב, עם ${n(picked.length)} מסמכים.`])
    } catch (e) { setMsg(['bad', e.message || 'הפקת הדוח נכשלה']) } finally { setBusy('') }
  }
  const active = Object.entries(f).filter(([, v]) => v !== '' && v !== false).length

  return (
    <div className="fin-stack fin-rep">
      <PageHead title="דוח לרואה החשבון" sub="בוחרים אילו מסמכים ייכנסו, רואים את הסיכום, ומפיקים קובץ Excel מעוצב בעברית, מימין לשמאל, עם קישור לכל מסמך.">
        {can('operate') && <button type="button" className="fin-btn" onClick={() => go('/compliance')}><Icon name="shield" size={17} /> ציות ומס</button>}
      </PageHead>
      {msg && <p className={msg[0] === 'ok' ? 'fin-note' : 'fin-error fin-error--block'} role={msg[0] === 'ok' ? 'status' : 'alert'}>{msg[1]}</p>}

      <section className="fin-panel-block fin-rep__filters" aria-label="סינון">
        <label className="fin-rep__search"><Icon name="search" size={16} /><input type="search" value={f.q} onChange={set('q')} placeholder="חיפוש ספק, מספר מסמך או תיאור" aria-label="חיפוש" /></label>
        <Select className="fin-select" value={f.supplier} onChange={set('supplier')} aria-label="ספק"><option value="">כל הספקים</option>{opts.suppliers.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <Select className="fin-select" value={f.company} onChange={set('company')} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}<option value="none">לא משויך לחברה</option></Select>
        <Select className="fin-select" value={f.year} onChange={set('year')} aria-label="שנה"><option value="">כל השנים</option>{opts.years.map((y) => <option key={y} value={y}>{y}</option>)}</Select>
        <Select className="fin-select" value={f.month} onChange={set('month')} aria-label="חודש"><option value="">כל החודשים</option>{months.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>
        <span className="fin-rep__range"><DateField value={f.from} onChange={set('from')} placeholder="מתאריך" aria-label="מתאריך" max={f.to || undefined} /><DateField value={f.to} onChange={set('to')} placeholder="עד תאריך" aria-label="עד תאריך" min={f.from || undefined} /></span>
        <Select className="fin-select" value={f.type} onChange={set('type')} aria-label="סוג מסמך"><option value="">כל סוגי המסמכים</option>{opts.types.map((t) => <option key={t} value={t}>{DOC_TYPE[t] || 'לא ידוע'}</option>)}</Select>
        <Select className="fin-select" value={f.category} onChange={set('category')} aria-label="קטגוריית הוצאה"><option value="">כל הקטגוריות</option>{opts.categories.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        <Select className="fin-select" value={f.status} onChange={set('status')} aria-label="סטטוס חשבונאי"><option value="">כל הסטטוסים</option>{opts.statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
        <label className="fin-rep__check"><input type="checkbox" checked={f.unsent} onChange={set('unsent')} /> <span>רק מה שטרם הועבר לרואה החשבון</span></label>
        {active > 0 && <button type="button" className="fin-link" onClick={() => setF({ q: '', supplier: '', company: '', year: '', month: '', from: '', to: '', type: '', category: '', status: '', unsent: false })}>ניקוי הסינון</button>}
      </section>

      <section className="fin-panel-block" aria-label="מסמכים לבחירה">
        <header className="fin-vat__head fin-rep__listhead">
          <h3>{n(shown.length)} מסמכים בסינון</h3>
          <span className="fin-rep__pick">
            <button type="button" className="fin-btn fin-btn--sm" onClick={pickShown} disabled={!shown.length}>{allShown ? 'הסרת כל המוצגים מהבחירה' : `בחירת כל ה-${n(shown.length)} המוצגים`}</button>
            {sel.size > 0 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setSel(new Set())}>ניקוי הבחירה</button>}
          </span>
        </header>
        {!shown.length ? <Empty title="אין מסמכים שמתאימים לסינון" icon="docs">משנים או מנקים את הסינון כדי לראות מסמכים.</Empty> : (
          <ul className="fin-rep__list">
            {shown.slice(0, limit).map((l) => (
              <li key={l.id} className={sel.has(l.id) ? 'is-on' : ''}>
                <label className="fin-rep__row">
                  <input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} aria-label={`בחירת ${l.supplier}${l.number ? ` מספר ${l.number}` : ''}`} />
                  <span className="fin-rep__who"><strong><bdi>{l.supplier}</bdi></strong><small>{[l.number && `מס׳ ${l.number}`, l.date ? date(l.date) : 'בלי תאריך', l.category, l.company].filter(Boolean).join(' · ')}</small></span>
                  <span className={`fin-rep__tag is-${TYPE_TAG[l.typeKey] || 'red'}`}>{l.type}</span>
                  <span className="fin-rep__sum"><b>{l.total === null ? '—' : money(l.total, l.cur)}</b>{!l.counted && <small>לא נספר: אישור תשלום</small>}</span>
                  <span className={`fin-rep__tag is-${STATUS_TAG[l.statusKey] || 'grey'}`}>{l.status}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {shown.length > limit && <p className="fin-vat__more"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 60)}>הצגת עוד {n(Math.min(60, shown.length - limit))}</button></p>}
      </section>

      <section className={`fin-rep__bar ${picked.length ? 'is-on' : ''}`} aria-label="הדוח שיופק" aria-live="polite">
        {!picked.length ? <p className="fin-rep__hint"><Icon name="info" size={16} /> מסמנים מסמכים ברשימה, או בוחרים את כל מה שהסינון מציג. הסיכום והכפתורים יופיעו כאן.</p> : <>
          <header><strong>{n(picked.length)} מסמכים נבחרו</strong><b className="fin-rep__total">{money(sum.total)}</b><span>{name.title}</span>
            <button type="button" className="fin-link fin-rep__more" aria-expanded={more} onClick={() => setMore((v) => !v)}>{more ? 'הסתרת הסיכום' : 'הצגת הסיכום'}</button></header>
          <dl className={`fin-rep__figs ${more ? 'is-open' : ''}`}>
            <div><dt>סכום כולל</dt><dd>{money(sum.total)}</dd></div>
            <div><dt>סך המע״מ</dt><dd>{money(sum.vat)}</dd></div>
            <div><dt>מע״מ מותר לניכוי</dt><dd>{money(sum.vatAllowed)}</dd></div>
            <div><dt>הוצאות מוכרות</dt><dd>{money(sum.recognised)}</dd></div>
            <div className={sum.review ? 'is-wait' : ''}><dt>ממתינים לבדיקה</dt><dd>{n(sum.review)}</dd></div>
          </dl>
          {(sum.foreign > 0 || sum.notCounted > 0) && <p className={`fin-rep__small ${more ? 'is-open' : ''}`}>{[sum.notCounted ? `${n(sum.notCounted)} אישורי תשלום של חשבונית שבמערכת מופיעים בדוח ואינם נספרים בסכומים` : '', sum.foreign ? `${n(sum.foreign)} מסמכים במטבע זר מוצגים במטבע שלהם ואינם בסכומים בשקלים` : ''].filter(Boolean).join(' · ')}.</p>}
          <div className="fin-rep__actions">
            <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy} onClick={() => make('excel')}><Icon name="table" size={18} /> {busy === 'excel' ? 'מכין…' : <>הפקת דוח<span className="fin-rep__fmt"> לרואה החשבון (Excel)</span><span className="fin-rep__short"> Excel</span></>}</button>
            <button type="button" className="fin-btn" disabled={!!busy} onClick={() => make('pdf')}><Icon name="file" size={17} /> PDF<span className="fin-rep__fmt"> להדפסה</span></button>
            <button type="button" className="fin-btn" disabled={!!busy} onClick={() => make('csv')}><Icon name="download" size={17} /> CSV</button>
          </div>
        </>}
      </section>
    </div>
  )
}
