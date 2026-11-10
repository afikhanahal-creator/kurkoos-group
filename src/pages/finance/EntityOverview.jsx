import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ENTITIES, SUPPLIER_STATUS } from './entities.js'
import { DOC_TYPE, PROJECT_STATUS, counts, date, docDate, money, monthLabel, nameOf, period, shiftMonth, signedTotal, thisMonth } from './format.js'
import { docsFor, summarize } from './stats.js'
import { EntityForm } from './MasterData.jsx'
import { Empty, Icon, Modal, Pill, StatusPill, useAsync } from './ui.jsx'
import Select from './Select.jsx'
import DocList from './DocList.jsx'

const PERIODS = { all: 'כל הזמן', year: 'השנה', '12m': '12 חודשים', '3m': '3 חודשים', month: 'החודש' }
const inPeriod = (p, k) => {
  if (k === 'all') return true
  const now = thisMonth()
  if (k === 'month') return p === now
  if (k === 'year') return p.slice(0, 4) === now.slice(0, 4)
  return p >= shiftMonth(now, k === '3m' ? -2 : -11) && p <= now
}

/* twelve months as columns: the bars are the money, the current period is drawn darker */
function Trend({ items }) {
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth(), i - 11))
  const vals = months.map((m) => items.filter(({ doc }) => counts(doc) && period(doc) === m).reduce((s, { doc, share }) => s + signedTotal(doc) * share, 0))
  const max = Math.max(...vals, 1)
  return (
    <figure className="fin-trend2" aria-label="הוצאות לפי חודש, 12 חודשים">
      <div className="fin-trend2__bars">
        {vals.map((v, i) => (
          <div key={months[i]} className="fin-trend2__col" title={`${monthLabel(months[i])}: ${money(v)}`}>
            <span className="fin-trend2__val">{v ? money(v).replace(/\.\d\d/, '') : ''}</span>
            <span className={`fin-trend2__bar ${i === 11 ? 'is-now' : ''}`} style={{ height: `${Math.max(v ? 4 : 1, (v / max) * 100)}%` }} />
            <span className="fin-trend2__m">{new Date(`${months[i]}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'short' })}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

function Breakdown({ title, rows, onPick }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const total = rows.reduce((a, r) => a + Math.abs(r.value), 0) || 1
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, 6)
  return (
    <section className="fin-panel-block fin-rank">
      <header className="fin-rank__head"><h3>{title}</h3>{rows.length > 0 && <small>{rows.length === 1 ? 'פריט אחד' : `${rows.length} פריטים`}</small>}</header>
      {!rows.length ? <p className="fin-muted">אין עדיין נתונים.</p> : (
        <ol className="fin-rank__list">
          {shown.map((r, i) => {
            const share = Math.round((Math.abs(r.value) / total) * 100)
            return (
              <li key={r.key}>
                <button type="button" className="fin-rank__row" onClick={r.id && onPick ? () => onPick(r.id) : undefined} disabled={!r.id || !onPick}>
                  <span className="fin-rank__n" aria-hidden="true">{i + 1}</span>
                  <span className="fin-rank__name" title={r.name}>{r.name}</span>
                  <span className="fin-rank__val">{money(r.value)}</span>
                  <span className="fin-rank__bar" aria-hidden="true"><span style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` }} /></span>
                  <span className="fin-rank__share">{share}%</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {rows.length > 6 && <button type="button" className="fin-link fin-rank__more" onClick={() => setAll((v) => !v)}>{all ? 'הצגת 6 הראשונים' : `הצגת כל ה-${rows.length}`}</button>}
    </section>
  )
}

function MergeDialog({ supplier, onClose, onDone }) {
  const { suppliers } = useFinance()
  const [into, setInto] = useState('')
  const [err, setErr] = useState('')
  const run = async () => {
    try { await api.mergeSuppliers(supplier.id, into); onDone(into) } catch (e) { setErr(e.message) }
  }
  return (
    <Modal title={`איחוד "${supplier.name}" עם ספק קיים`} onClose={onClose} footer={<><button type="button" className="fin-btn fin-btn--danger" disabled={!into} onClick={run}>איחוד והעברת המסמכים</button><button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>ביטול</button></>}>
      <p className="fin-muted">כל המסמכים והכללים של "{supplier.name}" יעברו לספק שתבחרו, והרישום הכפול יימחק. הפעולה נרשמת ביומן.</p>
      <Select className="fin-select" value={into} onChange={(e) => setInto(e.target.value)} aria-label="הספק שנשאר"><option value="">בחרו ספק…</option>{suppliers.filter((s) => s.id !== supplier.id && s.status !== 'archived').map((s) => <option key={s.id} value={s.id}>{s.name}{s.vat_id ? ` (${s.vat_id})` : ''}</option>)}</Select>
      {err && <p className="fin-error" role="alert">{err}</p>}
    </Modal>
  )
}

export default function EntityOverview({ kind }) {
  const { id } = useParams()
  const def = ENTITIES[kind]
  const ctx = useFinance()
  const { documents, allocations, businesses, projects, categories, suppliers, can, go, reload } = ctx
  const list = ctx[kind === 'businesses' ? 'businesses' : kind] || []
  const row = list.find((r) => r.id === id)
  const [per, setPer] = useState('12m')
  const [edit, setEdit] = useState(false)
  const [merge, setMerge] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const history = useAsync(() => api.loadAudit({ entity: { suppliers: 'supplier', projects: 'project', businesses: 'company', categories: 'category' }[kind], entityId: id, limit: 20 }), [id, row?.name, row?.status])

  const all = useMemo(() => (row ? docsFor(kind, id, documents, allocations, categories) : []), [kind, id, row, documents, allocations, categories])
  const items = useMemo(() => all.filter(({ doc }) => inPeriod(period(doc), per)), [all, per])
  const s = useMemo(() => summarize(items, categories), [items, categories])
  const group = (keyFn, nameFn, idFn) => {
    const g = {}
    for (const it of items) if (counts(it.doc)) { const k = keyFn(it.doc) || '__'; (g[k] ||= { key: k, name: nameFn(k), id: k !== '__' ? idFn?.(k) : null, value: 0 }).value += signedTotal(it.doc) * it.share }
    return Object.values(g).sort((a, b) => b.value - a.value)
  }
  if (!row) return <Empty title={`ה${def.one} לא נמצא`} icon={def.icon} action={<button type="button" className="fin-btn" onClick={() => go(def.path)}>לרשימת {def.title}</button>} />

  const archived = def.archived(row)
  const canWrite = can(def.write)
  const pending = items.filter(({ doc }) => doc.status === 'review')
  const byCat = group((d) => d.category, (k) => (k === '__' ? 'ללא קטגוריה' : k), (k) => categories.find((c) => c.name === k)?.id)
  const bySup = group((d) => d.supplier_id, (k) => (k === '__' ? 'לא מזוהה' : nameOf(suppliers, k)), (k) => k)
  const byProj = group((d) => d.project_id, (k) => (k === '__' ? 'ללא פרויקט' : nameOf(projects, k)), (k) => k)
  const byBiz = group((d) => d.business_id, (k) => (k === '__' ? 'לא משויך' : nameOf(businesses, k)), (k) => k)
  const budget = kind === 'projects' && row.budget ? Number(row.budget) : null
  const allTotal = summarize(all, categories).total

  const setArchive = async (on) => {
    const patch = Object.fromEntries(Object.entries(on ? def.archive : def.restore).map(([k, v]) => [k, typeof v === 'function' ? v() : v]))
    try { await api.saveRow(def.table, { id, ...patch }); setMsg(on ? 'הועבר לארכיון. המסמכים שלו נשארים.' : 'הוחזר מהארכיון'); reload() } catch (e) { setMsg(e.message) }
  }
  const remove = async () => {
    try { await api.deleteRow(def.table, id); go(def.path); reload() } catch (e) { setMsg(/foreign key|violates/.test(e.message) ? 'יש מסמכים או רשומות שמשויכים לכאן. אפשר להעביר לארכיון.' : e.message); setConfirmDelete(false) }
  }
  const approveSupplier = async () => {
    try { await api.saveRow('fin_suppliers', { id, status: 'active' }); setMsg('הספק אושר ונוסף לרשימת הספקים'); reload() } catch (e) { setMsg(e.message) }
  }
  const facts = def.fields.filter((f) => !['notes', 'status', 'active', 'color', 'keywords', 'description'].includes(f.key) && row[f.key] !== null && row[f.key] !== undefined && row[f.key] !== '' && !(Array.isArray(row[f.key]) && !row[f.key].length))
  const show = (f) => {
    const v = row[f.key]
    if (f.type === 'ref' && f.by !== 'name') return nameOf({ businesses, projects, categories }[f.ref] || [], v)
    if (f.type === 'multi') return v.map((x) => nameOf(businesses, x)).join(', ')
    if (f.type === 'date') return date(v)
    if (f.type === 'number' && f.key === 'budget') return money(v)
    if (f.type === 'number') return `${Number(v)}%`
    if (f.type === 'url') return <a href={/^https?:/.test(v) ? v : `https://${v}`} target="_blank" rel="noopener noreferrer" dir="ltr">{v}</a>
    if (f.type === 'email') return <a href={`mailto:${v}`} dir="ltr">{v}</a>
    return <span dir={f.ltr || ['id', 'tel'].includes(f.type) ? 'ltr' : undefined}>{String(v)}</span>
  }

  return (
    <div className="fin-stack">
      <nav className="fin-crumbs" aria-label="מיקום"><button type="button" className="fin-link" onClick={() => go(def.path)}>{def.title}</button><span aria-hidden="true">/</span><span>{row.name}</span></nav>
      <header className="fin-entity-head">
        <div>
          <h2>{row.name}</h2>
          <p className="fin-muted">
            {kind === 'suppliers' && <><Pill tone={row.status === 'pending' ? 'attn' : row.status === 'archived' ? 'muted' : 'ok'}>{SUPPLIER_STATUS[row.status]}</Pill> {row.trading_name || row.supplier_type || ''}</>}
            {kind === 'projects' && <><Pill tone={row.archived_at ? 'muted' : 'ok'}>{row.archived_at ? 'בארכיון' : PROJECT_STATUS[row.status]}</Pill> {nameOf(businesses, row.business_id)}{row.location ? `, ${row.location}` : ''}</>}
            {kind === 'businesses' && <>{archived ? <Pill>בארכיון</Pill> : <Pill tone="ok">פעילה</Pill>} {row.commercial_name || row.name_en || ''}</>}
            {kind === 'categories' && <>{archived ? <Pill>בארכיון</Pill> : <Pill tone="ok">פעילה</Pill>} {row.name_en || ''}{row.parent_id ? ` · תת-קטגוריה של ${nameOf(categories, row.parent_id)}` : ''}</>}
          </p>
        </div>
        <div className="fin-pagehead__actions">
          {kind === 'suppliers' && row.status === 'pending' && can('edit') && <button type="button" className="fin-btn fin-btn--primary" onClick={approveSupplier}><Icon name="check" size={17} /> אישור הספק</button>}
          {kind === 'suppliers' && can('edit') && <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setMerge(true)}>איחוד עם ספק קיים</button>}
          <button type="button" className="fin-btn fin-btn--ghost" onClick={() => go(`/documents?${{ suppliers: 'supplier', projects: 'project', businesses: 'company', categories: 'category' }[kind]}=${id}`)}><Icon name="docs" size={17} /> כל המסמכים</button>
          {canWrite && <button type="button" className="fin-btn" onClick={() => setEdit(true)}><Icon name="edit" size={17} /> עריכה</button>}
          {canWrite && <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setArchive(!archived)}>{archived ? 'החזרה מהארכיון' : 'העברה לארכיון'}</button>}
          {canWrite && (all.length === 0
            ? <button type="button" className="fin-btn fin-btn--danger" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={17} /> מחיקה</button>
            : <button type="button" className="fin-btn fin-btn--danger" disabled title={`יש ${all.length} מסמכים: אפשר להעביר לארכיון`}><Icon name="trash" size={17} /> מחיקה</button>)}
        </div>
      </header>
      {msg && <p className="fin-note" role="status">{msg}</p>}

      <div className="fin-filters">
        <div className="fin-seg" role="tablist" aria-label="תקופה">
          {Object.entries(PERIODS).map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={per === k} className={per === k ? 'is-on' : ''} onClick={() => setPer(k)}>{v}</button>)}
        </div>
      </div>

      <section className="fin-ledger" aria-label="סיכום כספי">
        <div className="fin-ledger__main"><span>סה״כ הוצאות</span><strong>{money(s.total)}</strong><small>{s.booked} מסמכים בספרים, {PERIODS[per]}</small></div>
        <div><span>לפני מע״מ</span><strong>{money(s.net)}</strong></div>
        <div><span>מע״מ</span><strong>{money(s.vat)}</strong><small>לקיזוז {money(s.claimable)}</small></div>
        <div className={pending.length ? 'is-attn' : ''}><span>ממתינים לאישור</span><strong>{pending.length}</strong></div>
        {budget ? <div><span>תקציב מול ביצוע</span><strong>{Math.round((allTotal / budget) * 100)}%</strong><span className="fin-budget fin-budget--wide"><span className={allTotal > budget ? 'is-over' : ''} style={{ width: `${Math.min(100, (allTotal / budget) * 100)}%` }} /></span><small>{money(allTotal)} מתוך {money(budget)}</small></div>
          : <div><span>תנועה ראשונה / אחרונה</span><strong className="fin-ledger__dates">{date(s.first)}<br />{date(s.last)}</strong></div>}
      </section>

      <div className="fin-overview">
        <section className="fin-panel-block fin-overview__trend"><h3>הוצאות לפי חודש</h3><Trend items={all} /></section>
        {kind !== 'categories' && <Breakdown title="לפי קטגוריה" rows={byCat} onPick={(cid) => go(`/categories/${cid}`)} />}
        {kind !== 'suppliers' && <Breakdown title={kind === 'projects' ? 'ספקי הפרויקט' : 'ספקים'} rows={bySup} onPick={(sid) => go(`/suppliers/${sid}`)} />}
        {(kind === 'businesses' || kind === 'suppliers' || kind === 'categories') && <Breakdown title="לפי פרויקט" rows={byProj} onPick={(pid) => go(`/projects/${pid}`)} />}
        {(kind === 'suppliers' || kind === 'categories') && <Breakdown title="לפי חברה" rows={byBiz} onPick={(bid) => go(`/companies/${bid}`)} />}
      </div>

      <div className="fin-overview fin-overview--wide">
        <section className="fin-panel-block">
          <div className="fin-block-head">
            <h3>מסמכים ({items.length})</h3>
            {items.length > 0 && <button type="button" className="fin-btn fin-btn--sm" onClick={() => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids: items.map(({ doc }) => doc.id), title: `מסמכים · ${row?.name || ''}` })) } catch { /* noop */ } go('/documents?ids=1') }}><Icon name="list" size={15} /> {items.length > 30 ? `כל ${items.length} המסמכים` : 'פתיחה ברשימה'}</button>}
          </div>
          {!items.length ? <p className="fin-muted">אין מסמכים בתקופה הזו.</p> : (
            <DocList
              docs={[...items].sort((a, b) => String(docDate(b.doc)).localeCompare(String(docDate(a.doc)))).slice(0, 30).map(({ doc, share }) => ({ doc, amount: share < 1 ? signedTotal(doc) * share : undefined, note: share < 1 ? `${Math.round(share * 100)}% מהחשבונית` : '' }))}
              onOpen={(d) => go(`/documents/${d.id}`)} businesses={businesses} showCompany={kind !== 'businesses'} flags={false}
            />
          )}
        </section>
        <section className="fin-panel-block">
          <h3>פרטים</h3>
          <dl className="fin-facts">{facts.map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{show(f)}</dd></div>)}</dl>
          {row.notes && <p className="fin-muted">{row.notes}</p>}
          {kind === 'suppliers' && row.suggested_from && <p className="fin-muted fin-small">זוהה אוטומטית מ<button type="button" className="fin-link" onClick={() => go(`/documents/${row.suggested_from}`)}>חשבונית</button>{row.match_confidence ? `, ודאות ${Math.round(row.match_confidence * 100)}%` : ''}</p>}
          <h3 className="fin-mt">היסטוריית שינויים</h3>
          {(history.data || []).length ? <ul className="fin-mini-log">{history.data.map((a) => <li key={a.id}><span>{({ created: 'נוצר', updated: 'עודכן', archived: 'הועבר לארכיון', merged: 'אוחד', deleted: 'נמחק' })[a.action] || a.action}</span><small>{a.user_email === 'agent' || !a.user_email ? 'סוכן AI' : a.user_email}, {new Date(a.at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</small></li>)}</ul> : <p className="fin-muted">אין שינויים רשומים.</p>}
        </section>
      </div>

      {edit && <EntityForm kind={kind} initial={row} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); setMsg('השינויים נשמרו'); reload() }} />}
      {merge && <MergeDialog supplier={row} onClose={() => setMerge(false)} onDone={(into) => { setMerge(false); reload(); go(`/suppliers/${into}`) }} />}
      {confirmDelete && (
        <Modal title={`מחיקת ${row.name}`} onClose={() => setConfirmDelete(false)} footer={<><button type="button" className="fin-btn fin-btn--danger" onClick={remove}>מחיקה לצמיתות</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setConfirmDelete(false)}>ביטול</button></>}>
          <p>אין מסמכים שמשויכים ל{def.one} הזה, ולכן אפשר למחוק אותו. המחיקה נרשמת ביומן ואי אפשר לבטל אותה.</p>
        </Modal>
      )}
    </div>
  )
}
