import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { dateTime } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Empty, Field, Icon, Modal, Pill, PageHead, Toggle } from './ui.jsx'

// The Google Drive archive: every document that was read goes to "main folder / company / year / MM - month" under a clear
// name, and counts as archived only after it was read back from Drive (server/finance/archive.js).
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const ST = {
  verified: ['ok', 'בארכיון'], uploaded: ['info', 'הועלה, בבדיקה'], uploading: ['info', 'בהעלאה'], queued: ['muted', 'ממתין להעלאה'],
  failed: ['bad', 'ההעלאה נכשלה'], duplicate: ['muted', 'כפילות'], needs_review: ['warn', 'דורש בדיקה'],
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
      <summary><Icon name="folder" size={16} /> <span>{node.name}</span> <small>{n(node.count)}</small></summary>
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

function FilePanel({ row, doc, business, canEdit, onRename, onRequeue, go, onClose }) {
  const [tone, label] = ST[row.status] || ['muted', row.status]
  return (
    <aside className="fin-dpanel" aria-label="פרטי הקובץ בארכיון">
      <header>
        <strong dir="auto">{row.organized_name || 'עוד בלי שם'}</strong>
        <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={onClose} aria-label="סגירה"><Icon name="x" size={15} /></button>
      </header>
      <Pill tone={tone}>{label}</Pill>
      <dl className="fin-dpanel__meta">
        <div><dt>תיקייה</dt><dd dir="auto">{row.folder_path || '—'}</dd></div>
        <div><dt>חברה</dt><dd>{business || 'ללא שיוך'}</dd></div>
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
        {canEdit && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => go(`/documents/${row.document_id}`)}>תיקון שיוך</button>}
        {canEdit && ['needs_review', 'failed'].includes(row.status) && <button type="button" className="fin-btn fin-btn--sm" onClick={onRequeue}>העלאה מחדש</button>}
      </div>
      <p className="fin-muted fin-small">תיקון של החברה, הספק, התאריך או הסכום במסמך מעביר ומשנה את שם הקובץ ב-Drive לבד, תוך דקה.</p>
    </aside>
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

function Archive({ t, collected, documents, businesses, can, go, reloadAll }) {
  const [rows, setRows] = useState(null)
  const [picked, setPicked] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [showProblems, setShowProblems] = useState(false)
  const loadTree = useCallback(async () => { try { const r = await api.callServer('drive-tree', { target_id: t.id }); setRows((r.rows || []).map((x) => ({ ...x, target_id: t.id }))) } catch (e) { setErr(e.message) } }, [t.id])
  useEffect(() => { loadTree() }, [loadTree, t.counts?.verified])
  const c = t.counts || {}
  const tree = useMemo(() => buildTree(rows || []), [rows])
  const docOf = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])
  const bizName = (id) => businesses.find((b) => b.id === id)?.name
  const pickedRow = picked && (rows || []).find((r) => r.document_id === picked)
  const missing = Math.max(0, (c.expected || 0) - (c.verified || 0))
  const operate = can('operate')

  const act = async (what, fn) => {
    setBusy(what); setErr(''); setMsg('')
    try { const m = await fn(); if (m) setMsg(m); await reloadAll(); await loadTree() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const runNow = () => act('run', async () => { const { results } = await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }); const r = results[0] || {}; return r.busy ? 'העלאה אחרת רצה עכשיו. המסך יתעדכן לבד.' : r.error ? (() => { throw new Error(r.error) })() : r.verified ? `${n(r.verified)} מסמכים הועלו ואומתו עכשיו.` : 'אין מסמכים חדשים להעלאה.' })
  const check = () => act('check', async () => { const { results } = await api.callServer('drive-reconcile', {}, { timeout: 70000 }); const r = results.find((x) => x.target === t.id) || {}; if (r.error) throw new Error(r.error); return r.missing ? `נמצאו ${n(r.missing)} קבצים שחסרים ב-Drive. הם ברשימת "דורש בדיקה" עם "העלאה מחדש".` : 'הבדיקה הושלמה: כל מה שאמור להיות בארכיון נמצא ב-Drive.' })
  const requeue = (ids) => act('requeue', async () => { await api.callServer('drive-requeue', { target_id: t.id, ids }); await api.callServer('drive-run', { target_id: t.id }, { timeout: 70000 }); return 'הקבצים הועלו שוב.' })
  const setting = (body) => act('settings', async () => { await api.callServer('drive-settings', { target_id: t.id, ...body }); return body.by_kind !== undefined ? 'המבנה עודכן. הקבצים יעברו לתיקיות החדשות בדקות הקרובות.' : '' })

  return (
    <article className="fin-drive" aria-label={`ארכיון Google Drive של ${t.account_email}`}>
      <header className="fin-scan__head">
        <ProviderLogo name="gdrive" />
        <div className="fin-scan__who"><strong dir="ltr">{t.account_email}</strong><small>תיקייה ראשית: {t.root_name}{t.last_sync_at ? ` · העלאה אחרונה ${dateTime(t.last_sync_at)}` : ''}</small></div>
        <Pill tone={t.status === 'active' ? 'ok' : 'bad'}>{t.status === 'active' ? 'מחובר' : 'דורש חיבור מחדש'}</Pill>
      </header>
      {t.last_error && <p className="fin-error" role="alert">{t.last_error}</p>}

      <div className={`fin-drive__proof ${missing || c.failed || c.needs_review ? 'is-warn' : 'is-ok'}`} role="status">
        <Icon name={missing || c.failed || c.needs_review ? 'alert' : 'check'} size={18} />
        <p><strong>{n(c.verified)} מתוך {n(c.expected)}</strong> מסמכים בארכיון, וכל אחד נבדק מול Drive.{' '}
          {missing ? `${n(missing)} עוד לא שם: ${[c.pending && `${n(c.pending)} בתור`, c.failed && `${n(c.failed)} נכשלו`, c.needs_review && `${n(c.needs_review)} דורשים בדיקה`].filter(Boolean).join(', ')}.` : 'שום מסמך לא חסר.'}
          {t.last_reconcile_at ? ` בדיקת שלמות אחרונה: ${dateTime(t.last_reconcile_at)}.` : ''}</p>
      </div>

      <dl className="fin-scan__totals" aria-label="מצב הארכיון">
        <div><dt>נאספו מהמייל</dt><dd>{n(collected.total)}</dd></div>
        <div><dt>עברו ניתוח</dt><dd>{n(collected.read)}</dd></div>
        <div><dt>בארכיון ומאומתים</dt><dd>{n(c.verified)}</dd></div>
        <div><dt>ממתינים להעלאה</dt><dd>{n(c.pending)}</dd></div>
        <div className={c.failed ? 'is-bad' : ''}><dt>נכשלו</dt><dd>{n(c.failed)}</dd></div>
        <div><dt>ממתינים לשיוך</dt><dd>{n(t.unassigned)}</dd></div>
        <div><dt>כפילויות</dt><dd>{n(c.duplicates)}</dd></div>
        <div><dt>חברות · תיקיות</dt><dd>{n(t.companies)} · {n(t.folders)}</dd></div>
      </dl>

      {operate && (
        <div className="fin-scan__acts">
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={!!busy} onClick={runNow}><Icon name="upload" size={15} /> {busy === 'run' ? 'מעלה…' : 'העלאה עכשיו'}</button>
          <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={check}><Icon name="check" size={15} /> {busy === 'check' ? 'בודק…' : 'בדיקת שלמות מול Drive'}</button>
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

      <section className="fin-dexplorer" aria-label="סייר הארכיון">
        <h3>סייר הארכיון</h3>
        {rows === null ? <p className="fin-muted" aria-busy="true">טוען…</p> : !tree.size ? <p className="fin-muted">עוד אין קבצים בארכיון. מסמכים חדשים עולים לבד כמה דקות אחרי שהם נקראים.</p> : (
          <div className={`fin-dexplorer__body ${pickedRow ? 'has-panel' : ''}`}>
            <div className="fin-dtree" dir="rtl">
              <p className="fin-dtree__root"><Icon name="folder" size={16} /> {t.root_name}</p>
              {[...tree.values()].sort((a, b) => a.name.localeCompare(b.name, 'he')).map((node) => <Folder key={node.name} node={node} depth={0} onPick={(f) => setPicked(f.document_id)} picked={picked} />)}
            </div>
            {pickedRow && <FilePanel row={pickedRow} doc={docOf.get(pickedRow.document_id)} business={bizName(pickedRow.business_id)} canEdit={operate} go={go} onClose={() => setPicked(null)} onRename={() => setRenaming(pickedRow)} onRequeue={() => requeue([pickedRow.document_id])} />}
          </div>
        )}
      </section>

      {can('manage') && (
        <details className="fin-drive__settings">
          <summary>הגדרות הארכיון</summary>
          <Toggle checked={t.auto} disabled={!!busy} onChange={(v) => setting({ auto: v })} label="כל מסמך חדש עולה לבד, כמה דקות אחרי שהוא נקרא" />
          <Toggle checked={t.by_kind} disabled={!!busy} onChange={(v) => setting({ by_kind: v })} label="תת-תיקייה לפי סוג בתוך כל חודש (חשבוניות, קבלות, זיכויים)" />
          <p className="fin-muted fin-small">המבנה: {t.root_name} › חברה › שנה › חודש{t.by_kind ? ' › סוג' : ''}. מסמך בלי חברה נכנס ל"מסמכים ללא שיוך", ועובר לתיקיית החברה ברגע שמשייכים אותו. שום קובץ לא נמחק מ-Drive.</p>
        </details>
      )}

      {renaming && <RenameDialog row={renaming} onClose={() => setRenaming(null)} onSaved={async (name) => { setRenaming(null); setMsg(`השם שונה ל-${name}`); await loadTree(); reloadAll() }} />}
    </article>
  )
}

export default function Drive() {
  const { documents, businesses, can, go } = useFinance()
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
    if (ok) setMsg(`Google Drive של ${ok} חובר. הסוכן יוצר עכשיו את "ארכיון מסמכים עסקי" ומעלה אליו את כל המסמכים.`)
    if (bad) setErr(`החיבור נכשל: ${bad}`)
    if (ok || bad) { setParams({}, { replace: true }); load() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const pending = (data?.targets || []).some((t) => t.auto && t.status === 'active' && ((t.counts?.pending || 0) > 0 || (data?.collected?.read || 0) > (t.counts?.expected || 0)))
  // while there is something to upload and the screen is open, it moves the queue on (in production the minute run does too;
  // the lock on each connection keeps two runs from uploading the same document)
  useEffect(() => {
    if (!pending || pumping.current || !can('operate')) return undefined
    pumping.current = true
    ;(async () => {
      for (let i = 0; i < 40 && alive.current; i++) {
        try { const { results } = await api.callServer('drive-run', {}, { timeout: 70000 }); await load(); if (!results.some((r) => r.verified || r.retry || r.busy)) break } catch { await new Promise((ok) => setTimeout(ok, 4000)) }
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
      ) : data.targets.map((t) => <Archive key={t.id} t={t} collected={data.collected} documents={documents} businesses={businesses} can={can} go={go} reloadAll={load} />)}
    </div>
  )
}
