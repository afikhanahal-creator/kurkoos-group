// Kurkoos creative studio · concept engine
// content -> three genuinely different concepts, each reviewed and revised until it passes (or reported honestly).
import { analyzeImage, loadFonts, loadBrand, brand, clone, rng } from './core.js'
import { DIRECTIONS, suitability, FAMILY, frame, divisionOf, DIVISIONS } from './directions.js'
import { review, fixesFor, MIN_SCORE } from './qa.js'

export { DIVISIONS }
export const SCENE_VERSION = 1
const STORE = 'https://filnzlnvujnlazwcxbuq.supabase.co/storage/v1/object/public/engine-media/'
export function photoUrl(u) {
  if (!u) return ''
  if (u.startsWith('/_blob/')) return STORE + 'blob/' + u.slice(7)
  return u
}

// ------------------------------------------------------------------ content from an engine post
// Only fields the post really has. Nothing is invented: no numbers, no stages, no claims.
export function contentFromPost(p, photos = {}) {
  const v = p.visual || {}, fx = p.fx || {}
  const items = (fx.items && fx.items.length ? fx.items.map((i) => ({ v: i.v, l: i.l })) : (v.items || []).map((i) => ({ v: i.big, l: i.label })))
    .filter((i) => i.v || i.l).filter((i) => i.v !== '?')
  const ph = (key) => {
    if (!key) return null
    const id = String(key).replace(/^u_/, '')
    const d = photos[key] || photos[id]
    if (!d) return null
    return { key, src: photoUrl(d.url), kind: d.kind, project: d.project, name: d.name, w: +d.w, h: +d.h }
  }
  const c = {
    postId: p.id, headline: (v.headline || p.hook || '').trim(), sub: (v.sub || fx.details || '').trim(), eyebrow: (fx.label || v.eyebrow || '').trim(),
    cta: (v.cta || '').trim(), items, location: (fx.location || '').trim(), project: '', topic: p.topic || '', domain: p.domain || '', body: p.fb || '',
    img: ph(p.photoKey), img2: ph(p.photo2Key),
  }
  if (c.img && c.img.name && /·/.test(c.img.name)) c.project = c.img.name.split('·')[0].trim()
  c.division = divisionOf(c)
  return c
}

async function withStats(c) {
  for (const k of ['img', 'img2']) if (c[k] && c[k].src && !c[k].stats) c[k].stats = await analyzeImage(c[k].src)
  // a photo that failed to load is not a photo
  for (const k of ['img', 'img2']) if (c[k] && !c[k].stats) c[k] = null
  return c
}

// ------------------------------------------------------------------ building and revising one concept
export function build(c, fmt, direction, opts) {
  const F = frame(fmt)
  const out = DIRECTIONS[direction](c, F, opts)
  return { v: SCENE_VERSION, format: fmt, w: F.w, h: F.h, direction, opts: clone(opts), content: c, pages: out.pages, meta: out.meta }
}
const STRONG = { mist: 'white', inkSoft: 'ink', lineStrong: 'inkSoft', teal: 'navy' }
export async function buildReviewed(c, fmt, direction, opts, ctx = {}) {
  let o = { variant: 0, seed: 1, fix: {}, ...clone(opts) }
  let scene = build(c, fmt, direction, o), r = await review(scene, ctx)
  const log = []
  for (let t = 0; t < 3 && !r.approved; t++) {
    const f = fixesFor(r)
    if (!Object.keys(f).length && !r.fails.some((x) => x.code === 'contrast')) break
    o = { ...o, fix: { ...o.fix, ...f, scrim: (o.fix.scrim || 0) + (f.scrim || 0) } }
    scene = build(c, fmt, direction, o)
    // contrast on flat colour cannot be fixed by a scrim: strengthen the soft text colours
    if (r.fails.some((x) => x.code === 'contrast')) for (const L of scene.pages[0]) if (L.type === 'text' && STRONG[L.color]) L.color = STRONG[L.color]; else if (L.type === 'text' && L.color === 'red' && scene.meta.tone === 'navy') L.color = 'white'
    log.push({ try: t + 1, fixes: Object.keys(f), before: r.total })
    r = await review(scene, ctx)
  }
  scene.review = r; scene.revisions = log
  return scene
}

// ------------------------------------------------------------------ three concepts
// One concept per composition family (image-led, structured, editorial or typographic), ranked by how well the
// direction suits the copy and the photo, minus what the reference library says was rejected or overused.
export async function concepts(content, fmt = 'feed', ctx = {}) {
  await loadBrand(); await loadFonts()
  const c = await withStats(clone(content))
  const refs = ctx.refs || []
  const ranked = Object.keys(DIRECTIONS).map((id) => {
    let s = suitability(id, c)
    const rej = refs.filter((r) => r.status === 'rejected' && r.direction === id).length
    const ok = refs.filter((r) => r.status === 'approved' && r.direction === id).length
    s += Math.min(0.6, ok * 0.15) - rej * 0.5
    s -= (ctx.recent || []).slice(-6).filter((d) => d === id).length * 0.7
    if (ctx.exclude && ctx.exclude.includes(id)) s = 0
    return { id, s }
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)
  const pick = []; const fams = new Set()
  for (const x of ranked) { if (pick.length === 3) break; if (!fams.has(FAMILY[x.id])) { pick.push(x.id); fams.add(FAMILY[x.id]) } }
  for (const x of ranked) { if (pick.length === 3) break; if (!pick.includes(x.id)) pick.push(x.id) }
  const r = rng(ctx.seed || Date.now())
  // tone balance: the three concepts never all sit on navy. The feed was 96% dark, that is half of why it looked
  // like one template. Directions that take a tone get paper first when the others are dark.
  const TONED = ['editorial', 'corporate', 'typographic', 'authority', 'realestate']
  const fixedDark = pick.filter((id) => ['launch', 'beforeafter', 'fullbleed'].includes(id)).length
  let paperLeft = Math.max(1, fixedDark ? 2 : 1)
  const out = []
  for (let i = 0; i < pick.length; i++) {
    let id = pick[i]
    const toned = TONED.includes(id)
    const tone = toned && paperLeft > 0 ? (paperLeft--, 'paper') : 'navy'
    const opts = { variant: Math.floor(r() * 2), seed: Math.floor(r() * 1e6), tone, type: ['heavy', 'editorial', 'light'][i % 3], treatment: 'natural' }
    if (id === 'realestate' && tone === 'paper') opts.variant = 0
    if (id === 'lifestyle') opts.type = 'light'
    let s = await buildReviewed(c, fmt, id, opts, ctx)
    // a concept that still fails is replaced: first the other variant, then the next direction of the same family
    if (!s.review.approved) { const s2 = await buildReviewed(c, fmt, id, { ...opts, variant: (opts.variant + 1) % 2 }, ctx); if (s2.review.total > s.review.total) s = s2 }
    if (!s.review.approved) {
      const alt = ranked.find((x) => !pick.includes(x.id) && FAMILY[x.id] === FAMILY[id])
      if (alt) { const s3 = await buildReviewed(c, fmt, alt.id, opts, ctx); if (s3.review.approved || s3.review.total > s.review.total) { s = s3; pick[i] = alt.id } }
    }
    out.push(s)
  }
  return { content: c, concepts: out, ranked }
}
// a new variation of the same direction: other variant, tone or type, never the same as before
export async function vary(scene, ctx = {}) {
  const o = clone(scene.opts)
  const step = (o.seed || 1) + 1
  const cycle = [['variant'], ['tone'], ['type'], ['variant', 'tone']][step % 4]
  if (cycle.includes('variant')) o.variant = (o.variant + 1) % 2
  if (cycle.includes('tone')) o.tone = o.tone === 'navy' ? 'paper' : 'navy'
  if (cycle.includes('type')) o.type = { heavy: 'editorial', editorial: 'light', light: 'heavy' }[o.type || 'heavy']
  o.seed = step; o.fix = {}
  return buildReviewed(scene.content, scene.format, scene.direction, o, ctx)
}
// combine: the composition of one concept, the colour of a second, the typography of a third
export async function combine(layoutFrom, toneFrom, typeFrom, ctx = {}) {
  const o = { ...clone(layoutFrom.opts), tone: toneFrom.meta.tone, type: typeFrom.opts.type, fix: {} }
  return buildReviewed(layoutFrom.content, layoutFrom.format, layoutFrom.direction, o, ctx)
}
// same concept in another format: rebuilt from the content, not stretched
export async function reformat(scene, fmt, ctx = {}) {
  return buildReviewed(scene.content, fmt, scene.direction, { ...scene.opts, fix: {} }, ctx)
}

// ------------------------------------------------------------------ redesign analysis of an existing post
// What makes the original weak, from facts the system holds about it (no guessing about pixels we cannot see).
export function analyzePost(p, stats = {}) {
  const v = p.visual || {}, fx = p.fx || {}
  const out = []
  const head = v.headline || ''
  const nw = head.split(/\s+/).filter(Boolean).length
  if (stats.layoutUse && stats.layoutUse > 25) out.push({ k: 'generic', msg: `העיצוב המקורי (${p.layout}) משמש ${stats.layoutUse} פוסטים נוספים. זה הדבר הראשון שגורם לפיד להיראות כמו תבנית.` })
  if (stats.photoUse && stats.photoUse > 10) out.push({ k: 'photo', msg: `אותה תמונה מופיעה ב-${stats.photoUse} פוסטים. העוקבים כבר ראו אותה.` })
  if (!p.photoKey) out.push({ k: 'nophoto', msg: 'אין תמונה אמיתית מפרויקט. פוסט נדל״ן בלי נכס נראה כללי.' })
  if (stats.photoKind && !/site|finish|render|interior|exterior|aerial/.test(stats.photoKind)) out.push({ k: 'stock', msg: `התמונה היא ${stats.photoKind === 'drawing' ? 'איור' : 'תמונת אווירה'}, לא תמונה של פרויקט של החברה.` })
  if (nw > 9) out.push({ k: 'head', msg: `הכותרת ארוכה (${nw} מילים). קשה לקרוא אותה בגלילה.` })
  if (fx.tf && Object.keys(fx.tf).length) out.push({ k: 'manual', msg: 'בעיצוב המקורי הזיזו טקסטים ביד, סימן שהתבנית לא התאימה לאורך הטקסט.' })
  if ((p.theme === '0' || fx.theme === 'dark') && stats.darkShare > 0.8) out.push({ k: 'dark', msg: `${Math.round(stats.darkShare * 100)}% מהפוסטים כהים. הפיד נראה אחיד מדי.` })
  if ((fx.items || []).some((i) => i.v === '?')) out.push({ k: 'placeholder', msg: 'יש נתונים שמסומנים "?" במקום ערך. בעיצוב החדש הם לא מוצגים כמספרים.' })
  return out
}
export { MIN_SCORE, brand }
