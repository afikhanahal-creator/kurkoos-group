import { useEffect, useRef, useState } from 'react'
import * as api from './api.js'

/* The first page of the real document, drawn small. PDFs through pdf.js (loaded only when a card appears),
   images as they are, emails as a short text preview. Cached for the session. */
const cache = new Map()
let pdfjs = null
export async function loadPdf() {
  if (!pdfjs) {
    const [lib, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
    lib.GlobalWorkerOptions.workerSrc = worker.default
    pdfjs = lib
  }
  return pdfjs
}
/* the first page of a TIFF (a scanner or a fax) as a PNG data URL: browsers do not show TIFF. utif loads only when a
   TIFF is shown. `width` scales it down for a thumbnail. */
export async function tiffPreview(buf, width) {
  const UTIF = (await import('utif')).default
  const ifds = UTIF.decode(buf)
  UTIF.decodeImage(buf, ifds[0])
  const w = ifds[0].width; const h = ifds[0].height
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(ifds[0])), w, h), 0, 0)
  if (!width || width >= w) return c.toDataURL('image/png')
  const s = document.createElement('canvas'); s.width = width; s.height = Math.round((h * width) / w)
  s.getContext('2d').drawImage(c, 0, 0, s.width, s.height)
  return s.toDataURL('image/jpeg', 0.85)
}
const OFFICE = (mime) => (String(mime).includes('wordprocessing') ? 'Word' : String(mime).includes('spreadsheet') ? 'Excel' : '')
async function render(doc, width = 360) {
  const blob = await api.fileBlob(doc)
  if (doc.file_mime === 'image/tiff') return tiffPreview(await blob.arrayBuffer(), width)
  if (OFFICE(doc.file_mime)) return { text: `${OFFICE(doc.file_mime)} · ${doc.file_name || ''}` }
  if ((doc.file_mime || '').startsWith('image/')) return URL.createObjectURL(blob)
  // a receipt that is the body of an email: the large preview shows the email itself (in a frame that cannot run
  // scripts or load anything by itself), the small one a few words of it
  if ((doc.file_mime || '').startsWith('text/') && width > 400) return { html: await blob.text() }
  if ((doc.file_mime || '').startsWith('text/')) return { text: (await blob.text()).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220) }
  const lib = await loadPdf()
  const pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise
  const page = await pdf.getPage(1)
  const vp = page.getViewport({ scale: 1 })
  const scale = width / vp.width
  const canvas = document.createElement('canvas')
  const v = page.getViewport({ scale })
  canvas.width = v.width; canvas.height = v.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise
  pdf.destroy()
  return canvas.toDataURL('image/jpeg', 0.82)
}

/* start drawing before it is needed (a row the pointer entered): the floating preview then opens already drawn */
export function prefetchThumb(doc, size = 'lg') {
  if (!doc?.file_path) return
  const key = size === 'lg' ? `${doc.file_path}@lg` : doc.file_path
  if (!cache.has(key)) cache.set(key, render(doc, size === 'lg' ? 880 : 360).catch((e) => { cache.delete(key); throw e }))
}

export default function Thumbnail({ doc, size }) {
  const key = size === 'lg' ? `${doc.file_path}@lg` : doc.file_path
  const box = useRef(null)
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (src || !doc.file_path) return undefined
    let alive = true
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      try {
        if (!cache.has(key)) cache.set(key, render(doc, size === 'lg' ? 880 : 360))
        const r = await cache.get(key)
        if (alive) setSrc(r)
      } catch { if (alive) setFailed(true) }
    }, { rootMargin: '200px' })
    if (box.current) io.observe(box.current)
    return () => { alive = false; io.disconnect() }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fin-thumb" ref={box} aria-hidden="true">
      {src && typeof src === 'string' && <img src={src} alt="" />}
      {src && typeof src === 'object' && src.html && <span className="fin-thumb__mail"><iframe title="" sandbox="" srcDoc={src.html} tabIndex={-1} /></span>}
      {src && typeof src === 'object' && !src.html && <p className="fin-thumb__text">{src.text}</p>}
      {!src && <span className={`fin-thumb__ph ${failed ? 'is-failed' : 'is-loading'}`}>{(doc.file_mime || '').includes('pdf') ? 'PDF' : (doc.file_mime || '').startsWith('text/') ? 'מייל' : OFFICE(doc.file_mime) || (doc.file_mime === 'image/tiff' ? 'TIFF' : 'קובץ')}{failed && <small>אין תצוגה מקדימה</small>}</span>}
    </div>
  )
}
