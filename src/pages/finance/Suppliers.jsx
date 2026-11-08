import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { counts, date, docDate, money, nameOf, signedTotal } from './format.js'
import { Empty, Field, Icon, Modal, PageHead } from './ui.jsx'

export default function Suppliers() {
  const { suppliers, documents, categories, businesses, projects, can, reload, go } = useFinance()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const year = String(new Date().getFullYear())
  const rows = useMemo(() => suppliers.map((s) => {
    const docs = documents.filter((d) => counts(d) && d.supplier_id === s.id)
    return { ...s, count: docs.length, year: docs.filter((d) => String(docDate(d)).startsWith(year)).reduce((a, d) => a + signedTotal(d), 0), last: docs.map(docDate).sort().pop() }
  }).filter((s) => !q || `${s.name} ${s.vat_id || ''} ${s.email_domain || ''}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.year - a.year), [suppliers, documents, q, year])

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { count, year: y, last, ...row } = edit
      await api.saveRow('fin_suppliers', { ...row, vat_id: row.vat_id || null, default_business_id: row.default_business_id || null, default_project_id: row.default_project_id || null, default_category: row.default_category || null })
      setEdit(null); reload()
    } catch (e2) { setErr(/vat_uq/.test(e2.message) ? 'כבר יש ספק עם מספר העוסק הזה' : e2.message) }
  }

  return (
    <div className="fin-stack">
      <PageHead title="ספקים" sub="ספקים נוצרים לבד מהמסמכים. ברירות המחדל של כל ספק (קטגוריה, חברה, פרויקט) חלות על המסמכים הבאים שלו, לא על מסמכים שכבר אושרו.">
        {can('edit') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({ name: '', vat_id: '', email_domain: '', default_category: '', default_business_id: '', default_project_id: '', notes: '' })}><Icon name="plus" size={18} /> ספק חדש</button>}
      </PageHead>
      <div className="fin-filters"><label className="fin-search"><Icon name="search" size={18} /><input type="search" placeholder="חיפוש ספק, ח.פ או דומיין…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש ספק" /></label></div>
      {!rows.length ? <Empty title="עוד אין ספקים" icon="suppliers">ספקים נוצרים לבד מהחשבוניות שנקראות.</Empty> : (
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead><tr><th>ספק</th><th className="fin-col-md">ח.פ</th><th className="fin-col-lg">קטגוריה קבועה</th><th className="fin-col-lg">חברה / פרויקט</th><th className="fin-num">מסמכים</th><th className="fin-num">השנה</th><th className="fin-col-md">אחרון</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => (can('edit') ? setEdit(s) : go(`/documents?supplier=${s.id}`))}>
                  <td className="fin-td-main"><span className="fin-cell-main">{s.name}</span>{s.email_domain && <small className="fin-cell-sub" dir="ltr">{s.email_domain}</small>}</td>
                  <td className="fin-col-md fin-ltr" data-label="ח.פ">{s.vat_id || '—'}</td>
                  <td className="fin-col-lg" data-label="קטגוריה">{s.default_category || '—'}</td>
                  <td className="fin-col-lg" data-label="שיוך">{[nameOf(businesses, s.default_business_id), nameOf(projects, s.default_project_id)].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="fin-num" data-label="מסמכים">{s.count}</td>
                  <td className="fin-num fin-td-total" data-label="השנה"><strong>{money(s.year)}</strong></td>
                  <td className="fin-col-md" data-label="אחרון">{date(s.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? edit.name : 'ספק חדש'} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-supplier" className="fin-btn fin-btn--primary">שמירה</button>{edit.id && <button type="button" className="fin-btn" onClick={() => go(`/documents?supplier=${edit.id}`)}>למסמכים</button>}<button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-supplier" className="fin-form__grid" onSubmit={save}>
            <Field label="שם" wide><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="ח.פ / ע.מ"><input value={edit.vat_id || ''} onChange={(e) => setEdit({ ...edit, vat_id: e.target.value.replace(/\D/g, '') })} inputMode="numeric" dir="ltr" /></Field>
            <Field label="דומיין המייל"><input value={edit.email_domain || ''} onChange={(e) => setEdit({ ...edit, email_domain: e.target.value })} dir="ltr" /></Field>
            <Field label="קטגוריה קבועה"><select value={edit.default_category || ''} onChange={(e) => setEdit({ ...edit, default_category: e.target.value })}><option value="">לפי הסוכן</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
            <Field label="חברה קבועה"><select value={edit.default_business_id || ''} onChange={(e) => setEdit({ ...edit, default_business_id: e.target.value })}><option value="">—</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="פרויקט קבוע" wide><select value={edit.default_project_id || ''} onChange={(e) => setEdit({ ...edit, default_project_id: e.target.value })}><option value="">—</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="הערות" wide><textarea rows={2} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            {err && <p className="fin-error fin-field--wide" role="alert">{err}</p>}
          </form>
        </Modal>
      )}
    </div>
  )
}
