// ============================================================
// dm: Kurkoos DM. Instagram and Facebook messages with keyword automations (a ManyChat-style inbox) for every
// account we manage. The Instagram flow follows the instagram-dm template (comment → private message, story reply,
// message keyword, button, public reply variants, 150 an hour with a queue), moved here so there is one system,
// one database and one screen (admin tab "הודעות ואוטומציות", also inside the content engine).
//
// Two ways to connect an account:
//   Instagram Login  (graph.instagram.com): an Instagram professional account on its own, no Facebook page needed
//   Facebook Login   (graph.facebook.com):  Facebook pages, and the Instagram accounts linked to them
//
// Routes (verify_jwt off; every route checks its own auth):
//   GET  /dm/callback      Facebook login redirect (signed state)
//   GET  /dm/ig-callback   Instagram login redirect (signed state)
//   GET  /dm/webhook       Meta's webhook check (hub.verify_token)
//   POST /dm/webhook       Meta's events, signed with the App Secret of either app
//   POST /dm {a:'cron'}    pg_cron every 5 minutes (x-cron-secret): send the queue, refresh Instagram tokens
//   POST /dm {a:...}       admin actions (Supabase session):
//     status | config | ig_config | start | ig_start | logout | account | resubscribe | media | activity
//     threads | thread | send | pause | rules | rule_save | rule_delete | snippets | snippet_save | snippet_delete
//
// Rules never message anyone first: they answer a comment, a story reply or a message the person sent. Each rule
// answers a person once (per post, for comment rules), and never while the office has paused the bot in that chat.
// Replies by hand go out only inside Meta's 24 hour window after the person's last message.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
const GV = Deno.env.get('META_GRAPH_VERSION') || 'v23.0'
const IGV = Deno.env.get('IG_GRAPH_VERSION') || 'v23.0'
const GRAPH = 'https://graph.facebook.com/' + GV
const IGRAPH = 'https://graph.instagram.com/' + IGV
const FN_URL = SB_URL.replace(/\/$/, '') + '/functions/v1/dm'
const REDIRECT = FN_URL + '/callback'
const IG_REDIRECT = FN_URL + '/ig-callback'
const HOOK = FN_URL + '/webhook'
const SITE = 'https://www.kurkoos-group.co.il'
const HOME = SITE + '/admin?tab=dm'
const ORIGINS = [/^https:\/\/(www\.)?kurkoos-group\.co\.il$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/localhost(:\d+)?$/]
const SCOPES = ['pages_show_list', 'pages_manage_metadata', 'pages_messaging', 'pages_read_engagement', 'pages_manage_engagement', 'business_management', 'instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments']
const IG_SCOPES = ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages']
const PAGE_FIELDS = 'messages,messaging_postbacks,feed'
const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const MAX_ATTEMPTS = 3

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.some((r) => r.test(origin)) ? origin : SITE,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  Vary: 'Origin',
})
const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } })
const now = () => new Date().toISOString()
const errMsg = (e: unknown) => String((e as Error)?.message || e).slice(0, 300)

async function cfg(key: string): Promise<string> {
  const { data } = await db.from('social_config').select('value').eq('key', key).maybeSingle()
  return (data && data.value) || ''
}
async function setCfg(key: string, value: string) {
  await db.from('social_config').upsert({ key, value, updated_at: now() })
}
// Facebook Login: the inbox can use its own Meta app; without one it uses the publishing app
async function app() {
  const id = (await cfg('dm_app_id')) || Deno.env.get('META_APP_ID') || (await cfg('meta_app_id'))
  const secret = (await cfg('dm_app_secret')) || Deno.env.get('META_APP_SECRET') || (await cfg('meta_app_secret'))
  return { id, secret, own: !!(await cfg('dm_app_id')) }
}
// Instagram Login has its own "Instagram app ID" and "Instagram app secret" (not the Meta App ID)
async function igApp() {
  return { id: await cfg('ig_app_id'), secret: await cfg('ig_app_secret') }
}
async function verifyToken() {
  let t = await cfg('dm_verify_token')
  if (!t) { t = 'kurkoos-' + crypto.randomUUID().replace(/-/g, '').slice(0, 20); await setCfg('dm_verify_token', t) }
  return t
}
async function maxPerHour() { return Number(await cfg('dm_max_per_hour')) || 150 }

async function admin(req: Request) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!t || t === SB_SERVICE) return null
  const { data } = await db.auth.getUser(t)
  return data && data.user ? data.user : null
}

// ---------- signing (OAuth state, webhook signature)
const enc = new TextEncoder()
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
async function hmacRaw(secret: string, msg: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, msg))
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
async function stateFor(uid: string, back: string) {
  const p = b64u(enc.encode(JSON.stringify({ u: uid, b: back, e: Date.now() + 15 * 60 * 1000 })))
  return p + '.' + b64u(await hmacRaw(await cfg('cron_secret'), enc.encode(p)))
}
async function readState(st: string) {
  const [p, sig] = String(st || '').split('.')
  if (!p || !sig) return null
  if (!safeEq(b64u(await hmacRaw(await cfg('cron_secret'), enc.encode(p))), sig)) return null
  try {
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
    return o.e > Date.now() ? o : null
  } catch { return null }
}

async function call(url: string, init?: RequestInit) {
  const r = await fetch(url, init)
  const d = await r.json().catch(() => ({}))
  if (!r.ok || d.error) {
    const e = d.error || {}
    throw Object.assign(new Error(String(e.error_user_msg || e.message || d.error_message || `HTTP ${r.status}`).slice(0, 300)), { code: e.code, sub: e.error_subcode })
  }
  return d
}
async function graph(path: string, params: Record<string, string>, method = 'GET', body?: unknown) {
  const q = new URLSearchParams(params)
  if (method === 'GET') return call(`${GRAPH}${path}?${q}`)
  if (body !== undefined) return call(`${GRAPH}${path}?${q}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return call(`${GRAPH}${path}`, { method, body: q })
}
// graph.instagram.com, with the account's Instagram Login token
async function igraph(path: string, token: string, method = 'GET', body?: unknown, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params)
  return call(`${IGRAPH}${path}${q.toString() ? '?' + q : ''}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined })
}
// Meta's errors in plain Hebrew where we know them
function heMeta(e: unknown) {
  const x = e as { code?: number; sub?: number; message?: string }
  if (x.sub === 2018278 || /outside of allowed window/i.test(x.message || '')) return 'עברו יותר מ-24 שעות מההודעה האחרונה של הפונה, ולכן מטא לא מאפשרת לשלוח לו הודעה עכשיו'
  if (x.code === 190) return 'החיבור פג. צריך להתחבר מחדש בלשונית "חשבונות וחיבור"'
  if (x.code === 200 || x.code === 10 || /permission/i.test(x.message || '')) return 'לחשבון חסרה הרשאה לשליחת הודעות. צריך להתחבר מחדש ולאשר את כל ההרשאות'
  if (x.code === 4 || x.code === 613 || /rate|limit/i.test(x.message || '')) return 'מטא הגבילה זמנית את קצב השליחה. ההודעות שבתור יישלחו בהמשך'
  return errMsg(e)
}

// ---------- Facebook login: one connection per Facebook user, with all the pages it manages
async function subscribePage(acc: { page_id: string; token: string }) {
  await graph(`/${acc.page_id}/subscribed_apps`, { subscribed_fields: PAGE_FIELDS, access_token: acc.token }, 'POST')
}
const backTo = (back: string, q: string) => Response.redirect(back + (back.includes('?') ? '&' : '?') + q, 302)
async function callback(url: URL) {
  const st = await readState(url.searchParams.get('state') || '')
  const back = (st && st.b) || HOME
  if (!st) return backTo(back, 'dm=error&m=' + encodeURIComponent('פג תוקף ההתחברות. נסו שוב'))
  if (url.searchParams.get('error')) return backTo(back, 'dm=error&m=' + encodeURIComponent('ההתחברות בוטלה בפייסבוק'))
  try {
    const A = await app()
    const short = await graph('/oauth/access_token', { client_id: A.id, client_secret: A.secret, redirect_uri: REDIRECT, code: url.searchParams.get('code') || '' })
    const long = await graph('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: A.id, client_secret: A.secret, fb_exchange_token: short.access_token })
    const me = await graph('/me', { access_token: long.access_token, fields: 'id,name,picture{url}' })
    const pages = await graph('/me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}', limit: '100' })
    const rows: Record<string, unknown>[] = []
    for (const p of pages.data || []) {
      rows.push({ id: 'fb:' + p.id, connection_id: me.id, network: 'facebook', api: 'fb', page_id: p.id, account_id: p.id, name: p.name, picture: p.picture?.data?.url || null, token: p.access_token, token_at: now() })
      const ig = p.instagram_business_account
      if (ig && ig.id) rows.push({ id: 'ig:' + ig.id, connection_id: me.id, network: 'instagram', api: 'fb', page_id: p.id, account_id: ig.id, name: ig.name || p.name, username: ig.username || null, picture: ig.profile_picture_url || null, token: p.access_token, token_at: now() })
    }
    if (!rows.length) return backTo(back, 'dm=error&m=' + encodeURIComponent('לא נמצאו עמודים בחשבון הזה. בחלון של פייסבוק צריך לסמן את העמודים ואת חשבונות האינסטגרם'))
    await db.from('dm_connections').upsert({ id: me.id, name: me.name || null, picture: me.picture?.data?.url || null, token: long.access_token, connected_by: st.u, connected_at: now() })
    // a page logged in again keeps its on/off choice
    const { data: old } = await db.from('dm_accounts').select('id,enabled').in('id', rows.map((r) => r.id as string))
    const was = new Map((old || []).map((r) => [r.id, r.enabled]))
    for (const r of rows) {
      if (was.has(r.id as string)) r.enabled = was.get(r.id as string)
      if (r.network === 'facebook') {
        try { await subscribePage(r as { page_id: string; token: string }); r.subscribed = true; r.sub_error = null }
        catch (e) { r.subscribed = false; r.sub_error = heMeta(e) }
      }
    }
    rows.filter((r) => r.network === 'instagram').forEach((r) => { const fb = rows.find((x) => x.network === 'facebook' && x.page_id === r.page_id); r.subscribed = !!(fb && fb.subscribed); r.sub_error = fb ? fb.sub_error : null })
    const { error } = await db.from('dm_accounts').upsert(rows)
    if (error) throw new Error(error.message)
    return backTo(back, 'dm=ok&n=' + rows.length)
  } catch (e) {
    return backTo(back, 'dm=error&m=' + encodeURIComponent(heMeta(e).slice(0, 200)))
  }
}

// ---------- Instagram login: one Instagram professional account per login, no Facebook page needed
async function igCallback(url: URL) {
  const st = await readState(url.searchParams.get('state') || '')
  const back = (st && st.b) || HOME
  if (!st) return backTo(back, 'dm=error&m=' + encodeURIComponent('פג תוקף ההתחברות. נסו שוב'))
  if (url.searchParams.get('error')) return backTo(back, 'dm=error&m=' + encodeURIComponent('ההתחברות בוטלה באינסטגרם'))
  try {
    const A = await igApp()
    const code = (url.searchParams.get('code') || '').replace(/#_$/, '')
    const short = await call('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({ client_id: A.id, client_secret: A.secret, grant_type: 'authorization_code', redirect_uri: IG_REDIRECT, code }) })
    const shortToken = short.access_token || short.data?.[0]?.access_token
    const long = await call(`https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: A.secret, access_token: shortToken })}`)
    const token = long.access_token
    const me = await igraph('/me', token, 'GET', undefined, { fields: 'user_id,username,name,profile_picture_url' })
    const uid = String(me.user_id || me.id)
    let subscribed = true, sub_error: string | null = null
    try { await igraph('/me/subscribed_apps', token, 'POST', undefined, { subscribed_fields: 'comments,messages' }) }
    catch (e) { subscribed = false; sub_error = heMeta(e) }
    const cid = 'ig:' + uid
    await db.from('dm_connections').upsert({ id: cid, name: me.username ? '@' + me.username : me.name || null, picture: me.profile_picture_url || null, token, connected_by: st.u, connected_at: now() })
    const { data: old } = await db.from('dm_accounts').select('enabled').eq('id', cid).maybeSingle()
    const { error } = await db.from('dm_accounts').upsert({ id: cid, connection_id: cid, network: 'instagram', api: 'ig', page_id: uid, account_id: uid, name: me.name || me.username || null, username: me.username || null, picture: me.profile_picture_url || null, token, token_at: now(), token_error: null, enabled: old ? old.enabled : true, subscribed, sub_error })
    if (error) throw new Error(error.message)
    return backTo(back, 'dm=ok&n=1')
  } catch (e) {
    return backTo(back, 'dm=error&m=' + encodeURIComponent(heMeta(e).slice(0, 200)))
  }
}

// ---------- accounts
type Acc = { id: string; network: string; api: string; page_id: string; account_id: string; token: string; enabled: boolean }
const ACC_COLS = 'id,network,api,page_id,account_id,token,enabled'
async function accFor(network: string, accountId: string): Promise<Acc | null> {
  const { data } = await db.from('dm_accounts').select(ACC_COLS).eq('id', (network === 'instagram' ? 'ig:' : 'fb:') + accountId).maybeSingle()
  return data as Acc | null
}
async function profile(acc: Acc, personId: string) {
  try {
    if (acc.api === 'ig') {
      const p = await igraph(`/${personId}`, acc.token, 'GET', undefined, { fields: 'name,username,profile_pic' })
      return { name: p.name || p.username || null, username: p.username || null, picture: p.profile_pic || null }
    }
    if (acc.network === 'instagram') {
      const p = await graph(`/${personId}`, { fields: 'name,username,profile_pic', access_token: acc.token })
      return { name: p.name || p.username || null, username: p.username || null, picture: p.profile_pic || null }
    }
    const p = await graph(`/${personId}`, { fields: 'first_name,last_name,profile_pic', access_token: acc.token })
    return { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null, username: null, picture: p.profile_pic || null }
  } catch { return {} }
}
// the account's posts and reels, for picking one in a comment rule
async function listMedia(acc: Acc) {
  const fields = 'id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp'
  if (acc.api === 'ig') return ((await igraph('/me/media', acc.token, 'GET', undefined, { fields, limit: '30' })).data || [])
  if (acc.network === 'instagram') return ((await graph(`/${acc.account_id}/media`, { fields, limit: '30', access_token: acc.token })).data || [])
  const d = await graph(`/${acc.page_id}/posts`, { fields: 'id,message,full_picture,permalink_url,created_time', limit: '30', access_token: acc.token })
  return (d.data || []).map((p: Record<string, string>) => ({ id: p.id, caption: p.message || '', media_type: 'IMAGE', thumbnail_url: p.full_picture, media_url: p.full_picture, permalink: p.permalink_url, timestamp: p.created_time }))
}

// ---------- threads and messages
async function touchThread(acc: Acc, personId: string, m: { text: string; dir: 'in' | 'out'; at: string; name?: string | null; username?: string | null; comment?: boolean }) {
  const id = acc.id + '|' + personId
  const { data: t } = await db.from('dm_threads').select('*').eq('id', id).maybeSingle()
  const row: Record<string, unknown> = { id, account_id: acc.id, person_id: personId, last_text: m.text.slice(0, 200), last_dir: m.dir, last_at: m.at }
  // a comment doesn't open Meta's 24h window for free messages: only a private reply to it is allowed
  if (m.dir === 'in') { if (!m.comment) row.last_in_at = m.at; row.unread = ((t && t.unread) || 0) + 1 }
  if (!t) {
    const p = await profile(acc, personId)
    row.name = m.name || p.name || null; row.username = m.username || p.username || null; row.picture = p.picture || null
  } else if (!t.name && (m.name || m.username)) { row.name = m.name || m.username; row.username = m.username || t.username }
  await db.from('dm_threads').upsert(row)
  return { id, isNew: !t || !t.last_in_at, paused: !!(t && t.bot_paused), name: (row.name as string) || (t && t.name) || null, username: (row.username as string) || (t && t.username) || null }
}
async function saveMsg(m: Record<string, unknown>) {
  await db.from('dm_messages').upsert(m, { onConflict: 'id', ignoreDuplicates: true })
}

// ---------- sending
type Btn = { url: string; title?: string | null } | null
function buildMessage(text: string, button: Btn) {
  if (!button || !button.url) return { text: text.slice(0, 1000) }
  return { attachment: { type: 'template', payload: { template_type: 'button', text: text.slice(0, 640), buttons: [{ type: 'web_url', url: button.url, title: (button.title || 'לפתיחה').slice(0, 20) }] } } }
}
async function sendRaw(acc: Acc, recipient: Record<string, string>, message: unknown) {
  const d = acc.api === 'ig'
    ? await igraph(`/${acc.account_id}/messages`, acc.token, 'POST', { recipient, message })
    : await graph(`/${acc.page_id}/messages`, { access_token: acc.token }, 'POST', { recipient, messaging_type: 'RESPONSE', message })
  return String(d.message_id || 'out_' + crypto.randomUUID())
}
// a button Meta refuses falls back to plain text with the link at the end, so the person still gets what they asked for
async function sendDm(acc: Acc, recipient: Record<string, string>, text: string, button: Btn = null) {
  try { return await sendRaw(acc, recipient, buildMessage(text, button)) }
  catch (e) {
    if (!button || !button.url) throw e
    return await sendRaw(acc, recipient, { text: `${text}\n${button.url}`.slice(0, 1000) })
  }
}
async function replyPublic(acc: Acc, commentId: string, text: string) {
  const d = acc.api === 'ig' ? await igraph(`/${commentId}/replies`, acc.token, 'POST', { message: text.slice(0, 2000) })
    : await graph(acc.network === 'instagram' ? `/${commentId}/replies` : `/${commentId}/comments`, { message: text.slice(0, 2000), access_token: acc.token }, 'POST')
  return String(d.id || '')
}

// ---------- automations
// keyword matching from the template: no niqqud, punctuation or emoji, no case; a whole word ("פרומפט!" yes,
// "פרומפטים" no), with one Hebrew prefix letter allowed (ו/ה/ל/ב/ש: "והפרומפט", "לפרומפט"); several keywords by comma
const normalize = (s: string) => String(s || '').normalize('NFKC').replace(/[֑-ׇ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
function matchesWord(text: string, keyword: string) {
  const kw = normalize(keyword)
  if (!kw) return false
  const words = normalize(text).split(' '), kws = kw.split(' ')
  for (let i = 0; i + kws.length <= words.length; i++) {
    let ok = true
    for (let j = 0; j < kws.length; j++) {
      const w = words[i + j], k = kws[j]
      if (w === k) continue
      if (j === 0 && w.length === k.length + 1 && 'והלבש'.includes(w[0]) && w.slice(1) === k) continue
      ok = false; break
    }
    if (ok) return true
  }
  return false
}
const matches = (rule: { keywords: string[] }, text: string) => {
  const k = (rule.keywords || []).filter((x) => normalize(x))
  return !k.length || k.some((w) => matchesWord(text, w))
}
// {שם} / {name} = first name, {username} = Instagram username
function fill(tpl: string, name?: string | null, username?: string | null) {
  return tpl.replace(/\{name\}|\{שם\}/g, String(name || '').split(' ')[0] || '')
    .replace(/@?\{username\}/g, username ? '@' + username : '')
    .replace(/[ \t]+([,.!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}
const pickVariant = (text?: string | null) => { const l = String(text || '').split('\n').map((s) => s.trim()).filter(Boolean); return l.length ? l[Math.floor(Math.random() * l.length)] : null }
async function rulesFor(acc: Acc, triggers: string[]) {
  const { data } = await db.from('dm_rules').select('*').eq('enabled', true).in('trigger', triggers).order('created_at')
  return (data || []).filter((r) => !r.account_id || r.account_id === acc.id)
}
async function claim(ruleId: string, key: string) {
  const { error } = await db.from('dm_rule_hits').insert({ rule_id: ruleId, person_key: key })
  return !error
}
async function enqueue(row: Record<string, unknown>) {
  const { error } = await db.from('dm_queue').insert(row)
  return !error   // a duplicate event_id (Meta sent the event twice) is ignored
}

async function onMessage(acc: Acc, ev: Record<string, any>) {
  const msg = ev.message || {}
  if (msg.is_deleted) return
  const mine = ev.sender?.id === acc.account_id || ev.sender?.id === acc.page_id || msg.is_echo
  const person = mine ? ev.recipient?.id : ev.sender?.id
  if (!person || !msg.mid) return
  const story = !!(msg.reply_to && msg.reply_to.story)
  const text = String(msg.text || (msg.attachments && msg.attachments.length ? '[קובץ מצורף]' : '') || (ev.postback && ev.postback.title) || '')
  const media = msg.attachments && msg.attachments[0] && msg.attachments[0].payload && msg.attachments[0].payload.url
  const at = new Date(Number(ev.timestamp) || Date.now()).toISOString()
  const { data: dup } = await db.from('dm_messages').select('id').eq('id', msg.mid).maybeSingle()
  if (dup) return
  const th = await touchThread(acc, person, { text: (story ? 'תגובה לסטורי: ' : '') + text, dir: mine ? 'out' : 'in', at })
  await saveMsg({ id: msg.mid, thread_id: th.id, account_id: acc.id, dir: mine ? 'out' : 'in', kind: 'dm', text: (story ? 'תגובה לסטורי: ' : '') + text, media_url: media || null, via: mine ? 'meta' : null, at })
  if (mine || th.paused || !acc.enabled || !msg.text) return
  const triggers = story ? ['story'] : th.isNew ? ['first_dm', 'dm'] : ['dm']
  const rules = await rulesFor(acc, triggers)
  rules.sort((a, b) => (a.trigger === 'first_dm' ? -1 : 0) - (b.trigger === 'first_dm' ? -1 : 0))
  for (const r of rules) {
    if (r.trigger !== 'first_dm' && !matches(r, msg.text)) continue
    if (!(await claim(r.id, `${th.id}|-`))) continue
    await enqueue({ event_id: msg.mid, account_id: acc.id, rule_id: r.id, kind: 'dm', target: person, thread_id: th.id, person_name: th.name || th.username, incoming: String(msg.text).slice(0, 500) })
    break   // one answer per message
  }
}

async function onComment(acc: Acc, c: { id: string; text: string; from: string; name?: string; username?: string; post: string }) {
  if (!c.id || !c.from || c.from === acc.account_id || c.from === acc.page_id) return
  const { data: dup } = await db.from('dm_messages').select('id').eq('id', c.id).maybeSingle()
  if (dup) return
  const th = await touchThread(acc, c.from, { text: 'תגובה: ' + c.text, dir: 'in', at: now(), name: c.name || null, username: c.username || null, comment: true })
  await saveMsg({ id: c.id, thread_id: th.id, account_id: acc.id, dir: 'in', kind: 'comment', text: c.text, post_id: c.post || null, at: now() })
  if (th.paused || !acc.enabled) return
  // a rule for this post comes before a rule for every post
  const all = await rulesFor(acc, ['comment'])
  const onPost = (r: Record<string, any>) => r.post_id && (r.post_id === c.post || String(c.post).endsWith('_' + r.post_id))
  const rules = [...all.filter(onPost), ...all.filter((r) => !r.post_id)]
  for (const r of rules) {
    if (!matches(r, c.text)) continue
    if (!(await claim(r.id, `${th.id}|${c.post || '-'}`))) continue
    await enqueue({ event_id: c.id, account_id: acc.id, rule_id: r.id, kind: 'comment', target: c.id, thread_id: th.id, person_name: c.name || c.username || th.name || null, incoming: c.text.slice(0, 500) })
    break
  }
}

// ---------- the queue: at most MAX_PER_HOUR automated messages an hour per account, the rest wait for the next run
async function drain(only?: string) {
  await db.from('dm_queue').update({ status: 'failed', error: 'נקטע באמצע שליחה' }).eq('status', 'sending').lt('sent_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
  let q = db.from('dm_queue').select('*').eq('status', 'pending').order('created_at').limit(40)
  if (only) q = q.eq('account_id', only)
  const { data: rows } = await q
  if (!rows || !rows.length) return { sent: 0, failed: 0, waiting: 0 }
  const max = await maxPerHour()
  const room: Record<string, number> = {}
  const accs: Record<string, Acc | null> = {}
  let sent = 0, failed = 0, waiting = 0
  for (const row of rows) {
    if (!(row.account_id in accs)) {
      const { data } = await db.from('dm_accounts').select(ACC_COLS).eq('id', row.account_id).maybeSingle()
      accs[row.account_id] = data as Acc | null
      const { count } = await db.from('dm_queue').select('id', { count: 'exact', head: true }).eq('account_id', row.account_id).gt('sent_at', new Date(Date.now() - HOUR).toISOString()).eq('status', 'sent')
      room[row.account_id] = max - (count || 0)
    }
    const acc = accs[row.account_id]
    if (!acc) { await db.from('dm_queue').update({ status: 'failed', error: 'החשבון כבר לא מחובר' }).eq('id', row.id); failed++; continue }
    if (room[row.account_id] <= 0) { waiting++; continue }
    const { data: rule } = row.rule_id ? await db.from('dm_rules').select('*').eq('id', row.rule_id).maybeSingle() : { data: null }
    if (!rule) { await db.from('dm_queue').update({ status: 'failed', error: 'האוטומציה נמחקה' }).eq('id', row.id); failed++; continue }
    // claim the row first, so two runs at once never send the same message twice
    const { data: got } = await db.from('dm_queue').update({ status: 'sending', sent_at: now() }).eq('id', row.id).eq('status', 'pending').select('id')
    if (!got || !got.length) continue
    room[row.account_id]--
    try {
      const { data: t } = await db.from('dm_threads').select('name,username').eq('id', row.thread_id).maybeSingle()
      const text = fill(rule.reply_text, row.person_name || (t && t.name), t && t.username)
      const button = rule.button_url ? { url: rule.button_url, title: rule.button_text } : null
      const mid = await sendDm(acc, row.kind === 'comment' ? { comment_id: row.target } : { id: row.target }, text, button)
      await saveMsg({ id: mid, thread_id: row.thread_id, account_id: acc.id, dir: 'out', kind: 'dm', text: button ? `${text}\n[${button.title || 'לפתיחה'}] ${button.url}` : text, via: 'rule:' + rule.id, at: now() })
      if (row.kind === 'comment') {
        const pub = pickVariant(rule.public_reply)
        if (pub) {
          const ptext = fill(pub, row.person_name, t && t.username)
          // the private message already went out: a failed public reply doesn't fail the send
          const rid = await replyPublic(acc, row.target, ptext).catch(() => '')
          if (rid) await saveMsg({ id: rid, thread_id: row.thread_id, account_id: acc.id, dir: 'out', kind: 'reply', text: ptext, via: 'rule:' + rule.id, at: now() })
        }
      }
      const personId = row.thread_id.split('|')[1]
      await touchThread(acc, personId, { text, dir: 'out', at: now() })
      await db.from('dm_queue').update({ status: 'sent', sent_at: now(), error: null }).eq('id', row.id)
      await db.from('dm_rules').update({ hits: (rule.hits || 0) + 1 }).eq('id', rule.id)
      sent++
    } catch (e) {
      const attempts = (row.attempts || 0) + 1
      const final = attempts >= MAX_ATTEMPTS
      await db.from('dm_queue').update({ status: final ? 'failed' : 'pending', attempts, error: heMeta(e), sent_at: null }).eq('id', row.id)
      if (final) { failed++; await setCfg('dm_last_error', heMeta(e)) }
    }
  }
  return { sent, failed, waiting }
}

// Instagram Login tokens last 60 days: refresh after 20
async function refreshTokens() {
  const { data } = await db.from('dm_accounts').select('id,connection_id,token,token_at').eq('api', 'ig').lt('token_at', new Date(Date.now() - 20 * DAY).toISOString())
  for (const a of data || []) {
    try {
      const r = await call(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: a.token })}`)
      await db.from('dm_accounts').update({ token: r.access_token, token_at: now(), token_error: null }).eq('id', a.id)
      await db.from('dm_connections').update({ token: r.access_token }).eq('id', a.connection_id)
    } catch (e) { await db.from('dm_accounts').update({ token_error: heMeta(e) }).eq('id', a.id) }
  }
}

async function webhook(req: Request) {
  const raw = new Uint8Array(await req.arrayBuffer())
  const sig = (req.headers.get('x-hub-signature-256') || '').replace(/^sha256=/, '')
  const secrets = [(await app()).secret, (await igApp()).secret].filter(Boolean)
  let ok = false
  for (const s of secrets) if (sig && safeEq(hex(await hmacRaw(s, raw)), sig)) ok = true
  if (!ok) return new Response('bad signature', { status: 401 })
  let body: Record<string, any> = {}
  try { body = JSON.parse(new TextDecoder().decode(raw)) } catch { return new Response('ok') }
  await setCfg('dm_last_hook', now())
  const network = body.object === 'instagram' ? 'instagram' : body.object === 'page' ? 'facebook' : ''
  if (!network) return new Response('ok')
  const touched = new Set<string>()
  for (const entry of body.entry || []) {
    const acc = await accFor(network, String(entry.id))
    if (!acc) continue
    touched.add(acc.id)
    for (const ev of entry.messaging || []) { try { await onMessage(acc, ev) } catch (e) { await setCfg('dm_last_error', errMsg(e)) } }
    for (const ch of entry.changes || []) {
      const v = ch.value || {}
      try {
        if (network === 'facebook' && ch.field === 'feed' && v.item === 'comment' && v.verb === 'add')
          await onComment(acc, { id: v.comment_id, text: String(v.message || ''), from: v.from?.id, name: v.from?.name, post: v.post_id })
        if (network === 'instagram' && ch.field === 'comments')
          await onComment(acc, { id: v.id, text: String(v.text || ''), from: v.from?.id, username: v.from?.username, post: v.media?.id })
      } catch (e) { await setCfg('dm_last_error', errMsg(e)) }
    }
  }
  for (const id of touched) { try { await drain(id) } catch (e) { await setCfg('dm_last_error', errMsg(e)) } }
  return new Response('ok')
}

// ---------- admin
const pub = (a: Record<string, unknown>) => { const { token: _t, ...rest } = a; return rest }
function cleanRule(b: Record<string, unknown>) {
  const trig = ['comment', 'story', 'dm', 'first_dm'].includes(String(b.trigger)) ? String(b.trigger) : ''
  const reply = String(b.reply_text || '').trim().slice(0, 1000)
  if (!trig) throw new Error('צריך לבחור מתי התשובה נשלחת')
  if (!reply) throw new Error('צריך לכתוב את ההודעה')
  const kw = (Array.isArray(b.keywords) ? b.keywords : String(b.keywords || '').split(/[,،\n]/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 30)
  const url = String(b.button_url || '').trim()
  if (url && !/^https:\/\/\S+$/.test(url)) throw new Error('הקישור של הכפתור צריך להתחיל ב-https://')
  const post = trig === 'comment' && b.post_id ? String(b.post_id).trim().replace(/^.*\/(p|reel)\/([^/?#]+).*$/, '$2').slice(0, 80) : null
  return {
    name: String(b.name || '').trim().slice(0, 80) || (kw[0] ? `מילה: ${kw[0]}` : 'תשובה אוטומטית'),
    account_id: b.account_id ? String(b.account_id) : null, trigger: trig, keywords: trig === 'first_dm' ? [] : kw,
    post_id: post, media_label: post && b.media_label ? String(b.media_label).slice(0, 120) : null, media_thumb: post && b.media_thumb && /^https:\/\//.test(String(b.media_thumb)) ? String(b.media_thumb).slice(0, 1000) : null,
    reply_text: reply, public_reply: trig === 'comment' && b.public_reply ? String(b.public_reply).trim().slice(0, 1500) : null,
    button_url: url || null, button_text: url ? (String(b.button_text || '').trim().slice(0, 20) || 'לפתיחה') : null,
    enabled: b.enabled !== false, updated_at: now(),
  }
}
const safeBack = (back: string) => ORIGINS.some((r) => { try { return r.test(new URL(back).origin) } catch { return false } }) ? back : HOME

async function adminAction(a: string, body: Record<string, any>, user: { id: string }) {
  if (a === 'status') {
    const A = await app(), I = await igApp()
    const [{ data: cons }, { data: accs }, { data: unread }, { count: pending }] = await Promise.all([
      db.from('dm_connections').select('id,name,picture,connected_at').order('connected_at'),
      db.from('dm_accounts').select('*').order('network').order('name'),
      db.from('dm_threads').select('account_id,unread').gt('unread', 0),
      db.from('dm_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    const un: Record<string, number> = {}
    ;(unread || []).forEach((t) => { un[t.account_id] = (un[t.account_id] || 0) + t.unread })
    return {
      app: !!(A.id && A.secret), ownApp: A.own, igApp: !!(I.id && I.secret),
      webhook: HOOK, redirect: REDIRECT, igRedirect: IG_REDIRECT, verifyToken: await verifyToken(),
      privacyUrl: SITE + '/privacy', deletionUrl: SITE + '/privacy#data-deletion',
      lastHook: (await cfg('dm_last_hook')) || null, lastError: (await cfg('dm_last_error')) || null,
      pending: pending || 0, maxPerHour: await maxPerHour(),
      connections: (cons || []).map((c) => ({ ...c, kind: String(c.id).startsWith('ig:') ? 'instagram' : 'facebook', accounts: (accs || []).filter((x) => x.connection_id === c.id).map((x) => ({ ...pub(x), unread: un[x.id] || 0 })) })),
    }
  }
  if (a === 'config') {
    const id = String(body.app_id || '').trim(), sec = String(body.app_secret || '').trim()
    if (!/^\d{6,20}$/.test(id)) throw new Error('מזהה האפליקציה (App ID) הוא מספר בלבד')
    if (!/^[a-f0-9]{32}$/i.test(sec)) throw new Error('הסוד של האפליקציה (App Secret) לא נראה תקין: 32 תווים')
    await setCfg('dm_app_id', id); await setCfg('dm_app_secret', sec)
    return { ok: true }
  }
  if (a === 'ig_config') {
    const id = String(body.app_id || '').trim(), sec = String(body.app_secret || '').trim()
    if (!/^\d{6,20}$/.test(id)) throw new Error('ה-Instagram app ID הוא מספר בלבד')
    if (!/^[a-f0-9]{32}$/i.test(sec)) throw new Error('ה-Instagram app secret לא נראה תקין: 32 תווים')
    await setCfg('ig_app_id', id); await setCfg('ig_app_secret', sec)
    return { ok: true }
  }
  if (a === 'start') {
    const A = await app()
    if (!A.id || !A.secret) throw Object.assign(new Error('קודם שומרים את פרטי האפליקציה של פייסבוק'), { code: 'no_app' })
    const p = new URLSearchParams({ client_id: A.id, redirect_uri: REDIRECT, state: await stateFor(user.id, safeBack(String(body.back || HOME))), response_type: 'code', scope: SCOPES.join(','), auth_type: 'rerequest' })
    return { url: `https://www.facebook.com/${GV}/dialog/oauth?${p}` }
  }
  if (a === 'ig_start') {
    const I = await igApp()
    if (!I.id || !I.secret) throw Object.assign(new Error('קודם שומרים את ה-Instagram app ID וה-secret'), { code: 'no_app' })
    const p = new URLSearchParams({ enable_fb_login: '0', force_authentication: '1', client_id: I.id, redirect_uri: IG_REDIRECT, response_type: 'code', scope: IG_SCOPES.join(','), state: await stateFor(user.id, safeBack(String(body.back || HOME))) })
    return { url: `https://www.instagram.com/oauth/authorize?${p}` }
  }
  if (a === 'logout') {
    const id = String(body.connection_id || '')
    const { data: mine } = await db.from('dm_accounts').select('id,page_id,token,network,api').eq('connection_id', id)
    for (const x of mine || []) {
      try {
        if (x.api === 'ig') await igraph('/me/subscribed_apps', x.token, 'DELETE')
        else if (x.network === 'facebook') await graph(`/${x.page_id}/subscribed_apps`, { access_token: x.token }, 'DELETE')
      } catch { /* already gone */ }
    }
    await db.from('dm_queue').update({ status: 'failed', error: 'החשבון נותק' }).in('account_id', (mine || []).map((x) => x.id)).eq('status', 'pending')
    await db.from('dm_connections').delete().eq('id', id)
    return { ok: true }
  }
  if (a === 'account') {
    await db.from('dm_accounts').update({ enabled: !!body.enabled }).eq('id', String(body.id || ''))
    return { ok: true }
  }
  if (a === 'resubscribe') {
    const { data: accs } = await db.from('dm_accounts').select('*')
    const out: Record<string, string | null> = {}
    for (const x of accs || []) {
      if (x.api !== 'ig' && x.network !== 'facebook') continue
      let err: string | null = null
      try { if (x.api === 'ig') await igraph('/me/subscribed_apps', x.token, 'POST', undefined, { subscribed_fields: 'comments,messages' }); else await subscribePage(x) } catch (e) { err = heMeta(e) }
      out[x.id] = err
      if (x.api === 'ig') await db.from('dm_accounts').update({ subscribed: !err, sub_error: err }).eq('id', x.id)
      else await db.from('dm_accounts').update({ subscribed: !err, sub_error: err }).eq('page_id', x.page_id).eq('api', 'fb')
    }
    return { results: out }
  }
  if (a === 'media') {
    const { data: acc } = await db.from('dm_accounts').select(ACC_COLS).eq('id', String(body.account_id || '')).maybeSingle()
    if (!acc) throw new Error('בוחרים חשבון כדי לראות את הפוסטים שלו')
    try { return { media: (await listMedia(acc as Acc)).map((m: Record<string, string>) => ({ id: m.id, caption: (m.caption || '').slice(0, 140), type: m.media_product_type || m.media_type, thumb: m.thumbnail_url || m.media_url || null, permalink: m.permalink || null, at: m.timestamp || null })) } }
    catch (e) { throw new Error(heMeta(e)) }
  }
  if (a === 'activity') {
    const [{ data: rows }, { data: rules }] = await Promise.all([
      db.from('dm_queue').select('*').order('created_at', { ascending: false }).limit(80),
      db.from('dm_rules').select('id,name'),
    ])
    const names = Object.fromEntries((rules || []).map((r) => [r.id, r.name]))
    const hourAgo = Date.now() - HOUR
    return { items: (rows || []).map((r) => ({ ...r, rule_name: r.rule_id ? names[r.rule_id] || null : null })), sentLastHour: (rows || []).filter((r) => r.status === 'sent' && r.sent_at && new Date(r.sent_at).getTime() > hourAgo).length, maxPerHour: await maxPerHour() }
  }
  if (a === 'retry') {
    await db.from('dm_queue').update({ status: 'pending', attempts: 0, error: null }).eq('id', Number(body.id)).eq('status', 'failed')
    return { result: await drain() }
  }
  if (a === 'threads') {
    let q = db.from('dm_threads').select('*').order('last_at', { ascending: false, nullsFirst: false }).limit(300)
    if (body.account_id) q = q.eq('account_id', String(body.account_id))
    if (body.filter === 'unread') q = q.gt('unread', 0)
    if (body.q) { const s = String(body.q).replace(/[%,()]/g, ' ').trim().slice(0, 60); if (s) q = q.or(`name.ilike.%${s}%,username.ilike.%${s}%,last_text.ilike.%${s}%`) }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return { threads: data || [] }
  }
  if (a === 'thread') {
    const id = String(body.id || '')
    const [{ data: t }, { data: msgs }] = await Promise.all([
      db.from('dm_threads').select('*').eq('id', id).maybeSingle(),
      db.from('dm_messages').select('*').eq('thread_id', id).order('at').limit(500),
    ])
    if (!t) throw new Error('השיחה לא נמצאה')
    if (t.unread) await db.from('dm_threads').update({ unread: 0 }).eq('id', id)
    // the last comment that may still get a private reply (Meta allows one, within 7 days)
    const lastComment = [...(msgs || [])].reverse().find((m) => m.kind === 'comment' && m.dir === 'in' && Date.now() - new Date(m.at).getTime() < 7 * DAY)
    return { thread: { ...t, unread: 0 }, messages: msgs || [], canDm: !!(t.last_in_at && Date.now() - new Date(t.last_in_at).getTime() < DAY), comment: lastComment ? lastComment.id : null }
  }
  if (a === 'send') {
    const id = String(body.thread_id || ''), text = String(body.text || '').trim()
    if (!text) throw new Error('ההודעה ריקה')
    const { data: t } = await db.from('dm_threads').select('*').eq('id', id).maybeSingle()
    if (!t) throw new Error('השיחה לא נמצאה')
    const { data: acc } = await db.from('dm_accounts').select(ACC_COLS).eq('id', t.account_id).maybeSingle()
    if (!acc) throw new Error('החשבון של השיחה כבר לא מחובר')
    const open = t.last_in_at && Date.now() - new Date(t.last_in_at).getTime() < DAY
    const recipient = open ? { id: t.person_id } : body.comment_id ? { comment_id: String(body.comment_id) } : null
    if (!recipient) throw new Error('עברו יותר מ-24 שעות מההודעה האחרונה של הפונה, ולכן מטא לא מאפשרת לשלוח לו הודעה עכשיו. כשהוא יכתוב שוב, אפשר יהיה לענות')
    let mid: string
    try { mid = await sendDm(acc as Acc, recipient, text) } catch (e) { throw new Error(heMeta(e)) }
    await saveMsg({ id: mid, thread_id: id, account_id: t.account_id, dir: 'out', kind: 'dm', text, via: 'admin', at: now() })
    await db.from('dm_threads').update({ last_text: text.slice(0, 200), last_dir: 'out', last_at: now() }).eq('id', id)
    return { ok: true, id: mid }
  }
  if (a === 'pause') {
    await db.from('dm_threads').update({ bot_paused: !!body.paused }).eq('id', String(body.thread_id || ''))
    return { ok: true }
  }
  if (a === 'rules') {
    const { data } = await db.from('dm_rules').select('*').order('created_at')
    return { rules: data || [] }
  }
  if (a === 'rule_save') {
    const row = cleanRule(body.rule || {})
    const id = body.rule && body.rule.id ? String(body.rule.id) : null
    const { data, error } = id ? await db.from('dm_rules').update(row).eq('id', id).select().single() : await db.from('dm_rules').insert(row).select().single()
    if (error) throw new Error(error.message)
    return { rule: data }
  }
  if (a === 'rule_delete') { await db.from('dm_rules').delete().eq('id', String(body.id || '')); return { ok: true } }
  if (a === 'snippets') { const { data } = await db.from('dm_snippets').select('*').order('created_at'); return { snippets: data || [] } }
  if (a === 'snippet_save') {
    const title = String(body.title || '').trim().slice(0, 60), text = String(body.text || '').trim().slice(0, 1000)
    if (!title || !text) throw new Error('צריך כותרת וטקסט')
    const { data, error } = body.id ? await db.from('dm_snippets').update({ title, text }).eq('id', String(body.id)).select().single() : await db.from('dm_snippets').insert({ title, text }).select().single()
    if (error) throw new Error(error.message)
    return { snippet: data }
  }
  if (a === 'snippet_delete') { await db.from('dm_snippets').delete().eq('id', String(body.id || '')); return { ok: true } }
  throw new Error('פעולה לא מוכרת')
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  const url = new URL(req.url)
  if (url.pathname.endsWith('/webhook')) {
    if (req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && safeEq(url.searchParams.get('hub.verify_token') || '', await verifyToken())
      return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('forbidden', { status: 403 })
    }
    if (req.method === 'POST') return webhook(req)
  }
  if (req.method === 'GET' && url.pathname.endsWith('/ig-callback')) return igCallback(url)
  if (req.method === 'GET' && url.pathname.endsWith('/callback')) return callback(url)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)
  let body: Record<string, any> = {}
  try { body = await req.json() } catch { body = {} }
  const a = String(body.a || '')
  if (a === 'cron') {
    const secret = req.headers.get('x-cron-secret') || ''
    if (!secret || !safeEq(secret, await cfg('cron_secret'))) return json({ error: 'unauthorized' }, 401, origin)
    const result = await drain().catch((e) => ({ error: errMsg(e) }))
    await refreshTokens().catch(() => {})
    await db.from('dm_queue').delete().lt('created_at', new Date(Date.now() - 90 * DAY).toISOString())
    return json({ result }, 200, origin)
  }
  const user = await admin(req)
  if (!user) return json({ error: 'צריך להתחבר לאדמין', code: 'not_signed_in' }, 401, origin)
  try { return json(await adminAction(a, body, user), 200, origin) }
  catch (e) { return json({ error: errMsg(e), code: (e as { code?: string }).code }, 400, origin) }
})
