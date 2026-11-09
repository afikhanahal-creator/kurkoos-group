import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { money, signedTotal } from './format.js'
import { ProviderLogo } from './logos.jsx'
import Select from './Select.jsx'
import { Field, Icon, Modal, useAsync } from './ui.jsx'

const pretty = (p) => (p.startsWith('972') ? `0${p.slice(3, 5)}-${p.slice(5)}` : `+${p}`)
const MAX_WA = 20

/* Share one document or several. WhatsApp: the office number sends each file (Green API). Email: one message with the
   originals attached and an Excel summary. On a phone, one document can also go through the system share sheet.
   A result line appears only after the server says the message really went out. */
export default function ShareDialog({ doc, docs: many, blobUrl, onClose, initial = 'whatsapp' }) {
  const { can, businesses } = useFinance()
  const me = useSession()
  const docs = many || (doc ? [doc] : [])
  const one = docs.length === 1 ? docs[0] : null
  const phones = useAsync(() => api.loadWhatsappSenders(), [])
  const [mode, setMode] = useState(initial)
  const [phone, setPhone] = useState('')
  const [other, setOther] = useState('')
  const [caption, setCaption] = useState(one ? `${one.supplier_name || 'מסמך'}${one.doc_number ? ` ${one.doc_number}` : ''}${one.total_amount ? `, ${money(one.total_amount, one.currency)}` : ''}` : '')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [ccMe, setCcMe] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(null)   // { done, of }
  const list = (phones.data || []).filter((p) => p.active)
  const free = can('approve')                       // managers may type any number; employees use registered phones
  const target = phone === 'other' ? other : phone || (list[0]?.phone ?? '')
  const nativeShare = !!one && !!blobUrl && typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
  const withFile = docs.filter((d) => d.file_path)
  const total = docs.reduce((s, d) => s + signedTotal(d), 0)

  const shareNative = async () => {
    setErr('')
    try {
      const blob = await fetch(blobUrl).then((r) => r.blob())
      const ext = one.file_mime === 'application/pdf' ? 'pdf' : (one.file_mime || 'image/jpeg').split('/')[1]
      const file = new File([blob], `${(one.supplier_name || 'מסמך').slice(0, 40)}${one.doc_number ? `-${one.doc_number}` : ''}.${ext}`, { type: blob.type || one.file_mime })
      if (!navigator.canShare({ files: [file] })) throw new Error('הדפדפן לא תומך בשיתוף קבצים')
      await navigator.share({ files: [file], title: caption, text: caption })
      onClose()
    } catch (e) { if (e.name !== 'AbortError') setErr(e.message) }
  }
  const sendWa = async () => {
    const files = withFile.slice(0, MAX_WA)
    let sent = 0; const failed = []
    setProgress({ done: 0, of: files.length })
    for (const d of files) {
      const cap = one ? caption : `${d.supplier_name || 'מסמך'}${d.doc_number ? ` ${d.doc_number}` : ''}${d.total_amount != null ? `, ${money(d.total_amount, d.currency)}` : ''}${caption ? `\n${caption}` : ''}`
      try { await api.callServer('whatsapp-send-doc', { document_id: d.id, phone: target, caption: cap }); sent++ } catch (e) { failed.push(`${d.supplier_name || d.file_name}: ${e.message}`) }
      setProgress({ done: sent + failed.length, of: files.length })
    }
    setProgress(null)
    if (sent) setMsg(`${sent === 1 ? 'מסמך אחד נשלח' : `${sent} מסמכים נשלחו`} בוואטסאפ ל-${pretty(target.replace(/\D/g, '').replace(/^0/, '972'))}.`)
    if (failed.length) setErr(`${failed.length === 1 ? 'מסמך אחד לא נשלח' : `${failed.length} מסמכים לא נשלחו`}: ${failed.slice(0, 2).join(' · ')}`)
  }
  const sendMail = async () => {
    const r = await api.callServer('email-docs', { ids: docs.map((d) => d.id), to, note, cc_me: ccMe })
    setMsg(`נשלח במייל ל-${r.to.join(', ')}: ${r.sent === 1 ? 'מסמך אחד' : `${r.sent} מסמכים`}, ${r.attached} קבצים מצורפים וקובץ Excel${r.linked ? `, ${r.linked} בקישור` : ''}.`)
  }
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true)
    try { if (mode === 'whatsapp') await sendWa(); else await sendMail() } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  const cpa = [...new Set(docs.map((d) => businesses.find((b) => b.id === d.business_id)?.accountant_email).filter(Boolean))]
  const label = mode === 'whatsapp' ? (busy && progress ? `שולח ${progress.done}/${progress.of}…` : 'שליחה בוואטסאפ') : busy ? 'שולח…' : 'שליחה במייל'

  return (
    <Modal title={one ? 'שיתוף המסמך' : `שיתוף ${docs.length} מסמכים`} onClose={onClose} footer={<>
      <button type="submit" form="fin-share" className="fin-btn fin-btn--primary" disabled={busy || (mode === 'whatsapp' ? !target || !withFile.length : !to.trim())}>
        {mode === 'whatsapp' ? <ProviderLogo name="whatsapp" size={18} /> : <Icon name="mail" size={17} />} {label}
      </button>
      <button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>סגירה</button>
    </>}>
      {!one && <div className="fin-send__sum"><div><span>מסמכים</span><strong>{docs.length}</strong></div><div><span>סה״כ</span><strong>{money(total)}</strong></div></div>}
      <div className="fin-seg fin-share__seg" role="tablist" aria-label="איך לשתף">
        <button type="button" role="tab" aria-selected={mode === 'whatsapp'} className={mode === 'whatsapp' ? 'is-on' : ''} onClick={() => { setMode('whatsapp'); setMsg(''); setErr('') }}><ProviderLogo name="whatsapp" size={15} /> WhatsApp</button>
        <button type="button" role="tab" aria-selected={mode === 'email'} className={mode === 'email' ? 'is-on' : ''} onClick={() => { setMode('email'); setMsg(''); setErr('') }}><Icon name="mail" size={15} /> מייל</button>
      </div>
      {mode === 'whatsapp' && nativeShare && (
        <button type="button" className="fin-sharebig" onClick={shareNative}>
          <Icon name="share" size={20} /><span><strong>שיתוף מהטלפון</strong><small>WhatsApp, מייל או כל אפליקציה, עם הקובץ עצמו</small></span>
        </button>
      )}
      <form id="fin-share" className="fin-form__grid" onSubmit={submit} noValidate>
        {mode === 'whatsapp' ? (
          <>
            <Field label="שליחה מה-WhatsApp של המשרד אל" wide hint={list.length ? 'הטלפונים הרשומים במסך סורקים ניידים' : 'עוד אין טלפונים רשומים'}>
              <Select value={phone || (list[0]?.phone ?? (free ? 'other' : ''))} onChange={(e) => setPhone(e.target.value)} aria-label="טלפון">
                {list.map((p) => <option key={p.id} value={p.phone}>{p.label ? `${p.label} · ` : ''}{pretty(p.phone)}</option>)}
                {free && <option value="other">מספר אחר…</option>}
              </Select>
            </Field>
            {free && (phone === 'other' || !list.length) && <Field label="מספר נייד" wide><input type="tel" inputMode="tel" dir="ltr" value={other} onChange={(e) => setOther(e.target.value)} placeholder="054-3049491" autoComplete="tel" /></Field>}
            <Field label={one ? 'הודעה' : 'הודעה (תתווסף לכל קובץ)'} wide><input value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
            {!one && <p className="fin-muted fin-small fin-field--wide">כל מסמך נשלח כקובץ נפרד{withFile.length > MAX_WA ? `. בפעם אחת נשלחים עד ${MAX_WA} קבצים; לשאר שלחו במייל` : ''}.{docs.length > withFile.length ? ` ${docs.length - withFile.length} בלי קובץ מקור לא יישלחו.` : ''}</p>}
          </>
        ) : (
          <>
            <Field label="אל" wide hint="אפשר כמה כתובות, מופרדות בפסיק (עד 5)">
              <input type="email" multiple dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.co.il" autoComplete="email" list="fin-share-mails" />
              <datalist id="fin-share-mails">{[...cpa, me?.email].filter(Boolean).map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="הודעה (לא חובה)" wide><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="שלום, מצורפים המסמכים." /></Field>
            <label className="fin-check fin-field--wide"><input type="checkbox" checked={ccMe} onChange={(e) => setCcMe(e.target.checked)} /> לשלוח לי עותק</label>
            <p className="fin-muted fin-small fin-field--wide">הקבצים המקוריים מצורפים, עם קובץ Excel וקובץ CSV של הסיכום. השליחה לא מסמנת את המסמכים כ"נשלח לרו״ח".</p>
          </>
        )}
      </form>
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
      {msg && <p className="fin-note" role="status"><Icon name="check" size={16} /> {msg}</p>}
    </Modal>
  )
}
