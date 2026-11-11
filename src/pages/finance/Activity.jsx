import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { AGENTS, FIELD_LABEL, ago, date, dateTime } from './format.js'
import Select from './Select.jsx'
import { Empty, Icon, InfoTip, Pill, Skeleton, useAsync } from './ui.jsx'

/* Everything that happened, in one list: documents that came in and were read, approvals, exports and downloads,
   Drive copies, shares, connections, and every agent run that ended with an error. Read only: the log cannot be edited. */
const ACT = {
  created: 'מסמך נקלט', updated: 'מסמך עודכן', approved: 'אושר', rejected: 'נדחה', exported: 'יוצא לרו״ח', marked_duplicate: 'סומן ככפול', ai_processed: 'חולץ ע״י AI',
  deleted: 'נמחק', connected: 'חיבור נוסף', disconnected: 'חיבור נותק', invited: 'הוזמן משתמש', claimed_admin: 'הוגדר מנהל מערכת', cron_run: 'ריצת לילה',
  blocked: 'משתמש נחסם', unblocked: 'חסימה בוטלה', asked: 'שאלה לעוזר', sessions_ended: 'חיבורים נותקו', mfa_reset: 'אימות דו-שלבי אופס', settings_saved: 'הגדרות נשמרו', integration_saved: 'חיבור עודכן',
  split: 'פוצל בין פרויקטים', first_approval: 'חתימה ראשונה', merged: 'אוחד ספק', archived: 'הועבר לארכיון',
  sent_to_accountant: 'נשלח לרו״ח במייל', shared_by_email: 'שותף במייל', exported_excel: 'הורד קובץ Excel', exported_csv: 'הורד קובץ CSV', downloaded_originals: 'הורדו קבצים מקוריים',
  printed: 'הודפס', downloaded_document: 'הורד מסמך', saved_documents: 'נשמר בענן', test_passed: 'בדיקת חיבור עברה', test_failed: 'בדיקת חיבור נכשלה',
  scan_started: 'סריקת תיבה התחילה', scan_done: 'סריקת תיבה הסתיימה', scan_incomplete: 'סריקה הסתיימה עם פריטים פתוחים', scan_item_accepted: 'פריט מסריקה אושר',
  scan_pause: 'סריקה הושהתה', scan_resume: 'סריקה חודשה', scan_cancel: 'סריקה בוטלה', scan_rescan: 'סריקה חוזרת', scan_retry: 'ניסיון חוזר בסריקה',
  archive_excluded: 'הוצא מארכיון ה-Drive', archive_included: 'הוחזר לארכיון ה-Drive', archive_renamed: 'שם הקובץ ב-Drive שונה', archive_settings: 'הגדרות הארכיון נשמרו',
  merged_documents: 'מסמכים מוזגו', not_relevant: 'סומן כלא רלוונטי', uploaded: 'קובץ הועלה', corrected: 'תוקן',
  shared_whatsapp: 'נשלח בוואטסאפ', duplicate_confirmed: 'כפילות אושרה', duplicate_dismissed: 'כפילות נדחתה', attachment_added: 'נוסף נספח', attachment_removed: 'הוסר נספח',
}
const OTHER_AGENTS = { cloud: 'סוכן הענן', outbound: 'שליחה אוטומטית' }
const KINDS = [
  ['', 'הכול'],
  ['intake', 'קליטה וחילוץ'],
  ['review', 'בדיקה ואישור'],
  ['out', 'ייצוא, שיתוף וענן'],
  ['connect', 'חיבורים'],
  ['errors', 'שגיאות'],
]
const kindOf = (a) => {
  if (a.kind === 'error') return 'errors'
  if (['created', 'ai_processed'].includes(a.action)) return 'intake'
  if (['approved', 'rejected', 'updated', 'marked_duplicate', 'first_approval', 'split', 'archived', 'deleted', 'merged', 'duplicate_confirmed', 'duplicate_dismissed'].includes(a.action)) return 'review'
  if (['exported', 'sent_to_accountant', 'shared_by_email', 'exported_excel', 'exported_csv', 'downloaded_originals', 'printed', 'downloaded_document', 'saved_documents', 'shared_whatsapp'].includes(a.action)) return 'out'
  if (['connected', 'disconnected', 'test_passed', 'test_failed', 'invited', 'claimed_admin'].includes(a.action) || ['mailbox', 'cloud', 'member', 'integration'].includes(a.entity)) return a.action === 'test_failed' ? 'errors' : 'connect'
  return 'review'
}
const who = (e) => (!e || e === 'agent' ? 'סוכן AI' : e.split('@')[0])
const SKIP_LABEL = { quote: 'הצעת מחיר', purchase_order: 'הזמנת רכש', contract: 'חוזה', legal: 'מסמך משפטי', marketing: 'פרסום', correspondence: 'התכתבות', bank_statement: 'דף חשבון', personal: 'אישי', other: 'אחר' }

export default function Activity() {
  const { documents, go } = useFinance()
  const audit = useAsync(() => api.loadAudit({ limit: 400 }), [])
  const runs = useAsync(() => api.loadAgentRuns(200), [])
  const skipped = useAsync(() => api.loadSkipped(100), [])
  const [tab, setTab] = useState('log')
  const [limit, setLimit] = useState(100)   // the log opens on the latest 100 actions; more on request
  const [kind, setKind] = useState('')
  const [person, setPerson] = useState('')
  const [q, setQ] = useState('')

  const items = useMemo(() => {
    const a = (audit.data || []).map((x) => ({ ...x, kind: 'audit' }))
    const e = (runs.data || []).filter((r) => r.status === 'error' || Number(r.errors) > 0).map((r) => ({ id: `run-${r.id}`, kind: 'error', at: r.finished_at || r.started_at, action: 'agent_error', entity: 'agent', user_email: 'agent', changes: { agent: r.agent, errors: r.errors, message: r.error || r.details?.error || r.details?.results?.find?.((x) => x.error)?.error } }))
    return [...a, ...e].sort((x, y) => String(y.at).localeCompare(String(x.at)))
  }, [audit.data, runs.data])
  const people = [...new Set(items.map((i) => who(i.user_email)))].sort()
  const needle = q.trim().toLowerCase()
  const docOf = (a) => (a.entity === 'document' ? documents.find((d) => d.id === a.entity_id) : null)
  const shown = items.filter((a) => (!kind || kindOf(a) === kind) && (!person || who(a.user_email) === person)
    && (!needle || [ACT[a.action], a.action, docOf(a)?.supplier_name, a.user_email, JSON.stringify(a.changes || {})].some((v) => String(v || '').toLowerCase().includes(needle))))

  const describe = (a) => {
    const c = a.changes || {}
    if (a.kind === 'error') return `${AGENTS[c.agent]?.name || OTHER_AGENTS[c.agent] || 'סוכן'}: ${c.message || (c.errors === 1 ? 'שגיאה אחת' : `${c.errors} שגיאות`)}`
    const doc = docOf(a)
    if (doc) return <button type="button" className="fin-link" onClick={() => go(`/documents/${doc.id}`)}>{doc.supplier_name || doc.file_name || 'מסמך'}</button>
    if (a.action === 'updated' && c) return Object.keys(c).map((k) => FIELD_LABEL[k]).filter(Boolean).slice(0, 3).join(', ')
    if (c.count) return `${c.count} מסמכים`
    if (c.documents?.length) return `${c.documents.length} מסמכים${c.to ? ` אל ${[].concat(c.to).join(', ')}` : ''}`
    if (c.saved !== undefined) return `${c.saved} נשמרו${c.failed ? `, ${c.failed} נכשלו` : ''}`
    if (c.error) return String(c.error).slice(0, 160)
    return c.email || c.name || c.provider || ''
  }

  return (
    <div className="fin-stack">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">יומן פעילות</h2>
        <InfoTip label="על היומן">כל פעולה במערכת נרשמת כאן עם מי ומתי: קליטה, חילוץ, אישור, ייצוא, שיתוף, שמירה בענן ושגיאות. אי אפשר לערוך או למחוק את היומן.</InfoTip>
      </div>
      <div className="fin-tabs" role="tablist" aria-label="תצוגה">
        <button type="button" role="tab" aria-selected={tab === 'log'} className={`fin-tab ${tab === 'log' ? 'is-active' : ''}`} onClick={() => setTab('log')}>פעולות <em>{items.length}</em></button>
        <button type="button" role="tab" aria-selected={tab === 'skipped'} className={`fin-tab ${tab === 'skipped' ? 'is-active' : ''}`} onClick={() => setTab('skipped')}>קבצים שדולגו <em>{(skipped.data || []).length}</em></button>
      </div>

      {tab === 'log' ? (
        <>
          <div className="fin-filters">
            <label className="fin-search"><Icon name="search" size={18} /><input type="search" placeholder="חיפוש ביומן…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש ביומן" /></label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="סוג פעולה">{KINDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <Select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="מי">{[['', 'כל המשתמשים'], ...people.map((p) => [p, p])].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </div>
          {audit.loading ? <Skeleton lines={8} /> : !shown.length ? <Empty title="אין פעולות שמתאימות" icon="history">נסו סינון אחר.</Empty> : (
            <div className="fin-table-wrap">
              <table className="fin-table fin-table--log">
                <thead><tr><th>מתי</th><th>פעולה</th><th>על מה</th><th className="fin-col-md">מי</th></tr></thead>
                {(() => {
                  // grouped by day (today, yesterday, then the date) so a long log reads as days, not one endless list
                  const dayOf = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
                  const today = dayOf(Date.now()); const yday = dayOf(Date.now() - 86400000)
                  const groups = []
                  for (const a of shown.slice(0, limit)) { const k = dayOf(a.at); const g = groups[groups.length - 1]; if (g && g.k === k) g.rows.push(a); else groups.push({ k, label: k === today ? 'היום' : k === yday ? 'אתמול' : date(k), rows: [a] }) }
                  return groups.map((g) => (
                    <tbody key={g.k}>
                      <tr className="fin-log-day"><th colSpan={4} scope="colgroup">{g.label}<span>{g.rows.length === 1 ? 'פעולה אחת' : `${g.rows.length} פעולות`}</span></th></tr>
                      {g.rows.map((a) => (
                        <tr key={a.id} className={kindOf(a) === 'errors' ? 'is-err' : ''}>
                          <td data-label="מתי" title={dateTime(a.at)}><span className="fin-nowrap">{new Date(a.at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span></td>
                          <td className="fin-td-main">{kindOf(a) === 'errors' ? <Pill tone="attn">{a.kind === 'error' ? 'שגיאה' : ACT[a.action] || 'פעולה אחרת'}</Pill> : <strong title={ACT[a.action] ? undefined : a.action}>{ACT[a.action] || 'פעולה אחרת'}</strong>}</td>
                          <td data-label="על מה">{describe(a) || <span className="fin-muted">—</span>}</td>
                          <td data-label="מי" className="fin-col-md">{who(a.user_email)}</td>
                        </tr>
                      ))}
                    </tbody>
                  ))
                })()}
              </table>
              {shown.length > limit && <div className="fin-more-rows"><span>מוצגות {limit.toLocaleString('he-IL')} מתוך {shown.length.toLocaleString('he-IL')} פעולות</span><button type="button" className="fin-btn fin-btn--sm" onClick={() => setLimit((n) => n + 200)}>הצגת עוד</button></div>}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="fin-muted fin-lead">קבצים מהמייל שהסוכן קרא וזיהה בוודאות שהם לא חשבונית או קבלה (הצעת מחיר, חוזה, פרסום, התכתבות). לא נוצרה להם רשומה כספית, והם לא ייקראו שוב. קובץ שהסוכן לא היה בטוח לגביו לא מופיע כאן: הוא נשמר כמסמך לבדיקה.</p>
          {skipped.loading ? <Skeleton lines={5} /> : !(skipped.data || []).length ? <Empty title="לא דולגו קבצים" icon="docs">כל מה שנאסף היה חשבונית או קבלה.</Empty> : (
            <div className="fin-table-wrap">
              <table className="fin-table fin-table--log">
                <thead><tr><th>מתי</th><th>קובץ</th><th>מה זה</th><th className="fin-col-md">ודאות</th><th className="fin-col-lg">מייל</th></tr></thead>
                <tbody>
                  {skipped.data.map((s) => (
                    <tr key={s.id}>
                      <td data-label="מתי"><span className="fin-nowrap">{ago(s.at)}</span></td>
                      <td data-label="קובץ" className="fin-td-main">{s.file_name || '—'}</td>
                      <td data-label="מה זה">{SKIP_LABEL[s.document_class] || s.reason || '—'}</td>
                      <td data-label="ודאות" className="fin-col-md">{s.confidence != null ? `${Math.round(Number(s.confidence) * 100)}%` : '—'}</td>
                      <td data-label="מייל" className="fin-col-lg"><span className="fin-muted">{s.email_subject || ''}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
