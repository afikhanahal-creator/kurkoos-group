import { useState } from 'react'
import * as api from './api.js'
import { DOC_TYPE, SOURCE, date, docDate, money } from './format.js'
import Thumbnail from './Thumbnail.jsx'
import { Icon, Modal, StatusPill, askConfirm } from './ui.jsx'

/* Two documents that may be one. The person sees them side by side, with what differs marked, and decides:
   keep one (the other is closed as its duplicate; nothing is deleted and missing details move to the kept one),
   delete one, delete both, or say they are two separate documents. */
const FIELDS = [
  ['ספק', (d) => d.supplier_name || d.file_name || '—'],
  ['סוג ומספר', (d) => [DOC_TYPE[d.doc_type], d.doc_number].filter(Boolean).join(' ') || '—'],
  ['תאריך', (d) => date(docDate(d)) || '—'],
  ['סה״כ', (d) => (d.total_amount != null ? money(d.total_amount, d.currency) : '—')],
  ['הגיע מ', (d) => (d.email_from ? d.email_from.replace(/<[^>]*>/g, '').replace(/"/g, '').trim() || d.email_from : SOURCE[d.source] || '—')],
]
const locked = (d) => ['approved', 'sent'].includes(d.status)

export default function MergeDialog({ docs, canDelete, onClose, onDone }) {
  const [a, b] = docs
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const run = async (key, fn, done) => { setBusy(key); setErr(''); try { await fn(); onDone(done) } catch (e) { setErr(e.message); setBusy('') } }
  const keep = (k, d) => run(`keep-${k.id}`, () => api.callServer('merge-docs', { keep_id: k.id, drop_id: d.id }), `המסמכים מוזגו: נשאר "${k.supplier_name || k.file_name || 'המסמך'}"`)
  const remove = async (list) => {
    if (!(await askConfirm({ title: list.length === 2 ? 'מחיקת שני המסמכים' : 'מחיקת מסמך', text: `${list.length === 2 ? 'למחוק את שני המסמכים' : `למחוק את "${list[0].supplier_name || list[0].file_name || 'המסמך'}"`} יחד עם ${list.length === 2 ? 'הקבצים שלהם' : 'הקובץ שלו'}? אי אפשר לבטל.`, ok: 'מחיקה', danger: true }))) return
    run(`del-${list.map((d) => d.id).join('-')}`, async () => { for (const d of list) await api.deleteDocument(d) }, list.length === 2 ? 'שני המסמכים נמחקו' : 'המסמך נמחק')
  }
  const separate = () => run('separate', async () => {
    for (const d of [a, b]) if (d.duplicate_state === 'suspected' && [a.id, b.id].includes(d.duplicate_of)) await api.callServer('duplicate-decide', { document_id: d.id, decision: 'not' })
  }, 'סומנו כשני מסמכים נפרדים')
  const suspected = [a, b].some((d) => d.duplicate_state === 'suspected' && [a.id, b.id].includes(d.duplicate_of))
  const Card = ({ d, other }) => (
    <article className="fin-merge__card" aria-label={d.supplier_name || d.file_name || 'מסמך'}>
      <div className="fin-merge__thumb"><Thumbnail doc={d} size="lg" /></div>
      <div className="fin-merge__status"><StatusPill status={d.status} /></div>
      <dl>
        {FIELDS.map(([label, get]) => {
          const v = get(d); const differs = v !== get(other)
          return <div key={label} className={differs ? 'is-diff' : ''}><dt>{label}</dt><dd dir="auto">{v}</dd></div>
        })}
      </dl>
      <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy || locked(other)} onClick={() => keep(d, other)} title={locked(other) ? 'המסמך השני מאושר ולכן לא נסגר ככפול' : undefined}>
        <Icon name="check" size={16} /> {busy === `keep-${d.id}` ? 'ממזג…' : 'להשאיר את זה'}
      </button>
      {canDelete(d) && <button type="button" className="fin-link fin-link--danger" disabled={!!busy} onClick={() => remove([d])}><Icon name="trash" size={14} /> מחיקת המסמך הזה</button>}
    </article>
  )
  return (
    <Modal title="שני מסמכים, אותו חיוב?" wide onClose={busy ? () => {} : onClose}
      footer={<>
        {suspected && <button type="button" className="fin-btn" disabled={!!busy} onClick={separate}>{busy === 'separate' ? 'שומר…' : 'אלה שני מסמכים נפרדים'}</button>}
        {canDelete(a) && canDelete(b) && <button type="button" className="fin-btn fin-btn--danger" disabled={!!busy} onClick={() => remove([a, b])}><Icon name="trash" size={15} /> מחיקת שניהם</button>}
        <button type="button" className="fin-btn fin-btn--ghost" disabled={!!busy} onClick={onClose}>סגירה</button>
      </>}>
      <p className="fin-muted fin-merge__lead">בוחרים איזה מסמך נשאר. השני נסגר ככפול שלו ולא נספר בדוחות; הקובץ וההיסטוריה שלו נשמרים, ופרטים שחסרים במסמך שנשאר עוברים אליו. מה ששונה בין השניים מסומן.</p>
      <div className="fin-merge">
        <Card d={a} other={b} />
        <span className="fin-merge__vs" aria-hidden="true"><Icon name="copy" size={18} /></span>
        <Card d={b} other={a} />
      </div>
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
    </Modal>
  )
}
