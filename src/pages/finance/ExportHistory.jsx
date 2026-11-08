import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { dateTime, money, monthLabel, nameOf } from './format.js'
import { buildPackage } from './exportPackage.js'
import { Empty, Icon, PageHead, Pill, useAsync, Skeleton } from './ui.jsx'

const FMT = { zip: 'ZIP', excel: 'Excel', csv: 'CSV', pdf: 'PDF', api: 'API' }

export default function ExportHistory() {
  const { documents, businesses, projects, categories } = useFinance()
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
      {list.loading ? <Skeleton /> : !(list.data || []).length ? <Empty title="עוד לא בוצע ייצוא" icon="history" /> : (
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead><tr><th>תאריך</th><th>חברה</th><th className="fin-col-md">תקופה</th><th className="fin-num">מסמכים</th><th className="fin-num">סה״כ</th><th className="fin-col-md fin-num">מע״מ</th><th className="fin-col-md">פורמט</th><th className="fin-col-lg">יעד</th><th className="fin-col-lg">משתמש</th><th>סטטוס</th><th /></tr></thead>
            <tbody>
              {list.data.map((x) => (
                <tr key={x.id} className="is-static">
                  <td className="fin-td-main"><span className="fin-cell-main">{dateTime(x.created_at)}</span></td>
                  <td data-label="חברה">{nameOf(businesses, x.business_id) || 'כל החברות'}</td>
                  <td className="fin-col-md" data-label="תקופה">{x.period ? monthLabel(x.period) : 'בחירה'}</td>
                  <td className="fin-num" data-label="מסמכים">{x.doc_count}</td>
                  <td className="fin-num fin-td-total" data-label="סה״כ"><strong>{money(x.total)}</strong></td>
                  <td className="fin-col-md fin-num" data-label="מע״מ">{money(x.vat_total)}</td>
                  <td className="fin-col-md" data-label="פורמט">{FMT[x.format] || x.format}</td>
                  <td className="fin-col-lg" data-label="יעד" dir="auto">{x.destination}</td>
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
