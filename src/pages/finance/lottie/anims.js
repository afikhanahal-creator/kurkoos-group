/* The system's own Lottie animations, written here as data (no downloaded files): every one is drawn in the brand's
   navy and ocean, with the red kept for what is removed or refused. One per action a person takes: a document comes
   in, is approved, is sent, is saved to the cloud, is downloaded, is merged, is deleted, a message arrives, something
   fails; and two quiet loops for an empty list and for waiting. All are 120×120 at 60 frames a second. */
const INK = [0.027, 0.161, 0.227, 1]
const OCEAN = [0.086, 0.408, 0.549, 1]
const SKY = [0.80, 0.89, 0.93, 1]
const RED = [0.663, 0.043, 0.047, 1]
const WHITE = [1, 1, 1, 1]

const OUT = { i: { x: [0.2], y: [1] }, o: { x: [0.3], y: [0] } }
const SOFT = { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } }
const still = (k) => ({ a: 0, k })
/* keys: [[frame, value], …]; the value may be a number or an array */
const keys = (list, ease = OUT) => ({ a: 1, k: list.map(([t, v], n) => (n < list.length - 1 ? { t, s: [].concat(v), ...ease } : { t, s: [].concat(v) })) })
const anim = (v) => (Array.isArray(v) && Array.isArray(v[0]) ? keys(v) : still(v))

const tr = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({ ty: 'tr', p: anim(p), a: anim(a), s: anim(s), r: anim(r), o: anim(o) })
const stroke = (c, w = 6) => ({ ty: 'st', c: still(c), o: still(100), w: still(w), lc: 2, lj: 2 })
const fill = (c, o = 100) => ({ ty: 'fl', c: still(c), o: anim(o), r: 1 })
const trim = (e, s = 0) => ({ ty: 'tm', s: anim(s), e: anim(e), o: still(0), m: 1 })
const path = (pts, closed = false) => ({ ty: 'sh', ks: still({ i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]), v: pts, c: closed }) })
const curve = (v, i, o, closed = false) => ({ ty: 'sh', ks: still({ i, o, v, c: closed }) })
const circle = (d, p = [0, 0]) => ({ ty: 'el', p: still(p), s: anim(Array.isArray(d) ? d : [d, d]) })
const rect = (w, h, r = 6, p = [0, 0]) => ({ ty: 'rc', p: still(p), s: still([w, h]), r: still(r) })
const group = (...it) => ({ ty: 'gr', it: it.some((x) => x.ty === 'tr') ? it : [...it, tr()] })

let n = 0
const layer = (shapes, { p = [60, 60], s = [100, 100], r = 0, o = 100, from = 0, to = 9999 } = {}) => ({
  ddd: 0, ind: ++n, ty: 4, nm: `l${n}`, sr: 1, ao: 0, bm: 0, ip: from, op: to, st: 0,
  ks: { o: anim(o), r: anim(r), p: anim(Array.isArray(p[0]) ? p.map(([t, v]) => [t, [...v, 0]]) : [...p, 0]), a: still([0, 0, 0]), s: anim(Array.isArray(s[0]) ? s.map(([t, v]) => [t, [...v, 100]]) : [...s, 100]) },
  shapes,
})
const file = (frames, layers) => ({ v: '5.7.4', fr: 60, ip: 0, op: frames, w: 120, h: 120, nm: 'kurkoos', ddd: 0, assets: [], layers })

// a sheet of paper with a folded corner and two lines of text
const SHEET = [[-20, -28], [8, -28], [20, -16], [20, 28], [-20, 28]]
const sheet = (line = INK, paper = WHITE) => [
  group(path(SHEET, true), fill(paper), stroke(line, 5)),
  group(path([[8, -28], [8, -16], [20, -16]]), stroke(line, 5)),
  group(path([[-10, 2], [10, 2]]), stroke(SKY, 5)),
  group(path([[-10, 14], [4, 14]]), stroke(SKY, 5)),
]
// six short rays around a centre, drawn outwards
const burst = (c, from, r0 = 34, r1 = 46) => [0, 60, 120, 180, 240, 300].map((deg) => {
  const a = (deg * Math.PI) / 180; const x = Math.cos(a); const y = Math.sin(a)
  return group(path([[x * r0, y * r0], [x * r1, y * r1]]), stroke(c, 5), trim([[from, 0], [from + 14, 100]], [[from + 8, 0], [from + 22, 100]]))
})
const TICK = [[-14, 1], [-4, 11], [15, -10]]

export const ANIMS = {
  // approved: the ring closes, the tick is signed, a short burst
  approve: () => file(70, [
    layer([group(path(TICK), stroke(WHITE, 8), trim([[18, 0], [36, 100]]))]),
    layer([group(circle(64), fill(OCEAN))], { s: [[0, [0, 0]], [16, [112, 112]], [26, [100, 100]]] }),
    layer(burst(OCEAN, 22), { o: [[22, 100], [50, 100], [62, 0]] }),
  ]),
  // received: the sheet drops into the tray, the tray answers
  upload: () => file(80, [
    layer(sheet(), { p: [[0, [60, -20]], [26, [60, 52]], [34, [60, 46]], [42, [60, 50]]], s: [[26, [100, 100]], [34, [104, 94]], [42, [100, 100]]], o: [[0, 0], [8, 100]] }),
    layer([group(path([[-34, 6], [-34, 26], [34, 26], [34, 6]]), stroke(OCEAN, 6))], { p: [[26, [60, 68]], [34, [60, 73]], [44, [60, 68]]] }),
    layer(burst(OCEAN, 36, 40, 50), { p: [60, 50], o: [[36, 100], [60, 100], [72, 0]] }),
  ]),
  // sent: the plane leaves along a curve and the trail follows
  send: () => file(80, [
    layer([group(path([[26, -22], [-24, -2], [-4, 6], [4, 26]], true), fill(OCEAN), stroke(OCEAN, 4)), group(path([[26, -22], [-4, 6]]), stroke(WHITE, 4))],
      { p: [[0, [104, 104]], [16, [86, 88]], [48, [50, 52]], [58, [56, 58]], [68, [54, 56]]], s: [[0, [50, 50]], [16, [112, 112]], [48, [100, 100]]], r: [[0, -60], [48, -92], [58, -88], [68, -90]], o: [[0, 0], [8, 100]] }),
    layer([group(curve([[40, 40], [0, 6], [-34, -22]], [[0, 0], [14, 14], [10, 12]], [[-14, -12], [-12, -12], [0, 0]]), stroke(SKY, 5), trim([[10, 0], [46, 100]], [[34, 0], [66, 70]]))], { p: [72, 74], o: [[10, 100], [70, 100]] }),
  ]),
  // saved to the cloud: the cloud is drawn, the tick lands in it
  save: () => file(80, [
    layer([group(curve([[-30, 18], [-34, -2], [-12, -14], [14, -18], [32, 2], [26, 18]], [[0, 0], [-8, 10], [-12, -2], [-10, 8], [-2, -12], [10, -2]], [[-12, 0], [0, -12], [4, -14], [14, 0], [8, 6], [0, 0]], true), fill(WHITE), stroke(INK, 6), trim([[0, 0], [30, 100]]))], { p: [60, 58] }),
    layer([group(path([[-10, 3], [-3, 10], [11, -6]]), stroke(OCEAN, 7), trim([[30, 0], [46, 100]]))], { p: [60, 62], s: [[30, [80, 80]], [46, [112, 112]], [56, [100, 100]]] }),
  ]),
  // downloaded: the arrow comes down onto the line, twice softer
  download: () => file(70, [
    layer([group(path([[0, -24], [0, 10]]), stroke(OCEAN, 7)), group(path([[-13, -2], [0, 12], [13, -2]]), stroke(OCEAN, 7))], { p: [[0, [60, 20]], [20, [60, 58]], [28, [60, 50]], [36, [60, 56]]], o: [[0, 0], [8, 100]] }),
    layer([group(path([[-26, 0], [26, 0]]), stroke(INK, 7), trim([[10, 0], [26, 100]]))], { p: [[20, [60, 84]], [28, [60, 88]], [36, [60, 84]]] }),
  ]),
  // merged: two sheets slide into one, a ring confirms
  merge: () => file(80, [
    layer(sheet(), { p: [[0, [28, 60]], [30, [60, 60]]], r: [[0, -8], [30, 0]], o: [[0, 0], [8, 100]] }),
    layer(sheet(OCEAN), { p: [[0, [92, 60]], [30, [60, 60]]], r: [[0, 8], [30, 0]], o: [[0, 0], [8, 100], [30, 100], [36, 0]] }),
    layer([group(circle([[30, [50, 50]], [58, [110, 110]]]), stroke(OCEAN, 5))], { o: [[30, 0], [36, 70], [58, 0]] }),
  ]),
  // deleted: the sheet folds away into the bin
  remove: () => file(80, [
    layer(sheet(RED), { p: [[0, [60, 30]], [34, [60, 66]]], s: [[0, [100, 100]], [34, [36, 36]]], r: [[0, 0], [34, 10]], o: [[0, 100], [28, 100], [36, 0]] }),
    layer([group(path([[-20, -8], [-16, 26], [16, 26], [20, -8]]), stroke(INK, 6)), group(path([[-26, -8], [26, -8]]), stroke(INK, 6))], { p: [[30, [60, 74]], [38, [60, 78]], [48, [60, 74]]] }),
    layer([group(path([[-9, -16], [9, -16]]), stroke(INK, 6))], { p: [[0, [60, 62]], [20, [60, 54]], [40, [60, 74]]], r: [[0, 0], [20, -18], [40, 0]] }),
  ]),
  // a message arrived (WhatsApp): the bubble pops, three dots answer
  message: () => file(80, [
    layer([group(curve([[-28, -20], [28, -20], [28, 14], [-8, 14], [-22, 26], [-18, 14], [-28, 14]], [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], true), fill(WHITE), stroke(OCEAN, 6))], { s: [[0, [0, 0]], [16, [110, 110]], [26, [100, 100]]], p: [60, 58] }),
    ...[-14, 0, 14].map((x, i) => layer([group(circle(8), fill(INK))], { p: [[20 + i * 6, [60 + x, 55]], [28 + i * 6, [60 + x, 49]], [36 + i * 6, [60 + x, 55]]], o: [[16 + i * 6, 0], [22 + i * 6, 100]] })),
  ]),
  // refused or failed: the ring shakes once, the mark is drawn
  fail: () => file(70, [
    layer([group(path([[0, -14], [0, 4]]), stroke(WHITE, 8), trim([[14, 0], [26, 100]])), group(circle(8, [0, 17]), fill(WHITE, [[24, 0], [30, 100]]))]),
    layer([group(circle(64), fill(RED))], { s: [[0, [0, 0]], [14, [108, 108]], [22, [100, 100]]], p: [[22, [60, 60]], [28, [54, 60]], [34, [66, 60]], [40, [57, 60]], [46, [60, 60]]] }),
  ]),
  // nothing here yet: a sheet floats, its shadow breathes (loop)
  empty: () => file(180, [
    layer(sheet(), { p: [[0, [60, 52]], [90, [60, 44]], [180, [60, 52]]], r: [[0, -3], [90, 3], [180, -3]] }),
    layer([group(circle([[0, [52, 8]], [90, [40, 6]], [180, [52, 8]]]), fill(SKY))], { p: [60, 100], o: [[0, 90], [90, 55], [180, 90]] }),
  ].map((l) => ({ ...l, ks: { ...l.ks, p: l.ks.p.a ? { ...l.ks.p, k: l.ks.p.k.map((k) => (k.i ? { ...k, ...SOFT } : k)) } : l.ks.p } }))),
  // waiting: three bars rise in turn, the brand's skyline (loop)
  loading: () => file(72, [
    ...[[-22, 34], [0, 54], [22, 42]].map(([x, h], i) => layer([group(rect(14, h, 4, [0, -h / 2]), fill(i === 1 ? INK : OCEAN))], { p: [60 + x, 92], s: [[i * 8, [100, 30]], [i * 8 + 18, [100, 100]], [i * 8 + 40, [100, 30]], [72, [100, 30]]] })),
  ]),
}
export const LOOPS = new Set(['empty', 'loading'])
