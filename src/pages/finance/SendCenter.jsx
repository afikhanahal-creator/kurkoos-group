import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { date, dateTime, docDate, money, monthLabel, nameOf, recentMonths, shiftMonth, signedTotal, thisMonth } from './format.js'
import { exportSheet } from './exportPackage.js'
import { summaryOf } from './expenseReport.js'
import DateRange, { sayRange } from './DateRange.jsx'
import Select from './Select.jsx'
import SendToAccountant from './SendToAccountant.jsx'
import Thumbnail from './Thumbnail.jsx'
import { Empty, Icon, Pill, StatusPill, useAsync } from './ui.jsx'

const SHOW = {
  ready: ['מוכנים לשליחה', (d) => d.status === 'approved' && !d.exported_at],
  withReview: ['כולל ממתינים לבדיקה', (d) => (d.status === 'approved' && !d.exported_at) || d.status === 'review'],
  all: ['כל המסמכים', (d) => !['rejected', 'duplicate', 'archived', 'processing'].includes(d.status)],
}
const dateOf = (d) => String(docDate(d))

/* Accountant delivery: choose documents (by date, company, project, or one by one), check the summary, send.
   Approved documents become "נשלח לרו״ח" only after the mail provider accepted the message. */
export default function SendCenter() {
  const { documents, businesses, projects, go } = useFinance()
  const [show, setShow] = useState('ready')
  const [biz, setBiz] = useState('')
  const [proj, setProj] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [picked, setPicked] = useState(null)        // null = everything in the list
  const [sending, setSending] = useState(null)
  const [done, setDone] = useState(null)
  const [month, setMonth] = useState('')           // the monthly report: '' until a month is chosen
  const [monthPick, setMonthPick] = useState(() => shiftMonth(thisMonth(), -1))
  const history = useAsync(() => api.loadDeliveries(20), [done])

  const list = useMemo(() => documents
    .filter((d) => SHOW[show][1](d) && (!biz || d.business_id === biz) && (!proj || d.project_id === proj)
      && (!range.from || dateOf(d) >= range.from) && (!range.to || dateOf(d) <= range.to))
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b))), [documents, show, biz, proj, range])
  const chosen = list.filter((d) => !picked || picked.has(d.id))
  const total = chosen.reduce((s, d) => s + signedTotal(d), 0)
  const companies = [...new Set(chosen.map((d) => nameOf(businesses, d.business_id) || 'ללא חברה'))]
  const attention = chosen.filter((d) => d.status !== 'approved').length
  const toggle = (id) => setPicked((p) => { const n = new Set(p || list.map((d) => d.id)); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = !picked || picked.size === list.length
  // monthly report: the whole month by the date on the document, approved and waiting, in one preview before sending
  const openMonth = (k) => {
    const [y, m] = k.split('-').map(Number); const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    setMonth(k); setShow('withReview'); setRange({ from: `${k}-01`, to: `${k}-${String(last).padStart(2, '0')}` }); setPicked(null); setDone(null)
  }
  const sum = useMemo(() => summaryOf(chosen), [chosen])
  const byCat = useMemo(() => { const m = new Map(); for (const d of chosen) m.set(d.category || 'ללא קטגוריה', (m.get(d.category || 'ללא קטגוריה') || 0) + signedTotal(d)); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) }, [chosen])

  return (
    <div className="fin-stack fin-send">
      <div className="fin-titlerow"><h2 className="fin-pagehead__title">שליחה לרו״ח</h2></div>
      <p className="fin-muted fin-lead">בחרו מסמכים, בדקו את הסיכום ושלחו לרואה החשבון במייל אחד, עם הקבצים המקוריים וקובץ סיכום לקליטה.</p>
      {done && <p className="fin-note" role="status"><Icon name="check" size={16} /> נשלח ל-{done.to.join(', ')}: {done.sent === 1 ? 'מסמך אחד' : `${done.sent} מסמכים`}{done.marked ? `, ${done.marked} סומנו "נשלח לרו״ח"` : ''}.</p>}

      <section className="fin-monthly" aria-label="דוח חודשי לרו״ח">
        <div className="fin-monthly__head">
          <span className="fin-monthly__icon"><Icon name="calendar" size={20} /></span>
          <span><strong>דוח חודשי לרו״ח</strong><small>כל המסמכים של החודש, קובץ Excel עם סיכום לפי קטגוריה וספק, והקבצים המקוריים, במייל אחד</small></span>
          <Select className="fin-select" value={monthPick} onChange={(e) => setMonthPick(e.target.value)} aria-label="חודש">{recentMonths(18).map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}</Select>
          <button type="button" className="fin-btn fin-btn--primary" onClick={() => openMonth(monthPick)}>הכנת הדוח</button>
        </div>
        {month && (
          <div className="fin-monthly__preview" aria-live="polite">
            <dl>
              <div><dt>חודש</dt><dd>{monthLabel(month)}</dd></div>
              <div><dt>מסמכים</dt><dd>{chosen.length}</dd></div>
              <div><dt>לפני מע״מ</dt><dd>{money(sum.before)}</dd></div>
              <div><dt>מע״מ</dt><dd>{money(sum.vat)}</dd></div>
              <div><dt>סה״כ</dt><dd>{money(sum.total)}</dd></div>
            </dl>
            {byCat.length > 0 && <ul className="fin-monthly__cats">{byCat.map(([c, v]) => <li key={c}><span>{c}</span><strong>{money(v)}</strong></li>)}</ul>}
            {attention > 0 && <p className="fin-note fin-note--warn"><Icon name="alert" size={16} /> {attention === 1 ? 'מסמך אחד בחודש עוד לא אושר' : `${attention} מסמכים בחודש עוד לא אושרו`}. אפשר להסיר אותם מהרשימה למטה, או לשלוח ובמייל יצוין שהם ממתינים.</p>}
            <div className="fin-form__actions">
              <button type="button" className="fin-btn fin-btn--primary" disabled={!chosen.length} onClick={() => { setDone(null); setSending(chosen) }}><Icon name="send" size={17} /> שליחת הדוח</button>
              <button type="button" className="fin-btn" disabled={!chosen.length} onClick={() => exportSheet(chosen, 'excel', { businesses, projects }, {}, `הוצאות ${monthLabel(month)}`)}><Icon name="table" size={17} /> תצוגה מקדימה ב-Excel</button>
              <button type="button" className="fin-link" onClick={() => { setMonth(''); setRange({ from: '', to: '' }); setShow('ready') }}>סגירה</button>
            </div>
          </div>
        )}
      </section>

      <div className="fin-filters fin-send__filters">
        <DateRange from={range.from} to={range.to} label="תאריך המסמך" onChange={(from, to) => { setRange({ from, to }); setPicked(null) }} />
        {businesses.length > 1 && <Select className="fin-select" value={biz} onChange={(e) => { setBiz(e.target.value); setPicked(null) }} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
        {projects.length > 0 && <Select className="fin-select" value={proj} onChange={(e) => { setProj(e.target.value); setPicked(null) }} aria-label="פרויקט"><option value="">כל הפרויקטים</option>{projects.filter((p) => !p.archived_at).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
        <Select className="fin-select" value={show} onChange={(e) => { setShow(e.target.value); setPicked(null) }} aria-label="אילו מסמכים">{Object.entries(SHOW).map(([k, [v]]) => <option key={k} value={k}>{v}</option>)}</Select>
      </div>

      {!list.length ? (
        <Empty title={show === 'ready' ? 'אין מסמכים מוכנים לשליחה' : 'אין מסמכים בבחירה הזו'} icon="send" action={show === 'ready' && <button type="button" className="fin-btn" onClick={() => go('/pending')}>למסמכים שמחכים לבדיקה</button>}>
          {show === 'ready' ? 'מסמך מוכן לשליחה אחרי שבודקים ומאשרים אותו. אפשר גם לשלוח מסמכים שעוד לא אושרו: "כולל ממתינים לבדיקה".' : 'נסו טווח תאריכים אחר או הסירו סינון.'}
        </Empty>
      ) : (
        <section className="fin-pickcard" aria-label="המסמכים לשליחה">
          <header>
            <label className="fin-check"><input type="checkbox" checked={allOn} onChange={(e) => setPicked(e.target.checked ? null : new Set())} /> {list.length === 1 ? 'מסמך אחד' : `כל ${list.length} המסמכים`}</label>
          </header>
          <ul className="fin-picklist">
            {list.map((d) => {
              const on = !picked || picked.has(d.id)
              return (
                <li key={d.id} className={on ? 'is-on' : ''}>
                  <label>
                    <input type="checkbox" checked={on} onChange={() => toggle(d.id)} aria-label={`${d.supplier_name || 'מסמך'} ${d.doc_number || ''}`} />
                    <Thumbnail doc={d} />
                    <span className="fin-picklist__main"><strong>{d.supplier_name || d.file_name}</strong><small>{date(docDate(d))}{d.doc_number ? ` · ${d.doc_number}` : ''}{d.business_id ? ` · ${nameOf(businesses, d.business_id)}` : ''}</small></span>
                    <span className="fin-picklist__side"><strong>{money(d.total_amount, d.currency)}</strong>{d.status !== 'approved' && <StatusPill status={d.status} />}</span>
                  </label>
                  <button type="button" className="fin-icon-btn" onClick={() => go(`/documents/${d.id}`)} aria-label="פתיחת המסמך"><Icon name="next" size={17} /></button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {list.length > 0 && (
        <div className="fin-sendbar" role="region" aria-label="סיכום השליחה">
          <dl>
            <div><dt>מסמכים</dt><dd>{chosen.length}</dd></div>
            <div><dt>סה״כ</dt><dd>{money(total)}</dd></div>
            <div className="fin-sendbar__wide"><dt>חברות</dt><dd>{companies.join(', ') || '—'}</dd></div>
            {(range.from || range.to) && <div className="fin-sendbar__wide"><dt>תקופה</dt><dd>{sayRange(range.from, range.to)}</dd></div>}
            {attention > 0 && <div className="is-attn"><dt>לא אושרו</dt><dd>{attention}</dd></div>}
          </dl>
          <button type="button" className="fin-btn fin-btn--primary fin-sendbar__go" disabled={!chosen.length} onClick={() => { setDone(null); setSending(chosen) }}><Icon name="send" size={18} /> המשך לשליחה</button>
        </div>
      )}

      {(history.data || []).length > 0 && (
        <section className="fin-panelcard" aria-label="שליחות אחרונות">
          <header><h3>שליחות אחרונות</h3><button type="button" className="fin-link" onClick={() => go('/exports')}>היסטוריית ייצוא</button></header>
          <ul className="fin-deliveries">
            {history.data.map((h) => (
              <li key={h.id}>
                <span className="fin-deliveries__main"><strong>{h.documents_count === 1 ? 'מסמך אחד' : `${h.documents_count} מסמכים`}{h.period ? ` · ${h.period}` : ''}</strong><small><bdi dir="ltr">{h.recipients.join(', ')}</bdi> · {dateTime(h.created_at)} · {h.created_by_email}</small>{h.error && <small className="fin-cell-err">{h.error}</small>}</span>
                <span className="fin-deliveries__side">{h.total != null && <strong>{money(h.total)}</strong>}<Pill tone={h.status === 'sent' ? 'ok' : 'bad'}>{h.status === 'sent' ? 'נמסר לשרת הדואר' : 'השליחה נכשלה'}</Pill></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sending && <SendToAccountant docs={sending} period={month ? monthLabel(month) : sayRange(range.from, range.to)} markDefault onClose={() => setSending(null)} onSent={(r) => { setSending(null); setPicked(null); setDone(r); setMonth('') }} />}
    </div>
  )
}
