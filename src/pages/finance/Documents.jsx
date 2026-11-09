import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, SOURCE, date, docDate, hasError, issuesOf, money, nameOf, signedTotal } from './format.js'
import { makeZip, saveBlob } from './zip.js'
import { Confidence, Empty, Icon, Modal, MoreMenu, PageHead, StatusPill, UploadZone, askConfirm, useAsync } from './ui.jsx'
import ShareDialog from './ShareDialog.jsx'
import { exportSheet } from './exportPackage.js'
import Thumbnail, { prefetchThumb } from './Thumbnail.jsx'
import DocumentPanel from './DocumentPanel.jsx'
import Select from './Select.jsx'
import DateRange, { sayRange } from './DateRange.jsx'
import SendToAccountant from './SendToAccountant.jsx'
import { moments } from './moments.js'

const TABS = [
  { id: '', label: 'הכול' },
  { id: 'new', label: 'חדשים' },
  { id: 'review', label: 'לבדיקה' },
  { id: 'numbers', label: 'מספרים לבדיקה' },
  { id: 'approved', label: 'מוכנים לרו״ח' },
  { id: 'sent', label: 'נשלחו לרו״ח' },
  { id: 'unassigned', label: 'ממתין לשיוך' },
  { id: 'problems', label: 'דורשים טיפול' },
  { id: 'rejected', label: 'נדחו' },
  { id: 'archived', label: 'ארכיון' },
]
/* the reading is not sure of the amounts: they do not add up, the VAT rate does not fit the date, a second reading
   disagreed, or the confidence of a sum is low. A person confirms them before the document counts as checked. */
const NUM_CODES = ['sum', 'vat_rate', 'ai_disagree', 'unsure_amount']
const NUM_FIELDS = ['total_amount', 'vat_amount', 'amount_before_vat']
export const unsureNumbers = (d) => ['review', 'duplicate'].includes(d.status) && (
  issuesOf(d).some((i) => NUM_CODES.includes(i.code) || (i.level === 'error' && NUM_FIELDS.includes(i.field)))
  || NUM_FIELDS.some((k) => d[k] !== null && d[k] !== undefined && Number(d.field_confidence?.[k] ?? 1) < 0.7))
const inTab = (d, tab) => {
  if (!tab) return !['rejected', 'archived'].includes(d.status)
  if (tab === 'new') return new Date(d.created_at).getTime() > Date.now() - 7 * 86400_000 && ['review', 'processing', 'failed'].includes(d.status)
  if (tab === 'numbers') return unsureNumbers(d)
  if (tab === 'unassigned') return !d.business_id && !['rejected', 'archived', 'duplicate', 'processing', 'failed'].includes(d.status)
  if (tab === 'problems') return ['failed', 'duplicate', 'processing'].includes(d.status) || hasError(d)
  return d.status === tab
}
const PRESET = {
  all: { title: null, filter: () => true },
  new: { title: 'חשבוניות חדשות', sub: 'מה שנאסף בשבעת הימים האחרונים ועוד לא אושר', filter: (d) => Date.now() - new Date(d.created_at).getTime() < 7 * 86400_000 && ['processing', 'review', 'failed', 'duplicate'].includes(d.status) },
  pending: { title: 'ממתינים לאישור', sub: 'מסמכים שנקראו ומחכים לבדיקה של אדם. שום מסמך לא מאושר אוטומטית', filter: (d) => d.status === 'review' },
}
const SORTS = {
  date: (d) => String(docDate(d)), supplier: (d) => d.supplier_name || '', total: (d) => Number(d.total_amount) || 0, vat: (d) => Number(d.vat_amount) || 0,
  before: (d) => Number(d.amount_before_vat) || 0, conf: (d) => Number(d.confidence ?? -1), created: (d) => d.created_at, number: (d) => d.doc_number || '',
}
const EMPTY_F = { from: '', to: '', supplier: '', biz: '', project: '', cat: '', type: '', source: '', min: '', max: '' }
const VIEW_KEY = 'fin-doc-view'

export default function Documents({ preset = 'all' }) {
  const { documents, businesses, projects, categories, suppliers, mailboxes, allocations, role, can, reload, patchDoc, go } = useFinance()
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const P = PRESET[preset]
  const base = preset === 'all' ? '/documents' : `/${preset}`
  const tab = preset === 'all' ? params.get('status') || '' : ''
  const [q, setQ] = useState(() => params.get('q') || '')
  // "open the documents behind this number" from the overview: an exact list of ids, shown as a removable chip
  const [only, setOnly] = useState(() => { if (!params.get('ids')) return null; try { const v = JSON.parse(sessionStorage.getItem('fin-x-ids') || 'null'); return v?.ids ? { ids: new Set(v.ids), title: v.title } : null } catch { return null } })
  const [f, setF] = useState(() => ({ ...EMPTY_F, from: only ? '' : params.get('from') || '', to: only ? '' : params.get('to') || '', supplier: params.get('supplier') || '', project: params.get('project') || '', biz: params.get('company') || '', cat: params.get('category') ? categories.find((c) => c.id === params.get('category'))?.name || '' : '' }))
  // cards on a phone, a table on a wide screen, unless the person chose (the choice is kept on the device)
  const [view, setView] = useState(() => { const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches; try { return localStorage.getItem(VIEW_KEY) || (phone ? 'cards' : 'table') } catch { return phone ? 'cards' : 'table' } })
  const [confirm, setConfirm] = useState(null)   // { label, run, count, skipped }
  const switchView = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* noop */ } }
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState({ key: 'date', dir: -1 })
  const [sel, setSel] = useState(() => new Set())
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [peek, setPeek] = useState(null)   // the row whose document floats over its name
  const [showUpload, setShowUpload] = useState(false)
  const [dateBy, setDateBy] = useState('doc')            // filter by the date on the document, or by when it arrived
  const [sending, setSending] = useState(null)           // the documents in the "send to the accountant" dialog
  const [sharing, setSharing] = useState(null)           // { docs, mode } for the share dialog (WhatsApp / email)
  const copies = useAsync(() => (can('operate') ? api.loadCloudCopies() : {}), [documents.length])
  const cloud = copies.data || {}
  const setFilter = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const activeFilters = Object.values(f).filter(Boolean).length

  // typing stays instant: the list follows the search a frame later
  const qd = useDeferredValue(q)
  const rows = useMemo(() => {
    const needle = qd.trim().toLowerCase()
    const list = documents.filter((d) => (only ? only.ids.has(d.id) : P.filter(d) && (preset !== 'all' || inTab(d, tab)))
      && (!f.from || String(dateBy === 'received' ? String(d.created_at).slice(0, 10) : docDate(d)) >= f.from) && (!f.to || String(dateBy === 'received' ? String(d.created_at).slice(0, 10) : docDate(d)) <= f.to)
      && (!f.supplier || d.supplier_id === f.supplier) && (!f.biz || (f.biz === 'none' ? !d.business_id : d.business_id === f.biz))
      && (!f.project || (f.project === 'none' ? !d.project_id && !allocations.some((a) => a.document_id === d.id) : d.project_id === f.project || allocations.some((a) => a.document_id === d.id && a.project_id === f.project))) && (!f.cat || d.category === f.cat)
      && (tab === 'archived' || d.status !== 'archived')
      && (!f.type || d.doc_type === f.type) && (!f.source || d.source === f.source || d.mailbox_id === f.source)
      && (!f.min || Math.abs(Number(d.total_amount) || 0) >= Number(f.min)) && (!f.max || Math.abs(Number(d.total_amount) || 0) <= Number(f.max))
      && (!needle || [d.supplier_name, d.doc_number, d.description, d.file_name, d.email_subject, d.supplier_vat_id, d.category, nameOf(businesses, d.business_id), nameOf(projects, d.project_id), String(d.total_amount ?? '')].some((v) => String(v || '').toLowerCase().includes(needle))))
    const key = SORTS[sort.key]
    return list.sort((a, b) => { const x = key(a); const y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir })
  }, [documents, P, preset, tab, f, qd, sort, businesses, projects, allocations, dateBy, only])

  const total = rows.reduce((s, d) => s + signedTotal(d), 0)
  // draw 100 rows at a time (10,000 rows in the page took 17 seconds); totals, "select all" and exports use every row
  const STEP = 100
  const [shown, setShown] = useState(STEP)
  useEffect(() => { setShown(STEP) }, [qd, f, tab, sort, dateBy, only, preset])
  const visible = rows.length > shown ? rows.slice(0, shown) : rows
  const allOn = rows.length > 0 && rows.every((d) => sel.has(d.id))
  const toggle = (did) => setSel((s) => { const n = new Set(s); if (n.has(did)) n.delete(did); else n.add(did); return n })
  const picked = rows.filter((d) => sel.has(d.id))
  // a search or filter that hides selected documents drops them from the selection: the bar counts what the actions use
  useEffect(() => { setSel((s) => { const keep = new Set(rows.filter((d) => s.has(d.id)).map((d) => d.id)); return keep.size === s.size ? s : keep }) }, [rows])

  const bulk = (label, patchFor, only = () => true) => {
    const targets = picked.filter(only)
    const skipped = picked.length - targets.length
    if (!targets.length) { setNote(`אין מסמכים מתאימים לפעולה (${skipped} דולגו)`); return }
    setConfirm({ label, count: targets.length, skipped, run: () => runBulk(label, patchFor, targets, skipped) })
  }
  const runBulk = async (label, patchFor, targets, skipped) => {
    setConfirm(null); setBusy(label); setNote('')
    try {
      const out = await api.updateDocuments(targets.map((d) => d.id), patchFor)
      const approved = (out || []).filter((d) => d.status === 'approved').length
      setNote(`${targets.length} מסמכים עודכנו${skipped ? `, ${skipped} דולגו` : ''}`)
      if (label === 'approve' && approved) moments.approve({ from: document.querySelector('.fin-bulk .fin-btn--primary'), title: approved === 1 ? 'המסמך אושר' : `${approved} מסמכים אושרו`, sub: 'מוכנים לשליחה לרו״ח' })
      setSel(new Set()); await reload()
    } catch (e) { setNote(/SECOND_APPROVAL/.test(e.message) ? 'חלק מהמסמכים דורשים מאשר נוסף' : /PROJECT_COMPANY/.test(e.message) ? 'הפרויקט שייך לחברה אחרת מזו של המסמך' : e.message) } finally { setBusy('') }
  }
  // suspected duplicates: a pair is "certain" when the original has the same supplier, number and total; those can be merged
  // in one click (the copy is closed as a duplicate of the original, nothing is deleted), the rest are opened one by one
  const dups = useMemo(() => documents.filter((d) => d.duplicate_state === 'suspected' && d.status === 'review'), [documents])
  const sameAs = (d) => { const o = documents.find((x) => x.id === d.duplicate_of); return !!o && !['duplicate', 'rejected', 'archived'].includes(o.status) && String(o.doc_number || '') === String(d.doc_number || '') && Number(o.total_amount) === Number(d.total_amount) && (o.supplier_vat_id ? o.supplier_vat_id === d.supplier_vat_id : o.supplier_name === d.supplier_name) }
  const sureDups = dups.filter(sameAs)
  const mergeDups = async () => {
    if (!(await askConfirm({ title: 'מיזוג כפילויות', text: `${sureDups.length === 1 ? 'מסמך אחד זהה' : `${sureDups.length} מסמכים זהים`} למסמך שכבר במערכת (אותו ספק, מספר וסכום). העותק ייסגר ככפול של המקורי; שום דבר לא נמחק.`, ok: 'מיזוג' }))) return
    setBusy('dups'); let ok = 0
    for (const d of sureDups) { try { await api.callServer('duplicate-decide', { document_id: d.id, decision: 'duplicate' }); ok++ } catch { /* the next */ } }
    setBusy(''); setNote(ok === 1 ? 'כפילות אחת מוזגה' : `${ok} כפילויות מוזגו`); await reload()
  }
  const canDelete = (d) => can('manage') || (can('operate') && !['approved', 'sent'].includes(d.status))
  const removeDoc = async (d) => {
    if (!(await askConfirm({ title: 'מחיקת מסמך', text: `למחוק את "${d.supplier_name || d.file_name || 'המסמך'}"${d.total_amount != null ? ` (${money(d.total_amount, d.currency)})` : ''}? המסמך והקובץ שלו יימחקו מהמערכת. הפעולה נרשמת בהיסטוריה.`, ok: 'מחיקה', danger: true }))) return
    try { await api.deleteDocument(d); setNote('המסמך נמחק'); await reload() } catch (e) { setNote(e.message) }
  }
  const downloadOriginals = async () => {
    setBusy('zip')
    try {
      const files = []
      for (const d of picked) if (d.file_path) files.push({ name: `${docDate(d)}_${(d.supplier_name || 'מסמך').replace(/[\\/:*?"<>|]/g, '')}_${d.doc_number || d.id.slice(0, 6)}.${(d.file_name || '').split('.').pop() || 'pdf'}`, data: await api.fileBlob(d) })
      if (!files.length) { setNote('למסמכים שנבחרו אין קובץ מקור'); return }
      saveBlob(await makeZip(files), `מסמכים_${new Date().toISOString().slice(0, 10)}.zip`)
      api.logAction('downloaded_originals', { count: files.length, ids: picked.slice(0, 200).map((d) => d.id) })
    } catch (e) { setNote(e.message) } finally { setBusy('') }
  }
  const sheet = (format) => {
    try { exportSheet(picked, format, { businesses, projects }, cloud, P.title || 'מסמכים'); setNote(`${format === 'csv' ? 'קובץ CSV' : 'קובץ Excel'} עם ${picked.length === 1 ? 'מסמך אחד' : `${picked.length} מסמכים`} הורד.`) } catch (e) { setNote(e.message) }
  }
  // "save to Drive": the server copies each file and answers per file; the note says only what really happened
  const toDrive = async (list) => {
    setBusy('drive'); setNote('')
    try {
      const r = await api.saveToCloud(list.map((d) => d.id))
      const ok = r.results.filter((x) => x.ok); const bad = r.results.filter((x) => !x.ok)
      const fresh = ok.filter((x) => !x.already).length
      if (fresh) moments.save({ title: `${fresh === 1 ? 'מסמך אחד נשמר' : `${fresh} מסמכים נשמרו`} ב-${r.provider === 'gdrive' ? 'Google Drive' : 'Dropbox'}`, sub: 'בתיקיית השנה והחודש' })
      const where = r.provider === 'gdrive' ? 'Google Drive' : 'Dropbox'
      setNote([fresh ? `${fresh === 1 ? 'מסמך אחד נשמר' : `${fresh} מסמכים נשמרו`} ב-${where}` : '', ok.length - fresh ? `${ok.length - fresh} כבר היו שמורים` : '', bad.length ? `${bad.length} לא נשמרו: ${bad[0].error}` : ''].filter(Boolean).join('. ') + '.')
      copies.reload()
    } catch (e) { setNote(e.message) } finally { setBusy('') }
  }
  const exportSelected = () => {
    try { sessionStorage.setItem('fin-export-ids', JSON.stringify(picked.map((d) => d.id))) } catch { /* noop */ }
    go('/integrations?from=selection')
  }
  const sortBy = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }))
  const Th = ({ k, children, className = '' }) => (
    <th className={className} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="fin-th-sort" onClick={() => sortBy(k)}>{children}{sort.key === k && <span aria-hidden="true">{sort.dir === 1 ? '▲' : '▼'}</span>}</button>
    </th>
  )

  const idx = rows.findIndex((d) => d.id === id)
  const current = id ? documents.find((d) => d.id === id) : null
  const link = (did) => `${base}/${did}${tab ? `?status=${tab}` : ''}`
  const edit = can('edit')

  return (
    <div className="fin-stack">
      {P.title && <PageHead title={P.title} sub={P.sub} />}
      {preset === 'all' && (
        <div className="fin-tabs" role="tablist" aria-label="סטטוס">
          {TABS.filter((t) => role !== 'accountant' || ['', 'approved', 'sent'].includes(t.id)).map((t) => {
            const n = documents.filter((d) => inTab(d, t.id)).length
            return (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`fin-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => { const p = new URLSearchParams(params); if (t.id) p.set('status', t.id); else p.delete('status'); setParams(p); setSel(new Set()) }}>
                {t.label} <em>{n}</em>
              </button>
            )
          })}
        </div>
      )}

      <div className="fin-filters">
        <label className="fin-search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="ספק, מספר, חברה, פרויקט, קטגוריה, סכום…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש מסמכים" />
        </label>
        <DateRange from={f.from} to={f.to} label={dateBy === 'received' ? 'תאריך קליטה' : 'תאריך המסמך'} by={dateBy} onBy={setDateBy} byOptions={[['doc', 'תאריך המסמך'], ['received', 'תאריך קליטה']]} onChange={(from, to) => setF((x) => ({ ...x, from, to }))} />
        <div className="fin-seg" role="group" aria-label="תצוגה">
          <button type="button" className={view === 'table' ? 'is-on' : ''} onClick={() => switchView('table')} aria-pressed={view === 'table'} title="טבלה"><Icon name="rows" size={17} /><span className="fin-sr">טבלה</span></button>
          <button type="button" className={view === 'cards' ? 'is-on' : ''} onClick={() => switchView('cards')} aria-pressed={view === 'cards'} title="כרטיסים"><Icon name="grid" size={17} /><span className="fin-sr">כרטיסים</span></button>
        </div>
        <button type="button" className={`fin-btn ${activeFilters ? 'fin-btn--on' : ''}`} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="fin-doc-filters"><Icon name="filter" size={18} /> סינון{activeFilters ? ` (${activeFilters})` : ''}</button>
        {can('upload') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setShowUpload((v) => !v)}><Icon name="plus" size={18} /> הוספת מסמכים</button>}
      </div>

      {showFilters && (
        <div className="fin-filter-panel" id="fin-doc-filters">
          <label className="fin-field"><span className="fin-field__label">ספק</span><Select value={f.supplier} onChange={setFilter('supplier')}><option value="">הכול</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></label>
          <label className="fin-field"><span className="fin-field__label">חברה</span><Select value={f.biz} onChange={setFilter('biz')}><option value="">הכול</option><option value="none">לא משויך</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></label>
          <label className="fin-field"><span className="fin-field__label">פרויקט</span><Select value={f.project} onChange={setFilter('project')}><option value="">הכול</option><option value="none">ללא פרויקט</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></label>
          <label className="fin-field"><span className="fin-field__label">קטגוריה</span><Select value={f.cat} onChange={setFilter('cat')}><option value="">הכול</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></label>
          <label className="fin-field"><span className="fin-field__label">סוג מסמך</span><Select value={f.type} onChange={setFilter('type')}><option value="">הכול</option>{Object.entries(DOC_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></label>
          <label className="fin-field"><span className="fin-field__label">מקור</span><Select value={f.source} onChange={setFilter('source')}><option value="">הכול</option>{Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}{mailboxes.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}</Select></label>
          <label className="fin-field"><span className="fin-field__label">סכום מ-</span><input type="number" inputMode="decimal" value={f.min} onChange={setFilter('min')} /></label>
          <label className="fin-field"><span className="fin-field__label">סכום עד</span><input type="number" inputMode="decimal" value={f.max} onChange={setFilter('max')} /></label>
          <button type="button" className="fin-link" onClick={() => setF(EMPTY_F)} disabled={!activeFilters}>ניקוי הסינון</button>
        </div>
      )}

      {only && (
        <div className="fin-onlybar" role="status">
          <Icon name="filter" size={16} /><span>מוצגים {only.ids.size} המסמכים של: <strong>{only.title}</strong></span>
          <button type="button" className="fin-link" onClick={() => { setOnly(null); const p = new URLSearchParams(params); p.delete('ids'); setParams(p) }}>הצגת כל המסמכים</button>
        </div>
      )}
      {showUpload && <UploadZone onDone={reload} />}
      {(f.from || f.to) && (
        <div className="fin-rangebar" role="region" aria-label="סיכום הטווח">
          <div className="fin-rangebar__text"><strong>{rows.length === 1 ? 'מסמך אחד' : `${rows.length} מסמכים`}</strong><span>{sayRange(f.from, f.to)}</span></div>
          <strong className="fin-rangebar__sum">{money(total)}</strong>
          {can('approve') && <button type="button" className="fin-btn fin-btn--primary" disabled={!rows.length} onClick={() => setSending(rows)}><Icon name="send" size={17} /> שליחה לרו״ח</button>}
        </div>
      )}

      {picked.length > 0 && (
        <div className="fin-bulk" role="region" aria-label="פעולות על המסומנים">
          <div className="fin-bulk__row">
            <strong className="fin-bulk__count">{picked.length === 1 ? 'מסמך אחד מסומן' : `${picked.length} מסומנים`}<small>{money(picked.reduce((a, d) => a + signedTotal(d), 0))}</small></strong>
            {can('approve') && <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy} onClick={() => bulk('approve', { status: 'approved' }, (d) => d.status === 'review' && !hasError(d))}><Icon name="check" size={18} /> אישור</button>}
            {can('approve') && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => setSending(picked)}><Icon name="send" size={17} /> שליחה לרו״ח</button>}
            <button type="button" className="fin-btn" disabled={!!busy} onClick={() => sheet('excel')}><Icon name="table" size={17} /> Excel</button>
            <button type="button" className="fin-btn fin-col-md" disabled={!!busy} onClick={() => sheet('csv')}>CSV</button>
            {can('operate') && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => toDrive(picked)}><Icon name="cloud" size={17} /> {busy === 'drive' ? 'שומר…' : 'שמירה בדרייב'}</button>}
            {can('upload') && <button type="button" className="fin-btn" disabled={!!busy} onClick={() => setSharing({ docs: picked, mode: 'whatsapp' })}><Icon name="share" size={17} /> שיתוף</button>}
            <MoreMenu label="פעולות נוספות" items={[
              { label: busy === 'zip' ? 'מכין…' : 'הורדת הקבצים (ZIP)', icon: 'download', onClick: downloadOriginals },
              { label: 'קובץ CSV', icon: 'download', onClick: () => sheet('csv') },
              can('upload') && { label: 'שליחה במייל', icon: 'mail', onClick: () => setSharing({ docs: picked, mode: 'email' }) },
              can('export') && { label: 'ייצוא לתוכנה או למערכת חיצונית', icon: 'plug', onClick: exportSelected },
              edit && { label: 'דחייה', icon: 'close', onClick: () => bulk('reject', { status: 'rejected' }, (d) => !['approved', 'sent'].includes(d.status)) },
              edit && { label: 'סימון ככפול', icon: 'copy', onClick: () => bulk('dup', { status: 'duplicate' }, (d) => !['approved', 'sent'].includes(d.status)) },
              edit && { label: 'העברה לארכיון', icon: 'archive', danger: true, onClick: () => bulk('archive', { status: 'archived', archived_at: new Date().toISOString() }, (d) => !['approved', 'sent', 'processing'].includes(d.status)) },
            ]} />
            <button type="button" className="fin-link" onClick={() => setSel(new Set())}>ביטול</button>
          </div>
          {edit && (
            <div className="fin-bulk__row fin-bulk__assign">
              <Select className="fin-select" value="" onChange={(e) => e.target.value && bulk('cat', { category_id: e.target.value })} aria-label="שינוי קטגוריה" disabled={!!busy}>
                <option value="">שינוי קטגוריה…</option>{categories.filter((c) => c.active !== false).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {businesses.length > 0 && (
                <Select className="fin-select" value="" onChange={(e) => e.target.value && bulk('biz', { business_id: e.target.value })} aria-label="שיוך לחברה" disabled={!!busy}>
                  <option value="">שיוך לחברה…</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              )}
              {projects.length > 0 && (
                <Select className="fin-select" value="" onChange={(e) => e.target.value && bulk('project', { project_id: e.target.value === 'none' ? null : e.target.value })} aria-label="שיוך לפרויקט" disabled={!!busy}>
                  <option value="">שיוך לפרויקט…</option><option value="none">ללא פרויקט</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              )}
            </div>
          )}
        </div>
      )}
      {note && <p className="fin-note" role="status">{note}</p>}
      {dups.length > 0 && (
        <div className="fin-dupbar" role="status">
          <span className="fin-dupbar__icon"><Icon name="copy" size={18} /></span>
          <span className="fin-dupbar__text"><strong>{dups.length === 1 ? 'מסמך אחד נראה כפול' : `${dups.length} מסמכים נראים כפולים`}</strong><small>{sureDups.length ? `${sureDups.length} מהם זהים לגמרי למסמך שכבר במערכת: אותו ספק, מספר וסכום.` : 'דומים למסמך קיים; כדאי לבדוק לפני שמאשרים.'}</small></span>
          {can('edit') && sureDups.length > 0 && <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={mergeDups} disabled={!!busy}>{busy === 'dups' ? 'ממזג…' : `מיזוג ${sureDups.length} זהים`}</button>}
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => go(link(dups[0].id))}>הצגה</button>
        </div>
      )}

      {rows.length === 0 ? (
        tab === 'numbers' && documents.length && !only && !q && !activeFilters ? <Empty title="מעולה, אין מספרים לבדוק" icon="check">כל הסכומים במסמכים שממתינים נקראו בביטחון ומסתדרים. מסמך שהמערכת לא בטוחה בסכומים שלו יופיע כאן.</Empty> : <Empty title={documents.length ? 'אין מסמכים שמתאימים' : 'עוד אין מסמכים'} icon="docs" action={!documents.length && can('connect') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/mailboxes')}>חיבור תיבת מייל</button>}>
          {documents.length ? 'נסו להסיר חלק מהמסננים או מהחיפוש.' : 'חברו תיבת מייל כדי שהחשבוניות ייאספו לבד, או העלו קבצים.'}
        </Empty>
      ) : view === 'cards' ? (
        <ul className="fin-doccards">
          {visible.map((d) => (
            <li key={d.id} className={`fin-doccard ${sel.has(d.id) ? 'is-selected' : ''}`}>
              <button type="button" className="fin-doccard__open" onClick={() => go(link(d.id))} aria-label={`פתיחת ${d.supplier_name || d.file_name}`}><Thumbnail doc={d} /></button>
              <label className="fin-doccard__check"><input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} aria-label={`סימון ${d.supplier_name || d.file_name}`} /></label>
              <div className="fin-doccard__body">
                <div className="fin-doccard__top">
                  {d.supplier_id ? <button type="button" className="fin-doccard__supplier" onClick={() => go(`/suppliers/${d.supplier_id}`)}>{d.supplier_name}</button> : <span className="fin-doccard__supplier">{d.supplier_name || d.file_name}</span>}
                  <StatusPill status={d.status} />
                </div>
                <p className="fin-doccard__amount">{money(d.total_amount, d.currency)}<small>מע״מ {money(d.vat_amount, d.currency)}</small></p>
                <dl className="fin-doccard__meta">
                  <div><dt>תאריך</dt><dd>{date(docDate(d))}</dd></div>
                  <div><dt>מספר</dt><dd dir="ltr">{d.doc_number || '—'}</dd></div>
                  <div><dt>חברה</dt><dd>{nameOf(businesses, d.business_id) || <span className="fin-attn-text">לא משויך</span>}</dd></div>
                  <div><dt>פרויקט</dt><dd>{allocations.some((a) => a.document_id === d.id) ? 'מפוצל' : nameOf(projects, d.project_id) || '—'}</dd></div>
                  <div><dt>קטגוריה</dt><dd>{d.category || '—'}</dd></div>
                  <div><dt>עיבוד</dt><dd>{d.processed_at ? <Confidence value={d.confidence} /> : d.status === 'failed' ? 'נכשל' : 'ממתין'}</dd></div>
                </dl>
                <div className="fin-doccard__actions">
                  <button type="button" className="fin-btn fin-btn--sm" onClick={() => go(link(d.id))}><Icon name="edit" size={15} /> צפייה ועריכה</button>
                  {can('approve') && d.status === 'review' && <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" onClick={() => { setSel(new Set([d.id])); setConfirm({ label: 'approve', count: 1, skipped: 0, run: () => runBulk('approve', { status: 'approved' }, [d], 0) }) }}><Icon name="check" size={15} /> אישור</button>}
                  <details className="fin-menu">
                    <summary className="fin-icon-btn" aria-label="פעולות נוספות"><Icon name="more" size={18} /></summary>
                    <div className="fin-menu__pop">
                      {edit && <label>חברה<Select value={d.business_id || ''} onChange={async (e) => { try { patchDoc(await api.updateDocument(d.id, { business_id: e.target.value || null })) } catch (er) { setNote(er.message) } }}><option value="">—</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></label>}
                      {edit && <label>פרויקט<Select value={d.project_id || ''} onChange={async (e) => { try { patchDoc(await api.updateDocument(d.id, { project_id: e.target.value || null })) } catch (er) { setNote(/PROJECT_COMPANY/.test(er.message) ? 'הפרויקט שייך לחברה אחרת' : er.message) } }}><option value="">—</option>{projects.filter((p) => !d.business_id || p.business_id === d.business_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></label>}
                      {edit && <label>קטגוריה<Select value={d.category_id || ''} onChange={async (e) => { try { patchDoc(await api.updateDocument(d.id, { category_id: e.target.value || null })) } catch (er) { setNote(er.message) } }}><option value="">—</option>{categories.filter((c) => c.active !== false).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>}
                      {d.supplier_id && <button type="button" onClick={() => go(`/suppliers/${d.supplier_id}`)}>פרופיל הספק</button>}
                      {d.file_path && <button type="button" onClick={async () => saveBlob(await api.fileBlob(d), d.file_name || 'document')}>הורדת המקור</button>}
                      {edit && !['approved', 'sent', 'archived'].includes(d.status) && <button type="button" onClick={() => setConfirm({ label: 'archive', count: 1, skipped: 0, run: () => runBulk('archive', { status: 'archived', archived_at: new Date().toISOString() }, [d], 0) })}>העברה לארכיון</button>}
                    </div>
                  </details>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="fin-table-wrap">
          <table className="fin-table fin-table--docs">
            <thead>
              <tr>
                <th className="fin-table__check"><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((d) => d.id)))} aria-label="סימון הכול" /></th>
                <Th k="supplier">ספק</Th>
                <th className="fin-col-md">סוג</th>
                <Th k="number" className="fin-col-md">מספר</Th>
                <Th k="date">תאריך</Th>
                <th className="fin-col-lg">חברה</th>
                <th className="fin-col-lg">פרויקט</th>
                <th className="fin-col-lg">קטגוריה</th>
                <Th k="before" className="fin-num fin-col-xl">לפני מע״מ</Th>
                <Th k="vat" className="fin-num fin-col-md">מע״מ</Th>
                <Th k="total" className="fin-num">סה״כ</Th>
                <th>סטטוס</th>
                <th className="fin-col-xl">מטבע</th>
                <th className="fin-col-xl">מקור</th>
                {can('operate') && <th className="fin-col-lg">ענן</th>}
                <Th k="conf" className="fin-col-md">ודאות</Th>
                <th className="fin-col-md"><span className="fin-sr">פעולות</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => {
                const errs = issuesOf(d).filter((i) => i.level === 'error').length
                return (
                  <tr key={d.id} className={d.id === id ? 'is-current' : ''} onClick={() => go(link(d.id))} onMouseEnter={() => { if (d.file_path && window.matchMedia('(hover: hover)').matches) prefetchThumb(d) }}>
                    <td className="fin-table__check" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} aria-label={`סימון ${d.supplier_name || d.file_name}`} /></td>
                    <td className="fin-td-main">
                      <span className="fin-peek" onMouseEnter={(e) => { if (!window.matchMedia('(hover: hover)').matches) return; const r = e.currentTarget.getBoundingClientRect(); const W = 440; const H = 640; const right = innerWidth - r.left + 16; setPeek({ id: d.id, right: right + W > innerWidth - 8 ? Math.max(8, innerWidth - r.right) : right, top: Math.max(12, Math.min(innerHeight - H - 12, r.top + r.height / 2 - H / 2)) }) }} onMouseLeave={() => setPeek((x) => (x?.id === d.id ? null : x))}>
                      {peek?.id === d.id && d.file_path && <span className="fin-peek__pop" style={{ top: peek.top, right: peek.right }} aria-hidden="true">
                        <span className="fin-peek__head"><strong>{d.supplier_name || d.file_name}</strong><StatusPill status={d.status} /></span>
                        <span className="fin-peek__doc"><Thumbnail doc={d} size="lg" /></span>
                        <span className="fin-peek__foot"><small>{[DOC_TYPE[d.doc_type], d.doc_number, date(docDate(d))].filter(Boolean).join(' · ')}</small>{d.total_amount != null && <b>{money(d.total_amount, d.currency)}</b>}</span>
                      </span>}
                      <button type="button" className="fin-cell-main fin-cell-btn" onClick={(e) => { e.stopPropagation(); go(link(d.id)) }}>{d.supplier_name || <em className="fin-muted">{d.file_name || 'לא זוהה'}</em>}</button></span>
                      <small className="fin-cell-sub">{d.duplicate_state === 'suspected' && d.status === 'review' && <span className="fin-duppill" title="נראה כפול של מסמך קיים"><Icon name="copy" size={11} /> כפול?</span>}{d.description || DOC_TYPE[d.doc_type]}{errs ? <span className="fin-cell-err"> · {errs} בעיות</span> : ''}</small>
                    </td>
                    <td className="fin-col-md" data-label="סוג">{DOC_TYPE[d.doc_type] || '—'}</td>
                    <td className="fin-col-md fin-ltr" data-label="מספר">{d.doc_number || '—'}</td>
                    <td data-label="תאריך">{date(docDate(d))}</td>
                    <td className="fin-col-lg" data-label="חברה">{nameOf(businesses, d.business_id) || <span className="fin-muted">—</span>}</td>
                    <td className="fin-col-lg" data-label="פרויקט">{nameOf(projects, d.project_id) || <span className="fin-muted">—</span>}</td>
                    <td className="fin-col-lg" data-label="קטגוריה">{d.category || '—'}</td>
                    <td className="fin-num fin-col-xl" data-label="לפני מע״מ">{money(d.amount_before_vat, d.currency)}</td>
                    <td className="fin-num fin-col-md" data-label="מע״מ">{money(d.vat_amount, d.currency)}</td>
                    <td className="fin-num fin-td-total" data-label="סה״כ"><strong>{money(d.total_amount, d.currency)}</strong></td>
                    <td className="fin-td-status"><StatusPill status={d.status} /></td>
                    <td className="fin-col-xl fin-ltr" data-label="מטבע">{d.currency || 'ILS'}</td>
                    <td className="fin-col-xl" data-label="מקור">{SOURCE[d.source]}</td>
                    {can('operate') && <td className="fin-col-lg" data-label="ענן" onClick={(e) => e.stopPropagation()}>{cloud[d.id]?.web_link ? <a className="fin-cloudcell is-on" href={cloud[d.id].web_link} target="_blank" rel="noopener noreferrer" title={cloud[d.id].path}><Icon name="cloud" size={15} /> נשמר</a> : <span className="fin-cloudcell">—</span>}</td>}
                    <td className="fin-col-md" data-label="ודאות"><Confidence value={d.confidence} /></td>
                    <td className="fin-col-md" onClick={(e) => e.stopPropagation()}>
                      {d.file_path && <button type="button" className="fin-icon-btn" aria-label={`הורדת המקור של ${d.supplier_name || d.file_name}`} title="הורדת הקובץ המקורי" onClick={async () => saveBlob(await api.fileBlob(d), d.file_name || 'document')}><Icon name="download" size={18} /></button>}
                    {canDelete(d) && <button type="button" className="fin-icon-btn fin-icon-btn--danger" onClick={() => removeDoc(d)} aria-label={`מחיקת ${d.supplier_name || d.file_name || 'המסמך'}`} title="מחיקה"><Icon name="trash" size={17} /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={can('operate') ? 17 : 16}><span>{rows.length} מסמכים</span><strong>{money(total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      )}

      {rows.length > shown && (
        <div className="fin-more-rows">
          <span>מוצגים {shown.toLocaleString('he-IL')} מתוך {rows.length.toLocaleString('he-IL')}</span>
          <button type="button" className="fin-btn" onClick={() => setShown((n) => n + STEP * 2)}>הצגת עוד {Math.min(STEP * 2, rows.length - shown)}</button>
          {rows.length - shown > STEP * 2 && <button type="button" className="fin-link" onClick={() => setShown(rows.length)}>הצגת הכול</button>}
        </div>
      )}
      {confirm && (
        <Modal title="אישור פעולה" onClose={() => setConfirm(null)} footer={<><button type="button" className={`fin-btn ${confirm.label === 'archive' || confirm.label === 'reject' ? 'fin-btn--danger' : 'fin-btn--primary'}`} onClick={confirm.run}>{({ approve: 'אישור', reject: 'דחייה', dup: 'סימון ככפול', archive: 'העברה לארכיון', biz: 'שיוך לחברה', project: 'שיוך לפרויקט', cat: 'שיוך לקטגוריה' })[confirm.label] || 'ביצוע'} של {confirm.count} מסמכים</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setConfirm(null)}>ביטול</button></>}>
          <p>הפעולה תחול על {confirm.count} מסמכים{confirm.skipped ? ` (${confirm.skipped} דולגו כי הם לא מתאימים לה)` : ''}. כל שינוי נרשם ביומן.</p>
          {confirm.label === 'approve' && <p className="fin-muted">מסמכים עם שגיאות בקרה לא נכללים. מסמך מעל סף האישור הכפול מחכה למאשר נוסף.</p>}
        </Modal>
      )}
      {current && (
        <DocumentPanel
          key={current.id}
          doc={current}
          onClose={() => go(`${base}${tab ? `?status=${tab}` : ''}`)}
          onSaved={patchDoc}
          onDeleted={async () => { await reload(); go(base) }}
          onPrev={idx > 0 ? () => go(link(rows[idx - 1].id)) : null}
          onNext={idx >= 0 && idx < rows.length - 1 ? () => go(link(rows[idx + 1].id)) : null}
        />
      )}
      {sharing && <ShareDialog docs={sharing.docs} initial={sharing.mode} onClose={() => setSharing(null)} />}
      {sending && <SendToAccountant docs={sending} period={sayRange(f.from, f.to)} onClose={() => setSending(null)} onSent={(r) => { setSending(null); setSel(new Set()); setNote(`נשלח ל-${r.to.join(', ')}: ${r.sent === 1 ? 'מסמך אחד' : `${r.sent} מסמכים`}, ${r.attached} קבצים מצורפים${r.linked ? `, ${r.linked} בקישור` : ''}.`) }} />}
    </div>
  )
}
