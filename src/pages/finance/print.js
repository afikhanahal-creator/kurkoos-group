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
