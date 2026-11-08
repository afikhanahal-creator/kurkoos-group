import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago, dateTime, nameOf } from './format.js'
import { Empty, Field, Icon, Modal, PageHead, Pill, Toggle, useAsync } from './ui.jsx'

const FREQ = { daily: 'כל יום', weekly: 'כל שבוע', monthly: 'כל חודש', on_event: 'בכל מסמך' }
/* condition → action. "strength" is how much the rule weighs against other signals (see server/finance/assign.js) */
export const KINDS = {
  recipient_company: { label: 'ח.פ הנמען ← חברה', cond: 'reg_number', act: 'business_id', strength: 'חזק מאוד (0.99)' },
  supplier_category: { label: 'ספק ← קטגוריה', cond: 'supplier', act: 'category', strength: 'חזק (0.97)' },
  project_code: { label: 'קוד פרויקט במסמך ← פרויקט', cond: 'code', act: 'project_id', strength: 'חזק (0.97)' },
  supplier_company: { label: 'ספק ← חברה', cond: 'supplier', act: 'business_id', strength: 'בינוני (0.9)' },
  sender_company: { label: 'שולח המייל ← חברה', cond: 'sender', act: 'business_id', strength: 'בינוני (0.9)' },
  supplier_project: { label: 'ספק ← פרויקט', cond: 'supplier', act: 'project_id', strength: 'בינוני (0.9)' },
  keyword_project: { label: 'מילה במסמך ← פרויקט', cond: 'keyword', act: 'project_id', strength: 'בינוני (0.9)' },
  keyword_category: { label: 'מילה במסמך ← קטגוריה', cond: 'keyword', act: 'category', strength: 'בינוני (0.9)' },
  amount_approval: { label: 'סכום מעל ← שני מאשרים', cond: 'min_amount', act: null, strength: 'בקרה' },
  amount_flag: { label: 'סכום מעל ← סימון לבדיקה', cond: 'min_amount', act: null, strength: 'בקרה' },
  missing_vat_flag: { label: 'חסר ח.פ ספק ← סימון', cond: null, act: null, strength: 'בקרה' },
}
const OUTCOME = { applied: ['ok', 'הוחל'], suggested: ['info', 'הוצע'], flagged: ['warn', 'סומן'], overridden: ['muted', 'נדחה מפני סימן חזק יותר'] }

export default function Automations() {
  const { suppliers, businesses, projects, categories, members, can, reload: reloadAll } = useFinance()
  const autos = useAsync(() => api.loadAutomations(), [])
  const rules = useAsync(() => api.loadRules(), [])
  const hits = useAsync(() => api.loadRuleHits(300), [rules.data])
  const [edit, setEdit] = useState(null)
  const [hist, setHist] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const admin = can('manage')
  const who = (uid) => members.find((m) => m.user_id === uid)?.full_name || members.find((m) => m.user_id === uid)?.email || ''
  const hitsOf = useMemo(() => { const o = {}; for (const h of hits.data || []) (o[h.rule_id] ||= []).push(h); return o }, [hits.data])

  const updateAuto = async (a, patch) => { try { await api.updateAutomation(a.key, patch) } catch (e) { setMsg(e.message) } autos.reload() }
  const runNow = async () => {
    setBusy('run'); setMsg('')
    try { const { results } = await api.callServer('run-daily'); setMsg(results.map((r) => `${r.key}: ${r.status === 'ok' ? 'הצליחה' : r.status}${r.error ? ` (${r.error})` : ''}`).join(' · ')); autos.reload(); reloadAll() } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }
  const saveRule = async (e) => {
    e.preventDefault()
    const r = edit; const k = KINDS[r.kind]
    const match = k.cond === 'supplier' ? { supplier_id: r.supplier_id } : k.cond === 'keyword' ? { keyword: r.keyword } : k.cond === 'sender' ? { sender: r.sender } : k.cond === 'code' ? { code: r.code } : k.cond === 'reg_number' ? { reg_number: String(r.reg_number || '').replace(/\D/g, '') } : k.cond === 'min_amount' ? { min_amount: Number(r.min_amount) } : {}
    const action = k.act === 'category' ? { category: r.category } : k.act === 'business_id' ? { business_id: r.business_id } : k.act === 'project_id' ? { project_id: r.project_id } : {}
    try { await api.saveRow('fin_rules', { id: r.id, name: r.name, kind: r.kind, match, action, enabled: r.enabled !== false, priority: Number(r.priority) || 100 }); setEdit(null); rules.reload(); setMsg('הכלל נשמר') } catch (e2) { setMsg(e2.message) }
  }
  const describe = (r) => {
    const m = r.match || {}; const a = r.action || {}
    const left = m.supplier_id ? nameOf(suppliers, m.supplier_id) : m.keyword ? `"${m.keyword}"` : m.sender || (m.code ? `קוד ${m.code}` : '') || (m.reg_number ? `ח.פ ${m.reg_number}` : '') || (m.min_amount ? `מעל ₪${Number(m.min_amount).toLocaleString('he-IL')}` : 'כל מסמך')
    const right = a.category || nameOf(businesses, a.business_id) || nameOf(projects, a.project_id) || (r.kind === 'amount_approval' ? 'שני מאשרים' : 'סימון לבדיקה')
    return `${left} ← ${right}`
  }

  return (
    <div className="fin-stack">
      <PageHead title="כללים ואוטומציה" sub="כללים משייכים ומסמנים, ואדם מאשר. סדר ההכרעה: מספר רישום מודפס של החברה הנמענת גובר תמיד; אחריו הכללים לפי עדיפות; אחריהם ברירות מחדל של ספקים, היסטוריה, ולבסוף הצעת AI.">
        {admin && <button type="button" className="fin-btn fin-btn--ghost" onClick={runNow} disabled={!!busy}><Icon name="play" size={17} /> {busy ? 'רץ…' : 'הרצת הריצה היומית'}</button>}
        {admin && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({ name: '', kind: 'supplier_category', enabled: true, priority: 100 })}><Icon name="plus" size={17} /> כלל חדש</button>}
      </PageHead>
      {msg && <p className="fin-note" role="status">{msg}</p>}

      <section className="fin-panel-block">
        <div className="fin-panel-block__head"><h3>כללי שיוך ובקרה</h3><span className="fin-muted">{(rules.data || []).length} כללים</span></div>
        {!(rules.data || []).length ? <Empty title="עוד אין כללים" icon="rules">למשל: ספק Meta Platforms ← פרסום ושיווק. או: קוד MOH-17 בחשבונית ← פרויקט מוהליבר 17.</Empty> : (
          <div className="fin-table-wrap fin-table-wrap--flat">
            <table className="fin-table fin-table--plain">
              <thead><tr><th>פעיל</th><th>עדיפות</th><th>כלל</th><th className="fin-col-md">משקל</th><th className="fin-num">הפעלות</th><th className="fin-col-lg">שונה לאחרונה</th><th /></tr></thead>
              <tbody>
                {rules.data.map((r) => (
                  <tr key={r.id}>
                    <td><Toggle checked={r.enabled} label={`הפעלת ${r.name}`} disabled={!admin} onChange={async (v) => { await api.saveRow('fin_rules', { id: r.id, enabled: v }); rules.reload() }} /></td>
                    <td className="fin-num">{r.priority}</td>
                    <td className="fin-td-main"><span className="fin-cell-main">{r.name}</span><small className="fin-cell-sub fin-wrap">{KINDS[r.kind]?.label}: {describe(r)}</small></td>
                    <td className="fin-col-md">{KINDS[r.kind]?.strength}</td>
                    <td className="fin-num"><button type="button" className="fin-link" onClick={() => setHist(r)}>{r.hits || 0}</button>{r.last_hit_at && <small className="fin-cell-sub">{ago(r.last_hit_at)}</small>}</td>
                    <td className="fin-col-lg">{r.updated_at ? `${who(r.updated_by) || '—'}, ${ago(r.updated_at)}` : '—'}</td>
                    <td className="fin-row-actions">
                      {admin && <button type="button" className="fin-link" onClick={() => setEdit({ ...r, ...(r.match || {}), ...(r.action || {}) })}>עריכה</button>}
                      {admin && <button type="button" className="fin-link fin-link--danger" onClick={async () => { if (window.confirm(`למחוק את הכלל "${r.name}"? המחיקה נרשמת ביומן.`)) { await api.deleteRow('fin_rules', r.id); rules.reload() } }}>מחיקה</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!admin && <p className="fin-muted fin-small">רק מנהל מערכת משנה כללים גלובליים.</p>}
      </section>

      <section className="fin-panel-block">
        <div className="fin-panel-block__head"><h3>אוטומציות מתוזמנות</h3></div>
        <div className="fin-table-wrap fin-table-wrap--flat">
          <table className="fin-table fin-table--plain">
            <thead><tr><th>פעיל</th><th>אוטומציה</th><th className="fin-col-md">תדירות</th><th>ריצה אחרונה</th><th className="fin-col-md">הבאה</th><th>מצב</th></tr></thead>
            <tbody>
              {(autos.data || []).map((a) => (
                <tr key={a.key}>
                  <td><Toggle checked={a.enabled} onChange={(v) => updateAuto(a, { enabled: v })} label={`הפעלת ${a.name}`} disabled={!admin} /></td>
                  <td className="fin-td-main"><span className="fin-cell-main">{a.name}</span><small className="fin-cell-sub fin-wrap">{a.description}</small>
                    {a.key === 'amount_flag' && <label className="fin-inline-label">סף: <input type="number" className="fin-select fin-select--sm" defaultValue={a.config?.min_amount || 50000} disabled={!admin} onBlur={(e) => updateAuto(a, { config: { ...a.config, min_amount: Number(e.target.value) } })} /> ₪</label>}
                    {a.key === 'retry_failed' && <label className="fin-inline-label">ניסיונות: <input type="number" min="1" max="10" className="fin-select fin-select--sm" defaultValue={a.config?.max_attempts || 3} disabled={!admin} onBlur={(e) => updateAuto(a, { config: { ...a.config, max_attempts: Number(e.target.value) } })} /></label>}
                  </td>
                  <td className="fin-col-md">{FREQ[a.frequency]}</td>
                  <td>{a.last_run_at ? ago(a.last_run_at) : 'עוד לא רצה'}</td>
                  <td className="fin-col-md">{a.next_run_at ? dateTime(a.next_run_at) : a.frequency === 'on_event' ? 'בכל מסמך' : 'בריצה היומית'}</td>
                  <td>{a.last_status ? <Pill tone={a.last_status === 'ok' ? 'ok' : a.last_status === 'error' ? 'bad' : 'muted'}>{a.last_status === 'ok' ? 'הצליחה' : a.last_status === 'error' ? 'נכשלה' : a.last_status === 'not_today' ? 'לא היום' : a.last_status}</Pill> : <Pill>—</Pill>}{a.last_error && <small className="fin-cell-err fin-wrap"> {a.last_error}</small>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit && (() => {
        const k = KINDS[edit.kind]
        return (
          <Modal title={edit.id ? 'עריכת כלל' : 'כלל חדש'} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-rule" className="fin-btn fin-btn--primary">שמירת הכלל</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></>}>
            <form id="fin-rule" className="fin-form__grid" onSubmit={saveRule}>
              <Field label="שם הכלל" wide><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="סוג" wide hint={`משקל: ${k.strength}`}><select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>{Object.entries(KINDS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}</select></Field>
              {k.cond === 'supplier' && <Field label="תנאי: הספק" wide><select required value={edit.supplier_id || ''} onChange={(e) => setEdit({ ...edit, supplier_id: e.target.value })}><option value="">בחרו…</option>{suppliers.filter((s) => s.status !== 'archived').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
              {k.cond === 'keyword' && <Field label="תנאי: מילה או ביטוי במסמך" wide><input required value={edit.keyword || ''} onChange={(e) => setEdit({ ...edit, keyword: e.target.value })} /></Field>}
              {k.cond === 'code' && <Field label="תנאי: קוד שמופיע במסמך" wide><input required value={edit.code || ''} onChange={(e) => setEdit({ ...edit, code: e.target.value })} dir="ltr" /></Field>}
              {k.cond === 'sender' && <Field label="תנאי: כתובת או דומיין השולח" wide><input required value={edit.sender || ''} onChange={(e) => setEdit({ ...edit, sender: e.target.value })} dir="ltr" /></Field>}
              {k.cond === 'reg_number' && <Field label="תנאי: ח.פ הנמען במסמך" wide><input required inputMode="numeric" value={edit.reg_number || ''} onChange={(e) => setEdit({ ...edit, reg_number: e.target.value })} dir="ltr" /></Field>}
              {k.cond === 'min_amount' && <Field label="תנאי: סכום מינימלי (₪)" wide><input required type="number" value={edit.min_amount || ''} onChange={(e) => setEdit({ ...edit, min_amount: e.target.value })} /></Field>}
              {k.act === 'category' && <Field label="פעולה: קטגוריה" wide><select required value={edit.category || ''} onChange={(e) => setEdit({ ...edit, category: e.target.value })}><option value="">בחרו…</option>{categories.filter((c) => c.active !== false).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>}
              {k.act === 'business_id' && <Field label="פעולה: חברה" wide><select required value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">בחרו…</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
              {k.act === 'project_id' && <Field label="פעולה: פרויקט" wide><select required value={edit.project_id || ''} onChange={(e) => setEdit({ ...edit, project_id: e.target.value })}><option value="">בחרו…</option>{projects.filter((p) => !p.archived_at).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
              <Field label="עדיפות (נמוך = קודם)"><input type="number" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} /></Field>
            </form>
          </Modal>
        )
      })()}

      {hist && (
        <Modal title={`היסטוריית הפעלות: ${hist.name}`} onClose={() => setHist(null)} wide>
          {!(hitsOf[hist.id] || []).length ? <p className="fin-muted">הכלל עוד לא הופעל.</p> : (
            <table className="fin-table fin-table--plain"><thead><tr><th>מתי</th><th>תוצאה</th><th>פירוט</th><th /></tr></thead>
              <tbody>{hitsOf[hist.id].map((h) => <tr key={h.id}><td>{dateTime(h.at)}</td><td><Pill tone={OUTCOME[h.outcome]?.[0]}>{OUTCOME[h.outcome]?.[1] || h.outcome}</Pill></td><td className="fin-wrap">{h.detail}</td><td>{h.document_id && <a className="fin-link" href={`/admin/finance/documents/${h.document_id}`}>למסמך</a>}</td></tr>)}</tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}
