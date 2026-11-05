// Kurkoos creative studio · the app
// New post → three concepts → editor → review → export / save. Redesign of an existing post. Reference and photo libraries.
import { loadBrand, loadFonts, render, exportBlob, toSVG, clone, hex, brand, layoutText, realWeight, analyzeImage } from './core.js'
import { concepts, vary, combine, reformat, buildReviewed, contentFromPost, analyzePost, photoUrl, DIVISIONS } from './engine.js'
import { review, CRIT, CRIT_HE, MIN_SCORE } from './qa.js'

const $ = (s, r = document) => r.querySelector(s)
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const main = $('#st-main')
const EMBED = window.parent !== window
const qs = new URLSearchParams(location.search)
const DIR_HE = {}
const S = {
  tab: 'new', fmt: 'feed', content: blankContent(), concepts: [], ranked: [], scene: null, page: 0, sel: null, hist: [], fut: [], zoom: 0,
  refs: [], photos: {}, photoList: [], posts: null, original: null, analysis: [], busy: false, combineOpen: false, ai: null, db: null, assets: null, sample: null,
}
function blankContent() { return { headline: '', sub: '', eyebrow: '', cta: '', location: '', project: '', items: [], division: '', img: null, img2: null } }
const recent = { get: () => { try { return JSON.parse(localStorage.getItem('studio_recent') || '[]') } catch (e) { return [] } }, push: (d) => { try { const a = recent.get(); a.push(d); localStorage.setItem('studio_recent', JSON.stringify(a.slice(-20))) } catch (e) {} } }
function toast(msg) { const t = $('.st-toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3400) }

// ------------------------------------------------------------------ site assets (always available, also without a session)
const SITE_ASSETS = [
  ['/divisions/humash-22-24-house.jpg', 'החומש 22-24 · בנוי', 'finish', 'humash', 'development'],
  ['/divisions/humash-22-24-sketch.webp', 'החומש 22-24 · שרטוט', 'drawing', 'humash', 'development'],
  ['/execution-gallery/1.jpg', 'אתר ביצוע · 1', 'site', '', 'raita'], ['/execution-gallery/2.jpg', 'אתר ביצוע · 2', 'site', '', 'raita'],
  ['/execution-gallery/3.jpg', 'אתר ביצוע · 3', 'site', '', 'raita'], ['/execution-gallery/6.jpg', 'אתר ביצוע · 6', 'site', '', 'raita'],
  ['/divisions/execution-bg.jpg', 'קירות מרתף · ביצוע', 'site', '', 'raita'], ['/divisions/kurkoos-showcase-poster.jpg', 'תקרה · ביצוע', 'site', '', 'raita'],
  ['/divisions/showcase/frame-a.webp', 'שלד ותקרות', 'site', '', 'raita'], ['/divisions/showcase/piles-a.webp', 'קידוח כלונסאות', 'site', '', 'raita'],
  ['/divisions/showcase/szold-a.webp', 'כלוב ברזל לכלונס', 'site', 'henrietta', 'raita'], ['/divisions/showcase/szold-c.webp', 'קשירת ברזל', 'site', 'henrietta', 'raita'],
  ['/villa-illustration.webp', 'איור וילה', 'drawing', '', 'development'],
].map(([url, name, kind, project, division]) => ({ id: 'site:' + url, key: 'site:' + url, url, name, kind, project, division, tags: 'website', w: 0, h: 0 }))
const PROJECTS = { henrietta: 'הנרייטה סאלד 22-24', hankin: 'חנקין 41', bengurion: 'בן גוריון 17', humash: 'החומש 22-24', ramhal: 'רמח״ל 6-8', shikmim: 'השקמים 24', zrubavel: 'זרובבל 15', yordei: 'יורדי הים 3', mohaliver: 'מוהליבר' }
const KIND_HE = { site: 'אתר בנייה', finish: 'בנוי', render: 'הדמיה', interior: 'פנים', exterior: 'חוץ', aerial: 'מהאוויר', drawing: 'איור', people: 'אנשים', brand: 'מותג', atmo: 'אווירה', detail: 'פרט', env: 'סביבה' }
// project from a file name or a description, when the photo has none
function guessProject(t) { t = String(t || ''); for (const [k, he] of Object.entries(PROJECTS)) if (t.includes(he.split(' ')[0]) || t.toLowerCase().includes(k)) return k; return '' }

// ------------------------------------------------------------------ data
async function boot() {
  await loadBrand()
  for (const d of brand().layouts.directions) DIR_HE[d.id] = d.he
  try { if (window.claude) { S.db = await window.claude.use('db'); S.assets = await window.claude.use('assets'); S.sample = await window.claude.use('sample') } } catch (e) {}
  if (EMBED) $('[data-act="close"]').hidden = false
  loadFonts().then(() => draw())
  loadPhotos(); loadRefs()
  const want = qs.get('mode') === 'redesign' ? 'redesign' : 'new'
  setTab(want)
  if (qs.get('post')) openPostForRedesign(qs.get('post'))
}
async function loadPhotos() {
  const list = [...SITE_ASSETS]
  if (S.db) {
    try {
      const snap = await S.db.collection('photos').get()
      snap.forEach((d) => { const x = d.data(); if (!x || !x.url || /\.mp4/.test(x.src || '')) return; const o = { id: d.id, ...x, url: photoUrl(x.url) }; o.project = o.project || guessProject(o.name); list.push(o) })
    } catch (e) { console.warn('photos', e) }
  }
  S.photoList = list; S.photos = {}
  for (const p of list) { S.photos[p.id] = p; if (p.key) S.photos[p.key] = p; S.photos['u_' + p.id] = p }
  if (S.tab === 'assets') draw()
}
async function loadRefs() {
  try {
    if (S.db) { const snap = await S.db.collection('creative_refs').get(); S.refs = []; snap.forEach((d) => S.refs.push({ id: d.id, ...d.data() })) }
    else S.refs = JSON.parse(localStorage.getItem('studio_refs') || '[]')
  } catch (e) { S.refs = [] }
  S.refs.sort((a, b) => String(b.at).localeCompare(String(a.at)))
  if (S.tab === 'refs') draw()
}
async function saveRef(ref) {
  ref.id = ref.id || 'r' + Date.now().toString(36)
  S.refs.unshift(ref)
  try { if (S.db) await S.db.collection('creative_refs').doc(ref.id).set(ref); else localStorage.setItem('studio_refs', JSON.stringify(S.refs.slice(0, 60))) } catch (e) { toast('השמירה לספרייה נכשלה: ' + (e.message || e)) }
}
// posts: from the engine window when embedded (it already holds them), otherwise from the database
function askParent(type, payload, timeout = 8000) {
  return new Promise((ok) => {
    if (!EMBED) return ok(null)
    const id = Math.random().toString(36).slice(2)
    const on = (e) => { if (e.data && e.data.re === id) { window.removeEventListener('message', on); ok(e.data.value) } }
    window.addEventListener('message', on)
    window.parent.postMessage({ type, id, ...payload }, location.origin)
    setTimeout(() => { window.removeEventListener('message', on); ok(null) }, timeout)
  })
}
async function loadPosts() {
  if (S.posts) return S.posts
  let list = await askParent('kurkoos-studio:posts', {})
  if (!list && S.db) {
    try { const snap = await S.db.collection('posts').get(); list = []; snap.forEach((d) => { const x = d.data(); if (x && x.p && !x.removed) list.push(x.p) }) } catch (e) { list = [] }
  }
  S.posts = (list || []).filter((p) => p && p.id).sort((a, b) => String(b.upd || '').localeCompare(String(a.upd || '')))
  return S.posts
}
function postStats(p) {
  const all = S.posts || []
  const ph = S.photos[p.photoKey]
  return { layoutUse: all.filter((x) => x.layout === p.layout).length - 1, photoUse: p.photoKey ? all.filter((x) => x.photoKey === p.photoKey).length - 1 : 0, darkShare: all.length ? all.filter((x) => x.theme === '0' || (x.fx && x.fx.theme === 'dark')).length / all.length : 0, photoKind: ph ? ph.kind : '' }
}

// ------------------------------------------------------------------ tabs
function setTab(t) {
  S.tab = t
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)))
  draw()
}
function draw() {
  if (S.scene) return drawEditor()
  if (S.tab === 'new') main.innerHTML = viewNew() + viewConcepts()
  else if (S.tab === 'redesign') main.innerHTML = viewRedesign()
  else if (S.tab === 'refs') main.innerHTML = viewRefs()
  else if (S.tab === 'assets') main.innerHTML = viewAssets()
  paintThumbs()
}

// ------------------------------------------------------------------ new post: the brief
function imgChip(slot, label) {
  const im = S.content[slot]
  return `<div class="st-imgslot">${im ? `<img src="${esc(im.src)}" alt=""><div><b>${esc(im.name || label)}</b><small>${esc(KIND_HE[im.kind] || '')}</small></div><button type="button" class="st-btn ghost sm" data-act="clearimg" data-slot="${slot}">הסרה</button>` : `<span>${label}</span>`}
    <button type="button" class="st-btn sm" data-act="pickimg" data-slot="${slot}">${im ? 'החלפה' : 'בחירה מהספרייה'}</button>
    <label class="st-btn ghost sm">העלאה<input type="file" accept="image/*" hidden data-up="${slot}"></label></div>`
}
function viewNew() {
  const c = S.content
  const fmts = Object.entries(brand().socialFormats).filter(([k]) => k !== 'export')
  return `<section class="st-brief" aria-labelledby="brief-h"><h1 id="brief-h">הבריף</h1>
  <p class="st-note">כל שדה שתמלאו נכנס לעיצוב כמו שהוא. המערכת לא ממציאה מספרים, שלבים או טענות.</p>
  <div class="st-grid2">
    <label class="st-f wide">כותרת<input data-c="headline" value="${esc(c.headline)}" maxlength="90" placeholder="עד 8 מילים"></label>
    <label class="st-f wide">שורת משנה<input data-c="sub" value="${esc(c.sub)}" maxlength="140"></label>
    <label class="st-f">תווית<input data-c="eyebrow" value="${esc(c.eyebrow)}" maxlength="30" placeholder="למשל: בבנייה"></label>
    <label class="st-f">מיקום<input data-c="location" value="${esc(c.location)}" maxlength="40"></label>
    <label class="st-f">פרויקט<input data-c="project" value="${esc(c.project)}" maxlength="40"></label>
    <label class="st-f">קריאה לפעולה<input data-c="cta" value="${esc(c.cta)}" maxlength="50"></label>
    <label class="st-f">חטיבה<select data-c="division"><option value="">זיהוי אוטומטי</option>${Object.entries(DIVISIONS).map(([k, d]) => `<option value="${k}" ${c.division === k ? 'selected' : ''}>${d.he} · ${d.role}</option>`).join('')}</select></label>
    <label class="st-f">שלב בנייה (רק אם ידוע)<select data-c="stage"><option value="">לא מוצג</option>${['חפירה', 'כלונסאות', 'שלד', 'מעטפת', 'גמר'].map((n, i) => `<option value="${i}" ${c.stage === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="st-f">פורמט<select data-act="fmt">${fmts.map(([k, f]) => `<option value="${k}" ${S.fmt === k ? 'selected' : ''}>${f.label} · ${f.w}×${f.h}</option>`).join('')}</select></label>
  </div>
  <fieldset class="st-items"><legend>נתונים (ערך ותיאור). רק נתונים מאומתים</legend>
    ${c.items.map((it, i) => `<div class="st-item"><input aria-label="ערך ${i + 1}" data-item="${i}" data-k="v" value="${esc(it.v)}" placeholder="380 מ״ר"><input aria-label="תיאור ${i + 1}" data-item="${i}" data-k="l" value="${esc(it.l)}" placeholder="מגרש בטאבו"><button type="button" class="st-btn ghost sm" data-act="delitem" data-i="${i}" aria-label="מחיקת נתון ${i + 1}">✕</button></div>`).join('')}
    <button type="button" class="st-btn ghost sm" data-act="additem">+ נתון</button></fieldset>
  <div class="st-grid2">${imgChip('img', 'תמונה ראשית')}${imgChip('img2', 'תמונה שנייה (ללפני ואחרי)')}</div>
  <div class="st-row"><button type="button" class="st-btn pri" data-act="generate" ${S.busy ? 'disabled' : ''}>${S.busy ? 'בונה קונספטים…' : 'צור 3 קונספטים'}</button>
  ${S.sample ? `<button type="button" class="st-btn ghost" data-act="askcd" ${S.busy ? 'disabled' : ''}>שאל את הקריאייטיב דירקטור</button>` : ''}</div>
  ${S.ai ? `<div class="st-ai" role="note"><b>הקריאייטיב דירקטור:</b> ${esc(S.ai.why || '')}${(S.ai.headlines || []).length ? `<div class="st-row">${S.ai.headlines.map((h) => `<button type="button" class="st-btn ghost sm" data-act="usehead" data-h="${esc(h)}">${esc(h)}</button>`).join('')}</div>` : ''}</div>` : ''}
  </section>`
}
function scoreBadge(r) { return `<span class="st-score ${r.approved ? 'ok' : r.total >= 7 ? 'mid' : 'bad'}" title="ציון ביקורת">${r.total.toFixed(1)}</span>` }
function viewConcepts() {
  if (!S.concepts.length) return ''
  const names = ['א', 'ב', 'ג']
  return `<section class="st-concepts" aria-labelledby="cc-h"><h2 id="cc-h">שלושה קונספטים</h2>
  <p class="st-note">כל קונספט מגיע ממשפחת קומפוזיציה אחרת: תמונה מובילה, מבנה מידע, או מגזין וטיפוגרפיה. הציון בא מבדיקה של העיצוב המצויר עצמו, וכדאי להסתכל עליו בעיניים.</p>
  <div class="st-cgrid">${S.concepts.map((s, i) => `<article class="st-card">
    <canvas class="st-thumb" data-thumb="${i}" role="img" aria-label="קונספט ${names[i]}: ${esc(DIR_HE[s.direction])}"></canvas>
    <div class="st-cmeta"><b>קונספט ${names[i]} · ${esc(DIR_HE[s.direction])}</b>${scoreBadge(s.review)}</div>
    <small>${s.pages.length > 1 ? `קרוסלה של ${s.pages.length} שקפים · ` : ''}${s.review.approved ? 'עבר ביקורת' : `${s.review.fails.length ? s.review.fails.length + ' בעיות חוסמות' : 'מתחת לסף ' + MIN_SCORE}`}${s.revisions.length ? ` · תוקן אוטומטית ${s.revisions.length} פעמים` : ''}</small>
    <div class="st-row"><button type="button" class="st-btn pri sm" data-act="choose" data-i="${i}">בחירה ועריכה</button><button type="button" class="st-btn ghost sm" data-act="vary" data-i="${i}">וריאציה חדשה</button></div>
  </article>`).join('')}</div>
  <details class="st-combine" ${S.combineOpen ? 'open' : ''}><summary>שילוב בין קונספטים</summary>
    <div class="st-grid3">${['קומפוזיציה', 'צבעוניות', 'טיפוגרפיה'].map((l, j) => `<label class="st-f">${l} מתוך<select data-comb="${j}">${S.concepts.map((s, i) => `<option value="${i}" ${i === j ? 'selected' : ''}>קונספט ${names[i]} · ${esc(DIR_HE[s.direction])}</option>`).join('')}</select></label>`).join('')}</div>
    <button type="button" class="st-btn sm" data-act="combine">שילוב לקונספט חדש</button></details>
  </section>`
}
async function paintThumbs() {
  for (const cv of document.querySelectorAll('canvas[data-thumb]')) {
    const s = S.concepts[+cv.dataset.thumb]; if (!s) continue
    await render({ w: s.w, h: s.h, layers: s.pages[0] }, cv, { scale: 360 / s.w })
  }
  for (const cv of document.querySelectorAll('canvas[data-ref]')) {
    const r = S.refs.find((x) => x.id === cv.dataset.ref); if (!r || !r.scene) continue
    await render({ w: r.scene.w, h: r.scene.h, layers: r.scene.pages[0] }, cv, { scale: 240 / r.scene.w })
  }
}
async function generate(extra = {}) {
  if (!S.content.headline.trim()) { toast('צריך כותרת כדי לבנות קונספט'); $('[data-c="headline"]') && $('[data-c="headline"]').focus(); return }
  S.busy = true; draw()
  try {
    const r = await concepts(S.content, S.fmt, { refs: S.refs, recent: recent.get(), seed: Date.now(), ...extra })
    S.concepts = r.concepts; S.ranked = r.ranked
    if (!S.concepts.length) toast('אין כיוון שאפשר לבנות ביושר מהתוכן הזה. הוסיפו תמונה או נתונים')
  } catch (e) { console.error(e); toast('הבנייה נכשלה: ' + (e.message || e)) }
  S.busy = false; draw()
  const h = $('#cc-h'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
// the Creative Director agent, through the site's Claude route: picks directions and offers headline options.
async function askCD() {
  if (!S.sample) return
  S.busy = true; draw()
  const c = S.content
  const dirs = brand().layouts.directions.map((d) => `${d.id}: ${d.he}`).join('\n')
  const approved = S.refs.filter((r) => r.status === 'approved').slice(0, 12).map((r) => `${r.direction}/${r.tone}`).join(', ')
  const rejected = S.refs.filter((r) => r.status === 'rejected').slice(0, 12).map((r) => `${r.direction}/${r.tone}${r.feedback ? ' (' + r.feedback + ')' : ''}`).join(', ')
  const prompt = `אתה הקריאייטיב דירקטור של קבוצת קורקוס (יזמות, בנייה, פיקוח ותיווך בהוד השרון).
בריף: כותרת "${c.headline}". משנה "${c.sub}". תווית "${c.eyebrow}". נתונים: ${c.items.map((i) => i.v + ' ' + i.l).join(' | ') || 'אין'}. תמונה: ${c.img ? (KIND_HE[c.img.kind] || 'יש') : 'אין'}.
כיוונים אפשריים:\n${dirs}
אושרו בעבר: ${approved || 'אין'}. נדחו בעבר: ${rejected || 'אין'}.
החזר JSON בלבד: {"directions":["id","id","id"],"why":"משפט אחד בעברית למה","headlines":["עד 3 ניסוחים חלופיים לכותרת, עד 8 מילים, בלי מקפים, בלי עובדות שלא מופיעות בבריף"]}`
  try {
    const r = await S.sample.json(prompt, { images: c.img && c.img.src ? [c.img.src] : undefined })
    S.ai = { why: r.why, headlines: (r.headlines || []).filter((h) => h && h.split(' ').length <= 10).slice(0, 3), directions: (r.directions || []).filter((d) => DIR_HE[d]) }
  } catch (e) { toast('הקריאייטיב דירקטור לא זמין כרגע: ' + (e.message || e)) }
  S.busy = false
  if (S.ai && S.ai.directions.length) {
    // build the directions it chose; the review still decides what passes
    S.busy = true; draw()
    const cs = []
    for (const d of S.ai.directions.slice(0, 3)) cs.push(await buildReviewed(await prep(S.content), S.fmt, d, { variant: 0, tone: cs.length % 2 ? 'paper' : 'navy', type: ['heavy', 'editorial', 'light'][cs.length] }, { refs: S.refs, recent: recent.get() }))
    S.concepts = cs; S.busy = false
  }
  draw()
}
async function prep(c) { c = clone(c); for (const k of ['img', 'img2']) if (c[k] && c[k].src) c[k].stats = await analyzeImage(c[k].src); return c }

// ------------------------------------------------------------------ editor
function cur() { return S.scene.pages[S.page] }
function layer(id) { return cur().find((l) => l.id === id) }
function push() { S.hist.push(JSON.stringify({ pages: S.scene.pages, content: S.scene.content })); if (S.hist.length > 80) S.hist.shift(); S.fut = []; const u = $('[data-act="undo"]'), r = $('[data-act="redo"]'); if (u) u.disabled = false; if (r) r.disabled = true }
function undo() { if (!S.hist.length) return; S.fut.push(JSON.stringify({ pages: S.scene.pages, content: S.scene.content })); const s = JSON.parse(S.hist.pop()); S.scene.pages = s.pages; S.scene.content = s.content; S.scene.review = null; drawEditor() }
function redo() { if (!S.fut.length) return; S.hist.push(JSON.stringify({ pages: S.scene.pages, content: S.scene.content })); const s = JSON.parse(S.fut.pop()); S.scene.pages = s.pages; S.scene.content = s.content; S.scene.review = null; drawEditor() }
function openEditor(scene) { S.scene = clone(scene); S.scene.review = scene.review; S.page = 0; S.sel = null; S.hist = []; S.fut = []; recent.push(scene.direction); drawEditor(); main.focus() }

const COLORS = ['navy', 'teal', 'mist', 'ice', 'red', 'paper', 'white', 'ink', 'inkSoft']
const COLOR_HE = { navy: 'כחול לילה', teal: 'טורקיז', mist: 'ערפל', ice: 'קרח', red: 'אדום קורקוס', paper: 'נייר', white: 'לבן', ink: 'דיו', inkSoft: 'דיו רך' }
function swatches(attr, val) { return `<div class="st-sw" role="radiogroup">${COLORS.map((c) => `<button type="button" role="radio" aria-checked="${val === c}" aria-label="${COLOR_HE[c]}" title="${COLOR_HE[c]}" style="background:${hex(c)}" data-${attr}="${c}"></button>`).join('')}</div>` }
function propsPanel() {
  const L = S.sel && layer(S.sel)
  if (!L) return `<p class="st-note">בחרו שכבה בעיצוב או ברשימה כדי לערוך אותה. גרירה מזיזה, הפינות משנות גודל.</p>`
  const box = `<div class="st-grid4">${['x', 'y', 'w', 'h'].map((k) => `<label class="st-f sm">${{ x: 'X', y: 'Y', w: 'רוחב', h: 'גובה' }[k]}<input type="number" data-p="${k}" value="${Math.round(L[k])}"></label>`).join('')}</div>`
  let body = ''
  if (L.type === 'text') {
    const ws = L.family === 'Almoni' ? [300, 400, 700] : [300, 400, 500, 700, 800, 900]
    body = `<label class="st-f">טקסט<textarea data-p="text" rows="3">${esc(L.text)}</textarea></label>
    <div class="st-grid2"><label class="st-f sm">פונט<select data-p="family"><option ${L.family === 'Heebo' ? 'selected' : ''}>Heebo</option><option ${L.family === 'Almoni' ? 'selected' : ''}>Almoni</option></select></label>
    <label class="st-f sm">משקל<select data-p="weight">${ws.map((w) => `<option value="${w}" ${realWeight(L.family, L.weight) === w ? 'selected' : ''}>${w}</option>`).join('')}</select></label></div>
    <div class="st-seg" role="group" aria-label="יישור">${[['right', 'ימין'], ['center', 'מרכז'], ['left', 'שמאל']].map(([v, t]) => `<button type="button" data-align="${v}" aria-pressed="${(L.align || 'right') === v}">${t}</button>`).join('')}</div>
    <label class="st-f sm">גודל מקסימלי (${Math.round(L.fit ? L.fit.max : L.size)} px)<input type="range" min="14" max="400" data-p="fsize" value="${Math.round(L.fit ? L.fit.max : L.size)}"></label>
    <label class="st-f sm">שורות לכל היותר<input type="number" min="1" max="12" data-p="maxLines" value="${L.maxLines || 4}"></label>
    <p class="st-lbl">צבע</p>${swatches('color', L.color)}`
  } else if (L.type === 'image') {
    body = `<div class="st-row"><button type="button" class="st-btn sm" data-act="pickimg" data-slot="layer">החלפת תמונה</button><label class="st-btn ghost sm">העלאה<input type="file" accept="image/*" hidden data-up="layer"></label></div>
    <label class="st-f sm">מיקוד אופקי<input type="range" min="0" max="100" data-p="fx" value="${Math.round((L.focal || [0.5])[0] * 100)}"></label>
    <label class="st-f sm">מיקוד אנכי<input type="range" min="0" max="100" data-p="fy" value="${Math.round((L.focal || [0.5, 0.5])[1] * 100)}"></label>
    <label class="st-f sm">זום<input type="range" min="100" max="300" data-p="zoom" value="${Math.round((L.zoom || 1) * 100)}"></label>
    <label class="st-f sm">טיפול בתמונה<select data-p="treatment">${Object.entries(brand().imageTreatments.treatments).filter(([k]) => !/scrim/.test(k)).map(([k, t]) => `<option value="${k}" ${L.treatment === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
    <p class="st-note">גרירה עם Shift (או במצב "הזזת תמונה") מזיזה את התמונה בתוך המסגרת במקום את המסגרת.</p>
    <label class="st-check"><input type="checkbox" data-act="panmode" ${S.pan ? 'checked' : ''}> מצב הזזת תמונה</label>`
  } else if (L.type === 'rect' || L.type === 'towers') {
    body = `<p class="st-lbl">צבע</p>${swatches(L.type === 'rect' ? 'fill' : 'color', L.type === 'rect' ? L.fill : L.color)}<label class="st-f sm">שקיפות<input type="range" min="0" max="100" data-p="alpha" value="${Math.round((L.alpha == null ? 1 : L.alpha) * 100)}"></label>`
  } else if (L.type === 'line') body = `<p class="st-lbl">צבע</p>${swatches('color', L.color)}<label class="st-f sm">עובי<input type="range" min="1" max="16" data-p="width" value="${L.width || 4}"></label>`
  else if (L.type === 'logo') body = `<div class="st-seg" role="group" aria-label="גרסת לוגו">${[['logo:light', 'לבן'], ['logo:dark', 'כהה']].map(([v, t]) => `<button type="button" data-logo="${v}" aria-pressed="${L.src === v}">${t}</button>`).join('')}</div><p class="st-note">הלוגו נשמר ביחס המקורי שלו. שינוי גודל מגדיל או מקטין, אף פעם לא מותח.</p>`
  else if (L.type === 'grad') body = `<label class="st-f sm">עוצמת ההצללה<input type="range" min="0" max="100" data-p="galpha" value="${Math.round((L.alpha == null ? 1 : L.alpha) * 100)}"></label>`
  return `<h3>${esc(L.name)}</h3>${body}${box}`
}
const TYPE_ICON = { text: 'T', image: '▣', rect: '■', grad: '◐', line: '—', logo: 'K', towers: '|||' }
function layersPanel() {
  const rows = cur().map((l, i) => [l, i]).reverse()
  return `<ol class="st-layers" aria-label="שכבות, העליונה ראשונה">${rows.map(([l, i]) => `<li class="${S.sel === l.id ? 'sel' : ''}">
    <button type="button" class="st-lname" data-sel="${l.id}" aria-pressed="${S.sel === l.id}"><span aria-hidden="true">${TYPE_ICON[l.type] || '·'}</span>${esc(l.type === 'text' ? String(l.text).slice(0, 22) || l.name : l.name)}</button>
    <button type="button" data-lact="hide" data-id="${l.id}" aria-label="${l.hidden ? 'הצגת' : 'הסתרת'} ${esc(l.name)}" aria-pressed="${!!l.hidden}">${l.hidden ? '◌' : '●'}</button>
    <button type="button" data-lact="lock" data-id="${l.id}" aria-label="${l.locked ? 'שחרור נעילה' : 'נעילת'} ${esc(l.name)}" aria-pressed="${!!l.locked}">${l.locked ? '🔒' : '🔓'}</button>
  </li>`).join('')}</ol>
  <div class="st-row"><button type="button" class="st-btn ghost sm" data-lact="up">למעלה</button><button type="button" class="st-btn ghost sm" data-lact="down">למטה</button><button type="button" class="st-btn ghost sm" data-lact="dup">שכפול</button><button type="button" class="st-btn ghost sm" data-lact="del">מחיקה</button></div>
  <div class="st-row"><button type="button" class="st-btn ghost sm" data-add="text">+ טקסט</button><button type="button" class="st-btn ghost sm" data-add="rect">+ משטח</button><button type="button" class="st-btn ghost sm" data-add="line">+ קו</button><button type="button" class="st-btn ghost sm" data-add="image">+ תמונה</button></div>`
}
function reviewPanel() {
  const r = S.scene.review
  if (!r) return `<button type="button" class="st-btn sm" data-act="review">הרצת ביקורת</button>`
  return `<div class="st-review"><div class="st-cmeta"><b>ביקורת קריאייטיב</b>${scoreBadge(r)}</div>
  <p class="st-note">${r.approved ? 'עבר את הסף (' + MIN_SCORE + ') בלי בעיות חוסמות' : 'לא עבר: ' + (r.fails.length ? r.fails.length + ' בעיות חוסמות' : 'ציון מתחת ל-' + MIN_SCORE)}. ניגודיות מינימלית ${r.minContrast}:1</p>
  <ul class="st-crit">${CRIT.map((c) => `<li><span>${CRIT_HE[c]}</span><meter min="1" max="10" low="7" high="8.5" optimum="10" value="${r.score[c]}"></meter><b>${r.score[c]}</b></li>`).join('')}</ul>
  ${r.issues.length ? `<ul class="st-issues">${r.issues.map((i) => `<li class="${i.sev}">${i.sev === 'fail' ? 'חוסם' : 'הערה'} · ${esc(i.msg)}</li>`).join('')}</ul>` : ''}
  <div class="st-row"><button type="button" class="st-btn ghost sm" data-act="review">בדיקה מחדש</button>${!r.approved ? '<button type="button" class="st-btn sm" data-act="autofix">תיקון אוטומטי</button>' : ''}</div></div>`
}
function drawEditor() {
  const s = S.scene
  const fmts = Object.entries(brand().socialFormats).filter(([k]) => k !== 'export')
  main.innerHTML = `<section class="st-ed" aria-label="עורך העיצוב">
  <div class="st-edbar">
    <button type="button" class="st-btn ghost sm" data-act="back">חזרה לקונספטים</button>
    <b>${esc(DIR_HE[s.direction])}</b>
    <button type="button" class="st-btn ghost sm" data-act="undo" ${S.hist.length ? '' : 'disabled'} aria-label="ביטול (Ctrl+Z)">↶ ביטול</button>
    <button type="button" class="st-btn ghost sm" data-act="redo" ${S.fut.length ? '' : 'disabled'} aria-label="חזרה (Ctrl+Shift+Z)">↷ חזרה</button>
    <label class="st-f inline">פורמט<select data-act="refmt">${fmts.map(([k, f]) => `<option value="${k}" ${s.format === k ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>
    <label class="st-f inline">תצוגה<select data-act="zoom"><option value="0" ${!S.zoom ? 'selected' : ''}>התאמה למסך</option><option value="0.5" ${S.zoom === 0.5 ? 'selected' : ''}>50%</option><option value="1" ${S.zoom === 1 ? 'selected' : ''}>100% (גודל ייצוא)</option></select></label>
  </div>
  ${s.pages.length > 1 ? `<div class="st-pages" role="tablist" aria-label="שקפים">${s.pages.map((_, i) => `<button type="button" role="tab" aria-selected="${i === S.page}" data-page="${i}">${i + 1}</button>`).join('')}</div>` : ''}
  <div class="st-edgrid">
    <aside class="st-side st-left" aria-label="מאפיינים">${propsPanel()}</aside>
    <div class="st-stage" data-stage><div class="st-canvaswrap" data-wrap><canvas id="st-cv" aria-label="העיצוב, ${s.w} על ${s.h}"></canvas><div class="st-selbox" hidden><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div></div></div>
    <aside class="st-side st-right" aria-label="שכבות וביקורת"><h3>שכבות</h3>${layersPanel()}${reviewPanel()}
      <h3>ייצוא ושמירה</h3>
      <div class="st-row"><button type="button" class="st-btn sm" data-exp="png">PNG</button><button type="button" class="st-btn sm" data-exp="jpg">JPEG</button><button type="button" class="st-btn ghost sm" data-exp="png2">PNG כפול</button><button type="button" class="st-btn ghost sm" data-exp="svg">SVG</button><button type="button" class="st-btn ghost sm" data-exp="json">קובץ מקור</button></div>
      ${s.content.postId ? `<button type="button" class="st-btn pri" data-act="savepost">${EMBED ? 'שמירה לפוסט' : 'שמירה לפוסט במסד'}</button>` : ''}
      <div class="st-row"><button type="button" class="st-btn ghost sm" data-act="approve">אישור ושמירה כרפרנס</button><button type="button" class="st-btn ghost sm" data-act="reject">דחייה עם הערה</button></div>
      ${S.original ? `<button type="button" class="st-btn ghost sm" data-act="compare">לפני ואחרי</button>` : ''}
    </aside>
  </div></section>`
  paintStage()
}
async function paintStage() {
  const cv = $('#st-cv'); if (!cv) return
  const s = S.scene, stage = $('[data-stage]')
  const fit = Math.min((stage.clientWidth - 24) / s.w, (Math.max(320, window.innerHeight - 190)) / s.h)
  const z = S.zoom || Math.max(0.15, fit)
  cv.style.width = s.w * z + 'px'; cv.style.height = s.h * z + 'px'
  S.view = z
  S.info = await render({ w: s.w, h: s.h, layers: cur() }, cv, { scale: Math.min(2, z * (window.devicePixelRatio || 1)) })
  placeSel()
}
function boxOf(L) { const t = S.info && S.info[L.id]; if (L.type === 'text' && t && t.box) return t.box; if (L.type === 'logo' && t && t.drawn) return t.drawn; return [L.x, L.y, L.w, L.h] }
function placeSel() {
  const sb = $('.st-selbox'); if (!sb) return
  const L = S.sel && layer(S.sel)
  if (!L || L.hidden) { sb.hidden = true; return }
  const [x, y, w, h] = L.type === 'text' ? [L.x, L.y, L.w, L.h] : boxOf(L)
  Object.assign(sb.style, { left: x * S.view + 'px', top: y * S.view + 'px', width: w * S.view + 'px', height: h * S.view + 'px' })
  sb.hidden = false; sb.classList.toggle('locked', !!L.locked)
}
function changed(redrawPanels) { S.scene.review = null; if (redrawPanels) drawEditor(); else paintStage() }
let liveT = 0
function live() { clearTimeout(liveT); liveT = setTimeout(() => paintStage(), 40) }

// pointer: select, move, resize, pan image
let drag = null
function toScene(e) { const r = $('#st-cv').getBoundingClientRect(); return [(e.clientX - r.left) / S.view, (e.clientY - r.top) / S.view] }
function hit(x, y) {
  const ls = cur()
  for (let i = ls.length - 1; i >= 0; i--) { const L = ls[i]; if (L.hidden || L.type === 'grad') continue; const [bx, by, bw, bh] = L.type === 'text' ? [L.x, L.y, L.w, L.h] : boxOf(L); if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return L }
  return null
}
main.addEventListener('pointerdown', (e) => {
  if (!S.scene) return
  const handle = e.target.closest('.st-selbox i')
  const onCanvas = e.target.id === 'st-cv' || handle || e.target.closest('.st-selbox')
  if (!onCanvas) return
  e.preventDefault()
  const [x, y] = toScene(e)
  let L = handle ? layer(S.sel) : hit(x, y)
  if (!handle && L && L.id !== S.sel) { S.sel = L.id; drawEditor(); L = layer(S.sel) }
  if (!L) { if (S.sel) { S.sel = null; drawEditor() } return }
  if (L.locked) return
  push()
  drag = { id: L.id, h: handle ? handle.dataset.h : null, x0: x, y0: y, L0: clone(L), pan: L.type === 'image' && (e.shiftKey || S.pan) }
  try { e.target.setPointerCapture(e.pointerId) } catch (er) {}
})
main.addEventListener('pointermove', (e) => {
  if (!drag) return
  const [x, y] = toScene(e), L = layer(drag.id), d = drag.L0, dx = x - drag.x0, dy = y - drag.y0
  if (drag.pan) { const f = d.focal || [0.5, 0.5]; L.focal = [Math.min(1, Math.max(0, f[0] - dx / L.w)), Math.min(1, Math.max(0, f[1] - dy / L.h))] }
  else if (drag.h) {
    if (drag.h.includes('e')) L.w = Math.max(20, d.w + dx); if (drag.h.includes('s')) L.h = Math.max(20, d.h + dy)
    if (drag.h.includes('w')) { L.x = d.x + dx; L.w = Math.max(20, d.w - dx) } if (drag.h.includes('n')) { L.y = d.y + dy; L.h = Math.max(20, d.h - dy) }
  } else {
    // soft snap to the frame's margins and centre
    let nx = d.x + dx, ny = d.y + dy; const m = brand().spacing.margins1080.standard * (S.scene.w / 1080), sn = 10 / S.view
    for (const t of [m, S.scene.w - m - L.w, (S.scene.w - L.w) / 2]) if (Math.abs(nx - t) < sn) nx = t
    for (const t of [m, S.scene.h - m - L.h, (S.scene.h - L.h) / 2]) if (Math.abs(ny - t) < sn) ny = t
    L.x = nx; L.y = ny
  }
  S.scene.review = null; live()
})
main.addEventListener('pointerup', () => { if (drag) { drag = null; drawEditor() } })

// keyboard: undo/redo, nudge, delete, escape
document.addEventListener('keydown', (e) => {
  if (!S.scene) return
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
  if (inField) return
  const L = S.sel && layer(S.sel)
  if (L && !L.locked && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault(); push(); const st = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowUp') L.y -= st; if (e.key === 'ArrowDown') L.y += st; if (e.key === 'ArrowLeft') L.x -= st; if (e.key === 'ArrowRight') L.x += st
    changed(false)
  }
  if (L && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); layerAct('del') }
  if (e.key === 'Escape' && S.sel) { S.sel = null; drawEditor() }
})
function layerAct(a, id) {
  const ls = cur(), L = layer(id || S.sel); if (!L) return
  const i = ls.indexOf(L); push()
  if (a === 'hide') L.hidden = !L.hidden
  else if (a === 'lock') L.locked = !L.locked
  else if (a === 'up' && i < ls.length - 1) { ls.splice(i, 1); ls.splice(i + 1, 0, L) }
  else if (a === 'down' && i > 0) { ls.splice(i, 1); ls.splice(i - 1, 0, L) }
  else if (a === 'dup') { const c = clone(L); c.id = L.type + '_' + Date.now().toString(36); c.name = L.name + ' (עותק)'; c.x += 24; c.y += 24; ls.splice(i + 1, 0, c); S.sel = c.id }
  else if (a === 'del') { ls.splice(i, 1); S.sel = null }
  changed(true)
}
function addLayer(type) {
  push(); const s = S.scene, k = s.w / 1080, id = type + '_' + Date.now().toString(36)
  const base = { id, x: s.w * 0.2, y: s.h * 0.4, w: s.w * 0.6, h: 140 * k }
  const L = type === 'text' ? { ...base, type, name: 'טקסט', bind: '', role: 'sub', text: 'טקסט חדש', family: 'Almoni', weight: 400, lh: 1.3, color: 'navy', align: 'right', fit: { min: 24 * k, max: 44 * k }, maxLines: 3 }
    : type === 'rect' ? { ...base, type, name: 'משטח', fill: 'navy' } : type === 'line' ? { ...base, h: 20, type, name: 'קו', color: 'red', width: 4 * k }
    : { ...base, h: s.h * 0.3, type: 'image', name: 'תמונה', src: (S.scene.content.img && S.scene.content.img.src) || '/divisions/humash-22-24-house.jpg', focal: [0.5, 0.5], zoom: 1, treatment: 'natural' }
  cur().push(L); S.sel = id; changed(true)
}

// ------------------------------------------------------------------ export, save, references
function fname(ext, i) { const s = S.scene; return `kurkoos-${s.direction}-${s.format}${s.pages.length > 1 ? '-' + String(i + 1).padStart(2, '0') : ''}.${ext}` }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 3000) }
async function exportAs(kind) {
  const s = S.scene
  const pages = s.pages.map((layers) => ({ w: s.w, h: s.h, layers }))
  if (kind === 'json') return download(new Blob([JSON.stringify({ ...s, review: undefined }, null, 1)], { type: 'application/json' }), fname('kurkoos.json', 0).replace(/-\d\d\./, '.'))
  if (kind === 'svg') { pages.forEach((p, i) => download(new Blob([toSVG(p)], { type: 'image/svg+xml' }), fname('svg', i))); return }
  const type = kind === 'jpg' ? 'image/jpeg' : 'image/png', scale = kind === 'png2' ? 2 : 1
  toast('מייצא…')
  const blobs = []
  for (const p of pages) blobs.push(await exportBlob(p, type, scale, brand().socialFormats.export.jpeg.quality))
  if (blobs.length > 1 && (await loadZip())) {
    const z = new window.JSZip(); blobs.forEach((b, i) => z.file(fname(kind === 'jpg' ? 'jpg' : 'png', i), b))
    return download(await z.generateAsync({ type: 'blob' }), `kurkoos-${s.direction}-carousel.zip`)
  }
  blobs.forEach((b, i) => download(b, fname(kind === 'jpg' ? 'jpg' : 'png', i)))
}
function loadZip() { if (window.JSZip) return Promise.resolve(true); return new Promise((ok) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; sc.onload = () => ok(true); sc.onerror = () => ok(false); document.head.appendChild(sc) }) }
async function uploadPages() {
  if (!S.assets) return null
  const out = []
  for (const layers of S.scene.pages) { const b = await exportBlob({ w: S.scene.w, h: S.scene.h, layers }, 'image/png'); const r = await S.assets.upload(b, { ext: 'png' }); out.push(r.url) }
  return out
}
async function ensureReview() { if (!S.scene.review) S.scene.review = await review(S.scene, { refs: S.refs, recent: recent.get() }); return S.scene.review }
async function savePost() {
  const r = await ensureReview()
  if (!r.approved && !confirm(`העיצוב לא עבר ביקורת (${r.total}). לשמור בכל זאת?`)) return
  toast('מעלה את העיצוב…')
  let pages = null
  try { pages = await uploadPages() } catch (e) { return toast('ההעלאה נכשלה: ' + (e.message || e)) }
  if (!pages) return toast('אין חיבור לאחסון. התחברו לניהול')
  const design = { at: new Date().toISOString(), direction: S.scene.direction, format: S.scene.format, w: S.scene.w, h: S.scene.h, pages, score: r.total, use: S.scene.format === 'feed', source: { ...S.scene, review: undefined, content: { ...S.scene.content, img: S.scene.content.img && { src: S.scene.content.img.src, key: S.scene.content.img.key }, img2: S.scene.content.img2 && { src: S.scene.content.img2.src, key: S.scene.content.img2.key } } } }
  const ok = await askParent('kurkoos-studio:save', { postId: S.scene.content.postId, design })
  if (ok) return toast(design.use ? 'נשמר. העיצוב החדש הוא עכשיו התמונה של הפוסט במנוע' : 'נשמר לפוסט (בפורמט הזה הוא נשמר כנכס נוסף)')
  if (S.db) { try { await S.db.doc('posts/' + S.scene.content.postId).update({ p: { studio: design, upd: design.at }, upd: design.at }); return toast('נשמר במסד. רעננו את המנוע כדי לראות') } catch (e) { return toast('השמירה נכשלה: ' + (e.message || e)) } }
  toast('אין חיבור למסד')
}
async function addRef(status) {
  const r = await ensureReview()
  let feedback = ''
  if (status === 'rejected') { feedback = prompt('מה לא עבד בעיצוב הזה? (זה ילמד את הסטודיו)') || ''; if (!feedback && !confirm('לדחות בלי הערה?')) return }
  else if (!r.approved) { toast(`רפרנס מאושר צריך לעבור ביקורת (${MIN_SCORE}). תקנו או הריצו תיקון אוטומטי`); return }
  else feedback = prompt('הערה לרפרנס (לא חובה)') || ''
  let png = ''
  try { const urls = S.assets ? await uploadPages() : null; png = urls ? urls[0] : '' } catch (e) {}
  const s = S.scene
  const head = s.pages[0].find((l) => l.bind === 'headline')
  await saveRef({ at: new Date().toISOString(), status, feedback, direction: s.direction, tone: s.meta.tone, type: s.opts.type, variant: s.opts.variant, treatment: s.opts.treatment, format: s.format, division: s.content.division, score: r.total, png, postId: s.content.postId || '', typography: head ? { family: head.family, weight: head.weight, size: (S.info[head.id] || {}).size } : null, scene: { ...s, review: undefined } })
  toast(status === 'approved' ? 'נשמר כרפרנס מאושר' : 'נשמר כרפרנס שנדחה. הסטודיו יימנע מהכיוון הזה')
}

// ------------------------------------------------------------------ redesign
function viewRedesign() {
  const o = S.original
  const posts = S.posts
  const q = (S.q || '').trim()
  const list = posts ? posts.filter((p) => !q || [p.visual && p.visual.headline, p.topic, p.hook].join(' ').includes(q)).slice(0, 40) : []
  return `<section class="st-brief" aria-labelledby="rd-h"><h1 id="rd-h">עיצוב מחדש לפוסט קיים</h1>
  <p class="st-note">בוחרים פוסט מהמערכת, או מעלים תמונה של פוסט. הסטודיו שומר את המסר ואת העובדות, מזהה מה חלש בעיצוב, ובונה שלושה עיצובים חדשים.</p>
  <div class="st-row"><label class="st-btn ghost">העלאת תמונה של פוסט קיים<input type="file" accept="image/*" hidden data-up="original"></label>
  ${posts ? '' : '<button type="button" class="st-btn" data-act="loadposts">טעינת הפוסטים מהמערכת</button>'}</div>
  ${o && !S.showList ? '<button type="button" class="st-btn ghost" data-act="showlist">בחירת פוסט אחר</button>' : ''}
  ${posts && (!o || S.showList) ? `<label class="st-f wide">חיפוש פוסט<input type="search" data-act="q" value="${esc(q)}" placeholder="מילה מהכותרת או מהנושא"></label>
  <ul class="st-plist">${list.map((p) => `<li><button type="button" data-post="${esc(p.id)}"><b>${esc((p.visual && p.visual.headline) || p.hook || p.topic || p.id)}</b><small>${esc(p.topic || '')} · ${esc(p.layout || '')}</small></button></li>`).join('') || '<li class="st-note">לא נמצאו פוסטים</li>'}</ul>` : ''}
  </section>
  ${o ? `<section class="st-brief" aria-labelledby="an-h"><h2 id="an-h">ניתוח המקור</h2><div class="st-orig">${o.src ? `<img src="${esc(o.src)}" alt="העיצוב המקורי">` : '<div class="st-note">אין תצוגה של המקור</div>'}
    <div><p><b>המסר שנשמר:</b> ${esc(S.content.headline)}${S.content.sub ? ' · ' + esc(S.content.sub) : ''}</p>
    ${S.content.items.length ? `<p><b>עובדות שנשמרו:</b> ${S.content.items.map((i) => esc(`${i.v} ${i.l}`)).join(' · ')}</p>` : ''}
    <ul class="st-issues">${S.analysis.map((a) => `<li class="warn">${esc(a.msg)}</li>`).join('') || '<li class="st-note">לא נמצאו בעיות מובהקות בנתונים. הניתוח החזותי מופיע אחרי שהקונספטים נבנים.</li>'}</ul>
    <div class="st-row"><button type="button" class="st-btn" data-act="tobrief">עריכת הבריף</button><button type="button" class="st-btn pri" data-act="generate">צור 3 עיצובים חדשים</button>${S.sample && o.src ? '<button type="button" class="st-btn ghost" data-act="vision">ניתוח חזותי של המקור</button>' : ''}</div></div></div></section>` : ''}
  ${S.concepts.length && S.tab === 'redesign' ? viewConcepts() : ''}`
}
async function openPostForRedesign(id) {
  const posts = await loadPosts()
  let p = posts.find((x) => x.id === id)
  if (!p) { p = await askParent('kurkoos-studio:post', { postId: id }); if (!p) return toast('הפוסט לא נמצא') }
  if (!Object.keys(S.photos).length || S.photoList.length === SITE_ASSETS.length) await loadPhotos()
  S.content = contentFromPost(p, S.photos)
  S.analysis = analyzePost(p, postStats(p))
  const thumb = await askParent('kurkoos-studio:thumb', { postId: id }, 12000)
  S.original = { post: p, src: thumb || '' }; S.showList = false
  S.concepts = []
  // a redesign never repeats the post's old composition family by accident: exclude nothing, but the ranking already
  // penalises the directions used recently
  S.tab = 'redesign'; draw()
}
async function visionAnalysis() {
  if (!S.sample || !S.original || !S.original.src) return
  toast('מנתח את העיצוב המקורי…')
  try {
    const blob = await (await fetch(S.original.src)).blob()
    const r = await S.sample.json(`זה פוסט ברשת של קבוצת קורקוס. נתח אותו כמו קריאייטיב דירקטור. החזר JSON בלבד:
{"headline":"הכותרת כפי שהיא כתובה בתמונה","sub":"שורת המשנה אם יש","facts":["עובדות שכתובות בתמונה, מילה במילה"],"weaknesses":["עד 5 חולשות קונקרטיות: היררכיה, טיפוגרפיה, צילום, קומפוזיציה, אלמנטים גנריים"]}
אל תמציא עובדות שלא כתובות בתמונה.`, { images: [blob] })
    if (r.headline && !S.content.headline) S.content.headline = r.headline
    if (r.sub && !S.content.sub) S.content.sub = r.sub
    S.analysis = [...S.analysis, ...(r.weaknesses || []).map((w) => ({ k: 'vision', msg: w }))]
    if ((r.facts || []).length && !S.content.items.length) S.original.facts = r.facts
  } catch (e) { toast('הניתוח החזותי לא זמין: ' + (e.message || e)) }
  draw()
}
function compareView() {
  const o = S.original; if (!o) return
  const dlg = document.createElement('dialog'); dlg.className = 'st-dlg'; dlg.setAttribute('aria-label', 'לפני ואחרי')
  dlg.innerHTML = `<div class="st-cmp"><figure><figcaption>לפני</figcaption>${o.src ? `<img src="${esc(o.src)}" alt="העיצוב המקורי">` : '<p class="st-note">אין תמונה של המקור</p>'}</figure><figure><figcaption>אחרי</figcaption><canvas></canvas></figure></div><button type="button" class="st-btn" data-close>סגירה</button>`
  document.body.appendChild(dlg); dlg.showModal()
  render({ w: S.scene.w, h: S.scene.h, layers: S.scene.pages[0] }, dlg.querySelector('canvas'), { scale: 0.5 })
  dlg.addEventListener('close', () => dlg.remove()); dlg.querySelector('[data-close]').onclick = () => dlg.close()
}

// ------------------------------------------------------------------ libraries
function viewRefs() {
  const a = S.refs.filter((r) => r.status === 'approved'), j = S.refs.filter((r) => r.status === 'rejected')
  const card = (r) => `<article class="st-card sm"><canvas data-ref="${esc(r.id)}" role="img" aria-label="${esc(DIR_HE[r.direction] || r.direction)}"></canvas><div class="st-cmeta"><b>${esc(DIR_HE[r.direction] || r.direction)}</b><span class="st-score ${r.status === 'approved' ? 'ok' : 'bad'}">${r.status === 'approved' ? 'אושר' : 'נדחה'}</span></div><small>${esc(r.tone || '')} · ${esc(r.type || '')} · ${esc((DIVISIONS[r.division] || {}).he || '')} · ${r.score || ''}</small>${r.feedback ? `<p class="st-note">"${esc(r.feedback)}"</p>` : ''}<div class="st-row"><button type="button" class="st-btn ghost sm" data-refopen="${esc(r.id)}">פתיחה בעורך</button></div></article>`
  return `<section class="st-brief" aria-labelledby="rf-h"><h1 id="rf-h">ספריית רפרנסים</h1>
  <p class="st-note">כל עיצוב שאושר או נדחה נשמר כאן עם הכיוון, הצבעוניות, הטיפוגרפיה וההערה. כשבונים קונספטים חדשים, כיוונים שנדחו מקבלים עדיפות נמוכה, כיוונים שאושרו מקבלים עדיפות קלה, והסטודיו נמנע מלחזור על אותו כיוון שוב ושוב. הוא לא מעתיק עיצובים קודמים.</p>
  <h2>אושרו (${a.length})</h2><div class="st-cgrid sm">${a.map(card).join('') || '<p class="st-note">עדיין אין</p>'}</div>
  <h2>נדחו (${j.length})</h2><div class="st-cgrid sm">${j.map(card).join('') || '<p class="st-note">עדיין אין</p>'}</div></section>`
}
function viewAssets() {
  const f = S.af || {}
  const list = S.photoList.filter((p) => (!f.project || p.project === f.project) && (!f.kind || p.kind === f.kind) && (!f.division || (p.division || '') === f.division))
  return `<section class="st-brief" aria-labelledby="as-h"><h1 id="as-h">ספריית תמונות</h1>
  <p class="st-note">תמונות אמיתיות מהפרויקטים. איורים ותמונות אווירה מסומנים, ולא מוצגים כפרויקט של החברה. תמונה חדשה מקבלת פרויקט אוטומטית לפי השם שלה, ואפשר לתקן.</p>
  <div class="st-grid4">
    <label class="st-f sm">פרויקט<select data-af="project"><option value="">הכול</option>${Object.entries(PROJECTS).map(([k, v]) => `<option value="${k}" ${f.project === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="st-f sm">סוג<select data-af="kind"><option value="">הכול</option>${Object.entries(KIND_HE).map(([k, v]) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="st-f sm">חטיבה<select data-af="division"><option value="">הכול</option>${Object.entries(DIVISIONS).map(([k, v]) => `<option value="${k}" ${f.division === k ? 'selected' : ''}>${v.he}</option>`).join('')}</select></label>
    <label class="st-btn">העלאה<input type="file" accept="image/*" multiple hidden data-up="library"></label></div>
  <p class="st-note">${list.length} תמונות</p>
  <ul class="st-assets">${list.slice(0, 160).map((p) => `<li><img loading="lazy" src="${esc(p.url)}" alt="${esc(p.name)}"><div><b>${esc(p.name)}</b><small>${esc(KIND_HE[p.kind] || p.kind || '')}${p.project ? ' · ' + esc(PROJECTS[p.project] || p.project) : ''}</small>
    ${S.db && !String(p.id).startsWith('site:') ? `<div class="st-grid3"><select aria-label="פרויקט" data-tagp="${esc(p.id)}"><option value="">פרויקט</option>${Object.entries(PROJECTS).map(([k, v]) => `<option value="${k}" ${p.project === k ? 'selected' : ''}>${v}</option>`).join('')}</select><select aria-label="חטיבה" data-tagd="${esc(p.id)}"><option value="">חטיבה</option>${Object.entries(DIVISIONS).map(([k, v]) => `<option value="${k}" ${p.division === k ? 'selected' : ''}>${v.he}</option>`).join('')}</select><input aria-label="קמפיין" data-tagc="${esc(p.id)}" value="${esc(p.campaign || '')}" placeholder="קמפיין"></div>` : ''}</div></li>`).join('')}</ul></section>`
}
async function tagPhoto(id, field, value) {
  const p = S.photos[id]; if (!p || !S.db) return
  p[field] = value
  try { await S.db.collection('photos').doc(id).update({ [field]: value }); toast('נשמר') } catch (e) { toast('השמירה נכשלה') }
}
function pickImage(slot) {
  const dlg = document.createElement('dialog'); dlg.className = 'st-dlg'; dlg.setAttribute('aria-label', 'בחירת תמונה')
  const real = S.photoList.filter((p) => !['drawing', 'brand', 'people', 'atmo'].includes(p.kind))
  const other = S.photoList.filter((p) => ['drawing', 'atmo'].includes(p.kind))
  const tile = (p) => `<button type="button" data-pick="${esc(p.id)}"><img loading="lazy" src="${esc(p.url)}" alt=""><small>${esc(p.name)}</small></button>`
  dlg.innerHTML = `<h2>בחירת תמונה</h2><p class="st-note">תמונות אמיתיות מהפרויקטים קודם. איורים ותמונות אווירה בסוף, כי הם לא מראים פרויקט של החברה.</p><div class="st-pick">${real.map(tile).join('')}</div><h3>איורים ואווירה</h3><div class="st-pick">${other.map(tile).join('')}</div><button type="button" class="st-btn" data-close>ביטול</button>`
  document.body.appendChild(dlg); dlg.showModal()
  dlg.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pick]'); if (b) { const p = S.photos[b.dataset.pick]; dlg.close(); await useImage(slot, { key: p.key || p.id, src: p.url, kind: p.kind, project: p.project, name: p.name, w: +p.w, h: +p.h }) }
    if (e.target.closest('[data-close]')) dlg.close()
  })
  dlg.addEventListener('close', () => dlg.remove())
}
async function useImage(slot, im) {
  im.stats = await analyzeImage(im.src)
  if (slot === 'layer') { const L = layer(S.sel); if (L) { push(); L.src = im.src; L.focal = (im.stats && im.stats.focal) || [0.5, 0.5]; L.zoom = 1; changed(true) } return }
  S.content[slot] = im
  if (im.project && !S.content.project) S.content.project = PROJECTS[im.project] || ''
  draw()
}
async function upload(slot, files) {
  for (const f of files) {
    let url = URL.createObjectURL(f), id = 'local:' + f.name
    if (S.assets && slot !== 'original') {
      try {
        const r = await S.assets.upload(f, { ext: (f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg') }); url = r.url; id = r.id
        const im = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = URL.createObjectURL(f) })
        const doc = { url, src: 'upload:' + id, kind: 'site', name: f.name.replace(/\.\w+$/, ''), tags: 'upload,studio', project: guessProject(f.name), addedAt: new Date().toISOString(), w: im ? im.naturalWidth : 0, h: im ? im.naturalHeight : 0 }
        if (S.db) await S.db.collection('photos').doc(id).set(doc)
        const p = { id, key: 'u_' + id, ...doc }; S.photoList.push(p); S.photos[id] = p; S.photos['u_' + id] = p
      } catch (e) { toast('ההעלאה נכשלה, התמונה בשימוש מקומי בלבד') }
    }
    if (slot === 'original') { S.original = { src: url, post: null }; S.content = blankContent(); S.analysis = [{ k: 'upload', msg: 'תמונה שהועלתה: מלאו את הבריף עם המסר המקורי, או הריצו ניתוח חזותי.' }]; draw(); return }
    if (slot === 'library') continue
    await useImage(slot, { key: id, src: url, kind: 'site', name: f.name, project: guessProject(f.name) })
  }
  if (slot === 'library') draw()
}

// ------------------------------------------------------------------ events
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button,[data-tab]'); if (!t) return
  if (t.dataset.tab) { S.scene = null; return setTab(t.dataset.tab) }
  const a = t.dataset.act
  if (t.dataset.sel) { S.sel = t.dataset.sel; return drawEditor() }
  if (t.dataset.lact) return layerAct(t.dataset.lact, t.dataset.id)
  if (t.dataset.add) return addLayer(t.dataset.add)
  if (t.dataset.page) { S.page = +t.dataset.page; S.sel = null; return drawEditor() }
  if (t.dataset.exp) return exportAs(t.dataset.exp)
  if (t.dataset.post) return openPostForRedesign(t.dataset.post)
  if (t.dataset.refopen) { const r = S.refs.find((x) => x.id === t.dataset.refopen); if (r && r.scene) openEditor(r.scene); return }
  const L = S.scene && S.sel && layer(S.sel)
  for (const k of ['color', 'fill']) if (t.dataset[k] && L) { push(); L[k] = t.dataset[k]; return changed(true) }
  if (t.dataset.align && L) { push(); L.align = t.dataset.align; return changed(true) }
  if (t.dataset.logo && L) { push(); L.src = t.dataset.logo; return changed(true) }
  if (a === 'close') { if (!S.scene || confirm('לסגור את מחלקת הקריאייטיב? שינויים שלא נשמרו לא יישמרו')) window.parent.postMessage({ type: 'kurkoos-studio:close' }, location.origin); return }
  if (a === 'generate') { if (S.tab !== 'redesign') S.tab = 'new'; return generate() }
  if (a === 'askcd') return askCD()
  if (a === 'usehead') { S.content.headline = t.dataset.h; return draw() }
  if (a === 'additem') { S.content.items.push({ v: '', l: '' }); return draw() }
  if (a === 'delitem') { S.content.items.splice(+t.dataset.i, 1); return draw() }
  if (a === 'pickimg') return pickImage(t.dataset.slot)
  if (a === 'clearimg') { S.content[t.dataset.slot] = null; return draw() }
  if (a === 'choose') return openEditor(S.concepts[+t.dataset.i])
  if (a === 'vary') { const i = +t.dataset.i; t.disabled = true; t.textContent = 'בונה…'; S.concepts[i] = await vary(S.concepts[i], { refs: S.refs, recent: recent.get() }); return draw() }
  if (a === 'combine') { const [x, y, z] = [0, 1, 2].map((j) => S.concepts[+$(`[data-comb="${j}"]`).value]); S.combineOpen = true; const s = await combine(x, y, z, { refs: S.refs, recent: recent.get() }); S.concepts.push(s); if (S.concepts.length > 4) S.concepts.splice(3, 1); return draw() }
  if (a === 'back') { if (S.hist.length && !confirm('לחזור לקונספטים? העריכה הנוכחית לא תישמר')) return; S.scene = null; return draw() }
  if (a === 'undo') return undo()
  if (a === 'redo') return redo()
  if (a === 'review') { t.disabled = true; S.scene.review = await review(S.scene, { refs: S.refs, recent: recent.get(), page: S.page }); return drawEditor() }
  if (a === 'autofix') { const s = await buildReviewed(S.scene.content, S.scene.format, S.scene.direction, { ...S.scene.opts, fix: {} }, { refs: S.refs, recent: recent.get() }); push(); Object.assign(S.scene, { pages: s.pages, review: s.review, opts: s.opts }); toast(s.review.approved ? 'תוקן ועבר ביקורת' : 'תוקן חלקית. נשארו בעיות שצריך לפתור ביד'); return drawEditor() }
  if (a === 'savepost') return savePost()
  if (a === 'approve') return addRef('approved')
  if (a === 'reject') return addRef('rejected')
  if (a === 'compare') return compareView()
  if (a === 'loadposts') { t.disabled = true; t.textContent = 'טוען…'; await loadPosts(); return draw() }
  if (a === 'tobrief') { S.tab = 'new'; return setTab('new') }
  if (a === 'vision') return visionAnalysis()
  if (a === 'showlist') { S.showList = true; await loadPosts(); return draw() }
})
document.addEventListener('input', (e) => {
  const t = e.target
  if (t.dataset.c && t.tagName !== 'SELECT') { S.content[t.dataset.c] = t.value; return }
  if (t.dataset.item) { S.content.items[+t.dataset.item][t.dataset.k] = t.value; return }
  if (t.dataset.act === 'q') { S.q = t.value; const pos = t.selectionStart; draw(); const n = $('[data-act="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos) } return }
  const L = S.scene && S.sel && layer(S.sel); if (!L || !t.dataset.p) return
  if (!t._pushed) { push(); t._pushed = true; setTimeout(() => { t._pushed = false }, 800) }
  const v = t.value, p = t.dataset.p
  if (p === 'text') { L.text = v; if (L.bind && ['headline', 'sub', 'eyebrow', 'cta', 'location'].includes(L.bind)) S.scene.content[L.bind] = v }
  else if (['x', 'y', 'w', 'h'].includes(p)) L[p] = +v
  else if (p === 'fx' || p === 'fy') { L.focal = L.focal || [0.5, 0.5]; L.focal[p === 'fx' ? 0 : 1] = +v / 100 }
  else if (p === 'zoom') L.zoom = +v / 100
  else if (p === 'alpha' || p === 'galpha') L.alpha = +v / 100
  else if (p === 'width') L.width = +v
  else if (p === 'fsize') { if (L.fit) L.fit = { min: Math.min(L.fit.min, +v), max: +v }; else L.size = +v }
  else if (p === 'maxLines') L.maxLines = +v
  S.scene.review = null; live()
})
document.addEventListener('change', async (e) => {
  const t = e.target
  if (t.dataset.c === 'division') { S.content.division = t.value; return }
  if (t.dataset.c === 'stage') { S.content.stage = t.value === '' ? undefined : +t.value; return }
  if (t.dataset.act === 'fmt') { S.fmt = t.value; return }
  if (t.dataset.act === 'zoom') { S.zoom = +t.value; return drawEditor() }
  if (t.dataset.act === 'refmt') { if (S.hist.length && !confirm('מעבר פורמט בונה את העיצוב מחדש מהתוכן. הזזות ידניות לא יעברו. להמשיך?')) { t.value = S.scene.format; return } const s = await reformat(S.scene, t.value, { refs: S.refs, recent: recent.get() }); S.scene = s; S.page = 0; S.sel = null; S.hist = []; return drawEditor() }
  if (t.dataset.act === 'panmode') { S.pan = t.checked; return }
  if (t.dataset.up) return upload(t.dataset.up, [...t.files])
  if (t.dataset.af) { S.af = { ...(S.af || {}), [t.dataset.af]: t.value }; return draw() }
  if (t.dataset.tagp) return tagPhoto(t.dataset.tagp, 'project', t.value)
  if (t.dataset.tagd) return tagPhoto(t.dataset.tagd, 'division', t.value)
  if (t.dataset.tagc) return tagPhoto(t.dataset.tagc, 'campaign', t.value)
  // text fields and sliders record their history on input; change only handles the selects
  const L = S.scene && S.sel && layer(S.sel); if (!L || !t.dataset.p || t.tagName !== 'SELECT') return
  push()
  if (t.dataset.p === 'family') { L.family = t.value; L.weight = realWeight(t.value, L.weight) }
  else if (t.dataset.p === 'weight') L.weight = +t.value
  else if (t.dataset.p === 'treatment') L.treatment = t.value
  changed(true)
})
window.addEventListener('resize', () => { if (S.scene) paintStage() })
window.addEventListener('message', (e) => { if (e.origin !== location.origin || !e.data) return; if (e.data.type === 'kurkoos-studio:open' && e.data.postId) openPostForRedesign(e.data.postId) })
window.__studio = { S, draw, generate, openEditor }
boot()
void layoutText
