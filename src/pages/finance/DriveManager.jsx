import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api.js'
import { DOC_TYPE, date, dateTime, money, monthLabel } from './format.js'
import { Empty, Field, Icon, Modal, Pill, askConfirm } from './ui.jsx'
import Thumbnail from './Thumbnail.jsx'
import DocPreview from './DocPreview.jsx'
import { moments } from './moments.js'

/* The file manager of the Google Drive archive, laid out and behaving like Drive itself. What it shows is what the
   archive holds in Drive (fin_drive_files, read back from Drive by the server), and every action here is a real
   operation there: a move between companies or months moves the file (drive-move), a move into a folder a person made
   keeps it there (drive-pin), a rename renames it (drive-rename), "to the trash" sends the copy to the Drive trash and
   keeps the document (drive-exclude), a deletion removes the document too (documents-delete). An action is reported as
   done only after Drive confirmed it; otherwise the row says it is pending.
   The other direction runs by itself: what a person renamed, moved, trashed or restored in Drive is followed here
   (drive-sync, every minute while the screen is open, and on the button). */
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const NONE = 'מסמכים ללא שיוך'
const SYNC = {
  verified: ['ok', 'מסונכרן'], uploaded: ['info', 'בבדיקה'], uploading: ['info', 'עולה'], queued: ['warn', 'ממתין לסנכרון'],
  failed: ['bad', 'הסנכרון נכשל'], needs_review: ['bad', 'דורש בדיקה'], duplicate: ['muted', 'כפילות'],
}
const PENDING = ['queued', 'uploading', 'uploaded']
const FAILED = ['failed', 'needs_review']
const size = (b) => (b == null ? '—' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`)
const kindOf = (d) => { const m = String(d?.file_mime || ''); return m.includes('pdf') ? 'PDF' : m.startsWith('image/') ? 'תמונה' : m.startsWith('text/') ? 'מייל' : 'קובץ' }
const VIEWS = [['all', 'כל הקבצים', 'docs'], ['drive', 'התיקייה שלי', 'folder'], ['recent', 'אחרונים', 'clock'], ['starred', 'מסומנים בכוכב', 'sparkle'], ['shared', 'שותפו איתי', 'share'],
  ['invoices', 'חשבוניות', 'file'], ['receipts', 'קבלות', 'file'], ['credits', 'חשבוניות זיכוי', 'file'], ['review', 'מסמכים לבדיקה', 'alert'], ['trash', 'אשפה', 'trash'], ['accounts', 'חשבונות מחוברים', 'cloud']]
const TYPE_VIEW = { invoices: ['invoice', 'invoice_receipt', 'supplier_bill'], receipts: ['receipt', 'payment_confirmation'], credits: ['credit'] }
const PANELS = ['shared', 'accounts']   // views that are not a list of files
const MANUAL = /(^|\/)m:[0-9a-f]+$/
const SORTS = [['date', 'תאריך המסמך'], ['name', 'שם'], ['uploaded', 'תאריך העלאה'], ['size', 'גודל'], ['type', 'סוג מסמך']]
// what the activity list says for each event the archive records
const EVENT = { uploaded: 'הועלה ל-Drive', verified: 'אומת מול Drive', renamed: 'השם תוקן', moved: 'הועבר לתיקייה', renamed_by_user: 'השם שונה במערכת', moved_by_user: 'הועבר במערכת', renamed_in_drive: 'השם שונה ב-Google Drive', moved_in_drive: 'הועבר ב-Google Drive',
  trashed_in_drive: 'הועבר לפח ב-Google Drive', restored_in_drive: 'שוחזר מהפח ב-Google Drive', restored_by_user: 'שוחזר מהאשפה', excluded_by_user: 'הועבר לאשפה במערכת', included_by_user: 'הוחזר לארכיון', withdrawn: 'העותק עבר לפח של Drive', missing: 'נעלם מ-Drive ושוחזר', changed: 'התוכן שונה ב-Drive',
  restored: 'שוחזר', corrected: 'תוקן', retry: 'ניסיון חוזר', failed: 'נכשל', requeued: 'נשלח שוב לסנכרון', duplicate: 'כפילות', rate_limited: 'Drive ביקש להאט', pin_lost: 'התיקייה שנבחרה נעלמה מ-Drive', folder_created: 'נוצרה תיקייה' }
const bytes = (b) => (b == null ? '—' : b < 1024 ** 3 ? `${(b / 1048576).toFixed(0)} MB` : `${(b / 1024 ** 3).toFixed(1)} GB`)
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const readStars = () => { try { return new Set(JSON.parse(localStorage.getItem('fin-drive-stars') || '[]')) } catch { return new Set() } }

/* the folders as Drive holds them: company → year → month (→ kind). Each knows which company and month it stands for,
   so dropping a file on it is a move to exactly that place. */
function buildFolders(items, extra = []) {
  const root = { name: '', path: [], key: 'root', children: new Map(), files: [], count: 0 }
  // the key of the folder `depth` levels down, read from the key of the leaf ("root/m:ab" has one level, "b:id/2026/11" three)
  const keyAt = (leafKey, depth, total) => { if (!leafKey || leafKey === 'pin') return null; const segs = String(leafKey).split('/'); const off = segs[0] === 'root' ? 1 : 0; return segs.length - off === total ? segs.slice(0, off + depth).join('/') : null }
  const walk = (parts, leafKey, row) => {
    let node = root
    parts.forEach((p, i) => {
      if (!node.children.has(p)) node.children.set(p, { name: p, path: parts.slice(0, i + 1), children: new Map(), files: [], count: 0, biz: row?.business_id || '', last: '', key: null })
      node = node.children.get(p)
      const k = keyAt(leafKey, i + 1, parts.length); if (k && !node.key) { node.key = k; node.manual = MANUAL.test(k) }
      if (row) { node.count++; if (String(row.updated_at || '') > node.last) node.last = row.updated_at }
    })
    return node
  }
  for (const it of items) { if (it.parts.length) walk(it.parts, it.row.folder_key, it.row).files.push(it) }
  // the folders a person made are there even when they are empty
  for (const f of extra) walk(String(f.path || '').split('/').filter(Boolean).slice(1), f.key, null)
  return root
}
// what a folder means as a destination: a company folder is a company; a month folder is a company and a month
const destOf = (node) => {
  if (!node?.path?.length) return null
  // a folder a person made: the file is kept in it, and the document's company and month stay as they are
  if (node.manual) return { folder: node.key }
  if (!node.key || !/^b:/.test(node.key)) return null
  if (node.path.length === 1) return { business_id: node.biz }
  const y = node.path[1]; const m = String(node.path[2] || '').slice(0, 2)
  return node.path.length >= 3 && /^\d{4}$/.test(y) && /^\d{2}$/.test(m) ? { business_id: node.biz, period: `${y}-${m}` } : null
}

/* where to: company, year, month. With `assign` also the kind of document and a note (one document). */
function MoveSheet({ items, businesses, assign, busy, folders = [], onClose, onGo }) {
  const one = items.length === 1 ? items[0] : null
  const first = items[0]
  const [biz, setBiz] = useState(items.every((i) => (i.row.business_id || '') === (first.row.business_id || '')) ? first.row.business_id || '' : '')
  const start = /^\d{4}-\d{2}$/.test(first.period || '') && items.every((i) => i.period === first.period) ? first.period : ''
  const [year, setYear] = useState(start ? start.slice(0, 4) : '')
  const [month, setMonth] = useState(start ? start.slice(5, 7) : '')
  const [type, setType] = useState(one?.doc?.doc_type || '')
  const [notes, setNotes] = useState(one?.doc?.notes || '')
  const [find, setFind] = useState('')
  const [folder, setFolder] = useState('')   // '' = by company and month · a key = a folder the person made
  const thisYear = new Date().getFullYear()
  const years = [...new Set([String(thisYear + 1), String(thisYear), String(thisYear - 1), String(thisYear - 2), String(thisYear - 3), year].filter(Boolean))].sort().reverse()
  const shownBiz = businesses.filter((b) => !find.trim() || b.name.toLowerCase().includes(find.trim().toLowerCase()) || b.id === biz)
  const period = year && month ? `${year}-${month}` : undefined
  const half = (year && !month) || (!year && month)
  return (
    <Modal title={assign ? (one ? 'שיוך מסמך' : `שיוך ${n(items.length)} מסמכים`) : (one ? 'העברת מסמך' : `העברת ${n(items.length)} מסמכים`)} onClose={onClose} footer={<>
      <button type="button" className="fin-btn fin-btn--primary" disabled={busy || half} onClick={() => onGo(folder ? { folder } : { business_id: biz, period, ...(one && assign ? { doc_type: type, notes } : {}) })}>{busy ? 'מעביר ב-Drive…' : assign ? 'שיוך והעברה ב-Drive' : 'העברה ב-Drive'}</button>
      <button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>ביטול</button>
    </>}>
      {one && <p className="fin-dm__sheetdoc" dir="auto"><Icon name="file" size={16} /> {one.name}</p>}
      {!assign && folders.length > 0 && <Field label="לאן"><select value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="יעד ההעברה"><option value="">תיקיית החברה והחודש</option>{folders.map((f) => <option key={f.key} value={f.key}>{String(f.path).split('/').filter(Boolean).slice(1).join(' › ')}</option>)}</select></Field>}
      {folder ? <p className="fin-muted fin-small">הקובץ יעבור לתיקייה שנבחרה ויישאר בה. החברה והחודש החשבונאי של המסמך לא משתנים.</p> : <>
      {businesses.length > 7 && <label className="fin-search fin-dm__find"><Icon name="search" size={16} /><input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="חיפוש חברה" aria-label="חיפוש חברה" /></label>}
      <Field label="חברה"><select value={biz} onChange={(e) => setBiz(e.target.value)}><option value="">ללא שיוך</option>{shownBiz.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <div className="fin-dm__two">
        <Field label="שנה"><select value={year} onChange={(e) => setYear(e.target.value)}><option value="">לפי תאריך המסמך</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></Field>
        <Field label="חודש חשבונאי"><select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">לפי תאריך המסמך</option>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</select></Field>
      </div>
      {half && <p className="fin-error" role="alert">בוחרים גם שנה וגם חודש, או משאירים את שניהם לפי תאריך המסמך.</p>}
      {one && assign && <>
        <Field label="סוג המסמך"><select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(DOC_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="הערה (לא חובה)"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </>}
      <p className="fin-muted fin-small">הקובץ עובר ב-Google Drive לתיקיית החברה והחודש שנבחרו. ההודעה על הצלחה מופיעה רק אחרי ש-Drive אישר.</p>
      </>}
    </Modal>
  )
}

export default function DriveManager({ t, rows, documents, businesses, can, go, openUpload, onReload, onRename, onSync, syncing, onConnect }) {
  const [view, setView] = useState('drive')
  const [path, setPath] = useState([])
  const [q, setQ] = useState('')
  const [f, setF] = useState({ biz: '', month: '', type: '', sync: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('fin-drive-view') === 'grid' ? 'grid' : 'list' } catch { return 'list' } })
  const [sel, setSel] = useState(() => new Set())
  const [picking, setPicking] = useState(false)
  const [detail, setDetail] = useState(null)
  const [menu, setMenu] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState(null)
  const [working, setWorking] = useState('')
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState('')
  const [limit, setLimit] = useState(60)
  const [stars, setStars] = useState(readStars)
  const [sort, setSort] = useState('date')
  const [extras, setExtras] = useState({ folders: [], trash: [], two_way: true, sync: null })
  const [accounts, setAccounts] = useState(null)
  const [folderDlg, setFolderDlg] = useState(null)     // { mode: 'create' | 'rename', parent, key, name }
  const [events, setEvents] = useState(null)           // the activity of the open document
  const [pulling, setPulling] = useState(false)
  const [sharedFiles, setSharedFiles] = useState(null)   // files others shared with the account (the wide permission only)
  const upHere = useRef(null)
  const loadExtras = useCallback(async () => { try { setExtras(await api.callServer('drive-extras', { target_id: t.id })) } catch { /* the list still works without them */ } }, [t.id])
  useEffect(() => { loadExtras() }, [loadExtras, rows])
  const press = useRef(null)
  const operate = can('operate')
  const docOf = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])
  const bizName = (id) => businesses.find((b) => b.id === id)?.name
  const setModeKeep = (m) => { setMode(m); try { localStorage.setItem('fin-drive-view', m) } catch { /* a preference only */ } }
  const star = (id) => setStars((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); try { localStorage.setItem('fin-drive-stars', JSON.stringify([...x])) } catch { /* a preference only */ } return x })

  const items = useMemo(() => (rows || []).filter((r) => r.status !== 'duplicate' || r.folder_path).map((r) => {
    const doc = docOf.get(r.document_id)
    const parts = String(r.folder_path || '').split('/').filter(Boolean).slice(1)
    const fromFolder = /^\d{4}$/.test(parts[1] || '') && /^\d{2}/.test(parts[2] || '') ? `${parts[1]}-${parts[2].slice(0, 2)}` : ''
    return { id: r.document_id, row: r, doc, parts, name: r.organized_name || doc?.file_name || 'מסמך', company: r.business_id ? bizName(r.business_id) || parts[0] || '—' : '', period: fromFolder || doc?.accounting_period || '' }
  }), [rows, docOf, businesses]) // eslint-disable-line react-hooks/exhaustive-deps
  // what is in the trash of this screen: taken out of the archive here, or trashed in Drive itself
  const trashItems = useMemo(() => (extras.trash || []).map((r) => { const doc = docOf.get(r.document_id); return { id: r.document_id, row: { ...r, status: 'withdrawn' }, doc, parts: [], name: r.organized_name || doc?.file_name || 'מסמך', company: r.business_id ? bizName(r.business_id) || '' : '', period: doc?.accounting_period || '', trash: true } }), [extras.trash, docOf, businesses]) // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map([...trashItems, ...items].map((i) => [i.id, i])), [items, trashItems])
  const folders = useMemo(() => buildFolders(items, extras.folders), [items, extras.folders])
  const here = useMemo(() => { let node = folders; for (const p of path) { node = node.children.get(p); if (!node) return null } return node }, [folders, path])
  useEffect(() => { if (view === 'drive' && path.length && !here) setPath([]) }, [here, path, view])
  useEffect(() => { setLimit(60) }, [view, path, q, f, sort])
  // a selection keeps only what is still here (a deletion or a move elsewhere takes the rest out)
  useEffect(() => { setSel((s) => { const x = new Set([...s].filter((id) => byId.has(id))); return x.size === s.size ? s : x }); if (detail && !byId.has(detail)) setDetail(null) }, [byId]) // eslint-disable-line react-hooks/exhaustive-deps

  const word = q.trim().toLowerCase()
  const sorted = (list) => {
    const v = { date: (i) => String(i.doc?.issue_date || i.row.updated_at || ''), name: (i) => i.name, uploaded: (i) => String(i.row.uploaded_at || ''), size: (i) => Number(i.doc?.file_size) || 0, type: (i) => DOC_TYPE[i.doc?.doc_type] || '' }[sort]
    return [...list].sort((a, b) => (sort === 'name' || sort === 'type' ? String(v(a)).localeCompare(String(v(b)), 'he') : sort === 'size' ? v(b) - v(a) : String(v(b)).localeCompare(String(v(a)))))
  }
  const filtering = !!word || Object.values(f).some(Boolean)
  const match = (i) => {
    const d = i.doc || {}
    if (f.biz && (f.biz === 'none' ? i.row.business_id : i.row.business_id !== f.biz)) return false
    if (f.month && i.period !== f.month) return false
    if (f.type && d.doc_type !== f.type) return false
    if (f.sync && (f.sync === 'ok' ? i.row.status !== 'verified' : f.sync === 'pending' ? !PENDING.includes(i.row.status) : !FAILED.includes(i.row.status))) return false
    if (!word) return true
    return [i.name, i.company, d.supplier_name, d.doc_number, d.supplier_vat_id, d.file_name, i.period, DOC_TYPE[d.doc_type], d.total_amount, d.currency, d.issue_date, i.row.folder_path, d.description, d.notes, d.email_subject, d.email_from, d.payment_method, t.account_email].filter((v) => v != null).join(' ').toLowerCase().includes(word)
  }
  const browsing = view === 'drive' && !filtering
  const flat = useMemo(() => {
    if (PANELS.includes(view)) return []
    if (browsing) return sorted(here ? here.files : [])
    let list = (view === 'trash' ? trashItems : items).filter(match)
    if (TYPE_VIEW[view]) list = list.filter((i) => TYPE_VIEW[view].includes(i.doc?.doc_type))
    if (view === 'review') list = list.filter((i) => !i.row.business_id || FAILED.includes(i.row.status) || i.doc?.status === 'review')
    if (view === 'starred') list = list.filter((i) => stars.has(i.id))
    if (view === 'recent') return [...list].sort((a, b) => String(b.row.updated_at || b.row.uploaded_at || '').localeCompare(String(a.row.updated_at || a.row.uploaded_at || ''))).slice(0, 60)
    if (view === 'trash') return [...list].sort((a, b) => String(b.row.updated_at || '').localeCompare(String(a.row.updated_at || '')))
    return sorted(list)
  }, [browsing, here, items, trashItems, view, word, f, stars, sort]) // eslint-disable-line react-hooks/exhaustive-deps
  // every folder in the tree, by its key (for the starred view)
  const starredFolders = useMemo(() => { const out = []; const walk = (nd) => { for (const c of nd.children.values()) { if (c.key && stars.has(`f:${c.key}`)) out.push(c); walk(c) } }; walk(folders); return out }, [folders, stars])
  const subfolders = view === 'starred' && !filtering ? starredFolders : browsing && here ? [...here.children.values()].sort((a, b) => (here.path.length === 0 ? (a.name === NONE ? -1 : b.name === NONE ? 1 : a.name.localeCompare(b.name, 'he')) : b.name.localeCompare(a.name, 'he'))) : []
  const months = useMemo(() => [...new Set(items.map((i) => i.period).filter(Boolean))].sort().reverse(), [items])
  const types = useMemo(() => [...new Set(items.map((i) => i.doc?.doc_type).filter(Boolean))], [items])
  const counts = useMemo(() => ({ all: items.length, unassigned: items.filter((i) => !i.row.business_id).length, review: items.filter((i) => !i.row.business_id || FAILED.includes(i.row.status) || i.doc?.status === 'review').length, pending: items.filter((i) => PENDING.includes(i.row.status)).length, failed: items.filter((i) => FAILED.includes(i.row.status)).length }), [items])
  const chosen = flat.filter((i) => sel.has(i.id))
  const allOn = flat.length > 0 && chosen.length === flat.length

  const say = (tone, text) => setNote({ tone, text })
  const run = async (what, fn) => { setWorking(what); setNote(null); try { await fn() } catch (e) { say('bad', e.message) } finally { setWorking('') } }
  const toggle = (id) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x })

  // ---------- the real operations ----------
  const move = (ids, dest, extra = {}) => run('move', async () => {
    if (!ids.length) return
    // into a folder a person made (or back to the folder the company and month give): the file moves, the document's details stay
    if (dest.folder !== undefined) {
      const r = await api.callServer('drive-pin', { target_id: t.id, ids, folder: dest.folder || null }, { timeout: 90000 })
      setSheet(null); setSel(new Set()); setPicking(false)
      await onReload(); await loadExtras()
      const where = dest.folder ? String(extras.folders.find((x) => x.key === dest.folder)?.path || '').split('/').filter(Boolean).slice(1).join(' › ') || 'התיקייה' : 'תיקיית החברה והחודש'
      if (r.failed) say('bad', `${n(r.moved)} הועברו, ${n(r.failed)} לא: ${r.results.find((x) => !x.ok)?.error}`)
      else if (r.pending) say('warn', `${n(r.moved)} הועברו ל${where}. ${n(r.pending)} עוד לא הועברו ב-Drive; הסנכרון הבא יעביר אותם.`)
      else { say('ok', `${r.moved === 1 ? 'המסמך הועבר' : `${n(r.moved)} מסמכים הועברו`} ל${where}, והקובץ עבר לשם ב-Drive.`); moments.save?.({ title: r.moved === 1 ? 'המסמך הועבר ב-Drive' : `${n(r.moved)} מסמכים הועברו ב-Drive`, sub: where }) }
      return
    }
    // the kind and the note of one document are saved first, then the move itself
    if (ids.length === 1 && (extra.doc_type || extra.notes !== undefined)) {
      const d = docOf.get(ids[0]); const patch = {}
      if (extra.doc_type && extra.doc_type !== d?.doc_type) patch.doc_type = extra.doc_type
      if (extra.notes !== undefined && (extra.notes || '') !== (d?.notes || '')) patch.notes = extra.notes || null
      if (Object.keys(patch).length) await api.updateDocument(ids[0], patch)
    }
    const r = await api.callServer('drive-move', { target_id: t.id, ids, ...(dest.business_id !== undefined ? { business_id: dest.business_id } : {}), ...(dest.period ? { period: dest.period } : {}) }, { timeout: 90000 })
    const bad = r.results.filter((x) => !x.ok)
    const where = [dest.business_id !== undefined ? (dest.business_id ? bizName(dest.business_id) : 'ללא שיוך') : '', dest.period ? monthLabel(dest.period) : ''].filter(Boolean).join(' · ')
    const done = r.results.filter((x) => x.ok && !x.same).length
    setSheet(null); setSel(new Set()); setPicking(false)
    await onReload()
    if (bad.length) say('bad', `${n(done)} הועברו, ${n(bad.length)} לא: ${bad[0].error}`)
    else if (r.pending) say('warn', `${n(done)} שויכו ל${where}. ${n(r.pending)} עוד לא הועברו ב-Drive (${r.results.find((x) => x.drive === 'pending')?.error || 'Drive לא ענה'}); הסנכרון הבא יעביר אותם.`)
    else if (!done) say('info', 'המסמכים כבר נמצאים שם.')
    else { say('ok', `${done === 1 ? 'המסמך הועבר' : `${n(done)} מסמכים הועברו`} ל${where}${r.moved ? ', והקובץ עבר לתיקייה ב-Drive' : ''}.`); moments.save?.({ title: done === 1 ? 'המסמך הועבר ב-Drive' : `${n(done)} מסמכים הועברו ב-Drive`, sub: where }) }
  })
  const remove = async (list) => {
    const docs = list.map((i) => i.doc).filter(Boolean)
    if (!docs.length) return
    if (!(await askConfirm({ title: docs.length === 1 ? 'מחיקת מסמך' : `מחיקת ${n(docs.length)} מסמכים`, text: `${docs.length === 1 ? `"${list[0].name}" יימחק` : 'המסמכים יימחקו'} מהמערכת, והעותק ב-Google Drive יעבור לפח של Drive. אי אפשר לבטל מכאן.`, ok: 'מחיקה', danger: true }))) return
    run('delete', async () => {
      const r = await api.deleteDocuments(docs)
      setSel(new Set()); setPicking(false); setDetail(null)
      await onReload()
      if (r.failed.length) say('bad', `נמחקו ${n(r.deleted.length)} מתוך ${n(docs.length)}: ${r.failed[0].error}`)
      else if (r.pending) say('warn', `${n(r.deleted.length)} נמחקו מהמערכת. ${n(r.pending)} עותקים ב-Drive עוד לא עברו לפח; הבדיקה הבאה מול Drive תעביר אותם.`)
      else { say('ok', r.deleted.length === 1 ? 'המסמך נמחק, והעותק שלו ב-Drive עבר לפח.' : `${n(r.deleted.length)} מסמכים נמחקו, והעותקים ב-Drive עברו לפח.`); moments.remove({ title: r.deleted.length === 1 ? 'המסמך נמחק' : `${n(r.deleted.length)} מסמכים נמחקו`, sub: 'גם מ-Google Drive' }) }
    })
  }
  // to the trash: the copy leaves the archive (and goes to the Drive trash); the document itself stays in the system
  const toTrash = async (list) => {
    if (!list.length) return
    if (!(await askConfirm({ title: list.length === 1 ? 'העברה לאשפה' : `העברת ${n(list.length)} מסמכים לאשפה`, text: `${list.length === 1 ? `הקובץ "${list[0].name}" ייצא` : 'הקבצים ייצאו'} מהארכיון ויעברו לפח של Google Drive. המסמך עצמו נשאר במערכת, ואפשר לשחזר מהאשפה.`, ok: 'העברה לאשפה' }))) return
    run('trash', async () => {
      await api.callServer('drive-exclude', { target_id: t.id, ids: list.map((i) => i.id), excluded: true })
      await api.callServer('drive-run', { target_id: t.id, max: 60 }, { timeout: 70000 }).catch(() => null)
      setSel(new Set()); setPicking(false); setDetail(null)
      await onReload(); await loadExtras()
      say('ok', list.length === 1 ? 'הקובץ עבר לאשפה. המסמך נשאר במערכת.' : `${n(list.length)} קבצים עברו לאשפה. המסמכים נשארו במערכת.`)
    })
  }
  const restore = (list) => run('restore', async () => {
    const r = await api.callServer('drive-restore', { target_id: t.id, ids: list.map((i) => i.id) }, { timeout: 90000 })
    setSel(new Set()); setDetail(null)
    await onReload(); await loadExtras()
    if (r.pending) say('warn', `${n(r.restored)} שוחזרו. ${n(r.pending)} עוד בדרך ל-Drive; הסנכרון הבא ישלים.`)
    else { say('ok', r.restored === 1 ? 'המסמך שוחזר וחזר לתיקייה שלו ב-Drive.' : `${n(r.restored)} מסמכים שוחזרו וחזרו לתיקיות שלהם ב-Drive.`); moments.save?.({ title: r.restored === 1 ? 'המסמך שוחזר' : `${n(r.restored)} מסמכים שוחזרו`, sub: 'חזר ל-Google Drive' }) }
  })
  // "sync now": what was done in Drive is followed, then what waits here goes up
  const syncNow = () => run('sync', async () => {
    const r = await api.callServer('drive-sync', { target_id: t.id }, { timeout: 90000 })
    const a = (r.from_drive || []).reduce((x, y) => ({ renamed: x.renamed + (y.renamed || 0), moved: x.moved + (y.moved || 0), trashed: x.trashed + (y.trashed || 0), restored: x.restored + (y.restored || 0), missing: x.missing + (y.missing || 0), folders: x.folders + (y.folders || 0), error: x.error || y.error }), { renamed: 0, moved: 0, trashed: 0, restored: 0, missing: 0, folders: 0, error: null })
    const up = (r.to_drive || []).reduce((x, y) => x + (y.verified || 0), 0)
    await onReload(); await loadExtras()
    const parts = [a.renamed && `${n(a.renamed)} שינויי שם`, a.moved && `${n(a.moved)} העברות`, a.trashed && `${n(a.trashed)} שהועברו לפח`, a.restored && `${n(a.restored)} ששוחזרו`, a.missing && `${n(a.missing)} שנעלמו ושוחזרו`, a.folders && `${n(a.folders)} שינויים בתיקיות`].filter(Boolean)
    if (a.error) say('bad', `הסנכרון מול Drive נתקל בשגיאה: ${a.error}`)
    else say('ok', `${parts.length ? `עודכן לפי Google Drive: ${parts.join(', ')}.` : 'לא נמצאו שינויים ב-Google Drive.'}${up ? ` ${n(up)} מסמכים עלו ואומתו.` : ''}`)
  })
  // while the screen is open, Drive is asked once a minute what changed there (a small question; the list reloads only when something did)
  useEffect(() => {
    if (!operate || t.status !== 'active' || t.enabled === false) return undefined
    let alive = true
    const pull = async () => {
      if (document.visibilityState !== 'visible') return
      setPulling(true)
      try {
        const r = await api.callServer('drive-sync', { target_id: t.id, quick: true }, { timeout: 30000 })
        const did = (r.from_drive || []).reduce((x, y) => x + (y.renamed || 0) + (y.moved || 0) + (y.trashed || 0) + (y.restored || 0) + (y.missing || 0) + (y.folders || 0), 0)
        if (alive && did) { await onReload(); await loadExtras(); setNote({ tone: 'info', text: `הרשימה עודכנה לפי ${did === 1 ? 'שינוי אחד שנעשה' : `${n(did)} שינויים שנעשו`} ב-Google Drive.` }) } else if (alive) loadExtras()
      } catch { /* the next minute asks again */ } finally { if (alive) setPulling(false) }
    }
    pull(); const iv = setInterval(pull, 60_000)
    return () => { alive = false; clearInterval(iv) }
  }, [t.id, t.status, t.enabled, operate]) // eslint-disable-line react-hooks/exhaustive-deps
  const saveFolder = () => run('folder', async () => {
    const d = folderDlg
    const r = d.mode === 'create' ? await api.callServer('drive-folder', { target_id: t.id, op: 'create', parent: d.parent, name: d.name }) : await api.callServer('drive-folder', { target_id: t.id, op: 'rename', key: d.key, name: d.name })
    setFolderDlg(null); await loadExtras(); if (d.mode === 'rename') await onReload()
    say('ok', d.mode === 'create' ? `התיקייה "${r.name}" נוצרה ב-Google Drive.` : `שם התיקייה שונה ל"${r.name}", גם ב-Google Drive.`)
  })
  const removeFolder = async (node) => {
    if (!(await askConfirm({ title: 'מחיקת תיקייה', text: `התיקייה "${node.name}" תימחק גם מ-Google Drive. אפשר למחוק רק תיקייה ריקה.`, ok: 'מחיקה', danger: true }))) return
    run('folder', async () => { await api.callServer('drive-folder', { target_id: t.id, op: 'delete', key: node.key }); await loadExtras(); if (path.join('/') === node.path.join('/')) setPath(node.path.slice(0, -1)); say('ok', `התיקייה "${node.name}" נמחקה, גם מ-Google Drive.`) })
  }
  useEffect(() => { if (view === 'shared') { setSharedFiles(null); api.callServer('drive-shared', { target_id: t.id }).then(setSharedFiles).catch((e) => setSharedFiles({ available: false, error: e.message, files: [] })) } }, [view, t.id])
  // files chosen while a folder of the person's own is open go up as usual, and their place in that folder is kept from
  // the first moment: each file lands there when it has been read and archived
  const uploadHere = (files) => run('upload', async () => {
    const list = [...files]; if (!list.length || !here?.key) return
    const ids = []; const refused = []
    for (const file of list) { try { const r = await api.uploadFile(file, { source: 'upload' }); if (r.duplicate) refused.push(`${file.name}: כבר קיים במערכת`); else ids.push(r.id) } catch (e) { refused.push(e.message) } }
    if (ids.length) await api.callServer('drive-pin', { target_id: t.id, ids, folder: here.key }, { timeout: 60000 })
    if (ids.length) moments.upload?.({ count: ids.length, names: list.map((x) => x.name) })
    say(refused.length && !ids.length ? 'bad' : refused.length ? 'warn' : 'ok', `${ids.length ? `${ids.length === 1 ? 'מסמך אחד הועלה' : `${n(ids.length)} מסמכים הועלו`}. אחרי הקריאה ${ids.length === 1 ? 'הוא ייכנס' : 'הם ייכנסו'} לתיקייה "${here.name}" ב-Google Drive.` : ''}${refused.length ? ` ${refused.join(' · ')}` : ''}`.trim())
  })
  useEffect(() => { if (view === 'accounts') api.callServer('drive-accounts').then(setAccounts).catch(() => setAccounts({ accounts: [], error: true })) }, [view, extras.two_way])
  useEffect(() => { setEvents(null); if (detail) api.callServer('drive-activity', { target_id: t.id, document_id: detail, limit: 30 }).then((r) => setEvents(r.events || [])).catch(() => setEvents([])) }, [detail, t.id, rows])
  const download = (list) => run('download', async () => {
    for (const i of list) {
      if (!i.doc?.file_path) continue
      const url = URL.createObjectURL(await api.fileBlob(i.doc))
      const a = document.createElement('a'); a.href = url; a.download = i.name; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    }
  })

  // ---------- drag and drop: a file (or the selection) onto a folder ----------
  const dragStart = (i) => (e) => {
    if (!operate) return
    const ids = sel.has(i.id) ? [...sel] : [i.id]
    setDrag(ids); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ids.join(','))
  }
  const dropOn = (key, dest) => (dest && operate ? {
    onDragOver: (e) => { if (drag) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== key) setOver(key) } },
    onDragLeave: () => setOver((o) => (o === key ? '' : o)),
    onDrop: (e) => { e.preventDefault(); const ids = drag || []; setDrag(null); setOver(''); if (ids.length) move(ids, dest) },
  } : {})
  const longPress = (i) => ({
    onTouchStart: () => { clearTimeout(press.current); press.current = setTimeout(() => { setPicking(true); setSel((s) => new Set(s).add(i.id)); navigator.vibrate?.(12) }, 480) },
    onTouchEnd: () => clearTimeout(press.current), onTouchMove: () => clearTimeout(press.current),
  })

  const openMenu = (i, e) => { e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); const x = e.type === 'contextmenu' ? e.clientX : r.left; const y = e.type === 'contextmenu' ? e.clientY : r.bottom + 4; setMenu({ id: i.id, x: Math.max(8, Math.min(innerWidth - 236, x)), y: Math.max(8, Math.min(innerHeight - 420, y)) }) }
  const acts = (i) => (i.trash ? [
    ['refresh', 'שחזור מהאשפה', () => restore([i]), operate],
    ['info', 'פרטי המסמך', () => setDetail(i.id), true],
    ['file', 'המסמך והנתונים שלו', () => go(`/documents/${i.id}`), true],
    ['trash', 'מחיקה לצמיתות מהמערכת', () => remove([i]), can('manage') || (operate && !['approved', 'sent'].includes(i.doc?.status)), true],
  ] : [
    ['expand', 'תצוגה מקדימה', () => setPreview(i.id), !!i.doc?.file_path],
    ['info', 'פרטי המסמך', () => setDetail(i.id), true],
    ['edit', 'שינוי שם', () => onRename(i.row), operate && i.row.status === 'verified'],
    ['folder', 'העברה לתיקייה אחרת', () => setSheet({ ids: [i.id] }), operate],
    ['company', 'שינוי חברה או חודש', () => setSheet({ ids: [i.id], assign: true }), operate],
    ['download', 'הורדה', () => download([i]), !!i.doc?.file_path],
    ['sparkle', stars.has(i.id) ? 'הסרת הסימון' : 'סימון בכוכב', () => star(i.id), true],
    ['external', 'פתיחה ב-Google Drive', () => window.open(i.row.web_link, '_blank', 'noopener'), !!i.row.web_link],
    ['file', 'המסמך והנתונים שלו', () => go(`/documents/${i.id}`), true],
    ['trash', 'העברה לאשפה', () => toTrash([i]), operate && i.row.status !== 'duplicate'],
    ['trash', 'מחיקה מהמערכת', () => remove([i]), can('manage') || (operate && !['approved', 'sent'].includes(i.doc?.status)), true],
  ]).filter((a) => a[3])

  const Status = ({ i }) => { const [tone, label] = i.trash ? ['muted', i.row.in_drive_trash ? 'בפח של Drive' : 'באשפה'] : SYNC[i.row.status] || ['muted', i.row.status]; return <Pill tone={tone}>{label}</Pill> }
  const Assigned = ({ i }) => (i.row.business_id ? <span className="fin-dm__co" dir="auto">{i.company}</span> : <span className="fin-dm__co is-none">לא משויך</span>)
  const detailItem = detail ? byId.get(detail) : null
  const menuItem = menu ? byId.get(menu.id) : null
  const previewItem = preview ? byId.get(preview) : null
  const crumbs = [{ name: t.root_name || 'התיקייה שלי', path: [] }, ...path.map((p, i) => ({ name: p, path: path.slice(0, i + 1) }))]
  const title = filtering && !PANELS.includes(view) ? `תוצאות (${n(flat.length)})` : VIEWS.find((v) => v[0] === view)?.[1]
  // the state of the connection, as one line: disconnected, syncing, failed, waiting, or in sync
  const live = t.status !== 'active' ? ['bad', 'alert', 'חשבון מנותק'] : syncing || working === 'sync' || pulling ? ['warn', 'sync', 'מסנכרן כעת'] : counts.failed || extras.sync?.error ? ['bad', 'alert', `שגיאת סנכרון${counts.failed ? ` (${n(counts.failed)})` : ''}`] : counts.pending ? ['warn', 'clock', `${n(counts.pending)} ממתינים לסנכרון`] : ['ok', 'check', 'מחובר ומסונכרן']
  const manualFolders = extras.folders || []
  const chips = [f.biz && ['biz', f.biz === 'none' ? 'ללא שיוך' : bizName(f.biz)], f.month && ['month', monthLabel(f.month)], f.type && ['type', DOC_TYPE[f.type]], f.sync && ['sync', { ok: 'מסונכרן', pending: 'ממתין לסנכרון', failed: 'נכשל' }[f.sync]]].filter(Boolean)

  if (rows === null) return <div className="fin-dm" aria-busy="true"><div className="fin-dm__skel" /><div className="fin-dm__skel" /><div className="fin-dm__skel" /></div>

  return (
    <section className={`fin-dm ${detailItem ? 'has-detail' : ''} ${drag ? 'is-dragging' : ''}`} aria-label="ניהול הקבצים ב-Google Drive">
      <aside className="fin-dm__side" aria-label="ניווט">
        <nav className="fin-dm__views fin-scroll-x" aria-label="תצוגות">
          {VIEWS.map(([k, label, icon]) => (
            <button key={k} type="button" className={`fin-dm__view ${view === k && (!filtering || PANELS.includes(k)) ? 'is-on' : ''} ${k === 'invoices' || k === 'trash' ? 'is-sep' : ''}`} aria-current={view === k ? 'page' : undefined} onClick={() => { setView(k); setPath([]); setQ(''); setF({ biz: '', month: '', type: '', sync: '' }); setSel(new Set()) }}>
              <Icon name={icon} size={17} /><span>{label}</span>
              {k === 'review' && counts.review > 0 && <b className="fin-dm__badge is-attn">{n(counts.review)}</b>}
              {k === 'all' && <b className="fin-dm__badge">{n(counts.all)}</b>}
              {k === 'trash' && trashItems.length > 0 && <b className="fin-dm__badge">{n(trashItems.length)}</b>}
            </button>
          ))}
        </nav>
        <p className="fin-dm__sidehead">חברות</p>
        <ul className="fin-dm__cos">
          {businesses.map((b) => {
            const node = [...folders.children.values()].find((x) => x.biz === b.id)
            return (
              <li key={b.id}>
                <button type="button" className={`fin-dm__cobtn ${over === `b:${b.id}` ? 'is-over' : ''} ${view === 'drive' && node && path[0] === node.name ? 'is-on' : ''}`} {...dropOn(`b:${b.id}`, { business_id: b.id })}
                  onClick={() => { if (node) { setView('drive'); setPath(node.path); setQ(''); setF({ biz: '', month: '', type: '', sync: '' }) } else { setView('all'); setF({ biz: b.id, month: '', type: '', sync: '' }) } }}>
                  <Icon name="company" size={16} /><span dir="auto">{b.name}</span><small>{n(node?.count || 0)}</small>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <div className="fin-dm__main">
        <div className="fin-dm__top">
          <label className="fin-search fin-dm__search"><Icon name="search" size={17} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="שם קובץ, חברה, ספק, מספר חשבונית, ח.פ, חודש" aria-label="חיפוש בדרייב" /></label>
          <button type="button" className={`fin-btn ${showFilters || chips.length ? 'is-on' : ''}`} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}><Icon name="filter" size={17} /> סינון{chips.length ? ` (${chips.length})` : ''}</button>
          <div className="fin-seg fin-dm__mode" role="group" aria-label="תצוגה">
            <button type="button" className={mode === 'list' ? 'is-on' : ''} aria-pressed={mode === 'list'} onClick={() => setModeKeep('list')} aria-label="רשימה" title="רשימה"><Icon name="list" size={17} /></button>
            <button type="button" className={mode === 'grid' ? 'is-on' : ''} aria-pressed={mode === 'grid'} onClick={() => setModeKeep('grid')} aria-label="כרטיסים" title="כרטיסים"><Icon name="grid" size={17} /></button>
          </div>
          <label className="fin-dm__sort"><Icon name="sort" size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="מיון לפי">{SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
          {operate && <button type="button" className="fin-btn fin-dm__newfolder" onClick={() => { if (view !== 'drive') { setView('drive'); setPath([]) } setFolderDlg({ mode: 'create', parent: view === 'drive' && here?.key ? here.key : 'root', where: view === 'drive' && here?.path?.length ? here.path.join(' › ') : t.root_name || 'התיקייה שלי', name: '' }) }} disabled={view === 'drive' && !!here && !here.key}><Icon name="plus" size={17} /> תיקייה חדשה</button>}
          {view === 'drive' && here?.manual && operate
            ? <><input ref={upHere} type="file" accept="application/pdf,image/*" multiple hidden data-testid="drive-upload-here" onChange={(e) => { uploadHere(e.target.files); e.target.value = '' }} /><button type="button" className="fin-btn fin-btn--primary fin-dm__up" disabled={!!working} onClick={() => upHere.current?.click()}><Icon name="upload" size={17} /> העלאה לתיקייה הזו</button></>
            : <button type="button" className="fin-btn fin-btn--primary fin-dm__up" onClick={openUpload}><Icon name="upload" size={17} /> העלאה</button>}
        </div>
        {showFilters && (
          <div className="fin-dm__filters">
            <select value={f.biz} onChange={(e) => setF({ ...f, biz: e.target.value })} aria-label="חברה"><option value="">כל החברות</option><option value="none">ללא שיוך</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} aria-label="חודש"><option value="">כל החודשים</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="סוג המסמך"><option value="">כל הסוגים</option>{types.map((k) => <option key={k} value={k}>{DOC_TYPE[k] || k}</option>)}</select>
            <select value={f.sync} onChange={(e) => setF({ ...f, sync: e.target.value })} aria-label="מצב הסנכרון"><option value="">כל מצבי הסנכרון</option><option value="ok">מסונכרן</option><option value="pending">ממתין לסנכרון</option><option value="failed">נכשל</option></select>
          </div>
        )}
        {chips.length > 0 && <p className="fin-dm__chips">{chips.map(([k, label]) => <button key={k} type="button" className="fin-dm__chip" onClick={() => setF({ ...f, [k]: '' })} aria-label={`הסרת הסינון ${label}`}>{label} <Icon name="x" size={13} /></button>)}<button type="button" className="fin-dm__chip is-clear" onClick={() => { setF({ biz: '', month: '', type: '', sync: '' }); setQ('') }}>ניקוי הכול</button></p>}

        <div className="fin-dm__bar">
          {browsing ? (
            <nav className="fin-dm__crumbs" aria-label="מיקום">
              {crumbs.map((c, i) => {
                const node = c.path.length ? c.path.reduce((nd, p) => nd?.children.get(p), folders) : null
                const last = i === crumbs.length - 1
                return <span key={c.path.join('/') || 'root'} className="fin-dm__crumbwrap">{i > 0 && <Icon name="chev" size={14} />}<button type="button" className={`fin-dm__crumb ${last ? 'is-here' : ''} ${over === `c:${i}` ? 'is-over' : ''}`} {...(last ? {} : dropOn(`c:${i}`, destOf(node)))} onClick={() => setPath(c.path)} dir="auto">{i === 0 && <Icon name="folder" size={16} />} {c.name}</button></span>
              })}
            </nav>
          ) : <h3 className="fin-dm__title">{title}</h3>}
          <span className="fin-dm__live">
            <span className={`fin-dm__state is-${live[0]}`} role="status"><Icon name={live[1]} size={15} /> {live[2]}{extras.sync?.at && live[0] === 'ok' ? <small> · נבדק מול Drive {dateTime(extras.sync.at)}</small> : null}</span>
            <button type="button" className="fin-btn fin-btn--sm fin-dm__syncnow" onClick={syncNow} disabled={!!working || !!syncing || !operate || t.status !== 'active'} title="בדיקה מול Google Drive עכשיו: מה שהשתנה שם מתעדכן כאן, ומה שממתין כאן עולה לשם"><Icon name="refresh" size={15} /> {working === 'sync' ? 'מסנכרן…' : 'סנכרן עכשיו'}</button>
          </span>
        </div>

        {note && <p className={`fin-dm__note is-${note.tone}`} role={note.tone === 'bad' ? 'alert' : 'status'}><Icon name={note.tone === 'ok' ? 'check' : note.tone === 'bad' ? 'alert' : 'info'} size={16} /> <span>{note.text}</span><button type="button" className="fin-icon-btn" onClick={() => setNote(null)} aria-label="סגירה"><Icon name="x" size={14} /></button></p>}
        {working && <p className="fin-dm__note is-info" role="status"><Icon name="sync" size={16} /> <span>{{ upload: 'מעלה…', move: 'מעביר ב-Google Drive…', delete: 'מוחק, ומעביר לפח של Drive…', download: 'מוריד…', trash: 'מעביר לאשפה…', restore: 'משחזר מהאשפה…', sync: 'בודק מול Google Drive…', folder: 'מעדכן את התיקייה ב-Google Drive…' }[working]}</span></p>}
        {drag && <p className="fin-dm__draghint" role="status">משחררים על תיקייה או על חברה כדי להעביר {drag.length === 1 ? 'את המסמך' : `${n(drag.length)} מסמכים`} ב-Drive</p>}

        {subfolders.length > 0 && (
          <ul className="fin-dm__folders">
            {subfolders.map((node) => {
              const key = `f:${node.path.join('/')}`
              return (
                <li key={key}>
                  <button type="button" className={`fin-dm__folder ${over === key ? 'is-over' : ''} ${node.name === NONE ? 'is-none' : ''} ${node.manual ? 'is-manual' : ''} ${node.key ? 'is-keyed' : ''}`} {...dropOn(key, destOf(node))} onClick={() => { setView('drive'); setPath(node.path); setSel(new Set()) }}>
                    <span className="fin-dm__foldericon"><Icon name="folder" size={22} /></span>
                    <span className="fin-dm__foldertext"><strong dir="auto">{node.name}</strong><small>{node.count === 0 ? 'ריקה' : node.count === 1 ? 'מסמך אחד' : `${n(node.count)} מסמכים`}{node.manual ? ' · תיקייה שלך' : node.last ? ` · עודכן ${date(node.last)}` : ''}</small></span>
                    <Icon name="chev" size={16} />
                  </button>
                  {node.key && <span className="fin-dm__folderacts">
                    <button type="button" className={`fin-icon-btn fin-dm__star ${stars.has(`f:${node.key}`) ? 'is-on' : ''}`} aria-pressed={stars.has(`f:${node.key}`)} onClick={() => star(`f:${node.key}`)} aria-label={`${stars.has(`f:${node.key}`) ? 'הסרת הכוכב מהתיקייה' : 'סימון התיקייה בכוכב'} ${node.name}`} title={stars.has(`f:${node.key}`) ? 'הסרת הכוכב' : 'סימון בכוכב'}><Icon name="sparkle" size={16} /></button>
                    {node.manual && operate && <button type="button" className="fin-icon-btn" onClick={() => setFolderDlg({ mode: 'rename', key: node.key, name: node.name })} aria-label={`שינוי שם התיקייה ${node.name}`} title="שינוי שם"><Icon name="edit" size={16} /></button>}
                    {node.manual && operate && <button type="button" className="fin-icon-btn fin-icon-btn--danger" onClick={() => removeFolder(node)} aria-label={`מחיקת התיקייה ${node.name}`} title="מחיקה"><Icon name="trash" size={16} /></button>}
                  </span>}
                </li>
              )
            })}
          </ul>
        )}

        {flat.length > 0 && (
          <div className="fin-dm__listhead">
            {operate && <label className="fin-dm__all"><input type="checkbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = chosen.length > 0 && !allOn }} onChange={() => { setSel(allOn ? new Set() : new Set(flat.map((i) => i.id))); setPicking(!allOn) }} /> <span>בחירת הכול ({n(flat.length)})</span></label>}
            {operate && <button type="button" className="fin-btn fin-btn--sm fin-dm__pick" aria-pressed={picking} onClick={() => { setPicking((v) => !v); if (picking) setSel(new Set()) }}>{picking ? 'סיום הבחירה' : 'בחירה'}</button>}
          </div>
        )}

        {view === 'shared' ? (sharedFiles === null ? <p className="fin-muted" aria-busy="true">קורא מ-Google Drive…</p> : sharedFiles.available ? (
          <div className="fin-dm__sharedwrap">
            <p className="fin-dm__perm"><Icon name="shield" size={14} /> קבצים שאחרים שיתפו עם החשבון, כפי ש-Google Drive מציג אותם עכשיו. לצפייה בלבד: המערכת לא משנה ולא מוחקת קובץ שלא היא יצרה.</p>
            {!sharedFiles.files.length ? <Empty title="לא שותפו קבצים עם החשבון" icon="share">אם ההרשאה הורחבה אחרי שהחשבון חובר, מחברים אותו מחדש במסך "חשבונות מחוברים" כדי שהרשימה תופיע.</Empty> : (
              <ul className="fin-dm__list fin-dm__shared">
                {sharedFiles.files.map((x) => (
                  <li key={x.id} className="fin-dm__sharedrow">
                    <span className={`fin-dm__ficon is-${x.folder ? 'other' : /\.pdf$/i.test(x.name) ? 'pdf' : 'other'}`} aria-hidden="true">{x.folder ? <Icon name="folder" size={17} /> : /\.pdf$/i.test(x.name) ? 'PDF' : <Icon name="file" size={17} />}</span>
                    <span className="fin-dm__nametext"><strong><bdi>{x.name}</bdi></strong><small>{[x.owner && `שותף על ידי ${x.owner}`, x.modified && `עודכן ${date(x.modified)}`, x.size != null && size(x.size)].filter(Boolean).join(' · ')}</small></span>
                    {x.link && <a className="fin-btn fin-btn--sm" href={x.link} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> פתיחה ב-Drive</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="fin-dm__panel">
            <h4>קבצים ששותפו איתך לא מוצגים כאן</h4>
            <p>המערכת מחוברת ל-Google Drive בהרשאה המצומצמת ביותר: היא רואה ומנהלת רק קבצים ותיקיות שהיא עצמה יצרה. קבצים אחרים בחשבון, וקבצים שאחרים שיתפו איתך, אינם נגישים לה, ולכן גם לא יכולים להימחק או להשתנות בטעות.</p>
            <p>כדי להציג כאן את הקבצים ששותפו צריך הרשאה רחבה יותר ל-Drive, ש-Google מאשרת רק אחרי תהליך אימות של האפליקציה. המערכת כבר מוכנה לכך: אחרי האישור מפעילים את ההרשאה הרחבה בהגדרות השרת ומחברים את החשבון מחדש.</p>
            {sharedFiles.error && <p className="fin-error" role="alert">{sharedFiles.error}</p>}
          </div>
        )
        ) : view === 'accounts' ? (
          <div className="fin-dm__accounts">
            {accounts === null ? <p className="fin-muted" aria-busy="true">טוען את החשבונות…</p> : <>
              {(accounts.accounts || []).map((a) => (
                <article key={a.id} className="fin-dm__account" data-account={a.account_email}>
                  <header><span className="fin-dm__avatar" aria-hidden="true">{String(a.account_email || '?').slice(0, 1).toUpperCase()}</span><span><strong dir="ltr">{a.account_email || 'חשבון Google'}</strong><small>{a.quota?.name ? `${a.quota.name} · ` : ''}{bizName(a.business_id) || 'כל החברות'} · מחובר מ-{date(a.created_at)}</small></span>
                    <Pill tone={a.status !== 'active' ? 'bad' : a.enabled === false ? 'warn' : 'ok'}>{a.status !== 'active' ? 'מנותק: צריך לחבר מחדש' : a.enabled === false ? 'מושהה' : 'מחובר'}</Pill></header>
                  {a.last_error && <p className="fin-error" role="alert">{a.last_error}</p>}
                  <dl>
                    <div><dt>קבצים מסונכרנים</dt><dd>{n(a.files.verified)}</dd></div>
                    <div><dt>ממתינים</dt><dd>{n(a.files.pending)}</dd></div>
                    <div><dt>שגיאות</dt><dd className={a.files.failed ? 'is-bad' : ''}>{n(a.files.failed)}</dd></div>
                    <div><dt>באשפה</dt><dd>{n(a.files.trash)}</dd></div>
                    <div><dt>נפח ב-Drive</dt><dd>{a.quota?.usage != null ? `${bytes(a.quota.usage)}${a.quota.limit ? ` מתוך ${bytes(a.quota.limit)}` : ''}` : 'לא ידוע'}</dd></div>
                    <div><dt>העלאה אחרונה</dt><dd>{a.last_sync_at ? dateTime(a.last_sync_at) : '—'}</dd></div>
                    <div><dt>נבדק מול Drive</dt><dd>{a.sync?.at ? dateTime(a.sync.at) : 'עוד לא'}</dd></div>
                    <div><dt>בדיקה מלאה אחרונה</dt><dd>{a.last_reconcile_at ? dateTime(a.last_reconcile_at) : 'עוד לא'}</dd></div>
                  </dl>
                  {a.sync?.error && <p className="fin-error" role="alert">הקריאה האחרונה של השינויים מ-Drive נכשלה: {a.sync.error}</p>}
                  <p className="fin-dm__perm"><Icon name="shield" size={14} /> {accounts.scope === 'drive' ? 'הרשאה: כל ה-Drive של החשבון (drive). המערכת משנה רק קבצים שהיא יצרה; את השאר היא רק מציגה.' : 'הרשאה: קבצים ותיקיות שהמערכת יצרה בלבד (drive.file). שאר החשבון אינו נגיש לה.'}</p>
                  <p className="fin-dm__perm"><Icon name={a.push?.active ? 'check' : 'clock'} size={14} /> {a.push?.active ? `התראות מיידיות מ-Drive פעילות (עד ${date(new Date(a.push.expiration).toISOString())}); שינוי שם מתעדכן כאן בתוך שניות.` : `התראות מיידיות מ-Drive לא פעילות${a.push?.error ? ` (${a.push.error})` : ''}. השינויים נקראים פעם בדקה.`}</p>
                </article>
              ))}
              {can('manage') && (
                <div className="fin-dm__twoway">
                  <label><input type="checkbox" checked={accounts.two_way !== false} onChange={async (e) => { const on = e.target.checked; try { await api.callServer('drive-two-way', { on }); setAccounts((x) => ({ ...x, two_way: on })); await loadExtras(); say('ok', on ? 'סנכרון דו-כיווני פעיל: מה שמשנים ב-Drive מתעדכן במערכת.' : 'סנכרון דו-כיווני כבוי: קובץ שהוזז או ששמו שונה ב-Drive חוזר למקומו.') } catch (err) { say('bad', err.message) } }} /> <span><strong>סנכרון דו-כיווני</strong><small>שינוי שם, העברה לתיקייה, העברה לפח ושחזור שנעשו ב-Google Drive עצמו מתעדכנים במערכת. כשכבוי, המערכת מחזירה כל קובץ לשם ולתיקייה שהיא קבעה.</small></span></label>
                </div>
              )}
              {can('manage') && onConnect && <p className="fin-dm__connect"><button type="button" className="fin-btn" onClick={onConnect}><Icon name="plus" size={16} /> חיבור חשבון Google נוסף</button><small>כל חשבון נשמר בנפרד, וכל מסמך רשום על החשבון שאליו עלה.</small></p>}
            </>}
          </div>
        ) : !flat.length && !subfolders.length ? (
          <Empty title={filtering ? 'אין מסמכים שמתאימים' : view === 'review' ? 'אין מסמכים שמחכים לבדיקה' : view === 'starred' ? 'עוד לא סומנו מסמכים' : view === 'trash' ? 'האשפה ריקה' : 'התיקייה ריקה'} icon={filtering ? 'search' : view === 'review' ? 'check' : view === 'trash' ? 'trash' : 'folder'}
            action={filtering ? <button type="button" className="fin-btn" onClick={() => { setQ(''); setF({ biz: '', month: '', type: '', sync: '' }) }}>ניקוי הסינון</button> : <button type="button" className="fin-btn fin-btn--primary" onClick={openUpload}><Icon name="upload" size={17} /> העלאת מסמכים</button>} />
        ) : !flat.length ? null : mode === 'grid' ? (
          <ul className="fin-dm__grid">
            {flat.slice(0, limit).map((i) => (
              <li key={i.id} className={`fin-dm__card ${sel.has(i.id) ? 'is-sel' : ''} ${detail === i.id ? 'is-open' : ''}`} draggable={operate} onDragStart={dragStart(i)} onDragEnd={() => { setDrag(null); setOver('') }} onContextMenu={(e) => openMenu(i, e)} {...longPress(i)}>
                {operate && <label className="fin-dm__check"><input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} aria-label={`בחירת ${i.name}`} /></label>}
                <button type="button" className="fin-dm__thumb" onClick={() => (picking ? toggle(i.id) : setPreview(i.id))} aria-label={`תצוגה מקדימה של ${i.name}`}><Thumbnail doc={i.doc || { id: i.id }} /></button>
                <button type="button" className="fin-dm__cardmain" onClick={() => (picking ? toggle(i.id) : setDetail(i.id))}>
                  <strong dir="auto">{i.name}</strong>
                  <small><Assigned i={i} />{i.period && <span>{monthLabel(i.period)}</span>}</small>
                  <span className="fin-dm__pills"><Status i={i} /></span>
                </button>
                <button type="button" className="fin-icon-btn fin-dm__more" onClick={(e) => openMenu(i, e)} aria-label={`פעולות על ${i.name}`} aria-haspopup="menu"><Icon name="more" size={18} /></button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={`fin-dm__list ${picking ? 'is-picking' : ''}`}>
            <li className="fin-dm__row is-head" aria-hidden="true"><span /><span>שם</span><span>חברה</span><span>חודש</span><span>סוג</span><span>הועלה</span><span>גודל</span><span>סנכרון</span><span /></li>
            {flat.slice(0, limit).map((i) => (
              <li key={i.id} className={`fin-dm__row ${sel.has(i.id) ? 'is-sel' : ''} ${detail === i.id ? 'is-open' : ''}`} draggable={operate} onDragStart={dragStart(i)} onDragEnd={() => { setDrag(null); setOver('') }} onContextMenu={(e) => openMenu(i, e)} {...longPress(i)}>
                {operate ? <label className="fin-dm__check"><input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} aria-label={`בחירת ${i.name}`} /></label> : <span />}
                <button type="button" className="fin-dm__name" onClick={() => (picking ? toggle(i.id) : setDetail(i.id))}>
                  <span className={`fin-dm__ficon is-${kindOf(i.doc) === 'PDF' ? 'pdf' : kindOf(i.doc) === 'תמונה' ? 'img' : 'other'}`} aria-hidden="true">{kindOf(i.doc) === 'PDF' ? 'PDF' : <Icon name={kindOf(i.doc) === 'מייל' ? 'mail' : 'file'} size={17} />}</span>
                  <span className="fin-dm__nametext"><strong dir="auto">{stars.has(i.id) && <Icon name="sparkle" size={13} />} {i.name}</strong><small>{[i.doc?.supplier_name, i.doc?.total_amount != null && money(i.doc.total_amount, i.doc.currency)].filter(Boolean).join(' · ')}</small></span>
                </button>
                <span className="fin-dm__c is-co"><Assigned i={i} /></span>
                <span className="fin-dm__c is-month">{i.period ? monthLabel(i.period) : '—'}</span>
                <span className="fin-dm__c is-type">{DOC_TYPE[i.doc?.doc_type] || kindOf(i.doc)}</span>
                <span className="fin-dm__c is-up">{i.row.uploaded_at ? date(i.row.uploaded_at) : '—'}</span>
                <span className="fin-dm__c is-size">{size(i.doc?.file_size)}</span>
                <span className="fin-dm__c is-sync"><Status i={i} /></span>
                <button type="button" className="fin-icon-btn fin-dm__more" onClick={(e) => openMenu(i, e)} aria-label={`פעולות על ${i.name}`} aria-haspopup="menu"><Icon name="more" size={18} /></button>
              </li>
            ))}
          </ul>
        )}
        {flat.length > limit && <p className="fin-dm__morebtn"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 60)}>הצגת עוד {n(Math.min(60, flat.length - limit))} מתוך {n(flat.length - limit)} שנותרו</button></p>}
      </div>

      {detailItem && (
        <aside className="fin-dm__detail" aria-label="פרטי המסמך">
          <header><strong dir="auto">{detailItem.name}</strong><button type="button" className="fin-icon-btn" onClick={() => setDetail(null)} aria-label="סגירת הפרטים"><Icon name="x" size={16} /></button></header>
          <button type="button" className="fin-dm__detailthumb" onClick={() => setPreview(detailItem.id)} aria-label="תצוגה מקדימה"><Thumbnail doc={detailItem.doc || { id: detailItem.id }} size="lg" /></button>
          <p className="fin-dm__pills"><Status i={detailItem} />{detailItem.row.business_id ? <Pill tone="ok">משויך</Pill> : <Pill tone="warn">לא משויך</Pill>}</p>
          {detailItem.row.error && <p className="fin-error" role="alert">{detailItem.row.error}</p>}
          <dl className="fin-dm__meta">
            <div><dt>חברה</dt><dd>{detailItem.company || 'לא משויך'}</dd></div>
            <div><dt>חודש חשבונאי</dt><dd>{detailItem.period ? monthLabel(detailItem.period) : '—'}</dd></div>
            <div><dt>סוג</dt><dd>{DOC_TYPE[detailItem.doc?.doc_type] || '—'} · {kindOf(detailItem.doc)}</dd></div>
            <div><dt>ספק</dt><dd dir="auto">{detailItem.doc?.supplier_name || '—'}</dd></div>
            <div><dt>סכום</dt><dd>{detailItem.doc?.total_amount != null ? money(detailItem.doc.total_amount, detailItem.doc.currency) : '—'}</dd></div>
            <div><dt>תיקייה ב-Drive</dt><dd dir="auto">{detailItem.row.folder_path || 'עוד לא עלה'}</dd></div>
            <div><dt>הועלה</dt><dd>{detailItem.row.uploaded_at ? dateTime(detailItem.row.uploaded_at) : '—'}</dd></div>
            <div><dt>שונה</dt><dd>{detailItem.row.updated_at ? dateTime(detailItem.row.updated_at) : '—'}</dd></div>
            <div><dt>גודל</dt><dd>{size(detailItem.doc?.file_size)}</dd></div>
            <div><dt>חשבון Google</dt><dd dir="ltr">{t.account_email || '—'}</dd></div>
          </dl>
          <section className="fin-dm__history" aria-label="היסטוריית פעולות">
            <h4>היסטוריית פעולות</h4>
            {events === null ? <p className="fin-muted fin-small" aria-busy="true">טוען…</p> : !events.length ? <p className="fin-muted fin-small">עוד אין פעולות רשומות לקובץ הזה.</p> : (
              <ol>{events.slice(0, 12).map((e) => <li key={e.id}><b>{EVENT[e.action] || e.action}</b><small>{dateTime(e.at)} · {e.user_email ? e.user_email.split('@')[0] : /_in_drive$/.test(e.action) ? 'ב-Google Drive' : 'המערכת'}</small>{(e.detail?.to?.path || e.detail?.to?.name || (typeof e.detail?.to === 'string' && e.detail.to)) && <span dir="auto">{e.detail?.from?.path || e.detail?.from?.name || (typeof e.detail?.from === 'string' ? e.detail.from : '') ? `${e.detail?.from?.path || e.detail?.from?.name || e.detail.from} ← ` : ''}{e.detail?.to?.path || e.detail?.to?.name || e.detail.to}</span>}</li>)}</ol>
            )}
          </section>
          <div className="fin-dm__detailacts">
            {operate && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setSheet({ ids: [detailItem.id], assign: true })}><Icon name="company" size={16} /> {detailItem.row.business_id ? 'שינוי חברה או חודש' : 'שיוך לחברה'}</button>}
            {acts(detailItem).filter((a) => !['info', 'company'].includes(a[0])).map(([icon, label, fn, , danger]) => <button key={label} type="button" className={`fin-btn ${danger ? 'fin-btn--danger' : ''}`} onClick={fn}><Icon name={icon} size={16} /> {label}</button>)}
          </div>
        </aside>
      )}

      {chosen.length > 0 && (
        <div className="fin-dm__bulk" role="toolbar" aria-label="פעולות על המסמכים שנבחרו">
          <strong>{chosen.length === 1 ? 'מסמך אחד נבחר' : `${n(chosen.length)} נבחרו`}</strong>
          {view === 'trash' ? <button type="button" className="fin-btn fin-btn--primary" disabled={!!working} onClick={() => restore(chosen)}><Icon name="refresh" size={16} /> שחזור</button> : <>
            <button type="button" className="fin-btn fin-btn--primary" disabled={!!working} onClick={() => setSheet({ ids: chosen.map((i) => i.id), assign: true })}><Icon name="company" size={16} /> שיוך והעברה</button>
            <button type="button" className="fin-btn" disabled={!!working} onClick={() => setSheet({ ids: chosen.map((i) => i.id) })}><Icon name="folder" size={16} /> לתיקייה</button>
            <button type="button" className="fin-btn" disabled={!!working} onClick={() => download(chosen)}><Icon name="download" size={16} /> הורדה</button>
            <button type="button" className="fin-btn" disabled={!!working} onClick={() => toTrash(chosen)}><Icon name="trash" size={16} /> לאשפה</button>
          </>}
          {can('manage') && <button type="button" className="fin-btn fin-btn--danger" disabled={!!working} onClick={() => remove(chosen)}><Icon name="trash" size={16} /> מחיקה</button>}
          <button type="button" className="fin-icon-btn" onClick={() => { setSel(new Set()); setPicking(false) }} aria-label="ביטול הבחירה"><Icon name="x" size={16} /></button>
        </div>
      )}

      {menuItem && (
        <div className="fin-dm__menuwrap" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }}>
          <ul className="fin-dm__menu" role="menu" style={{ top: menu.y, left: menu.x }} aria-label={`פעולות על ${menuItem.name}`}>
            <li className="fin-dm__menuhead" dir="auto">{menuItem.name}</li>
            {acts(menuItem).map(([icon, label, fn, , danger]) => <li key={label} role="none"><button type="button" role="menuitem" className={danger ? 'is-danger' : ''} onClick={fn}><Icon name={icon} size={17} /> {label}</button></li>)}
          </ul>
        </div>
      )}
      {sheet && <MoveSheet items={sheet.ids.map((id) => byId.get(id)).filter(Boolean)} businesses={businesses} assign={sheet.assign} folders={manualFolders} busy={working === 'move'} onClose={() => setSheet(null)} onGo={({ folder, business_id, period, ...extra }) => move(sheet.ids, folder ? { folder } : { business_id, period }, extra)} />}
      {folderDlg && (
        <Modal title={folderDlg.mode === 'create' ? 'תיקייה חדשה' : 'שינוי שם התיקייה'} onClose={() => setFolderDlg(null)} footer={<>
          <button type="button" className="fin-btn fin-btn--primary" disabled={working === 'folder' || !folderDlg.name.trim()} onClick={saveFolder}>{working === 'folder' ? 'מעדכן ב-Drive…' : folderDlg.mode === 'create' ? 'יצירה ב-Google Drive' : 'שמירה'}</button>
          <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setFolderDlg(null)}>ביטול</button>
        </>}>
          <Field label="שם התיקייה"><input value={folderDlg.name} onChange={(e) => setFolderDlg({ ...folderDlg, name: e.target.value })} autoFocus maxLength={120} onKeyDown={(e) => { if (e.key === 'Enter' && folderDlg.name.trim()) saveFolder() }} /></Field>
          <p className="fin-muted fin-small">{folderDlg.mode === 'create' ? `התיקייה תיווצר ב-Google Drive בתוך "${folderDlg.where}". מסמך שמעבירים אליה נשאר בה, והחברה והחודש שלו לא משתנים.` : 'השם ישתנה גם ב-Google Drive.'}</p>
        </Modal>
      )}
      {previewItem && (
        <Modal wide title={previewItem.name} onClose={() => setPreview(null)} footer={<>
          {operate && <button type="button" className="fin-btn fin-btn--primary" onClick={() => { setPreview(null); setSheet({ ids: [previewItem.id], assign: true }) }}><Icon name="company" size={16} /> שיוך</button>}
          <button type="button" className="fin-btn" onClick={() => download([previewItem])}><Icon name="download" size={16} /> הורדה</button>
          {previewItem.row.web_link && <a className="fin-btn" href={previewItem.row.web_link} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> ב-Drive</a>}
          <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setPreview(null)}>סגירה</button>
        </>}>
          <div className="fin-receipts__view">{previewItem.doc?.file_path ? <DocPreview doc={previewItem.doc} /> : <p className="fin-muted">למסמך הזה אין קובץ להצגה.</p>}</div>
        </Modal>
      )}
    </section>
  )
}
