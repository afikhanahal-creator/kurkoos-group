import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { Icon } from './ui.jsx'

function Editable({ title, hint, table, rows, columns, blank, onChange }) {
  const [draft, setDraft] = useState(null)
  const [err, setErr] = useState('')
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try { await api.saveRow(table, draft); setDraft(null); onChange() } catch (e2) { setErr(e2.message) }
  }
  const remove = async (r) => {
    if (!window.confirm(`למחוק את "${r.name}"?`)) return
    try { await api.deleteRow(table, r.id); onChange() } catch (e) { setErr(e.message) }
  }
  return (
    <section className="fin-card">
      <div className="fin-card__head">
        <div><h2 className="fin-card__title">{title}</h2>{hint && <p className="fin-muted">{hint}</p>}</div>
        <button type="button" className="fin-btn" onClick={() => setDraft({ ...blank })}><Icon name="plus" size={18} /> הוספה</button>
      </div>
      <table className="fin-table fin-table--plain">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.num ? 'fin-num' : ''}>{c.label}</th>)}<th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => <td key={c.key} className={c.num ? 'fin-num' : ''}>{r[c.key] ?? '—'}</td>)}
              <td className="fin-row-actions"><button type="button" className="fin-link" onClick={() => setDraft(r)}>עריכה</button><button type="button" className="fin-link fin-link--danger" onClick={() => remove(r)}>מחיקה</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {draft && (
        <form className="fin-inline-form" onSubmit={save}>
          {columns.map((c) => (
            <label key={c.key} className="fin-field">{c.label}
              <input required={c.key === 'name'} type={c.num ? 'number' : c.type || 'text'} step="0.01" value={draft[c.key] ?? ''} onChange={(e) => setDraft({ ...draft, [c.key]: c.num ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value })} dir={c.ltr ? 'ltr' : undefined} />
            </label>
          ))}
          <button type="submit" className="fin-btn fin-btn--primary">שמירה</button>
          <button type="button" className="fin-btn" onClick={() => setDraft(null)}>ביטול</button>
        </form>
      )}
      {err && <p className="fin-error" role="alert">{err}</p>}
    </section>
  )
}

const SETUP = [
  ['SUPABASE_SERVICE_ROLE_KEY', 'גישת השרת למסד הנתונים ולקבצים'],
  ['ANTHROPIC_API_KEY', 'קריאת החשבוניות ע״י Claude'],
  ['GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET', 'חיבור Gmail (OAuth, Google Cloud Console)'],
  ['CRON_SECRET', 'הסריקה האוטומטית היומית'],
]

export default function Settings() {
  const { businesses, categories, reload } = useFinance()
  return (
    <div className="fin-stack">
      <Editable
        title="החברות בקבוצה"
        hint="כל מסמך משויך לחברה. Claude מזהה את החברה לפי הח.פ של הלקוח בחשבונית."
        table="fin_businesses"
        rows={businesses}
        columns={[{ key: 'name', label: 'שם' }, { key: 'vat_id', label: 'ח.פ' }, { key: 'accountant_email', label: 'מייל רו״ח', type: 'email', ltr: true }]}
        blank={{ name: '', vat_id: '', accountant_email: '', sort: businesses.length }}
        onChange={reload}
      />
      <Editable
        title="קטגוריות הוצאה"
        hint="אחוז הקיזוז קובע כמה מהמע״מ נספר כמע״מ תשומות (למשל רכב 66.67%, כיבוד 0%). כדאי לאשר את האחוזים מול רו״ח."
        table="fin_categories"
        rows={categories}
        columns={[{ key: 'name', label: 'שם' }, { key: 'vat_deductible_pct', label: '% קיזוז מע״מ', num: true }]}
        blank={{ name: '', vat_deductible_pct: 100, sort: categories.length + 1 }}
        onChange={reload}
      />
      <section className="fin-card">
        <h2 className="fin-card__title">הגדרות שרת (Vercel)</h2>
        <p className="fin-muted">המפתחות נשמרים רק ב-Vercel › Settings › Environment Variables, אף פעם לא בקוד. ההסבר המלא: docs/finance/README.md</p>
        <ul className="fin-setup">{SETUP.map(([k, v]) => <li key={k}><code dir="ltr">{k}</code><span>{v}</span></li>)}</ul>
      </section>
    </div>
  )
}
