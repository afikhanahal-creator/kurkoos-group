// Kurkoos creative studio · core
// Brand bundle, fonts, Hebrew typesetting, image analysis, scene renderer (canvas and SVG).
// A design is a plain JSON "scene": { v, format, w, h, direction, opts, content, layers:[...] }.
// Layers are drawn in order. Coordinates are pixels at export size.

export const BRAND_URL = new URL('./brand.gen.json', import.meta.url).href
let BRAND = null
export async function loadBrand() {
  if (BRAND) return BRAND
  BRAND = await (await fetch(BRAND_URL, { cache: 'no-cache' })).json()
  return BRAND
}
export const brand = () => BRAND
export const hex = (name) => (BRAND && BRAND.hex[name]) || name
export const ALLOWED_FAMILIES = ['Heebo', 'Almoni']

// ---------------------------------------------------------------- fonts
let fontsP = null
export function loadFonts() {
  if (fontsP) return fontsP
  fontsP = (async () => {
    const base = new URL('/fonts/', location.origin).href
    const faces = [[300, 'almoni-300'], [400, 'almoni-400'], [700, 'almoni-700']].map(([w, f]) =>
      new FontFace('Almoni', `url(${base}${f}.woff2) format("woff2")`, { weight: String(w) }))
    for (const f of faces) { try { document.fonts.add(await f.load()) } catch (e) { console.warn('font', e) } }
    if (!document.querySelector('link[data-heebo]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.heebo = '1'
      l.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@300..900&display=block'
      document.head.appendChild(l)
      await new Promise((ok) => { l.onload = ok; l.onerror = ok; setTimeout(ok, 4000) })
    }
    const probe = 'אבגד ABC 123'
    await Promise.all([300, 400, 700, 800, 900].map((w) => document.fonts.load(`${w} 40px Heebo`, probe).catch(() => {})))
    await Promise.all([300, 400, 700].map((w) => document.fonts.load(`${w} 40px Almoni`, probe).catch(() => {})))
    return fontStatus()
  })()
  return fontsP
}
export function fontStatus() {
  const ok = (f) => { try { return document.fonts.check(f, 'א') } catch (e) { return false } }
  return { heebo: ok('900 40px Heebo'), almoni: ok('400 40px Almoni') && ok('700 40px Almoni') }
}
// Almoni has 300/400/700 only. Map any request to a weight that really exists.
export function realWeight(family, w) {
  w = +w || 400
  if (family === 'Almoni') return w <= 300 ? 300 : w < 600 ? 400 : 700
  return Math.max(300, Math.min(900, Math.round(w / 100) * 100))
}

// ---------------------------------------------------------------- Hebrew typesetting
const HEB = /[֐-׿]/
const ONE_LETTER = /^[ובלהמשכ]$/
const UNITS = /^(מ["״]ר|מ׳|מטר|מטרים|חדרים|חדר|קומות|קומה|יח["״]ד|דונם|%|₪|ש["״]ח|שנים|שנה|חודשים|ימים|פרויקטים|משפחות|בתים|וילות)[.,:]?$/
// Large type deserves real Hebrew punctuation: gershayim and geresh, not straight quotes.
export function hebPunct(s) {
  return String(s || '')
    .replace(/([א-ת])"([א-ת])/g, '$1״$2')
    .replace(/([א-ת])'(?=[\s.,:;!?]|$)/g, '$1׳')
    .replace(/[ \t]+/g, ' ')
    .trim()
}
// Tokens that must stay together on one line.
export function tokens(s) {
  const words = String(s).split(/ +/).filter(Boolean)
  const out = []
  for (let i = 0; i < words.length; i++) {
    let w = words[i]
    while (i + 1 < words.length && (ONE_LETTER.test(w.slice(-1) === w ? w : '#') || ONE_LETTER.test(w))) { w += ' ' + words[++i] }
    if (out.length && (UNITS.test(w) || /^[,.:;!?]/.test(w)) && /\d/.test(out[out.length - 1])) { out[out.length - 1] += ' ' + w; continue }
    out.push(w)
  }
  return out
}
export function fontCss(L, size) {
  const fam = L.family === 'Almoni' ? "Almoni, 'Assistant', sans-serif" : "Heebo, 'Assistant', sans-serif"
  return `${realWeight(L.family, L.weight)} ${size}px ${fam}`
}
function measureWith(ctx, L, size) {
  ctx.font = fontCss(L, size)
  try { ctx.letterSpacing = ((L.track || 0) * size).toFixed(2) + 'px' } catch (e) {}
  return (t) => ctx.measureText(t).width
}
function wrap(measure, paragraphs, width) {
  const lines = []; let overflowWord = false
  for (const para of paragraphs) {
    const toks = tokens(para); let cur = ''
    if (!toks.length) { lines.push(''); continue }
    for (const t of toks) {
      const next = cur ? cur + ' ' + t : t
      if (measure(next) <= width || !cur) { if (!cur && measure(t) > width) overflowWord = true; cur = next } else { lines.push(cur); cur = t }
    }
    lines.push(cur)
  }
  return { lines, overflowWord }
}
// Lay out a text layer: fits the size between fit.min and fit.max, keeps maxLines, balances headlines.
const _mc = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
export function layoutText(L, ctx) {
  ctx = ctx || _mc
  const text = L.punct === false ? String(L.text || '') : hebPunct(L.text)
  const paras = text.split('\n')
  const lh = L.lh || 1.15
  const maxLines = L.maxLines || 99
  const tryAt = (size, width) => {
    const m = measureWith(ctx, L, size)
    const r = wrap(m, paras, width)
    const height = r.lines.length * size * lh
    const widest = Math.max(0, ...r.lines.map(m))
    return { size, lines: r.lines, height, widest, ok: !r.overflowWord && r.lines.length <= maxLines && height <= L.h + 0.5, m }
  }
  let best = null
  if (L.fit) {
    let lo = L.fit.min, hi = L.fit.max
    const top = tryAt(hi, L.w); if (top.ok) best = top
    else {
      for (let k = 0; k < 14 && hi - lo > 0.5; k++) { const mid = (lo + hi) / 2; const r = tryAt(mid, L.w); if (r.ok) { best = r; lo = mid } else hi = mid }
      if (!best) { best = tryAt(L.fit.min, L.w); best.overflow = true }
    }
  } else {
    best = tryAt(L.size || 40, L.w); if (!best.ok) best.overflow = true
  }
  // balance: same number of lines, narrowest width, so the last line is not a lonely word
  if (L.balance && best.lines.length > 1 && !best.overflow) {
    let lo = L.w * 0.45, hi = L.w, n = best.lines.length, keep = best
    for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2; const r = tryAt(best.size, mid); if (r.ok && r.lines.length === n) { keep = r; hi = mid } else lo = mid }
    best = keep
  }
  const last = best.lines[best.lines.length - 1] || ''
  best.orphan = best.lines.length > 1 && last.split(' ').length === 1 && last.length <= 4
  best.lh = lh
  return best
}

// ---------------------------------------------------------------- images
const IMG = new Map()
// The official raster logo (white wordmark, red and teal O) trimmed to its pixels. 'logo:dark' recolors only the
// white ink to the logo's own dark ink (#14202b, as in kurkoos-logo.svg); the red and teal O stay untouched.
export const LOGO_FILE = '/kurkoos-groip-logo.png'
async function logoVariant(kind) {
  const im = await loadImage(LOGO_FILE); if (!im) return null
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height); const a = d.data
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
    const i = (y * c.width + xx) * 4; if (a[i + 3] < 12) continue
    if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y
    if (kind === 'dark') { const mx = Math.max(a[i], a[i + 1], a[i + 2]), mn = Math.min(a[i], a[i + 1], a[i + 2]); if (mx - mn < 40) { a[i] = 0x14; a[i + 1] = 0x20; a[i + 2] = 0x2b } }
  }
  x.putImageData(d, 0, 0)
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height)
  const out = new Image(); out.src = o.toDataURL('image/png'); await out.decode()
  return out
}
export function loadImage(src) {
  if (!src) return Promise.resolve(null)
  if (IMG.has(src)) return IMG.get(src)
  if (src === 'logo:dark' || src === 'logo:light') { const p = logoVariant(src.slice(5)); IMG.set(src, p); return p }
  const p = new Promise((ok) => {
    const i = new Image(); i.crossOrigin = 'anonymous'; i.decoding = 'async'
    i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src
  })
  IMG.set(src, p)
  return p
}
const STATS = new Map()
// Brightness grid, edge energy and a focal point (edge-weighted centroid with a soft centre bias).
export async function analyzeImage(src) {
  if (STATS.has(src)) return STATS.get(src)
  const im = await loadImage(src); if (!im) return null
  const N = 48, c = document.createElement('canvas'); c.width = N; c.height = N
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, N, N)
  let d; try { d = x.getImageData(0, 0, N, N).data } catch (e) { return null }
  const L = new Float32Array(N * N)
  let sum = 0
  for (let i = 0; i < N * N; i++) { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; L[i] = relLum(r, g, b); sum += L[i] }
  const E = new Float32Array(N * N); let ex = 0, ey = 0, et = 0
  for (let y = 1; y < N - 1; y++) for (let xx = 1; xx < N - 1; xx++) {
    const i = y * N + xx
    const e = Math.abs(L[i + 1] - L[i - 1]) + Math.abs(L[i + N] - L[i - N])
    const bias = 1 - 0.6 * Math.hypot(xx / N - 0.5, y / N - 0.5)
    E[i] = e; ex += xx * e * bias; ey += y * e * bias; et += e * bias
  }
  const s = { w: im.naturalWidth, h: im.naturalHeight, mean: sum / (N * N), focal: et ? [ex / et / N, ey / et / N] : [0.5, 0.5], N, L, E }
  // which third is calmest (least edge energy): where text can sit
  const band = (y0, y1, x0, x1) => { let t = 0, n = 0; for (let y = Math.floor(y0 * N); y < y1 * N; y++) for (let xx = Math.floor(x0 * N); xx < x1 * N; xx++) { t += E[y * N + xx]; n++ } return t / Math.max(1, n) }
  s.calm = { top: band(0, 0.34, 0, 1), bottom: band(0.66, 1, 0, 1), right: band(0, 1, 0.58, 1), left: band(0, 1, 0, 0.42) }
  s.busy = band(0, 1, 0, 1)
  STATS.set(src, s)
  return s
}
export function relLum(r, g, b) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function hexLum(h) { h = h.replace('#', ''); return relLum(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)) }
export const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// cover crop around a focal point, with zoom >= 1
export function coverRect(iw, ih, bw, bh, focal = [0.5, 0.5], zoom = 1) {
  const s = Math.max(bw / iw, bh / ih) * (zoom || 1)
  const sw = bw / s, sh = bh / s
  const sx = Math.min(iw - sw, Math.max(0, focal[0] * iw - sw / 2))
  const sy = Math.min(ih - sh, Math.max(0, focal[1] * ih - sh / 2))
  return { sx, sy, sw, sh, scale: s }
}

// ---------------------------------------------------------------- rendering
function shapePath(ctx, L) {
  const { x, y, w, h } = L
  ctx.beginPath()
  if (L.mask === 'arch') { const r = w / 2; ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath() }
  else if (L.mask === 'circle') ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2)
  else ctx.rect(x, y, w, h)
}
const TREAT = {
  natural: '', lift: 'contrast(1.05) saturate(1.06) brightness(1.03)', mono: 'grayscale(1) contrast(1.12) brightness(1.02)', duotoneNavy: 'grayscale(1) contrast(1.08)',
}
export async function preload(scene) {
  const srcs = scene.layers.filter((l) => (l.type === 'image' || l.type === 'logo') && l.src).map((l) => l.src)
  await Promise.all(srcs.map(loadImage))
}
// draw the scene; opts.upto stops before layer index (for contrast sampling of the background)
export async function render(scene, canvas, opts = {}) {
  const scale = opts.scale || 1
  canvas.width = Math.round(scene.w * scale); canvas.height = Math.round(scene.h * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: !!opts.read })
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, scene.w, scene.h)
  await preload(scene)
  const info = {}
  const n = opts.upto == null ? scene.layers.length : opts.upto
  for (let i = 0; i < n; i++) {
    const L = scene.layers[i]; if (L.hidden) continue
    ctx.save(); ctx.globalAlpha = L.alpha == null ? 1 : L.alpha
    if (L.type === 'rect') { ctx.fillStyle = hex(L.fill); shapePath(ctx, L); ctx.fill() }
    else if (L.type === 'grad') {
      const dir = L.dir || 'down'
      const g = dir === 'down' ? ctx.createLinearGradient(0, L.y, 0, L.y + L.h) : dir === 'up' ? ctx.createLinearGradient(0, L.y + L.h, 0, L.y)
        : dir === 'left' ? ctx.createLinearGradient(L.x + L.w, 0, L.x, 0) : ctx.createLinearGradient(L.x, 0, L.x + L.w, 0)
      const c = hex(L.fill || 'navy')
      for (const [o, a] of L.stops) g.addColorStop(o, c + Math.round(a * 255).toString(16).padStart(2, '0'))
      ctx.fillStyle = g; ctx.fillRect(L.x, L.y, L.w, L.h)
    } else if (L.type === 'image' || L.type === 'logo') {
      const im = await loadImage(L.src)
      if (!im) { ctx.fillStyle = '#cbd2db'; ctx.fillRect(L.x, L.y, L.w, L.h); info[L.id] = { missing: true } }
      else if (L.type === 'logo') {
        // logos: contain, never distort
        const s = Math.min(L.w / im.naturalWidth, L.h / im.naturalHeight)
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s
        const dx = L.anchor === 'left' ? L.x : L.anchor === 'center' ? L.x + (L.w - dw) / 2 : L.x + L.w - dw
        ctx.drawImage(im, dx, L.y + (L.h - dh) / 2, dw, dh)
        info[L.id] = { ratio: (dw / dh) / (im.naturalWidth / im.naturalHeight), drawn: [dx, L.y + (L.h - dh) / 2, dw, dh] }
      } else {
        const r = coverRect(im.naturalWidth, im.naturalHeight, L.w, L.h, L.focal, L.zoom)
        shapePath(ctx, L); ctx.clip()
        ctx.filter = TREAT[L.treatment] || 'none'
        ctx.drawImage(im, r.sx, r.sy, r.sw, r.sh, L.x, L.y, L.w, L.h)
        ctx.filter = 'none'
        if (L.treatment === 'duotoneNavy') { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = hex('navy'); ctx.globalAlpha = 0.55; ctx.fillRect(L.x, L.y, L.w, L.h); ctx.globalCompositeOperation = 'source-over' }
        info[L.id] = { srcPerPx: 1 / r.scale, natural: [im.naturalWidth, im.naturalHeight] }
      }
    } else if (L.type === 'line') {
      ctx.strokeStyle = hex(L.color || 'red'); ctx.lineWidth = L.width || 4
      const y = L.y + L.h / 2
      ctx.beginPath(); if (L.vertical) { ctx.moveTo(L.x + L.w / 2, L.y); ctx.lineTo(L.x + L.w / 2, L.y + L.h) } else { ctx.moveTo(L.x, y); ctx.lineTo(L.x + L.w, y) }
      if (L.dash) ctx.setLineDash(L.dash)
      ctx.stroke()
      if (L.ticks) { ctx.setLineDash([]); ctx.beginPath(); const t = L.ticks; ctx.moveTo(L.x, y - t); ctx.lineTo(L.x, y + t); ctx.moveTo(L.x + L.w, y - t); ctx.lineTo(L.x + L.w, y + t); ctx.stroke() }
    } else if (L.type === 'towers') {
      // the logo mark's four towers (from kurkoos-logo.svg: x 118..182, heights 110/170/140/85)
      ctx.fillStyle = hex(L.color || 'white')
      const bars = [[118, 80, 9, 110], [138, 20, 12, 170], [158, 50, 10, 140], [174, 105, 8, 85]]
      const s = Math.min(L.w / 64, L.h / 170)
      const ox = L.x + (L.w - 64 * s) / 2, oy = L.y + L.h - 190 * s + 20 * s
      for (const [bx, by, bw, bh] of bars) ctx.fillRect(ox + (bx - 118) * s, oy + (by - 20) * s, bw * s, bh * s)
    } else if (L.type === 'text') {
      const t = layoutText(L, ctx)
      ctx.font = fontCss(L, t.size)
      try { ctx.letterSpacing = ((L.track || 0) * t.size).toFixed(2) + 'px' } catch (e) {}
      ctx.direction = L.dir || 'rtl'; ctx.textBaseline = 'alphabetic'
      const align = L.align || 'right'
      ctx.textAlign = align === 'center' ? 'center' : align === 'left' ? 'left' : 'right'
      const ax = align === 'center' ? L.x + L.w / 2 : align === 'left' ? L.x : L.x + L.w
      const lineH = t.size * t.lh
      const blockH = t.lines.length * lineH
      let y0 = L.y + (L.valign === 'bottom' ? L.h - blockH : L.valign === 'middle' ? (L.h - blockH) / 2 : 0)
      const asc = t.size * 0.8 + (lineH - t.size) / 2
      const colors = L.lineColors || []
      t.lines.forEach((ln, k) => {
        ctx.fillStyle = hex(colors[k] || L.color || 'navy')
        if (L.outline) { ctx.strokeStyle = hex(L.color || 'teal'); ctx.lineWidth = Math.max(2, t.size / 60); ctx.strokeText(ln, ax, y0 + asc + k * lineH) }
        else ctx.fillText(ln, ax, y0 + asc + k * lineH)
      })
      const bx = align === 'center' ? L.x + (L.w - t.widest) / 2 : align === 'left' ? L.x : L.x + L.w - t.widest
      info[L.id] = { size: t.size, lines: t.lines.length, overflow: !!t.overflow, orphan: t.orphan, box: [bx, y0, t.widest, blockH] }
    }
    ctx.restore()
  }
  return info
}

// SVG source export: an editable vector file (text stays text, images are linked).
export function toSVG(scene, info = {}) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${scene.w}" height="${scene.h}" viewBox="0 0 ${scene.w} ${scene.h}" direction="rtl">`,
    `<defs><style>@font-face{font-family:Almoni;src:url(https://www.kurkoos-group.co.il/fonts/almoni-400.woff2)}@import url(https://fonts.googleapis.com/css2?family=Heebo:wght@300..900);</style></defs>`]
  let gid = 0
  for (const L of scene.layers) {
    if (L.hidden) continue
    const op = L.alpha == null ? '' : ` opacity="${L.alpha}"`
    if (L.type === 'rect') out.push(`<rect id="${esc(L.id)}" x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" fill="${hex(L.fill)}"${op}/>`)
    else if (L.type === 'grad') {
      const id = 'g' + gid++, c = hex(L.fill || 'navy'); const v = L.dir === 'down' || L.dir === 'up'
      const [x1, y1, x2, y2] = L.dir === 'up' ? [0, 1, 0, 0] : L.dir === 'down' ? [0, 0, 0, 1] : L.dir === 'left' ? [1, 0, 0, 0] : [0, 0, 1, 0]
      out.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${L.stops.map(([o, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient><rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" fill="url(#${id})"/>`)
      void v
    } else if (L.type === 'image' || L.type === 'logo') out.push(`<image id="${esc(L.id)}" x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" href="${esc(new URL(L.src === 'logo:dark' ? '/kurkoos-logo-nadlan.png' : L.src === 'logo:light' ? LOGO_FILE : L.src, location.href).href)}" preserveAspectRatio="${L.type === 'logo' ? 'xMaxYMid meet' : `x${L.focal && L.focal[0] < 0.4 ? 'Min' : L.focal && L.focal[0] > 0.6 ? 'Max' : 'Mid'}Y${L.focal && L.focal[1] < 0.4 ? 'Min' : L.focal && L.focal[1] > 0.6 ? 'Max' : 'Mid'} slice`}"${op}/>`)
    else if (L.type === 'line') out.push(`<line x1="${L.x}" y1="${L.y + L.h / 2}" x2="${L.x + L.w}" y2="${L.y + L.h / 2}" stroke="${hex(L.color || 'red')}" stroke-width="${L.width || 4}"${op}/>`)
    else if (L.type === 'text') {
      const t = layoutText(L); const lineH = t.size * t.lh
      const anchor = L.align === 'center' ? 'middle' : L.align === 'left' ? 'start' : 'end'
      const ax = L.align === 'center' ? L.x + L.w / 2 : L.align === 'left' ? L.x : L.x + L.w
      const y0 = L.y + (L.valign === 'bottom' ? L.h - t.lines.length * lineH : L.valign === 'middle' ? (L.h - t.lines.length * lineH) / 2 : 0)
      out.push(`<text id="${esc(L.id)}" font-family="${L.family}" font-weight="${realWeight(L.family, L.weight)}" font-size="${t.size.toFixed(1)}" fill="${hex(L.color || 'navy')}" text-anchor="${anchor}" direction="rtl"${op}>` +
        t.lines.map((ln, k) => `<tspan x="${ax}" y="${(y0 + t.size * 0.8 + (lineH - t.size) / 2 + k * lineH).toFixed(1)}">${esc(ln)}</tspan>`).join('') + '</text>')
    }
  }
  out.push('</svg>')
  void info
  return out.join('\n')
}

export async function exportBlob(scene, type = 'image/png', scale = 1, quality = 0.92) {
  await loadFonts()
  const c = document.createElement('canvas')
  await render(scene, c, { scale })
  return new Promise((ok) => c.toBlob(ok, type, quality))
}

// small helpers
export const clone = (o) => JSON.parse(JSON.stringify(o))
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000 } }
export const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length
