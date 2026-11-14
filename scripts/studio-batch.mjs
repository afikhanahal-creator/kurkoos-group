// Bulk redesign of the content engine's posts by the creative studio (public/engine/studio).
// For each post: the studio's three concepts, the best one that passes its own review (8.5+), saved as p.studio
// exactly like "שמירה לפוסט" in the studio. The original layout stays in the post; the engine shows the studio
// design in 4:5. Every saved design carries auto: '<batch>' so a batch can be undone with one SQL statement:
//   update engine_docs set data = data #- '{p,studio}' where collection='posts' and data->'p'->'studio'->>'auto' = '<batch>';
// Usage:
//   node scripts/studio-batch.mjs --posts live.json --photos photos.json --out <dir> [--limit 20] [--dry]
//        [--status "מוכן לפרסום,בבדיקה,draft,none"] [--batch b20261114] [--token-file <file>] [--sheet]
// Without --token-file nothing is written: the designs are saved as webp files in --out for review.
// The token belongs to the temporary edge function studio-batch and is never committed.
import http from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, appendFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const A = Object.fromEntries(process.argv.slice(2).map((a, i, v) => a.startsWith('--') ? [a.slice(2), v[i + 1] && !v[i + 1].startsWith('--') ? v[i + 1] : true] : []).filter((x) => x.length))
const OUT = A.out || 'studio-batch-out'; mkdirSync(OUT, { recursive: true })
const BATCH = A.batch || 'b' + new Date().toISOString().slice(0, 10).replace(/-/g, '')
const FN = 'https://filnzlnvujnlazwcxbuq.supabase.co/functions/v1/studio-batch'
const TOKEN = A['token-file'] ? readFileSync(A['token-file'], 'utf8').trim() : ''
const ORDER = String(A.status || 'מוכן לפרסום,בבדיקה,draft,none').split(',')
const log = (s) => { const l = new Date().toISOString().slice(11, 19) + ' ' + s; console.log(l); appendFileSync(join(OUT, 'batch.log'), l + '\n') }

// --news <module>: new posts from a news file (scripts/news-posts/*.mjs) instead of existing posts
const NEWS = A.news ? (await import(new URL('../' + A.news, import.meta.url))).default : null
const newsPost = (n) => {
  const now = new Date().toISOString()
  return {
    id: 'nw' + A.news.replace(/\D/g, '').slice(-4) + n.key.replace(/[^a-z0-9]/g, '').slice(0, 10), division: n.division,
    fb: n.fb, ig: n.ig, reel: n.reel, li: n.fb, hook: n.headline, topic: n.topic, domain: 'חדשות נדל״ן', format: 'תמונה', tab: 'fb',
    layout: 'x_t_c29_e06', slot: n.slot, status: 'בבדיקה', src: 'news', score: 7, slide: 0, theme: 1, key: '', mechanic: 'שאלה פתוחה בסוף',
    source: { name: n.src.name, date: n.src.date, url: n.src.url }, series: 'חדשות נדל״ן בשרון · נובמבר 2026',
    why: `חדשות אמיתיות מהשרון, עם מקור: ${n.src.name}, ${n.src.date}. כל מספר בפוסט מופיע בכתבה.`, shoot: 'אין צורך בצילום.',
    visual: { headline: n.headline, sub: n.sub, eyebrow: n.eyebrow, cta: '', items: n.items.map((i) => ({ big: i.v, label: i.l })), slides: [] },
    fx: { label: n.eyebrow, details: n.sub, location: n.location, items: n.items, theme: 'light' },
    article: {}, born: now, upd: now,
  }
}
const posts = NEWS ? NEWS.map(newsPost) : JSON.parse(readFileSync(A.posts, 'utf8'))
const photos = {}
for (const r of JSON.parse(readFileSync(A.photos, 'utf8')).rows || []) { const x = r.data; if (!x || !x.url || /\.mp4/.test(x.src || '')) continue; const o = { id: r.id, ...x }; photos[r.id] = o; photos['u_' + r.id] = o; if (x.key) photos[x.key] = o }
const done = new Set(existsSync(join(OUT, 'done.txt')) ? readFileSync(join(OUT, 'done.txt'), 'utf8').split('\n').filter(Boolean) : [])
// a video or reel post keeps its own cover; carousels and stories are left to the owner
const VIDEO = /רילס|וידאו|סטורי/
const queue = posts
  .filter((p) => p && p.id && !p.studio && !p.removed && !done.has(p.id) && !VIDEO.test(p.format || '') && ORDER.includes(p.status || 'none'))
  .sort((a, b) => ORDER.indexOf(a.status || 'none') - ORDER.indexOf(b.status || 'none') || String(a.planAt || a.upd || '').localeCompare(String(b.planAt || b.upd || '')))
  .slice(0, +A.limit || Infinity)
log(`batch ${BATCH}: ${queue.length} posts in the queue${TOKEN ? '' : ' (dry run: nothing is written)'}`)

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const server = http.createServer((q, r) => {
  let f = join('public', decodeURIComponent(q.url.split('?')[0])); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html')
  if (!existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const b = await chromium.launch()
let page
async function open() {
  page = await b.newPage()
  page.on('pageerror', (e) => log('page error ' + e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/engine/studio/render.html`)
  await page.waitForFunction('window.studioReady', null, { timeout: 60000 })
}
await open()
// the feed should not repeat one direction: the last six directions used lower the next post's ranking
const recent = []
const stats = { saved: 0, skipped: 0, failed: 0, dirs: {} }
for (let n = 0; n < queue.length; n++) {
  const p = queue[n]
  if (n && n % 150 === 0) { await page.close(); await open() } // keeps the page's memory flat over thousands of posts
  let r
  // the teaching carousel is several slides: a single image post would show its cover ("החליקו") and nothing after it
  const carousel = /קרוסלה/.test(p.format || '') || ((p.visual && p.visual.slides) || []).length > 1
  const ctx = { recent: recent.slice(-6), seed: n + 1, exclude: [...(carousel ? [] : ['edu']), ...(NEWS ? ['corporate'] : [])] }
  try { r = await page.evaluate(([post, ph, c]) => studio.best(post, ph, c), [p, photos, ctx]) }
  catch (e) { stats.failed++; log(`${p.id} render error ${e.message.slice(0, 120)}`); continue }
  if (r.skip) { stats.skipped++; log(`${p.id} skip: ${r.skip} ${JSON.stringify(r.scores || '')}`); appendFileSync(join(OUT, 'done.txt'), p.id + '\n'); continue }
  recent.push(r.scene.direction); stats.dirs[r.scene.direction] = (stats.dirs[r.scene.direction] || 0) + 1
  const pages = r.pages.map((u) => u.split(',')[1])
  if (!TOKEN || A.dry) {
    pages.forEach((d, i) => writeFileSync(join(OUT, `${String(n).padStart(4, '0')}-${p.id}-${i}.webp`), Buffer.from(d, 'base64')))
  } else {
    const design = { at: new Date().toISOString(), direction: r.scene.direction, format: 'feed', w: r.scene.w, h: r.scene.h, pages: [], score: r.review.total, use: true, auto: BATCH, source: r.scene }
    let ok = false
    for (let t = 0; t < 3 && !ok; t++) {
      try {
        // the engine stores a post under its key when it has one (v31Id in public/engine/index.html)
        const docId = String(p.key || p.id).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_')
        const body = { op: 'save', postId: docId, design, pages }
        if (NEWS) { const { division, ...post } = p; body.newPost = { ...post, studio: undefined } }
        const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-batch-token': TOKEN }, body: JSON.stringify(body) })
        const j = await res.json()
        if (res.ok && j.ok) ok = true; else log(`${p.id} save ${res.status} ${JSON.stringify(j).slice(0, 160)}`)
      } catch (e) { log(`${p.id} save error ${e.message}`) }
    }
    if (!ok) { stats.failed++; continue }
  }
  stats.saved++
  appendFileSync(join(OUT, 'done.txt'), p.id + '\n')
  log(`${p.id} ${r.scene.direction} ${r.review.total} (${(p.visual && p.visual.headline || p.hook || '').slice(0, 40)})`)
}
log('done ' + JSON.stringify(stats))
writeFileSync(join(OUT, 'stats.json'), JSON.stringify(stats, null, 1))
await b.close(); server.close()
