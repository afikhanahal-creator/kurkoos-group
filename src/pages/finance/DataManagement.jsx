import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { STATUS, dateTime, toCsv } from './format.js'
import { saveBlob } from './zip.js'
import { Card, Field, Icon, PageHead, useAsync } from './ui.jsx'
import { ActivityFeed } from './Dashboard.jsx'

export default function DataManagement() {
  const { documents, categories, can, reload, go } = useFinance()
  const usage = useAsync(() => api.storageUsage(), [])
  const audit = useAsync(() => api.loadAudit({ limit: 60 }), [documents.length])
  const [cat, setCat] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const pct = usage.data ? (usage.data.storage_bytes / 1024 ** 3) * 100 : null
  const finBytes = usage.data?.buckets?.['finance-docs'] || 0
  const byStatus = Object.keys(STATUS).map((s) => [s, documents.filter((d) => d.status === s).length])

  const retry = async () => {
    setBusy('retry'); setMsg('')
    try { const r = await api.callServer('retry-failed'); setMsg(`נוסו מחדש ${r.retried || 0} מסמכים, ${r.recovered || 0} נקראו בהצלחה`); reload() } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }
  const backup = () => {
    const cols = ['id', 'status', 'supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'payment_date', 'accounting_period', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'category', 'business_id', 'project_id', 'source', 'email_from', 'email_subject', 'file_name', 'file_path', 'file_hash', 'approved_at', 'exported_at', 'created_at']
    saveBlob(new Blob([toCsv(cols, documents.map((d) => cols.map((c) => d[c])))], { type: 'text/csv;charset=utf-8' }), `kurkoos-finance-backup-${new Date().toISOString().slice(0, 10)}.csv`)
    saveBlob(new Blob([JSON.stringify({ exported_at: new Date().toISOString(), documents, categories }, null, 1)], { type: 'application/json' }), `kurkoos-finance-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }
  const saveCat = async (e) => {
    e.preventDefault()
    try { await api.saveRow('fin_categories', { ...cat, vat_deductible_pct: Number(cat.vat_deductible_pct) }); setCat(null); reload() } catch (e2) { setMsg(e2.message) }
  }

  return (
    <div className="fin-stack">
      <PageHead title="ניהול נתונים" sub="קטגוריות, אחסון, ניסיונות חוזרים, גיבוי ויומן הפעולות" />
      {msg && <p className="fin-note" role="status">{msg}</p>}
      <div className="fin-grid">
        <Card title="אחסון הקבצים">
          {pct === null ? <p className="fin-muted">{usage.loading ? 'טוען…' : 'הפונקציה storage_usage לא זמינה.'}</p> : (
            <>
              <div className={`fin-meter ${pct >= 75 ? 'is-bad' : pct >= 60 ? 'is-warn' : ''}`} role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="שימוש באחסון"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
              <p className="fin-muted">{pct.toFixed(1)}% מ-1GB (התוכנית החינמית, משותף לכל הארגון). מסמכי הכספים: {(finBytes / 1024 ** 2).toFixed(1)}MB. הייבוא נעצר ב-75%.</p>
            </>
          )}
          <p className="fin-muted">שמירת קבצים: הקבצים המקוריים נשמרים לצמיתות בדלי פרטי. מחיקה רק ע״י מנהל, ונרשמת ביומן.</p>
        </Card>
        <Card title="מצב המסמכים">
          <ul className="fin-kv">{byStatus.map(([s, n]) => <li key={s}><span>{STATUS[s].label}</span><strong>{n}</strong></li>)}</ul>
          <div className="fin-form__actions">
            <button type="button" className="fin-btn" onClick={retry} disabled={!!busy || !documents.some((d) => d.status === 'failed')}><Icon name="sync" size={18} /> {busy === 'retry' ? 'מנסה…' : 'ניסיון חוזר לשגיאות'}</button>
            <button type="button" className="fin-btn" onClick={() => go('/documents?status=problems')}>לשגיאות</button>
          </div>
        </Card>
        <Card title="גיבוי">
          <p className="fin-muted">הורדה של כל רשומות המסמכים (CSV ו-JSON). מסד הנתונים עצמו מגובה ע״י Supabase; בתוכנית החינמית אין גיבוי נקודתי, ולכן מומלץ להוריד גיבוי חודשי.</p>
          <button type="button" className="fin-btn" onClick={backup}><Icon name="download" size={18} /> הורדת גיבוי</button>
        </Card>
        <Card title="קטגוריות הוצאה" actions={can('edit') && <button type="button" className="fin-link" onClick={() => setCat({ name: '', vat_deductible_pct: 100, sort: categories.length + 1 })}>הוספה</button>}>
          <table className="fin-table fin-table--plain">
            <thead><tr><th>קטגוריה</th><th className="fin-num">קיזוז מע״מ</th><th className="fin-num">מסמכים</th><th /></tr></thead>
            <tbody>{categories.map((c) => <tr key={c.id}><td>{c.name}</td><td className="fin-num">{Number(c.vat_deductible_pct)}%</td><td className="fin-num">{documents.filter((d) => d.category === c.name).length}</td><td>{can('edit') && <button type="button" className="fin-link" onClick={() => setCat(c)}>עריכה</button>}</td></tr>)}</tbody>
          </table>
          {cat && (
            <form className="fin-inline-form" onSubmit={saveCat}>
              <Field label="שם"><input required value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} /></Field>
              <Field label="% קיזוז מע״מ"><input type="number" min="0" max="100" step="0.01" value={cat.vat_deductible_pct} onChange={(e) => setCat({ ...cat, vat_deductible_pct: e.target.value })} /></Field>
              <button type="submit" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setCat(null)}>ביטול</button>
            </form>
          )}
          <p className="fin-muted">אחוזי הקיזוז הם ברירת מחדל מקובלת. כדאי לאשר אותם מול רו״ח.</p>
        </Card>
      </div>
      <Card title="יומן פעולות (Audit log)">
        {audit.loading ? <p className="fin-muted">טוען…</p> : <ActivityFeed items={audit.data || []} documents={documents} go={go} />}
        <p className="fin-muted">כל יצירה, תיקון, אישור, דחייה, ייצוא ומחיקה נרשמים עם המשתמש והשעה ({dateTime(new Date())}).</p>
      </Card>
    </div>
  )
}
