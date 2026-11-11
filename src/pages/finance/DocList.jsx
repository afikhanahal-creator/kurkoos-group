import { DOC_TYPE, date, docDate, money, nameOf } from './format.js'
import { Icon, StatusPill } from './ui.jsx'

/* Documents as a compact list, one row each: what it is, from whom, when, how much, and where it stands. The same rows on
   a phone and on a desktop. A row opens the document; with `sel` it also has a check box for the bulk actions.
   docs: [{ doc, amount? }] (amount overrides the document total, e.g. a project's share of a split invoice) */
export default function DocList({ docs, onOpen, businesses, sel, onToggle, onSupplier, showCompany = true, flags = true, marks, rowProps, rowClass }) {
  return (
    <ul className="fin-dlist" aria-label="מסמכים">
      {docs.map(({ doc: d, amount, note }) => {
        const confirm = flags && d.status === 'review' && (d.issues || []).some((i) => i.code === 'needs_confirmation')
        const dup = flags && d.status === 'review' && d.duplicate_state === 'suspected'
        const company = showCompany && businesses ? nameOf(businesses, d.business_id) : ''
        const sub = [DOC_TYPE[d.doc_type], d.doc_number, company || (showCompany && businesses ? 'לא משויך' : '')].filter(Boolean)
        return (
          <li key={d.id} {...(rowProps ? rowProps(d) : {})} data-month={marks?.get(d.id)} className={`fin-dlist__row ${sel?.has(d.id) ? 'is-selected' : ''} ${rowClass ? rowClass(d) : ''}`}>
            {onToggle && <label className="fin-dlist__check"><input type="checkbox" checked={!!sel?.has(d.id)} onChange={() => onToggle(d.id)} aria-label={`סימון ${d.supplier_name || d.file_name || 'מסמך'}`} /></label>}
            <button type="button" className="fin-dlist__open" onClick={() => onOpen(d)}>
              <span className={`fin-dlist__icon ${d.doc_type === 'credit' ? 'is-credit' : ''}`} aria-hidden="true"><Icon name={d.source === 'whatsapp' ? 'phone' : d.source === 'upload' ? 'upload' : 'docs'} size={18} /></span>
              <span className="fin-dlist__main">
                <strong>{d.supplier_name || d.file_name || 'מסמך'}</strong>
                <small>
                  {confirm && <span className="fin-duppill is-confirm">לאישור</span>}
                  {dup && <span className="fin-duppill">כפול?</span>}
                  {sub.map((x, i) => <span key={i} className={x === 'לא משויך' ? 'fin-attn-text' : ''}>{x}</span>)}
                  {note && <span>{note}</span>}
                  <span className="fin-dlist__mdate">{date(docDate(d))}</span>
                </small>
              </span>
              <span className="fin-dlist__side">
                <b>{d.total_amount != null || amount != null ? money(amount ?? d.total_amount, d.currency) : '—'}</b>
                <small>{date(docDate(d))}</small>
              </span>
              <span className="fin-dlist__status"><StatusPill status={d.status} /></span>
            </button>
            {onSupplier && d.supplier_name && <button type="button" className="fin-icon-btn fin-suphist fin-dlist__hist" onClick={() => onSupplier(d)} aria-label={`כל ההיסטוריה עם ${d.supplier_name}`} title={`כל ההיסטוריה עם ${d.supplier_name}`}><Icon name="history" size={16} /></button>}
          </li>
        )
      })}
    </ul>
  )
}
