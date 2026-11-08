// ============================================================
// KURKOOS FINANCE AI — server entry (/api/finance, /api/finance-oauth), routed by api/[fn].js.
// The work lives in server/finance/: providers (Gmail, Outlook), extract (Claude), validate, assign,
// pipeline (the agents), agents (cron + automations + daily summary), adapters (accounting exports).
//
//   POST /api/finance { action, ... }   signed-in members, role checked per action (below)
//   GET  /api/finance-oauth             the provider sends the person back here after consent
//   GET  /api/finance?action=cron       Vercel cron, once a day (Authorization: Bearer CRON_SECRET)
//
// Environment (Vercel > Settings > Environment Variables, never in code): see docs/finance/README.md
// ============================================================
import crypto from 'node:crypto'
import { env } from './finance/env.js'
import { sb, one, insert, patch, q, caller, audit } from './finance/db.js'
import { PROVIDERS, processStored, revalidate } from './finance/pipeline.js'
import { syncAll, retryFailed, dailySummary, runDaily, newDocRuns, closeRuns } from './finance/agents.js'
import { ADAPTERS } from './finance/adapters.js'
import { CLOUD, syncCloud, connectCloud } from './finance/cloud.js'
import whatsappWebhook, { configured as waConfigured, officeNumber } from './finance/whatsapp.js'
import { EVENTS, checkUrl, emailOk, flushOutbound, testOutbound } from './finance/outbound.js'

const ROLES = {
  'auth-url': ['admin', 'finance_manager', 'employee'],
  sync: ['admin', 'finance_manager', 'employee'],
  extract: ['admin', 'finance_manager', 'employee'],
  revalidate: ['admin', 'finance_manager', 'employee'],
  'retry-failed': ['admin', 'finance_manager'],
  'summary-now': ['admin', 'finance_manager'],
  'run-daily': ['admin'],
  disconnect: ['admin', 'finance_manager', 'employee'],
  invite: ['admin'],
  'integration-save': ['admin'],
  'integration-test': ['admin', 'finance_manager'],
  status: ['admin', 'finance_manager', 'employee', 'accountant'],
  backfill: ['admin', 'finance_manager'],
  'cloud-auth-url': ['admin'],
  'cloud-sync': ['admin', 'finance_manager'],
  'cloud-disconnect': ['admin'],
  'outbound-save': ['admin'],
  'outbound-delete': ['admin'],
  'outbound-test': ['admin'],
  'outbound-flush': ['admin', 'finance_manager', 'employee'],
  'members-meta': ['admin'],
}

// per-user rate limit (in memory, per instance): 120 calls in 10 minutes
const _rl = new Map()
function limited(key, max = 120, windowMs = 600_000) {
  const now = Date.now()
  const e = _rl.get(key) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(key, e)
  if (_rl.size > 2_000) _rl.clear()
  return e.n > max
}

const STATE_KEY = () => process.env.FINANCE_STATE_SECRET || env.sbKey()
function signState(obj) {
  const p = Buffer.from(JSON.stringify({ ...obj, n: crypto.randomBytes(12).toString('base64url') })).toString('base64url')
  return `${p}.${crypto.createHmac('sha256', STATE_KEY()).update(p).digest('base64url')}`
}
function readState(s) {
  const [p, sig] = String(s || '').split('.')
  if (!p || !sig) return null
  const good = crypto.createHmac('sha256', STATE_KEY()).update(p).digest('base64url')
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null
  const o = JSON.parse(Buffer.from(p, 'base64url').toString())
  return Date.now() - o.t < 15 * 60_000 ? o : null
}
const origin = (req) => String(process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '')
const redirectUri = (req) => `${origin(req)}/api/finance-oauth`
const redirect = (res, url) => { res.statusCode = 302; res.setHeader('Location', url); res.end() }
const readBody = (req) => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } } return b || {} }

async function oauthCallback(req, res, url) {
  const back = (qs) => redirect(res, `${origin(req)}/admin/finance/mailboxes?${qs}`)
  const st = readState(url.searchParams.get('state'))
  if (!st) return back('error=state')
  // single use: a leaked or replayed state cannot attach another account
  try { await insert('fin_oauth_used', { nonce: String(st.n || ''), at: new Date().toISOString() }, 'return=minimal') } catch { return back('error=state') }
  // the role is checked again: the person may have lost it in the 15 minutes since the link was made
  const who = await one(`fin_members?user_id=eq.${q(st.u)}&active=eq.true&select=role`)
  const allowed = CLOUD[st.p] ? ['admin'] : ['admin', 'finance_manager', 'employee']
  if (!who || !allowed.includes(who.role)) return back('error=forbidden')
  if (url.searchParams.get('error')) return back(`error=${encodeURIComponent(url.searchParams.get('error_description') || url.searchParams.get('error'))}`)
  if (CLOUD[st.p]) {
    const cloudBack = (qs) => redirect(res, `${origin(req)}/admin/finance/cloud?${qs}`)
    try {
      const t = await CLOUD[st.p].exchange(url.searchParams.get('code'), redirectUri(req))
      if (!t.email) return cloudBack('error=no_email')
      await connectCloud(st.p, t, st)
      return cloudBack(`connected=${encodeURIComponent(t.email)}`)
    } catch (e) { return cloudBack(`error=${encodeURIComponent(String(e.message || e).slice(0, 120))}`) }
  }
  const prov = PROVIDERS[st.p]
  if (!prov) return back('error=provider')
  try {
    const t = await prov.exchange(url.searchParams.get('code'), redirectUri(req))
    if (!t.email) return back('error=no_email')
    let mb = await one(`fin_mailboxes?provider=eq.${st.p}&email=eq.${q(t.email)}&select=*`)
    if (!mb) mb = await insert('fin_mailboxes', { provider: st.p, email: t.email, business_id: st.b || null, connected_by: st.u, sync_from: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10) })
    else await patch(`fin_mailboxes?id=eq.${mb.id}`, { status: 'active', last_error: null })
    const existing = await one(`fin_mailbox_secrets?mailbox_id=eq.${mb.id}&select=refresh_token`)
    const refresh = t.refresh_token || existing?.refresh_token
    if (!refresh) return back('error=no_refresh')
    await sb('fin_mailbox_secrets', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { mailbox_id: mb.id, refresh_token: refresh, access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() } })
    await audit('mailbox', mb.id, 'connected', { provider: st.p, email: t.email }, { id: st.u, email: st.e })
    return back(`connected=${encodeURIComponent(t.email)}`)
  } catch (e) {
    return back(`error=${encodeURIComponent(String(e.message || e).slice(0, 120))}`)
  }
}

export default async function handler(req, res) {
  if (!env.sbUrl() || !env.sbKey()) { res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY לא הוגדר ב-Vercel' }); return }
  const url = new URL(req.url, 'http://x')

  if (url.pathname.endsWith('/finance-oauth')) return oauthCallback(req, res, url)
  if (url.pathname.endsWith('/finance-whatsapp')) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
    return whatsappWebhook(req, res)
  }

  if (req.method === 'GET' && url.searchParams.get('action') === 'cron') {
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.status(401).json({ error: 'unauthorized' }); return }
    try { res.status(200).json({ results: await runDaily(origin(req)) }) } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
    return
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await caller(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר' }); return }
  const body = readBody(req)
  const allowed = ROLES[body.action]
  if (!allowed) { res.status(400).json({ error: 'unknown action' }); return }
  if (!user.role || !allowed.includes(user.role)) { res.status(403).json({ error: 'אין לך הרשאה לפעולה הזו' }); return }
  if (limited(user.id)) { res.status(429).json({ error: 'יותר מדי בקשות. נסו שוב בעוד כמה דקות' }); return }

  try {
    switch (body.action) {
      case 'status': {
        res.status(200).json({
          providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, p.configured()])),
          claude: !!env.anthropicKey(),
          email: !!process.env.RESEND_API_KEY,
          cron: !!process.env.CRON_SECRET,
          whatsapp: { configured: waConfigured(), number: officeNumber() },
          cloud: Object.fromEntries(Object.entries(CLOUD).map(([k, c]) => [k, c.configured()])),
          adapters: Object.values(ADAPTERS).map(({ id, label, kind, fields, secrets }) => ({ id, label, kind, fields, secrets })),
        })
        return
      }
      case 'auth-url': {
        const prov = PROVIDERS[body.provider]
        if (!prov) { res.status(400).json({ error: 'ספק לא נתמך' }); return }
        if (!prov.configured()) { res.status(503).json({ error: body.provider === 'gmail' ? 'חיבור Gmail עוד לא הוגדר: חסרים GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET ב-Vercel' : 'חיבור Outlook עוד לא הוגדר: חסרים MS_CLIENT_ID ו-MS_CLIENT_SECRET ב-Vercel' }); return }
        res.status(200).json({ url: prov.authUrl(signState({ u: user.id, e: user.email, b: body.business_id || null, p: body.provider, t: Date.now() }), redirectUri(req)) })
        return
      }
      case 'sync': {
        const results = await syncAll({ mailboxId: body.mailbox_id, trigger: 'manual', user })
        await flushOutbound({ budgetMs: 8_000 }).catch(() => {})
        res.status(200).json({ results })
        return
      }
      case 'extract': {
        const doc = await one(`fin_documents?id=eq.${q(body.document_id)}&select=*`)
        if (!doc || !doc.file_path) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (user.role === 'employee' && doc.created_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        if (['approved', 'sent'].includes(doc.status)) { res.status(409).json({ error: 'מסמך מאושר לא נקרא מחדש. החזירו אותו לבדיקה קודם' }); return }
        const runs = await newDocRuns(body.trigger === 'upload' ? 'upload' : 'manual')
        const updated = await processStored(doc, runs, body.trigger === 'upload' ? 'upload' : 'manual')
        await closeRuns(runs)
        await flushOutbound({ budgetMs: 8_000 }).catch(() => {})
        res.status(200).json({ document: updated })
        return
      }
      case 'revalidate': {
        const doc = await one(`fin_documents?id=eq.${q(body.document_id)}&select=*`)
        if (!doc) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (user.role === 'employee' && doc.created_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        res.status(200).json({ document: await revalidate(doc) })
        return
      }
      case 'backfill': {
        // "old receipts": the period starts earlier; the next scan reads the gap once
        const from = String(body.from || '')
        const d = new Date(`${from}T00:00:00Z`)
        const min = new Date(); min.setUTCFullYear(min.getUTCFullYear() - 3)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || Number.isNaN(d.getTime()) || d > new Date() || d < min) { res.status(400).json({ error: 'תאריך לא תקין (עד שלוש שנים אחורה)' }); return }
        const boxes = (await sb(`fin_mailboxes?status=in.(active,error)${body.mailbox_id ? `&id=eq.${q(body.mailbox_id)}` : ''}&select=id,sync_from,email,backfill_pending,backfill_until`)) || []
        for (const b of boxes) if (!b.sync_from || b.sync_from > from) await patch(`fin_mailboxes?id=eq.${b.id}`, { sync_from: from, backfill_pending: true, backfill_until: b.backfill_pending && b.backfill_until ? b.backfill_until : b.sync_from || null })
        await audit('mailbox', body.mailbox_id || 'all', 'backfill', { from, mailboxes: boxes.length }, user)
        res.status(200).json({ ok: true, mailboxes: boxes.length, results: body.run === false ? [] : await syncAll({ mailboxId: body.mailbox_id, trigger: 'backfill', user }) })
        return
      }
      case 'cloud-auth-url': {
        const c = CLOUD[body.provider]
        if (!c) { res.status(400).json({ error: 'ספק לא נתמך' }); return }
        if (!c.configured()) { res.status(503).json({ error: body.provider === 'gdrive' ? 'Google Drive עוד לא הוגדר: חסרים GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET' : 'Dropbox עוד לא הוגדר: חסרים DROPBOX_APP_KEY ו-DROPBOX_APP_SECRET' }); return }
        res.status(200).json({ url: c.authUrl(signState({ u: user.id, e: user.email, p: body.provider, t: Date.now() }), redirectUri(req)) })
        return
      }
      case 'cloud-sync': {
        res.status(200).json({ results: await syncCloud({ targetId: body.target_id, trigger: 'manual' }) })
        return
      }
      case 'cloud-disconnect': {
        const t = await one(`fin_cloud_targets?id=eq.${q(body.target_id)}&select=*`)
        if (!t) { res.status(404).json({ error: 'לא נמצא' }); return }
        const s2 = await one(`fin_cloud_secrets?target_id=eq.${t.id}&select=*`)
        if (s2) await CLOUD[t.provider].revoke(s2.refresh_token, s2.access_token)
        await sb(`fin_cloud_secrets?target_id=eq.${t.id}`, { method: 'DELETE', prefer: 'return=minimal' })
        await patch(`fin_cloud_targets?id=eq.${t.id}`, { status: 'revoked', enabled: false })
        await audit('cloud', t.id, 'disconnected', { provider: t.provider, email: t.account_email }, user)
        res.status(200).json({ ok: true })
        return
      }
      case 'retry-failed': {
        res.status(200).json(await retryFailed({ trigger: 'manual' }))
        return
      }
      case 'summary-now': {
        res.status(200).json({ summary: await dailySummary({ origin: origin(req), email: !!body.email }) })
        return
      }
      case 'run-daily': {
        res.status(200).json({ results: await runDaily(origin(req)) })
        return
      }
      case 'disconnect': {
        const mb = await one(`fin_mailboxes?id=eq.${q(body.mailbox_id)}&select=*`)
        if (!mb) { res.status(404).json({ error: 'התיבה לא נמצאה' }); return }
        if (user.role === 'employee' && mb.connected_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה לתיבה הזו' }); return }
        const s = await one(`fin_mailbox_secrets?mailbox_id=eq.${mb.id}&select=refresh_token`)
        if (s) await PROVIDERS[mb.provider]?.revoke(s.refresh_token)
        await sb(`fin_mailbox_secrets?mailbox_id=eq.${mb.id}`, { method: 'DELETE', prefer: 'return=minimal' })
        await patch(`fin_mailboxes?id=eq.${mb.id}`, { status: 'revoked' })
        await audit('mailbox', mb.id, 'disconnected', { email: mb.email }, user)
        res.status(200).json({ ok: true })
        return
      }
      case 'invite': {
        const email = String(body.email || '').trim().toLowerCase()
        const role = body.role
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['admin', 'finance_manager', 'employee', 'accountant'].includes(role)) { res.status(400).json({ error: 'מייל או תפקיד לא תקינים' }); return }
        const auth = (path, init) => fetch(`${env.sbUrl()}/auth/v1/${path}`, { ...init, headers: { apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}`, 'Content-Type': 'application/json' } })
        let uid = null
        const r = await auth('invite', { method: 'POST', body: JSON.stringify({ email, data: { full_name: body.full_name || '' } }) })
        const d = await r.json().catch(() => ({}))
        if (r.ok) uid = d.id
        else {
          // already has an account: find it
          const list = await auth(`admin/users?per_page=1000`, { method: 'GET' }).then((x) => x.json()).catch(() => ({}))
          uid = (list.users || []).find((u) => String(u.email).toLowerCase() === email)?.id || null
          if (!uid) { res.status(502).json({ error: d.msg || d.message || 'ההזמנה נכשלה' }); return }
        }
        const member = { user_id: uid, email, full_name: body.full_name || null, role, business_ids: Array.isArray(body.business_ids) && body.business_ids.length ? body.business_ids : null, active: true, invited_by: user.id }
        await sb('fin_members', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: member })
        await audit('member', uid, 'invited', { email, role, business_ids: member.business_ids }, user)
        res.status(200).json({ ok: true, user_id: uid, emailed: r.ok })
        return
      }
      case 'outbound-save': {
        // a webhook or an email address that receives document events. The webhook secret is returned once, here.
        const kind = body.kind === 'email' ? 'email' : 'webhook'
        const target = String(body.target || '').trim()
        const events = (Array.isArray(body.events) ? body.events : []).filter((e) => EVENTS.includes(e))
        if (!events.length) { res.status(400).json({ error: 'בחרו לפחות אירוע אחד' }); return }
        if (kind === 'email' && !emailOk(target)) { res.status(400).json({ error: 'כתובת מייל לא תקינה' }); return }
        if (kind === 'webhook') { const bad = await checkUrl(target); if (bad) { res.status(400).json({ error: bad }); return } }
        const row = { kind, target, name: String(body.name || '').slice(0, 80) || null, events, business_id: body.business_id || null, enabled: body.enabled !== false }
        let saved; let secret = null
        if (body.id) saved = await patch(`fin_outbound?id=eq.${q(body.id)}`, row)
        else {
          saved = await insert('fin_outbound', { ...row, created_by: user.id })
          if (kind === 'webhook') { secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`; await insert('fin_outbound_secrets', { outbound_id: saved.id, secret }, 'return=minimal') }
        }
        await audit('outbound', saved.id, body.id ? 'updated' : 'created', { kind, target, events }, user)
        res.status(200).json({ outbound: saved, secret })
        return
      }
      case 'outbound-delete': {
        await sb(`fin_outbound?id=eq.${q(body.id)}`, { method: 'DELETE', prefer: 'return=minimal' })
        await audit('outbound', body.id, 'deleted', {}, user)
        res.status(200).json({ ok: true })
        return
      }
      case 'outbound-test': {
        const o = await one(`fin_outbound?id=eq.${q(body.id)}&select=*`)
        if (!o) { res.status(404).json({ error: 'לא נמצא' }); return }
        const r = await testOutbound(o)
        await patch(`fin_outbound?id=eq.${o.id}`, { last_status: r.ok ? 'ok' : r.error, last_at: new Date().toISOString() })
        res.status(200).json(r)
        return
      }
      case 'outbound-flush': {
        res.status(200).json(await flushOutbound({ budgetMs: 15_000, trigger: 'event' }))
        return
      }
      case 'members-meta': {
        // last sign-in per user, to tell an accepted invitation from one still waiting
        const r = await fetch(`${env.sbUrl()}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}` } })
        const d = await r.json().catch(() => ({}))
        const ids = new Set(((await sb('fin_members?select=user_id')) || []).map((m) => m.user_id))
        res.status(200).json({ users: (d.users || []).filter((u) => ids.has(u.id)).map((u) => ({ id: u.id, last_sign_in_at: u.last_sign_in_at || null, invited_at: u.invited_at || null, confirmed: !!(u.email_confirmed_at || u.confirmed_at) })) })
        return
      }
      case 'integration-save': {
        const ad = ADAPTERS[body.provider]
        if (!ad) { res.status(400).json({ error: 'יעד לא מוכר' }); return }
        if (ad.kind === 'api' && body.enabled) {
          // one accounting system per company: a second one would receive the same documents twice
          const others = (await sb(`fin_integrations?enabled=eq.true&provider=not.in.(file,hashavshevet)&select=id,name,business_id${body.id ? `&id=neq.${q(body.id)}` : ''}`)) || []
          const clash = others.find((o) => (o.business_id || null) === (body.business_id || null))
          if (clash) { res.status(409).json({ error: `ל${body.business_id ? 'חברה הזו' : 'כל החברות'} כבר מחוברת תוכנה (${clash.name}). נתקו אותה קודם.` }); return }
        }
        const row = { provider: body.provider, name: body.name || ad.label, business_id: body.business_id || null, config: body.config || {}, enabled: !!body.enabled, status: ad.kind === 'file' ? 'ready' : 'not_active' }
        const saved = body.id ? await patch(`fin_integrations?id=eq.${q(body.id)}`, row) : await insert('fin_integrations', row)
        if (body.secret && Object.keys(body.secret).length) await sb('fin_integration_secrets', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { integration_id: saved.id, secret: body.secret, updated_at: new Date().toISOString() } })
        await audit('integration', saved.id, body.id ? 'updated' : 'created', { provider: body.provider, enabled: row.enabled }, user)
        res.status(200).json({ integration: saved })
        return
      }
      case 'integration-test': {
        const it = await one(`fin_integrations?id=eq.${q(body.id)}&select=*`)
        if (!it) { res.status(404).json({ error: 'לא נמצא' }); return }
        const secret = (await one(`fin_integration_secrets?integration_id=eq.${it.id}&select=secret`))?.secret || {}
        try {
          const r = await ADAPTERS[it.provider].test(it.config, secret)
          await patch(`fin_integrations?id=eq.${it.id}`, { status: 'ready', last_error: null, last_sync_at: new Date().toISOString() })
          res.status(200).json({ ok: true, ...r })
        } catch (e) {
          await patch(`fin_integrations?id=eq.${it.id}`, { status: e.code === 'NOT_ACTIVE' ? 'not_active' : 'error', last_error: e.message })
          res.status(200).json({ ok: false, error: e.message })
        }
        return
      }
      default:
        res.status(400).json({ error: 'unknown action' })
    }
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
