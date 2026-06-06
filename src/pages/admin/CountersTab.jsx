import { useEffect, useState, useRef, useCallback } from 'react'
import { listCounters, createCounter, updateCounter, deleteCounter } from '../../lib/cms.js'

function CounterRow({ row, onDelete }) {
  const [form, setForm] = useState(row)
  const [status, setStatus] = useState('saved')
  const timer = useRef()

  const commit = useCallback(async (data) => {
    setStatus('saving')
    try {
      const patch = { ...data }; delete patch.id; delete patch.created_at; delete patch.updated_at
      await updateCounter(data.id, patch); setStatus('saved')
    } catch (e) { console.error(e); setStatus('error') }
  }, [])

  const set = (key, val) => setForm((prev) => {
    const next = { ...prev, [key]: val }
    setStatus('dirty'); clearTimeout(timer.current); timer.current = setTimeout(() => commit(next), 800)
    return next
  })

  return (
    <div className="ctab__row">
      <input className="ctab__cell" value={form.label_he ?? ''} placeholder="תווית" onChange={(e) => set('label_he', e.target.value)} />
      <input className="ctab__cell ctab__cell--num" value={form.value ?? ''} placeholder="ערך" onChange={(e) => set('value', e.target.value)} />
      <input className="ctab__cell ctab__cell--sm" value={form.suffix ?? ''} placeholder="סיומת" onChange={(e) => set('suffix', e.target.value)} />
      <input className="ctab__cell" value={form.location_hint ?? ''} placeholder="היכן מופיע" onChange={(e) => set('location_hint', e.target.value)} />
      <input className="ctab__cell ctab__cell--key" value={form.key ?? ''} placeholder="key" onChange={(e) => set('key', e.target.value)} title="מזהה יציב (אנגלית)" />
      <label className="ctab__toggle" title="פעיל"><input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} /><span /></label>
      <span className={`ctab__dot ctab__dot--${status}`} title={status} />
      <button type="button" className="ctab__del" onClick={() => onDelete(form.id)} title="מחק">✕</button>
    </div>
  )
}

export default function CountersTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await listCounters()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const add = async () => {
    const row = await createCounter({ key: 'counter_' + Math.random().toString(36).slice(2, 6), label_he: 'מונה חדש', value: '0', suffix: '+', sort_order: rows.length, is_active: true })
    setRows((prev) => [...prev, row])
  }
  const remove = async (id) => {
    if (!window.confirm('למחוק את המונה?')) return
    await deleteCounter(id); setRows((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="ctab">
      <div className="ctab__head">
        <div>
          <h3>מונים ומספרים</h3>
          <p className="ctab__muted">כל מספר שמופיע באתר. עריכה נשמרת אוטומטית.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={add}>+ מונה</button>
      </div>
      <div className="ctab__labels">
        <span>תווית</span><span>ערך</span><span>סיומת</span><span>היכן מופיע</span><span>מזהה</span><span>פעיל</span><span /><span />
      </div>
      {loading ? <p className="ctab__muted">טוען…</p> : rows.map((r) => <CounterRow key={r.id} row={r} onDelete={remove} />)}
    </div>
  )
}
