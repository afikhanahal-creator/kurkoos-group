import { useState, useEffect, useMemo } from 'react'
import { listLeads, updateLead, deleteLead, createLead } from '../../lib/cms.js'

/* ============================================================
   LeadsTab — מערכת ניהול לידים בסגנון Monday.
   • שלבים (stages) עם ספירה וצבע מותג
   • גרירה (drag & drop) של ליד בין שלבים
   • פרטי הפנייה המלאים, סימון "נוצר קשר", הערות
   • ייצוא לאקסל (CSV עם BOM לעברית)
   • רספונסיבי — כרטיסים במובייל
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

const SOURCE_LABEL = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }

function fmtDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch { return '' }
}

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
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [editing, setEditing] = useState(null) // lead being edited (or new)

  const load = () => {
    setLoading(true)
    listLeads().then((d) => { setLeads(d); setErr('') })
      .catch((e) => setErr(e.message || 'שגיאה בטעינת לידים'))
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

  // עדכון אופטימי
  const patchLocal = (id, patch) => setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  const moveTo = async (id, status) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === status) return
    patchLocal(id, { status })
    try { await updateLead(id, { status }) } catch (e) { setErr(e.message); load() }
  }
  const toggleContacted = async (lead) => {
    patchLocal(lead.id, { contacted: !lead.contacted })
    try { await updateLead(lead.id, { contacted: !lead.contacted }) } catch (e) { setErr(e.message); load() }
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

  if (loading) return <div className="adm-leads__msg"><span className="adm-spin" /> טוען לידים…</div>

  return (
    <div className="adm-leads" dir="rtl">
      <div className="adm-leads__toolbar">
        <div className="adm-leads__count">{filtered.length} לידים</div>
        <div className="adm-leads__tools">
          <input className="adm-leads__search" placeholder="חיפוש ליד…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="adm-leads__btn" onClick={() => exportCsv(filtered)}>⬇ ייצוא לאקסל</button>
          <button type="button" className="adm-leads__btn adm-leads__btn--primary" onClick={() => setEditing(blankLead())}>＋ ליד חדש</button>
        </div>
      </div>

      {err && <div className="adm-leads__err">{err}</div>}
      {!leads.length && !err && (
        <div className="adm-leads__empty">אין עדיין לידים. פניות מטפסי האתר יופיעו כאן אוטומטית, או הוסיפו ליד ידנית.</div>
      )}

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
                      <strong className="adm-lead__name">{lead.name || 'ללא שם'}</strong>
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

      {editing && <LeadEditor lead={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

/* מודאל עריכה/הוספה */
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
