import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { money, signedTotal } from './format.js'
import { Field, Icon, Modal } from './ui.jsx'

/* One email with the chosen documents: originals attached, a CSV summary, and a table in the body. */
export default function SendToAccountant({ docs, period, onClose, onSent, markDefault = false }) {
  const { businesses, reload } = useFinance()
  const sendable = docs.filter((d) => !['rejected', 'duplicate', 'archived'].includes(d.status))
  const suggested = useMemo(() => [...new Set(sendable.map((d) => businesses.find((b) => b.id === d.business_id)?.accountant_email).filter(Boolean))], [sendable, businesses])
  const [to, setTo] = useState(suggested.join(', '))
  const [note, setNote] = useState('')
  const [ccMe, setCcMe] = useState(true)
  const [mark, setMark] = useState(markDefault)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const total = sendable.reduce((s, d) => s + signedTotal(d), 0)
  const notApproved = sendable.filter((d) => !['approved', 'sent'].includes(d.status)).length
  const markable = sendable.filter((d) => d.status === 'approved' && !d.exported_at)

  const send = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await api.callServer('send-to-accountant', { ids: sendable.map((d) => d.id), to, note, cc_me: ccMe, period, mark: mark && markable.length > 0 })
      if (r.marked) await reload()
      onSent(r)
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <Modal title="שליחה לרואה החשבון" onClose={onClose} footer={<><button type="submit" form="fin-send" className="fin-btn fin-btn--primary" disabled={busy || !sendable.length}><Icon name="send" size={17} /> {busy ? 'שולח…' : `שליחת ${sendable.length === 1 ? 'מסמך אחד' : `${sendable.length} מסמכים`}`}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>ביטול</button></>}>
      <div className="fin-send__sum">
        <div><span>מסמכים</span><strong>{sendable.length}</strong></div>
        <div><span>סה״כ</span><strong>{money(total)}</strong></div>
        {period && <div><span>תקופה</span><strong>{period}</strong></div>}
      </div>
      {docs.length > sendable.length && <p className="fin-muted fin-small">{docs.length - sendable.length === 1 ? 'מסמך אחד כפול, נדחה או בארכיון לא יישלח.' : `${docs.length - sendable.length} מסמכים כפולים, נדחים או בארכיון לא יישלחו.`}</p>}
      {notApproved > 0 && <p className="fin-note fin-note--warn"><Icon name="alert" size={16} /> {notApproved === 1 ? 'מסמך אחד עוד לא אושר' : `${notApproved} מסמכים עוד לא אושרו`}. הם יישלחו, ובמייל יצוין שהם ממתינים לאישור.</p>}
      <form id="fin-send" className="fin-form__grid" onSubmit={send} noValidate>
        <Field label="אל" wide tone={err ? 'error' : undefined} hint={err || (suggested.length ? 'המייל של רו״ח מהגדרות החברה. אפשר להוסיף כתובות, מופרדות בפסיק' : 'אין מייל רו״ח בהגדרות החברה. הקלידו כתובת')}>
          <input type="email" multiple dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="cpa@example.co.il" required autoComplete="email" />
        </Field>
        <Field label="הודעה (לא חובה)" wide><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="שלום, מצורפות החשבוניות של החודש." /></Field>
        <label className="fin-check fin-field--wide"><input type="checkbox" checked={ccMe} onChange={(e) => setCcMe(e.target.checked)} /> לשלוח לי עותק</label>
        {markable.length > 0 && <label className="fin-check fin-field--wide"><input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} /> לסמן את {markable.length === 1 ? 'המסמך המאושר' : `${markable.length} המסמכים המאושרים`} כ"נשלח לרו״ח" (נרשם בהיסטוריית הייצוא)</label>}
      </form>
      <p className="fin-muted fin-small">הקבצים המקוריים מצורפים למייל עם קובץ סיכום (CSV) לקליטה בתוכנה. אם הם גדולים מ-25MB ביחד, השאר נשלחים כקישורים בתוקף 7 ימים.</p>
    </Modal>
  )
}
