import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DateField from './DateField.jsx'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { date, dateTime } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Empty, Field, Icon, Modal, Pill, PageHead, askConfirm } from './ui.jsx'

/* Scan management: every connected mailbox, its scan of a period, how far it got and what is left. A scan reads one
   mailbox over one period, week by week, records every message, and is "done" only after a completeness pass found
   nothing left (server/finance/scan.js). In production it runs every minute in the background; this screen also moves it
   on while it is open. */
const today = () => new Date().toISOString().slice(0, 10)
const back = (days) => new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
const PRESETS = [['30d', '30 יום', 30], ['3m', '3 חודשים', 91], ['6m', 'חצי שנה', 182], ['1y', 'שנה', 365], ['3y', '3 שנים', 1096], ['5y', '5 שנים', 1826], ['all', 'כל ההיסטוריה', null]]
const STATE = {
  queued: ['info', 'בתור'], running: ['info', 'סורק'], paused: ['warn', 'בהפסקה'], done: ['ok', 'הסריקה הושלמה'],
  incomplete: ['warn', 'הסריקה אינה מלאה'], failed: ['bad', 'נכשלה'], cancelled: ['muted', 'בוטלה'],
}
const n = (v) => Number(v || 0).toLocaleString('he-IL')

function PeriodDialog({ mailbox, onClose, onStarted }) {
  const [preset, setPreset] = useState('1y')
  const [from, setFrom] = useState(back(365))
  const [to, setTo] = useState(today())
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = (id, days) => { setPreset(id); setTo(today()); setFrom(days ? back(days) : '2004-01-01') }
  const start = async () => {
    setBusy(true); setErr('')
    try { await api.callServer('scan-start', { mailbox_id: mailbox.id, from, to, include_sent: sent }); onStarted() } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <Modal title={`סריקה של ${mailbox.email}`} onClose={onClose} footer={<><button type="button" className="fin-btn fin-btn--primary" onClick={start} disabled={busy || !from || !to || from > to}>{busy ? 'מתחיל…' : 'התחלת הסריקה'}</button><button type="button" className="fin-btn" onClick={onClose}>ביטול</button></>}>
      <p className="fin-muted">הסוכן יעבור על כל ההודעות בתקופה, שבוע אחרי שבוע, ויבדוק כל קובץ מצורף וכל גוף מייל. בסוף הוא עובר שוב על כל התקופה כדי לוודא שלא נשארה הודעה שלא נבדקה.</p>
      <div className="fin-seg fin-scan__presets" role="group" aria-label="תקופה">
        {PRESETS.map(([id, label, days]) => <button key={id} type="button" className={preset === id ? 'is-on' : ''} aria-pressed={preset === id} onClick={() => pick(id, days)}>{label}</button>)}
      </div>
      <div className="fin-form__grid">
        <Field label="מתאריך"><DateField value={from} max={to} clearable={false} onChange={(v) => { setPreset('custom'); setFrom(v) }} /></Field>
        <Field label="עד תאריך"><DateField value={to} min={from} max={today()} clearable={false} onChange={(v) => { setPreset('custom'); setTo(v) }} /></Field>
      </div>
      <label className="fin-check"><input type="checkbox" checked={sent} onChange={(e) => setSent(e.target.checked)} /> לסרוק גם הודעות יוצאות (חשבוניות שהעסק שלח)</label>
      <p className="fin-muted fin-small">התאריכים לפי שעון ישראל. הודעה שכבר נבדקה לא נקראת שוב, ולכן סריקה חוזרת של תקופה עולה רק על מה שלא נבדק.</p>
      {err && <p className="fin-error" role="alert">{err}</p>}
    </Modal>
  )
}

function Report({ r }) {
  if (!r || r.listed === undefined) return null
  const rows = [['הודעות שנמצאו', r.listed], ['הודעות שנבדקו', r.checked], ['חשבוניות שאותרו', r.invoices], ['קבלות שאותרו', r.receipts], ['חשבוניות זיכוי', r.credits], ['מסמכים פיננסיים נוספים', r.other_financial], ['קבצים לא רלוונטיים', r.not_relevant], ['כפילויות', r.duplicates], ['נמצאו בבקרת השלמות', r.missed_found], ['הודעות שנכשלו בעיבוד', r.failed], ['קבצים שלא נפתחו', r.unreadable]]
  return <dl className="fin-scan__report">{rows.map(([k, v]) => <div key={k} className={(k.includes('נכשלו') || k.includes('לא נפתחו')) && v ? 'is-bad' : ''}><dt>{k}</dt><dd>{n(v)}</dd></div>)}</dl>
}

function MailboxScan({ row, documents, can, onAction, onStart, go }) {
  const { mailbox: mb, job, progress, problems, check } = row
  const [open, setOpen] = useState(false)
  const [tone, label] = job ? STATE[job.status] || ['muted', job.status] : ['muted', 'עוד לא נסרקה']
  const docs = useMemo(() => documents.filter((d) => d.mailbox_id === mb.id), [documents, mb.id])
  const count = (f) => docs.filter(f).length
  const active = job && ['queued', 'running', 'paused'].includes(job.status)
  const pct = progress ? progress.pct : 0
  const openDocs = () => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids: docs.map((d) => d.id), title: `מסמכים מ-${mb.email}` })) } catch { /* noop */ } go('/documents?ids=1') }
  return (
    <article className={`fin-scan ${active ? 'is-active' : ''}`} aria-label={`סריקה של ${mb.email}`}>
      <header className="fin-scan__head">
        <ProviderLogo name={mb.provider} />
        <div className="fin-scan__who"><small className="fin-scan__kicker">החשבון המחובר</small><strong dir="ltr">{mb.email}</strong><small>{job ? `תקופת הסריקה: ${date(job.date_from)} עד ${date(job.date_to)}` : 'לא נבחרה תקופה לסריקה'}</small></div>
        <Pill tone={tone}>{label}</Pill>
      </header>
      {job && (
        <div className="fin-scan__progress">
          <div className="fin-scan__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`התקדמות הסריקה של ${mb.email}`}><span style={{ width: `${pct}%` }} /></div>
          <span className="fin-scan__pct">{pct}%</span>
          <small className="fin-scan__phase">{job.status === 'running' || job.status === 'queued' ? (job.phase === 'verify' ? 'בקרת שלמות: עובר שוב על כל התקופה' : `סורק שבוע ${n(progress?.closed)} מתוך ${n(progress?.segments)}`) : job.error || (job.finished_at ? `הסתיימה ${dateTime(job.finished_at)}` : '')}</small>
        </div>
      )}
      {(() => {
        const checked = Number(job?.report?.checked ?? progress?.checked ?? 0)
        const invoices = count((d) => ['invoice', 'invoice_receipt', 'supplier_bill', 'proforma'].includes(d.doc_type))
        const receipts = count((d) => d.doc_type === 'receipt')
        const others = docs.length - invoices - receipts
        const skipped = Number(job?.report?.not_relevant ?? progress?.skipped ?? 0)
        const dupes = Number(job?.report?.duplicates ?? 0)
        const review = count((d) => d.status === 'review')
        return (
          <>
            {/* what happened to the mail, left to right: checked → kept as documents → waiting for a person */}
            <dl className="fin-scan__stats fin-scan__flow">
              <div><dt>הודעות שנבדקו</dt><dd>{n(checked)}</dd><small>כל הודעה בתקופה נבדקת פעם אחת</small></div>
              <div className="is-key"><dt>מסמכים שנשמרו</dt><dd>{n(docs.length)}</dd><small>{[invoices && `${n(invoices)} חשבוניות`, receipts && `${n(receipts)} קבלות`, others > 0 && `${n(others)} אחרים`].filter(Boolean).join(' · ') || 'עוד לא נמצאו'}</small></div>
              <div className={review ? 'is-attn' : ''}><dt>ממתינים לבדיקה שלך</dt><dd>{n(review)}</dd><small>{review ? 'נקראו, ומחכים לאישור' : 'אין מה לאשר'}</small></div>
            </dl>
            <ul className="fin-scan__rest" aria-label="מה לא נשמר">
              <li><b>{n(skipped)}</b> הודעות נבדקו ולא נשמרו: לא חשבונית ולא קבלה</li>
              {dupes > 0 && <li><b>{n(dupes)}</b> כפילויות של מסמך שכבר במערכת</li>}
              <li className={problems.length ? 'is-bad' : 'is-ok'}><b>{n(problems.length)}</b> {problems.length ? 'הודעות שלא הצלחנו לעבד (ברשימה למטה)' : 'הודעות שלא עובדו. שום הודעה לא נפלה'}</li>
            </ul>
          </>
        )
      })()}
      <p className="fin-muted fin-small">סריקה אחרונה: {mb.last_scan_at ? dateTime(mb.last_scan_at) : 'עוד לא'}</p>
      {job && ['done', 'incomplete'].includes(job.status) && (
        <details className="fin-scan__summary" open={job.status === 'incomplete'}>
          <summary>דוח סיכום · {job.status === 'done' ? 'הסריקה הושלמה' : 'הסריקה אינה מלאה'}</summary>
          <Report r={job.report} />
        </details>
      )}
      {/* the night's collection: once at night, once before morning, every message of the last days */}
      <p className={`fin-scan__night ${check?.open ? 'is-open' : check ? 'is-ok' : ''}`} role="status">
        <Icon name={check?.open ? 'alert' : 'check'} size={15} />
        {check
          ? <span><strong>{check.pass === 2 ? 'מעבר הבוקר' : 'מעבר הלילה'}:</strong> {['queued', 'running'].includes(check.status) ? 'רץ עכשיו' : dateTime(check.at)} · נבדקו {n(check.listed)} הודעות מ-{date(check.from)} · {check.kept ? `${n(check.kept)} מסמכים חדשים נקלטו` : 'אין מסמך חדש'}{check.open ? ` · ${n(check.open)} הודעות לא נפתחו ומחכות לך` : ''}</span>
          : <span><strong>האיסוף הלילי:</strong> פעם בלילה ופעם לפנות בוקר, כל ההודעות של שלושת הימים האחרונים נבדקות. כל הודעה נקראת פעם אחת בלבד.</span>}
      </p>
      {can('operate') && (
        <div className="fin-scan__acts">
          {!job || ['done', 'incomplete', 'cancelled', 'failed'].includes(job.status) ? <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => onStart(mb)}><Icon name="search" size={15} /> {job ? 'סריקה של תקופה חדשה' : 'התחלת סריקה'}</button> : null}
          {job && ['queued', 'running'].includes(job.status) && <button type="button" className="fin-btn fin-btn--sm" onClick={() => onAction(job, 'pause')}>עצירה</button>}
          {job && job.status === 'paused' && <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => onAction(job, 'resume')}>המשך הסריקה</button>}
          {job && ['done', 'incomplete'].includes(job.status) && <button type="button" className="fin-btn fin-btn--sm" onClick={() => onAction(job, 'rescan')}>סריקה חוזרת</button>}
          {active && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={async () => { if (await askConfirm({ text: 'לבטל את הסריקה ולבחור תקופה אחרת? הודעות שכבר נבדקו לא ייבדקו שוב.', ok: 'שינוי תקופה' })) { await onAction(job, 'cancel'); onStart(mb) } }}>שינוי תקופה</button>}
          {docs.length > 0 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={openDocs}><Icon name="list" size={15} /> המסמכים שנמצאו ({n(docs.length)})</button>}
          {problems.length > 0 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}><Icon name="alert" size={15} /> הודעות שלא עובדו ({n(problems.length)})</button>}
        </div>
      )}
      {open && problems.length > 0 && (
        <ul className="fin-scan__problems">
          {problems.map((p) => (
            <li key={p.message_id}>
              <div><strong>{p.subject || '(בלי נושא)'}</strong><small>{p.email_from || ''}{p.email_date ? ` · ${date(p.email_date)}` : ''}</small><small className="fin-cell-err">{p.status === 'unreadable' ? 'קובץ שלא נפתח' : `נכשל ${p.attempts} פעמים`}: {p.error}</small></div>
              {can('operate') && <button type="button" className="fin-btn fin-btn--sm" onClick={() => onAction({ mailbox_id: mb.id }, 'accept', p.message_id)}>סימון כנבדק</button>}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default function Scans() {
  const { documents, can, go, reload } = useFinance()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [starting, setStarting] = useState(null)
  const alive = useRef(true)
  const running = useRef(false)
  const load = useCallback(async () => { try { const r = await api.callServer('scan-overview'); if (alive.current) setRows(r.mailboxes || []) } catch (e) { if (alive.current) setErr(e.message) } }, [])
  useEffect(() => { alive.current = true; load(); return () => { alive.current = false } }, [load])
  const active = (rows || []).some((r) => r.job && ['queued', 'running'].includes(r.job.status))
  // while a scan has work and this screen is open, it moves the scan on step after step (in production the background
  // run does too; the server never lets two runs work on the same week)
  useEffect(() => {
    if (!active || running.current) return undefined
    running.current = true
    ;(async () => {
      while (alive.current) {
        try { const r = await api.callServer('scan-run', {}, { timeout: 70000 }); await load(); if (!r.more) break } catch { await new Promise((ok) => setTimeout(ok, 4000)) }
      }
      running.current = false
      reload()
    })()
    return undefined
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
  const [checking, setChecking] = useState(false)
  const act = async (job, op, messageId) => {
    setErr('')
    try {
      if (op === 'accept') await api.callServer('scan-accept', { mailbox_id: job.mailbox_id, message_id: messageId })
      else await api.callServer('scan-control', { job_id: job.id, op })
      await load()
    } catch (e) { setErr(e.message) }
  }
  const tot = useMemo(() => {
    const t = { checked: 0, docs: 0, review: 0, problems: 0, active: 0, incomplete: 0 }
    for (const r of rows || []) {
      t.checked += Number(r.job?.report?.checked ?? r.progress?.checked ?? 0)
      t.problems += r.problems.length
      if (r.job && ['queued', 'running', 'paused'].includes(r.job.status)) t.active++
      if (r.job?.status === 'incomplete') t.incomplete++
    }
    const ids = new Set((rows || []).map((r) => r.mailbox.id))
    const docs = documents.filter((d) => ids.has(d.mailbox_id))
    t.docs = docs.length; t.review = docs.filter((d) => d.status === 'review').length
    return t
  }, [rows, documents])
  return (
    <div className="fin-stack">
      <PageHead title="ניהול סריקות" sub="סריקה של כל תיבת מייל לתקופה שבוחרים, עם בקרה שכל הודעה נבדקה">
        {can('operate') && (rows || []).length > 0 && <button type="button" className="fin-btn" disabled={checking} onClick={async () => { setChecking(true); setErr(''); try { await api.callServer('scan-night-check'); await load() } catch (e) { setErr(e.message) } finally { setChecking(false) } }}><Icon name="check" size={16} /> {checking ? 'מתחיל…' : 'איסוף עכשיו'}</button>}
      </PageHead>
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
      {rows === null ? <p className="fin-muted" aria-busy="true">טוען…</p> : !rows.length ? (
        <Empty title="עוד לא חוברה תיבת מייל" icon="mail" action={can('operate') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/mailboxes')}>חיבור תיבת מייל</button>}>אחרי החיבור בוחרים תקופה, והסוכן סורק אותה לבד.</Empty>
      ) : (
        <>
          {rows.length > 1 && <dl className="fin-scan__totals" aria-label="סיכום כל התיבות">
            <div><dt>תיבות מחוברות</dt><dd>{n(rows.length)}</dd></div>
            <div><dt>סריקות פעילות</dt><dd>{n(tot.active)}</dd></div>
            <div><dt>הודעות שנבדקו</dt><dd>{n(tot.checked)}</dd></div>
            <div><dt>מסמכים מהמייל</dt><dd>{n(tot.docs)}</dd></div>
            <div><dt>דורשים בדיקה</dt><dd>{n(tot.review)}</dd></div>
            <div className={tot.problems ? 'is-bad' : ''}><dt>הודעות שלא עובדו</dt><dd>{n(tot.problems)}</dd></div>
          </dl>}
          <div className={`fin-scan__grid ${rows.length === 1 ? 'is-single' : ''}`}>
            {rows.map((r) => <MailboxScan key={r.mailbox.id} row={r} documents={documents} can={can} go={go} onAction={act} onStart={setStarting} />)}
          </div>
        </>
      )}
      {starting && <PeriodDialog mailbox={starting} onClose={() => setStarting(null)} onStarted={() => { setStarting(null); load() }} />}
    </div>
  )
}
