import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, SOURCE, date, docDate, money, monthKey, monthLabel } from './format.js'
import { Empty, Icon, StatusPill, UploadZone } from './ui.jsx'
import DocumentPanel from './DocumentPanel.jsx'

const TABS = [
  { id: '', label: 'הכול' },
  { id: 'review', label: 'לבדיקה' },
  { id: 'approved', label: 'מאושרים' },
  { id: 'sent', label: 'נשלחו' },
  { id: 'problems', label: 'בעיות' },
]
const inTab = (d, tab) => {
  if (!tab) return !['rejected', 'duplicate'].includes(d.status)
  if (tab === 'problems') return ['failed', 'duplicate', 'rejected', 'processing'].includes(d.status)
  return d.status === tab
}

export default function Documents() {
  const { documents, businesses, categories, reload, patchDoc, go } = useFinance()
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get('status') || ''
  const [q, setQ] = useState(() => params.get('q') || '')
  const [month, setMonth] = useState('')
  const [biz, setBiz] = useState('')
  const [cat, setCat] = useState('')
  const [source, setSource] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [busy, setBusy] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const months = useMemo(() => [...new Set(documents.map((d) => monthKey(docDate(d))).filter(Boolean))].sort().reverse(), [documents])
  const bizName = (bid) => businesses.find((b) => b.id === bid)?.name || ''

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return documents.filter((d) => inTab(d, tab)
      && (!month || monthKey(docDate(d)) === month)
      && (!biz || d.business_id === biz)
      && (!cat || d.category === cat)
      && (!source || d.source === source)
      && (!needle || [d.supplier_name, d.doc_number, d.description, d.file_name, d.email_subject, d.supplier_vat_id, String(d.total_amount ?? '')].some((v) => String(v || '').toLowerCase().includes(needle))))
      .sort((a, b) => String(docDate(b)).localeCompare(String(docDate(a))))
  }, [documents, tab, month, biz, cat, source, q])

  const total = rows.reduce((s, d) => s + (d.doc_type === 'credit' ? -1 : 1) * (Number(d.total_amount) || 0), 0)
  const allOn = rows.length > 0 && rows.every((d) => sel.has(d.id))
  const toggle = (did) => setSel((s) => { const n = new Set(s); if (n.has(did)) n.delete(did); else n.add(did); return n })

  const bulk = async (status) => {
    setBusy(status)
    try {
      await api.updateDocuments([...sel], { status, ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}) })
      setSel(new Set())
      await reload()
    } catch (e) { alert(e.message) } finally { setBusy('') }
  }

  const idx = rows.findIndex((d) => d.id === id)
  const current = id ? documents.find((d) => d.id === id) : null

  return (
    <div className="fin-stack">
      <div className="fin-tabs" role="tablist" aria-label="סטטוס">
        {TABS.map((t) => {
          const n = documents.filter((d) => inTab(d, t.id)).length
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`fin-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => { const p = new URLSearchParams(params); if (t.id) p.set('status', t.id); else p.delete('status'); setParams(p); setSel(new Set()) }}>
              {t.label} <em>{n}</em>
            </button>
          )
        })}
        <button type="button" className="fin-btn fin-btn--primary fin-tabs__cta" onClick={() => setShowUpload((v) => !v)}><Icon name="plus" size={18} /> הוספת מסמכים</button>
      </div>

      {showUpload && <UploadZone businessId={biz} onDone={reload} />}

      <div className="fin-filters">
        <label className="fin-search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="חיפוש ספק, מספר חשבונית, סכום…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש" />
        </label>
        <select className="fin-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="חודש">
          <option value="">כל החודשים</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        {businesses.length > 1 && (
          <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה">
            <option value="">כל החברות</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select className="fin-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="קטגוריה">
          <option value="">כל הקטגוריות</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select className="fin-select" value={source} onChange={(e) => setSource(e.target.value)} aria-label="מקור">
          <option value="">כל המקורות</option>
          {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {sel.size > 0 && (
        <div className="fin-bulk" role="region" aria-label="פעולות על המסומנים">
          <strong>{sel.size} מסומנים</strong>
          <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy} onClick={() => bulk('approved')}><Icon name="check" size={18} /> אישור</button>
          <button type="button" className="fin-btn" disabled={!!busy} onClick={() => bulk('sent')}>סימון כנשלח לרו״ח</button>
          <button type="button" className="fin-btn" disabled={!!busy} onClick={() => bulk('rejected')}>דחייה</button>
          <button type="button" className="fin-link" onClick={() => setSel(new Set())}>ביטול סימון</button>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty title={documents.length ? 'אין מסמכים שמתאימים לסינון' : 'עוד אין מסמכים'} action={!documents.length && <button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/mailboxes')}>חיבור תיבת מייל</button>}>
          {documents.length ? 'נסו להסיר חלק מהמסננים.' : 'חברו תיבת Gmail כדי שהחשבוניות ייאספו לבד, או העלו קבצים ידנית.'}
        </Empty>
      ) : (
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="fin-table__check"><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((d) => d.id)))} aria-label="סימון הכול" /></th>
                <th>תאריך</th>
                <th>ספק</th>
                <th className="fin-hide-sm">סוג ומספר</th>
                <th className="fin-hide-sm">קטגוריה</th>
                {businesses.length > 1 && <th className="fin-hide-md">חברה</th>}
                <th className="fin-num">מע״מ</th>
                <th className="fin-num">סה״כ</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className={d.id === id ? 'is-current' : ''} onClick={() => go(`/documents/${d.id}${tab ? `?status=${tab}` : ''}`)}>
                  <td className="fin-table__check" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} aria-label={`סימון ${d.supplier_name || d.file_name}`} /></td>
                  <td>{date(docDate(d))}</td>
                  <td>
                    <span className="fin-cell-main">{d.supplier_name || <em className="fin-muted">{d.file_name}</em>}</span>
                    <small className="fin-cell-sub">{SOURCE[d.source]}{d.description ? ` · ${d.description}` : ''}</small>
                  </td>
                  <td className="fin-hide-sm">{DOC_TYPE[d.doc_type] || ''}{d.doc_number ? ` ${d.doc_number}` : ''}</td>
                  <td className="fin-hide-sm">{d.category || '—'}</td>
                  {businesses.length > 1 && <td className="fin-hide-md">{bizName(d.business_id)}</td>}
                  <td className="fin-num">{money(d.vat_amount, d.currency)}</td>
                  <td className="fin-num"><strong>{money(d.total_amount, d.currency)}</strong></td>
                  <td><StatusPill status={d.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={businesses.length > 1 ? 7 : 6}>{rows.length} מסמכים</td><td className="fin-num"><strong>{money(total)}</strong></td><td /></tr>
            </tfoot>
          </table>
        </div>
      )}

      {current && (
        <DocumentPanel
          key={current.id}
          doc={current}
          onClose={() => go(`/documents${tab ? `?status=${tab}` : ''}`)}
          onSaved={patchDoc}
          onDeleted={async () => { await reload(); go('/documents') }}
          onPrev={idx > 0 ? () => go(`/documents/${rows[idx - 1].id}${tab ? `?status=${tab}` : ''}`) : null}
          onNext={idx >= 0 && idx < rows.length - 1 ? () => go(`/documents/${rows[idx + 1].id}${tab ? `?status=${tab}` : ''}`) : null}
        />
      )}
    </div>
  )
}
