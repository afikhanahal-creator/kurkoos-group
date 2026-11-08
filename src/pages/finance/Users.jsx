import { useState } from 'react'
import { useSession } from './session.js'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ROLE, dateTime, nameOf } from './format.js'
import { Card, Field, Icon, Modal, PageHead, Pill, Toggle } from './ui.jsx'

const ROLE_DESC = {
  admin: 'הכול: הגדרות, משתמשים, חיבורים, אינטגרציות, מסמכים וייצוא',
  finance_manager: 'מסמכים, בדיקה ואישור, דוחות, ייצוא, ספקים, פרויקטים וכללים',
  employee: 'מעלה מסמכים, מחבר תיבות, ורואה רק את המסמכים שהביא',
  accountant: 'צפייה במסמכים מאושרים, דוחות, הורדות והיסטוריית ייצוא. בלי גישה לניהול',
}

export default function Users() {
  const { members, businesses, reload } = useFinance()
  const me = useSession()
  const [invite, setInvite] = useState(null)
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const admins = members.filter((m) => m.role === 'admin' && m.active).length

  const send = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { const r = await api.callServer('invite', invite); setInvite(null); setMsg(r.emailed ? `נשלחה הזמנה ל-${invite.email}` : `${invite.email} נוסף (כבר היה לו חשבון, הוא יכול להיכנס עם הסיסמה שלו)`); reload() } catch (e2) { setMsg(e2.message) } finally { setBusy(false) }
  }
  const save = async (e) => {
    e.preventDefault()
    if (edit.user_id === me?.id && edit.role !== 'admin' && admins <= 1) { setMsg('אי אפשר להוריד את מנהל המערכת האחרון'); return }
    try {
      await api.updateMember(edit.user_id, { role: edit.role, full_name: edit.full_name || null, business_ids: edit.business_ids?.length ? edit.business_ids : null, active: edit.active })
      setEdit(null); reload()
    } catch (e2) { setMsg(e2.message) }
  }
  const BizPick = ({ value, onChange }) => (
    <fieldset className="fin-field fin-field--wide fin-checkset"><legend className="fin-field__label">גישה לחברות</legend>
      <label className="fin-check"><input type="checkbox" checked={!value?.length} onChange={(e) => onChange(e.target.checked ? null : [])} /> כל החברות</label>
      {value && businesses.map((b) => <label key={b.id} className="fin-check"><input type="checkbox" checked={value.includes(b.id)} onChange={(e) => onChange(e.target.checked ? [...value, b.id] : value.filter((x) => x !== b.id))} /> {b.name}</label>)}
    </fieldset>
  )

  return (
    <div className="fin-stack">
      <PageHead title="משתמשים והרשאות" sub="ההרשאות נאכפות במסד הנתונים עצמו: כל משתמש רואה רק את מה שהתפקיד והחברות שלו מתירים.">
        <button type="button" className="fin-btn fin-btn--primary" onClick={() => setInvite({ email: '', full_name: '', role: 'employee', business_ids: null })}><Icon name="plus" size={18} /> הזמנת משתמש</button>
      </PageHead>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead><tr><th>משתמש</th><th>תפקיד</th><th className="fin-col-md">חברות</th><th className="fin-col-lg">הצטרף</th><th>פעיל</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id} onClick={() => setEdit({ ...m })}>
                <td className="fin-td-main"><span className="fin-cell-main">{m.full_name || m.email}</span><small className="fin-cell-sub" dir="ltr">{m.email}{m.user_id === me?.id ? ' (את/ה)' : ''}</small></td>
                <td><Pill tone={m.role === 'admin' ? 'done' : m.role === 'accountant' ? 'info' : m.role === 'finance_manager' ? 'ok' : 'muted'}>{ROLE[m.role]}</Pill></td>
                <td className="fin-col-md" data-label="חברות">{m.business_ids?.length ? m.business_ids.map((b) => nameOf(businesses, b)).join(', ') : 'כולן'}</td>
                <td className="fin-col-lg" data-label="הצטרף">{dateTime(m.created_at)}</td>
                <td>{m.active ? <Pill tone="ok">פעיל</Pill> : <Pill>מושבת</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card title="מה כל תפקיד יכול">
        <ul className="fin-kv">{Object.entries(ROLE).map(([k, v]) => <li key={k}><span>{v}</span><strong className="fin-kv__text">{ROLE_DESC[k]}</strong></li>)}</ul>
        <p className="fin-muted">משתמשים שאינם מנהלי מערכת לא יכולים לערוך את תוכן האתר, גם אם יש להם חשבון.</p>
      </Card>
      {invite && (
        <Modal title="הזמנת משתמש" onClose={() => setInvite(null)} footer={<><button type="submit" form="fin-invite" className="fin-btn fin-btn--primary" disabled={busy}>{busy ? 'שולח…' : 'שליחת הזמנה'}</button><button type="button" className="fin-btn" onClick={() => setInvite(null)}>ביטול</button></>}>
          <form id="fin-invite" className="fin-form__grid" onSubmit={send}>
            <Field label="אימייל" wide><input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} dir="ltr" /></Field>
            <Field label="שם"><input value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} /></Field>
            <Field label="תפקיד" hint={ROLE_DESC[invite.role]}><select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {BizPick({ value: invite.business_ids, onChange: (v) => setInvite({ ...invite, business_ids: v }) })}
          </form>
          <p className="fin-muted">המשתמש יקבל מייל עם קישור להגדרת סיסמה.</p>
        </Modal>
      )}
      {edit && (
        <Modal title={edit.full_name || edit.email} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-member" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-member" className="fin-form__grid" onSubmit={save}>
            <Field label="שם"><input value={edit.full_name || ''} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="תפקיד" hint={ROLE_DESC[edit.role]}><select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {BizPick({ value: edit.business_ids, onChange: (v) => setEdit({ ...edit, business_ids: v }) })}
            <div className="fin-field fin-field--wide fin-field--row"><span className="fin-field__label">משתמש פעיל</span><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="משתמש פעיל" disabled={edit.user_id === me?.id} /></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
