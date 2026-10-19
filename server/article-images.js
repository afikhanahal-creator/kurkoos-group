// ============================================================
// Vercel serverless: סוכן התמונות של הכתבות.
// בוחר לכל כתבה תמונות שקשורות אליה: תמונות אמיתיות ממאגר התמונות של מנוע התוכן (צילומי אתר,
// הדמיות, מבנים גמורים, מבט מהאוויר, לפי הנושא), ו/או תמונת AI לכריכה. כותב אותן כעריכה על
// הכתבה באותו מקום שהניהול שומר (site_settings), ולכן האתר מתעדכן מיד. כל שינוי נרשם ביומן עם
// המצב הקודם, כך שאפשר לבטל.
//
// POST  { action: 'run' | 'preview' | 'suggest' | 'undo', ... }  מאדמין מחובר (Bearer של Supabase)
// GET   cron יומי של Vercel (vercel.json). דורש CRON_SECRET (אם הוגדר) ו-SUPABASE_SERVICE_ROLE_KEY.
// ההגדרות: site_settings.article_images_agent = { mode: 'off'|'library'|'ai'|'mix', body: 0..3, scope: 'new'|'all', since }
// ============================================================

const SB = () => String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const ANON = () => process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PUBLIC_BLOB = (id) => `${SB()}/storage/v1/object/public/engine-media/blob/${id}`
const SETTINGS_KEY = 'article_images_agent'
const LOG_KEY = 'article_images_log'

/* איזה סוג תמונה מתאים לאיזה טור (לפי הסיווג במאגר התמונות) */
const KIND_FIT = {
  constructions: { site: 5, detail: 4, aerial: 3, drawing: 2, finish: 2, render: 1 },
  supervision: { site: 5, detail: 4, drawing: 3, aerial: 2, finish: 2 },
  brokerage: { exterior: 5, interior: 5, finish: 4, aerial: 3, atmo: 3, render: 2 },
  yazamut: { render: 5, aerial: 4, site: 3, exterior: 3, drawing: 2, finish: 2 },
  mentorguide: { render: 4, site: 4, aerial: 3, atmo: 3, drawing: 3, finish: 2 },
}
const SKIP_KINDS = new Set(['brand', 'people'])   // באנרים ותמונות של אנשים לא נכנסים לכתבות
/* שמות הפרויקטים כפי שהם מופיעים בכותרות, מול המזהה במאגר */
const PROJECTS = { henrietta: ['הנרייטה', 'סאלד'], hankin: ['חנקין'], humash: ['החומש', 'חומש'], ramhal: ['רמח'], zrubavel: ['זרובבל'], mohaliver: ['מוהליבר'], bengurion: ['בן גוריון'], shikmim: ['השקמים', 'שקמים'], yordei: ['יורדי הים'] }

const words = (t) => String(t || '').replace(/[^֐-׿a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2)

async function rest(path, { token, method = 'GET', body, prefer } = {}) {
  const key = token === SERVICE() ? SERVICE() : ANON() || SERVICE()
  const r = await fetch(`${SB()}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 160)}`)
  const t = await r.text()
  return t ? JSON.parse(t) : null
}
async function getSetting(key, token) {
  const rows = await rest(`/rest/v1/site_settings?key=eq.${encodeURIComponent(key)}&select=value`, { token })
  return rows && rows[0] ? rows[0].value : null
}
async function setSetting(key, value, token) {
  await rest('/rest/v1/site_settings?on_conflict=key', { token, method: 'POST', body: [{ key, value }], prefer: 'resolution=merge-duplicates' })
}
const parse = (v, d) => { if (v == null) return d; if (typeof v !== 'string') return v; try { return JSON.parse(v) } catch { return d } }

async function adminToken(req) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!tok) return null
  const r = await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: ANON() || SERVICE(), Authorization: `Bearer ${tok}` } }).catch(() => null)
  return r && r.ok ? tok : null
}

/* ---------- הנתונים: הכתבות, העריכות שלהן, מאגר התמונות ---------- */
async function loadAll(origin, token) {
  const idx = await fetch(`${origin}/articles-index.json`).then((r) => r.json()).catch(() => ({ items: [] }))
  const keys = [...new Set((idx.items || []).map((a) => a.key))]
  const overrides = {}
  for (const k of keys) overrides[k] = parse(await getSetting(k, token).catch(() => null), []) || []
  const photos = (await rest(`/rest/v1/engine_docs?collection=eq.photos&select=id,data&limit=2000`, { token }).catch(() => [])) || []
  const pool = photos.map((p) => {
    const d = p.data || {}
    const id = String(d.url || '').match(/_blob\/([a-f0-9]{16,})/)?.[1] || String(d.url || '').match(/engine-media\/blob\/([a-f0-9]{16,})/)?.[1]
    if (!id || SKIP_KINDS.has(d.kind)) return null
    return { url: PUBLIC_BLOB(id), name: String(d.name || ''), kind: String(d.kind || ''), project: String(d.project || ''), tags: String(d.tags || '') }
  }).filter(Boolean)
  // כל כתבה עם הערכים העדכניים (קוד + עריכות מהניהול)
  const articles = (idx.items || []).map((a) => {
    const o = (overrides[a.key] || []).find((x) => x && x.slug === a.slug) || {}
    return { ...a, ...o, key: a.key, col: a.col, route: a.route, images: Array.isArray(o.images) ? o.images : [], cover: o.cover !== undefined ? o.cover : a.cover }
  }).filter((a) => !a.deleted && !a.archived && a.published !== false)
  return { articles, overrides, pool }
}

/* ניקוד: סוג התמונה מול הטור, פרויקט שמוזכר בכתבה, מילים משותפות, ותמונה שעוד לא בשימוש */
function rank(a, pool, used) {
  const fit = KIND_FIT[a.col] || {}
  const text = `${a.title} ${a.category} ${a.keyword} ${(a.tags || []).join(' ')}`
  const aw = new Set(words(text))
  const projHits = Object.entries(PROJECTS).filter(([, names]) => names.some((n) => text.includes(n))).map(([k]) => k)
  return pool.map((p) => {
    let s = (fit[p.kind] || 0) * 2
    if (p.project && projHits.includes(p.project)) s += 12
    s += words(`${p.name} ${p.tags}`).filter((w) => aw.has(w)).length * 3
    if (used.has(p.url)) s -= 9
    if (p.kind === 'drawing') s -= 1
    return { ...p, score: s }
  }).filter((p) => p.score > 0).sort((x, y) => y.score - x.score)
}

/* Claude בוחר מבין המועמדים את המתאימות ביותר לכתבה (אם יש מפתח) */
async function claudePick(a, cands, n) {
  const KEY = process.env.ANTHROPIC_API_KEY
  if (!KEY || cands.length <= n) return cands.slice(0, n)
  const list = cands.slice(0, 14).map((c, i) => `${i}: ${c.name} (${c.kind}${c.project ? ', ' + c.project : ''})`).join('\n')
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL_QUICK || 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: `כתבה באתר של חברת בנייה ופיקוח: "${a.title}" (קטגוריה: ${a.category}).\nבחר ${n} תמונות שהכי מתאימות לכתבה, הראשונה לכריכה. החזר JSON בלבד: {"pick":[מספרים]}\n${list}` }] }),
    })
    const d = await r.json()
    const txt = (d.content || []).map((c) => c.text || '').join('')
    const pick = JSON.parse((txt.match(/\{[\s\S]*\}/) || ['{}'])[0]).pick
    if (Array.isArray(pick) && pick.length) {
      const out = pick.map((i) => cands[+i]).filter(Boolean)
      if (out.length) return [...out, ...cands.filter((c) => !out.includes(c))].slice(0, n)
    }
  } catch { /* נשארים עם הדירוג */ }
  return cands.slice(0, n)
}

async function aiCover(a, token) {
  const KEY = process.env.OPENAI_API_KEY
  if (!KEY) throw new Error('OPENAI_API_KEY חסר ב-Vercel')
  const style = a.col === 'brokerage' ? 'luxury real estate editorial photography, elegant property, natural daylight' : 'Israeli construction and real estate, editorial magazine photography, natural light'
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3', prompt: `${a.title}. ${a.category}. ${style}, photorealistic, clean composition, no text, no logos, no watermark`, size: '1792x1024', quality: 'hd', response_format: 'b64_json', n: 1 }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error((d && d.error && d.error.message) || 'יצירת התמונה נכשלה')
  const buf = Buffer.from(d.data[0].b64_json, 'base64')
  const path = `articles/${a.col}/ai-${a.slug.slice(0, 40)}-${Date.now()}.png`
  const up = await fetch(`${SB()}/storage/v1/object/media/${path}`, { method: 'POST', headers: { apikey: ANON() || SERVICE(), Authorization: `Bearer ${token}`, 'Content-Type': 'image/png', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }, body: buf })
  if (!up.ok) throw new Error('העלאת התמונה נכשלה')
  return `${SB()}/storage/v1/object/public/media/${path}`
}

/* תוכנית לכתבה אחת: כריכה + תמונות לגוף, לפי המצב */
async function planFor(a, pool, used, cfg, token, allowAi) {
  const n = 1 + Math.max(0, Math.min(3, +cfg.body || 0))
  const ranked = rank(a, pool, used)
  const picks = await claudePick(a, ranked, n)
  let cover = null, images = []
  if (cfg.mode === 'ai' || cfg.mode === 'mix') {
    if (!allowAi) return null
    cover = { url: await aiCover(a, token), alt: a.title, source: 'ai' }
    if (cfg.mode === 'mix') images = picks.slice(0, n - 1).map((p) => ({ url: p.url, alt: p.name.replace(/\s*\([^)]*\)\s*$/, ''), source: 'library' }))
  } else {
    if (!picks.length) return null
    cover = { url: picks[0].url, alt: picks[0].name.replace(/\s*\([^)]*\)\s*$/, '') || a.title, source: 'library' }
    images = picks.slice(1, n).map((p) => ({ url: p.url, alt: p.name.replace(/\s*\([^)]*\)\s*$/, ''), source: 'library' }))
  }
  return { cover, images }
}

async function writeArticle(a, patch, overrides, token) {
  const list = Array.isArray(overrides[a.key]) ? overrides[a.key] : []
  const i = list.findIndex((x) => x && x.slug === a.slug)
  const prev = i >= 0 ? { cover: list[i].cover, coverAlt: list[i].coverAlt, images: list[i].images } : {}
  if (i >= 0) list[i] = { ...list[i], ...patch }
  else list.push({ slug: a.slug, ...patch })
  overrides[a.key] = list
  await setSetting(a.key, JSON.stringify(list), token)
  return prev
}

export default async function handler(req, res) {
  if (!SB()) { res.status(503).json({ error: 'Supabase לא מוגדר' }); return }
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  let token = null
  let cron = false
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET
    if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ error: 'unauthorized' }); return }
    if (!SERVICE()) { res.status(200).json({ ok: false, error: 'כדי שהסוכן ירוץ לבד כל יום צריך SUPABASE_SERVICE_ROLE_KEY ב-Vercel. אפשר להריץ ידנית מהניהול.' }); return }
    token = SERVICE(); cron = true
  } else if (req.method === 'POST') {
    token = await adminToken(req)
    if (!token) { res.status(401).json({ error: 'צריך להתחבר לניהול' }); return }
  } else { res.status(405).json({ error: 'Method not allowed' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const action = cron ? 'run' : String(body.action || 'preview')

  try {
    const cfg = { mode: 'off', body: 1, scope: 'new', since: '', ...(parse(await getSetting(SETTINGS_KEY, token).catch(() => null), {}) || {}), ...(body.cfg || {}) }
    const { articles, overrides, pool } = await loadAll(origin, token)
    const used = new Set(articles.flatMap((a) => [a.cover, ...(a.images || []).map((x) => x.url)]).filter(Boolean))
    const today = new Date().toISOString().slice(0, 10)

    if (action === 'suggest') {
      const a = articles.find((x) => x.key === body.key && x.slug === body.slug) || articles.find((x) => x.slug === body.slug)
      if (!a) { res.status(404).json({ error: 'הכתבה לא נמצאה' }); return }
      const ranked = rank(a, pool, used)
      const top = await claudePick(a, ranked, 8)
      res.status(200).json({ ok: true, suggestions: top.map((p) => ({ url: p.url, alt: p.name.replace(/\s*\([^)]*\)\s*$/, ''), kind: p.kind, used: used.has(p.url) })) })
      return
    }

    if (action === 'undo') {
      const log = parse(await getSetting(LOG_KEY, token).catch(() => null), []) || []
      const e = log.find((x) => x.id === body.id)
      if (!e) { res.status(404).json({ error: 'לא נמצא ביומן' }); return }
      const a = { key: e.key, slug: e.slug }
      await writeArticle(a, { cover: e.prev.cover || '', coverAlt: e.prev.coverAlt || '', images: e.prev.images || [] }, overrides, token)
      e.undone = true
      await setSetting(LOG_KEY, JSON.stringify(log), token)
      res.status(200).json({ ok: true })
      return
    }

    if (cfg.mode === 'off' && cron) { res.status(200).json({ ok: true, skipped: 'הסוכן כבוי' }); return }
    const mode = cfg.mode === 'off' ? 'library' : cfg.mode
    const since = cfg.scope === 'new' ? (cfg.since || today) : ''
    let targets = articles.filter((a) => !a.cover && a.date <= today && (!since || a.date >= since))
    if (Array.isArray(body.only) && body.only.length) targets = articles.filter((a) => body.only.some((o) => o.key === a.key && o.slug === a.slug))
    targets.sort((x, y) => y.date.localeCompare(x.date))
    const aiLeft = { n: mode === 'library' ? 0 : 2 }   // תמונות AI איטיות: עד 2 בכל ריצה, השאר בריצה הבאה
    const limit = mode === 'library' ? 25 : 2
    const done = []
    const started = Date.now()
    for (const a of targets.slice(0, limit)) {
      if (Date.now() - started > 45000) break
      const plan = await planFor(a, pool, used, { ...cfg, mode }, token, aiLeft.n-- > 0).catch((e) => ({ error: String(e.message || e) }))
      if (!plan) continue
      if (plan.error) { done.push({ slug: a.slug, title: a.title, error: plan.error }); continue }
      if (action === 'preview') { done.push({ key: a.key, slug: a.slug, title: a.title, route: a.route, ...plan }); plan.cover && used.add(plan.cover.url); plan.images.forEach((x) => used.add(x.url)); continue }
      const prev = await writeArticle(a, { cover: plan.cover.url, coverAlt: plan.cover.alt, images: [...(a.images || []), ...plan.images.map(({ url, alt }) => ({ url, alt }))] }, overrides, token)
      used.add(plan.cover.url); plan.images.forEach((x) => used.add(x.url))
      done.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), key: a.key, slug: a.slug, title: a.title, route: a.route, cover: plan.cover, images: plan.images, prev, by: cron ? 'cron' : 'admin' })
    }
    if (action === 'run' && done.length) {
      const log = parse(await getSetting(LOG_KEY, token).catch(() => null), []) || []
      await setSetting(LOG_KEY, JSON.stringify([...done.filter((d) => d.id), ...log].slice(0, 150)), token)
    }
    res.status(200).json({ ok: true, mode, done, remaining: Math.max(0, targets.length - done.length), pool: pool.length })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
