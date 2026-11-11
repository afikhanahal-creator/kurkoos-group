import { useEffect, useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, SOURCE, byDocDate, date, dateTime, docDate, money, monthLabel, thisMonth } from './format.js'
import Select from './Select.jsx'
import Thumbnail from './Thumbnail.jsx'
import Peek from './Peek.jsx'
import { useResizableColumns } from './columns.js'
import { Empty, Icon, PageHead, askConfirm } from './ui.jsx'

/* Receipts and invoices that people hand in themselves: a photo sent to the office WhatsApp number, or a file uploaded
   here. Each one is read, checked and waits for a person; nothing counts as final before somebody approves it, and
   the row says where the document stands: read, needs a fix, approved, kept in Google Drive. */
const STAGE = {
  processing: { label: 'בעיבוד', tone: 'info', hint: 'המסמך נקרא עכשיו' },
  ready: { label: 'מוכן לבדיקה', tone: 'warn', hint: 'הפרטים נקראו ומחכים לאישור' },
  fix: { label: 'דורש תיקון', tone: 'attn', hint: 'יש שדה שלא נקרא בביטחון או נתון שלא מסתדר' },
  approved: { label: 'אושר', tone: 'ok', hint: 'אושר על ידי אדם' },
  saved: { label: 'נשמר ב-Drive', tone: 'done', hint: 'אושר והקובץ נמצא ב-Google Drive' },
  failed: { label: 'שגיאה', tone: 'bad', hint: 'הקריאה נכשלה; אפשר לקרוא שוב או למלא ידנית' },
  rejected: { label: 'נדחה', tone: 'muted', hint: 'נדחה ונשמר בארכיון' },
  duplicate: { label: 'כפול', tone: 'muted', hint: 'אותו מסמך כבר קיים במערכת' },
}
const SOFT = new Set(['needs_confirmation'])
export const stageOf = (d, drive) => {
  if (d.status === 'processing') return 'processing'
  if (d.status === 'failed') return 'failed'
  if (d.status === 'rejected' || d.status === 'archived') return 'rejected'
  if (d.status === 'duplicate') return 'duplicate'
  if (d.status === 'approved' || d.status === 'sent') return ['verified', 'uploaded', 'done'].includes(drive?.status) ? 'saved' : 'approved'
  return (d.issues || []).some((i) => !SOFT.has(i.code)) || d.duplicate_state === 'suspected' ? 'fix' : 'ready'
}
const sender = (d) => (d.source === 'whatsapp' ? String(d.email_from || '').replace(/^WhatsApp\s*/, '') : '')

export default function Receipts() {
  const { documents, suppliers, can, go, openUpload, reload } = useFinance()
  const [drive, setDrive] = useState({})
  const [q, setQ] = useState('')
  const [via, setVia] = useState('all')
  const [stage, setStage] = useState('')
  const [type, setType] = useState('')
  const [month, setMonth] = useState('')
  const [supplier, setSupplier] = useState('')
  const [min, setMin] = useState('')
  const [more, setMore] = useState(false)
  const colsRef = useResizableColumns('receipts')

  // every receipt and invoice in the system, whatever way it came in (mail, WhatsApp, upload, camera), newest document first
  const MAIL = ['gmail', 'outlook', 'forward']
  const viaOf = (d) => (MAIL.includes(d.source) ? 'mail' : d.source === 'whatsapp' ? 'whatsapp' : 'upload')
  const mine = useMemo(() => [...documents].sort(byDocDate), [documents])
  // the months that have documents, newest first, each with its count: the list a person picks a month and year from
  const monthsWith = useMemo(() => { const m = new Map(); for (const d of mine) { const k = String(docDate(d)).slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) m.set(k, (m.get(k) || 0) + 1) } return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])) }, [mine])
  const [note, setNote] = useState('')
  const canDelete = (d) => can('manage') || (can('operate') && !['approved', 'sent'].includes(d.status))
  const removeDoc = async (d) => {
    if (!(await askConfirm({ title: 'מחיקת מסמך', text: `למחוק את "${d.supplier_name || d.file_name || 'המסמך'}"${d.total_amount != null ? ` (${money(d.total_amount, d.currency)})` : ''}? המסמך והקובץ שלו יימחקו מהמערכת. אי אפשר לבטל.`, ok: 'מחיקה', danger: true }))) return
    try { await api.deleteDocument(d); setNote('המסמך נמחק'); await reload() } catch (e) { setNote(e.message) }
  }
  useEffect(() => { let on = true; api.callServer('receipts-drive').then((r) => { if (on) setDrive(r?.files || {}) }).catch(() => {}); return () => { on = false } }, [mine.length])
  const rows = useMemo(() => mine.map((d) => ({ d, stage: stageOf(d, drive[d.id]), link: drive[d.id]?.link })), [mine, drive])

  const now = thisMonth()
  const inMonth = rows.filter((r) => String(r.d.created_at).slice(0, 7) === now)
  const figures = [
    ['התקבלו החודש', inMonth.length, `${inMonth.filter((r) => r.d.source === 'whatsapp').length} מ-WhatsApp · ${inMonth.filter((r) => MAIL.includes(r.d.source)).length} מהמייל`, ''],
    ['ממתינים לאישור', rows.filter((r) => r.stage === 'ready' || r.stage === 'fix').length, `${rows.filter((r) => r.stage === 'fix').length} דורשים תיקון`, 'wait'],
    ['אושרו', rows.filter((r) => r.stage === 'approved' || r.stage === 'saved').length, `${rows.filter((r) => r.stage === 'saved').length} נשמרו ב-Drive`, 'done'],
    ['שגיאות', rows.filter((r) => r.stage === 'failed').length, 'קריאה שנכשלה', 'failed'],
    ['הוצאות מאושרות החודש', money(inMonth.filter((r) => r.stage === 'approved' || r.stage === 'saved').reduce((a, r) => a + (r.d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(r.d.total_amount) || 0), 0)), monthLabel(now), ''],
  ]
  const pick = { wait: (r) => r.stage === 'ready' || r.stage === 'fix', done: (r) => r.stage === 'approved' || r.stage === 'saved' }

  const text = q.trim().toLowerCase()
  const shown = rows.filter((r) => {
    const d = r.d
    if (via !== 'all' && viaOf(d) !== via) return false
    if (stage && !(pick[stage] ? pick[stage](r) : r.stage === stage)) return false
    if (type && d.doc_type !== type) return false
    if (month && String(docDate(d)).slice(0, 7) !== month) return false
    if (supplier && (d.supplier_name || '') !== supplier) return false
    if (min && !(Math.abs(Number(d.total_amount) || 0) >= Number(min))) return false
    if (text && ![d.supplier_name, d.file_name, d.doc_number, d.total_amount != null ? String(d.total_amount) : '', d.description, sender(d)].some((v) => String(v || '').toLowerCase().includes(text))) return false
    return true
  })
  const supplierNames = useMemo(() => [...new Set(mine.map((d) => d.supplier_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he')), [mine])
  const filtered = !!(text || stage || type || month || supplier || min || via !== 'all')
  const clear = () => { setQ(''); setVia('all'); setStage(''); setType(''); setMonth(''); setSupplier(''); setMin('') }

  return (
    <div className="fin-stack fin-receipts">
      <PageHead title="קבלות וחשבוניות" sub="כל הקבלות והחשבוניות שבמערכת, מהמייל, מ-WhatsApp ומהעלאה, לפי חודש. שום דבר לא נרשם כסופי לפני אישור.">
        {can('connect') && <button type="button" className="fin-btn" onClick={() => go('/scanners')}><Icon name="phone" size={18} /> מספרי WhatsApp</button>}
        {can('upload') && openUpload && <button type="button" className="fin-btn fin-btn--primary" onClick={openUpload}><Icon name="upload" size={18} /> העלאה מהמחשב</button>}
      </PageHead>

      <dl className="fin-rfigs fin-receipts__figs">
        {figures.map(([k, v, note, key]) => {
          const on = key && stage === key
          const Box = key ? 'button' : 'div'
          return (
            <Box key={k} {...(key ? { type: 'button', onClick: () => setStage(on ? '' : key), 'aria-pressed': on } : {})} className={on ? 'is-on' : ''}>
              <dt>{k}</dt><dd>{v}</dd>{note && <small>{note}</small>}
            </Box>
          )
        })}
      </dl>

      <div className="fin-receipts__bar">
        <label className="fin-search">
          <Icon name="search" size={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ספק, מספר מסמך או סכום" aria-label="חיפוש" />
        </label>
        <div className="fin-seg" role="group" aria-label="איך הגיע המסמך">
          {[['all', 'הכול'], ['mail', 'מייל'], ['whatsapp', 'WhatsApp'], ['upload', 'העלאה']].map(([k, l]) => <button key={k} type="button" className={via === k ? 'is-on' : ''} aria-pressed={via === k} onClick={() => setVia(k)}>{l}</button>)}
        </div>
        <Select className="fin-select fin-receipts__month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="חודש ושנה">
          <option value="">כל החודשים ({mine.length})</option>
          {monthsWith.map(([m, n]) => <option key={m} value={m}>{monthLabel(m)} ({n})</option>)}
        </Select>
        <Select className="fin-select" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="סטטוס">
          <option value="">כל הסטטוסים</option>
          {Object.entries(STAGE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </Select>
        <button type="button" className={`fin-btn ${more ? 'is-on' : ''}`} aria-expanded={more} onClick={() => setMore((v) => !v)}><Icon name="filter" size={17} /> סינון נוסף</button>
        {filtered && <button type="button" className="fin-link" onClick={clear}>ניקוי</button>}
      </div>
      {more && (
        <div className="fin-receipts__more">
          <Select className="fin-select" value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="ספק"><option value="">כל הספקים</option>{supplierNames.map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          <Select className="fin-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="סוג מסמך"><option value="">כל הסוגים</option>{Object.entries(DOC_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <label className="fin-receipts__min"><span>מסכום</span><input type="number" inputMode="decimal" min="0" value={min} onChange={(e) => setMin(e.target.value)} placeholder="₪" aria-label="סכום מינימלי" /></label>
        </div>
      )}

      {note && <p className="fin-note" role="status">{note}</p>}
      {(month || filtered) && shown.length > 0 && <p className="fin-receipts__count">{shown.length === 1 ? 'מסמך אחד' : `${shown.length} מסמכים`}{month ? ` · ${monthLabel(month)}` : ''} · סה״כ {money(shown.reduce((a, r) => a + (['rejected', 'duplicate', 'failed'].includes(r.d.status) ? 0 : (r.d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(r.d.total_amount) || 0)), 0))}</p>}
      {!mine.length ? (
        <Empty title="עוד לא התקבלו קבלות" icon="phone" action={can('connect') ? <button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/scanners')}>בדיקת החיבור ל-WhatsApp</button> : undefined}>
          שולחים צילום של קבלה או PDF למספר ה-WhatsApp של המשרד מטלפון רשום, או מעלים קובץ מהמחשב. המסמך יופיע כאן תוך כדקה.
        </Empty>
      ) : !shown.length ? (
        <Empty title="אין מסמכים שמתאימים לסינון" icon="search" action={<button type="button" className="fin-btn" onClick={clear}>ניקוי הסינון</button>} />
      ) : (
        <div className="fin-table-wrap">
          <table ref={colsRef} className="fin-table fin-table--plain fin-receipts__table">
            <thead><tr><th aria-label="תצוגה מקדימה" /><th>תאריך</th><th>ספק</th><th>סטטוס</th><th>סוג מסמך</th><th>מספר</th><th className="fin-num">סכום כולל</th><th>נקלט</th><th aria-label="פעולות" /></tr></thead>
            <tbody>
              {shown.slice(0, 300).map(({ d, stage: st, link }) => {
                const s = STAGE[st]
                const known = d.supplier_id && suppliers?.some((x) => x.id === d.supplier_id)
                return (
                  <tr key={d.id} className={`is-link ${st === 'fix' || st === 'failed' ? 'is-attn' : ''}`} onClick={() => go(`/documents/${d.id}`)}>
                    <td className="fin-receipts__thumb"><Peek doc={d}><span className="fin-receipts__pic"><Thumbnail doc={d} /></span></Peek></td>
                    <td data-label="תאריך" className="fin-td-date">{date(docDate(d)) || '—'}</td>
                    <td className="fin-td-main"><Peek doc={d}>{d.supplier_name || <span className="fin-muted">{d.file_name || 'לא זוהה'}</span>}</Peek>{d.supplier_name && !known && <small className="fin-receipts__new">ספק חדש</small>}</td>
                    <td className="fin-td-status fin-receipts__st"><span className={`fin-pill fin-pill--${s.tone}`} title={s.hint}>{s.label}</span></td>
                    <td data-label="סוג">{DOC_TYPE[d.doc_type] || '—'}</td>
                    <td data-label="מספר"><bdi dir="ltr">{d.doc_number || '—'}</bdi></td>
                    <td className="fin-num fin-receipts__sum fin-td-total" data-label="סכום כולל">{d.total_amount != null ? money(d.total_amount, d.currency) : '—'}</td>
                    <td data-label="נקלט" className="fin-receipts__got"><span><span className="fin-receipts__when">{dateTime(d.created_at)}</span><small className="fin-receipts__via"><Icon name={d.source === 'whatsapp' ? 'phone' : MAIL.includes(d.source) ? 'mail' : 'upload'} size={12} /> {d.source === 'whatsapp' ? `WhatsApp ${sender(d)}` : SOURCE[d.source] || 'העלאה'}</small></span></td>
                    
                    <td className="fin-receipts__act" onClick={(e) => e.stopPropagation()}>
                      {link && <a className="fin-icon-btn" href={link} target="_blank" rel="noreferrer" aria-label="פתיחה ב-Google Drive" title="פתיחה ב-Google Drive"><Icon name="folder" size={18} /></a>}
                      <button type="button" className="fin-btn fin-btn--sm" onClick={() => go(`/documents/${d.id}`)}>{st === 'ready' || st === 'fix' ? 'בדיקה ואישור' : 'פתיחה ועריכה'}</button>
                      {canDelete(d) && <button type="button" className="fin-icon-btn fin-icon-btn--danger fin-receipts__del" onClick={() => removeDoc(d)} aria-label={`מחיקת ${d.supplier_name || d.file_name || 'המסמך'}`} title="מחיקה"><Icon name="trash" size={17} /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length > 300 && <p className="fin-muted fin-small fin-receipts__cut">מוצגים 300 המסמכים האחרונים מתוך {shown.length}. סינון מצמצם את הרשימה.</p>}
        </div>
      )}
    </div>
  )
}
