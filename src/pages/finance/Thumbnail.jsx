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
async function render(doc) {
  const blob = await api.fileBlob(doc)
  if ((doc.file_mime || '').startsWith('image/')) return URL.createObjectURL(blob)
  if ((doc.file_mime || '').startsWith('text/')) return { text: (await blob.text()).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220) }
  const lib = await loadPdf()
  const pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise
  const page = await pdf.getPage(1)
  const vp = page.getViewport({ scale: 1 })
  const scale = 360 / vp.width
  const canvas = document.createElement('canvas')
  const v = page.getViewport({ scale })
  canvas.width = v.width; canvas.height = v.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise
  pdf.destroy()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function Thumbnail({ doc }) {
  const box = useRef(null)
  const [src, setSrc] = useState(() => cache.get(doc.file_path) || null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (src || !doc.file_path) return undefined
    let alive = true
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      try {
        if (!cache.has(doc.file_path)) cache.set(doc.file_path, render(doc))
        const r = await cache.get(doc.file_path)
        if (alive) setSrc(r)
      } catch { if (alive) setFailed(true) }
    }, { rootMargin: '200px' })
    if (box.current) io.observe(box.current)
    return () => { alive = false; io.disconnect() }
  }, [doc.file_path]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fin-thumb" ref={box} aria-hidden="true">
      {src && typeof src === 'string' && <img src={src} alt="" />}
      {src && typeof src === 'object' && <p className="fin-thumb__text">{src.text}</p>}
      {!src && <span className={`fin-thumb__ph ${failed ? '' : 'is-loading'}`}>{(doc.file_mime || '').includes('pdf') ? 'PDF' : (doc.file_mime || '').startsWith('text/') ? 'מייל' : 'קובץ'}</span>}
    </div>
  )
}
