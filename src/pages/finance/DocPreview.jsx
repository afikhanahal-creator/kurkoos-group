import { useEffect, useState } from 'react'
import * as api from './api.js'
import Viewer from './Viewer.jsx'

/* the original file of a document, as large as its container: a PDF or an image in the viewer, an email body in a sandboxed frame */
export default function DocPreview({ doc }) {
  const [src, setSrc] = useState(null)
  const [html, setHtml] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    let url = null
    setSrc(null); setHtml(null); setErr('')
    if (!doc.file_path) return undefined
    ;(async () => {
      try {
        const b = await api.fileBlob(doc)
        if ((doc.file_mime || '').startsWith('text/')) { if (alive) setHtml(await b.text()) } else { url = URL.createObjectURL(b); if (alive) setSrc(url) }
      } catch (e) { if (alive) setErr(e.message) }
    })()
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [doc.id, doc.file_path, doc.file_mime])
  if (!doc.file_path) return <p className="fin-muted">למסמך הזה אין קובץ מקור.</p>
  if (err) return <p className="fin-error fin-error--block" role="alert">הקובץ לא נטען: {err}</p>
  if (html !== null) return <iframe className="fin-preview__frame" title="המייל המקורי" sandbox="" srcDoc={html} />
  if (!src) return <div className="fin-viewer"><div className="fin-viewer__scroll"><div className="fin-viewer__page fin-viewer__page--skel" aria-busy="true" aria-label="טוען את המסמך" /></div></div>
  return <Viewer blobUrl={src} mime={doc.file_mime} name={doc.file_name} doc={doc} />
}
