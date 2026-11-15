import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, SOURCE, date, dateTime, docDate, money, nameOf } from './format.js'
import DocPreview from './DocPreview.jsx'
import Peek from './Peek.jsx'
import Thumbnail from './Thumbnail.jsx'
import { prettyPhone } from './phone.js'
import { Empty, Icon, Modal, StatusPill, askConfirm } from './ui.jsx'

/* The receipts people handed in themselves — a photo sent to the office WhatsApp number from a registered phone, a
   file uploaded from the computer, a picture taken in the app — newest first. Each line is the document itself: resting
   the pointer on it shows it (the same card as everywhere), "הגדלה" opens it large, and it can be deleted from here. */
const HAND = ['whatsapp', 'upload', 'camera']
const STEP = 8
const viaIcon = (d) => (d.source === 'whatsapp' ? 'phone' : d.source === 'camera' ? 'camera' : 'upload')

export default function HandReceipts({ phones = [] }) {
  const { documents, members, can, go, reload } = useFinance()
  const [shown, setShown] = useState(STEP)
  const [big, setBig] = useState(null)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const list = useMemo(() => documents.filter((d) => HAND.includes(d.source)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), [documents])
  const people = useMemo(() => members.map((m) => ({ id: m.user_id, name: m.full_name || m.email })), [members])
  // who handed it in: the registered phone's name for WhatsApp, the member who uploaded otherwise
  const from = (d) => {
    if (d.source === 'whatsapp') {
      const num = String(d.email_from || '').replace(/\D/g, '')
      const known = phones.find((p) => p.phone === num)
      return known?.label || nameOf(people, known?.user_id) || (num ? prettyPhone(num) : '')
    }
    return nameOf(people, d.created_by) || ''
  }
  const title = (d) => d.supplier_name || d.file_name || 'מסמך'
  const canDelete = (d) => can('manage') || (can('operate') && !['approved', 'sent'].includes(d.status))
  const remove = async (d) => {
    if (!(await askConfirm({ title: 'מחיקת מסמך', text: `למחוק את "${title(d)}"${d.total_amount != null ? ` (${money(d.total_amount, d.currency)})` : ''}? המסמך והקובץ שלו יימחקו מהמערכת. אי אפשר לבטל.`, ok: 'מחיקה', danger: true }))) return
    setBusy(d.id); setNote('')
    try { await api.deleteDocument(d); setBig(null); setNote('המסמך נמחק'); await reload() } catch (e) { setNote(e.message) } finally { setBusy('') }
  }

  return (
    <section className="fin-panelcard fin-hand" aria-label="קבלות שהועלו ידנית">
      <header>
        <div><h3>קבלות שהועלו ידנית</h3><p className="fin-muted fin-small">{list.length ? `${list.length === 1 ? 'מסמך אחד' : `${list.length.toLocaleString('he-IL')} מסמכים`} שנשלחו ב-WhatsApp, הועלו מהמחשב או צולמו. ריחוף על שורה מציג את המסמך.` : 'צילומים ב-WhatsApp, קבצים מהמחשב וצילום מהאפליקציה.'}</p></div>
        {list.length > 0 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => go('/receipts')}><Icon name="list" size={15} /> כל הקבלות והחשבוניות</button>}
      </header>
      {note && <p className="fin-note" role="status">{note}</p>}
      {!list.length ? (
        <Empty title="עוד לא הועלו קבלות" icon="phone">שלחו צילום של קבלה או PDF למספר המשרד מטלפון רשום, או העלו קובץ מהמחשב. המסמך יופיע כאן תוך כדקה.</Empty>
      ) : (
        <ul className="fin-hand__list">
          {list.slice(0, shown).map((d) => {
            const who = from(d)
            return (
              <li key={d.id} className={busy === d.id ? 'is-busy' : ''}>
                <Peek doc={d} className="fin-hand__peek">
                  <button type="button" className="fin-hand__pic" onClick={() => setBig(d)} aria-label={`הגדלת ${title(d)}`}><Thumbnail doc={d} /></button>
                </Peek>
                <div className="fin-hand__main">
                  <Peek doc={d}><a className="fin-hand__name" href={`/admin/finance/documents/${d.id}`} onClick={(e) => { e.preventDefault(); go(`/documents/${d.id}`) }}>{title(d)}</a></Peek>
                  <small className="fin-hand__meta">
                    <span><Icon name={viaIcon(d)} size={13} /> {SOURCE[d.source]}{who ? <> · <bdi>{who}</bdi></> : ''}</span>
                    <span>{dateTime(d.created_at)}</span>
                    {(DOC_TYPE[d.doc_type] || docDate(d)) && <span>{[DOC_TYPE[d.doc_type], date(docDate(d))].filter(Boolean).join(' · ')}</span>}
                  </small>
                </div>
                <strong className="fin-hand__sum">{d.total_amount != null ? money(d.total_amount, d.currency) : '—'}</strong>
                <span className="fin-hand__st"><StatusPill status={d.status} /></span>
                <span className="fin-hand__acts">
                  <button type="button" className="fin-btn fin-btn--sm" onClick={() => setBig(d)}><Icon name="expand" size={15} /> הגדלה</button>
                  {canDelete(d) && <button type="button" className="fin-icon-btn fin-icon-btn--danger" disabled={busy === d.id} onClick={() => remove(d)} aria-label={`מחיקת ${title(d)}`} title="מחיקה"><Icon name="trash" size={17} /></button>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {list.length > shown && <button type="button" className="fin-btn fin-btn--ghost fin-hand__more" onClick={() => setShown((v) => v + STEP * 2)}>הצגת עוד ({(list.length - shown).toLocaleString('he-IL')})</button>}

      {big && (
        <Modal wide title={title(big)} onClose={() => setBig(null)} footer={<>
          <button type="button" className="fin-btn fin-btn--primary" onClick={() => { const id = big.id; setBig(null); go(`/documents/${id}`) }}>פתיחת המסמך לעריכה</button>
          {canDelete(big) && <button type="button" className="fin-btn fin-btn--danger" disabled={busy === big.id} onClick={() => remove(big)}><Icon name="trash" size={16} /> מחיקה</button>}
          <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setBig(null)}>סגירה</button>
        </>}>
          <p className="fin-hand__bigmeta">
            <StatusPill status={big.status} />
            <span>{[DOC_TYPE[big.doc_type], big.doc_number && `מס׳ ${big.doc_number}`, date(docDate(big))].filter(Boolean).join(' · ')}</span>
            {big.total_amount != null && <b>{money(big.total_amount, big.currency)}</b>}
          </p>
          <div className="fin-hand__big"><DocPreview doc={big} /></div>
        </Modal>
      )}
    </section>
  )
}
