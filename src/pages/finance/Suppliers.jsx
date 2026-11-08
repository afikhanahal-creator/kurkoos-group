import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { counts, date, docDate, money, signedTotal } from './format.js'
import { Empty, Icon } from './ui.jsx'

/* every supplier with its spend, and the defaults that new documents from it inherit */
export default function Suppliers() {
  const { suppliers, documents, categories, businesses, reload, go } = useFinance()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')

  const rows = useMemo(() => {
    const year = String(new Date().getFullYear())
    return suppliers.map((s) => {
      const docs = documents.filter((d) => counts(d) && (d.supplier_id === s.id || (!d.supplier_id && d.supplier_name === s.name)))
      const last = docs.map(docDate).sort().pop()
      return { ...s, count: docs.length, year: docs.filter((d) => String(docDate(d)).startsWith(year)).reduce((a, d) => a + signedTotal(d), 0), last }
    }).filter((s) => !q || `${s.name} ${s.vat_id || ''} ${s.email_domain || ''}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.year - a.year)
  }, [suppliers, documents, q])

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { count, year, last, ...row } = edit
      await api.saveRow('fin_suppliers', { ...row, vat_id: row.vat_id || null, default_business_id: row.default_business_id || null, default_category: row.default_category || null })
      setEdit(null); reload()
    } catch (e2) { setErr(e2.message) }
  }

  return (
    <div className="fin-stack">
      <div className="fin-filters">
        <label className="fin-search"><Icon name="search" size={18} /><input type="search" placeholder="חיפוש ספק…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש ספק" /></label>
        <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({ name: '', vat_id: '', email_domain: '', default_category: '', default_business_id: '', notes: '' })}><Icon name="plus" size={18} /> ספק חדש</button>
      </div>
      {!rows.length ? <Empty title="עוד אין ספקים">ספקים נוצרים לבד מהחשבוניות שנקראות.</Empty> : (
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead><tr><th>ספק</th><th className="fin-hide-sm">ח.פ</th><th className="fin-hide-sm">קטגוריה קבועה</th><th className="fin-num">מסמכים</th><th className="fin-num">השנה</th><th className="fin-hide-sm">אחרון</th><th /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => setEdit(s)}>
                  <td><span className="fin-cell-main">{s.name}</span>{s.email_domain && <small className="fin-cell-sub">{s.email_domain}</small>}</td>
                  <td className="fin-hide-sm">{s.vat_id || '—'}</td>
                  <td className="fin-hide-sm">{s.default_category || '—'}</td>
                  <td className="fin-num">{s.count}</td>
                  <td className="fin-num"><strong>{money(s.year)}</strong></td>
                  <td className="fin-hide-sm">{date(s.last)}</td>
                  <td onClick={(e) => e.stopPropagation()}><button type="button" className="fin-link" onClick={() => go(`/documents?q=${encodeURIComponent(s.name)}`)}>מסמכים</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <div className="fin-panel" role="dialog" aria-modal="true" aria-label="עריכת ספק">
          <button type="button" className="fin-panel__scrim" aria-label="סגירה" onClick={() => setEdit(null)} />
          <form className="fin-panel__body fin-panel__body--narrow fin-form" onSubmit={save}>
            <header className="fin-panel__head"><h2>{edit.id ? edit.name : 'ספק חדש'}</h2><button type="button" className="fin-icon-btn" onClick={() => setEdit(null)} aria-label="סגירה"><Icon name="close" /></button></header>
            <div className="fin-form__grid">
              <label className="fin-field fin-field--wide">שם<input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
              <label className="fin-field">ח.פ / ע.מ<input value={edit.vat_id || ''} onChange={(e) => setEdit({ ...edit, vat_id: e.target.value.replace(/\D/g, '') })} inputMode="numeric" /></label>
              <label className="fin-field">דומיין המייל<input value={edit.email_domain || ''} onChange={(e) => setEdit({ ...edit, email_domain: e.target.value })} dir="ltr" /></label>
              <label className="fin-field">קטגוריה קבועה
                <select value={edit.default_category || ''} onChange={(e) => setEdit({ ...edit, default_category: e.target.value })}><option value="">לפי Claude</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              </label>
              <label className="fin-field">חברה קבועה
                <select value={edit.default_business_id || ''} onChange={(e) => setEdit({ ...edit, default_business_id: e.target.value })}><option value="">—</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              </label>
              <label className="fin-field fin-field--wide">הערות<textarea rows={3} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
            </div>
            {err && <p className="fin-error" role="alert">{err}</p>}
            <div className="fin-form__actions"><button type="submit" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
