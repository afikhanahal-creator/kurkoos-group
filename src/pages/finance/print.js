import { escHtml as esc } from './format.js'
// Printing a document from the browser. Pages go to a hidden frame as images (works on phones too, where a PDF inside
// a frame cannot be printed); an email body goes to a frame that may not run scripts.
const frame = (attrs = {}) => {
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;inset-inline-start:0;bottom:0;width:0;height:0;border:0;opacity:0'
  f.setAttribute('aria-hidden', 'true')
  for (const [k, v] of Object.entries(attrs)) f.setAttribute(k, v)
  document.body.appendChild(f)
  setTimeout(() => f.remove(), 120_000)
  return f
}
const run = (f, fallback) => { try { f.contentWindow.focus(); f.contentWindow.print() } catch { fallback?.() } }

export function printImages(srcs, fallback) {
  const f = frame()
  const d = f.contentDocument
  d.open()
  d.write(`<!doctype html><html><head><style>@page{margin:8mm}html,body{margin:0}img{display:block;width:100%;height:auto;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>${srcs.map((s) => `<img src="${String(s).replace(/"/g, '&quot;')}">`).join('')}</body></html>`)
  d.close()
  const imgs = [...d.images]
  let left = imgs.filter((i) => !i.complete).length
  const go = () => setTimeout(() => run(f, fallback), 150)
  if (!left) return go()
  for (const i of imgs) if (!i.complete) i.onload = i.onerror = () => { left -= 1; if (!left) go() }
}

export function printPdf(blobUrl) {
  const f = frame()
  f.onload = () => setTimeout(() => run(f, () => window.open(blobUrl, '_blank', 'noopener')), 250)
  f.src = blobUrl
}

export function printHtml(html) {
  // same-origin so this page may ask the frame to print; no allow-scripts, so nothing in the email can run
  const f = frame({ sandbox: 'allow-same-origin allow-modals' })
  f.onload = () => setTimeout(() => run(f), 200)
  f.srcdoc = html
}

/* Several documents printed one after another in one print job: every page of every document on a page of its own, in
   the order chosen. A PDF becomes its pages (pdf.js, up to 30 pages a document), a photo stays as it is, a TIFF is shown
   by its first page, and an email body (a receipt that lives in the email) is printed as it reads. The files come from
   the same in-memory cache the viewer uses. onProgress(done, total) reports as each document is ready. Returns what
   could not be printed (a Word file, a damaged file), so the screen can say so. */
const MAX_PDF_PAGES = 30
async function pdfPages(blob) {
  const { loadPdf } = await import('./Thumbnail.jsx')
  const lib = await loadPdf()
  const pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
  const out = []
  for (let i = 1; i <= Math.min(pdf.numPages, MAX_PDF_PAGES); i++) {
    const page = await pdf.getPage(i)
    const vp = page.getViewport({ scale: 2 })   // about 150 dpi on A4: sharp on paper, light in memory
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height)
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    await page.render({ canvasContext: g, viewport: vp }).promise
    out.push(c.toDataURL('image/jpeg', 0.9))
  }
  return out
}
export async function printDocs(docs, { fileBlob, onProgress } = {}) {
  const parts = []; const skipped = []
  let done = 0
  for (const d of docs) {
    const title = [d.supplier_name || d.file_name || 'מסמך', d.doc_number].filter(Boolean).join(' · ')
    try {
      if (!d.file_path) { skipped.push(`${title}: אין קובץ`); continue }
      const blob = await fileBlob(d)
      const mime = d.file_mime || blob.type || ''
      if (mime === 'application/pdf') { for (const src of await pdfPages(blob)) parts.push(`<img src="${src}" alt="">`) }
      else if (mime === 'image/tiff') { const { tiffPreview } = await import('./Thumbnail.jsx'); parts.push(`<img src="${await tiffPreview(await blob.arrayBuffer())}" alt="">`) }
      else if (mime.startsWith('image/')) parts.push(`<img src="${URL.createObjectURL(blob)}" alt="">`)
      else if (mime.startsWith('text/')) {
        // an email body: its own markup without scripts, styles kept inside its box
        const html = (await blob.text()).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<\/?(html|head|body)[^>]*>/gi, '')
        parts.push(`<section class="mail"><p class="cap">${esc(title)}</p>${html}</section>`)
      } else skipped.push(`${title}: קובץ שלא ניתן להדפיס מהדפדפן`)
    } catch { skipped.push(`${title}: הקובץ לא נטען`) }
    onProgress?.(++done, docs.length)
  }
  if (!parts.length) return { printed: 0, skipped }
  const page = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>הדפסת מסמכים</title><style>
@page{margin:8mm}html,body{margin:0;background:#fff}
img{display:block;max-width:100%;max-height:277mm;margin:0 auto;object-fit:contain;break-after:page;page-break-after:always}
section.mail{break-after:page;page-break-after:always;font-family:Arial,sans-serif;font-size:12px;overflow:hidden}
.cap{font:700 13px Arial,sans-serif;color:#07293a;margin:0 0 8px}
body>*:last-child{break-after:auto;page-break-after:auto}</style></head><body>${parts.join('')}</body></html>`
  return { printed: docs.length - skipped.length, skipped, page }
}
