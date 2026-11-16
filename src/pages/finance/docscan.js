// A photographed receipt, made to look scanned: the paper is found, the table around it is cut away, the angle is
// straightened (a perspective warp, as if the paper lay flat under a scanner) and the paper is whitened a little.
// No AI and no network: plain pixel work on an RGBA buffer, so the same code runs in the browser (a canvas, before an
// upload) and on the server (jpeg-js, for a photo that came by WhatsApp). Used by api.prepareImage and whatsapp.ingest.
//
// How the paper is found: a receipt or an invoice is the brightest large shape in the picture. The picture is shrunk to
// at most 480 px, turned to grey, split into light and dark (Otsu), and the largest light region is taken. Its four
// corners are its extreme points along the two diagonals. The result is kept only when it is believable: the region
// fills its four-sided shape (85%+), covers 12%–93% of the picture, is not a thin sliver, and the shape is convex.
// Anything else (a white table, a scan that is already straight, a screenshot) is left exactly as it was.

const DETECT = 480
const MAX_OUT = 2200

function grayOf(rgba, w, h, step) {
  const gw = Math.max(1, Math.floor(w / step)); const gh = Math.max(1, Math.floor(h / step))
  const g = new Uint8Array(gw * gh)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = ((Math.min(h - 1, Math.floor(y * step)) * w) + Math.min(w - 1, Math.floor(x * step))) * 4
      g[y * gw + x] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000
    }
  }
  return { g, gw, gh }
}
function otsu(g) {
  const hist = new Array(256).fill(0)
  for (const v of g) hist[v]++
  const total = g.length; let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0; let wB = 0; let best = 0; let t = 128
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue
    const wF = total - wB; if (!wF) break
    sumB += i * hist[i]
    const mB = sumB / wB; const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) { best = between; t = i }
  }
  return t
}
/* the largest light region: its pixel count and its four diagonal-extreme points */
function largestLight(g, gw, gh, t) {
  const seen = new Uint8Array(g.length); const stack = new Int32Array(g.length)
  let best = null
  for (let s = 0; s < g.length; s++) {
    if (seen[s] || g[s] <= t) continue
    let top = 0; stack[top++] = s; seen[s] = 1
    let n = 0; let minS = Infinity; let maxS = -Infinity; let minD = Infinity; let maxD = -Infinity
    let tl, br, tr, bl
    while (top) {
      const p = stack[--top]; n++
      const x = p % gw; const y = (p - x) / gw
      const sxy = x + y; const dxy = x - y
      if (sxy < minS) { minS = sxy; tl = [x, y] }
      if (sxy > maxS) { maxS = sxy; br = [x, y] }
      if (dxy > maxD) { maxD = dxy; tr = [x, y] }
      if (dxy < minD) { minD = dxy; bl = [x, y] }
      if (x > 0 && !seen[p - 1] && g[p - 1] > t) { seen[p - 1] = 1; stack[top++] = p - 1 }
      if (x < gw - 1 && !seen[p + 1] && g[p + 1] > t) { seen[p + 1] = 1; stack[top++] = p + 1 }
      if (y > 0 && !seen[p - gw] && g[p - gw] > t) { seen[p - gw] = 1; stack[top++] = p - gw }
      if (y < gh - 1 && !seen[p + gw] && g[p + gw] > t) { seen[p + gw] = 1; stack[top++] = p + gw }
    }
    if (!best || n > best.n) best = { n, quad: [tl, tr, br, bl] }
  }
  return best
}
const area = (q) => Math.abs(q.reduce((a, p, i) => { const r = q[(i + 1) % q.length]; return a + p[0] * r[1] - r[0] * p[1] }, 0)) / 2
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
function convex(q) {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]; const b = q[(i + 1) % 4]; const c = q[(i + 2) % 4]
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
    if (Math.abs(z) < 1e-9) return false
    if (!sign) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false
  }
  return true
}

/* where the paper is, in the picture's own pixels: { corners: [tl, tr, br, bl] } or { skip: reason } */
export function findPaper(rgba, w, h) {
  const step = Math.max(1, Math.max(w, h) / DETECT)
  const { g, gw, gh } = grayOf(rgba, w, h, step)
  const t = otsu(g)
  const best = largestLight(g, gw, gh, t)
  if (!best) return { skip: 'no_light_region' }
  const q = best.quad
  if (!convex(q)) return { skip: 'not_convex' }
  const qa = area(q); const all = gw * gh
  if (qa / all > 0.93) return { skip: 'already_fills' }
  if (qa / all < 0.12) return { skip: 'too_small' }
  if (best.n / qa < 0.85) return { skip: 'not_a_sheet' }
  const sides = [dist(q[0], q[1]), dist(q[1], q[2]), dist(q[2], q[3]), dist(q[3], q[0])]
  if (Math.min(...sides) < Math.max(gw, gh) * 0.08) return { skip: 'sliver' }
  // a little outward, so no printed edge is cut: 0.6% of the picture from the shape's centre
  const cx = q.reduce((a, p) => a + p[0], 0) / 4; const cy = q.reduce((a, p) => a + p[1], 0) / 4
  const pad = 0.006 * Math.max(gw, gh)
  const corners = q.map(([x, y]) => {
    const dx = x - cx; const dy = y - cy; const d = Math.hypot(dx, dy) || 1
    return [Math.min(gw - 1, Math.max(0, x + (dx / d) * pad)) * step, Math.min(gh - 1, Math.max(0, y + (dy / d) * pad)) * step]
  })
  return { corners, coverage: qa / all, fill: best.n / qa }
}

/* the 3x3 matrix that takes a point of the output rectangle to the picture (8 equations, Gaussian elimination) */
export function homography(dst, src) {
  const A = []; const b = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = dst[i]; const [u, v] = src[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }
  for (let c = 0; c < 8; c++) {
    let p = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]
    for (let r = 0; r < 8; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]
      b[r] -= f * b[c]
    }
  }
  const h = b.map((v, i) => v / A[i][i])
  return [...h, 1]
}

/* the paper, flat: every output pixel sampled from the picture (bilinear) */
export function warp(rgba, w, h, H, ow, oh) {
  const out = new Uint8ClampedArray(ow * oh * 4)
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const z = H[6] * x + H[7] * y + 1
      const sx = (H[0] * x + H[1] * y + H[2]) / z; const sy = (H[3] * x + H[4] * y + H[5]) / z
      const x0 = Math.max(0, Math.min(w - 2, Math.floor(sx))); const y0 = Math.max(0, Math.min(h - 2, Math.floor(sy)))
      const fx = Math.max(0, Math.min(1, sx - x0)); const fy = Math.max(0, Math.min(1, sy - y0))
      const i00 = (y0 * w + x0) * 4; const i10 = i00 + 4; const i01 = i00 + w * 4; const i11 = i01 + 4
      const o = (y * ow + x) * 4
      for (let c = 0; c < 3; c++) {
        out[o + c] = (rgba[i00 + c] * (1 - fx) + rgba[i10 + c] * fx) * (1 - fy) + (rgba[i01 + c] * (1 - fx) + rgba[i11 + c] * fx) * fy
      }
      out[o + 3] = 255
    }
  }
  return out
}

/* the paper whiter and the print darker, gently: the darkest 1% to black, the paper (the 90th percentile) to white */
export function levels(rgba) {
  const hist = new Array(256).fill(0); const n = rgba.length / 4
  for (let i = 0; i < rgba.length; i += 4) hist[(rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000 | 0]++
  const at = (p) => { let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= n * p) return v } return 255 }
  const lo = at(0.01); const hi = Math.max(lo + 40, at(0.9))
  const k = 255 / (hi - lo)
  for (let i = 0; i < rgba.length; i += 4) for (let c = 0; c < 3; c++) rgba[i + c] = (rgba[i + c] - lo) * k
  return rgba
}

/* the whole step: { rgba, width, height, corners } for a straightened paper, or { skip } to keep the picture as it is */
export function straighten({ rgba, width, height }) {
  const found = findPaper(rgba, width, height)
  if (found.skip) return found
  const [tl, tr, br, bl] = found.corners
  let ow = Math.max(dist(tl, tr), dist(bl, br)); let oh = Math.max(dist(tl, bl), dist(tr, br))
  const s = Math.min(1, MAX_OUT / Math.max(ow, oh)); ow = Math.max(8, Math.round(ow * s)); oh = Math.max(8, Math.round(oh * s))
  const H = homography([[0, 0], [ow - 1, 0], [ow - 1, oh - 1], [0, oh - 1]], found.corners)
  const out = levels(warp(rgba, width, height, H, ow, oh))
  return { rgba: out, width: ow, height: oh, corners: found.corners, coverage: found.coverage }
}
