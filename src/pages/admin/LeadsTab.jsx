import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { listLeads, updateLead, deleteLead, createLead, reorderRows } from '../../lib/cms.js'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, rectIntersection } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* Custom sensor: skip interactive elements so select/button/input still work */
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'LABEL', 'SELECT', 'TEXTAREA'])
function targetIsInteractive(el) {
  while (el) {
    if (INTERACTIVE_TAGS.has(el.tagName) || el.contentEditable === 'true') return true
    el = el.parentElement
  }
  return false
}
class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (!event.isPrimary || event.button !== 0) return false
        if (targetIsInteractive(event.target)) return false
        onActivation?.({ event })
        return true
      },
    },
  ]
}

/* ── SVG Icon components ── */
const IcPhone    = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
const IcMail     = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
const IcWA       = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
const IcEdit     = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
const IcTrash    = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IcDownload = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IcExternal = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
const IcGrip     = (p) => <svg viewBox="0 0 8 12" fill="currentColor" {...p}><circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/><circle cx="2" cy="6" r="1.3"/><circle cx="6" cy="6" r="1.3"/><circle cx="2" cy="10" r="1.3"/><circle cx="6" cy="10" r="1.3"/></svg>
const IcPlus     = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcPin      = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
const IcBuilding = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10M8 7h.01M12 7h.01M16 7h.01M8 11h.01M16 11h.01"/></svg>

const STAGES = [
  { id: 'new',         label: 'ליד חדש',       color: '#3a7bd5', emoji: '🆕' },
  { id: 'contacted',   label: 'נוצר קשר',       color: '#e0a106', emoji: '📞' },
  { id: 'meeting',     label: 'פגישה',           color: '#16688c', emoji: '🤝' },
  { id: 'negotiation', label: 'משא ומתן',        color: '#8c6d1f', emoji: '💼' },
  { id: 'won',         label: 'נסגר בהצלחה',    color: '#2e9e6b', emoji: '✅' },
  { id: 'lost',        label: 'לא רלוונטי',     color: '#d64545', emoji: '❌' },
]
const stageOf    = (id) => STAGES.find((s) => s.id === id) || STAGES[0]
const FUNNEL     = ['new', 'contacted', 'meeting', 'negotiation', 'won']
const SOURCE_LABEL = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }
const SOURCE_COLOR = { project: '#105572', home: '#2e9e6b', contact: '#8c6d1f', manual: '#666' }
const SITE       = 'https://www.kurkoos-group.co.il'

/* מחלץ שם פרויקט — תומך במחרוזת, {he,en,slug}, JSON-string, ריק */
const parseProject = (p) => {
  if (!p) return null
  if (typeof p === 'object') return p
  if (typeof p === 'string') {
    if (p === '[object Object]') return null
    try { const o = JSON.parse(p); if (o && typeof o === 'object') return o } catch { /* plain string */ }
    return { he: p }
  }
  return null
}
const extractProject = (p) => { const o = parseProject(p); return o ? (o.he || o.en || '') : '' }
const projectUrl = (p) => { const o = parseProject(p); return o?.slug ? `${SITE}/projects/${o.slug}` : '' }

const VIEW_ICONS = {
  board: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  list:  (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  table: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14.5h18M9 9v11M15 9v11"/></svg>,
}
const VIEWS = [{ id: 'board', label: 'קוביות' }, { id: 'list', label: 'רשימה' }, { id: 'table', label: 'טבלה' }]

function fmtDate(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Jerusalem' }) }
  catch { return '' }
}
function fmtTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }) }
  catch { return '' }
}
const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d }
const isAfter  = (iso, date) => { try { return new Date(iso) >= date } catch { return false } }

/* וואטסאפ — ממיר מספר ישראלי לפורמט בינלאומי */
const waLink = (phone) => {
  const d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  const intl = d.startsWith('972') ? d : '972' + d.replace(/^0/, '')
  return `https://wa.me/${intl}`
}

/* ראשי תיבות לאווטאר */
const initials = (name) => {
  const w = (name || '?').trim().split(/\s+/)
  return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : (w[0][0] || '?')).toUpperCase()
}

/* ייצוא CSV */
function exportCsv(leads) {
  const cols = [
    ['name','שם'],['phone','טלפון'],['email','אימייל'],['project','פרויקט'],
    ['source','מקור'],['status','שלב'],['contacted','נוצר קשר'],['message','הודעה'],
    ['notes','הערות'],['created_at','תאריך'],
  ]
  const esc = (v) => `"${String(v??'').replace(/"/g,'""')}"`
  const head = cols.map((c) => esc(c[1])).join(',')
  const rows = leads.map((l) => cols.map(([k]) => {
    if (k === 'status')     return esc(stageOf(l.status).label)
    if (k === 'contacted')  return esc(l.contacted ? 'כן' : 'לא')
    if (k === 'source')     return esc(SOURCE_LABEL[l.source] || l.source || '')
    if (k === 'created_at') return esc(fmtDate(l.created_at))
    if (k === 'project')    return esc(extractProject(l.project))
    return esc(l[k])
  }).join(','))
  const csv = '﻿' + [head,...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `leads-${fmtDate(new Date().toISOString())}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

const blankLead = () => ({ name:'', phone:'', email:'', project:'', message:'', notes:'', status:'new', source:'manual', contacted:false })

export default function LeadsTab() {
  const [leads,    setLeads]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')
  const [query,    setQuery]    = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [view,     setView]     = useState('board')
  const [editing,  setEditing]  = useState(null)
  const [dragId,   setDragId]   = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const load = () => {
    setLoading(true)
    listLeads()
      .then((d) => { setLeads(d); setErr('') })
      .catch((e) => {
        const m = e.message || 'שגיאה בטעינת לידים'
        setErr(/schema cache|find the table|does not exist|relation .* does not/i.test(m) ? 'TABLE_MISSING' : m)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    let list = leads
    if (stageFilter !== 'all')  list = list.filter((l) => (l.status || 'new') === stageFilter)
    if (sourceFilter !== 'all') list = list.filter((l) => (l.source || '') === sourceFilter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((l) => [l.name, l.phone, l.email, extractProject(l.project), l.message, l.notes]
      .some((v) => String(v||'').toLowerCase().includes(q)))
    return list
  }, [leads, query, stageFilter, sourceFilter])

  const byStage    = (sid) => filtered.filter((l) => (l.status || 'new') === sid)
  const patchLocal = (id, patch) => setLeads((ls) => ls.map((l) => (String(l.id) === String(id) ? {...l,...patch} : l)))

  const moveTo = async (id, status) => {
    const lead = leads.find((l) => String(l.id) === String(id))
    if (!lead || lead.status === status) return
    patchLocal(id, { status })
    try { await updateLead(id, { status }) } catch (e) { setErr(e.message); load() }
  }
  const toggleContacted = async (lead) => {
    const v = !lead.contacted
    patchLocal(lead.id, { contacted: v })
    try { await updateLead(lead.id, { contacted: v }) } catch (e) { setErr(e.message); load() }
  }
  const remove = async (lead) => {
    if (!confirm(`למחוק את הליד "${lead.name || 'ללא שם'}"?`)) return
    setLeads((ls) => ls.filter((l) => l.id !== lead.id))
    try { await deleteLead(lead.id) } catch (e) { setErr(e.message); load() }
  }
  const save = async (data) => {
    try {
      if (data.id) { await updateLead(data.id, data); patchLocal(data.id, data) }
      else { await createLead({...data, source:'manual'}); load() }
      setEditing(null)
    } catch (e) { setErr(e.message) }
  }
  const autoSave  = async (data) => { if (!data.id) return; patchLocal(data.id, data); await updateLead(data.id, data) }
  const createNow = async (data) => { const c = await createLead({...data, source:data.source||'manual'}); setLeads((ls) => [c,...ls]); return c }

  const reorder = async (sourceId, targetId) => {
    if (sourceId === targetId) return
    const ids = leads.map((l) => l.id)
    const from = ids.indexOf(sourceId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...leads]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved)
    setLeads(next.map((l,i) => ({...l, sort_order: i})))
    try { await reorderRows('leads', next.map((l) => l.id)) } catch (e) { setErr(e.message); load() }
  }

  if (loading) return <div className="adm-leads__msg"><span className="adm-spin"/> טוען לידים…</div>
  const tableMissing = err === 'TABLE_MISSING'
  const sourcesInData = [...new Set(leads.map((l) => l.source).filter(Boolean))]

  return (
    <div className="adm-leads" dir="rtl">

      {/* ===== סרגל עליון ===== */}
      <div className="adm-leads__bar adm-leads__bar--top">
        <div className="adm-leads__bar-group">
          <span className="adm-leads__count"><b>{filtered.length}</b> לידים</span>
          <div className="adm-leads__views" role="tablist">
            {VIEWS.map((v) => { const I = VIEW_ICONS[v.id]; return (
              <button key={v.id} type="button" role="tab" aria-selected={view===v.id}
                className={`adm-leads__view ${view===v.id?'is-active':''}`} onClick={() => setView(v.id)}>
                <I width={15} height={15}/><span>{v.label}</span>
              </button>
            )})}
          </div>
        </div>
        <div className="adm-leads__bar-group">
          <input className="adm-leads__search" placeholder="חיפוש…" value={query} onChange={(e) => setQuery(e.target.value)}/>
          <button type="button" className="adm-leads__btn" onClick={() => exportCsv(filtered)}><IcDownload width={14} height={14}/> ייצוא</button>
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={() => setEditing(blankLead())}><IcPlus width={14} height={14}/> ליד חדש</button>
        </div>
      </div>

      {/* ===== פילטרים ===== */}
      <div className="adm-leads__filters">
        <div className="adm-leads__filter-row">
          <span className="adm-leads__filter-lbl">שלב:</span>
          <button type="button" className={`adm-filter-pill ${stageFilter==='all'?'is-active':''}`} onClick={() => setStageFilter('all')}>הכל ({leads.length})</button>
          {STAGES.map((s) => {
            const n = leads.filter((l) => (l.status||'new') === s.id).length
            return (
              <button key={s.id} type="button"
                className={`adm-filter-pill ${stageFilter===s.id?'is-active':''}`}
                style={stageFilter===s.id ? {background: s.color, color:'#fff', borderColor: s.color} : {}}
                onClick={() => setStageFilter((cur) => cur===s.id?'all':s.id)}>
                <span className="adm-filter-dot" style={{ background: stageFilter===s.id ? 'rgba(255,255,255,0.7)' : s.color }}/>
                {s.label} ({n})
              </button>
            )
          })}
        </div>
        {sourcesInData.length > 1 && (
          <div className="adm-leads__filter-row">
            <span className="adm-leads__filter-lbl">מקור:</span>
            <button type="button" className={`adm-filter-pill ${sourceFilter==='all'?'is-active':''}`} onClick={() => setSourceFilter('all')}>הכל</button>
            {sourcesInData.map((src) => (
              <button key={src} type="button"
                className={`adm-filter-pill ${sourceFilter===src?'is-active':''}`}
                style={sourceFilter===src ? {background: SOURCE_COLOR[src]||'#555', color:'#fff', borderColor:'transparent'} : {}}
                onClick={() => setSourceFilter((c) => c===src?'all':src)}>
                {SOURCE_LABEL[src]||src}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== דשבורד ===== */}
      {!tableMissing && <Dashboard leads={leads}/>}

      {tableMissing && (
        <div className="adm-leads__setup">
          <strong>טבלת הלידים עדיין לא נוצרה ב-Supabase.</strong>
          <span>היכנסו ל-Supabase → SQL Editor → הריצו את סקריפט ה-SQL שסופק, ואז רעננו. לאחר מכן הלידים יופיעו כאן אוטומטית.</span>
        </div>
      )}
      {err && !tableMissing && <div className="adm-leads__err">{err}</div>}
      {!leads.length && !err && (
        <div className="adm-leads__empty">אין עדיין לידים. פניות מטפסי האתר יופיעו כאן אוטומטית, או הוסיפו ליד ידנית.</div>
      )}

      {/* ===== תצוגות ===== */}
      {!tableMissing && leads.length > 0 && (
        <>
          {view==='board' && <BoardView byStage={byStage} leads={filtered} moveTo={moveTo} toggleContacted={toggleContacted} remove={remove} setEditing={setEditing}/>}
          {view==='list'  && <ListView  {...{leads:filtered, dragId, setDragId, dragOver, setDragOver, reorder, moveTo, toggleContacted, remove, setEditing}}/>}
          {view==='table' && <TableView {...{leads:filtered, moveTo, toggleContacted, remove, setEditing}}/>}
        </>
      )}

      {editing && <LeadEditor lead={editing} onClose={() => setEditing(null)} onAutoSave={autoSave} onCreate={createNow}/>}
    </div>
  )
}

/* ============================ דשבורד ============================ */
function Dashboard({ leads }) {
  const stats = useMemo(() => {
    const today = daysAgo(0), w = daysAgo(7), m = daysAgo(30)
    const count = (d) => leads.filter((l) => isAfter(l.created_at, d)).length
    const total = leads.length
    const won   = leads.filter((l) => l.status==='won').length
    const contacted = leads.filter((l) => l.contacted).length
    const open  = leads.filter((l) => l.status!=='won'&&l.status!=='lost').length
    const conv  = total ? Math.round((won/total)*100) : 0
    const funnel = FUNNEL.map((id) => ({...stageOf(id), n: leads.filter((l) => (l.status||'new')===id).length}))
    const maxF  = Math.max(1,...funnel.map((f) => f.n))
    return { today:count(today), week:count(w), month:count(m), total, won, contacted, open, conv, funnel, maxF }
  }, [leads])

  return (
    <div className="adm-dash">
      <div className="adm-dash__cards">
        {[
          { label:'היום',       value:stats.today,       hint:'לידים חדשים' },
          { label:'השבוע',      value:stats.week,        hint:'7 ימים אחרונים' },
          { label:'30 יום',     value:stats.month,       hint:'חודש אחרון' },
          { label:'סה"כ לידים', value:stats.total,       hint:`${stats.open} פתוחים` },
          { label:'נוצר קשר',   value:stats.contacted,   hint:`מתוך ${stats.total}` },
          { label:'אחוז סגירה', value:`${stats.conv}%`,  hint:`${stats.won} נסגרו` },
        ].map((c) => (
          <div key={c.label} className="adm-dash__card">
            <span className="adm-dash__val">{c.value}</span>
            <span className="adm-dash__lbl">{c.label}</span>
            <span className="adm-dash__hint">{c.hint}</span>
          </div>
        ))}
      </div>
      <div className="adm-dash__funnel">
        <h4 className="adm-dash__funnel-title">משפך לידים</h4>
        {stats.funnel.map((f) => (
          <div key={f.id} className="adm-funnel__row">
            <span className="adm-funnel__label">{f.label}</span>
            <div className="adm-funnel__track">
              <div className="adm-funnel__bar" style={{ width:`${(f.n/stats.maxF)*100}%`, background:f.color }}>
                <span>{f.n}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================ קארד ליד (board + list) ============================ */
function LeadCard({ lead, onStage, onContacted, onRemove, onEdit, showGrip }) {
  const st     = stageOf(lead.status)
  const proj   = extractProject(lead.project)
  const digits = String(lead.phone||'').replace(/\D/g,'')
  const wa     = waLink(lead.phone)

  const sourceTxt = lead.source === 'project' && proj ? proj
    : lead.source === 'home'    ? 'דף הבית'
    : lead.source === 'contact' ? 'טופס קשר'
    : null

  return (
    <article className="adm-lead" style={{ '--stage-c': st.color }}>
      {showGrip && (
        <div className="adm-lead__grip" aria-hidden="true">
          <IcGrip width={10} height={12} style={{ pointerEvents: 'none' }}/>
        </div>
      )}
      <div className="adm-lead__body">
        <div className="adm-lead__top">
          <div className="adm-lead__avatar">{initials(lead.name)}</div>
          <div className="adm-lead__meta">
            <button type="button" className="adm-lead__name" onClick={() => onEdit(lead)}>
              {lead.name || 'ללא שם'}
            </button>
            {sourceTxt && (
              <span className="adm-lead__sub">
                {lead.source === 'project' ? <IcPin width={9} height={9}/> : null}
                {sourceTxt}
              </span>
            )}
          </div>
          <span className="adm-lead__date" title={fmtTime(lead.created_at)}>{fmtDate(lead.created_at)}</span>
        </div>

        {lead.message && <p className="adm-lead__msg">{lead.message}</p>}

        <div className="adm-lead__foot">
          {lead.phone && <a href={`tel:${digits}`} draggable="false" className="adm-ic-btn" title={lead.phone}><IcPhone width={12} height={12}/></a>}
          {wa && <a href={wa} draggable="false" target="_blank" rel="noopener noreferrer" className="adm-ic-btn adm-ic-btn--wa" title="וואטסאפ"><IcWA width={13} height={13}/></a>}
          {lead.email && <a href={`mailto:${lead.email}`} draggable="false" className="adm-ic-btn" title={lead.email}><IcMail width={12} height={12}/></a>}
          <label className="adm-lead__contacted" title="סמן שנוצר קשר">
            <input type="checkbox" checked={!!lead.contacted} onChange={() => onContacted(lead)}/>
            <span>קשר</span>
          </label>
          <select className="adm-lead__stage-sel" value={lead.status||'new'} onChange={(e) => onStage(lead.id, e.target.value)}
            style={{ borderColor: st.color }}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button type="button" className="adm-ic-btn" onClick={() => onEdit(lead)} title="עריכה"><IcEdit width={12} height={12}/></button>
          <button type="button" className="adm-ic-btn adm-ic-btn--del" onClick={() => onRemove(lead)} title="מחיקה"><IcTrash width={12} height={12}/></button>
        </div>
      </div>
    </article>
  )
}

/* ============================ dnd-kit helpers ============================ */
function SortableCard({ lead, ...props }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({ id: String(lead.id) })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{
        opacity: isDragging ? 0 : 1,
        outline: 'none',
        touchAction: 'none',
        transform: CSS.Transform.toString(transform),
        transition,
      }}>
      <LeadCard lead={lead} {...props} showGrip />
    </div>
  )
}

function DroppableColumn({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`adm-stage__list${isOver ? ' adm-stage__list--over' : ''}`}>
      {children}
    </div>
  )
}

/* ============================ תצוגת קוביות ============================ */
const STAGE_IDS = STAGES.map((s) => s.id)

function BoardView({ byStage, leads, moveTo, toggleContacted, remove, setEditing }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(useSensor(SmartPointerSensor, { activationConstraint: { distance: 8 } }))
  const activeLead = leads.find((l) => String(l.id) === activeId) || null

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const draggedId = String(active.id)
    const overId    = String(over.id)
    let targetStage
    if (STAGE_IDS.includes(overId)) {
      targetStage = overId
    } else {
      const overLead = leads.find((l) => String(l.id) === overId)
      targetStage = overLead?.status || null
    }
    if (targetStage) moveTo(draggedId, targetStage)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}>
      <div className="adm-leads__board">
        {STAGES.map((stage) => {
          const items    = byStage(stage.id)
          const itemIds  = items.map((l) => String(l.id))
          return (
            <section key={stage.id} className="adm-stage">
              <header className="adm-stage__head" style={{ '--stage': stage.color }}>
                <span className="adm-stage__dot"/>
                <h3>{stage.label}</h3>
                <span className="adm-stage__count">{items.length}</span>
              </header>
              <DroppableColumn id={stage.id}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  {items.map((lead) => (
                    <SortableCard key={lead.id} lead={lead}
                      onStage={moveTo} onContacted={toggleContacted} onRemove={remove} onEdit={setEditing}/>
                  ))}
                  {!items.length && <div className="adm-stage__empty">גרור לכאן ליד</div>}
                </SortableContext>
              </DroppableColumn>
            </section>
          )
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead && (
          <div style={{ pointerEvents: 'none', cursor: 'grabbing', transform: 'rotate(2deg)', boxShadow: '0 16px 40px rgba(0,0,0,0.2)', borderRadius: 14 }}>
            <LeadCard lead={activeLead} onStage={() => {}} onContacted={() => {}} onRemove={() => {}} onEdit={() => {}} showGrip/>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

/* ============================ תצוגת רשימה ============================ */
function ListView({ leads, dragId, setDragId, dragOver, setDragOver, reorder, moveTo, toggleContacted, remove, setEditing }) {
  return (
    <div className="adm-list">
      {leads.map((lead) => {
        const st = stageOf(lead.status)
        const proj = extractProject(lead.project)
        const wa   = waLink(lead.phone)
        return (
          <div key={lead.id}
            className={`adm-list__row ${dragId===lead.id?'is-dragging':''} ${dragOver===lead.id?'is-over':''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(lead.id) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) reorder(id, lead.id); setDragId(null); setDragOver(null) }}>

            <span className="adm-list__grip" title="גרור לשינוי סדר" draggable="true"
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(lead.id)); e.dataTransfer.effectAllowed = 'move'; setDragId(lead.id) }}
              onDragEnd={() => { setDragId(null); setDragOver(null) }}><IcGrip width={10} height={12} style={{ pointerEvents: 'none' }}/></span>

            <span className="adm-list__stage-pill" style={{ background: st.color }} title={st.label}/>

            <button type="button" className="adm-list__name" onClick={() => setEditing(lead)}>{lead.name||'ללא שם'}</button>

            <div className="adm-list__contacts">
              {lead.phone && <a href={`tel:${lead.phone}`} dir="ltr" title="התקשר"><IcPhone width={12} height={12}/> {lead.phone}</a>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="וואטסאפ"><IcWA width={13} height={13}/></a>}
              {lead.email && <a href={`mailto:${lead.email}`} dir="ltr" className="adm-list__email" title={lead.email}><IcMail width={12} height={12}/> {lead.email}</a>}
            </div>

            <span className="adm-list__project">{proj||'—'}</span>

            <label className="adm-list__contacted" title="נוצר קשר">
              <input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)}/>
            </label>

            <select className="adm-list__stage-sel" value={lead.status||'new'} onChange={(e) => moveTo(lead.id, e.target.value)}
              style={{ borderColor: st.color }}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <span className="adm-lead__source-badge" style={{ background: SOURCE_COLOR[lead.source]||'#888' }}>
              {SOURCE_LABEL[lead.source]||lead.source||'—'}
            </span>

            <span className="adm-list__date">{fmtDate(lead.created_at)}</span>

            <div className="adm-list__acts">
              <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה"><IcEdit width={13} height={13}/></button>
              <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה"><IcTrash width={13} height={13}/></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================ תצוגת טבלה ============================ */
function TableView({ leads, moveTo, toggleContacted, remove, setEditing }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>שם</th><th>טלפון</th><th>אימייל</th><th>פרויקט</th>
            <th>שלב</th><th>קשר</th><th>מקור</th><th>תאריך</th><th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const st   = stageOf(lead.status)
            const proj = extractProject(lead.project)
            const wa   = waLink(lead.phone)
            return (
              <tr key={lead.id}>
                <td><button type="button" className="adm-table__name" onClick={() => setEditing(lead)}>{lead.name||'ללא שם'}</button></td>
                <td dir="ltr">
                  {lead.phone
                    ? <span className="adm-table__contact-cell">
                        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="וואטסאפ" className="adm-table__wa"><IcWA width={15} height={15}/></a>}
                      </span>
                    : '—'}
                </td>
                <td dir="ltr">{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : '—'}</td>
                <td>{proj||'—'}</td>
                <td>
                  <select className="adm-lead__stage-sel" value={lead.status||'new'} onChange={(e) => moveTo(lead.id, e.target.value)}
                    style={{ borderColor: st.color }}>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </td>
                <td style={{ textAlign:'center' }}>
                  <input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)}/>
                </td>
                <td>
                  <span className="adm-lead__source-badge" style={{ background: SOURCE_COLOR[lead.source]||'#888' }}>
                    {SOURCE_LABEL[lead.source]||lead.source||'—'}
                  </span>
                </td>
                <td>{fmtDate(lead.created_at)}</td>
                <td>
                  <div className="adm-list__acts">
                    <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה"><IcEdit width={13} height={13}/></button>
                    <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה"><IcTrash width={13} height={13}/></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ============================ פאנל עריכה (מאנדיי-סגנון) ============================ */
function LeadEditor({ lead, onClose, onAutoSave, onCreate }) {
  const [f,      setF]      = useState(lead)
  const [status, setStatus] = useState('saved')
  const timer = useRef()
  const fRef  = useRef(f)
  fRef.current = f

  const persist = useCallback(async () => {
    const data = fRef.current
    const hasContent = (data.name||'').trim()||(data.phone||'').trim()||(data.email||'').trim()
    setStatus('saving')
    try {
      if (!data.id) {
        if (!hasContent) { setStatus('saved'); return }
        const created = await onCreate(data)
        setF((p) => ({...p, id:created.id, created_at:created.created_at}))
      } else { await onAutoSave(data) }
      setStatus('saved')
    } catch (e) { console.error(e); setStatus('error') }
  }, [onAutoSave, onCreate])

  const schedule = useCallback(() => { setStatus('dirty'); clearTimeout(timer.current); timer.current = setTimeout(persist, 700) }, [persist])
  const set = (k) => (e) => { const val = e.target.type==='checkbox'?e.target.checked:e.target.value; setF((p) => ({...p,[k]:val})); schedule() }
  const close = async () => { clearTimeout(timer.current); if (status!=='saved'&&status!=='saving') await persist(); onClose() }
  useEffect(() => () => clearTimeout(timer.current), [])

  const st     = stageOf(f.status)
  const proj   = extractProject(f.project)
  const pUrl   = projectUrl(f.project)
  const digits = String(f.phone||'').replace(/\D/g,'')
  const wa     = waLink(f.phone)
  const STATUS_TXT = { saved: 'נשמר', dirty: 'לא שמור', saving: 'שומר…', error: 'שגיאת שמירה' }

  return (
    <div className="adm-leads__modal" onClick={close}>
      <div className="adm-leads__panel" dir="rtl" onClick={(e) => e.stopPropagation()}>

        {/* ===== כותרת פאנל ===== */}
        <header className="adm-leads__panel-head" style={{ '--stage': st.color }}>
          <span className="adm-leads__panel-dot"/>
          <div className="adm-leads__panel-titles">
            <input className="adm-leads__panel-name" placeholder="שם הליד" value={f.name||''} onChange={set('name')}/>
            <span className={`adm-leads__panel-status adm-leads__panel-status--${status}`}>{STATUS_TXT[status]}</span>
          </div>
          <button type="button" className="adm-leads__panel-close" onClick={close} aria-label="סגירה">✕</button>
        </header>

        {/* ===== פייפליין שלבים ===== */}
        <div className="adm-pipeline">
          {STAGES.map((s) => (
            <button key={s.id} type="button"
              className={`adm-pipeline__step ${f.status===s.id?'is-active':''}`}
              style={{ '--c': s.color }}
              onClick={() => { setF((p) => ({...p, status:s.id})); schedule() }}
              title={s.label}>
              <span className="adm-pipeline__dot"/>
              <span className="adm-pipeline__lbl">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="adm-leads__panel-body">

          {/* ===== כפתורי יצירת קשר ===== */}
          {(f.phone||f.email) && (
            <div className="adm-panel__quick">
              {f.phone && <a href={`tel:${digits}`} className="adm-quick-btn adm-quick-btn--call"><IcPhone width={14} height={14}/> {f.phone}</a>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-quick-btn adm-quick-btn--wa"><IcWA width={15} height={15}/> וואטסאפ</a>}
              {f.email && <a href={`mailto:${f.email}`} className="adm-quick-btn adm-quick-btn--mail"><IcMail width={14} height={14}/> {f.email}</a>}
              {pUrl && <a href={pUrl} target="_blank" rel="noopener noreferrer" className="adm-quick-btn adm-quick-btn--proj"><IcBuilding width={14} height={14}/> עמוד הפרויקט</a>}
            </div>
          )}

          {/* ===== שדות ===== */}
          <div className="adm-leads__grid">
            <label>טלפון<input dir="ltr" value={f.phone||''} onChange={set('phone')}/></label>
            <label>אימייל<input dir="ltr" value={f.email||''} onChange={set('email')}/></label>
            <label>פרויקט<input value={proj} onChange={(e) => { setF((p) => ({...p, project:e.target.value})); schedule() }}/></label>
            <label>מקור
              <select value={f.source||'manual'} onChange={set('source')}>
                {Object.entries(SOURCE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="adm-leads__chk"><input type="checkbox" checked={!!f.contacted} onChange={set('contacted')}/> נוצר קשר</label>
            {f.created_at && <label>תאריך פנייה<span className="adm-leads__static">{fmtDate(f.created_at)} {fmtTime(f.created_at)}</span></label>}
          </div>

          <label className="adm-leads__field-wide">הודעת הפונה<textarea rows={3} value={f.message||''} onChange={set('message')}/></label>
          <label className="adm-leads__field-wide">הערות פנימיות (לא נשלח ללקוח)<textarea rows={3} value={f.notes||''} onChange={set('notes')}/></label>
        </div>

        <footer className="adm-leads__panel-foot">
          <span className="adm-leads__panel-hint">השינויים נשמרים אוטומטית</span>
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={close}>סיום</button>
        </footer>
      </div>
    </div>
  )
}
