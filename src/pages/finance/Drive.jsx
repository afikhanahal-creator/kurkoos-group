import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { date, dateTime, money, DOC_TYPE } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Empty, Field, Icon, Modal, Pill, PageHead, askConfirm } from './ui.jsx'
import Peek from './Peek.jsx'

// The Google Drive archive: every document that was read goes to "main folder / company / year / MM - month" under a clear
// name, and counts as archived only after it was read back from Drive (server/finance/archive.js).
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const ST = {
  verified: ['ok', 'בארכיון'], uploaded: ['info', 'הועלה, בבדיקה'], uploading: ['info', 'בהעלאה'], queued: ['muted', 'ממתין להעלאה'],
  failed: ['bad', 'ההעלאה נכשלה'], duplicate: ['muted', 'כפילות'], needs_review: ['warn', 'דורש בדיקה'], withdrawn: ['muted', 'הוצא מהארכיון'],
}

/* "main / company / year / month" → a tree: company → year → month → files */
function buildTree(rows) {
  const root = new Map()
  for (const r of rows) {
    if (!r.folder_path || r.status === 'duplicate') continue
    const parts = r.folder_path.split('/').filter(Boolean).slice(1)
    let level = root
    let node = null
    for (const p of parts) {
      if (!level.has(p)) level.set(p, { name: p, children: new Map(), files: [], count: 0 })
      node = level.get(p); node.count++
      level = node.children
    }
    if (node) node.files.push(r)
  }
  return root
}

function Folder({ node, depth, onPick, picked, first }) {
  const kids = [...node.children.values()].sort((a, b) => (depth === 0 ? a.name.localeCompare(b.name, 'he') : b.name.localeCompare(a.name, 'he')))
  return (
    // each company opens at its newest year and month; the rest stay closed until asked
    <details className="fin-dtree__dir" open={(depth === 0 || first) && node.count < 400}>
      <summary className={`fin-dtree__sum is-d${Math.min(depth, 3)}`}><Icon name="folder" size={depth === 0 ? 20 : 17} /> <span className="fin-dtree__name">{node.name}</span> <span className="fin-dtree__count" aria-label={`${node.count} מסמכים`}>{n(node.count)} <i>{node.count === 1 ? 'מסמך' : 'מסמכים'}</i></span></summary>
      <div className="fin-dtree__in">
        {kids.map((k, i) => <Folder key={k.name} node={k} depth={depth + 1} onPick={onPick} picked={picked} first={i === 0} />)}
        {node.files.length > 0 && (
          <ul className="fin-dtree__files">
            {node.files.map((f) => {
              const [tone, label] = ST[f.status] || ['muted', f.status]
              return (
                <li key={f.document_id} className={picked === f.document_id ? 'is-on' : ''}>
                  <button type="button" className="fin-dtree__file" onClick={() => onPick(f)} aria-pressed={picked === f.document_id}>
                    <Icon name="file" size={15} /><span dir="auto">{f.organized_name || '—'}</span>
                  </button>
                  {f.status !== 'verified' && <Pill tone={tone}>{label}</Pill>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}

function FilePanel({ row, doc, business, businesses, canEdit, onRename, onRequeue, onAssign, onExclude, go, onClose }) {
  const [tone, label] = ST[row.status] || ['muted', row.status]
  const [biz, setBiz] = useState(row.business_id || '')
  useEffect(() => { setBiz(row.business_id || '') }, [row.document_id, row.business_id])
  return (
    <aside className="fin-dpanel" aria-label="פרטי הקובץ בארכיון">
      <header>
        <strong dir="auto">{row.organized_name || 'עוד בלי שם'}</strong>
        <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={onClose} aria-label="סגירה"><Icon name="x" size={15} /></button>
      </header>
      <Pill tone={tone}>{label}</Pill>
      <dl className="fin-dpanel__meta">
        <div><dt>תיקייה</dt><dd dir="auto">{row.folder_path || '—'}</dd></div>
        <div><dt>חברה</dt><dd>{canEdit && doc && doc.status !== 'approved' && doc.status !== 'sent' ? (
          <span className="fin-dpanel__assign">
            <select value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="החברה של המסמך"><option value="">ללא שיוך</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            {biz !== (row.business_id || '') && <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => onAssign([row.document_id], biz)}>שיוך והעברה</button>}
          </span>
        ) : (business || 'ללא שיוך')}</dd></div>
        {doc && <div><dt>ספק</dt><dd>{doc.supplier_name || '—'}</dd></div>}
        {doc && <div><dt>סכום</dt><dd>{doc.total_amount != null ? `${Number(doc.total_amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })} ${doc.currency === 'ILS' || !doc.currency ? '₪' : doc.currency}` : '—'}</dd></div>}
        {doc && <div><dt>שם הקובץ המקורי</dt><dd dir="auto">{doc.file_name || '—'}</dd></div>}
        {doc?.email_from && <div><dt>הגיע מהמייל</dt><dd dir="auto">{doc.email_from}</dd></div>}
        <div><dt>אומת</dt><dd>{row.verified_at ? dateTime(row.verified_at) : 'עוד לא'}</dd></div>
        {row.error && <div><dt>הערה</dt><dd className="fin-cell-err">{row.error}</dd></div>}
      </dl>
      <div className="fin-dpanel__acts">
        {row.web_link && <a className="fin-btn fin-btn--primary fin-btn--sm" href={row.web_link} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> פתיחה ב-Drive</a>}
        <button type="button" className="fin-btn fin-btn--sm" onClick={() => go(`/documents/${row.document_id}`)}><Icon name="file" size={15} /> המסמך והנתונים</button>
        {canEdit && row.status === 'verified' && <button type="button" className="fin-btn fin-btn--sm" onClick={onRename}>שינוי שם</button>}
        {canEdit && ['needs_review', 'failed'].includes(row.status) && <button type="button" className="fin-btn fin-btn--sm" onClick={onRequeue}>העלאה מחדש</button>}
        {canEdit && row.status === 'verified' && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={onExclude}>הוצאה מהארכיון</button>}
      </div>
      <p className="fin-muted fin-small">שיוך לחברה, או תיקון של הספק, התאריך או הסכום, מעביר את הקובץ לתיקייה הנכונה ומשנה את שמו ב-Drive, תוך דקה.</p>
    </aside>
  )
}

/* a setting as one row: the whole row is the switch, so it is easy to hit with a finger */
function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} className="fin-drive__switch" disabled={disabled} onClick={() => onChange(!checked)}>
      <span>{label}</span><span className={`fin-toggle ${checked ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  )
}

function RenameDialog({ row, onClose, onSaved }) {
  const dot = String(row.organized_name || '').lastIndexOf('.')
  const [name, setName] = useState(dot > 0 ? row.organized_name.slice(0, dot) : row.organized_name || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const save = async () => {
    setBusy(true); setErr('')
    try { const r = await api.callServer('drive-rename', { target_id: row.target_id, document_id: row.document_id, name }); if (r.ok === false) throw new Error(r.error || 'השם לא נשמר'); onSaved(r.name) } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="שינוי שם הקובץ ב-Drive" onClose={onClose} footer={<><button type="button" className="fin-btn fin-btn--primary" disabled={busy || !name.trim()} onClick={save}>{busy ? 'שומר…' : 'שמירת השם'}</button><button type="button" className="fin-btn" onClick={onClose}>ביטול</button></>}>
      <Field label="השם החדש" hint="הסיומת נשמרת. תווים שאסור בשם קובץ מוחלפים במקף. השם נשמר גם בריצות הבאות."><input value={name} onChange={(e) => setName(e.target.value)} dir="auto" /></Field>
      {err && <p className="fin-error" role="alert">{err}</p>}
    </Modal>
  )
}

function Archive({ t, collected, documents, businesses, can, go, reloadAll, reloadDocs }) {
  const [rows, setRows] = useState(null)
  const [picked, setPicked] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [showProblems, setShowProblems] = useState(false)
  const [query, setQuery] = useState('')
  const [bulkBiz, setBulkBiz] = useState('')
  const [chosen, setChosen] = useState(() => new Set())
  const loadTree = useCallback(async () => { try { const r = await api.callServer('drive-tree', { target_id: t.id }); setRows((r.rows || []).map((x) => ({ ...x, target_id: t.id }))) } catch (e) { setErr(e.message) } }, [t.id])
  useEffect(() => { loadTree() }, [loadTree, t.counts?.verified])
  const c = t.counts || {}
  const shown = useMemo(() => {
    const qq = query.trim().toLowerCase()
    if (!qq) return rows || []
    return (rows || []).filter((r) => `${r.organized_name || ''} ${r.folder_path || ''}`.toLowerCase().includes(qq))
  }, [rows, query])
  const tree = useMemo(() => buildTree(shown), [shown])
  const docOf = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])
  // in the archive without a company: they sit in "מסמכים ללא שיוך" until a person (or the learning) assigns them
  const unassigned = useMemo(() => (rows || []).filter((r) => !r.business_id && ['verified', 'uploaded', 'queued'].includes(r.status)), [rows])
  const bizName = (id) => businesses.find((b) => b.id === id)?.name
  const pickedRow = picked && (rows || []).find((r) => r.document_id === picked)
  const missing = Math.max(0, (c.expected || 0) - (c.verified || 0))
  const operate = can('operate')

  const act = async (what, fn) => {
    setBusy(what); setErr(''); setMsg('')
    try { const m = await fn(); if (m) setMsg(m); await reloadAll(); await loadTree() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const runNow = () => act('run', async () => { const { results } = await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }); const r = results[0] || {}; return r.busy ? 'העלאה אחרת רצה עכשיו. המסך יתעדכן לבד.' : r.error ? (() => { throw new Error(r.error) })() : r.verified ? `${n(r.verified)} מסמכים הועלו ואומתו עכשיו.` : 'אין מסמכים חדשים להעלאה.' })
  // "verify all documents": the whole archive against Drive. What does not fit in one call goes on in the background.
  const check = () => act('check', async () => {
    const { results } = await api.callServer('drive-reconcile', { target_id: t.id }, { timeout: 70000 }); const r = results.find((x) => x.target === t.id) || {}
    if (r.error) throw new Error(r.error)
    if (r.status === 'running') return 'הבדיקה רצה ברקע וממשיכה לבד. הדוח יופיע כאן כשתסתיים.'
    return r.outstanding ? `הבדיקה הסתיימה עם ${n(r.outstanding)} מסמכים שדורשים טיפול. הפירוט בדוח למטה.` : `הבדיקה הושלמה: ${n(r.verified_now)} מסמכים נמצאים ב-Drive ונבדקו${r.restored ? `, ${n(r.restored)} שוחזרו` : ''}${r.corrected ? `, ${n(r.corrected)} תוקנו` : ''}.`
  })
  const pause = (paused) => act('pause', async () => { await api.callServer('drive-pause', { target_id: t.id, paused }); return paused ? 'הארכיון מושהה. שום דבר לא עולה ולא נבדק עד שממשיכים.' : 'הארכיון ממשיך לעבוד.' })
  const exclude = (ids) => act('exclude', async () => { await api.callServer('drive-exclude', { target_id: t.id, ids }); await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }).catch(() => null); return 'המסמך הוצא מהארכיון. העותק שלו עבר לפח של Drive, והוא לא יעלה שוב.' })
  const reconnect = async () => {
    setBusy('reconnect'); setErr('')
    try { const { url } = await api.callServer('cloud-auth-url', { provider: 'gdrive', back: 'drive' }); window.location.assign(url) } catch (e) { setErr(e.message); setBusy('') }
  }
  const rec = (t.reconciles || [])[0]
  const paused = t.enabled === false
  const requeue = (ids) => act('requeue', async () => { await api.callServer('drive-requeue', { target_id: t.id, ids }); await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }); return 'הקבצים הועלו שוב.' })
  // a company for documents: the file moves to that company's folder (the trigger queues it; run now so it moves at once)
  const assign = (ids, businessId) => act('assign', async () => {
    const name = businesses.find((b) => b.id === businessId)?.name || 'ללא שיוך'
    await api.updateDocuments(ids, { business_id: businessId || null })
    await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }).catch(() => null)
    setChosen(new Set())
    return `${ids.length === 1 ? 'המסמך שויך' : `${n(ids.length)} מסמכים שויכו`} ל${name}, והקבצים עברו לתיקייה שלה.`
  })
  // deleting a document from here: its file goes to the Drive trash first (so no stray copy is left there), then the document
  const removeDoc = async (d) => {
    if (!(await askConfirm({ title: 'מחיקת מסמך', text: `למחוק את "${d.supplier_name || d.file_name || 'המסמך'}"${d.total_amount != null ? ` (${money(d.total_amount, d.currency)})` : ''}? המסמך יימחק מהמערכת, והקובץ שלו ב-Drive יעבור לפח של Drive.`, ok: 'מחיקה', danger: true }))) return
    await act('delete', async () => {
      await api.callServer('drive-exclude', { target_id: t.id, ids: [d.id] })
      await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }).catch(() => null)
      await api.deleteDocument(d)
      setChosen((prev) => { const x = new Set(prev); x.delete(d.id); return x })
      await reloadDocs?.()
      return 'המסמך נמחק, והקובץ שלו עבר לפח של Drive.'
    })
  }
  const setting = (body) => act('settings', async () => { await api.callServer('drive-settings', { target_id: t.id, ...body }); return body.by_kind !== undefined ? 'המבנה עודכן. הקבצים יעברו לתיקיות החדשות בדקות הקרובות.' : '' })

  return (
    <article className="fin-drive" aria-label={`ארכיון Google Drive של ${t.account_email}`}>
      <header className="fin-scan__head">
        <ProviderLogo name="gdrive" />
        <div className="fin-scan__who"><strong dir="ltr">{t.account_email}</strong><small>תיקייה ראשית: {t.root_name}{t.last_sync_at ? ` · העלאה אחרונה ${dateTime(t.last_sync_at)}` : ''}</small></div>
        <Pill tone={t.status !== 'active' ? 'bad' : paused ? 'warn' : 'ok'}>{t.status !== 'active' ? 'דורש חיבור מחדש' : paused ? 'מושהה' : 'מחובר'}</Pill>
      </header>
      {t.last_error && <p className="fin-error" role="alert">{t.last_error}</p>}

      {(() => {
        const problems = (c.failed || 0) + (c.needs_review || 0)
        const state = problems ? 'is-warn' : missing ? 'is-busy' : 'is-ok'
        const pct = c.expected ? Math.round(((c.verified || 0) / c.expected) * 100) : 100
        return (
          <div className={`fin-drive__proof ${state}`} role="status">
            <Icon name={problems ? 'alert' : missing ? 'upload' : 'check'} size={18} />
            <div>
              <p><strong>{n(c.verified)} מתוך {n(c.expected)}</strong> חשבוניות וקבלות בארכיון, וכל אחת נבדקה מול Drive.{' '}
                {problems ? `${n(problems)} דורשות טיפול (ברשימה למטה).` : missing ? `מעלה עכשיו את ${n(missing)} הנותרות. אין צורך להשאיר את המסך פתוח.` : 'שום מסמך לא חסר.'}
                {t.last_reconcile_at ? ` בדיקה אחרונה מול Drive: ${dateTime(t.last_reconcile_at)}.` : ''}</p>
              {missing > 0 && !problems && <div className="fin-scan__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="התקדמות ההעלאה"><span style={{ width: `${pct}%` }} /></div>}
            </div>
          </div>
        )
      })()}
      <p className="fin-muted fin-small">עולות רק חשבוניות, חשבוניות-קבלה, קבלות, זיכויים ודרישות תשלום, כקובץ PDF או תמונה. גוף של מייל, אישור הזמנה, הצעת מחיר ואישור תשלום נשארים במערכת ולא עולים. בכל לילה הסוכן עובר על הארכיון: מה שלא שייך עובר לפח של Drive, ומה שחסר עולה.</p>

      <dl className="fin-scan__totals" aria-label="מצב הארכיון">
        <div><dt>נאספו מהמייל</dt><dd>{n(collected.total)}</dd></div>
        <div><dt>עברו ניתוח</dt><dd>{n(collected.read)}</dd></div>
        <div><dt>בארכיון ומאומתים</dt><dd>{n(c.verified)}</dd></div>
        <div><dt>ממתינים להעלאה</dt><dd>{n(c.pending)}</dd></div>
        <div className={c.failed ? 'is-bad' : ''}><dt>נכשלו</dt><dd>{n(c.failed)}</dd></div>
        <div className={unassigned.length ? 'is-attn' : ''}><dt>ממתינים לשיוך</dt><dd>{n(unassigned.length)}</dd></div>
        <div><dt>כפילויות · הוצאו</dt><dd>{n(c.duplicates)} · {n(c.withdrawn)}</dd></div>
        <div><dt>חברות · תיקיות</dt><dd>{n(t.companies)} · {n(t.folders)}</dd></div>
      </dl>

      {operate && (
        <div className="fin-scan__acts">
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={!!busy || paused} onClick={runNow}><Icon name="upload" size={15} /> {busy === 'run' ? 'מעלה…' : 'העלאה עכשיו'}</button>
          <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy || paused} onClick={check}><Icon name="check" size={15} /> {busy === 'check' ? 'בודק…' : 'בדיקת כל המסמכים מול Drive'}</button>
          {can('manage') && <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={reconnect}><Icon name="sync" size={15} /> {busy === 'reconnect' ? 'מעביר ל-Google…' : 'חיבור מחדש ובדיקת כל המסמכים'}</button>}
          <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" disabled={!!busy} onClick={() => pause(!paused)}>{paused ? 'המשך' : 'השהיה'}</button>
          {t.problems.length > 0 && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" aria-expanded={showProblems} onClick={() => setShowProblems((v) => !v)}><Icon name="alert" size={15} /> דורשים טיפול ({n(t.problems.length)})</button>}
        </div>
      )}
      {msg && <p className="fin-ok" role="status">{msg}</p>}
      {err && <p className="fin-error" role="alert">{err}</p>}

      {showProblems && t.problems.length > 0 && (
        <ul className="fin-scan__problems">
          {t.problems.map((p) => {
            const d = docOf.get(p.document_id)
            return (
              <li key={p.document_id}>
                <div><strong dir="auto">{p.organized_name || d?.file_name || 'מסמך'}</strong><small>{d?.supplier_name || ''}</small><small className="fin-cell-err">{ST[p.status]?.[1]}{p.attempts ? ` אחרי ${p.attempts} ניסיונות` : ''}: {p.error}</small></div>
                {operate && <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => requeue([p.document_id])}>העלאה מחדש</button>}
              </li>
            )
          })}
        </ul>
      )}

      {operate && unassigned.length > 0 && (
        <section className="fin-dassign" aria-label="מסמכים שממתינים לשיוך">
          <header>
            <h3>ממתינים לשיוך ({n(unassigned.length)})</h3>
            <p className="fin-muted fin-small">בחרו מסמכים וחברה. הקבצים יעברו מ"מסמכים ללא שיוך" לתיקיית החברה, והשיוך ילמד את הסוכן לפעם הבאה.</p>
          </header>
          <ul>
            {unassigned.slice(0, 200).map((r) => {
              const d = docOf.get(r.document_id)
              const day = d ? d.issue_date || String(d.created_at || '').slice(0, 10) : ''
              const from = d?.email_from ? d.email_from.replace(/<[^>]*>/g, '').replace(/"/g, '').trim() || d.email_from : ''
              const on = chosen.has(r.document_id)
              return (
                <li key={r.document_id} className={`fin-dassign__row ${on ? 'is-on' : ''}`}>
                  <label className="fin-dassign__check"><input type="checkbox" checked={on} onChange={(e) => setChosen((prev) => { const x = new Set(prev); if (e.target.checked) x.add(r.document_id); else x.delete(r.document_id); return x })} aria-label={`סימון ${d?.supplier_name || d?.file_name || 'מסמך'}`} /></label>
                  <time className="fin-dassign__date" dateTime={day || undefined}>{day ? <><b>{new Date(`${day}T00:00:00`).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}</b><small>{day.slice(0, 4)}</small></> : <small>בלי תאריך</small>}</time>
                  <Peek doc={d} className="fin-dassign__main">
                    <button type="button" className="fin-dassign__open" onClick={() => d && go(`/documents/${d.id}`)} title="פתיחת המסמך">
                      <strong dir="auto">{d?.supplier_name || d?.file_name || 'מסמך'}</strong>
                      <small>{[DOC_TYPE[d?.doc_type], d?.doc_number, from].filter(Boolean).join(' · ')}</small>
                    </button>
                  </Peek>
                  <b className="fin-dassign__sum">{d?.total_amount != null ? money(d.total_amount, d.currency) : '—'}</b>
                  <span className="fin-dassign__acts">
                    <button type="button" className="fin-icon-btn" onClick={() => d && go(`/documents/${d.id}`)} aria-label={`פתיחת ${d?.supplier_name || 'המסמך'}`} title="פתיחה במסך מלא"><Icon name="external" size={16} /></button>
                    {d && can('manage') && <button type="button" className="fin-icon-btn fin-icon-btn--danger" disabled={!!busy} onClick={() => removeDoc(d)} aria-label={`מחיקת ${d.supplier_name || d.file_name || 'המסמך'}`} title="מחיקת המסמך"><Icon name="trash" size={16} /></button>}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="fin-dassign__bar">
            <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => setChosen(chosen.size === unassigned.length ? new Set() : new Set(unassigned.map((r) => r.document_id)))}>{chosen.size === unassigned.length ? 'ניקוי הבחירה' : 'בחירת הכול'}</button>
            <select value={bulkBiz} onChange={(e) => setBulkBiz(e.target.value)} aria-label="החברה לשיוך"><option value="">בחרו חברה…</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={!chosen.size || !bulkBiz || !!busy} onClick={() => assign([...chosen], bulkBiz)}>{busy === 'assign' ? 'משייך…' : `שיוך ${chosen.size ? n(chosen.size) : ''} והעברה`}</button>
          </div>
        </section>
      )}

      {rec && (
        <details className="fin-drep" open={rec.status !== 'completed'}>
          <summary>
            <span>דוח בדיקה מול Drive</span>
            <Pill tone={rec.status === 'completed' ? 'ok' : rec.status === 'running' ? 'info' : 'warn'}>{rec.status === 'completed' ? 'הושלמה ואומתה' : rec.status === 'running' ? ({ list: 'סורק את Drive', compare: 'משווה למערכת', repair: 'משחזר ומתקן' }[rec.phase] || 'רצה') : rec.status === 'completed_with_issues' ? `הסתיימה, ${n(rec.report?.outstanding)} דורשים טיפול` : 'נכשלה'}</Pill>
            <small>{({ night: 'בדיקת הלילה', connect: 'אחרי חיבור', manual: 'ידנית', after_sync: 'אחרי העלאה' })[rec.trigger] || ''} · {dateTime(rec.finished_at || rec.started_at)}</small>
          </summary>
          {rec.status === 'running' && <p className="fin-muted fin-small">נסרקו עד עכשיו {n(rec.listed)} קבצים ב-{n(rec.pages)} עמודים. הבדיקה ממשיכה לבד, גם אם סוגרים את המסך.</p>}
          {rec.error && rec.status === 'running' && <p className="fin-cell-err fin-small">ניסיון אחרון: {rec.error}. ממשיך מאותה נקודה.</p>}
          {rec.report && rec.phase !== 'list' && (
            <dl className="fin-drep__grid">
              <div><dt>מסמכים בארכיון לפי המערכת</dt><dd>{n(rec.report.in_system)}</dd></div>
              <div><dt>נמצאו ב-Drive</dt><dd>{n(rec.report.found_in_drive)}</dd></div>
              <div><dt>תקינים (שם, תיקייה, תוכן)</dt><dd>{n(rec.report.verified_ok)}</dd></div>
              <div className={(rec.report.missing || 0) + (rec.report.trashed || 0) ? 'is-attn' : ''}><dt>חסרים או בפח</dt><dd>{n((rec.report.missing || 0) + (rec.report.trashed || 0))}</dd></div>
              <div><dt>שוחזרו מהמערכת</dt><dd>{n(rec.report.restored)}</dd></div>
              <div><dt>תיקייה או שם שגויים</dt><dd>{n((rec.report.wrong_folder || 0) + (rec.report.wrong_name || 0))}</dd></div>
              <div><dt>תוקנו</dt><dd>{n(rec.report.corrected)}</dd></div>
              <div><dt>תוכן שהשתנה</dt><dd>{n(rec.report.changed)}</dd></div>
              <div><dt>עותקים כפולים שהוסרו</dt><dd>{n(rec.report.duplicates_in_drive)}</dd></div>
              <div><dt>קבצים ב-Drive שלא מוכרים למערכת</dt><dd>{n(rec.report.orphans)}</dd></div>
              <div className={rec.report.outstanding ? 'is-attn' : ''}><dt>נשארו לטיפול</dt><dd>{n(rec.report.outstanding)}</dd></div>
            </dl>
          )}
          {rec.report?.orphans > 0 && <p className="fin-muted fin-small">קבצים לא מוכרים לא נמחקים ולא מוזזים. לדוגמה: {(rec.report.orphan_names || []).slice(0, 5).join(', ')}</p>}
          {(t.reconciles || []).length > 1 && <p className="fin-muted fin-small">בדיקות קודמות: {(t.reconciles || []).slice(1).map((r) => `${dateTime(r.finished_at || r.started_at)} (${r.status === 'completed' ? 'הושלמה' : r.status === 'running' ? 'רצה' : `${n(r.report?.outstanding)} לטיפול`})`).join(' · ')}</p>}
        </details>
      )}

      <section className="fin-dexplorer" aria-label="סייר הארכיון">
        <div className="fin-dexplorer__head">
          <h3>סייר הארכיון</h3>
          <input type="search" className="fin-dexplorer__search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי ספק, מספר, חודש…" aria-label="חיפוש בארכיון" />
        </div>
        {rows === null ? <p className="fin-muted" aria-busy="true">טוען…</p> : !tree.size ? <p className="fin-muted">{query ? 'לא נמצא קובץ שמתאים לחיפוש.' : 'עוד אין קבצים בארכיון. חשבוניות וקבלות חדשות עולות לבד כמה דקות אחרי שהן נקראות.'}</p> : (
          <div className={`fin-dexplorer__body ${pickedRow ? 'has-panel' : ''}`}>
            <div className="fin-dtree" dir="rtl">
              <p className="fin-dtree__root"><Icon name="folder" size={16} /> {t.root_name}</p>
              {[...tree.values()].sort((a, b) => a.name.localeCompare(b.name, 'he')).map((node) => <Folder key={node.name} node={node} depth={0} onPick={(f) => setPicked(f.document_id)} picked={picked} />)}
            </div>
            {pickedRow && <FilePanel row={pickedRow} doc={docOf.get(pickedRow.document_id)} business={bizName(pickedRow.business_id)} businesses={businesses} onAssign={assign} canEdit={operate} go={go} onClose={() => setPicked(null)} onRename={() => setRenaming(pickedRow)} onRequeue={() => requeue([pickedRow.document_id])} onExclude={() => exclude([pickedRow.document_id])} />}
          </div>
        )}
      </section>

      {can('manage') && (
        <details className="fin-drive__settings">
          <summary>הגדרות הארכיון</summary>
          <Switch checked={t.auto} disabled={!!busy} onChange={(v) => setting({ auto: v })} label="כל מסמך חדש עולה לבד, כמה דקות אחרי שהוא נקרא" />
          <Switch checked={t.by_kind} disabled={!!busy} onChange={(v) => setting({ by_kind: v })} label="תת-תיקייה לפי סוג בתוך כל חודש (חשבוניות, קבלות, זיכויים)" />
          <Switch checked={t.auto_correct !== false} disabled={!!busy} onChange={(v) => setting({ auto_correct: v })} label="קובץ של הארכיון שהוזז או ששמו שונה ב-Drive חוזר למקומו לבד" />
          <p className="fin-muted fin-small">המבנה: {t.root_name} › חברה › שנה › חודש{t.by_kind ? ' › סוג' : ''}. מסמך בלי חברה נכנס ל"מסמכים ללא שיוך", ועובר לתיקיית החברה ברגע שמשייכים אותו. שום קובץ לא נמחק מ-Drive.</p>
        </details>
      )}

      {renaming && <RenameDialog row={renaming} onClose={() => setRenaming(null)} onSaved={async (name) => { setRenaming(null); setMsg(`השם שונה ל-${name}`); await loadTree(); reloadAll() }} />}
    </article>
  )
}

export default function Drive() {
  const { documents, businesses, can, go, reload } = useFinance()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [connecting, setConnecting] = useState(false)
  const alive = useRef(true)
  const pumping = useRef(false)
  const load = useCallback(async () => { try { const r = await api.callServer('drive-overview'); if (alive.current) setData(r) } catch (e) { if (alive.current) setErr(e.message) } }, [])
  useEffect(() => { alive.current = true; load(); return () => { alive.current = false } }, [load])
  useEffect(() => {
    const ok = params.get('connected'); const bad = params.get('error')
    if (ok) setMsg(`Google Drive של ${ok} חובר. הסוכן בודק עכשיו כל מסמך מול Drive: מה שחסר משוחזר, ושום דבר לא עולה פעמיים.`)
    if (bad) setErr(`החיבור נכשל: ${bad}`)
    if (ok || bad) { setParams({}, { replace: true }); load() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const pending = (data?.targets || []).some((t) => t.enabled !== false && t.status === 'active' && ((t.auto && (t.counts?.pending || 0) > 0) || t.reconciles?.[0]?.status === 'running'))
  // while there is something to upload and the screen is open, it moves the queue on (in production the minute run does too;
  // the lock on each connection keeps two runs from uploading the same document)
  useEffect(() => {
    if (!pending || pumping.current || !can('operate')) return undefined
    pumping.current = true
    ;(async () => {
      for (let i = 0; i < 40 && alive.current; i++) {
        try {
          const { results } = await api.callServer('drive-run', {}, { timeout: 70000 })
          const fresh = await api.callServer('drive-overview'); if (alive.current) setData(fresh)
          const checking = (fresh.targets || []).filter((x) => x.reconciles?.[0]?.status === 'running')
          for (const x of checking) await api.callServer('drive-reconcile', { target_id: x.id }, { timeout: 70000 }).catch(() => null)
          if (!checking.length && !results.some((r) => r.verified || r.retry || r.busy)) break
        } catch { await new Promise((ok) => setTimeout(ok, 4000)) }
      }
      pumping.current = false
    })()
    return undefined
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps
  const connect = async () => {
    setConnecting(true); setErr('')
    try { const { url } = await api.callServer('cloud-auth-url', { provider: 'gdrive', back: 'drive' }); window.location.assign(url) } catch (e) { setErr(e.message); setConnecting(false) }
  }
  return (
    <div className="fin-stack">
      <PageHead title="Google Drive" sub="הארכיון המסודר: כל חשבונית וקבלה בתיקיית החברה, השנה והחודש שלה, בשם ברור, ונבדקת מול Drive" />
      {msg && <p className="fin-ok" role="status">{msg}</p>}
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
      {data === null ? <p className="fin-muted" aria-busy="true">טוען…</p> : !data.targets.length ? (
        <Empty title="עוד לא חובר Google Drive" icon="cloud" action={can('manage') && <button type="button" className="fin-btn fin-btn--primary" disabled={connecting} onClick={connect}>{connecting ? 'מעביר ל-Google…' : 'חיבור Google Drive'}</button>}>
          אחרי החיבור הסוכן יוצר תיקייה "ארכיון מסמכים עסקי", ובתוכה תיקייה לכל חברה, שנה וחודש. הוא מעלה לשם כל מסמך שנקרא, בשם כמו 2026-11-05_חשמל-ישיר_חשבונית-מס_12345_2450-שח.pdf. ההרשאה מאפשרת לו לראות רק את הקבצים שהוא עצמו יצר.
        </Empty>
      ) : data.targets.map((t) => <Archive key={t.id} t={t} reloadDocs={reload} collected={data.collected} documents={documents} businesses={businesses} can={can} go={go} reloadAll={load} />)}
    </div>
  )
}
