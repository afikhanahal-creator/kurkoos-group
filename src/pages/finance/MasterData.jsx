import { useMemo, useState } from 'react'
import DateField from './DateField.jsx'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ENTITIES, SUPPLIER_STATUS, toRow, validate } from './entities.js'
import { PROJECT_STATUS, date, money, nameOf, toCsv } from './format.js'
import { entityStats } from './stats.js'
import { saveBlob } from './zip.js'
import { Empty, Icon, Modal, PageHead, Pill, Toggle } from './ui.jsx'
import Select from './Select.jsx'

/* One input for a master-data field. Exported for the overview page's edit form. */
export function FieldInput({ f, value, onChange, refs, selfId, error }) {
  const id = `fin-f-${f.key}`
  const common = { id, 'aria-invalid': !!error, 'aria-describedby': error || f.hint ? `${id}-h` : undefined }
  let input
  if (f.type === 'textarea') input = <textarea {...common} rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  else if (f.type === 'select') input = (
    <Select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {f.options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </Select>
  )
  else if (f.type === 'ref') {
    const list = (refs[f.ref] || []).filter((r) => !f.self || r.id !== selfId)
    input = (
      <Select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {list.map((r) => <option key={r.id} value={f.by === 'name' ? r.name : r.id}>{r.name}{r.code ? ` (${r.code})` : ''}</option>)}
      </Select>
    )
  } else if (f.type === 'multi') {
    const v = value || []
    input = (
      <div className="fin-chips" role="group" aria-label={f.label}>
        {(refs[f.ref] || []).map((r) => (
          <label key={r.id} className={`fin-chip ${v.includes(r.id) ? 'is-on' : ''}`}><input type="checkbox" checked={v.includes(r.id)} onChange={(e) => onChange(e.target.checked ? [...v, r.id] : v.filter((x) => x !== r.id))} />{r.name}</label>
        ))}
      </div>
    )
  } else if (f.type === 'toggle') input = <Toggle checked={!!value} onChange={onChange} label={f.label} />
  else if (f.type === 'date') input = <DateField id={common.id} value={value || ''} onChange={onChange} invalid={!!error} />
  else if (f.type === 'tags') input = <input {...common} value={Array.isArray(value) ? value.join(', ') : value ?? ''} onChange={(e) => onChange(e.target.value)} />
  else input = <input {...common} type={f.type === 'id' ? 'text' : f.type === 'url' ? 'text' : f.type} inputMode={f.type === 'id' ? 'numeric' : f.type === 'number' ? 'decimal' : undefined} dir={f.ltr || ['id', 'email', 'url', 'tel'].includes(f.type) ? 'ltr' : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} min={f.min} max={f.max} step={f.type === 'number' ? 'any' : undefined} />
  return (
    <div className={`fin-field ${f.wide || f.type === 'multi' ? 'fin-field--wide' : ''} ${error ? 'fin-field--error' : ''} ${f.type === 'toggle' ? 'fin-field--row' : ''}`}>
      <label className="fin-field__label" htmlFor={f.type === 'multi' || f.type === 'toggle' ? undefined : id}>{f.label}{f.required && <span className="fin-req" aria-label="שדה חובה">*</span>}</label>
      {input}
      {(error || f.hint) && <span id={`${id}-h`} className={`fin-field__hint ${error ? 'fin-field__hint--error' : ''}`}>{error || f.hint}</span>}
    </div>
  )
}

/* create / edit, with validation and the duplicate check before saving */
export function EntityForm({ kind, initial, onClose, onSaved }) {
  const def = ENTITIES[kind]
  const ctx = useFinance()
  const refs = { businesses: ctx.businesses, projects: ctx.projects, categories: ctx.categories, suppliers: ctx.suppliers }
  const all = ctx[kind === 'businesses' ? 'businesses' : kind]
  const [form, setForm] = useState(() => ({ ...def.blank, ...initial }))
  const [errs, setErrs] = useState({})
  const [dups, setDups] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (v) => { setForm((x) => ({ ...x, [k]: v })); setErrs((e) => ({ ...e, [k]: undefined })); setDups(null) }

  const save = async (e, force = false) => {
    e?.preventDefault()
    const row = toRow(def, form)
    const v = validate(def, row)
    setErrs(v)
    if (Object.keys(v).length) { setErr('יש שדות לתיקון'); return }
    const d = def.duplicates(row, all || [])
    const hard = d.filter((x) => x.why.some((w) => /ח\.פ|מספר עוסק|קוד/.test(w)))
    if (hard.length) { setDups(hard); setErr('כבר קיים רישום עם אותו מספר מזהה. אי אפשר ליצור כפילות.'); return }
    if (d.length && !force) { setDups(d); setErr(''); return }
    setBusy(true); setErr('')
    try {
      const saved = await api.saveRow(def.table, row)
      onSaved?.(saved)
    } catch (e2) {
      setErr(/unique|duplicate/i.test(e2.message) ? 'כבר קיים רישום כזה (שם או מספר מזהה)' : /PROJECT_COMPANY/.test(e2.message) ? 'הפרויקט שייך לחברה אחרת' : e2.message)
    } finally { setBusy(false) }
  }

  return (
    <Modal title={form.id ? `עריכת ${form.name || def.one}` : def.add} onClose={onClose} wide footer={<>
      <button type="submit" form="fin-entity-form" className="fin-btn fin-btn--primary" disabled={busy}>{busy ? 'שומר…' : form.id ? 'שמירת שינויים' : def.add}</button>
      {dups && !dups.some((x) => x.why.some((w) => /ח\.פ|מספר עוסק|קוד/.test(w))) && <button type="button" className="fin-btn" onClick={(e) => save(e, true)} disabled={busy}>זה {def.one} אחר, לשמור</button>}
      <button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>ביטול</button>
    </>}>
      <form id="fin-entity-form" className="fin-form__grid" onSubmit={save} noValidate>
        {def.fields.map((f) => <FieldInput key={f.key} f={f} value={form[f.key]} onChange={set(f.key)} refs={refs} selfId={form.id} error={errs[f.key]} />)}
      </form>
      {dups && (
        <div className="fin-callout fin-callout--warn" role="alert">
          <strong>נמצאו רישומים דומים</strong>
          <ul>{dups.map(({ row, why }) => <li key={row.id}>{row.name} <span className="fin-muted">({why.join(', ')})</span></li>)}</ul>
        </div>
      )}
      {err && <p className="fin-error" role="alert">{err}</p>}
    </Modal>
  )
}

/* CSV import: headers in Hebrew (the field labels) or English (the keys). Every row is validated and checked for duplicates. */
function ImportDialog({ kind, onClose, onDone }) {
  const def = ENTITIES[kind]
  const ctx = useFinance()
  const all = ctx[kind === 'businesses' ? 'businesses' : kind] || []
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const parse = async (file) => {
    const text = (await file.text()).replace(/^﻿/, '')
    const lines = []; let cur = ['']; let q = false
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++ } else if (ch === '"') q = false; else cur[cur.length - 1] += ch }
      else if (ch === '"') q = true
      else if (ch === ',') cur.push('')
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; lines.push(cur); cur = [''] }
      else cur[cur.length - 1] += ch
    }
    if (cur.some(Boolean)) lines.push(cur)
    const [head, ...body] = lines.filter((l) => l.some((c) => c.trim()))
    const map = head.map((h) => def.fields.find((f) => f.label === h.trim() || f.key === h.trim())?.key || null)
    const seen = []
    setRows(body.map((cells) => {
      const form = { ...def.blank }
      map.forEach((k, i) => { if (k) form[k] = cells[i]?.trim() })
      const row = toRow(def, form)
      const errs = validate(def, row)
      const dup = def.duplicates(row, [...all, ...seen])
      seen.push({ ...row, id: `new-${seen.length}` })
      return { row, errs, dup }
    }))
  }
  const ok = (rows || []).filter((r) => !Object.keys(r.errs).length && !r.dup.length)
  const run = async () => {
    setBusy(true)
    let n = 0
    for (const r of ok) { try { await api.saveRow(def.table, r.row); n++ } catch { /* reported below */ } }
    setBusy(false); setMsg(`נוספו ${n} מתוך ${ok.length}`); onDone()
  }
  return (
    <Modal title={`ייבוא ${def.title}`} onClose={onClose} wide footer={<><button type="button" className="fin-btn fin-btn--primary" disabled={!ok.length || busy} onClick={run}>{busy ? 'מייבא…' : `ייבוא ${ok.length} שורות`}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>סגירה</button></>}>
      <p className="fin-muted">קובץ CSV. שורת הכותרת בעברית (כמו בטופס) או באנגלית. שורות עם שגיאה או כפילות מסומנות ולא ייובאו.</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && parse(e.target.files[0])} aria-label="קובץ CSV" />
      {rows && (
        <div className="fin-table-wrap fin-table-wrap--flat fin-import">
          <table className="fin-table fin-table--plain">
            <thead><tr><th>שם</th><th>מצב</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}><td>{r.row.name || '—'}</td><td>{Object.keys(r.errs).length ? <Pill tone="bad">{Object.entries(r.errs).map(([k, v]) => `${def.fields.find((f) => f.key === k)?.label}: ${v}`).join(', ')}</Pill> : r.dup.length ? <Pill tone="warn">כפילות של {r.dup[0].row.name}</Pill> : <Pill tone="ok">מוכן</Pill>}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {msg && <p className="fin-note" role="status">{msg}</p>}
    </Modal>
  )
}

export default function MasterData({ kind }) {
  const def = ENTITIES[kind]
  const ctx = useFinance()
  const { can, go, reload, documents, allocations, businesses, categories, projects } = ctx
  const list = ctx[kind === 'businesses' ? 'businesses' : kind] || []
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({})
  const [showArchived, setShowArchived] = useState(false)
  const [edit, setEdit] = useState(null)
  const [importing, setImporting] = useState(false)
  const [sort, setSort] = useState({ key: 'total', dir: -1 })
  const [toast, setToast] = useState('')
  const canWrite = can(def.write)

  const stats = useMemo(() => entityStats(kind, list, documents, allocations, categories), [kind, list, documents, allocations, categories])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return list.filter((r) => (showArchived || !def.archived(r))
      && Object.entries(filters).every(([k, v]) => !v || (k === '_missing' ? (v === 'id' ? !r.vat_id : !r.email && !r.phone) : String(r[k]) === v))
      && (!needle || [r.name, r.trading_name, r.commercial_name, r.name_en, r.vat_id, r.reg_number, r.code, r.location, r.email, r.accounting_code, r.contact_person].some((x) => String(x || '').toLowerCase().includes(needle))))
      .map((r) => ({ ...r, ...stats[r.id], ...(kind === 'businesses' ? { projects: projects.filter((p) => p.business_id === r.id).length } : {}) }))
      .sort((a, b) => { const x = a[sort.key] ?? ''; const y = b[sort.key] ?? ''; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir })
  }, [list, filters, q, showArchived, stats, sort, def, kind, projects])
  const pending = kind === 'suppliers' ? list.filter((s) => s.status === 'pending').length : 0

  const exportCsv = () => {
    const head = [...def.fields.map((f) => f.label), 'מסמכים', 'סה״כ הוצאות']
    const body = rows.map((r) => [...def.fields.map((f) => {
      const v = r[f.key]
      if (f.type === 'ref' && f.by !== 'name') return nameOf({ businesses, projects, categories }[f.ref] || [], v)
      if (f.type === 'multi') return (v || []).map((x) => nameOf(businesses, x)).join('; ')
      if (Array.isArray(v)) return v.join(', ')
      return v ?? ''
    }), r.docs || 0, r.total || 0])
    saveBlob(new Blob([toCsv(head, body)], { type: 'text/csv;charset=utf-8' }), `${def.title}.csv`)
  }
  const Th = ({ k, children, num }) => (
    <th className={num ? 'fin-num' : ''} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="fin-th-sort" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : -1 }))}>{children}{sort.key === k && <span aria-hidden="true">{sort.dir === 1 ? '▲' : '▼'}</span>}</button>
    </th>
  )
  const status = (r) => {
    if (kind === 'suppliers') return <Pill tone={r.status === 'pending' ? 'warn' : r.status === 'archived' ? 'muted' : 'ok'}>{SUPPLIER_STATUS[r.status]}</Pill>
    if (kind === 'projects') return <Pill tone={r.archived_at ? 'muted' : r.status === 'active' ? 'ok' : r.status === 'on_hold' ? 'warn' : 'info'}>{r.archived_at ? 'בארכיון' : PROJECT_STATUS[r.status]}</Pill>
    return def.archived(r) ? <Pill>בארכיון</Pill> : <Pill tone="ok">פעיל</Pill>
  }

  return (
    <div className="fin-stack">
      <PageHead title={def.title} sub={def.sub}>
        <button type="button" className="fin-btn fin-btn--ghost" onClick={exportCsv} disabled={!rows.length}><Icon name="download" size={17} /> ייצוא</button>
        {canWrite && <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setImporting(true)}><Icon name="upload" size={17} /> ייבוא</button>}
        {canWrite && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({})}><Icon name="plus" size={17} /> {def.add}</button>}
      </PageHead>

      {pending > 0 && (
        <button type="button" className="fin-attention" onClick={() => setFilters({ status: 'pending' })}>
          <span className="fin-attention__dot" aria-hidden="true" /> <strong>{pending} ספקים חדשים</strong> זוהו מחשבוניות וממתינים לאישור
        </button>
      )}

      <div className="fin-filters">
        <label className="fin-search"><Icon name="search" size={17} /><input type="search" placeholder={`חיפוש ${def.title}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`חיפוש ${def.title}`} /></label>
        {def.filters.map((fl) => (
          <Select key={fl.key} className="fin-select" value={filters[fl.key] || ''} onChange={(e) => setFilters((x) => ({ ...x, [fl.key]: e.target.value }))} aria-label={fl.label}>
            <option value="">{fl.label}: הכול</option>
            {fl.ref ? (ctx[fl.ref] || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>) : Object.entries(fl.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        ))}
        <label className="fin-check"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> כולל ארכיון</label>
      </div>
      {toast && <p className="fin-note" role="status">{toast}</p>}

      {!rows.length ? (
        <Empty title={list.length ? 'אין תוצאות' : `עוד אין ${def.title}`} icon={def.icon} action={!list.length && canWrite && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({})}>{def.add}</button>}>
          {list.length ? 'נסו חיפוש אחר או הסירו סינון.' : `${def.add} כדי להתחיל לשייך אליו מסמכים.`}
        </Empty>
      ) : (
        <div className="fin-table-wrap">
          <table className="fin-table fin-table--ent">
            <thead><tr>
              <Th k="name">{def.one}</Th>
              {kind === 'suppliers' && <><th className="fin-col-md">ח.פ</th><th className="fin-col-lg">סוג</th><th className="fin-col-lg">קטגוריה קבועה</th></>}
              {kind === 'categories' && <><th className="fin-col-md">אב</th><th className="fin-col-md">קוד</th><Th k="vat_deductible_pct" num>קיזוז</Th></>}
              {kind === 'projects' && <><th className="fin-col-md">קוד</th><th className="fin-col-md">חברה</th><th className="fin-col-lg">סוג</th></>}
              {kind === 'businesses' && <><th className="fin-col-md">מספר עוסק</th><th className="fin-col-lg">רו״ח</th><Th k="projects" num>פרויקטים</Th></>}
              <Th k="docs" num>מסמכים</Th>
              <Th k="total" num>הוצאות</Th>
              {kind === 'projects' && <th className="fin-col-md">תקציב</th>}
              <Th k="last" >אחרון</Th>
              <th>סטטוס</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => go(`${def.path}/${r.id}`)}>
                  <td className="fin-td-main">
                    <button type="button" className="fin-cell-btn fin-cell-main" onClick={(e) => { e.stopPropagation(); go(`${def.path}/${r.id}`) }}>{r.name}</button>
                    <small className="fin-cell-sub">{r.trading_name || r.commercial_name || r.name_en || r.location || r.description || ''}</small>
                  </td>
                  {kind === 'suppliers' && <><td className="fin-col-md fin-ltr" data-label="ח.פ">{r.vat_id || <span className="fin-attn-text">חסר</span>}</td><td className="fin-col-lg" data-label="סוג">{r.supplier_type || '—'}</td><td className="fin-col-lg" data-label="קטגוריה">{r.default_category || '—'}</td></>}
                  {kind === 'categories' && <><td className="fin-col-md" data-label="אב">{nameOf(categories, r.parent_id) || '—'}</td><td className="fin-col-md fin-ltr" data-label="קוד">{r.accounting_code || '—'}</td><td className="fin-num fin-ent-stat" data-label="קיזוז">{Number(r.vat_deductible_pct)}%</td></>}
                  {kind === 'projects' && <><td className="fin-col-md fin-ltr" data-label="קוד">{r.code || '—'}</td><td className="fin-col-md" data-label="חברה">{nameOf(businesses, r.business_id) || <span className="fin-attn-text">לא משויך</span>}</td><td className="fin-col-lg" data-label="סוג">{r.project_type || '—'}</td></>}
                  {kind === 'businesses' && <><td className="fin-col-md fin-ltr" data-label="עוסק">{r.vat_id || '—'}</td><td className="fin-col-lg" data-label="רו״ח">{r.accountant_name || r.accountant_email || '—'}</td><td className="fin-num fin-ent-stat" data-label="פרויקטים">{r.projects || 0}</td></>}
                  <td className={`fin-num fin-ent-stat ${kind === 'suppliers' || kind === 'projects' ? 'fin-ent-stat--wide' : ''}`} data-label="מסמכים"><span className="fin-ent-stat__n">{r.docs || 0}</span>{r.pendingDocs ? <small className="fin-warn-text fin-ent-stat__wait"> ({r.pendingDocs} ממתינים)</small> : null}</td>
                  <td className="fin-num fin-td-total" data-label="הוצאות"><strong>{money(r.total || 0)}</strong></td>
                  {kind === 'projects' && <td className="fin-col-md" data-label="תקציב">{r.budget ? <span className="fin-budget"><span style={{ width: `${Math.min(100, ((r.total || 0) / r.budget) * 100)}%` }} className={(r.total || 0) > r.budget ? 'is-over' : ''} />{Math.round(((r.total || 0) / r.budget) * 100)}%</span> : '—'}</td>}
                  <td className="fin-ent-last" data-label="אחרון">{date(r.last) || '—'}</td>
                  <td className="fin-td-status">{status(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <EntityForm kind={kind} initial={edit} onClose={() => setEdit(null)} onSaved={(s) => { setEdit(null); setToast(`${def.one} "${s.name}" נשמר`); reload(); if (!edit.id) go(`${def.path}/${s.id}`) }} />}
      {importing && <ImportDialog kind={kind} onClose={() => setImporting(false)} onDone={reload} />}
    </div>
  )
}
