import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { PROJECT_STATUS, counts, money, nameOf, signedTotal } from './format.js'
import { Empty, Field, Icon, Modal, PageHead, Pill } from './ui.jsx'

const BLANK = { name: '', code: '', business_id: '', location: '', status: 'active', assigned: [], keywords: [], notes: '' }
const TONE = { planning: 'info', active: 'ok', on_hold: 'warn', done: 'muted' }

export default function Projects() {
  const { projects, businesses, documents, members, can, reload, go } = useFinance()
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState('')
  const rows = useMemo(() => projects.filter((p) => !status || p.status === status).map((p) => {
    const docs = documents.filter((d) => d.project_id === p.id)
    const sup = {}
    for (const d of docs.filter(counts)) if (d.supplier_name) sup[d.supplier_name] = (sup[d.supplier_name] || 0) + signedTotal(d)
    return { ...p, docs: docs.length, total: docs.filter(counts).reduce((a, d) => a + signedTotal(d), 0), suppliers: Object.entries(sup).sort((a, b) => b[1] - a[1]).map(([n]) => n), pending: docs.filter((d) => d.status === 'review').length }
  }), [projects, documents, status])
  const suggested = documents.filter((d) => !d.project_id && d.suggestions?.project_id?.value && !['rejected', 'duplicate'].includes(d.status)).length

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { docs, total, suppliers, pending, ...row } = edit
      await api.saveRow('fin_projects', { ...row, business_id: row.business_id || null, code: row.code || null, keywords: (Array.isArray(row.keywords) ? row.keywords : String(row.keywords).split(',')).map((k) => k.trim()).filter(Boolean) })
      setEdit(null); reload()
    } catch (e2) { setErr(/fin_projects_code_uq/.test(e2.message) ? 'הקוד הזה כבר בשימוש' : e2.message) }
  }

  return (
    <div className="fin-stack">
      <PageHead title="פרויקטים" sub="כל הוצאה יכולה להשתייך לפרויקט נדל״ן. הסוכנים מציעים פרויקט לפי כללים, מילות מפתח והיסטוריה, ומשייכים אוטומטית רק כשזה ודאי.">
        {can('edit') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({ ...BLANK, business_id: businesses[0]?.id || '' })}><Icon name="plus" size={18} /> פרויקט חדש</button>}
      </PageHead>
      <div className="fin-filters">
        <div className="fin-tabs fin-tabs--plain" role="tablist" aria-label="סטטוס פרויקט">
          {[['', 'הכול'], ...Object.entries(PROJECT_STATUS)].map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={status === k} className={`fin-tab ${status === k ? 'is-active' : ''}`} onClick={() => setStatus(k)}>{v}</button>)}
        </div>
      </div>
      {suggested > 0 && <p className="fin-note"><Icon name="sparkle" size={16} /> ל-{suggested} מסמכים יש הצעת פרויקט שמחכה לאישור שלכם במסך המסמך.</p>}
      {!rows.length ? <Empty title="עוד אין פרויקטים" icon="project">הוסיפו את הפרויקטים הפעילים כדי לשייך אליהם הוצאות ולראות עלות לכל פרויקט.</Empty> : (
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead><tr><th>פרויקט</th><th className="fin-col-md">קוד</th><th className="fin-col-md">חברה</th><th className="fin-col-lg">מיקום</th><th>סטטוס</th><th className="fin-num">מסמכים</th><th className="fin-num">הוצאות</th><th className="fin-col-lg">ספקים עיקריים</th><th className="fin-col-lg">צוות</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} onClick={() => (can('edit') ? setEdit({ ...p, keywords: (p.keywords || []).join(', ') }) : go(`/documents?project=${p.id}`))}>
                  <td className="fin-td-main"><span className="fin-cell-main">{p.name}</span>{p.pending > 0 && <small className="fin-cell-sub">{p.pending} ממתינים</small>}</td>
                  <td className="fin-col-md fin-ltr" data-label="קוד">{p.code || '—'}</td>
                  <td className="fin-col-md" data-label="חברה">{nameOf(businesses, p.business_id) || '—'}</td>
                  <td className="fin-col-lg" data-label="מיקום">{p.location || '—'}</td>
                  <td><Pill tone={TONE[p.status]}>{PROJECT_STATUS[p.status]}</Pill></td>
                  <td className="fin-num" data-label="מסמכים">{p.docs}</td>
                  <td className="fin-num fin-td-total" data-label="הוצאות"><strong>{money(p.total)}</strong></td>
                  <td className="fin-col-lg" data-label="ספקים">{p.suppliers.slice(0, 3).join(', ') || '—'}</td>
                  <td className="fin-col-lg" data-label="צוות">{(p.assigned || []).map((u) => members.find((m) => m.user_id === u)?.full_name || members.find((m) => m.user_id === u)?.email).filter(Boolean).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? edit.name : 'פרויקט חדש'} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-project" className="fin-btn fin-btn--primary">שמירה</button>{edit.id && <button type="button" className="fin-btn" onClick={() => go(`/documents?project=${edit.id}`)}>למסמכי הפרויקט</button>}<button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-project" className="fin-form__grid" onSubmit={save}>
            <Field label="שם הפרויקט" wide><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="קוד פנימי"><input value={edit.code || ''} onChange={(e) => setEdit({ ...edit, code: e.target.value })} dir="ltr" /></Field>
            <Field label="חברה"><select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">—</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="מיקום"><input value={edit.location || ''} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
            <Field label="סטטוס"><select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="מילות מפתח לזיהוי (מופרדות בפסיק)" wide hint="למשל שם הרחוב או שם האתר. כשהן מופיעות במסמך, הסוכן מציע את הפרויקט"><input value={Array.isArray(edit.keywords) ? edit.keywords.join(', ') : edit.keywords} onChange={(e) => setEdit({ ...edit, keywords: e.target.value })} /></Field>
            <fieldset className="fin-field fin-field--wide fin-checkset"><legend className="fin-field__label">צוות משויך</legend>
              {members.filter((m) => m.active).map((m) => (
                <label key={m.user_id} className="fin-check"><input type="checkbox" checked={(edit.assigned || []).includes(m.user_id)} onChange={(e) => setEdit({ ...edit, assigned: e.target.checked ? [...(edit.assigned || []), m.user_id] : (edit.assigned || []).filter((u) => u !== m.user_id) })} /> {m.full_name || m.email}</label>
              ))}
            </fieldset>
            <Field label="הערות" wide><textarea rows={2} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            {err && <p className="fin-error fin-field--wide" role="alert">{err}</p>}
          </form>
        </Modal>
      )}
    </div>
  )
}
