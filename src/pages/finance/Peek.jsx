import { useState } from 'react'
import { DOC_TYPE, date, docDate, money } from './format.js'
import Thumbnail from './Thumbnail.jsx'
import { Icon, StatusPill } from './ui.jsx'

/* The document itself, floating beside whatever the pointer rests on (a supplier's name, a row). Every kind is shown:
   a PDF or an image as its first page, a receipt that is the body of an email as that email, an office file by what
   it is, and a record with no file as its details with a plain note that the file is missing. Pointer devices only. */
export function PeekCard({ doc }) {
  return (
    <>
      <span className="fin-peek__head"><strong>{doc.supplier_name || doc.file_name || 'מסמך'}</strong><StatusPill status={doc.status} /></span>
      <span className="fin-peek__doc">
        {doc.file_path ? <Thumbnail doc={doc} size="lg" /> : (
          <span className="fin-peek__nofile">
            <Icon name="alert" size={22} />
            <b>אין קובץ מצורף לרשומה הזו</b>
            <span>{doc.description || 'הפרטים נרשמו בלי קובץ מקור. אפשר לצרף אותו מתוך המסמך.'}</span>
          </span>
        )}
      </span>
      <span className="fin-peek__foot"><small>{[DOC_TYPE[doc.doc_type], doc.doc_number, date(docDate(doc))].filter(Boolean).join(' · ')}</small>{doc.total_amount != null && <b>{money(doc.total_amount, doc.currency)}</b>}</span>
    </>
  )
}

export default function Peek({ doc, children, className = '' }) {
  const [pos, setPos] = useState(null)
  const enter = (e) => {
    if (!doc || !window.matchMedia('(hover: hover)').matches) return
    const r = e.currentTarget.getBoundingClientRect(); const W = 440; const H = 640
    const right = innerWidth - r.left + 16
    setPos({ right: right + W > innerWidth - 8 ? Math.max(8, innerWidth - r.right) : right, top: Math.max(12, Math.min(innerHeight - H - 12, r.top + r.height / 2 - H / 2)) })
  }
  return (
    <span className={`fin-peek ${className}`} onMouseEnter={enter} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && doc && <span className="fin-peek__pop" style={{ top: pos.top, right: pos.right }} aria-hidden="true"><PeekCard doc={doc} /></span>}
    </span>
  )
}
