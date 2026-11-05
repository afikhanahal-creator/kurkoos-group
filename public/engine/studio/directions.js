// Kurkoos creative studio · the 12 creative directions
// A direction is a function (content, frame, options) -> pages. It is not a template: every measure is computed from
// the copy (fitted text heights), the photo (focal point, calm areas, brightness) and the format.
import { layoutText, brand, words } from './core.js'

const DIV = {
  development: { he: 'קבוצת קורקוס', role: 'יזמות ופיתוח' },
  raita: { he: 'ראיתה', role: 'בנייה וביצוע' },
  shchinta: { he: 'שכינתא', role: 'פיקוח הנדסי וניהול פרויקטים' },
  afik: { he: 'אפיק הנחל', role: 'תיווך ושיווק נדל״ן' },
}
export const DIVISIONS = DIV
const STAGES = ['חפירה', 'כלונסאות', 'שלד', 'מעטפת', 'גמר']
const STAGE_RX = [/חפיר|עבודות עפר|דיפון/, /כלונס|קידוח/, /שלד|תקר|יציק|ברזל|קומה/, /טיח|איטום|חלונות|מעטפת|חיפוי/, /ריצוף|גמר|מסירה|מפתח/]
// The tracker shows a stage only when the brief states it (c.stage). Keywords only help pick the direction:
// a guessed stage on a real project would be a claim nobody checked.
export function stageOf(c) {
  if (Number.isInteger(c.stage) && c.stage >= 0) return c.stage
  return -1
}
export function stageHint(c) {
  const t = [c.headline, c.sub, c.eyebrow, c.body].join(' ')
  for (let i = STAGE_RX.length - 1; i >= 0; i--) if (STAGE_RX[i].test(t)) return i
  return -1
}
const BIND_HE = { headline: 'כותרת', sub: 'שורת משנה', eyebrow: 'תווית', location: 'מיקום', signature: 'חתימה', cta: 'קריאה לפעולה', index: 'מספור', mark: 'סימן שאלה', swipe: 'החליקו', counter: 'מונה', items: 'נתונים' }
export const LOGO_RATIO = 513 / 595 // the trimmed official logo
const numeric = (v) => /\d/.test(String(v || ''))

// ------------------------------------------------------------------ frame and helpers
export function frame(fmt) {
  const F = brand().socialFormats[fmt] || brand().socialFormats.feed
  const sp = brand().spacing
  const k = F.w / 1080
  const safe = sp.safeArea[F.safe] || sp.safeArea.feed
  const out = { fmt, w: F.w, h: F.h, k, m: Math.round(sp.margins1080.standard * k), top: Math.round(Math.max(sp.margins1080.standard * k, safe.top * k)), bottom: Math.round(Math.max(sp.margins1080.standard * k, safe.bottom * k)), side: Math.round(sp.margins1080.standard * k), tall: F.h / F.w > 1.5, square: F.h / F.w < 1.1, logoH: Math.round(124 * k) }
  out.sig = out.h - out.bottom - out.logoH // top of the signature block
  return out
}
function typeRole(role, k, o = {}) {
  const r = brand().typography.scale1080[role]
  const fam = brand().typography.families[r.family].family
  const s = (o.fix && o.fix.compact) ? 0.86 : 1
  return { family: fam, weight: r.weight, lh: r.lineHeight, track: r.tracking, fit: { min: Math.round(r.min * k * s), max: Math.round(r.max * k) } }
}
// headline treatment per typography option
function headStyle(o, role = 'headline') {
  const t = o.type || 'heavy'
  if (t === 'light') return { weight: 300, track: -0.015, lh: 1.04 }
  if (t === 'editorial') return { weight: 800, track: -0.03, lh: 0.98 }
  return { weight: role === 'hero' ? 900 : 800, track: -0.025, lh: 1.0 }
}
function B(F, o) {
  const L = []; let n = 0
  const id = (p) => p + '_' + (++n)
  const api = {
    L,
    rect: (x, y, w, h, fill, extra = {}) => { L.push({ id: id('rect'), name: extra.name || 'משטח', type: 'rect', x, y, w, h, fill, ...extra }); return L[L.length - 1] },
    grad: (x, y, w, h, dir, stops, extra = {}) => { L.push({ id: id('scrim'), name: 'הצללה', type: 'grad', x, y, w, h, dir, stops, fill: 'navy', ...extra }); return L[L.length - 1] },
    img: (src, x, y, w, h, extra = {}) => { if (!src) return null; L.push({ id: id('img'), name: extra.name || 'תמונה', type: 'image', src: src.src || src, focal: (src.stats && src.stats.focal) || [0.5, 0.5], zoom: 1, treatment: o.treatment || 'natural', x, y, w, h, ...extra }); return L[L.length - 1] },
    line: (x, y, w, color, width, extra = {}) => { L.push({ id: id('line'), name: 'קו', type: 'line', x, y: y - 10, w, h: 20, color, width, ...extra }); return L[L.length - 1] },
    vline: (x, y, h, color, width) => { L.push({ id: id('line'), name: 'קו', type: 'line', vertical: true, x: x - 10, y, w: 20, h, color, width }); return L[L.length - 1] },
    towers: (x, y, w, h, color, alpha) => { L.push({ id: id('towers'), name: 'סימן המגדלים', type: 'towers', x, y, w, h, color, alpha }); return L[L.length - 1] },
    logo: (dark, x, y, w, h, anchor = 'left') => { L.push({ id: id('logo'), name: 'לוגו', type: 'logo', src: dark ? 'logo:dark' : 'logo:light', x, y, w, h, anchor, locked: false }); return L[L.length - 1] },
    // text that measures itself: returns the layer plus its real height
    text: (bind, role, text, x, y, w, h, extra = {}) => {
      if (!text) return null
      const st = typeRole(role, F.k, o)
      const layer = { id: id('text'), name: extra.name || BIND_HE[bind] || bind, bind, type: 'text', role, text, x, y, w, h, align: 'right', color: 'navy', ...st, ...extra }
      if (extra.fit) layer.fit = extra.fit
      const t = layoutText(layer)
      layer._h = t.height
      L.push(layer); return layer
    },
    // chip: a short label on a solid ground, sized to its text
    chip: (text, xRight, y, fill, color = 'white', extra = {}) => {
      if (!text) return null
      const st = typeRole('label', F.k, o); const size = st.fit.max
      const t = layoutText({ text, family: st.family, weight: st.weight, track: st.track, size, w: 2000, h: 200, lh: 1, maxLines: 1 })
      const padX = 22 * F.k, h = size + 26 * F.k, w = t.widest + padX * 2
      const x = extra.align === 'left' ? xRight : xRight - w
      if (fill) L.push({ id: id('chip'), name: 'רקע תווית', type: 'rect', x, y, w, h, fill })
      L.push({ id: id('text'), name: 'תווית', bind: 'eyebrow', type: 'text', role: 'label', text, x: x + padX, y: y + 13 * F.k, w: w - padX * 2 + 2, h: size * 1.05, size, family: st.family, weight: st.weight, track: st.track, lh: 1, color, align: 'right', maxLines: 1 })
      return { x, y, w, h }
    },
  }
  return api
}
// signature: logo plus site address, optional division endorsement
function signature(b, F, c, dark, y, opts = {}) {
  const k = F.k, lh = F.logoH, lw = Math.round(lh * LOGO_RATIO)
  const left = opts.left == null ? F.side : opts.left
  const right = opts.right == null ? F.w - F.side : opts.right
  b.logo(!dark, left, y, lw, lh, 'left')
  const div = DIV[c.division] && c.division !== 'development' ? DIV[c.division] : null
  const line = div ? `${div.he} · ${div.role}` : 'kurkoos-group.co.il'
  b.text('signature', 'caption', line, left + lw + 32 * k, y + lh - 32 * k, right - left - lw - 32 * k, 32 * k, { color: dark ? 'mist' : 'inkSoft', maxLines: 1, name: 'חתימה', fit: { min: 18 * k, max: 23 * k } })
  return y + lh
}
const firstWords = (s, n) => String(s || '').split(/\s+/).slice(0, n).join(' ')

// ------------------------------------------------------------------ the directions
export const DIRECTIONS = {}
const D = (id, fn) => { DIRECTIONS[id] = fn }

// 1 · Luxury architectural editorial: a framed photo plate, an index, a caption, a calm headline
D('editorial', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const v = o.variant % 2
  const tone = o.tone === 'navy' ? 'navy' : 'paper', dark = tone === 'navy'
  b.rect(0, 0, F.w, F.h, tone, { name: 'רקע' })
  const ink = dark ? 'white' : 'navy', soft = dark ? 'mist' : 'inkSoft'
  if (v === 0) {
    const top = F.top
    b.text('eyebrow', 'label', c.eyebrow || c.project || '', m + 90 * k, top, F.w - 2 * m - 90 * k, 30 * k, { color: soft, maxLines: 1, fit: { min: 18 * k, max: 22 * k } })
    b.text('index', 'label', '01', m, top, 80 * k, 30 * k, { color: dark ? 'mist' : 'red', align: 'left', maxLines: 1, name: 'מספור' })
    b.line(m, top + 52 * k, F.w - 2 * m, dark ? 'mist' : 'lineStrong', 2 * k)
    const ih = Math.round(F.h * (F.tall ? 0.46 : F.square ? 0.44 : 0.5) * (o.fix && o.fix.smallImage ? 0.84 : 1))
    const iy = top + 80 * k
    b.img(c.img, m, iy, F.w - 2 * m, ih, { name: 'תמונה ראשית' })
    let y = iy + ih + 22 * k
    const cap = [c.location, c.project].filter(Boolean).join(' · ')
    if (cap) { b.text('location', 'caption', cap, m, y, F.w - 2 * m, 30 * k, { color: soft, maxLines: 1 }); y += 34 * k }
    y += 40 * k
    const sigY = F.sig
    const hs = headStyle(o)
    const hh = b.text('headline', 'headline', c.headline, m, y, F.w - 2 * m, Math.max(120 * k, sigY - y - (c.sub && !(o.fix && o.fix.dropSub) ? 150 * k : 40 * k)), { color: ink, balance: true, maxLines: 3, ...hs })
    y += (hh ? hh._h : 0) + 26 * k
    if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'sub', c.sub, m, y, F.w - 2 * m - 120 * k, sigY - y - 30 * k, { color: soft, maxLines: 2 })
    signature(b, F, c, dark, sigY)
  } else {
    // column: photo bleeds on the left two thirds, the text column holds the right third
    const iw = Math.round(F.w * 0.52)
    b.img(c.img, 0, 0, iw, F.h, { name: 'תמונה ראשית' })
    const x = iw + 56 * k, w = F.w - x - m
    b.text('index', 'label', '01', x, F.top, w, 30 * k, { color: 'red', maxLines: 1, name: 'מספור' })
    b.line(x, F.top + 52 * k, w, dark ? 'mist' : 'lineStrong', 2 * k)
    b.text('eyebrow', 'label', c.eyebrow || '', x, F.top + 76 * k, w, 30 * k, { color: soft, maxLines: 1, fit: { min: 18 * k, max: 22 * k } })
    const hs = headStyle(o)
    const mid = F.h * 0.38
    const hh = b.text('headline', 'title', c.headline, x, mid, w, F.h * 0.34, { color: ink, maxLines: 5, ...hs, fit: { min: 40 * k, max: 76 * k } })
    let y = mid + (hh ? hh._h : 0) + 30 * k
    if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'body', c.sub, x, y, w, F.sig - 80 * k - y, { color: soft, maxLines: 5 })
    const cap = [c.location, c.project].filter(Boolean).join(' · ')
    if (cap) b.text('location', 'caption', cap, x, F.sig - 56 * k, w, 30 * k, { color: soft, maxLines: 1 })
    b.logo(!dark, F.w - m - F.logoH * LOGO_RATIO, F.sig, F.logoH * LOGO_RATIO, F.logoH, 'right')
  }
  return { pages: [b.L], meta: { tone, family: 'editorial' } }
})

// 2 · Premium real estate advertisement: the property, a solid panel, the facts that sell it
D('realestate', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const v = o.variant % 2
  const light = o.tone === 'paper' && v === 0
  const ink = light ? 'navy' : 'white', soft = light ? 'inkSoft' : 'mist'
  b.rect(0, 0, F.w, F.h, light ? 'paper' : 'navy', { name: 'רקע' })
  const items = (c.items || []).filter((i) => i.v).slice(0, 3)
  if (v === 0) {
    const ph = Math.round(F.h * (F.tall ? 0.56 : F.square ? 0.5 : 0.58) * (o.fix && o.fix.smallImage ? 0.9 : 1))
    b.img(c.img, 0, 0, F.w, ph, { name: 'תמונת הנכס' })
    b.chip(c.eyebrow, F.w - m, F.top, 'red')
    let y = ph + 56 * k
    const hh = b.text('headline', 'title', c.headline, m, y, F.w - 2 * m, 150 * k, { color: ink, maxLines: 2, balance: true, ...headStyle(o), fit: { min: 44 * k, max: 72 * k } })
    y += (hh ? hh._h : 0) + 14 * k
    const where = [c.location, c.location && c.location.includes(c.project) ? '' : c.project].filter(Boolean).join(' · ')
    if (where) { b.text('location', 'caption', where, m, y, F.w - 2 * m, 32 * k, { color: soft, maxLines: 1, fit: { min: 22 * k, max: 26 * k } }); y += 44 * k }
    y += 26 * k
    if (items.length) {
      const cw = (F.w - 2 * m) / items.length
      items.forEach((it, i) => {
        const x = F.w - m - (i + 1) * cw
        if (i) b.vline(x + cw, y, 96 * k, light ? 'lineStrong' : 'mist', 2 * k)
        b.text('item' + i + 'v', 'title', it.v, x + 24 * k, y, cw - 40 * k, 56 * k, { color: ink, maxLines: 1, weight: 800, fit: { min: 30 * k, max: 50 * k }, name: 'נתון' })
        b.text('item' + i + 'l', 'caption', it.l || '', x + 24 * k, y + 62 * k, cw - 40 * k, 30 * k, { color: soft, maxLines: 1, name: 'תווית נתון' })
      })
      y += 120 * k
    } else if (c.sub) { b.text('sub', 'sub', c.sub, m, y, F.w - 2 * m, 100 * k, { color: soft, maxLines: 2 }); y += 100 * k }
    signature(b, F, c, !light, F.sig)
  } else {
    // floating card: the photo fills the frame, a navy card holds the offer on the lower right
    b.img(c.img, 0, 0, F.w, F.h, { name: 'תמונת הנכס' })
    const cw = Math.round(F.w * 0.64), cx = F.w - m - cw
    const ch = Math.round(F.h * 0.4), cy = F.h - F.bottom - ch
    b.rect(cx, cy, cw, ch, 'navy', { name: 'כרטיס' })
    b.rect(cx + cw - 10 * k, cy, 10 * k, ch, 'red', { name: 'פס מבטא' })
    const p = 48 * k
    let y = cy + p
    if (c.eyebrow) { b.text('eyebrow', 'label', c.eyebrow, cx + p, y, cw - 2 * p, 28 * k, { color: 'mist', maxLines: 1 }); y += 52 * k }
    const hh = b.text('headline', 'title', c.headline, cx + p, y, cw - 2 * p, ch * 0.42, { color: 'white', maxLines: 3, ...headStyle(o), fit: { min: 38 * k, max: 64 * k } })
    y += (hh ? hh._h : 0) + 28 * k
    const spec = items.map((i) => `${i.v}${i.l ? ' ' + i.l : ''}`).join('  ·  ') || c.sub
    if (spec) b.text(items.length ? 'items' : 'sub', 'body', spec, cx + p, y, cw - 2 * p, cy + ch - p - y, { color: 'mist', maxLines: 2 })
    b.logo(false, m, F.top, F.logoH * LOGO_RATIO, F.logoH, 'left')
  }
  return { pages: [b.L], meta: { tone: light ? 'paper' : 'navy', family: 'image' } }
})

// 3 · Minimalist corporate: no photo needed, one strong statement, the tower mark as structure
D('corporate', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const tone = o.tone === 'paper' ? 'paper' : 'navy', dark = tone === 'navy'
  b.rect(0, 0, F.w, F.h, tone, { name: 'רקע' })
  const th = F.h * 0.78
  b.towers(-F.w * 0.06, F.h - th - F.bottom * 0.5, F.w * 0.5, th, dark ? 'white' : 'teal', dark ? 0.06 : 0.07)
  b.rect(F.w - m - 120 * k, F.top, 120 * k, 8 * k, 'red', { name: 'פס אדום' })
  b.text('eyebrow', 'label', c.eyebrow || '', m, F.top + 34 * k, F.w - 2 * m, 30 * k, { color: dark ? 'mist' : 'teal', maxLines: 1 })
  const y0 = F.h * (F.tall ? 0.34 : 0.3)
  const hh = b.text('headline', 'hero', c.headline, m, y0, F.w - 2 * m, F.h * 0.38, { color: dark ? 'white' : 'navy', balance: true, maxLines: 4, ...headStyle(o, 'hero'), fit: { min: 76 * k, max: 132 * k } })
  let y = y0 + (hh ? hh._h : 0) + 40 * k
  if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'sub', c.sub, m, y, F.w * 0.7, 130 * k, { color: dark ? 'mist' : 'inkSoft', maxLines: 3 })
  const sy = F.sig
  b.line(m, sy - 40 * k, F.w - 2 * m, dark ? 'mist' : 'lineStrong', 1.5 * k, { alpha: dark ? 0.5 : 1 })
  signature(b, F, c, dark, sy)
  return { pages: [b.L], meta: { tone, family: 'structure' } }
})

// 4 · Full bleed architectural photography: the picture talks, the headline sits where the picture is calm
D('fullbleed', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const st = (c.img && c.img.stats) || { calm: { top: 1, bottom: 0, right: 1, left: 1 }, focal: [0.5, 0.5] }
  b.rect(0, 0, F.w, F.h, 'navy', { name: 'רקע' })
  b.img(c.img, 0, 0, F.w, F.h, { name: 'תמונה' })
  const side = o.variant % 2 === 1 && !F.square
  const extra = (o.fix && o.fix.scrim) || 0
  if (side) {
    b.grad(0, 0, F.w, F.h, 'left', [[0, 0.9 + extra * 0.05], [0.55, 0.55 + extra * 0.1], [1, 0]])
    const w = F.w * 0.56
    const hh = b.text('headline', 'headline', c.headline, F.w - m - w, F.h * 0.36, w, F.h * 0.4, { color: 'white', maxLines: 5, ...headStyle(o) })
    if (c.eyebrow) b.text('eyebrow', 'label', c.eyebrow, F.w - m - w, F.h * 0.36 - 60 * k, w, 30 * k, { color: 'mist', maxLines: 1 })
    void hh
  } else {
    const bottom = st.focal[1] < 0.55 || st.calm.bottom <= st.calm.top
    const zone = F.h * 0.46
    if (bottom) b.grad(0, F.h - zone, F.w, zone, 'down', [[0, 0], [0.45, 0.55 + extra * 0.1], [1, 0.9]])
    else b.grad(0, 0, F.w, zone, 'up', [[0, 0], [0.45, 0.55 + extra * 0.1], [1, 0.9]])
    const hb = bottom ? F.h - F.bottom - 70 * k : F.top + 300 * k
    const hHeight = 300 * k
    const hl = b.text('headline', 'headline', c.headline, m, hb - hHeight, F.w - 2 * m, hHeight, { color: 'white', maxLines: 3, valign: 'bottom', balance: true, ...headStyle(o) })
    const top = hb - (hl ? hl._h : 0)
    if (c.eyebrow) b.text('eyebrow', 'label', c.eyebrow, m, top - 56 * k, F.w - 2 * m, 30 * k, { color: 'mist', maxLines: 1 })
    if (c.location) b.text('location', 'caption', c.location, m, hb + 18 * k, F.w - 2 * m - 240 * k, 30 * k, { color: 'mist', maxLines: 1 })
  }
  b.logo(false, m, F.top - 20 * k, F.logoH * LOGO_RATIO, F.logoH, 'left')
  return { pages: [b.L], meta: { tone: 'navy', family: 'image' } }
})

// 5 · Construction progress: where the build stands, on a real site photo
D('progress', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const v = o.variant % 2
  const stage = stageOf(c)
  const tracker = (y, onDark) => {
    if (stage < 0) return 0
    const w = F.w - 2 * m, step = w / (STAGES.length - 1)
    b.line(m, y, w, onDark ? 'mist' : 'lineStrong', 3 * k)
    b.line(F.w - m - stage * step, y, stage * step, 'red', 5 * k, { name: 'התקדמות' })
    STAGES.forEach((s, i) => {
      const x = F.w - m - i * step
      const r = (i === stage ? 16 : 9) * k
      b.rect(x - r, y - r, r * 2, r * 2, i <= stage ? 'red' : onDark ? 'mist' : 'lineStrong', { mask: 'circle', name: 'שלב' })
      b.text('stage' + i, 'caption', s, x - step / 2, y + 30 * k, step, 30 * k, { color: i === stage ? (onDark ? 'white' : 'navy') : onDark ? 'mist' : 'inkSoft', align: 'center', maxLines: 1, weight: i === stage ? 700 : 400, name: 'שם שלב' })
    })
    return 90 * k
  }
  if (v === 0) {
    b.rect(0, 0, F.w, F.h, 'paper', { name: 'רקע' })
    const ih = Math.round(F.h * (stage < 0 ? 0.58 : 0.54) * (o.fix && o.fix.smallImage ? 0.88 : 1))
    b.img(c.img, 0, 0, F.w, ih, { name: 'תמונת אתר' })
    b.chip(c.eyebrow || 'יומן ביצוע', F.w - m, F.top, 'navy')
    let y = ih + 50 * k
    y += tracker(y + 16 * k, false) + 30 * k
    const sigY = F.sig
    const hh = b.text('headline', 'title', c.headline, m, y, F.w - 2 * m, Math.min(220 * k, sigY - y - 120 * k), { color: 'navy', maxLines: 3, balance: true, ...headStyle(o), fit: { min: 44 * k, max: 76 * k } })
    y += (hh ? hh._h : 0) + 20 * k
    const meta = [c.location, c.project].filter(Boolean).join(' · ')
    if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'body', c.sub, m, y, F.w - 2 * m, sigY - y - 30 * k, { color: 'inkSoft', maxLines: 2 })
    else if (meta) b.text('location', 'caption', meta, m, y, F.w - 2 * m, 30 * k, { color: 'inkSoft', maxLines: 1 })
    signature(b, F, c, false, sigY)
  } else {
    b.rect(0, 0, F.w, F.h, 'navy', { name: 'רקע' })
    b.img(c.img, 0, 0, F.w, F.h, { name: 'תמונת אתר', treatment: o.treatment && o.treatment !== 'natural' ? o.treatment : 'duotoneNavy' })
    b.grad(0, F.h * 0.4, F.w, F.h * 0.6, 'down', [[0, 0], [0.5, 0.7], [1, 0.95]])
    const sigY = F.sig
    let y = sigY - 120 * k - (stage < 0 ? 0 : 90 * k)
    if (stage >= 0) tracker(y + 50 * k, true)
    const hl = b.text('headline', 'headline', c.headline, m, y - 330 * k, F.w - 2 * m, 300 * k, { color: 'white', maxLines: 3, valign: 'bottom', ...headStyle(o) })
    b.text('eyebrow', 'label', c.eyebrow || 'יומן ביצוע', m, y - 330 * k + 300 * k - (hl ? hl._h : 0) - 56 * k, F.w - 2 * m, 30 * k, { color: 'mist', maxLines: 1 })
    signature(b, F, c, true, sigY)
  }
  return { pages: [b.L], meta: { tone: v ? 'navy' : 'paper', family: 'editorial' } }
})

// 6 · Before and after: two real photos of the same place, labelled, divided by one clean line
D('beforeafter', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  b.rect(0, 0, F.w, F.h, 'navy', { name: 'רקע' })
  const before = c.img2 || c.img, after = c.img
  const bandH = Math.round(F.h * (F.tall ? 0.24 : 0.27))
  const ah = F.h - bandH
  if (o.variant % 2 === 0 || F.square) {
    const h = ah / 2
    b.img(before, 0, 0, F.w, h, { name: 'לפני' })
    b.img(after, 0, h, F.w, h, { name: 'אחרי' })
    b.rect(0, h - 4 * k, F.w, 8 * k, 'white', { name: 'קו חיתוך' })
    b.chip('לפני', F.w - m, F.top - 30 * k, 'navy')
    b.chip('אחרי', F.w - m, h + 40 * k, 'red')
  } else {
    const w = F.w / 2
    b.img(before, w, 0, w, ah, { name: 'לפני' })
    b.img(after, 0, 0, w, ah, { name: 'אחרי' })
    b.rect(w - 4 * k, 0, 8 * k, ah, 'white', { name: 'קו חיתוך' })
    b.chip('לפני', F.w - m, F.top, 'navy')
    b.chip('אחרי', w - m, F.top, 'red')
  }
  const y = ah + 44 * k
  b.text('headline', 'title', c.headline, m, y, F.w - 2 * m - 230 * k, bandH - 90 * k, { color: 'white', maxLines: 2, ...headStyle(o), fit: { min: 40 * k, max: 66 * k } })
  b.logo(false, m, F.h - F.bottom - F.logoH * 0.8, F.logoH * 0.8 * LOGO_RATIO, F.logoH * 0.8, 'left')
  return { pages: [b.L], meta: { tone: 'navy', family: 'editorial' } }
})

// 7 · Typography-led campaign: the words are the picture
D('typographic', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const tone = o.tone === 'navy' ? 'navy' : 'paper', dark = tone === 'navy'
  b.rect(0, 0, F.w, F.h, tone, { name: 'רקע' })
  const q = /\?\s*$/.test(c.headline || '')
  if (q) b.text('mark', 'number', '?', m - 40 * k, F.top - 60 * k, F.w * 0.6, F.h * 0.62, { color: dark ? 'teal' : 'ice', align: 'left', maxLines: 1, fit: { min: 300 * k, max: 820 * k }, name: 'סימן שאלה', alpha: dark ? 0.5 : 1, punct: false })
  b.text('eyebrow', 'label', c.eyebrow || '', m, F.top, F.w - 2 * m, 30 * k, { color: dark ? 'mist' : 'teal', maxLines: 1 })
  b.rect(F.w - m - 64 * k, F.top + 50 * k, 64 * k, 6 * k, 'red', { name: 'פס אדום' })
  const sigY = F.sig
  const room = sigY - 60 * k - (c.sub ? 130 * k : 0)
  const hTop = F.top + 140 * k
  const hl = b.text('headline', 'hero', c.headline, m, hTop, F.w - 2 * m, room - hTop, { color: dark ? 'white' : 'navy', valign: 'bottom', maxLines: 5, balance: true, ...headStyle(o, 'hero'), fit: { min: 96 * k, max: 190 * k } })
  if (hl) { const t = layoutText(hl); if (t.lines.length > 1) hl.lineColors = t.lines.map((_, i) => (i === t.lines.length - 1 ? (dark ? 'mist' : 'red') : dark ? 'white' : 'navy')) }
  if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'sub', c.sub, m, room + 10 * k, F.w * 0.74, 110 * k, { color: dark ? 'mist' : 'inkSoft', maxLines: 2 })
  signature(b, F, c, dark, sigY)
  return { pages: [b.L], meta: { tone, family: 'type' } }
})

// 8 · Property specification: the data, set like an architect's schedule
D('specs', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const items = (c.items || []).filter((i) => i.v || i.l).slice(0, 6)
  b.rect(0, 0, F.w, F.h, 'paper', { name: 'רקע' })
  const bandH = Math.round(F.h * 0.31)
  b.rect(0, 0, F.w, bandH, 'navy', { name: 'פס כותרת' })
  const hasImg = !!c.img
  const tw = hasImg ? F.w - 2 * m - bandH * 0.62 - 40 * k : F.w - 2 * m
  if (hasImg) b.img(c.img, m, F.top - 20 * k, bandH * 0.62, bandH - F.top - 20 * k + 70 * k, { name: 'תמונה קטנה' })
  b.text('eyebrow', 'label', c.eyebrow || 'מפרט', F.w - m - tw, F.top, tw, 30 * k, { color: 'mist', maxLines: 1 })
  b.text('headline', 'title', c.headline, F.w - m - tw, F.top + 52 * k, tw, bandH - F.top - 90 * k, { color: 'white', maxLines: 3, ...headStyle(o), fit: { min: 40 * k, max: 68 * k } })
  const sigY = F.sig
  const y0 = bandH + 70 * k
  const rowH = Math.min(150 * k, (sigY - 60 * k - y0) / Math.max(1, items.length))
  items.forEach((it, i) => {
    const y = y0 + i * rowH
    b.text('n' + i, 'label', String(i + 1).padStart(2, '0'), F.w - m - 70 * k, y + 8 * k, 70 * k, 30 * k, { color: 'red', maxLines: 1, weight: 800, name: 'מספור' })
    b.text('item' + i + 'v', 'title', it.v || it.l, m + F.w * 0.36, y, F.w - 2 * m - F.w * 0.36 - 100 * k, rowH - 30 * k, { color: 'navy', maxLines: 2, weight: 800, fit: { min: 30 * k, max: 46 * k }, name: 'שורה' })
    if (it.v && it.l) b.text('item' + i + 'l', 'body', it.l, m, y + 4 * k, F.w * 0.34, rowH - 30 * k, { color: 'inkSoft', maxLines: 2, align: 'left', name: 'פירוט', fit: { min: 22 * k, max: 28 * k } })
    b.line(m, y + rowH - 12 * k, F.w - 2 * m, 'line', 2 * k, { dash: [6 * k, 8 * k] })
  })
  signature(b, F, c, false, sigY)
  return { pages: [b.L], meta: { tone: 'paper', family: 'structure' } }
})

// 9 · Project launch: an arch window onto the project, centred, ceremonial
D('launch', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  b.rect(0, 0, F.w, F.h, 'navy', { name: 'רקע' })
  if (o.variant % 2 === 0) {
    const aw = Math.round(F.w * (F.square ? 0.46 : 0.62)), ah = Math.round(F.h * (F.square ? 0.5 : 0.52))
    const ax = (F.w - aw) / 2, ay = F.top + 70 * k
    b.img(c.img, ax, ay, aw, ah, { name: 'חלון לפרויקט', mask: 'arch' })
    b.logo(false, (F.w - F.logoH * LOGO_RATIO * 0.8) / 2, F.top - 40 * k, F.logoH * LOGO_RATIO * 0.8, F.logoH * 0.8, 'center')
    let y = ay + ah + 50 * k
    if (c.eyebrow) { const ch = b.chip(c.eyebrow, F.w / 2, y, 'red'); if (ch) { const dx = ch.w / 2; b.L.slice(-2).forEach((l) => { l.x += dx }) } y += 80 * k }
    const hl = b.text('headline', 'title', c.headline, m, y, F.w - 2 * m, F.h - F.bottom - y - 70 * k, { color: 'white', align: 'center', maxLines: 2, balance: true, ...headStyle(o), fit: { min: 44 * k, max: 80 * k } })
    y += (hl ? hl._h : 0) + 20 * k
    const meta = [c.location, c.project].filter(Boolean).join(' · ') || c.sub
    if (meta) b.text('location', 'caption', meta, m, y, F.w - 2 * m, 34 * k, { color: 'mist', align: 'center', maxLines: 1, fit: { min: 20 * k, max: 26 * k } })
  } else {
    const ph = Math.round(F.h * 0.56)
    b.img(c.img, 0, 0, F.w, ph, { name: 'תמונה' })
    b.rect(m, ph - 3 * k, F.w - 2 * m, 6 * k, 'red', { name: 'פס אדום' })
    let y = ph + 60 * k
    if (c.eyebrow) { b.text('eyebrow', 'label', c.eyebrow, m, y, F.w - 2 * m, 30 * k, { color: 'mist', align: 'center', maxLines: 1 }); y += 56 * k }
    const hl = b.text('headline', 'headline', c.headline, m, y, F.w - 2 * m, F.h - F.bottom - 150 * k - y, { color: 'white', align: 'center', maxLines: 3, balance: true, ...headStyle(o) })
    y += (hl ? hl._h : 0) + 24 * k
    if (c.location) b.text('location', 'caption', c.location, m, y, F.w - 2 * m, 30 * k, { color: 'mist', align: 'center', maxLines: 1 })
    b.logo(false, (F.w - F.logoH * LOGO_RATIO) / 2, F.sig, F.logoH * LOGO_RATIO, F.logoH, 'center')
  }
  return { pages: [b.L], meta: { tone: 'navy', family: 'image' } }
})

// 10 · Educational carousel: a cover, one page per point, a closing page
D('edu', (c, F, o) => {
  const k = F.k, m = F.side
  const items = (c.items || []).filter((i) => i.v || i.l).slice(0, 8)
  const total = items.length + 2
  const progress = (b, i, dark) => {
    const w = (F.w - 2 * m - (total - 1) * 10 * k) / total
    for (let j = 0; j < total; j++) b.rect(F.w - m - (j + 1) * w - j * 10 * k, F.h - F.bottom + 30 * k, w, 6 * k, j === i ? 'red' : dark ? 'teal' : 'lineStrong', { name: 'התקדמות' })
    b.text('counter', 'label', `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, m, F.top, 200 * k, 30 * k, { color: dark ? 'mist' : 'inkSoft', align: 'left', maxLines: 1, name: 'מונה', punct: false })
  }
  const pages = []
  // cover
  {
    const b = B(F, o)
    b.rect(0, 0, F.w, F.h, 'paper', { name: 'רקע' })
    if (items.length) b.text('bignum', 'number', String(items.length), m - 20 * k, F.h * 0.08, F.w * 0.5, F.h * 0.5, { color: 'teal', outline: true, align: 'left', maxLines: 1, fit: { min: 300 * k, max: 640 * k }, name: 'מספר גדול', punct: false })
    b.text('eyebrow', 'label', c.eyebrow || 'מדריך קצר', m, F.top, F.w - 2 * m, 30 * k, { color: 'red', maxLines: 1 })
    const hl = b.text('headline', 'headline', c.headline, m, F.h * 0.5, F.w - 2 * m, F.h * 0.28, { color: 'navy', maxLines: 3, balance: true, ...headStyle(o) })
    const y = F.h * 0.5 + (hl ? hl._h : 0) + 30 * k
    b.text('swipe', 'label', 'החליקו ←', m, Math.min(y, F.h - F.bottom - 80 * k), F.w - 2 * m, 30 * k, { color: 'teal', maxLines: 1, name: 'החליקו', punct: false })
    progress(b, 0, false)
    b.logo(true, m, F.sig, F.logoH * LOGO_RATIO, F.logoH, 'left')
    pages.push(b.L)
  }
  items.forEach((it, i) => {
    const b = B(F, o)
    b.rect(0, 0, F.w, F.h, 'paper', { name: 'רקע' })
    b.text('n', 'number', String(i + 1).padStart(2, '0'), m, F.top + 60 * k, F.w - 2 * m, 300 * k, { color: 'teal', outline: true, maxLines: 1, fit: { min: 200 * k, max: 300 * k }, name: 'מספר', punct: false })
    const title = it.v || it.l, body = it.v ? it.l : ''
    const tl = b.text('item' + i + 'v', 'headline', title, m, F.top + 420 * k, F.w - 2 * m, 300 * k, { color: 'navy', maxLines: 3, ...headStyle(o), fit: { min: 56 * k, max: 96 * k }, name: 'כותרת שקף' })
    if (body) b.text('item' + i + 'l', 'sub', body, m, F.top + 420 * k + (tl ? tl._h : 0) + 40 * k, F.w - 2 * m - 80 * k, 260 * k, { color: 'inkSoft', maxLines: 5, name: 'גוף שקף' })
    b.rect(F.w - m - 80 * k, F.top + 380 * k, 80 * k, 6 * k, 'red', { name: 'פס אדום' })
    progress(b, i + 1, false)
    b.logo(true, m, F.sig, F.logoH * 0.85 * LOGO_RATIO, F.logoH * 0.85, 'left')
    pages.push(b.L)
  })
  {
    const b = B(F, o)
    b.rect(0, 0, F.w, F.h, 'navy', { name: 'רקע' })
    b.towers(F.w * 0.55, F.h * 0.12, F.w * 0.4, F.h * 0.6, 'white', 0.07)
    b.text('headline', 'headline', c.cta || 'שמרו את הפוסט לפגישה הבאה', m, F.h * 0.38, F.w - 2 * m, F.h * 0.3, { color: 'white', maxLines: 3, balance: true, ...headStyle(o), name: 'קריאה לפעולה', bind: 'cta' })
    progress(b, total - 1, true)
    signature(b, F, c, true, F.sig)
    pages.push(b.L)
  }
  return { pages, meta: { tone: 'paper', family: 'structure', carousel: true } }
})

// 11 · Company authority and expertise: verified numbers, measured like a drawing
D('authority', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const tone = o.tone === 'paper' ? 'paper' : 'navy', dark = tone === 'navy'
  const nums = (c.items || []).filter((i) => numeric(i.v)).slice(0, 4)
  b.rect(0, 0, F.w, F.h, tone, { name: 'רקע' })
  b.text('eyebrow', 'label', c.eyebrow || '', m, F.top, F.w - 2 * m, 30 * k, { color: dark ? 'mist' : 'teal', maxLines: 1 })
  const hl = b.text('headline', 'title', c.headline, m, F.top + 54 * k, F.w - 2 * m, 220 * k, { color: dark ? 'white' : 'navy', maxLines: 3, balance: true, ...headStyle(o), fit: { min: 44 * k, max: 72 * k } })
  const gy = F.top + 54 * k + (hl ? hl._h : 0) + 80 * k
  const sigY = F.sig
  const cols = nums.length >= 4 ? 2 : nums.length === 3 ? 1 : nums.length === 2 ? 1 : 1
  const rows = Math.ceil(nums.length / cols)
  const cw = (F.w - 2 * m - (cols - 1) * 60 * k) / cols, rh = Math.min(330 * k, (sigY - 60 * k - gy) / Math.max(1, rows))
  nums.forEach((it, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const x = F.w - m - (col + 1) * cw - col * 60 * k, y = gy + row * rh
    b.line(x, y, cw, dark ? 'mist' : 'teal', 2 * k, { ticks: 14 * k, name: 'קו מידה' })
    b.rect(x + cw - 6 * k, y - 3 * k, 48 * k, 6 * k, 'red', { name: 'לוכסן אדום' })
    b.text('item' + i + 'v', 'number', it.v, x, y + 30 * k, cw, rh * 0.55, { color: dark ? 'white' : 'navy', maxLines: 1, fit: { min: 80 * k, max: (cols === 1 ? 200 : 150) * k }, name: 'מספר', punct: false })
    if (it.l) b.text('item' + i + 'l', 'sub', it.l, x, y + 30 * k + rh * 0.55, cw, rh * 0.3, { color: dark ? 'mist' : 'inkSoft', maxLines: 2, name: 'תווית מספר' })
  })
  signature(b, F, c, dark, sigY)
  return { pages: [b.L], meta: { tone, family: 'structure' } }
})

// 12 · Lifestyle and residential: home as a place to live, light type, air
D('lifestyle', (c, F, o) => {
  const b = B(F, o), k = F.k, m = F.side
  const ty = { ...o, type: o.type || 'light' }
  b.rect(0, 0, F.w, F.h, 'paper', { name: 'רקע' })
  if (o.variant % 2 === 0) {
    const iw = Math.round(F.w * 0.62), ih = Math.round(F.h * (F.square ? 0.78 : 0.7))
    b.img(c.img, 0, 0, iw, ih, { name: 'תמונה' })
    const x = iw + 44 * k, w = F.w - x - m
    b.rect(F.w - m - 56 * k, F.top, 56 * k, 5 * k, 'red', { name: 'פס אדום' })
    b.text('eyebrow', 'label', c.eyebrow || '', x, F.top + 30 * k, w, 60 * k, { color: 'teal', maxLines: 2 })
    const y = ih + 60 * k
    const hl = b.text('headline', 'headline', c.headline, m, y, F.w - 2 * m, F.h - F.bottom - 140 * k - y, { color: 'navy', maxLines: 3, balance: true, ...headStyle(ty), fit: { min: 56 * k, max: 100 * k } })
    void hl
    if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'body', c.sub, x, F.top + 140 * k, w, ih - F.top - 200 * k, { color: 'inkSoft', maxLines: 8 })
    signature(b, F, c, false, F.sig)
  } else {
    const ih = Math.round(F.h * (F.square ? 0.62 : 0.66))
    b.img(c.img, m, m, F.w - 2 * m, ih - m, { name: 'תמונה' })
    let y = ih + 56 * k
    const hl = b.text('headline', 'headline', c.headline, m, y, F.w - 2 * m, 230 * k, { color: 'navy', maxLines: 2, align: 'center', balance: true, ...headStyle(ty), fit: { min: 52 * k, max: 96 * k } })
    y += (hl ? hl._h : 0) + 24 * k
    if (c.sub && !(o.fix && o.fix.dropSub)) b.text('sub', 'body', c.sub, m * 2, y, F.w - 4 * m, F.h - F.bottom - 110 * k - y, { color: 'inkSoft', maxLines: 2, align: 'center' })
    b.logo(true, (F.w - F.logoH * LOGO_RATIO) / 2, F.sig, F.logoH * LOGO_RATIO, F.logoH, 'center')
  }
  return { pages: [b.L], meta: { tone: 'paper', family: 'image' } }
})

// ------------------------------------------------------------------ suitability
// How well a direction suits this content (0 = cannot be built honestly). Used to pick the three concepts.
export function suitability(id, c) {
  const def = brand().layouts.directions.find((d) => d.id === id)
  const text = [c.headline, c.sub, c.eyebrow, c.topic, c.body].join(' ')
  const nums = (c.items || []).filter((i) => numeric(i.v)).length
  const kind = (c.img && c.img.kind) || ''
  if (def.needs.includes('image') && !c.img) return 0
  if (def.needs.includes('image2') && !c.img2) return 0
  let s = 1
  for (const w of def.best) if (text.includes(w)) s += 0.6
  if (id === 'specs') s = (c.items || []).length >= 3 ? s + 1.2 : 0
  if (id === 'authority') s = nums >= 2 ? s + 1.5 : 0
  if (id === 'edu') s = (c.items || []).length >= 3 ? s + 0.8 : 0
  if (id === 'progress') s = kind === 'site' || (!kind && stageHint(c) >= 0) ? s + 1.6 + (stageHint(c) >= 0 ? 0.6 : 0) : 0
  if (id === 'lifestyle') s += ['interior', 'finish', 'exterior'].includes(kind) ? 1 : kind === 'site' ? -1 : 0
  if (id === 'realestate') s += ['finish', 'render', 'exterior'].includes(kind) ? 1 : kind === 'site' ? -0.6 : 0
  if (id === 'launch') s += kind === 'render' ? 1 : 0
  if (id === 'fullbleed' && c.img && c.img.stats) s += c.img.stats.w >= 1400 ? 0.8 : -0.8
  if (id === 'typographic') s += words(c.headline) <= 7 ? 0.6 : -0.6
  if (id === 'beforeafter') s += 1.5
  if (id === 'corporate') s += c.img ? -0.4 : 0.8
  if (c.division === 'afik' && ['realestate', 'lifestyle', 'launch'].includes(id)) s += 0.6
  if (c.division === 'raita' && ['progress', 'beforeafter'].includes(id)) s += 0.6
  if (c.division === 'shchinta' && ['specs', 'edu', 'authority'].includes(id)) s += 0.5
  return Math.max(0, s)
}
// families: three concepts must come from different families so they differ in composition, not in colour
export const FAMILY = { editorial: 'editorial', progress: 'editorial', beforeafter: 'editorial', typographic: 'type', realestate: 'image', fullbleed: 'image', launch: 'image', lifestyle: 'image', corporate: 'structure', specs: 'structure', authority: 'structure', edu: 'structure' }
export function divisionOf(c) {
  if (c.division && DIV[c.division]) return c.division
  const t = [c.domain, c.topic, c.headline, c.sub, c.body].join(' ')
  if (/תיווך|למכירה|מכירה|שיווק|דירה|קונים|מוכרים|אפיק/.test(t)) return 'afik'
  if (/פיקוח|מפקח|ניהול פרויקט|בקרת|שכינתא/.test(t)) return 'shchinta'
  if (/ביצוע|קבלן|שלד|כלונס|יציק|באתר|בנייה|ראיתה|בטיחות/.test(t)) return 'raita'
  return 'development'
}
void firstWords
