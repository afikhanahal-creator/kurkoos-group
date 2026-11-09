import { useMemo, useRef, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { date, docDate, money } from './format.js'
import { saveBlob } from './zip.js'
import Select from './Select.jsx'
import { Icon, askConfirm, useAsync } from './ui.jsx'

/* Attachments of a document: extra files (a delivery note, a signed order, a payment slip) and links to other documents
   (the receipt that paid this invoice, the original of a credit note). Every add and remove goes to the history. */
export default function Attachments({ doc }) {
  const { documents, can, go } = useFinance()
  const list = useAsync(() => api.loadAttachments(doc.id).catch(() => []), [doc.id])
  const [busy, setBusy] = useState(''); const [err, setErr] = useState(''); const [linking, setLinking] = useState(false); const [pick, setPick] = useState('')
  const input = useRef(null)
  const canAdd = can('upload')
  const items = list.data || []
  // documents worth linking first: the same supplier, then the same company, newest first
  const candidates = useMemo(() => documents.filter((d) => d.id !== doc.id && !items.some((a) => a.linked_document_id === d.id) && !['rejected', 'archived'].includes(d.status))
    .sort((a, b) => ((b.supplier_id && b.supplier_id === doc.supplier_id) - (a.supplier_id && a.supplier_id === doc.supplier_id)) || ((b.business_id === doc.business_id) - (a.business_id === doc.business_id)) || String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 200), [documents, doc.id, doc.supplier_id, doc.business_id, items])
  const add = async (files) => {
    setErr(''); setBusy('file')
    try { for (const f of files) await api.addAttachmentFile(doc.id, f); list.reload() } catch (e) { setErr(e.message) } finally { setBusy(''); if (input.current) input.current.value = '' }
  }
  const link = async () => {
    if (!pick) return
    setErr(''); setBusy('link')
    try { await api.linkDocument(doc.id, pick); setPick(''); setLinking(false); list.reload() } catch (e) { setErr(/duplicate|unique/i.test(e.message) ? 'המסמך הזה כבר מקושר' : e.message) } finally { setBusy('') }
  }
  const open = async (a) => { try { const b = await api.attachmentBlob(a); window.open(URL.createObjectURL(b), '_blank', 'noopener') } catch (e) { setErr(e.message) } }
  const download = async (a) => { try { saveBlob(await api.attachmentBlob(a), a.file_name || 'נספח') } catch (e) { setErr(e.message) } }
  const remove = async (a) => {
    if (!(await askConfirm({ text: a.kind === 'link' ? 'להסיר את הקישור? המסמך המקושר עצמו לא נמחק.' : `להסיר את הנספח "${a.file_name}"?`, ok: 'הסרה', danger: true }))) return
    try { await api.removeAttachment(a.id); list.reload() } catch (e) { setErr(e.message) }
  }
  return (
    <section className="fin-attach" aria-label="נספחים">
      <header>
        <h3><Icon name="file" size={17} /> נספחים{items.length ? <em>{items.length}</em> : null}</h3>
        {canAdd && (
          <span className="fin-attach__actions">
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => setLinking((v) => !v)} aria-expanded={linking}><Icon name="external" size={15} /> קישור מסמך קיים</button>
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => input.current?.click()} disabled={!!busy}><Icon name="plus" size={15} /> {busy === 'file' ? 'מעלה…' : 'הוספת נספח'}</button>
            <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => e.target.files?.length && add([...e.target.files])} data-testid="attach-input" />
          </span>
        )}
      </header>
      {linking && (
        <div className="fin-attach__link">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="מסמך לקישור"><option value="">בחירת מסמך…</option>{candidates.map((d) => <option key={d.id} value={d.id}>{`${d.supplier_name || d.file_name || 'מסמך'}${d.doc_number ? ` ${d.doc_number}` : ''} · ${date(docDate(d))} · ${money(d.total_amount, d.currency)}`}</option>)}</Select>
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={link} disabled={!pick || !!busy}>קישור</button>
        </div>
      )}
      {err && <p className="fin-error" role="alert">{err}</p>}
      {list.loading ? <p className="fin-muted">טוען…</p> : !items.length ? <p className="fin-muted fin-attach__empty">אין נספחים למסמך הזה. אפשר לצרף תעודת משלוח, הזמנה חתומה או אישור העברה, או לקשר את הקבלה ששילמה את החשבונית.</p> : (
        <ul className="fin-attach__list">
          {items.map((a) => {
            const other = a.kind === 'link' ? documents.find((d) => d.id === a.linked_document_id) : null
            return (
              <li key={a.id}>
                <span className="fin-attach__icon"><Icon name={a.kind === 'link' ? 'external' : 'file'} size={16} /></span>
                <span className="fin-attach__main">
                  {a.kind === 'link'
                    ? <button type="button" className="fin-link" onClick={() => go(`/documents/${a.linked_document_id}`)}>{other ? `${other.supplier_name || other.file_name || 'מסמך'}${other.doc_number ? ` ${other.doc_number}` : ''}` : 'מסמך מקושר'}</button>
                    : <button type="button" className="fin-link" onClick={() => open(a)}>{a.file_name || 'נספח'}</button>}
                  <small>{a.kind === 'link' ? (other ? `${date(docDate(other))} · ${money(other.total_amount, other.currency)}` : 'מסמך שאין לך גישה אליו') : `${a.file_size ? `${Math.max(1, Math.round(a.file_size / 1024))}KB · ` : ''}נוסף ${date(a.created_at)}`}</small>
                </span>
                {a.kind === 'file' && <button type="button" className="fin-icon-btn" onClick={() => download(a)} aria-label={`הורדת ${a.file_name}`} title="הורדה"><Icon name="download" size={16} /></button>}
                {canAdd && <button type="button" className="fin-icon-btn" onClick={() => remove(a)} aria-label="הסרת הנספח" title="הסרה"><Icon name="trash" size={16} /></button>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
