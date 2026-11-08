import { useEffect, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, SOURCE, date, money } from './format.js'
import { Icon, StatusPill } from './ui.jsx'

const VAT = 0.18
const FIELDS = ['supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'due_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'category', 'business_id', 'description', 'payment_method', 'paid', 'notes']

function Preview({ doc }) {
  const [src, setSrc] = useState(null)
  const [html, setHtml] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    let blobUrl = null
    setSrc(null); setHtml(null); setErr('')
    if (!doc.file_path) return undefined
    ;(async () => {
      try {
        if ((doc.file_mime || '').startsWith('text/')) {
          const b = await api.fileBlob(doc)
          if (alive) setHtml(await b.text())
        } else {
          const b = await api.fileBlob(doc)
          blobUrl = URL.createObjectURL(b)
          if (alive) setSrc(blobUrl)
        }
      } catch (e) { if (alive) setErr(e.message) }
    })()
    return () => { alive = false; if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [doc.file_path, doc.file_mime])

  if (err) return <p className="fin-error">הקובץ לא נטען: {err}</p>
  if (html !== null) return <iframe className="fin-preview__frame" title="המייל" sandbox="" srcDoc={html} />
  if (!src) return <div className="fin-msg">טוען את הקובץ…</div>
  if (doc.file_mime === 'application/pdf') return <iframe className="fin-preview__frame" title={doc.file_name || 'המסמך'} src={src} />
  return <img className="fin-preview__img" src={src} alt={doc.file_name || 'המסמך'} />
}

export default function DocumentPanel({ doc, onClose, onSaved, onDeleted, onPrev, onNext }) {
  const { businesses, categories } = useFinance()
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, doc[k] ?? (k === 'paid' ? false : '')])))
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const dirty = FIELDS.some((k) => String(form[k] ?? '') !== String(doc[k] ?? (k === 'paid' ? false : '')))

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, select, textarea')) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onNext) onNext()
      if (e.key === 'ArrowRight' && onPrev) onPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onPrev])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const clean = () => {
    const out = {}
    for (const k of FIELDS) {
      let v = form[k]
      if (['amount_before_vat', 'vat_amount', 'total_amount'].includes(k)) v = v === '' || v === null ? null : Number(v)
      else if (['issue_date', 'due_date', 'business_id'].includes(k)) v = v || null
      out[k] = v
    }
    return out
  }

  const save = async (extra = {}) => {
    setBusy(extra.status || 'save'); setErr('')
    try { onSaved(await api.updateDocument(doc.id, { ...clean(), ...extra })) } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const reread = async () => {
    setBusy('extract'); setErr('')
    try {
      const { document } = await api.callServer('extract', { document_id: doc.id })
      if (document) { onSaved(document); setForm(Object.fromEntries(FIELDS.map((k) => [k, document[k] ?? (k === 'paid' ? false : '')]))) }
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const remove = async () => {
    if (!window.confirm('למחוק את המסמך ואת הקובץ? אי אפשר לבטל.')) return
    setBusy('delete')
    try { await api.deleteDocument(doc); onDeleted() } catch (e) { setErr(e.message); setBusy('') }
  }
  /* fill the missing amount from the other two, at 18% VAT */
  const calc = () => {
    const t = Number(form.total_amount); const b = Number(form.amount_before_vat); const v = Number(form.vat_amount)
    if (t && !b) setForm((f) => ({ ...f, amount_before_vat: (t / (1 + VAT)).toFixed(2), vat_amount: (t - t / (1 + VAT)).toFixed(2) }))
    else if (b && !t) setForm((f) => ({ ...f, vat_amount: (b * VAT).toFixed(2), total_amount: (b * (1 + VAT)).toFixed(2) }))
    else if (t && b && !v) setForm((f) => ({ ...f, vat_amount: (t - b).toFixed(2) }))
  }
  const sumOff = form.total_amount && form.amount_before_vat && form.vat_amount && Math.abs(Number(form.amount_before_vat) + Number(form.vat_amount) - Number(form.total_amount)) > 1

  return (
    <div className="fin-panel" role="dialog" aria-modal="true" aria-label={`מסמך: ${doc.supplier_name || doc.file_name}`}>
      <button type="button" className="fin-panel__scrim" aria-label="סגירה" onClick={onClose} />
      <div className="fin-panel__body">
        <header className="fin-panel__head">
          <div>
            <h2>{doc.supplier_name || doc.file_name || 'מסמך'}</h2>
            <p className="fin-muted">
              <StatusPill status={doc.status} /> {SOURCE[doc.source]}{doc.email_from ? ` · ${doc.email_from}` : ''}{doc.confidence != null ? ` · ודאות ${Math.round(doc.confidence * 100)}%` : ''}
            </p>
          </div>
          <div className="fin-panel__nav">
            <button type="button" className="fin-icon-btn" onClick={onPrev} disabled={!onPrev} aria-label="המסמך הקודם">›</button>
            <button type="button" className="fin-icon-btn" onClick={onNext} disabled={!onNext} aria-label="המסמך הבא">‹</button>
            <button type="button" className="fin-icon-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" /></button>
          </div>
        </header>

        <div className="fin-panel__split">
          <div className="fin-preview"><Preview doc={doc} /></div>

          <form className="fin-form" onSubmit={(e) => { e.preventDefault(); save() }}>
            {doc.status === 'processing' && <p className="fin-note"><Icon name="sparkle" size={16} /> Claude קורא את המסמך…</p>}
            {doc.status === 'duplicate' && <p className="fin-note fin-note--warn">נראה כמו כפילות: כבר יש מסמך עם אותו ספק ואותו מספר.</p>}
            {doc.email_subject && <p className="fin-muted fin-form__mail">נושא המייל: {doc.email_subject} · {date(doc.email_date)}</p>}

            <div className="fin-form__grid">
              <label className="fin-field fin-field--wide">ספק<input value={form.supplier_name} onChange={set('supplier_name')} /></label>
              <label className="fin-field">ח.פ / ע.מ<input value={form.supplier_vat_id} onChange={set('supplier_vat_id')} inputMode="numeric" /></label>
              <label className="fin-field">סוג מסמך
                <select value={form.doc_type} onChange={set('doc_type')}>{Object.entries(DOC_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </label>
              <label className="fin-field">מספר מסמך<input value={form.doc_number} onChange={set('doc_number')} /></label>
              <label className="fin-field">תאריך<input type="date" value={form.issue_date || ''} onChange={set('issue_date')} /></label>
              <label className="fin-field">לתשלום עד<input type="date" value={form.due_date || ''} onChange={set('due_date')} /></label>
              <label className="fin-field">מטבע
                <select value={form.currency} onChange={set('currency')}>{['ILS', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </label>
              <label className="fin-field">לפני מע״מ<input type="number" step="0.01" value={form.amount_before_vat ?? ''} onChange={set('amount_before_vat')} onBlur={calc} /></label>
              <label className="fin-field">מע״מ<input type="number" step="0.01" value={form.vat_amount ?? ''} onChange={set('vat_amount')} onBlur={calc} /></label>
              <label className="fin-field fin-field--strong">סה״כ<input type="number" step="0.01" value={form.total_amount ?? ''} onChange={set('total_amount')} onBlur={calc} /></label>
              {sumOff && <p className="fin-note fin-note--warn fin-field--wide">הסכומים לא מסתדרים: לפני מע״מ ועוד מע״מ אינם שווים לסה״כ.</p>}
              <label className="fin-field">קטגוריה
                <select value={form.category || ''} onChange={set('category')}><option value="">בחרו…</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              </label>
              <label className="fin-field">חברה
                <select value={form.business_id || ''} onChange={set('business_id')}><option value="">בחרו…</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              </label>
              <label className="fin-field">אמצעי תשלום<input value={form.payment_method || ''} onChange={set('payment_method')} list="fin-pay" /></label>
              <datalist id="fin-pay">{['אשראי', 'העברה בנקאית', 'מזומן', 'צ׳ק', 'הוראת קבע'].map((p) => <option key={p} value={p} />)}</datalist>
              <label className="fin-field fin-field--check"><input type="checkbox" checked={!!form.paid} onChange={set('paid')} /> שולם</label>
              <label className="fin-field fin-field--wide">תיאור<input value={form.description || ''} onChange={set('description')} /></label>
              <label className="fin-field fin-field--wide">הערות<textarea rows={2} value={form.notes || ''} onChange={set('notes')} /></label>
            </div>

            {err && <p className="fin-error" role="alert">{err}</p>}

            <div className="fin-form__actions">
              {doc.status !== 'approved' && doc.status !== 'sent'
                ? <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy} onClick={() => save({ status: 'approved' })}><Icon name="check" size={18} /> {dirty ? 'שמירה ואישור' : 'אישור'}</button>
                : <button type="submit" className="fin-btn fin-btn--primary" disabled={!!busy || !dirty}>שמירה</button>}
              {dirty && doc.status !== 'approved' && doc.status !== 'sent' && <button type="submit" className="fin-btn" disabled={!!busy}>שמירה בלי אישור</button>}
              <button type="button" className="fin-btn" disabled={!!busy || !doc.file_path} onClick={reread}><Icon name="sparkle" size={18} /> {busy === 'extract' ? 'קורא…' : 'קריאה מחדש'}</button>
              {doc.status !== 'rejected' && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => save({ status: 'rejected' })}>לא רלוונטי</button>}
              <button type="button" className="fin-btn fin-btn--danger" disabled={!!busy} onClick={remove} aria-label="מחיקה"><Icon name="trash" size={18} /></button>
            </div>
            <p className="fin-muted fin-form__foot">סה״כ: {money(form.total_amount, form.currency)} · חיצים במקלדת עוברים בין מסמכים</p>
          </form>
        </div>
      </div>
    </div>
  )
}
