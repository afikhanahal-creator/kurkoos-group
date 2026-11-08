import { useEffect, useRef, useState } from 'react'
import ShareDialog from './ShareDialog.jsx'
import { loadPdf } from './Thumbnail.jsx'
import { Icon } from './ui.jsx'

const MAX_PAGES = 12
const STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5]

/* The original document, readable on any screen: PDF pages are drawn with pdf.js (an iframe shows only the first page
   on iPhone and nothing in some browsers), images and PDFs both zoom with the buttons, and the page scrolls inside the
   preview pane. */
export default function Viewer({ blobUrl, mime, name, doc }) {
  const box = useRef(null)
  const [pages, setPages] = useState(null)
  const [err, setErr] = useState('')
  const [zoom, setZoom] = useState(2)
  const [fitPage, setFitPage] = useState(false)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [imgRatio, setImgRatio] = useState(1.414)
  const [share, setShare] = useState(false)
  const [full, setFull] = useState(false)
  const pdf = mime === 'application/pdf'

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => { setWidth(Math.floor(e.contentRect.width)); setHeight(Math.floor(e.contentRect.height)) })
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

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const fit = Math.max(200, width - 32)
  const ratio = pdf ? (pages?.list?.[0]?.ratio || 1.414) : imgRatio
  // "fit page": the whole first page visible inside the pane
  const pageW = Math.max(160, Math.min(fit, Math.floor((height - 84) / ratio)))
  const w = fitPage ? pageW : Math.round(fit * STEPS[zoom])
  const pct = Math.round((w / fit) * 100)
  const zoomBy = (d) => { setFitPage(false); setZoom((z) => Math.max(0, Math.min(STEPS.length - 1, z + d))) }
  const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else box.current?.requestFullscreen?.().catch(() => {}) }
  const print = () => {
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0'
    f.src = pdf ? blobUrl : 'about:blank'
    document.body.appendChild(f)
    const go = () => { try { f.contentWindow.focus(); f.contentWindow.print() } catch { window.open(blobUrl, '_blank') } setTimeout(() => f.remove(), 60_000) }
    if (pdf) f.onload = () => setTimeout(go, 250)
    else { f.contentDocument.write(`<img src="${blobUrl}" style="max-width:100%" onload="setTimeout(()=>print(),100)">`); f.contentDocument.close() }
  }
  const controls = (
    <div className="fin-viewer__bar" role="toolbar" aria-label="תצוגת המסמך">
      <button type="button" className="fin-icon-btn" onClick={() => zoomBy(-1)} disabled={!fitPage && zoom === 0} aria-label="הקטנה" title="הקטנה"><Icon name="minus" size={17} /></button>
      <button type="button" className="fin-viewer__pct" onClick={() => { setFitPage(false); setZoom(2) }} aria-label="התאמה לרוחב" title="התאמה לרוחב">{pct}%</button>
      <button type="button" className="fin-icon-btn" onClick={() => zoomBy(1)} disabled={!fitPage && zoom === STEPS.length - 1} aria-label="הגדלה" title="הגדלה"><Icon name="plus" size={17} /></button>
      <span className="fin-viewer__sep" aria-hidden="true" />
      <button type="button" className={`fin-icon-btn ${fitPage ? 'is-on' : ''}`} onClick={() => setFitPage((v) => !v)} aria-pressed={fitPage} aria-label="התאמה למסך" title="התאמה למסך"><Icon name="fitpage" size={17} /></button>
      <button type="button" className="fin-icon-btn fin-viewer__wide" onClick={fullscreen} aria-label={full ? 'יציאה ממסך מלא' : 'מסך מלא'} title={full ? 'יציאה ממסך מלא' : 'מסך מלא'}><Icon name={full ? 'shrink' : 'expand'} size={17} /></button>
      <span className="fin-viewer__sep" aria-hidden="true" />
      <a className="fin-icon-btn" href={blobUrl} download={name || 'document'} aria-label="הורדה" title="הורדת הקובץ המקורי"><Icon name="download" size={17} /></a>
      <button type="button" className="fin-icon-btn fin-viewer__wide" onClick={print} aria-label="הדפסה" title="הדפסה"><Icon name="print" size={17} /></button>
      {doc && <button type="button" className="fin-icon-btn" onClick={() => setShare(true)} aria-label="שיתוף" title="שיתוף בוואטסאפ"><Icon name="share" size={17} /></button>}
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
        ) : <img className="fin-viewer__page" src={blobUrl} alt={name || 'המסמך'} style={{ width: w }} onLoad={(e) => setImgRatio(e.currentTarget.naturalHeight / Math.max(1, e.currentTarget.naturalWidth))} />}
      </div>
      {share && <ShareDialog doc={doc} blobUrl={blobUrl} onClose={() => setShare(false)} />}
    </div>
  )
}
