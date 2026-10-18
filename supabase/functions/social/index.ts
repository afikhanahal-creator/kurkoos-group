// ============================================================
// social: direct publishing from the content engine to Kurkoos' own pages.
// No outside scheduler: the engine queues a post, this function publishes it
// on time (called every 5 minutes by pg_cron).
//
// Routes (verify_jwt off; every route checks its own auth):
//   GET  /social/callback      Facebook OAuth redirect (signed state)
//   POST /social {a:'status'}  admin: is the Meta app set, connected pages (with their brand), queue
//   POST /social {a:'assign',id,brand} admin: which brand a page publishes for (kurkoos, afik, or none)
//   POST /social {a:'config'}  admin: save the Meta App ID / App Secret
//   POST /social {a:'start'}   admin: the Facebook login URL
//   POST /social {a:'disconnect'}
//   POST /social {a:'enqueue', items:[...]}   admin: queue or update posts
//   POST /social {a:'cancel', item_ids:[...]}
//   POST /social {a:'list'}    admin: queue rows for the engine to show
//   POST /social {a:'run'}     cron (x-cron-secret) or admin {only:item_id}
//
// Only posts the person queued from the engine are ever published.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
const GRAPH = 'https://graph.facebook.com/' + (Deno.env.get('META_GRAPH_VERSION') || 'v23.0')
const FN_URL = SB_URL.replace(/\/$/, '') + '/functions/v1/social'
const REDIRECT = FN_URL + '/callback'
const HOME = 'https://www.kurkoos-group.co.il/engine/'
const ORIGINS = [/^https:\/\/(www\.)?kurkoos-group\.co\.il$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/localhost(:\d+)?$/]
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish']

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.some((r) => r.test(origin)) ? origin : HOME.replace(/\/engine\/$/, ''),
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  Vary: 'Origin',
})
const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } })

async function cfg(key: string): Promise<string> {
  const { data } = await db.from('social_config').select('value').eq('key', key).maybeSingle()
  return (data && data.value) || ''
}
async function setCfg(key: string, value: string) {
  await db.from('social_config').upsert({ key, value, updated_at: new Date().toISOString() })
}
async function app() {
  return { id: Deno.env.get('META_APP_ID') || (await cfg('meta_app_id')), secret: Deno.env.get('META_APP_SECRET') || (await cfg('meta_app_secret')), configId: await cfg('meta_config_id') }
}

async function admin(req: Request) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!t || t === SB_SERVICE) return null
  const { data } = await db.auth.getUser(t)
  return data && data.user ? data.user : null
}

// ---------- signed OAuth state
const enc = new TextEncoder()
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
async function stateFor(uid: string, back: string) {
  const s = await cfg('cron_secret')
  const p = b64u(enc.encode(JSON.stringify({ u: uid, b: back, e: Date.now() + 15 * 60 * 1000 })))
  return p + '.' + (await hmac(s, p))
}
async function readState(st: string) {
  const [p, sig] = String(st || '').split('.')
  if (!p || !sig) return null
  if ((await hmac(await cfg('cron_secret'), p)) !== sig) return null
  try {
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
    return o.e > Date.now() ? o : null
  } catch { return null }
}

async function graph(path: string, params: Record<string, string>, method = 'GET') {
  const q = new URLSearchParams(params)
  const r = method === 'GET'
    ? await fetch(`${GRAPH}${path}?${q}`)
    : await fetch(`${GRAPH}${path}`, { method, body: q })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || d.error) {
    const e = d.error || {}
    throw new Error(String(e.error_user_msg || e.message || `Graph HTTP ${r.status}`).slice(0, 300))
  }
  return d
}

// ---------- OAuth callback: store each page and its Instagram account
// a page belongs to one brand, or to none (never published to). Guessed from the name at connect time, changeable in settings.
const brandOf = (name: string) => /kurkoos|קורקוס/i.test(name) ? 'kurkoos' : /afik|אפיק/i.test(name) ? 'afik' : null

async function callback(url: URL) {
  const st = await readState(url.searchParams.get('state') || '')
  const back = (st && st.b) || HOME
  const go = (q: string) => Response.redirect(back + (back.includes('?') ? '&' : '?') + q, 302)
  if (!st) return go('social=error&m=' + encodeURIComponent('פג תוקף ההתחברות. נסו שוב'))
  if (url.searchParams.get('error')) return go('social=error&m=' + encodeURIComponent('ההתחברות בוטלה בפייסבוק'))
  const code = url.searchParams.get('code') || ''
  try {
    const A = await app()
    const short = await graph('/oauth/access_token', { client_id: A.id, client_secret: A.secret, redirect_uri: REDIRECT, code })
    const long = await graph('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: A.id, client_secret: A.secret, fb_exchange_token: short.access_token })
    const pages = await graph('/me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}', limit: '50' })
    const rows: Record<string, unknown>[] = []
    for (const p of pages.data || []) {
      rows.push({ id: 'fb:' + p.id, network: 'facebook', brand: brandOf(p.name || ''), name: p.name, page_id: p.id, account_id: p.id, token: p.access_token, picture: p.picture?.data?.url || null, connected_by: st.u, connected_at: new Date().toISOString() })
      const ig = p.instagram_business_account
      if (ig && ig.id) rows.push({ id: 'ig:' + ig.id, network: 'instagram', brand: brandOf(p.name || ''), name: ig.name || p.name, username: ig.username || null, page_id: p.id, account_id: ig.id, token: p.access_token, picture: ig.profile_picture_url || null, connected_by: st.u, connected_at: new Date().toISOString() })
    }
    if (!rows.length) return go('social=error&m=' + encodeURIComponent('לא נמצא עמוד פייסבוק. ודאו שבחרתם את עמוד קבוצת קורקוס בחלון ההרשאות'))
    const { data: old } = await db.from('social_accounts').select('id,brand')
    const kept = new Map((old || []).map((r) => [r.id, r.brand]))
    rows.forEach((r) => { if (kept.has(r.id as string)) r.brand = kept.get(r.id as string) ?? null })
    await db.from('social_accounts').delete().in('network', ['facebook', 'instagram'])
    const { error } = await db.from('social_accounts').insert(rows)
    if (error) throw new Error(error.message)
    return go('social=ok&n=' + rows.length)
  } catch (e) {
    return go('social=error&m=' + encodeURIComponent(String((e as Error).message || e).slice(0, 200)))
  }
}

// ---------- publishing
async function pubFacebook(acc: Record<string, string>, q: Record<string, unknown>) {
  const d = await graph(`/${acc.account_id}/photos`, { url: String(q.media_url), caption: String(q.text_fb || ''), published: 'true', access_token: acc.token }, 'POST')
  return { id: d.post_id || d.id }
}
async function pubInstagram(acc: Record<string, string>, q: Record<string, unknown>) {
  const c = await graph(`/${acc.account_id}/media`, { image_url: String(q.media_url), caption: String(q.text_ig || q.text_fb || ''), access_token: acc.token }, 'POST')
  for (let i = 0; i < 6; i++) {
    const s = await graph(`/${c.id}`, { fields: 'status_code', access_token: acc.token })
    if (s.status_code === 'FINISHED') break
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('אינסטגרם לא הצליח לעבד את התמונה')
    await new Promise((r) => setTimeout(r, 2500))
  }
  const d = await graph(`/${acc.account_id}/media_publish`, { creation_id: c.id, access_token: acc.token }, 'POST')
  return { id: d.id }
}

async function run(only?: string) {
  const now = new Date().toISOString()
  // a run that died midway leaves rows in 'publishing': after 10 minutes they become retryable
  await db.from('social_queue').update({ status: 'error', last_error: 'הפרסום נקטע, ינסה שוב' }).eq('status', 'publishing').lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
  let sel = db.from('social_queue').select('*').in('status', ['queued', 'partial', 'error']).lt('attempts', 3).order('at').limit(5)
  sel = only ? sel.eq('item_id', only) : sel.lte('at', now)
  const { data: due, error } = await sel
  if (error) throw new Error(error.message)
  const { data: accs } = await db.from('social_accounts').select('*')
  const by = (n: string, brand: string) => (accs || []).find((a) => a.network === n && a.brand === brand)
  const out = []
  for (const q of due || []) {
    // claim the row so two runs never publish twice
    const { data: claimed } = await db.from('social_queue').update({ status: 'publishing', updated_at: new Date().toISOString() }).eq('item_id', q.item_id).eq('status', q.status).select('item_id')
    if (!claimed || !claimed.length) continue
    const results = { ...(q.results || {}) } as Record<string, Record<string, unknown>>
    const errs: string[] = []
    for (const n of q.nets as string[]) {
      if (results[n] && results[n].id) continue
      const net = n === 'fb' ? 'facebook' : n === 'ig' ? 'instagram' : n
      const brand = String(q.brand || 'kurkoos')
      const acc = by(net, brand)
      if (!acc) { const m = `אין עמוד ${net === 'facebook' ? 'פייסבוק' : 'אינסטגרם'} של ${brand === 'afik' ? 'אפיק הנחל' : 'קבוצת קורקוס'}`; errs.push(m); results[n] = { error: m }; continue }
      if (!q.media_url) { errs.push(`${net}: חסרה תמונה`); results[n] = { error: 'חסרה תמונה' }; continue }
      try {
        const r = net === 'facebook' ? await pubFacebook(acc, q) : net === 'instagram' ? await pubInstagram(acc, q) : (() => { throw new Error('ערוץ לא נתמך עדיין') })()
        results[n] = { id: r.id, at: new Date().toISOString() }
      } catch (e) {
        const m = String((e as Error).message || e).slice(0, 240)
        errs.push(`${net}: ${m}`); results[n] = { error: m }
      }
    }
    const okN = (q.nets as string[]).filter((n) => results[n] && results[n].id).length
    const status = okN === q.nets.length ? 'done' : okN ? 'partial' : 'error'
    await db.from('social_queue').update({ status, results, attempts: (q.attempts || 0) + 1, last_error: errs.join(' · ') || null, updated_at: new Date().toISOString() }).eq('item_id', q.item_id)
    out.push({ item_id: q.item_id, status, errors: errs })
  }
  return out
}

function clean(items: unknown[], uid: string) {
  const ok: Record<string, unknown>[] = []
  for (const x of (Array.isArray(items) ? items : []).slice(0, 50) as Record<string, unknown>[]) {
    const at = new Date(String(x.at || ''))
    const nets = (Array.isArray(x.nets) ? x.nets : []).filter((n: unknown) => n === 'fb' || n === 'ig') as string[]
    const media = String(x.media_url || '')
    if (!x.item_id || isNaN(at.getTime()) || !nets.length) continue
    if (media && !/^https:\/\/filnzlnvujnlazwcxbuq\.supabase\.co\/storage\/v1\/object\/public\//.test(media)) continue
    ok.push({ item_id: String(x.item_id).slice(0, 80), post_id: x.post_id ? String(x.post_id).slice(0, 80) : null, label: String(x.label || '').slice(0, 140), at: at.toISOString(), nets, text_fb: String(x.text_fb || '').slice(0, 63000), text_ig: String(x.text_ig || '').slice(0, 2200), media_url: media || null, brand: x.brand === 'afik' ? 'afik' : 'kurkoos', status: 'queued', attempts: 0, last_error: null, results: {}, created_by: uid, updated_at: new Date().toISOString() })
  }
  return ok
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  const url = new URL(req.url)
  if (req.method === 'GET' && url.pathname.endsWith('/callback')) return callback(url)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { body = {} }
  const a = String(body.a || '')

  if (a === 'run') {
    const secret = req.headers.get('x-cron-secret') || ''
    const isCron = secret && secret === (await cfg('cron_secret'))
    const user = isCron ? null : await admin(req)
    if (!isCron && !user) return json({ error: 'unauthorized' }, 401, origin)
    try { return json({ ran: await run(user ? String(body.only || '') || undefined : undefined) }, 200, origin) }
    catch (e) { return json({ error: String((e as Error).message) }, 500, origin) }
  }

  const user = await admin(req)
  if (!user) return json({ error: 'צריך להתחבר לאדמין', code: 'not_signed_in' }, 401, origin)

  try {
    if (a === 'status') {
      const A = await app()
      const { data: accs } = await db.from('social_accounts').select('id,network,name,username,picture,connected_at,brand')
      const { data: q } = await db.from('social_queue').select('status')
      const counts: Record<string, number> = {}
      ;(q || []).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
      return json({ app: !!(A.id && A.secret), appId: A.id ? A.id.slice(0, 4) + '…' : '', redirect: REDIRECT, accounts: accs || [], queue: counts }, 200, origin)
    }
    if (a === 'config') {
      const id = String(body.app_id || '').trim(), sec = String(body.app_secret || '').trim(), conf = String(body.config_id || '').trim()
      if (!/^\d{6,20}$/.test(id)) return json({ error: 'מזהה האפליקציה (App ID) הוא מספר בלבד' }, 400, origin)
      if (!/^[a-f0-9]{32}$/i.test(sec)) return json({ error: 'הסוד של האפליקציה (App Secret) לא נראה תקין: 32 תווים' }, 400, origin)
      await setCfg('meta_app_id', id); await setCfg('meta_app_secret', sec)
      if (conf) await setCfg('meta_config_id', conf)
      return json({ ok: true }, 200, origin)
    }
    if (a === 'start') {
      const A = await app()
      if (!A.id || !A.secret) return json({ error: 'קודם שומרים את פרטי האפליקציה של פייסבוק', code: 'no_app' }, 400, origin)
      const back = String(body.back || HOME)
      const safeBack = ORIGINS.some((r) => { try { return r.test(new URL(back).origin) } catch { return false } }) ? back : HOME
      const p = new URLSearchParams({ client_id: A.id, redirect_uri: REDIRECT, state: await stateFor(user.id, safeBack), response_type: 'code' })
      if (A.configId) p.set('config_id', A.configId); else p.set('scope', SCOPES.join(','))
      return json({ url: 'https://www.facebook.com/' + (Deno.env.get('META_GRAPH_VERSION') || 'v23.0') + '/dialog/oauth?' + p }, 200, origin)
    }
    if (a === 'assign') {
      const id = String(body.id || ''), brand = body.brand === 'kurkoos' || body.brand === 'afik' ? body.brand : null
      if (!id) return json({ error: 'חסר עמוד' }, 400, origin)
      // one page per brand and network: giving a page a brand takes it from any other page of the same network
      const { data: acc } = await db.from('social_accounts').select('network').eq('id', id).maybeSingle()
      if (!acc) return json({ error: 'העמוד לא נמצא' }, 404, origin)
      if (brand) await db.from('social_accounts').update({ brand: null }).eq('network', acc.network).eq('brand', brand)
      await db.from('social_accounts').update({ brand }).eq('id', id)
      return json({ ok: true }, 200, origin)
    }
    if (a === 'disconnect') {
      await db.from('social_accounts').delete().in('network', ['facebook', 'instagram'])
      return json({ ok: true }, 200, origin)
    }
    if (a === 'enqueue') {
      const rows = clean(body.items as unknown[], user.id)
      if (!rows.length) return json({ error: 'אין פוסטים תקינים לתור', code: 'empty' }, 400, origin)
      // a post that already went out is never queued again
      const { data: done } = await db.from('social_queue').select('item_id').in('item_id', rows.map((r) => r.item_id as string)).in('status', ['done', 'publishing'])
      const skip = new Set((done || []).map((r) => r.item_id))
      const fresh = rows.filter((r) => !skip.has(r.item_id as string))
      if (fresh.length) { const { error } = await db.from('social_queue').upsert(fresh); if (error) throw new Error(error.message) }
      return json({ queued: fresh.map((r) => r.item_id), skipped: [...skip] }, 200, origin)
    }
    if (a === 'cancel') {
      const ids = (Array.isArray(body.item_ids) ? body.item_ids : []).map(String).slice(0, 100)
      if (ids.length) await db.from('social_queue').update({ status: 'cancelled', updated_at: new Date().toISOString() }).in('item_id', ids).in('status', ['queued', 'error', 'partial'])
      return json({ ok: true }, 200, origin)
    }
    if (a === 'list') {
      const { data } = await db.from('social_queue').select('item_id,post_id,label,at,nets,status,results,attempts,last_error,updated_at,brand').order('at', { ascending: false }).limit(300)
      return json({ items: data || [] }, 200, origin)
    }
    return json({ error: 'פעולה לא מוכרת' }, 400, origin)
  } catch (e) {
    return json({ error: String((e as Error).message || e).slice(0, 300) }, 500, origin)
  }
})
