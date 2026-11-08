import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago, dateTime, nameOf } from './format.js'
import { Card, Empty, Field, Icon, Modal, PageHead, Pill, Toggle, useAsync } from './ui.jsx'

const FREQ = { daily: 'כל יום', weekly: 'כל שבוע', monthly: 'כל חודש', on_event: 'בכל מסמך' }
const KINDS = {
  supplier_category: 'ספק ← קטגוריה',
  supplier_company: 'ספק ← חברה',
  supplier_project: 'ספק ← פרויקט',
  keyword_project: 'מילה במסמך ← פרויקט',
  sender_company: 'שולח המייל ← חברה',
  amount_flag: 'סכום מעל ← סימון לבדיקה',
}

export default function Automations() {
  const { suppliers, businesses, projects, categories, can, reload: reloadAll } = useFinance()
  const autos = useAsync(() => api.loadAutomations(), [])
  const rules = useAsync(() => api.loadRules(), [])
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const admin = can('manage')

  const updateAuto = async (a, patch) => {
    try { await api.updateAutomation(a.key, patch) } catch (e) { setMsg(e.message) }
    autos.reload()
  }
  const runNow = async () => {
    setBusy('run'); setMsg('')
    try { const { results } = await api.callServer('run-daily'); setMsg(results.map((r) => `${r.key}: ${r.status}${r.error ? ` (${r.error})` : ''}`).join(' · ')); autos.reload(); reloadAll() } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }
  const saveRule = async (e) => {
    e.preventDefault()
    const r = edit
    const match = r.kind.startsWith('supplier_') ? { supplier_id: r.supplier_id } : r.kind === 'keyword_project' ? { keyword: r.keyword } : r.kind === 'sender_company' ? { sender: r.sender } : { min_amount: Number(r.min_amount) }
    const action = r.kind.endsWith('_category') ? { category: r.category } : r.kind.endsWith('_company') ? { business_id: r.business_id } : r.kind.endsWith('_project') ? { project_id: r.project_id } : { level: 'warn' }
    try { await api.saveRow('fin_rules', { id: r.id, name: r.name, kind: r.kind, match, action, enabled: r.enabled !== false, priority: Number(r.priority) || 100 }); setEdit(null); rules.reload() } catch (e2) { setMsg(e2.message) }
  }
  const describe = (r) => {
    const m = r.match || {}; const a = r.action || {}
    const left = m.supplier_id ? nameOf(suppliers, m.supplier_id) : m.keyword ? `"${m.keyword}"` : m.sender ? m.sender : m.min_amount ? `₪${Number(m.min_amount).toLocaleString('he-IL')}` : ''
    const right = a.category || nameOf(businesses, a.business_id) || nameOf(projects, a.project_id) || 'סימון לבדיקה'
    return `${left} ← ${right}`
  }

  return (
    <div className="fin-stack">
      <PageHead title="כללי אוטומציה" sub="מה המערכת עושה לבד, ומתי. שום כלל לא מאשר מסמך: הכללים רק משייכים ומסמנים, ואדם מאשר.">
        {admin && <button type="button" className="fin-btn" onClick={runNow} disabled={!!busy}><Icon name="play" size={18} /> {busy ? 'רץ…' : 'הרצת הריצה היומית עכשיו'}</button>}
      </PageHead>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      <Card title="אוטומציות">
        <div className="fin-table-wrap fin-table-wrap--flat">
          <table className="fin-table fin-table--plain fin-table--autos">
            <thead><tr><th>פעיל</th><th>אוטומציה</th><th className="fin-col-md">תדירות</th><th>ריצה אחרונה</th><th className="fin-col-md">הבאה</th><th>מצב</th></tr></thead>
            <tbody>
              {(autos.data || []).map((a) => (
                <tr key={a.key}>
                  <td><Toggle checked={a.enabled} onChange={(v) => updateAuto(a, { enabled: v })} label={`הפעלת ${a.name}`} disabled={!admin} /></td>
                  <td className="fin-td-main"><span className="fin-cell-main">{a.name}</span><small className="fin-cell-sub fin-wrap">{a.description}</small>
                    {a.key === 'amount_flag' && <label className="fin-inline-label">סף: <input type="number" className="fin-select fin-select--sm" defaultValue={a.config?.min_amount || 50000} disabled={!admin} onBlur={(e) => updateAuto(a, { config: { ...a.config, min_amount: Number(e.target.value) } })} /> ₪</label>}
                    {a.key === 'retry_failed' && <label className="fin-inline-label">ניסיונות: <input type="number" min="1" max="10" className="fin-select fin-select--sm" defaultValue={a.config?.max_attempts || 3} disabled={!admin} onBlur={(e) => updateAuto(a, { config: { ...a.config, max_attempts: Number(e.target.value) } })} /></label>}
                  </td>
                  <td className="fin-col-md" data-label="תדירות">{FREQ[a.frequency]}{a.frequency === 'monthly' ? ` (ב-${a.config?.day || 1})` : ''}</td>
                  <td data-label="אחרונה">{a.last_run_at ? ago(a.last_run_at) : 'עוד לא רצה'}</td>
                  <td className="fin-col-md" data-label="הבאה">{a.next_run_at ? dateTime(a.next_run_at) : a.frequency === 'on_event' ? 'בכל מסמך' : 'ב-05:23 (cron)'}</td>
                  <td>{a.last_status ? <Pill tone={a.last_status === 'ok' ? 'ok' : a.last_status === 'error' ? 'bad' : 'muted'}>{a.last_status === 'ok' ? 'הצליחה' : a.last_status === 'error' ? 'נכשלה' : a.last_status}</Pill> : <Pill>—</Pill>}{a.last_error && <small className="fin-cell-err fin-wrap"> {a.last_error}</small>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="כללי שיוך וסימון" actions={can('edit') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({ name: '', kind: 'supplier_category', enabled: true, priority: 100 })}><Icon name="plus" size={18} /> כלל חדש</button>}>
        {!(rules.data || []).length ? <Empty title="עוד אין כללים" icon="rules">למשל: כל החשבוניות של "פז" ← רכב ודלק. או: מסמך שמופיעה בו המילה "מוהליבר" ← פרויקט מוהליבר 17.</Empty> : (
          <ul className="fin-rules">
            {rules.data.map((r) => (
              <li key={r.id}>
                <Toggle checked={r.enabled} label={`הפעלת ${r.name}`} disabled={!can('edit')} onChange={async (v) => { await api.saveRow('fin_rules', { id: r.id, enabled: v }); rules.reload() }} />
                <div><strong>{r.name}</strong><small className="fin-muted">{KINDS[r.kind]} · {describe(r)} · הופעל {r.hits || 0} פעמים{r.last_hit_at ? `, לאחרונה ${ago(r.last_hit_at)}` : ''}</small></div>
                {can('edit') && <button type="button" className="fin-link" onClick={() => { const m = r.match || {}; const a = r.action || {}; setEdit({ ...r, ...m, ...a }) }}>עריכה</button>}
                {can('edit') && <button type="button" className="fin-link fin-link--danger" onClick={async () => { if (window.confirm(`למחוק את הכלל "${r.name}"?`)) { await api.deleteRow('fin_rules', r.id); rules.reload() } }}>מחיקה</button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edit && (
        <Modal title={edit.id ? 'עריכת כלל' : 'כלל חדש'} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-rule" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-rule" className="fin-form__grid" onSubmit={saveRule}>
            <Field label="שם הכלל" wide><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="סוג" wide><select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {edit.kind.startsWith('supplier_') && <Field label="ספק" wide><select required value={edit.supplier_id || ''} onChange={(e) => setEdit({ ...edit, supplier_id: e.target.value })}><option value="">בחרו…</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
            {edit.kind === 'keyword_project' && <Field label="מילה או ביטוי" wide><input required value={edit.keyword || ''} onChange={(e) => setEdit({ ...edit, keyword: e.target.value })} /></Field>}
            {edit.kind === 'sender_company' && <Field label="כתובת או דומיין של השולח" wide><input required value={edit.sender || ''} onChange={(e) => setEdit({ ...edit, sender: e.target.value })} dir="ltr" /></Field>}
            {edit.kind === 'amount_flag' && <Field label="סכום מינימלי (₪)" wide><input required type="number" value={edit.min_amount || ''} onChange={(e) => setEdit({ ...edit, min_amount: e.target.value })} /></Field>}
            {edit.kind.endsWith('_category') && <Field label="קטגוריה" wide><select required value={edit.category || ''} onChange={(e) => setEdit({ ...edit, category: e.target.value })}><option value="">בחרו…</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>}
            {edit.kind.endsWith('_company') && <Field label="חברה" wide><select required value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">בחרו…</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
            {edit.kind.endsWith('_project') && <Field label="פרויקט" wide><select required value={edit.project_id || ''} onChange={(e) => setEdit({ ...edit, project_id: e.target.value })}><option value="">בחרו…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
            <Field label="עדיפות (נמוך = קודם)"><input type="number" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} /></Field>
          </form>
        </Modal>
      )}
    </div>
  )
}
