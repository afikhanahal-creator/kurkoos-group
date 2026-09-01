import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { listLeads, updateLead, deleteLead, createLead, reorderRows } from '../../lib/cms.js'
import { toast } from '../../lib/toast.js'
import './LeadsTab.css'

/* ============================================================
   LeadsTab — CRM ניהול לידים (בהשראת Monday + HubSpot).
   • דשבורד: משפך המרה + נתוני זמן (היום / השבוע / 30 יום / סה"כ)
   • 3 תצוגות: קוביות (Kanban), רשימה, טבלה — כולן עם Drag & Drop
   • כרטיס ליד "חכם": אווטאר, זמן כניסה, אינדיקציית ליד חם/ממתין, מקור,
     ופעולות מהירות בלחיצה אחת (חיוג / וואטסאפ / מייל).
   • פאנל ליד מלא — כל הפרטים במבט אחד + פעולות מהירות + שמירה אוטומטית.
   • ייצוא לאקסל, חיפוש, סינון לפי שלב, מיון.
   ============================================================ */

const STAGES = [
  { id: 'new', label: 'ליד חדש', color: '#3a7bd5' },
  { id: 'contacted', label: 'נוצר קשר', color: '#e0a106' },
  { id: 'meeting', label: 'פגישה', color: '#16688c' },
  { id: 'negotiation', label: 'משא ומתן', color: '#8c6d1f' },
  { id: 'won', label: 'נסגר בהצלחה', color: '#2e9e6b' },
  { id: 'lost', label: 'לא רלוונטי', color: '#d64545' },
]
const stageOf = (id) => STAGES.find((s) => s.id === id) || STAGES[0]
const FUNNEL = ['new', 'contacted', 'meeting', 'negotiation', 'won']

const SOURCE_META = {
  project: { label: 'עמוד פרויקט', icon: 'building' },
  home: { label: 'דף הבית', icon: 'home' },
  contact: { label: 'צור קשר', icon: 'mail' },
  manual: { label: 'ידני', icon: 'user' },
}
const sourceMeta = (s) => SOURCE_META[s] || { label: s || 'לא ידוע', icon: 'user' }

/* ---------- אייקונים (inline) ---------- */
const Ico = {
  phone: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  whatsapp: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.02a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 0 1 2.76 6.67c-.01 5.19-4.24 9.42-9.43 9.42zM20.52 3.45A11.34 11.34 0 0 0 12.05.94C5.8.94.7 6.03.7 12.29c0 2 .52 3.95 1.52 5.67L.6 23.5l5.68-1.49a11.32 11.32 0 0 0 5.77 1.47h.01c6.25 0 11.34-5.09 11.35-11.35a11.28 11.28 0 0 0-3.32-8.03z" /></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  copy: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  building: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" /></svg>,
  home: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>,
  user: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  clock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  flame: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2s4 3.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.6-2.4C7 8.5 6 10 6 12.5A6 6 0 0 0 18 13c0-5-6-11-6-11z" /></svg>,
  edit: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>,
  trash: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>,
}

/* ---------- עזרים ---------- */
const projText = (p) => (p && typeof p === 'object' ? (p.he || p.en || '') : (p || ''))
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
}
const AV_COLORS = ['#3a7bd5', '#16688c', '#2e9e6b', '#8c6d1f', '#a0522d', '#7048b6', '#c2410c', '#0e7490', '#be185d']
function avatarColor(s) {
  const str = String(s || '?')
  let sum = 0
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i)
  return AV_COLORS[sum % AV_COLORS.length]
}
function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0')) d = '972' + d.slice(1)
  else if (!d.startsWith('972') && d.length <= 10) d = '972' + d
  return `https://wa.me/${d}`
}
function fmtDate(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
  catch { return '' }
}
function fmtDateTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}
function ageInfo(iso) {
  if (!iso) return { label: '', hours: Infinity, days: Infinity, mins: Infinity }
  const then = new Date(iso).getTime()
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000))
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  let label
  if (mins < 1) label = 'עכשיו'
  else if (mins < 60) label = `לפני ${mins} דק׳`
  else if (hours < 24) label = `לפני ${hours} שע׳`
  else if (days === 1) label = 'אתמול'
  else if (days < 7) label = `לפני ${days} ימים`
  else if (days < 30) label = `לפני ${Math.floor(days / 7)} שבועות`
  else label = fmtDate(iso)
  return { label, hours, days, mins }
}
const isOpen = (l) => l.status !== 'won' && l.status !== 'lost'
const leadFlag = (l, age) => {
  if (!isOpen(l) || l.contacted) return null
  if (age.hours < 24) return 'hot'      // ליד טרי שלא טופל — לתפוס מהר
  if (age.days >= 3) return 'wait'      // ממתין יותר מ-3 ימים ללא מענה
  return null
}
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d }
const isAfter = (iso, date) => { try { return new Date(iso) >= date } catch { return false } }

function copyText(text, label = 'הועתק') {
  if (!text) return
  try { navigator.clipboard?.writeText(String(text)); toast.success(label) } catch { /* noop */ }
}

/* ייצוא CSV (Excel) — BOM כדי שעברית תיפתח נכון */
function exportCsv(leads) {
  const cols = [
    ['name', 'שם'], ['phone', 'טלפון'], ['email', 'אימייל'], ['project', 'פרויקט'],
    ['source', 'מקור'], ['status', 'שלב'], ['contacted', 'נוצר קשר'], ['message', 'הודעה'],
    ['notes', 'הערות'], ['created_at', 'תאריך'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(',')
  const rows = leads.map((l) => cols.map(([k]) => {
    if (k === 'status') return esc(stageOf(l.status).label)
    if (k === 'contacted') return esc(l.contacted ? 'כן' : 'לא')
    if (k === 'source') return esc(sourceMeta(l.source).label)
    if (k === 'project') return esc(projText(l.project))
    if (k === 'created_at') return esc(fmtDate(l.created_at))
    return esc(l[k])
  }).join(','))
  const csv = '﻿' + [head, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `leads-${fmtDate(new Date().toISOString())}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

const blankLead = () => ({ name: '', phone: '', email: '', project: '', message: '', notes: '', status: 'new', source: 'manual', contacted: false })

const VIEW_ICONS = {
  board: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  list: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
  table: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 14.5h18M9 9v11M15 9v11" /></svg>,
}
const VIEWS = [{ id: 'board', label: 'קוביות' }, { id: 'list', label: 'רשימה' }, { id: 'table', label: 'טבלה' }]

/* ---------- פעולות קשר מהירות (חיוג / וואטסאפ / מייל) ---------- */
function ContactActions({ lead, size = 'md', stop = true }) {
  const wa = waLink(lead.phone)
  const onClick = (e) => { if (stop) e.stopPropagation() }
  return (
    <div className={`adm-cbtns adm-cbtns--${size}`}>
      {lead.phone ? (
        <a className="adm-cbtn adm-cbtn--call" href={`tel:${lead.phone}`} onClick={onClick} title={`חיוג · ${lead.phone}`} aria-label="חיוג"><Ico.phone width={16} height={16} /></a>
      ) : null}
      {wa ? (
        <a className="adm-cbtn adm-cbtn--wa" href={wa} target="_blank" rel="noopener noreferrer" onClick={onClick} title="שליחת וואטסאפ" aria-label="וואטסאפ"><Ico.whatsapp width={16} height={16} /></a>
      ) : null}
      {lead.email ? (
        <a className="adm-cbtn adm-cbtn--mail" href={`mailto:${lead.email}`} onClick={onClick} title={`מייל · ${lead.email}`} aria-label="מייל"><Ico.mail width={16} height={16} /></a>
      ) : null}
      {!lead.phone && !lead.email && <span className="adm-cbtns__none">אין פרטי קשר</span>}
    </div>
  )
}

export default function LeadsTab() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('board')
  const [editing, setEditing] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const load = () => {
    setLoading(true)
    listLeads().then((d) => { setLeads(d); setErr('') })
      .catch((e) => {
        const m = e.message || 'שגיאה בטעינת לידים'
        setErr(/schema cache|find the table|does not exist|relation .* does not/i.test(m) ? 'TABLE_MISSING' : m)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) => [l.name, l.phone, l.email, projText(l.project), l.message, l.notes]
      .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [leads, query])

  const filtered = useMemo(
    () => (stageFilter === 'all' ? searched : searched.filter((l) => (l.status || 'new') === stageFilter)),
    [searched, stageFilter]
  )

  const byStage = (sid) => searched.filter((l) => (l.status || 'new') === sid)
  const patchLocal = (id, patch) => setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  const moveTo = async (id, status) => {
    const lead = leads.find((l) => l.id === id)
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

  const autoSave = async (data) => {
    if (!data.id) return
    patchLocal(data.id, data)
    await updateLead(data.id, data)
  }
  const createNow = async (data) => {
    const created = await createLead({ ...data, source: data.source || 'manual' })
    setLeads((ls) => [created, ...ls])
    return created
  }

  const reorder = async (sourceId, targetId) => {
    if (sourceId === targetId) return
    const ids = leads.map((l) => l.id)
    const from = ids.indexOf(sourceId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...leads]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setLeads(next.map((l, i) => ({ ...l, sort_order: i })))
    try { await reorderRows('leads', next.map((l) => l.id)) } catch (e) { setErr(e.message); load() }
  }

  if (loading) return <div className="adm-leads__msg"><span className="adm-spin" /> טוען לידים…</div>

  const tableMissing = err === 'TABLE_MISSING'
  const stageCounts = STAGES.reduce((acc, s) => { acc[s.id] = searched.filter((l) => (l.status || 'new') === s.id).length; return acc }, {})

  return (
    <div className="adm-leads" dir="rtl">
      {/* ===== סרגל כלים ===== */}
      <div className="adm-leads__bar adm-leads__bar--top">
        <div className="adm-leads__bar-group">
          <span className="adm-leads__count"><b>{filtered.length}</b> לידים</span>
          <div className="adm-leads__views" role="tablist" aria-label="תצוגות">
            {VIEWS.map((v) => {
              const I = VIEW_ICONS[v.id]
              return (
                <button key={v.id} type="button" role="tab" aria-selected={view === v.id}
                  className={`adm-leads__view ${view === v.id ? 'is-active' : ''}`} onClick={() => setView(v.id)}>
                  <I width={16} height={16} /><span>{v.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="adm-leads__bar-group">
          <input className="adm-leads__search" placeholder="חיפוש לפי שם / טלפון / מייל…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="adm-leads__btn" onClick={() => exportCsv(filtered)}>⬇ ייצוא לאקסל</button>
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={() => setEditing(blankLead())}>＋ ליד חדש</button>
        </div>
      </div>

      {/* ===== צ'יפים לסינון לפי שלב ===== */}
      {!tableMissing && leads.length > 0 && (
        <div className="adm-leads__chips" role="tablist" aria-label="סינון לפי שלב">
          <button type="button" className={`adm-chip ${stageFilter === 'all' ? 'is-active' : ''}`} onClick={() => setStageFilter('all')}>
            הכל <span className="adm-chip__n">{searched.length}</span>
          </button>
          {STAGES.map((s) => (
            <button key={s.id} type="button" className={`adm-chip ${stageFilter === s.id ? 'is-active' : ''}`}
              style={{ '--chip': s.color }} onClick={() => setStageFilter((c) => (c === s.id ? 'all' : s.id))}>
              <span className="adm-chip__dot" /> {s.label} <span className="adm-chip__n">{stageCounts[s.id]}</span>
            </button>
          ))}
        </div>
      )}

      {/* ===== דשבורד ===== */}
      {!tableMissing && <Dashboard leads={leads} />}

      {tableMissing && (
        <div className="adm-leads__setup">
          <strong>טבלת הלידים עדיין לא נוצרה ב-Supabase.</strong>
          <span>היכנסו ל-Supabase → SQL Editor → הריצו את סקריפט ה-SQL שסופק, ואז רעננו את העמוד.</span>
        </div>
      )}
      {err && !tableMissing && <div className="adm-leads__err">{err}</div>}
      {!leads.length && !err && (
        <div className="adm-leads__empty">אין עדיין לידים. פניות מטפסי האתר יופיעו כאן אוטומטית, או הוסיפו ליד ידנית.</div>
      )}

      {/* ===== תצוגות ===== */}
      {!tableMissing && leads.length > 0 && (
        <>
          {view === 'board' && (
            <BoardView {...{ byStage, dragId, setDragId, dragOver, setDragOver, moveTo, toggleContacted, remove, setEditing }} />
          )}
          {view === 'list' && (
            <ListView {...{ leads: filtered, dragId, setDragId, dragOver, setDragOver, reorder, moveTo, toggleContacted, remove, setEditing }} />
          )}
          {view === 'table' && (
            <TableView {...{ leads: filtered, moveTo, toggleContacted, remove, setEditing }} />
          )}
        </>
      )}

      {editing && <LeadEditor lead={editing} onClose={() => setEditing(null)} onAutoSave={autoSave} onCreate={createNow} onDelete={remove} />}
    </div>
  )
}

/* ============================ דשבורד ============================ */
function Dashboard({ leads }) {
  const stats = useMemo(() => {
    const today = daysAgo(0), w = daysAgo(7), m = daysAgo(30)
    const count = (d) => leads.filter((l) => isAfter(l.created_at, d)).length
    const total = leads.length
    const won = leads.filter((l) => l.status === 'won').length
    const contacted = leads.filter((l) => l.contacted).length
    const open = leads.filter((l) => isOpen(l)).length
    const hot = leads.filter((l) => leadFlag(l, ageInfo(l.created_at)) === 'hot').length
    const conv = total ? Math.round((won / total) * 100) : 0
    const funnel = FUNNEL.map((id) => ({ ...stageOf(id), n: leads.filter((l) => (l.status || 'new') === id).length }))
    const maxF = Math.max(1, ...funnel.map((f) => f.n))
    return { today: count(today), week: count(w), month: count(m), total, won, contacted, open, conv, funnel, maxF, hot }
  }, [leads])

  const CARDS = [
    { label: 'לידים חמים', value: stats.hot, hint: 'טריים · טרם טופלו', accent: '#d64545' },
    { label: 'היום', value: stats.today, hint: 'לידים חדשים' },
    { label: 'השבוע', value: stats.week, hint: '7 ימים אחרונים' },
    { label: '30 יום', value: stats.month, hint: 'חודש אחרון' },
    { label: 'פתוחים', value: stats.open, hint: `מתוך ${stats.total}` },
    { label: 'אחוז סגירה', value: `${stats.conv}%`, hint: `${stats.won} נסגרו` },
  ]

  return (
    <div className="adm-dash">
      <div className="adm-dash__cards">
        {CARDS.map((c) => (
          <div key={c.label} className="adm-dash__card" style={c.accent ? { '--card-accent': c.accent } : undefined}>
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
              <div className="adm-funnel__bar" style={{ width: `${(f.n / stats.maxF) * 100}%`, background: f.color }}>
                <span>{f.n}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================ כרטיס ליד ============================ */
function LeadCard({ lead, dragId, setDragId, setDragOver, moveTo, toggleContacted, remove, setEditing }) {
  const age = ageInfo(lead.created_at)
  const flag = leadFlag(lead, age)
  const src = sourceMeta(lead.source)
  const SrcIcon = Ico[src.icon] || Ico.user
  const st = stageOf(lead.status)
  const proj = projText(lead.project)
  return (
    <article
      className={`adm-lead ${dragId === lead.id ? 'adm-lead--dragging' : ''} ${flag ? `adm-lead--${flag}` : ''}`}
      style={{ '--stage': st.color }}
      draggable
      onDragStart={() => setDragId(lead.id)}
      onDragEnd={() => { setDragId(null); setDragOver(null) }}
      onClick={() => setEditing(lead)}
    >
      <span className="adm-lead__accent" aria-hidden="true" />
      {flag === 'hot' && <span className="adm-lead__flag adm-lead__flag--hot"><Ico.flame width={11} height={11} /> חדש</span>}
      {flag === 'wait' && <span className="adm-lead__flag adm-lead__flag--wait"><Ico.clock width={11} height={11} /> ממתין</span>}

      <div className="adm-lead__head">
        <span className="adm-lead__avatar" style={{ background: avatarColor(lead.name) }}>{initials(lead.name)}</span>
        <div className="adm-lead__id">
          <button type="button" className="adm-lead__name" onClick={(e) => { e.stopPropagation(); setEditing(lead) }}>{lead.name || 'ללא שם'}</button>
          <span className="adm-lead__sub">
            <span className="adm-lead__src"><SrcIcon width={12} height={12} /> {src.label}</span>
            <span className="adm-lead__dot-sep">·</span>
            <span className="adm-lead__age"><Ico.clock width={11} height={11} /> {age.label}</span>
          </span>
        </div>
      </div>

      <ContactActions lead={lead} size="sm" />

      {proj && <div className="adm-lead__project"><Ico.building width={13} height={13} /> {proj}</div>}
      {lead.message && <p className="adm-lead__msg">“{lead.message}”</p>}
      {lead.notes && <p className="adm-lead__notes"><b>הערה:</b> {lead.notes}</p>}

      <div className="adm-lead__foot" onClick={(e) => e.stopPropagation()}>
        <label className="adm-lead__contacted">
          <input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)} />
          נוצר קשר
        </label>
        <select className="adm-lead__stage-sel" value={lead.status || 'new'} onChange={(e) => moveTo(lead.id, e.target.value)}>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה"><Ico.trash width={14} height={14} /></button>
      </div>
    </article>
  )
}

/* ============================ תצוגת קוביות ============================ */
function BoardView({ byStage, dragId, setDragId, dragOver, setDragOver, moveTo, toggleContacted, remove, setEditing }) {
  return (
    <div className="adm-leads__board">
      {STAGES.map((stage) => {
        const items = byStage(stage.id)
        return (
          <section
            key={stage.id}
            className={`adm-stage ${dragOver === stage.id ? 'adm-stage--over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(stage.id) }}
            onDragLeave={() => setDragOver((s) => (s === stage.id ? null : s))}
            onDrop={() => { if (dragId) moveTo(dragId, stage.id); setDragId(null); setDragOver(null) }}
          >
            <header className="adm-stage__head" style={{ '--stage': stage.color }}>
              <span className="adm-stage__dot" />
              <h3>{stage.label}</h3>
              <span className="adm-stage__count">{items.length}</span>
            </header>
            <div className="adm-stage__list">
              {items.map((lead) => (
                <LeadCard key={lead.id} {...{ lead, dragId, setDragId, setDragOver, moveTo, toggleContacted, remove, setEditing }} />
              ))}
              {!items.length && <div className="adm-stage__empty">גררו לכאן ליד</div>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* ============================ תצוגת רשימה ============================ */
function ListView({ leads, dragId, setDragId, dragOver, setDragOver, reorder, moveTo, toggleContacted, remove, setEditing }) {
  return (
    <div className="adm-list">
      {leads.map((lead) => {
        const st = stageOf(lead.status)
        const age = ageInfo(lead.created_at)
        const flag = leadFlag(lead, age)
        return (
          <div
            key={lead.id}
            className={`adm-list__row ${dragId === lead.id ? 'is-dragging' : ''} ${dragOver === lead.id ? 'is-over' : ''}`}
            draggable
            onDragStart={() => setDragId(lead.id)}
            onDragEnd={() => { setDragId(null); setDragOver(null) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(lead.id) }}
            onDrop={() => { if (dragId) reorder(dragId, lead.id); setDragId(null); setDragOver(null) }}
          >
            <span className="adm-list__grip" title="גררו לשינוי סדר">⋮⋮</span>
            <span className="adm-list__avatar" style={{ background: avatarColor(lead.name) }}>{initials(lead.name)}</span>
            <div className="adm-list__idcol">
              <button type="button" className="adm-list__name" onClick={() => setEditing(lead)}>
                {lead.name || 'ללא שם'}
                {flag === 'hot' && <span className="adm-list__flag adm-list__flag--hot">חדש</span>}
                {flag === 'wait' && <span className="adm-list__flag adm-list__flag--wait">ממתין</span>}
              </button>
              <span className="adm-list__age">{sourceMeta(lead.source).label} · {age.label}</span>
            </div>
            <span className="adm-list__project">{projText(lead.project) || '—'}</span>
            <ContactActions lead={lead} size="sm" stop={false} />
            <label className="adm-list__contacted" title="נוצר קשר">
              <input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)} />
            </label>
            <select className="adm-list__stage-sel" value={lead.status || 'new'} style={{ '--stage': st.color }} onChange={(e) => moveTo(lead.id, e.target.value)}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <div className="adm-list__acts">
              <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה"><Ico.edit width={14} height={14} /></button>
              <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה"><Ico.trash width={14} height={14} /></button>
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
            <th>ליד</th><th>קשר</th><th>פרויקט</th><th>שלב</th><th>נוצר קשר</th><th>מקור</th><th>נכנס</th><th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const age = ageInfo(lead.created_at)
            return (
              <tr key={lead.id}>
                <td>
                  <div className="adm-table__lead">
                    <span className="adm-table__avatar" style={{ background: avatarColor(lead.name) }}>{initials(lead.name)}</span>
                    <button type="button" className="adm-table__name" onClick={() => setEditing(lead)}>{lead.name || 'ללא שם'}</button>
                  </div>
                </td>
                <td><ContactActions lead={lead} size="sm" stop={false} /></td>
                <td>{projText(lead.project) || '—'}</td>
                <td>
                  <select className="adm-lead__stage-sel" value={lead.status || 'new'} style={{ '--stage': stageOf(lead.status).color }} onChange={(e) => moveTo(lead.id, e.target.value)}>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)} /></td>
                <td>{sourceMeta(lead.source).label}</td>
                <td title={fmtDateTime(lead.created_at)}>{age.label}</td>
                <td>
                  <div className="adm-list__acts">
                    <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה"><Ico.edit width={14} height={14} /></button>
                    <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה"><Ico.trash width={14} height={14} /></button>
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

/* ============================ פאנל ליד מלא (HubSpot-style) ============================ */
function LeadEditor({ lead, onClose, onAutoSave, onCreate, onDelete }) {
  const [f, setF] = useState(lead)
  const [status, setStatus] = useState('saved')
  const timer = useRef()
  const fRef = useRef(f)
  fRef.current = f

  const persist = useCallback(async () => {
    const data = fRef.current
    const hasContent = (data.name || '').trim() || (data.phone || '').trim() || (data.email || '').trim()
    setStatus('saving')
    try {
      if (!data.id) {
        if (!hasContent) { setStatus('saved'); return }
        const created = await onCreate(data)
        setF((p) => ({ ...p, id: created.id, created_at: created.created_at }))
      } else {
        await onAutoSave(data)
      }
      setStatus('saved')
    } catch (e) { console.error(e); setStatus('error') }
  }, [onAutoSave, onCreate])

  const schedule = useCallback(() => {
    setStatus('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(persist, 700)
  }, [persist])

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((p) => ({ ...p, [k]: val }))
    schedule()
  }
  const setVal = (k, val) => { setF((p) => ({ ...p, [k]: val })); schedule() }

  const close = async () => { clearTimeout(timer.current); if (status !== 'saved' && status !== 'saving') await persist(); onClose() }
  useEffect(() => () => clearTimeout(timer.current), [])

  const st = stageOf(f.status)
  const age = ageInfo(f.created_at)
  const src = sourceMeta(f.source)
  const SrcIcon = Ico[src.icon] || Ico.user
  const proj = projText(f.project)
  const STATUS_TXT = { saved: '✓ נשמר אוטומטית', dirty: 'שומר…', saving: 'שומר…', error: 'שגיאת שמירה' }

  return (
    <div className="adm-leads__modal" onClick={close}>
      <div className="adm-leads__panel adm-lpanel" dir="rtl" onClick={(e) => e.stopPropagation()}>
        {/* כותרת — זהות הליד במבט אחד */}
        <header className="adm-lpanel__head" style={{ '--stage': st.color }}>
          <span className="adm-lpanel__avatar" style={{ background: avatarColor(f.name) }}>{initials(f.name)}</span>
          <div className="adm-lpanel__idcol">
            <input className="adm-lpanel__name" placeholder="שם הליד" value={f.name || ''} onChange={set('name')} />
            <div className="adm-lpanel__badges">
              <span className="adm-lpanel__stage-badge" style={{ background: st.color }}>{st.label}</span>
              <span className="adm-lpanel__meta"><SrcIcon width={12} height={12} /> {src.label}</span>
              {f.created_at && <span className="adm-lpanel__meta"><Ico.clock width={12} height={12} /> נכנס {age.label}</span>}
            </div>
          </div>
          <button type="button" className="adm-lpanel__close" onClick={close} aria-label="סגירה ושמירה" title="סגירה ושמירה">✕</button>
        </header>

        <span className={`adm-lpanel__save adm-lpanel__save--${status}`}>{STATUS_TXT[status]}</span>

        <div className="adm-lpanel__body">
          {/* פעולות מהירות */}
          <div className="adm-lpanel__quick">
            {f.phone && <a className="adm-qbtn adm-qbtn--call" href={`tel:${f.phone}`}><Ico.phone width={17} height={17} /> חיוג</a>}
            {waLink(f.phone) && <a className="adm-qbtn adm-qbtn--wa" href={waLink(f.phone)} target="_blank" rel="noopener noreferrer"><Ico.whatsapp width={17} height={17} /> וואטסאפ</a>}
            {f.email && <a className="adm-qbtn adm-qbtn--mail" href={`mailto:${f.email}`}><Ico.mail width={17} height={17} /> מייל</a>}
          </div>

          {/* פרטי קשר */}
          <section className="adm-lpanel__sec">
            <h4 className="adm-lpanel__sec-title">פרטי קשר</h4>
            <div className="adm-lpanel__grid">
              <label>טלפון
                <div className="adm-lpanel__inp-copy">
                  <input dir="ltr" value={f.phone || ''} onChange={set('phone')} placeholder="050-0000000" />
                  {f.phone && <button type="button" className="adm-lpanel__copy" title="העתקה" onClick={() => copyText(f.phone, 'הטלפון הועתק')}><Ico.copy width={14} height={14} /></button>}
                </div>
              </label>
              <label>אימייל
                <div className="adm-lpanel__inp-copy">
                  <input dir="ltr" value={f.email || ''} onChange={set('email')} placeholder="name@mail.com" />
                  {f.email && <button type="button" className="adm-lpanel__copy" title="העתקה" onClick={() => copyText(f.email, 'האימייל הועתק')}><Ico.copy width={14} height={14} /></button>}
                </div>
              </label>
              <label className="adm-lpanel__wide">פרויקט מבוקש
                <input value={proj} onChange={(e) => setVal('project', e.target.value)} placeholder="שם הפרויקט שהתעניין בו" />
              </label>
            </div>
          </section>

          {/* שלב — כפתורים ויזואליים */}
          <section className="adm-lpanel__sec">
            <h4 className="adm-lpanel__sec-title">שלב בתהליך</h4>
            <div className="adm-lpanel__stages">
              {STAGES.map((s) => (
                <button key={s.id} type="button"
                  className={`adm-lpanel__stagebtn ${f.status === s.id ? 'is-active' : ''}`}
                  style={{ '--st': s.color }}
                  onClick={() => setVal('status', s.id)}>
                  <span className="adm-lpanel__stagebtn-dot" /> {s.label}
                </button>
              ))}
            </div>
            <label className="adm-lpanel__contacted-row">
              <input type="checkbox" checked={!!f.contacted} onChange={set('contacted')} />
              <span>נוצר קשר עם הליד</span>
            </label>
          </section>

          {/* מה הליד כתב */}
          <section className="adm-lpanel__sec">
            <h4 className="adm-lpanel__sec-title">הודעת הפונה</h4>
            <textarea className="adm-lpanel__message" rows={3} value={f.message || ''} onChange={set('message')} placeholder="ההודעה שהשאיר הליד בטופס…" />
          </section>

          {/* הערות פנימיות */}
          <section className="adm-lpanel__sec">
            <h4 className="adm-lpanel__sec-title">הערות פנימיות</h4>
            <textarea className="adm-lpanel__notes" rows={3} value={f.notes || ''} onChange={set('notes')} placeholder="סיכום שיחה, תקציב, מה הבטחת, מתי לחזור…" />
          </section>

          {/* מטא */}
          {f.created_at && (
            <div className="adm-lpanel__timeline">
              <span><Ico.clock width={12} height={12} /> נכנס: {fmtDateTime(f.created_at)}</span>
              {f.updated_at && <span>עודכן: {fmtDateTime(f.updated_at)}</span>}
            </div>
          )}
        </div>

        <footer className="adm-lpanel__foot">
          {f.id && <button type="button" className="adm-lpanel__delete" onClick={() => { onDelete(f); onClose() }}><Ico.trash width={15} height={15} /> מחיקת ליד</button>}
          <span className="adm-lpanel__foot-spacer" />
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={close}>סיום</button>
        </footer>
      </div>
    </div>
  )
}
