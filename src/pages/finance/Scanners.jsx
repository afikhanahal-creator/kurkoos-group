import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { ago, date, dateTime, nameOf } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync } from './ui.jsx'

/* Israeli mobile: 05X-XXXXXXX in any format → 9725XXXXXXXX */
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = `972${d.slice(1)}`
  return d
}
export const validMobile = (p) => /^9725\d{8}$/.test(p) || /^[1-9]\d{9,14}$/.test(p) && !p.startsWith('972')
const pretty = (p) => (p.startsWith('972') ? `+972 ${p.slice(3, 5)}-${p.slice(5, 8)}-${p.slice(8)}` : `+${p}`)
const OUTCOME = { imported: ['ok', 'נקלט'], duplicate: ['muted', 'כבר קיים'], refused_unknown_number: ['attn', 'מספר לא רשום'], unsupported: ['warn', 'לא קובץ'], failed: ['bad', 'נכשל'] }

export default function Scanners() {
  const { businesses, members, can } = useFinance()
  const me = useSession()
  const list = useAsync(() => api.loadWhatsappSenders(), [])
  const inbox = useAsync(() => (can('operate') ? api.loadWhatsappInbox(40) : []), [list.data])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [add, setAdd] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const office = status.data?.whatsapp?.number || ''
  const waLink = office ? `https://wa.me/${office}?text=${encodeURIComponent('שלום, אני רוצה לשלוח חשבוניות לקבוצת קורקוס')}` : null

  const save = async (e) => {
    e.preventDefault(); setErr('')
    const phone = normalizePhone(add.phone)
    if (!validMobile(phone)) { setErr('מספר נייד לא תקין. למשל 054-3049491'); return }
    try {
      await api.saveRow('fin_whatsapp_senders', { phone, label: add.label || null, business_id: add.business_id || null, user_id: add.user_id || me?.id || null, created_by: me?.id || null })
      setAdd(null); setMsg(`המספר ${pretty(phone)} נוסף. מעכשיו כל צילום או PDF שיישלח ממנו ל-WhatsApp של המשרד ייכנס למערכת.`); list.reload()
    } catch (e2) { setErr(/unique|duplicate/i.test(e2.message) ? 'המספר הזה כבר רשום' : e2.message) }
  }
  const toggle = async (s) => { await api.saveRow('fin_whatsapp_senders', { id: s.id, active: !s.active }); list.reload() }
  const remove = async (s) => { if (window.confirm(`להסיר את ${pretty(s.phone)}? המסמכים שנשלחו ממנו נשארים.`)) { await api.deleteRow('fin_whatsapp_senders', s.id); list.reload() } }

  return (
    <div className="fin-stack fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">סורקים ניידים</h2>
        <InfoTip label="על סורקים ניידים">כל טלפון שרשום כאן הוא סורק: מצלמים קבלה או שולחים PDF ל-WhatsApp של המשרד, והמסמך נכנס למערכת, נקרא ע״י הסוכנים וממתין לאישור. מספר שלא רשום מקבל תשובה שהוא לא מורשה, והניסיון נרשם ביומן.</InfoTip>
      </div>

      <button type="button" className="fin-btn fin-btn--primary fin-btn--block" onClick={() => { setErr(''); setAdd({ phone: '', label: '', business_id: '', user_id: me?.id || '' }) }} disabled={!can('upload')}>
        <Icon name="phone" size={18} /> חיבור WhatsApp
      </button>
      {status.data && !status.data.whatsapp?.configured && <p className="fin-note fin-note--warn">החיבור ל-WhatsApp עוד לא הוגדר בשרת (GREENAPI_ID_INSTANCE, GREENAPI_TOKEN, FINANCE_WHATSAPP_WEBHOOK_TOKEN). אפשר לרשום מספרים כבר עכשיו.</p>}
      {msg && <p className="fin-note" role="status">{msg}</p>}

      {list.loading ? <p className="fin-muted">טוען…</p> : !(list.data || []).length ? (
        <Empty title="עוד אין טלפונים" icon="phone">הוסיפו את המספר שלכם, ומהיום כל קבלה שתצלמו תגיע לכאן בלי להתחבר למערכת.</Empty>
      ) : (
        <ul className="fin-acc-list">
          {list.data.map((s) => (
            <li key={s.id} className="fin-acc">
              <ProviderLogo name="whatsapp" />
              <div className="fin-acc__main">
                <strong dir="ltr">{pretty(s.phone)}</strong>
                <span className="fin-acc__meta">{s.label || nameOf(members.map((m) => ({ id: m.user_id, name: m.full_name || m.email })), s.user_id) || ''}{s.business_id ? <span className="fin-chipbtn is-static">{nameOf(businesses, s.business_id)}</span> : null}</span>
                <span className="fin-acc__sub">נוסף {date(s.created_at)}, {s.last_received_at ? `מסמך אחרון ${ago(s.last_received_at)}, ${s.docs_count} מסמכים` : 'טרם נשלחו מסמכים'}</span>
              </div>
              <Pill tone={s.active ? 'ok' : 'muted'}>{s.active ? 'פעיל' : 'מושהה'}</Pill>
              <MoreMenu label={`פעולות עבור ${pretty(s.phone)}`} items={[
                { label: s.active ? 'השהיה' : 'הפעלה', onClick: () => toggle(s) },
                { label: 'הסרה', onClick: () => remove(s), danger: true },
              ]} />
            </li>
          ))}
        </ul>
      )}

      <section className="fin-help">
        <h3>לא מוצאים אותנו ב-WhatsApp?</h3>
        {waLink ? <p>לחצו על <a href={waLink} target="_blank" rel="noopener noreferrer"><ProviderLogo name="whatsapp" size={16} /> הצ׳אט של קורקוס</a> כדי לפתוח שיחה עם המספר <span dir="ltr">{pretty(office)}</span>, ושם שלחו צילומים או קבצי PDF.</p> : <p className="fin-muted">המספר של המשרד יופיע כאן אחרי ההגדרה בשרת (FINANCE_WHATSAPP_NUMBER).</p>}
      </section>

      {can('operate') && (inbox.data || []).length > 0 && (
        <details className="fin-disclosure" open>
          <summary>הודעות אחרונות</summary>
          <table className="fin-table fin-table--plain">
            <thead><tr><th>מתי</th><th>מספר</th><th>קובץ</th><th>תוצאה</th></tr></thead>
            <tbody>{inbox.data.map((r) => <tr key={r.id}><td>{dateTime(r.at)}</td><td dir="ltr">{pretty(r.phone || '')}</td><td>{r.document_id ? <a className="fin-link" href={`/admin/finance/documents/${r.document_id}`}>{r.file_name || 'מסמך'}</a> : r.file_name || '—'}</td><td><Pill tone={OUTCOME[r.outcome]?.[0]}>{OUTCOME[r.outcome]?.[1] || r.outcome}</Pill></td></tr>)}</tbody>
          </table>
        </details>
      )}

      {add && (
        <Modal title="חיבור WhatsApp" onClose={() => setAdd(null)} footer={<><button type="submit" form="fin-wa" className="fin-btn fin-btn--primary">הוספת המספר</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setAdd(null)}>ביטול</button></>}>
          <form id="fin-wa" className="fin-form__grid" onSubmit={save} noValidate>
            <Field label="מספר הנייד" wide tone={err ? 'error' : undefined} hint={err || 'המספר שממנו תשלחו את הצילומים'}><input type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="054-3049491" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} required /></Field>
            <Field label="שם (לא חובה)"><input value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} placeholder="למשל: הטלפון של שלומי" /></Field>
            <Field label="שיוך לחברה (לא חובה)"><select value={add.business_id} onChange={(e) => setAdd({ ...add, business_id: e.target.value })}><option value="">לפי החשבונית</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            {can('operate') && <Field label="המשתמש" wide hint="המסמכים יירשמו כאילו המשתמש הזה העלה אותם"><select value={add.user_id} onChange={(e) => setAdd({ ...add, user_id: e.target.value })}>{members.filter((m) => m.active).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>)}</select></Field>}
          </form>
          {office && <p className="fin-callout">אחרי ההוספה: שמרו באנשי הקשר את <strong dir="ltr">{pretty(office)}</strong> ושלחו אליו צילום של חשבונית. תקבלו אישור תוך כמה שניות.</p>}
        </Modal>
      )}
    </div>
  )
}
