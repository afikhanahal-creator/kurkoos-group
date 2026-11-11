import { useEffect, useMemo, useRef, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import { DOC_TYPE, date, docDate, money } from './format.js'
import { Icon } from './ui.jsx'

/* ⌘K / Ctrl+K: one search across documents, suppliers, projects, companies, categories and screens */
export default function CommandPalette({ open, onClose, nav }) {
  const { documents, suppliers, projects, businesses, categories, go } = useFinance()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef(null)
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 10) } }, [open])
  const results = useMemo(() => {
    const n = q.trim().toLowerCase()
    const has = (...v) => v.some((x) => String(x ?? '').toLowerCase().includes(n))
    const out = []
    for (const p of nav) if (!n || has(p.label)) out.push({ group: 'מסכים', label: p.label, icon: p.icon, to: p.to })
    if (n) {
      for (const d of documents) if (has(d.supplier_name, d.doc_number, d.total_amount, d.file_name, d.description)) out.push({ group: 'מסמכים', label: `${d.supplier_name || d.file_name} · ${DOC_TYPE[d.doc_type] || ''} ${d.doc_number || ''}`, meta: `${money(d.total_amount, d.currency)} · ${date(docDate(d))}`, icon: 'docs', to: `/documents/${d.id}` })
      for (const s of suppliers) if (has(s.name, s.trading_name, s.vat_id)) out.push({ group: 'ספקים', label: s.name, meta: s.vat_id || '', icon: 'suppliers', to: `/suppliers/${s.id}` })
      for (const p of projects) if (has(p.name, p.code, p.location)) out.push({ group: 'פרויקטים', label: p.name, meta: p.code || '', icon: 'project', to: `/projects/${p.id}` })
      for (const b of businesses) if (has(b.name, b.vat_id, b.commercial_name)) out.push({ group: 'חברות', label: b.name, meta: b.vat_id || '', icon: 'company', to: `/companies/${b.id}` })
      for (const c of categories) if (has(c.name, c.name_en, c.accounting_code)) out.push({ group: 'קטגוריות', label: c.name, meta: c.accounting_code || '', icon: 'tag', to: `/categories/${c.id}` })
    }
    return out.slice(0, 40)
  }, [q, nav, documents, suppliers, projects, businesses, categories])
  if (!open) return null
  const pick = (r) => { onClose(); go(r.to) }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(results.length - 1, x + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
    else if (e.key === 'Enter' && results[i]) pick(results[i])
    else if (e.key === 'Escape') onClose()
  }
  let last = ''
  return (
    <div className="fin-cmd" role="dialog" aria-modal="true" aria-label="חיפוש">
      <button type="button" className="fin-cmd__scrim" aria-label="סגירה" tabIndex={-1} onClick={onClose} />
      <div className="fin-cmd__box">
        <label className="fin-cmd__input"><Icon name="search" size={19} /><input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} onKeyDown={onKey} placeholder="חיפוש מסמך, ספק, פרויקט, חברה או מסך" role="combobox" aria-expanded="true" aria-controls="fin-cmd-list" aria-activedescendant={results[i] ? `fin-cmd-${i}` : undefined} /><kbd>Esc</kbd></label>
        <ul className="fin-cmd__list" id="fin-cmd-list" role="listbox">
          {results.map((r, n) => {
            const head = r.group !== last ? (last = r.group) : null
            return (
              <li key={`${r.to}-${n}`} role="presentation">
                {head && <span className="fin-cmd__group">{head}</span>}
                <button type="button" id={`fin-cmd-${n}`} role="option" aria-selected={n === i} className={n === i ? 'is-on' : ''} onMouseEnter={() => setI(n)} onClick={() => pick(r)}>
                  <Icon name={r.icon} size={17} /><span>{r.label}</span>{r.meta && <small>{r.meta}</small>}
                </button>
              </li>
            )
          })}
          {!results.length && <li className="fin-cmd__empty">לא נמצא דבר עבור "{q}"</li>}
        </ul>
      </div>
    </div>
  )
}
