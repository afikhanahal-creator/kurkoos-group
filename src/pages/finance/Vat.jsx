import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, date, dateTime, money, monthLabel, nameOf, toCsv } from './format.js'
import { CLASS, RULES, auditVat } from './vatRules.js'
import { saveBlob } from './zip.js'
import { Empty, Icon, PageHead, Pill } from './ui.jsx'
import Select from './Select.jsx'

/* The VAT centre. Every figure here is the answer of the one VAT service (vatRules.js) for the documents now in the
   system, so it is always current; the nightly agent keeps the record of what changed. "Confirmed" is VAT on a tax
   invoice a person approved with nothing open; everything else that may be offset is "waiting", never shown as money
   in hand. */
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const NEED_ORDER = ['total', 'vat', 'sum', 'rate', 'credit_original', 'allocation', 'six_months', 'tax_invoice', 'company', 'category', 'supplier_id', 'foreign']

export default function Vat() {
  const { documents, categories, businesses, settings, can, go, reload } = useFinance()
  const [biz, setBiz] = useState('')
  const [per, setPer] = useState('')
  const [cls, setCls] = useState('')
  const [limit, setLimit] = useState(40)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const audit = useMemo(() => auditVat(documents, { categories }), [documents, categories])
  const periods = useMemo(() => [...new Set(audit.rows.map((x) => x.a.period).filter((p) => /^\d{4}-\d{2}$/.test(p)))].sort().reverse(), [audit])
  const scope = useMemo(() => audit.rows.filter((x) => x.a.cls !== 'duplicate' && (!biz || (biz === 'none' ? !x.doc.business_id : x.doc.business_id === biz)) && (!per || x.a.period === per)), [audit, biz, per])
  const sum = (f) => Math.round(scope.reduce((s, x) => s + (f(x) || 0), 0) * 100) / 100
  const t = {
    found: sum((x) => (x.a.vat === null || x.a.paysInvoice || x.doc._proofFor ? 0 : (x.doc.doc_type === 'credit' ? -1 : 1) * x.a.vat)),
    eligible: sum((x) => x.a.eligible), potential: sum((x) => x.a.potential), blocked: sum((x) => (x.a.confirmed || x.a.cls === 'none' ? x.a.blocked : 0)),
    credit: sum((x) => (x.a.cls === 'credit' ? x.a.eligible + x.a.potential : 0)), need: scope.filter((x) => x.a.needs.length).length,
  }
  // the queue: what a person has to look at, the most money first
  const queue = useMemo(() => scope.filter((x) => x.a.needs.length).sort((a, b) => Math.abs(b.a.potential) - Math.abs(a.a.potential) || NEED_ORDER.indexOf(a.a.needs[0].code) - NEED_ORDER.indexOf(b.a.needs[0].code)), [scope])
  const listed = scope.filter((x) => !cls || x.a.cls === cls).sort((a, b) => String(b.a.day).localeCompare(String(a.a.day)))
  // by company and month
  const grid = useMemo(() => {
    const m = new Map()
    for (const x of scope) { const k = `${x.doc.business_id || ''}|${x.a.period}`; const r = m.get(k) || { biz: x.doc.business_id || '', period: x.a.period, docs: 0, eligible: 0, potential: 0, blocked: 0, need: 0 }; r.docs++; r.eligible += x.a.eligible; r.potential += x.a.potential; r.blocked += x.a.confirmed || x.a.cls === 'none' ? x.a.blocked : 0; if (x.a.needs.length) r.need++; m.set(k, r) }
    return [...m.values()].filter((r) => r.eligible || r.potential || r.blocked || r.need).sort((a, b) => String(b.period).localeCompare(String(a.period)) || nameOf(businesses, a.biz).localeCompare(nameOf(businesses, b.biz), 'he'))
  }, [scope, businesses])
  const last = settings?.vat_audit_last

  const run = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.callServer('vat-audit', {}, { timeout: 90000 })
      if (!r.ok) throw new Error(r.error || 'הביקורת נכשלה')
      setMsg(['ok', r.first ? `ביקורת מלאה ראשונה: ${n(r.audited)} מסמכים נבדקו ונרשמו.` : `${n(r.audited)} מסמכים נבדקו. ${r.changed ? `${n(r.changed)} השתנו מאז הביקורת הקודמת (${n(r.new_documents)} חדשים), ונרשמו ביומן.` : 'שום דבר לא השתנה מאז הביקורת הקודמת.'}`])
      await reload()
    } catch (e) { setMsg(['bad', e.message]) } finally { setBusy(false) }
  }
  const exportCsv = () => {
    const head = ['חברה', 'חודש חשבונאי', 'תאריך', 'ספק', 'ח.פ ספק', 'סוג', 'מספר', 'לפני מע״מ', 'מע״מ', 'סכום כולל', 'סיווג', 'אחוז קיזוז', 'מע״מ מאושר לקיזוז', 'מע״מ ממתין לאישור', 'מע״מ שאינו מקוזז', 'מה חסר', 'הסבר', 'מזהה מסמך']
    const body = scope.map(({ doc, a }) => [nameOf(businesses, doc.business_id) || 'לא משויך', a.period, a.day, doc.supplier_name || '', doc.supplier_vat_id || '', DOC_TYPE[doc.doc_type] || doc.doc_type || '', doc.doc_number || '', a.net ?? '', a.vat ?? '', a.total ?? '', CLASS[a.cls][1], a.pct, a.eligible, a.potential, a.confirmed || a.cls === 'none' ? a.blocked : 0, a.needs.map((x) => x.text).join(' | '), a.explain, doc.id])
    saveBlob(new Blob([toCsv(head, body)], { type: 'text/csv;charset=utf-8' }), `דוח מע״מ${per ? ` ${per}` : ''}${biz && biz !== 'none' ? ` ${nameOf(businesses, biz)}` : ''}.csv`)
  }

  return (
    <div className="fin-stack fin-vat">
      <PageHead title="מרכז המע״מ" sub="כל מסמך נבדק: האם יש בו מע״מ, כמה ממנו מקוזז, ומה חסר כדי לאשר. הסכומים מחושבים מהמסמכים עצמם.">
        <button type="button" className="fin-btn" onClick={exportCsv}><Icon name="download" size={17} /> דוח לרו״ח (CSV)</button>
        {can('operate') && <button type="button" className="fin-btn fin-btn--primary" disabled={busy} onClick={run}><Icon name={busy ? 'sync' : 'shield'} size={17} /> {busy ? 'בודק…' : 'ביקורת עכשיו'}</button>}
      </PageHead>
      {msg && <p className={msg[0] === 'ok' ? 'fin-note' : 'fin-error fin-error--block'} role={msg[0] === 'ok' ? 'status' : 'alert'}>{msg[1]}</p>}
      <p className="fin-vat__last">{last ? (last.ok ? <>הביקורת האחרונה של הסוכן: <b>{dateTime(last.finished || last.at)}</b> · {n(last.audited)} מסמכים · {last.changed ? `${n(last.changed)} שינויים` : 'בלי שינויים'}</> : <span className="fin-cell-err">הביקורת האחרונה ({dateTime(last.at)}) נכשלה: {last.error}</span>) : 'הסוכן הלילי עוד לא רץ. "ביקורת עכשיו" מריצה אותו ורושמת את המצב הנוכחי.'}</p>

      <div className="fin-filters">
        <Select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}<option value="none">לא משויך לחברה</option></Select>
        <Select className="fin-select" value={per} onChange={(e) => setPer(e.target.value)} aria-label="חודש חשבונאי"><option value="">כל החודשים</option>{periods.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}</Select>
      </div>

      <dl className="fin-vat__figs">
        <div className="is-main"><dt>מע״מ מאושר לקיזוז</dt><dd>{money(t.eligible)}</dd><small>חשבוניות מס שאושרו, בלי שום דבר פתוח</small></div>
        <div className={t.potential ? 'is-wait' : ''}><dt>ממתין לאישור</dt><dd>{money(t.potential)}</dd><small>יתווסף לקיזוז אחרי טיפול ב-{n(t.need)} מסמכים</small></div>
        <div><dt>מע״מ שזוהה במסמכים</dt><dd>{money(t.found)}</dd><small>כל רכישה פעם אחת</small></div>
        <div><dt>לא מקוזז</dt><dd>{money(t.blocked)}</dd><small>לפי סוג ההוצאה</small></div>
        <div><dt>זיכויים</dt><dd>{money(t.credit)}</dd><small>מקטינים את הקיזוז</small></div>
        <div><dt>מסמכים שנבדקו</dt><dd>{n(scope.length)}</dd><small>{n(scope.filter((x) => ['invoice', 'invoice_receipt'].includes(x.doc.doc_type)).length)} חשבוניות מס · {n(scope.filter((x) => x.doc.doc_type === 'credit').length)} זיכויים</small></div>
      </dl>

      <section className="fin-panel-block" aria-label="מסמכים שמחכים לטיפול">
        <header className="fin-vat__head"><h3>מחכים לטיפול ({n(queue.length)})</h3><small>מסודר לפי הסכום שעל הכף</small></header>
        {!queue.length ? <Empty title="אין מסמכים פתוחים" icon="check">כל המסמכים בתחום שנבחר סווגו בלי שאלות פתוחות.</Empty> : (
          <ul className="fin-vat__queue">
            {queue.slice(0, limit).map(({ doc, a }) => (
              <li key={doc.id}>
                <button type="button" className="fin-vat__item" onClick={() => go(`/documents/${doc.id}`)}>
                  <span className="fin-vat__who"><strong dir="auto">{doc.supplier_name || doc.file_name || 'מסמך'}</strong><small>{[DOC_TYPE[doc.doc_type], doc.doc_number && `מס׳ ${doc.doc_number}`, a.day && date(a.day), nameOf(businesses, doc.business_id) || 'לא משויך'].filter(Boolean).join(' · ')}</small></span>
                  <span className="fin-vat__sum"><b>{a.potential ? money(a.potential) : a.total !== null ? money(a.total) : '—'}</b><small>{a.potential ? (a.estimate?.assumed ? 'מע״מ משוער' : 'מע״מ ממתין') : 'סכום המסמך'}</small></span>
                  <span className="fin-vat__needs">{a.needs.map((x) => <span key={x.code}><Icon name="alert" size={14} /> {x.text}</span>)}</span>
                  <Pill tone={CLASS[a.cls][0]}>{CLASS[a.cls][1]}</Pill>
                </button>
              </li>
            ))}
          </ul>
        )}
        {queue.length > limit && <p className="fin-vat__more"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 40)}>הצגת עוד {n(Math.min(40, queue.length - limit))}</button></p>}
      </section>

      {grid.length > 0 && (
        <section className="fin-panel-block" aria-label="לפי חברה וחודש">
          <header className="fin-vat__head"><h3>לפי חברה וחודש</h3></header>
          <div className="fin-table-wrap fin-table-wrap--flat">
            <table className="fin-table fin-vat__grid">
              <thead><tr><th>חודש</th><th>חברה</th><th className="fin-num">מסמכים</th><th className="fin-num">מאושר לקיזוז</th><th className="fin-num">ממתין</th><th className="fin-num">לא מקוזז</th><th className="fin-num">לטיפול</th></tr></thead>
              <tbody>{grid.map((r) => (
                <tr key={`${r.biz}|${r.period}`} className="is-link" onClick={() => { setBiz(r.biz || 'none'); setPer(r.period) }}>
                  <td data-label="חודש">{/^\d{4}-\d{2}$/.test(r.period) ? monthLabel(r.period) : '—'}</td><td data-label="חברה">{nameOf(businesses, r.biz) || 'לא משויך'}</td>
                  <td className="fin-num" data-label="מסמכים">{n(r.docs)}</td><td className="fin-num" data-label="מאושר לקיזוז"><b>{money(r.eligible)}</b></td><td className="fin-num" data-label="ממתין">{money(r.potential)}</td><td className="fin-num" data-label="לא מקוזז">{money(r.blocked)}</td><td className="fin-num" data-label="לטיפול">{r.need ? <span className="fin-cell-err">{n(r.need)}</span> : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="fin-panel-block" aria-label="כל המסמכים">
        <header className="fin-vat__head"><h3>כל המסמכים ({n(listed.length)})</h3></header>
        <p className="fin-vat__chips">
          <button type="button" className={`fin-vat__chip ${!cls ? 'is-on' : ''}`} aria-pressed={!cls} onClick={() => setCls('')}>הכול</button>
          {Object.entries(CLASS).filter(([k]) => scope.some((x) => x.a.cls === k)).map(([k, [, label]]) => <button key={k} type="button" className={`fin-vat__chip ${cls === k ? 'is-on' : ''}`} aria-pressed={cls === k} onClick={() => setCls(cls === k ? '' : k)}>{label} ({n(scope.filter((x) => x.a.cls === k).length)})</button>)}
        </p>
        <ul className="fin-vat__all">
          {listed.slice(0, limit).map(({ doc, a }) => (
            <li key={doc.id}>
              <button type="button" className="fin-vat__row" onClick={() => go(`/documents/${doc.id}`)}>
                <span className="fin-vat__who"><strong dir="auto">{doc.supplier_name || doc.file_name || 'מסמך'}</strong><small>{[DOC_TYPE[doc.doc_type], a.day && date(a.day), nameOf(businesses, doc.business_id) || 'לא משויך'].filter(Boolean).join(' · ')}</small></span>
                <span className="fin-vat__nums"><span><i>סכום</i>{a.total !== null ? money(a.total) : '—'}</span><span><i>מע״מ</i>{a.vat !== null ? money(a.vat) : '—'}</span><span><i>לקיזוז</i><b>{money(a.eligible + a.potential)}</b></span></span>
                <Pill tone={CLASS[a.cls][0]}>{CLASS[a.cls][1]}</Pill>
                <span className="fin-vat__why">{a.explain}</span>
              </button>
            </li>
          ))}
        </ul>
        {listed.length > limit && <p className="fin-vat__more"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 40)}>הצגת עוד {n(Math.min(40, listed.length - limit))}</button></p>}
      </section>

      <section className="fin-panel-block" aria-label="הכללים">
        <header className="fin-vat__head"><h3>הכללים שלפיהם המערכת מסווגת</h3><button type="button" className="fin-btn fin-btn--sm" aria-expanded={showRules} onClick={() => setShowRules((v) => !v)}>{showRules ? 'הסתרה' : 'הצגה'}</button></header>
        <p className="fin-callout">הכללים כאן הם הקריאה של המערכת את החוק ואת ההנחיות שקיבלה. הם לא אושרו עדיין על ידי רו״ח, ולכן שום קיזוז לא מדווח מכאן לבד: הדוח מיועד לבדיקה ולאישור של רו״ח.</p>
        {showRules && <dl className="fin-vat__rules">{Object.entries(RULES).map(([k, r]) => <div key={k}><dt>{r.title} <Pill tone={r.confirmed ? 'ok' : 'warn'}>{r.confirmed ? 'אושר על ידי רו״ח' : 'ממתין לאישור רו״ח'}</Pill></dt><dd>{r.text}<small>מקור: {r.source}</small></dd></div>)}</dl>}
      </section>
    </div>
  )
}

/* inside a document: what the VAT service says about it, in two lines */
export function VatNote({ doc }) {
  const { documents, categories } = useFinance()
  const a = useMemo(() => auditVat(documents, { categories }).rows.find((x) => x.doc.id === doc.id)?.a, [documents, categories, doc.id])
  if (!a || a.cls === 'duplicate') return null
  return (
    <aside className={`fin-vatnote is-${CLASS[a.cls][0]}`} aria-label="מע״מ">
      <p className="fin-vatnote__top"><Icon name="shield" size={16} /> <strong>מע״מ:</strong> <Pill tone={CLASS[a.cls][0]}>{CLASS[a.cls][1]}</Pill>
        {(a.eligible !== 0 || a.potential !== 0) && <b>{a.confirmed ? `מאושר לקיזוז ${money(a.eligible)}` : `ממתין לאישור ${money(a.potential)}${a.estimate?.assumed ? ' (הערכה)' : ''}`}</b>}
        {a.blocked !== 0 && (a.confirmed || a.cls === 'none') && <span>לא מקוזז {money(a.blocked)}</span>}</p>
      <p className="fin-vatnote__why">{a.explain}</p>
      {a.needs.length > 0 && <ul className="fin-vatnote__needs">{a.needs.map((x) => <li key={x.code}>{x.text}</li>)}</ul>}
    </aside>
  )
}
