import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { money } from './format.js'
import { ProviderLogo } from './logos.jsx'
import Select from './Select.jsx'
import { Field, Icon, Modal, useAsync } from './ui.jsx'

const pretty = (p) => (p.startsWith('972') ? `0${p.slice(3, 5)}-${p.slice(5)}` : `+${p}`)

/* Share one document. On a phone the system share sheet sends the real file to WhatsApp (or anywhere).
   From any device, the office WhatsApp sends the file to a number, through Green API. */
export default function ShareDialog({ doc, blobUrl, onClose }) {
  const { can } = useFinance()
  const phones = useAsync(() => api.loadWhatsappSenders(), [])
  const [phone, setPhone] = useState('')
  const [other, setOther] = useState('')
  const [caption, setCaption] = useState(`${doc.supplier_name || 'מסמך'}${doc.doc_number ? ` ${doc.doc_number}` : ''}${doc.total_amount ? `, ${money(doc.total_amount, doc.currency)}` : ''}`)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const list = (phones.data || []).filter((p) => p.active)
  const free = can('approve')                       // managers may type any number; employees use registered phones
  const target = phone === 'other' ? other : phone || (list[0]?.phone ?? '')
  const nativeShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare

  const shareNative = async () => {
    setErr('')
    try {
      const blob = await fetch(blobUrl).then((r) => r.blob())
      const ext = doc.file_mime === 'application/pdf' ? 'pdf' : (doc.file_mime || 'image/jpeg').split('/')[1]
      const file = new File([blob], `${(doc.supplier_name || 'מסמך').slice(0, 40)}${doc.doc_number ? `-${doc.doc_number}` : ''}.${ext}`, { type: blob.type || doc.file_mime })
      if (!navigator.canShare({ files: [file] })) throw new Error('הדפדפן לא תומך בשיתוף קבצים')
      await navigator.share({ files: [file], title: caption, text: caption })
      onClose()
    } catch (e) { if (e.name !== 'AbortError') setErr(e.message) }
  }
  const sendWa = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true)
    try {
      const r = await api.callServer('whatsapp-send-doc', { document_id: doc.id, phone: target, caption })
      setMsg(`נשלח בוואטסאפ ל-${pretty(r.phone)}.`)
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <Modal title="שיתוף המסמך" onClose={onClose} footer={<><button type="submit" form="fin-share" className="fin-btn fin-btn--primary" disabled={busy || !target}><ProviderLogo name="whatsapp" size={18} /> {busy ? 'שולח…' : 'שליחה בוואטסאפ'}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>סגירה</button></>}>
      {nativeShare && (
        <button type="button" className="fin-sharebig" onClick={shareNative}>
          <Icon name="share" size={20} /><span><strong>שיתוף מהטלפון</strong><small>WhatsApp, מייל או כל אפליקציה, עם הקובץ עצמו</small></span>
        </button>
      )}
      <form id="fin-share" className="fin-form__grid" onSubmit={sendWa} noValidate>
        <Field label="שליחה מה-WhatsApp של המשרד אל" wide tone={err ? 'error' : undefined} hint={err || (list.length ? 'הטלפונים הרשומים במסך סורקים ניידים' : 'עוד אין טלפונים רשומים')}>
          <Select value={phone || (list[0]?.phone ?? (free ? 'other' : ''))} onChange={(e) => setPhone(e.target.value)} aria-label="טלפון">
            {list.map((p) => <option key={p.id} value={p.phone}>{p.label ? `${p.label} · ` : ''}{pretty(p.phone)}</option>)}
            {free && <option value="other">מספר אחר…</option>}
          </Select>
        </Field>
        {free && (phone === 'other' || !list.length) && <Field label="מספר נייד" wide><input type="tel" inputMode="tel" dir="ltr" value={other} onChange={(e) => setOther(e.target.value)} placeholder="054-3049491" autoComplete="tel" /></Field>}
        <Field label="הודעה" wide><input value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
      </form>
      {msg && <p className="fin-note" role="status"><Icon name="check" size={16} /> {msg}</p>}
    </Modal>
  )
}
