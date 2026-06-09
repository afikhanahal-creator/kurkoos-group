import { useState, useEffect, useMemo } from 'react'
import { listLeads, updateLead, deleteLead, createLead, reorderRows } from '../../lib/cms.js'

/* ============================================================
   LeadsTab — מערכת ניהול לידים בסגנון Monday.
   • דשבורד: משפך המרה + נתוני זמן (היום / השבוע / 30 יום / סה"כ)
   • 3 תצוגות: קוביות (Kanban), רשימה, טבלה — כולן עם Drag & Drop
   • עריכה בלחיצה על השם, סימון "נוצר קשר", הוספה/מחיקה
   • ייצוא לאקסל (CSV עם BOM לעברית), חיפוש
   • רספונסיבי מלא
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
// שלבי המשפך (ללא "לא רלוונטי")
const FUNNEL = ['new', 'contacted', 'meeting', 'negotiation', 'won']

const SOURCE_LABEL = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }

const VIEWS = [
  { id: 'board', label: 'קוביות' },
  { id: 'list', label: 'רשימה' },
  { id: 'table', label: 'טבלה' },
]

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch { return '' }
}
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d }
const isAfter = (iso, date) => { try { return new Date(iso) >= date } catch { return false } }

/* ייצוא CSV (Excel) — BOM כדי שעברית תיפתח נכון באקסל */
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
    if (k === 'source') return esc(SOURCE_LABEL[l.source] || l.source || '')
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

export default function LeadsTab() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('board')
  const [editing, setEditing] = useState(null)
  // גרירה
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) => [l.name, l.phone, l.email, l.project, l.message, l.notes]
      .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [leads, query])

  const byStage = (sid) => filtered.filter((l) => (l.status || 'new') === sid)

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
  const save = async (data) => {
    try {
      if (data.id) { await updateLead(data.id, data); patchLocal(data.id, data) }
      else { await createLead({ ...data, source: 'manual' }); load() }
      setEditing(null)
    } catch (e) { setErr(e.message) }
  }

  // שינוי סדר ברשימה (גרירה) — מעדכן sort_order לכל הלידים
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

  return (
    <div className="adm-leads" dir="rtl">
      {/* ===== דשבורד ===== */}
      {!tableMissing && <Dashboard leads={leads} />}

      {/* ===== סרגל כלים — יושב ישירות מעל הלידים ===== */}
      <div className="adm-leads__bar">
        <div className="adm-leads__bar-group">
          <span className="adm-leads__count"><b>{filtered.length}</b> לידים</span>
          <div className="adm-leads__views">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className={`adm-leads__view ${view === v.id ? 'is-active' : ''}`} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </div>
        </div>
        <div className="adm-leads__bar-group">
          <input className="adm-leads__search" placeholder="חיפוש ליד…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="adm-leads__btn" onClick={() => exportCsv(filtered)}>⬇ ייצוא לאקסל</button>
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={() => setEditing(blankLead())}>＋ ליד חדש</button>
        </div>
      </div>

      {tableMissing && (
        <div className="adm-leads__setup">
          <strong>טבלת הלידים עדיין לא נוצרה ב-Supabase.</strong>
          <span>היכנסו ל-Supabase → SQL Editor → הריצו את סקריפט ה-SQL שסופק, ואז רעננו את העמוד. לאחר מכן הלידים יופיעו כאן אוטומטית.</span>
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

      {editing && <LeadEditor lead={editing} onClose={() => setEditing(null)} onSave={save} />}
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
    const open = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').length
    const conv = total ? Math.round((won / total) * 100) : 0
    const funnel = FUNNEL.map((id) => ({ ...stageOf(id), n: leads.filter((l) => (l.status || 'new') === id).length }))
    const maxF = Math.max(1, ...funnel.map((f) => f.n))
    return { today: count(today), week: count(w), month: count(m), total, won, contacted, open, conv, funnel, maxF }
  }, [leads])

  const CARDS = [
    { label: 'היום', value: stats.today, hint: 'לידים חדשים' },
    { label: 'השבוע', value: stats.week, hint: '7 ימים אחרונים' },
    { label: '30 יום', value: stats.month, hint: 'חודש אחרון' },
    { label: 'סה"כ לידים', value: stats.total, hint: `${stats.open} פתוחים` },
    { label: 'נוצר קשר', value: stats.contacted, hint: `מתוך ${stats.total}` },
    { label: 'אחוז סגירה', value: `${stats.conv}%`, hint: `${stats.won} נסגרו` },
  ]

  return (
    <div className="adm-dash">
      <div className="adm-dash__cards">
        {CARDS.map((c) => (
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
                <article
                  key={lead.id}
                  className={`adm-lead ${dragId === lead.id ? 'adm-lead--dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                >
                  <div className="adm-lead__top">
                    <button type="button" className="adm-lead__name" onClick={() => setEditing(lead)}>{lead.name || 'ללא שם'}</button>
                    <span className="adm-lead__date">{fmtDate(lead.created_at)}</span>
                  </div>
                  <div className="adm-lead__contacts">
                    {lead.phone && <a href={`tel:${lead.phone}`} dir="ltr">{lead.phone}</a>}
                    {lead.email && <a href={`mailto:${lead.email}`} dir="ltr">{lead.email}</a>}
                  </div>
                  {lead.project && <div className="adm-lead__project">📍 {lead.project}</div>}
                  {lead.message && <p className="adm-lead__msg">{lead.message}</p>}
                  {lead.notes && <p className="adm-lead__notes">📝 {lead.notes}</p>}
                  <div className="adm-lead__foot">
                    <label className="adm-lead__contacted">
                      <input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)} />
                      נוצר קשר
                    </label>
                    <select className="adm-lead__stage-sel" value={lead.status || 'new'} onChange={(e) => moveTo(lead.id, e.target.value)}>
                      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה">✎</button>
                    <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה">🗑</button>
                  </div>
                  {lead.source && <span className="adm-lead__source">{SOURCE_LABEL[lead.source] || lead.source}</span>}
                </article>
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
            <span className="adm-list__stage" style={{ background: st.color }} />
            <button type="button" className="adm-list__name" onClick={() => setEditing(lead)}>{lead.name || 'ללא שם'}</button>
            <div className="adm-list__contacts">
              {lead.phone && <a href={`tel:${lead.phone}`} dir="ltr">{lead.phone}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} dir="ltr" className="adm-list__email">{lead.email}</a>}
            </div>
            <span className="adm-list__project">{lead.project || '—'}</span>
            <label className="adm-list__contacted" title="נוצר קשר">
              <input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)} />
            </label>
            <select className="adm-list__stage-sel" value={lead.status || 'new'} onChange={(e) => moveTo(lead.id, e.target.value)}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span className="adm-list__date">{fmtDate(lead.created_at)}</span>
            <div className="adm-list__acts">
              <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה">✎</button>
              <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה">🗑</button>
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
            <th>שלב</th><th>נוצר קשר</th><th>מקור</th><th>תאריך</th><th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td><button type="button" className="adm-table__name" onClick={() => setEditing(lead)}>{lead.name || 'ללא שם'}</button></td>
              <td dir="ltr">{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : '—'}</td>
              <td dir="ltr">{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : '—'}</td>
              <td>{lead.project || '—'}</td>
              <td>
                <select className="adm-lead__stage-sel" value={lead.status || 'new'} onChange={(e) => moveTo(lead.id, e.target.value)}>
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </td>
              <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!lead.contacted} onChange={() => toggleContacted(lead)} /></td>
              <td>{SOURCE_LABEL[lead.source] || lead.source || '—'}</td>
              <td>{fmtDate(lead.created_at)}</td>
              <td>
                <div className="adm-list__acts">
                  <button type="button" className="adm-lead__act" onClick={() => setEditing(lead)} title="עריכה">✎</button>
                  <button type="button" className="adm-lead__act adm-lead__act--del" onClick={() => remove(lead)} title="מחיקה">🗑</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ============================ מודאל עריכה/הוספה ============================ */
function LeadEditor({ lead, onClose, onSave }) {
  const [f, setF] = useState(lead)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  return (
    <div className="adm-leads__modal" onClick={onClose}>
      <form className="adm-leads__modal-box" dir="rtl" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave(f) }}>
        <h3>{f.id ? 'עריכת ליד' : 'ליד חדש'}</h3>
        <div className="adm-leads__grid">
          <label>שם<input value={f.name || ''} onChange={set('name')} /></label>
          <label>טלפון<input dir="ltr" value={f.phone || ''} onChange={set('phone')} /></label>
          <label>אימייל<input dir="ltr" value={f.email || ''} onChange={set('email')} /></label>
          <label>פרויקט<input value={f.project || ''} onChange={set('project')} /></label>
          <label>שלב
            <select value={f.status || 'new'} onChange={set('status')}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="adm-leads__chk"><input type="checkbox" checked={!!f.contacted} onChange={set('contacted')} /> נוצר קשר</label>
        </div>
        <label>הודעת הפונה<textarea rows={2} value={f.message || ''} onChange={set('message')} /></label>
        <label>הערות פנימיות<textarea rows={2} value={f.notes || ''} onChange={set('notes')} /></label>
        <div className="adm-leads__modal-foot">
          <button type="button" className="adm-leads__btn" onClick={onClose}>ביטול</button>
          <button type="submit" className="adm-leads__btn adm-leads__btn--primary">שמירה</button>
        </div>
      </form>
    </div>
  )
}
