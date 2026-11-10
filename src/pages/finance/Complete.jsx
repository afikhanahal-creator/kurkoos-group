import { useEffect, useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, dateTime } from './format.js'
import DocPreview from './DocPreview.jsx'
import { Empty, Icon, PageHead, askConfirm } from './ui.jsx'

// "השלמת פרטים": the documents a report cannot count properly yet, one at a time, with the file next to the one detail that is
// missing. Each save goes straight to the document (and teaches the assignment for the supplier's next document).
const need = (d) => {
  const m = []
  if (!d.supplier_name) m.push('supplier_name')
  if (!d.doc_type || d.doc_type === 'other') m.push('doc_type')
  if (!d.business_id) m.push('business_id')
  if (!d.issue_date) m.push('issue_date')
  if (d.total_amount == null || d.total_amount === '') m.push('total_amount')
  if (!d.doc_number) m.push('doc_number')
  return m
}
export const incomplete = (documents) => documents.filter((d) => d.status === 'review' && need(d).length)
const LABEL = { supplier_name: 'חסר ספק', doc_type: 'חסר סוג מסמך', business_id: 'חסר שיוך לחברה', project_id: 'פרויקט (לא חובה)', issue_date: 'חסר תאריך המסמך', total_amount: 'חסר סכום כולל', doc_number: 'חסר מספר מסמך' }
const TYPES = ['invoice', 'invoice_receipt', 'receipt', 'credit', 'supplier_bill', 'payment_confirmation', 'proforma', 'quote']

function Step({ n, field, open, done, onOpen, children }) {
  return (
    <li className={`fin-comp__step ${open ? 'is-open' : ''} ${done ? 'is-done' : ''}`}>
      <button type="button" className="fin-comp__stephead" aria-expanded={open} onClick={onOpen}>
        <span className="fin-comp__num">{done ? <Icon name="check" size={14} /> : n}</span>
        <span>{LABEL[field]}</span>
      </button>
      {open && <div className="fin-comp__body">{children}</div>}
    </li>
  )
}

export default function Complete() {
  const { documents, businesses, projects, suppliers, can, go, patchDoc, reload } = useFinance()
  const queue = useMemo(() => incomplete(documents).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), [documents])
  const [at, setAt] = useState(null)             // the document on screen stays until the person moves on, even once it is complete
  const [open, setOpen] = useState(null)
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [doneCount, setDoneCount] = useState(0)
  const doc = documents.find((d) => d.id === at) || null
  useEffect(() => { if (!at && queue.length) setAt(queue[0].id) }, [at, queue])
  const missing = doc ? need(doc) : []
  const steps = doc ? [...missing, ...(!doc.project_id && doc.business_id && projects.some((p) => p.business_id === doc.business_id) ? ['project_id'] : [])] : []
  const current = open && steps.includes(open) ? open : steps[0] || null
  useEffect(() => { setVal(''); setErr('') }, [current, at])
  const idx = queue.findIndex((d) => d.id === at)
  const move = (dir) => {
    if (!queue.length) { setAt(null); return }
    const i = idx < 0 ? 0 : (idx + dir + queue.length) % queue.length
    const next = queue[i]?.id === at ? queue[(i + 1) % queue.length] : queue[i]
    setAt(next && next.id !== at ? next.id : null); setOpen(null)
  }
  if (!can('operate')) return <Empty title="אין הרשאה" icon="shield">השלמת פרטים פתוחה למנהלי כספים.</Empty>

  const save = async (field, value) => {
    if (value === '' || value == null) { setErr('צריך למלא ערך'); return }
    setBusy(true); setErr('')
    try {
      const patch = { [field]: value }
      if (field === 'supplier_name') { const s = suppliers.find((x) => x.name.trim().toLowerCase() === String(value).trim().toLowerCase()); if (s) patch.supplier_id = s.id }
      if (field === 'total_amount') patch.total_amount = Number(value)
      const row = await api.updateDocument(doc.id, patch)
      patchDoc(row); setOpen(null)
      if (!need(row).length) setDoneCount((c) => c + 1)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const notRelevant = async () => {
    if (!(await askConfirm({ title: 'לא רלוונטי', text: 'לסמן את המסמך כלא רלוונטי? הוא ייצא מהדוחות ומהארכיון ב-Drive, ואפשר להחזיר אותו ממסך המסמכים.', ok: 'לא רלוונטי' }))) return
    setBusy(true)
    try { const row = await api.updateDocument(doc.id, { status: 'rejected' }); patchDoc(row); move(1); reload() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const input = (field) => {
    const submit = (e) => { e.preventDefault(); save(field, val) }
    if (field === 'doc_type') return <div className="fin-comp__choices">{TYPES.map((t) => <button key={t} type="button" className="fin-btn fin-btn--sm" disabled={busy} onClick={() => save(field, t)}>{DOC_TYPE[t]}</button>)}</div>
    if (field === 'business_id') return <div className="fin-comp__choices">{businesses.map((b) => <button key={b.id} type="button" className="fin-btn fin-btn--sm" disabled={busy} onClick={() => save(field, b.id)}>{b.name}</button>)}</div>
    if (field === 'project_id') return <div className="fin-comp__choices">{projects.filter((p) => p.business_id === doc.business_id).map((p) => <button key={p.id} type="button" className="fin-btn fin-btn--sm" disabled={busy} onClick={() => save(field, p.id)}>{p.name}</button>)}<button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setOpen(steps.find((s) => s !== 'project_id') || '__none')}>בלי פרויקט</button></div>
    return (
      <form onSubmit={submit} className="fin-comp__form">
        <label className="fin-comp__label" htmlFor={`comp-${field}`}>{({ supplier_name: 'שם הספק', issue_date: 'התאריך שעל המסמך', total_amount: 'הסכום הכולל, כולל מע״מ', doc_number: 'מספר החשבונית או הקבלה' })[field]}</label>
        <input id={`comp-${field}`} autoFocus value={val} onChange={(e) => setVal(e.target.value)} type={field === 'issue_date' ? 'date' : field === 'total_amount' ? 'number' : 'text'} step={field === 'total_amount' ? '0.01' : undefined} inputMode={field === 'total_amount' ? 'decimal' : undefined} list={field === 'supplier_name' ? 'comp-suppliers' : undefined} dir="auto" />
        {field === 'supplier_name' && <datalist id="comp-suppliers">{suppliers.slice(0, 500).map((s) => <option key={s.id} value={s.name} />)}</datalist>}
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || val === ''}>{busy ? 'שומר…' : 'שמירה'}</button>
      </form>
    )
  }

  return (
    <div className="fin-stack">
      <PageHead title="השלמת פרטים" sub="מסמכים שחסר בהם פרט לדוח: ספק, סוג, חברה, תאריך, סכום או מספר. ממלאים מול המסמך, אחד אחד" />
      {!doc ? (
        <Empty title={doneCount ? 'הכול הושלם' : 'אין מסמכים שחסר בהם פרט'} icon="check" action={<button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/pending')}>למסמכים שממתינים לאישור</button>}>
          {doneCount ? `השלמת ${doneCount === 1 ? 'מסמך אחד' : `${doneCount} מסמכים`}. הדוחות כבר מעודכנים.` : 'כל המסמכים שנקראו מלאים. מסמך חדש שיחסר בו פרט יופיע כאן.'}
        </Empty>
      ) : (
        <div className="fin-comp">
          <section className="fin-comp__side" aria-label="הפרטים החסרים">
            <header>
              <strong dir="auto">{doc.supplier_name || 'ספק לא מזוהה'}</strong>
              <small>נקלט {dateTime(doc.created_at)}{doc.email_from ? ` · ${doc.email_from.replace(/<[^>]*>/g, '').trim()}` : ''}</small>
              <small className="fin-comp__count">{idx >= 0 ? `מסמך ${idx + 1} מתוך ${queue.length}` : 'המסמך הושלם'} · {missing.length ? `${missing.length === 1 ? 'חסר פרט אחד' : `חסרים ${missing.length} פרטים`}` : 'כל הפרטים מלאים'}</small>
            </header>
            {steps.length ? (
              <ol className="fin-comp__steps">
                {steps.map((f, i) => <Step key={f} n={i + 1} field={f} open={current === f} onOpen={() => setOpen(f)}>{input(f)}</Step>)}
              </ol>
            ) : <p className="fin-ok" role="status">כל הפרטים מלאים. המסמך נכנס לדוחות.</p>}
            {err && <p className="fin-error" role="alert">{err}</p>}
            <div className="fin-comp__acts">
              <button type="button" className="fin-btn fin-btn--primary" onClick={() => move(1)} disabled={queue.length < 1 || (queue.length === 1 && idx === 0)}>{missing.length ? 'דילוג למסמך הבא' : 'המסמך הבא'}</button>
              {queue.length > 1 && <button type="button" className="fin-btn" onClick={() => move(-1)}>המסמך הקודם</button>}
              <button type="button" className="fin-btn fin-btn--ghost" onClick={() => go(`/documents/${doc.id}`)}><Icon name="external" size={15} /> עריכה מלאה של המסמך</button>
              <button type="button" className="fin-btn fin-btn--ghost" disabled={busy} onClick={notRelevant}><Icon name="trash" size={15} /> לא רלוונטי</button>
            </div>
          </section>
          <section className="fin-comp__doc" aria-label="המסמך"><DocPreview doc={doc} /></section>
        </div>
      )}
    </div>
  )
}
