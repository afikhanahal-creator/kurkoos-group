import { useEffect, useRef, useState } from 'react'
import { loadPdf } from './Thumbnail.jsx'
import { Icon } from './ui.jsx'

const MAX_PAGES = 12
const STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5]

/* The original document, readable on any screen: PDF pages are drawn with pdf.js (an iframe shows only the first page
   on iPhone and nothing in some browsers), images and PDFs both zoom with the buttons, and the page scrolls inside the
   preview pane. */
export default function Viewer({ blobUrl, mime, name }) {
  const box = useRef(null)
  const [pages, setPages] = useState(null)
  const [err, setErr] = useState('')
  const [zoom, setZoom] = useState(2)
  const [width, setWidth] = useState(0)
  const pdf = mime === 'application/pdf'

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!pdf || !blobUrl) return undefined
    let alive = true; let doc = null
    ;(async () => {
      try {
        const lib = await loadPdf()
        doc = await lib.getDocument({ url: blobUrl, isEvalSupported: false }).promise
        const out = []
        for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
          const page = await doc.getPage(i)
          const vp = page.getViewport({ scale: 1 })
          const scale = Math.min(2.4, (1400 / vp.width))
          const v = page.getViewport({ scale })
          const c = document.createElement('canvas')
          c.width = v.width; c.height = v.height
          await page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise
          out.push({ src: c.toDataURL('image/png'), ratio: v.height / v.width })
          if (!alive) return
        }
        if (alive) setPages({ list: out, total: doc.numPages })
      } catch (e) { if (alive) setErr(String(e.message || e)) }
    })()
    return () => { alive = false; doc?.destroy?.() }
  }, [blobUrl, pdf])

  const fit = Math.max(200, width - 32)
  const w = Math.round(fit * STEPS[zoom])
  const controls = (
    <div className="fin-viewer__bar" role="toolbar" aria-label="תצוגת המסמך">
      <button type="button" className="fin-icon-btn" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="הקטנה"><Icon name="minus" size={17} /></button>
      <button type="button" className="fin-viewer__pct" onClick={() => setZoom(2)} aria-label="התאמה לרוחב">{Math.round(STEPS[zoom] * 100)}%</button>
      <button type="button" className="fin-icon-btn" onClick={() => setZoom((z) => Math.min(STEPS.length - 1, z + 1))} disabled={zoom === STEPS.length - 1} aria-label="הגדלה"><Icon name="plus" size={17} /></button>
      <a className="fin-icon-btn" href={blobUrl} target="_blank" rel="noopener noreferrer" aria-label="פתיחה בחלון חדש"><Icon name="external" size={17} /></a>
    </div>
  )

  return (
    <div className="fin-viewer" ref={box}>
      {controls}
      <div className="fin-viewer__scroll" tabIndex={0} aria-label={name || 'המסמך'}>
        {pdf ? (
          err ? <p className="fin-error fin-error--block">לא הצלחנו להציג את ה-PDF: {err}. <a href={blobUrl} target="_blank" rel="noopener noreferrer">פתיחה בחלון חדש</a></p>
            : !pages ? <div className="fin-viewer__page fin-viewer__page--skel" style={{ width: w, height: Math.round(w * 1.414) }} aria-busy="true" aria-label="טוען את המסמך" />
            : <>
              {pages.list.map((p, i) => <img key={i} className="fin-viewer__page" src={p.src} alt={`${name || 'המסמך'}, עמוד ${i + 1}`} style={{ width: w, height: Math.round(w * p.ratio) }} />)}
              {pages.total > MAX_PAGES && <p className="fin-muted">מוצגים {MAX_PAGES} עמודים מתוך {pages.total}. <a href={blobUrl} target="_blank" rel="noopener noreferrer">לכל המסמך</a></p>}
            </>
        ) : <img className="fin-viewer__page" src={blobUrl} alt={name || 'המסמך'} style={{ width: w }} />}
      </div>
    </div>
  )
}
