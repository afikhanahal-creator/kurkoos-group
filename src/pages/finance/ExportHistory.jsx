import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { dateTime, money, monthLabel, nameOf } from './format.js'
import { buildPackage } from './exportPackage.js'
import { Empty, Icon, PageHead, Pill, useAsync, Skeleton } from './ui.jsx'

const FMT = { zip: 'ZIP', excel: 'Excel', csv: 'CSV', pdf: 'PDF', api: 'API', email: 'מייל' }
// the period is saved either as a month key (2026-11) or already in words; never show a broken date
const periodLabel = (p) => (!p ? 'מסמכים שנבחרו' : /^\d{4}-\d{2}$/.test(p) ? monthLabel(p) : p)
const destLabel = (d) => (!d ? '—' : d === 'download' ? 'הורדה למחשב' : d.startsWith('email:') ? d.slice(6) : d)

/* empty state: what an export is, in four steps, and where to start */
function FirstExport({ onStart }) {
  const [guide, setGuide] = useState(false)
  const steps = ['בוחרים מסמכים', 'בודקים את הסיכום', 'שולחים לרו״ח', 'רואים כאן מה נשלח']
  return (
    <section className="fin-firstexp">
      <svg className="fin-firstexp__art" viewBox="0 0 240 150" aria-hidden="true" direction="ltr">
        <g transform="translate(118 8) rotate(4 50 60)"><rect width="100" height="128" rx="10" fill="var(--ok-wash)" stroke="color-mix(in srgb, var(--ok) 35%, transparent)" /><rect width="100" height="24" rx="10" fill="color-mix(in srgb, var(--ok) 22%, var(--ok-wash))" /><text x="10" y="16" fontSize="12" fill="var(--ok)" textAnchor="start" fontFamily="system-ui, sans-serif" direction="ltr">export.xlsx</text><rect x="14" y="40" width="72" height="5" rx="2.5" fill="color-mix(in srgb, var(--ok) 30%, transparent)" /><rect x="30" y="54" width="56" height="5" rx="2.5" fill="color-mix(in srgb, var(--ok) 22%, transparent)" /><rect x="22" y="68" width="64" height="5" rx="2.5" fill="color-mix(in srgb, var(--ok) 22%, transparent)" /><rect x="40" y="82" width="46" height="5" rx="2.5" fill="color-mix(in srgb, var(--ok) 22%, transparent)" /></g>
        <g transform="translate(30 16) rotate(-4 50 60)"><rect width="100" height="128" rx="10" fill="var(--ocean-wash)" stroke="color-mix(in srgb, var(--ocean) 35%, transparent)" /><rect width="100" height="24" rx="10" fill="color-mix(in srgb, var(--ocean) 20%, var(--ocean-wash))" /><text x="10" y="16" fontSize="12" fill="var(--ocean)" textAnchor="start" fontFamily="system-ui, sans-serif" direction="ltr">receipt.pdf</text><rect x="14" y="40" width="72" height="5" rx="2.5" fill="color-mix(in srgb, var(--ocean) 35%, transparent)" /><rect x="34" y="54" width="52" height="5" rx="2.5" fill="color-mix(in srgb, var(--ocean) 22%, transparent)" /><rect x="44" y="68" width="42" height="5" rx="2.5" fill="color-mix(in srgb, var(--ocean) 22%, transparent)" /></g>
        <g transform="translate(108 104)"><circle r="18" fill="var(--sheet)" stroke="var(--line-2)" /><path d="M0 -7v13M-5 1l5 5 5-5" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></g>
      </svg>
      <h3>עוד לא נשלחו מסמכים לרו״ח</h3>
      <p>כל שליחה וכל ייצוא יופיעו כאן: מתי, מי שלח, לאן, כמה מסמכים ומה הסכום. אפשר להוריד שוב כל חבילה.</p>
      <ol className="fin-firstexp__steps">
        {steps.map((t, i) => <li key={t}><span>{i + 1}</span><small>{t}</small></li>)}
      </ol>
      <button type="button" className="fin-btn fin-btn--primary fin-btn--wide" onClick={onStart}>בחירת מסמכים לשליחה</button>
      <button type="button" className="fin-link" onClick={() => setGuide((v) => !v)} aria-expanded={guide}>מדריך שלב אחרי שלב</button>
      {guide && (
        <ol className="fin-guide__steps fin-firstexp__guide">
          <li><strong>בוחרים מסמכים.</strong> במסך "שליחה לרו״ח" מופיעים המסמכים שאושרו ועוד לא נשלחו. אפשר לסנן לפי תאריך, חברה ופרויקט, ולבטל מסמכים בודדים.</li>
          <li><strong>בודקים את הסיכום.</strong> מספר המסמכים, הסכום, החברות והתקופה מופיעים בסרגל התחתון, וגם מסמכים שעוד לא אושרו.</li>
          <li><strong>שולחים.</strong> רו״ח מקבל מייל אחד עם כל הקבצים המקוריים וקובץ סיכום לקליטה בתוכנה.</li>
          <li><strong>עוקבים.</strong> המסמכים מסומנים "נשלח לרו״ח" רק אחרי ששרת הדואר קיבל את ההודעה, והשליחה נרשמת כאן.</li>
        </ol>
      )}
    </section>
  )
}

export default function ExportHistory() {
  const { documents, businesses, projects, categories, can, go } = useFinance()
  const list = useAsync(() => api.loadExports(), [documents.length])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const again = async (x) => {
    setBusy(x.id); setMsg('')
    try {
      const docs = documents.filter((d) => x.document_ids.includes(d.id))
      if (docs.length < x.document_ids.length) setMsg(`${x.document_ids.length - docs.length} מסמכים מהייצוא כבר לא זמינים לך`)
      await buildPackage(docs, x.format === 'api' ? 'zip' : x.format, { businesses, projects, categories }, { period: x.period, company: nameOf(businesses, x.business_id) })
    } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }
  return (
    <div className="fin-stack">
      <PageHead title="היסטוריית ייצוא" sub="כל ייצוא נרשם: מתי, מי, לאן, כמה מסמכים ומה הסכום. אפשר להוריד שוב את אותה חבילה בדיוק." />
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {list.loading ? <Skeleton /> : !(list.data || []).length ? <FirstExport onStart={() => go(can('export') ? '/send' : '/documents')} /> : (
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead><tr><th>תאריך</th><th>חברה</th><th className="fin-col-md">תקופה</th><th className="fin-num">מסמכים</th><th className="fin-num">סה״כ</th><th className="fin-col-md fin-num">מע״מ</th><th className="fin-col-md">פורמט</th><th className="fin-col-lg">יעד</th><th className="fin-col-lg">משתמש</th><th>סטטוס</th><th /></tr></thead>
            <tbody>
              {list.data.map((x) => (
                <tr key={x.id} className="is-static">
                  <td className="fin-td-main"><span className="fin-cell-main">{dateTime(x.created_at)}</span></td>
                  <td data-label="חברה">{nameOf(businesses, x.business_id) || 'כל החברות'}</td>
                  <td className="fin-col-md" data-label="תקופה">{periodLabel(x.period)}</td>
                  <td className="fin-num" data-label="מסמכים">{x.doc_count}</td>
                  <td className="fin-num fin-td-total" data-label="סה״כ"><strong>{money(x.total)}</strong></td>
                  <td className="fin-col-md fin-num" data-label="מע״מ">{money(x.vat_total)}</td>
                  <td className="fin-col-md" data-label="פורמט">{FMT[x.format] || x.format}</td>
                  <td className="fin-col-lg" data-label="יעד" dir="auto">{destLabel(x.destination)}</td>
                  <td className="fin-col-lg" data-label="משתמש" dir="ltr">{x.user_email}</td>
                  <td><Pill tone={x.status === 'done' ? 'ok' : x.status === 'failed' ? 'bad' : 'info'}>{x.status === 'done' ? 'הושלם' : x.status === 'failed' ? 'נכשל' : 'ממתין'}</Pill></td>
                  <td><button type="button" className="fin-btn fin-btn--sm" onClick={() => again(x)} disabled={!!busy}><Icon name="download" size={16} /> {busy === x.id ? 'מכין…' : 'הורדה'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
