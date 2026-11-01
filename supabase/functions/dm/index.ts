// ============================================================
// dm: Instagram and Facebook messages with automations (a ManyChat-style inbox) for every page we manage.
//
// Routes (verify_jwt off; every route checks its own auth):
//   GET  /dm/callback   Facebook login redirect (signed state): adds one login (connection) with its pages
//                       and their Instagram accounts, and subscribes each page to the app's webhooks
//   GET  /dm/webhook    Meta's webhook check (hub.verify_token)
//   POST /dm/webhook    Meta's events (signed with the App Secret): messages, Facebook comments, Instagram comments
//   POST /dm {a:...}    admin actions (Supabase session):
//     status | config | start | logout | account | resubscribe
//     threads | thread | send | pause
//     rules | rule_save | rule_delete | snippets | snippet_save | snippet_delete
//
// Rules never message anyone first: they answer a comment or a message the person sent. Each rule answers a
// person once (per post, for comment rules), and never while the office has paused the bot in that chat.
// Replies by hand go out only inside Meta's 24 hour window after the person's last message.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
const GV = Deno.env.get('META_GRAPH_VERSION') || 'v23.0'
const GRAPH = 'https://graph.facebook.com/' + GV
const FN_URL = SB_URL.replace(/\/$/, '') + '/functions/v1/dm'
const REDIRECT = FN_URL + '/callback'
const HOOK = FN_URL + '/webhook'
const HOME = 'https://www.kurkoos-group.co.il/admin?tab=dm'
const ORIGINS = [/^https:\/\/(www\.)?kurkoos-group\.co\.il$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/localhost(:\d+)?$/]
const SCOPES = ['pages_show_list', 'pages_manage_metadata', 'pages_messaging', 'pages_read_engagement', 'pages_manage_engagement', 'business_management', 'instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments']
const PAGE_FIELDS = 'messages,messaging_postbacks,feed'
const DAY = 24 * 60 * 60 * 1000

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.some((r) => r.test(origin)) ? origin : 'https://www.kurkoos-group.co.il',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
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
// the inbox can use its own Meta app ("Kurkoos DM"); without one it uses the publishing app
async function app() {
  const id = (await cfg('dm_app_id')) || Deno.env.get('META_APP_ID') || (await cfg('meta_app_id'))
  const secret = (await cfg('dm_app_secret')) || Deno.env.get('META_APP_SECRET') || (await cfg('meta_app_secret'))
  return { id, secret, own: !!(await cfg('dm_app_id')) }
}
async function verifyToken() {
  let t = await cfg('dm_verify_token')
  if (!t) { t = 'kurkoos-' + crypto.randomUUID().replace(/-/g, '').slice(0, 20); await setCfg('dm_verify_token', t) }
  return t
}

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
async function stateFor(uid: string, back: string) {
  const p = b64u(enc.encode(JSON.stringify({ u: uid, b: back, e: Date.now() + 15 * 60 * 1000 })))
  return p + '.' + b64u(await hmacRaw(await cfg('cron_secret'), enc.encode(p)))
}
async function readState(st: string) {
  const [p, sig] = String(st || '').split('.')
  if (!p || !sig) return null
  if (b64u(await hmacRaw(await cfg('cron_secret'), enc.encode(p))) !== sig) return null
  try {
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
    return o.e > Date.now() ? o : null
  } catch { return null }
}

async function graph(path: string, params: Record<string, string>, method = 'GET', body?: unknown) {
  const q = new URLSearchParams(params)
  const r = method === 'GET' ? await fetch(`${GRAPH}${path}?${q}`)
    : body !== undefined ? await fetch(`${GRAPH}${path}?${q}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    : await fetch(`${GRAPH}${path}`, { method, body: q })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || d.error) {
    const e = d.error || {}
    throw Object.assign(new Error(String(e.error_user_msg || e.message || `Graph HTTP ${r.status}`).slice(0, 300)), { code: e.code, sub: e.error_subcode })
  }
  return d
}
// Meta's errors in plain Hebrew where we know them
function heMeta(e: unknown) {
  const x = e as { code?: number; sub?: number; message?: string }
  if (x.sub === 2018278 || /outside of allowed window/i.test(x.message || '')) return 'עברו יותר מ-24 שעות מההודעה האחרונה של הפונה, ולכן מטא לא מאפשרת לשלוח לו הודעה עכשיו'
  if (x.code === 190) return 'החיבור לפייסבוק פג. צריך להתחבר מחדש בלשונית "חשבונות"'
  if (x.code === 200 || x.code === 10 || /permission/i.test(x.message || '')) return 'לחשבון חסרה הרשאה לשליחת הודעות. צריך להתחבר מחדש ולאשר את כל ההרשאות'
  return errMsg(e)
}

// ---------- Facebook login: one connection per Facebook user, with all the pages it manages
async function subscribePage(acc: { page_id: string; token: string }) {
  await graph(`/${acc.page_id}/subscribed_apps`, { subscribed_fields: PAGE_FIELDS, access_token: acc.token }, 'POST')
}
async function callback(url: URL) {
  const st = await readState(url.searchParams.get('state') || '')
  const back = (st && st.b) || HOME
  const go = (q: string) => Response.redirect(back + (back.includes('?') ? '&' : '?') + q, 302)
  if (!st) return go('dm=error&m=' + encodeURIComponent('פג תוקף ההתחברות. נסו שוב'))
  if (url.searchParams.get('error')) return go('dm=error&m=' + encodeURIComponent('ההתחברות בוטלה בפייסבוק'))
  try {
    const A = await app()
    const short = await graph('/oauth/access_token', { client_id: A.id, client_secret: A.secret, redirect_uri: REDIRECT, code: url.searchParams.get('code') || '' })
    const long = await graph('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: A.id, client_secret: A.secret, fb_exchange_token: short.access_token })
    const me = await graph('/me', { access_token: long.access_token, fields: 'id,name,picture{url}' })
    const pages = await graph('/me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}', limit: '100' })
    const rows: Record<string, unknown>[] = []
    for (const p of pages.data || []) {
      rows.push({ id: 'fb:' + p.id, connection_id: me.id, network: 'facebook', page_id: p.id, account_id: p.id, name: p.name, picture: p.picture?.data?.url || null, token: p.access_token })
      const ig = p.instagram_business_account
      if (ig && ig.id) rows.push({ id: 'ig:' + ig.id, connection_id: me.id, network: 'instagram', page_id: p.id, account_id: ig.id, name: ig.name || p.name, username: ig.username || null, picture: ig.profile_picture_url || null, token: p.access_token })
    }
    if (!rows.length) return go('dm=error&m=' + encodeURIComponent('לא נמצאו עמודים בחשבון הזה. בחלון של פייסבוק צריך לסמן את העמודים ואת חשבונות האינסטגרם'))
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
    return go('dm=ok&n=' + rows.length)
  } catch (e) {
    return go('dm=error&m=' + encodeURIComponent(heMeta(e).slice(0, 200)))
  }
}

// ---------- incoming events
type Acc = { id: string; network: string; page_id: string; account_id: string; token: string; enabled: boolean }
async function accFor(network: string, accountId: string): Promise<Acc | null> {
  const { data } = await db.from('dm_accounts').select('id,network,page_id,account_id,token,enabled').eq('id', (network === 'instagram' ? 'ig:' : 'fb:') + accountId).maybeSingle()
  return data as Acc | null
}
async function profile(acc: Acc, personId: string) {
  try {
    if (acc.network === 'instagram') {
      const p = await graph(`/${personId}`, { fields: 'name,username,profile_pic', access_token: acc.token })
      return { name: p.name || p.username || null, username: p.username || null, picture: p.profile_pic || null }
    }
    const p = await graph(`/${personId}`, { fields: 'first_name,last_name,profile_pic', access_token: acc.token })
    return { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null, username: null, picture: p.profile_pic || null }
  } catch { return {} }
}
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
  return { id, isNew: !t || !t.last_in_at, paused: !!(t && t.bot_paused) }
}
async function saveMsg(m: Record<string, unknown>) {
  await db.from('dm_messages').upsert(m, { onConflict: 'id', ignoreDuplicates: true })
}

// ---------- sending
async function sendDm(acc: Acc, recipient: Record<string, string>, text: string) {
  const d = await graph(`/${acc.page_id}/messages`, { access_token: acc.token }, 'POST', { recipient, messaging_type: 'RESPONSE', message: { text: text.slice(0, 1000) } })
  return String(d.message_id || 'out_' + crypto.randomUUID())
}
async function replyPublic(acc: Acc, commentId: string, text: string) {
  const path = acc.network === 'instagram' ? `/${commentId}/replies` : `/${commentId}/comments`
  const d = await graph(path, { message: text.slice(0, 2000), access_token: acc.token }, 'POST')
  return String(d.id || '')
}

// ---------- automations
const norm = (s: string) => String(s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim()
function matches(rule: { keywords: string[] }, text: string) {
  const k = (rule.keywords || []).map(norm).filter(Boolean)
  if (!k.length) return true
  const t = norm(text)
  return k.some((w) => t.includes(w))
}
// {name} in a reply becomes the person's first name
const fill = (tpl: string, name?: string | null) => tpl.replace(/\{name\}|\{שם\}/g, String(name || '').split(' ')[0] || '').replace(/\s+([,.!?])/g, '$1').trim()
async function rulesFor(acc: Acc, triggers: string[]) {
  const { data } = await db.from('dm_rules').select('*').eq('enabled', true).in('trigger', triggers).order('created_at')
  return (data || []).filter((r) => !r.account_id || r.account_id === acc.id)
}
async function claim(ruleId: string, key: string) {
  const { error } = await db.from('dm_rule_hits').insert({ rule_id: ruleId, person_key: key })
  return !error
}
async function bump(ruleId: string) {
  const { data } = await db.from('dm_rules').select('hits').eq('id', ruleId).maybeSingle()
  await db.from('dm_rules').update({ hits: ((data && data.hits) || 0) + 1 }).eq('id', ruleId)
}

async function onMessage(acc: Acc, ev: Record<string, any>) {
  const msg = ev.message || {}
  const mine = ev.sender?.id === acc.account_id || ev.sender?.id === acc.page_id || msg.is_echo
  const person = mine ? ev.recipient?.id : ev.sender?.id
  if (!person || !msg.mid) return
  const text = String(msg.text || (msg.attachments && msg.attachments.length ? '[קובץ מצורף]' : '') || (ev.postback && ev.postback.title) || '')
  const media = msg.attachments && msg.attachments[0] && msg.attachments[0].payload && msg.attachments[0].payload.url
  const at = new Date(Number(ev.timestamp) || Date.now()).toISOString()
  const { data: dup } = await db.from('dm_messages').select('id').eq('id', msg.mid).maybeSingle()
  if (dup) return
  const th = await touchThread(acc, person, { text, dir: mine ? 'out' : 'in', at })
  await saveMsg({ id: msg.mid, thread_id: th.id, account_id: acc.id, dir: mine ? 'out' : 'in', kind: 'dm', text, media_url: media || null, via: mine ? 'meta' : null, at })
  if (mine || th.paused || !acc.enabled) return
  const rules = await rulesFor(acc, th.isNew ? ['first_dm', 'dm'] : ['dm'])
  rules.sort((a, b) => (a.trigger === 'first_dm' ? -1 : 0) - (b.trigger === 'first_dm' ? -1 : 0))
  const { data: t } = await db.from('dm_threads').select('name').eq('id', th.id).maybeSingle()
  for (const r of rules) {
    if (!matches(r, text)) continue
    if (!(await claim(r.id, `${th.id}|-`))) continue
    try {
      const reply = fill(r.reply_text, t && t.name)
      const mid = await sendDm(acc, { id: person }, reply)
      await saveMsg({ id: mid, thread_id: th.id, account_id: acc.id, dir: 'out', kind: 'dm', text: reply, via: 'rule:' + r.id, at: now() })
      await touchThread(acc, person, { text: reply, dir: 'out', at: now() })
      await bump(r.id)
    } catch (e) { await db.from('dm_rule_hits').delete().eq('rule_id', r.id).eq('person_key', `${th.id}|-`); await setCfg('dm_last_error', heMeta(e)) }
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
  const rules = (await rulesFor(acc, ['comment'])).filter((r) => !r.post_id || r.post_id === c.post || String(c.post).endsWith('_' + r.post_id))
  for (const r of rules) {
    if (!matches(r, c.text)) continue
    if (!(await claim(r.id, `${th.id}|${c.post || '-'}`))) continue
    const who = c.name || c.username || null
    try {
      const reply = fill(r.reply_text, who)
      const mid = await sendDm(acc, { comment_id: c.id }, reply)
      await saveMsg({ id: mid, thread_id: th.id, account_id: acc.id, dir: 'out', kind: 'dm', text: reply, via: 'rule:' + r.id, at: now() })
      if (r.public_reply) {
        const pub = fill(r.public_reply, who)
        const rid = await replyPublic(acc, c.id, pub).catch(() => '')
        if (rid) await saveMsg({ id: rid, thread_id: th.id, account_id: acc.id, dir: 'out', kind: 'reply', text: pub, post_id: c.post || null, via: 'rule:' + r.id, at: now() })
      }
      await touchThread(acc, c.from, { text: reply, dir: 'out', at: now() })
      await bump(r.id)
    } catch (e) { await db.from('dm_rule_hits').delete().eq('rule_id', r.id).eq('person_key', `${th.id}|${c.post || '-'}`); await setCfg('dm_last_error', heMeta(e)) }
    break
  }
}

async function webhook(req: Request) {
  const raw = new Uint8Array(await req.arrayBuffer())
  const A = await app()
  const sig = (req.headers.get('x-hub-signature-256') || '').replace(/^sha256=/, '')
  if (!A.secret || !sig || hex(await hmacRaw(A.secret, raw)) !== sig) return new Response('bad signature', { status: 401 })
  let body: Record<string, any> = {}
  try { body = JSON.parse(new TextDecoder().decode(raw)) } catch { return new Response('ok') }
  await setCfg('dm_last_hook', now())
  const network = body.object === 'instagram' ? 'instagram' : body.object === 'page' ? 'facebook' : ''
  if (!network) return new Response('ok')
  for (const entry of body.entry || []) {
    const acc = await accFor(network, String(entry.id))
    if (!acc) continue
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
  return new Response('ok')
}

// ---------- admin
const pub = (a: Record<string, unknown>) => { const { token: _t, ...rest } = a; return rest }
function cleanRule(b: Record<string, unknown>) {
  const trig = ['comment', 'dm', 'first_dm'].includes(String(b.trigger)) ? String(b.trigger) : ''
  const reply = String(b.reply_text || '').trim().slice(0, 1000)
  if (!trig) throw new Error('צריך לבחור מתי התשובה נשלחת')
  if (!reply) throw new Error('צריך לכתוב את התשובה')
  const kw = (Array.isArray(b.keywords) ? b.keywords : String(b.keywords || '').split(/[,\n]/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 30)
  return {
    name: String(b.name || '').trim().slice(0, 80) || (kw[0] ? `מילה: ${kw[0]}` : 'תשובה אוטומטית'),
    account_id: b.account_id ? String(b.account_id) : null, trigger: trig, keywords: kw,
    post_id: trig === 'comment' && b.post_id ? String(b.post_id).trim().replace(/^.*\/(p|reel)\/([^/?#]+).*$/, '$2').slice(0, 80) : null,
    reply_text: reply, public_reply: trig === 'comment' && b.public_reply ? String(b.public_reply).trim().slice(0, 500) : null,
    enabled: b.enabled !== false, updated_at: now(),
  }
}

async function adminAction(a: string, body: Record<string, any>, user: { id: string }) {
  if (a === 'status') {
    const A = await app()
    const [{ data: cons }, { data: accs }, { data: unread }] = await Promise.all([
      db.from('dm_connections').select('id,name,picture,connected_at').order('connected_at'),
      db.from('dm_accounts').select('*').order('network').order('name'),
      db.from('dm_threads').select('account_id,unread').gt('unread', 0),
    ])
    const un: Record<string, number> = {}
    ;(unread || []).forEach((t) => { un[t.account_id] = (un[t.account_id] || 0) + t.unread })
    return {
      app: !!(A.id && A.secret), ownApp: A.own, appId: A.id ? A.id.slice(0, 4) + '…' : '',
      webhook: HOOK, redirect: REDIRECT, verifyToken: await verifyToken(),
      lastHook: (await cfg('dm_last_hook')) || null, lastError: (await cfg('dm_last_error')) || null,
      connections: (cons || []).map((c) => ({ ...c, accounts: (accs || []).filter((x) => x.connection_id === c.id).map((x) => ({ ...pub(x), unread: un[x.id] || 0 })) })),
    }
  }
  if (a === 'config') {
    const id = String(body.app_id || '').trim(), sec = String(body.app_secret || '').trim()
    if (!/^\d{6,20}$/.test(id)) throw new Error('מזהה האפליקציה (App ID) הוא מספר בלבד')
    if (!/^[a-f0-9]{32}$/i.test(sec)) throw new Error('הסוד של האפליקציה (App Secret) לא נראה תקין: 32 תווים')
    await setCfg('dm_app_id', id); await setCfg('dm_app_secret', sec)
    return { ok: true }
  }
  if (a === 'start') {
    const A = await app()
    if (!A.id || !A.secret) throw Object.assign(new Error('קודם שומרים את פרטי האפליקציה של פייסבוק'), { code: 'no_app' })
    const back = String(body.back || HOME)
    const safe = ORIGINS.some((r) => { try { return r.test(new URL(back).origin) } catch { return false } }) ? back : HOME
    const p = new URLSearchParams({ client_id: A.id, redirect_uri: REDIRECT, state: await stateFor(user.id, safe), response_type: 'code', scope: SCOPES.join(','), auth_type: 'rerequest' })
    return { url: `https://www.facebook.com/${GV}/dialog/oauth?${p}` }
  }
  if (a === 'logout') {
    const id = String(body.connection_id || '')
    const { data: mine } = await db.from('dm_accounts').select('id,page_id,token,network').eq('connection_id', id)
    // stop the webhooks only for pages no other login still holds (another login would have replaced the row)
    for (const x of (mine || []).filter((m) => m.network === 'facebook')) {
      try { await graph(`/${x.page_id}/subscribed_apps`, { access_token: x.token }, 'DELETE') } catch { /* already gone */ }
    }
    await db.from('dm_connections').delete().eq('id', id)
    return { ok: true }
  }
  if (a === 'account') {
    await db.from('dm_accounts').update({ enabled: !!body.enabled }).eq('id', String(body.id || ''))
    return { ok: true }
  }
  if (a === 'resubscribe') {
    const { data: accs } = await db.from('dm_accounts').select('*').eq('network', 'facebook')
    const out: Record<string, string | null> = {}
    for (const x of accs || []) {
      let err: string | null = null
      try { await subscribePage(x) } catch (e) { err = heMeta(e) }
      out[x.id] = err
      await db.from('dm_accounts').update({ subscribed: !err, sub_error: err }).eq('page_id', x.page_id)
    }
    return { results: out }
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
    const { data: acc } = await db.from('dm_accounts').select('*').eq('id', t.account_id).maybeSingle()
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
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === (await verifyToken())
      return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('forbidden', { status: 403 })
    }
    if (req.method === 'POST') return webhook(req)
  }
  if (req.method === 'GET' && url.pathname.endsWith('/callback')) return callback(url)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)
  const user = await admin(req)
  if (!user) return json({ error: 'צריך להתחבר לאדמין', code: 'not_signed_in' }, 401, origin)
  let body: Record<string, any> = {}
  try { body = await req.json() } catch { body = {} }
  try { return json(await adminAction(String(body.a || ''), body, user), 200, origin) }
  catch (e) { return json({ error: errMsg(e), code: (e as { code?: string }).code }, 400, origin) }
})
