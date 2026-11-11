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
import { createJob, controlJob, acceptItem, tick as scanTick, overview as scanOverview, ensureCoverage, nightlyCheck } from './finance/scan.js'
import * as archive from './finance/archive.js'
import crypto from 'node:crypto'
import { env } from './finance/env.js'
import { sb, one, insert, patch, q, caller, audit, removeFile, rpc } from './finance/db.js'
import { PROVIDERS, processStored, revalidate } from './finance/pipeline.js'
import { syncAll, retryFailed, dailySummary, runDaily, newDocRuns, closeRuns, engineTick, morningReport } from './finance/agents.js'
import { ADAPTERS } from './finance/adapters.js'
import { ask } from './finance/assistant.js'
import { mfaBlock, loginFailed, authEvent, blockMember, endSessions, resetMfa, memberSecurity } from './finance/security.js'
import { CLOUD, syncCloud, connectCloud, saveDocsToCloud, testCloud } from './finance/cloud.js'
import { listLinks, fetchLinked } from './finance/linked.js'
import whatsappWebhook, { configured as waConfigured, officeNumber, sendDocument, health as waHealth, setup as waSetup, setReplies as waSetReplies, notifyApproved as waNotifyApproved } from './finance/whatsapp.js'
import { EVENTS, checkUrl, emailOk, flushOutbound, testOutbound } from './finance/outbound.js'
import { sendToAccountant } from './finance/mailout.js'

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
  'scan-step': ['admin', 'finance_manager'],
  'scan-start': ['admin', 'finance_manager'],
  'scan-control': ['admin', 'finance_manager'],
  'scan-accept': ['admin', 'finance_manager'],
  'scan-overview': ['admin', 'finance_manager'],
  'scan-run': ['admin', 'finance_manager'],
  'scan-coverage': ['admin', 'finance_manager'],
  'scan-night-check': ['admin', 'finance_manager'],
  'drive-overview': ['admin', 'finance_manager'],
  'drive-tree': ['admin', 'finance_manager'],
  'drive-run': ['admin', 'finance_manager'],
  'drive-requeue': ['admin', 'finance_manager'],
  'drive-rename': ['admin', 'finance_manager'],
  'drive-settings': ['admin'],
  'drive-reconcile': ['admin', 'finance_manager'],
  'drive-exclude': ['admin', 'finance_manager'],
  'drive-pause': ['admin', 'finance_manager'],
  'cloud-auth-url': ['admin'],
  'cloud-sync': ['admin', 'finance_manager'],
  'cloud-disconnect': ['admin'],
  'cloud-save': ['admin', 'finance_manager'],
  'cloud-test': ['admin', 'finance_manager'],
  'email-docs': ['admin', 'finance_manager', 'employee'],
  ask: ['admin', 'finance_manager', 'accountant'],
  'outbound-save': ['admin'],
  'outbound-delete': ['admin'],
  'outbound-test': ['admin'],
  'outbound-flush': ['admin', 'finance_manager', 'employee'],
  'members-meta': ['admin'],
  'auth-event': ['admin', 'finance_manager', 'employee', 'accountant'],
  'member-block': ['admin'],
  'member-end-sessions': ['admin'],
  'member-mfa-reset': ['admin'],
  'send-to-accountant': ['admin', 'finance_manager'],
  tick: ['admin', 'finance_manager', 'employee'],
  'retry-doc': ['admin', 'finance_manager', 'employee'],
  'duplicate-decide': ['admin', 'finance_manager'],
  'not-relevant': ['admin', 'finance_manager'],
  'merge-docs': ['admin', 'finance_manager'],
  'whatsapp-send-doc': ['admin', 'finance_manager', 'employee'],
  'whatsapp-check': ['admin', 'finance_manager'],
  'whatsapp-setup': ['admin'],
  'drive-forget': ['admin', 'finance_manager', 'employee'],
  'linked-links': ['admin', 'finance_manager', 'employee'],
  'linked-fetch': ['admin', 'finance_manager', 'employee'],
  'whatsapp-replies': ['admin', 'finance_manager'],
  'whatsapp-approved': ['admin', 'finance_manager'],
  'receipts-drive': ['admin', 'finance_manager', 'employee', 'accountant'],
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
    const cloudBack = (qs) => redirect(res, `${origin(req)}/admin/finance/${st.r === 'drive' ? 'drive' : 'cloud'}?${qs}`)
    try {
      const t = await CLOUD[st.p].exchange(url.searchParams.get('code'), redirectUri(req))
      if (!t.email) return cloudBack('error=no_email')
      const target = await connectCloud(st.p, t, st)
      // a new Drive starts working at once: the main folder, then the first documents (the minute run does the rest)
      // a reconnection never starts a new archive: the same account keeps its rows and folders, and everything it holds is
      // checked against Drive first (missing files are restored, nothing is uploaded twice)
      if (st.p === 'gdrive' && target?.id) {
        await archive.startReconcile({ targetId: target.id, trigger: 'connect', user: { id: st.u, email: st.e } }).catch(() => {})
        await archive.tick({ targetId: target.id, trigger: 'connect', budgetMs: 8_000, max: 10 }).catch(() => {})
      }
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
    if (process.env.FINANCE_SCAN_ON_CONNECT !== '0') await ensureCoverage({ user: { id: st.u, email: st.e } }).catch(() => {})
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
  // the scan engine, every minute while a scan has work (pg_cron + pg_net in Supabase; secret in Vault)
  if (req.method === 'GET' && url.searchParams.get('action') === 'scan-tick') {
    const secret = process.env.FINANCE_TICK_SECRET || process.env.CRON_SECRET
    const given = String(req.headers.authorization || '').replace(/^Bearer /, '')
    // the env secret, or the one the database made for itself in Vault (checked inside the database)
    const ok = (secret && given === secret) || (given.length >= 32 && await rpc('fin_tick_ok', { p_token: given }).catch(() => false) === true)
    if (!ok) { res.status(401).json({ error: 'unauthorized' }); return }
    try {
      const started = Date.now()
      // the Drive archive first (short: a few documents a minute is plenty), then the mail scan with the rest of the time
      const drive = await archive.tick({ started, budgetMs: 15_000, trigger: 'scan' }).catch((e) => [{ error: String(e.message || e).slice(0, 200) }])
      await archive.reconcileStep({ started, budgetMs: 25_000 }).catch(() => [])
      res.status(200).json({ ...(await scanTick({ trigger: 'scan', started })), drive })
    } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
    return
  }
  // 07:00 Israel: the morning report, then a short catch-up (retries, stuck documents, a day collection)
  if (req.method === 'GET' && url.searchParams.get('action') === 'morning') {
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.status(401).json({ error: 'unauthorized' }); return }
    try { res.status(200).json({ results: await morningReport(origin(req)) }) } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
    return
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const body = readBody(req)
  // the sign-in screen reports a failed attempt before there is a session (rate limited, no password ever)
  // what the sign-in screen may know before a session: which social providers were enabled in Supabase Auth
  // (FINANCE_SSO_PROVIDERS=google,azure, set only after the providers really work); nothing else
  if (body.action === 'public-config') { res.status(200).json({ sso: String(process.env.FINANCE_SSO_PROVIDERS || '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => ['google', 'azure'].includes(x)) }); return }
  if (body.action === 'login-failed') {
    if (limited(`fail:${String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0]}`, 60)) { res.status(429).json({ error: 'יותר מדי ניסיונות' }); return }
    res.status(200).json(await loginFailed(req, body)); return
  }
  const user = await caller(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר' }); return }
  const allowed = ROLES[body.action]
  if (!allowed) { res.status(400).json({ error: 'unknown action' }); return }
  if (!user.role || !allowed.includes(user.role)) { res.status(403).json({ error: 'אין לך הרשאה לפעולה הזו' }); return }
  // a role that requires the second step acts only after it (the database applies the same rule in fin_has_role)
  if (!['status', 'auth-event'].includes(body.action)) {
    const why = await mfaBlock(user)
    if (why) { res.status(403).json({ error: 'נדרש אימות דו-שלבי. התחברו מחדש עם הקוד מהאפליקציה', code: why }); return }
  }
  // the scan screen asks for the next step and the status again and again while a scan runs: its own, larger budget,
  // so a long scan never uses up the person's budget for everything else (each step is already capped at ~45 s)
  // each polling screen has its own budget, so the Drive screen can never use up the scan screen's (or the other way round)
  const scanPoll = ['scan-run', 'scan-overview'].includes(body.action)
  const drivePoll = ['drive-overview', 'drive-run', 'drive-reconcile', 'drive-tree'].includes(body.action)
  if (body.action !== 'status' && (scanPoll ? limited(`scan:${user.id}`, 600) : drivePoll ? limited(`drive:${user.id}`, 600) : limited(user.id))) { res.status(429).json({ error: 'יותר מדי בקשות. נסו שוב בעוד כמה דקות' }); return }

  try {
    switch (body.action) {
      case 'status': {
        res.status(200).json({
          providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, p.configured()])),
          // the exact address Google and Microsoft must list as an allowed redirect (a mismatch is Google's redirect_uri_mismatch)
          oauth_redirect: redirectUri(req),
          claude: !!env.anthropicKey(),
          email: !!process.env.RESEND_API_KEY,
          cron: !!process.env.CRON_SECRET,
          whatsapp: { configured: waConfigured(), number: officeNumber() },
          schedule: { night: '23 0 * * *', morning: '57 4 * * *', tz: 'UTC' },
          cloud: Object.fromEntries(Object.entries(CLOUD).map(([k, c]) => [k, c.configured()])),
          adapters: Object.values(ADAPTERS).map(({ id, label, kind, fields, secrets }) => ({ id, label, kind, fields, secrets })),
        })
        return
      }
      case 'auth-url': {
        const prov = PROVIDERS[body.provider]
        if (!prov) { res.status(400).json({ error: 'ספק לא נתמך' }); return }
        if (!prov.configured()) {
          // the person sees what it means for them; only an admin also gets the server detail to fix it
          const name = body.provider === 'gmail' ? 'Gmail' : 'Outlook'
          const keys = body.provider === 'gmail' ? 'GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET' : 'MS_CLIENT_ID ו-MS_CLIENT_SECRET'
          res.status(503).json({ code: 'NOT_CONFIGURED', error: user.role === 'admin' ? `חיבור ${name} עוד לא הופעל בשרת. להפעלה מוסיפים ב-Vercel את ${keys}.` : `חיבור ${name} עוד לא הופעל. מנהל המערכת יכול להפעיל אותו.` })
          return
        }
        const hint = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.hint || '').trim()) ? String(body.hint).trim().toLowerCase() : ''
        res.status(200).json({ url: prov.authUrl(signState({ u: user.id, e: user.email, b: body.business_id || null, p: body.provider, t: Date.now() }), redirectUri(req), { hint, choose: !!body.choose }) })
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
        if (updated?.skipped === 'busy') { await closeRuns(runs); res.status(200).json({ document: await one(`fin_documents?id=eq.${doc.id}&select=*`), busy: true }); return }
        await closeRuns(runs)
        await flushOutbound({ budgetMs: 8_000 }).catch(() => {})
        res.status(200).json({ document: updated })
        return
      }
      case 'linked-links': {
        const d0 = await one(`fin_documents?id=eq.${q(body.document_id)}&select=id,created_by`)
        if (!d0) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (user.role === 'employee' && d0.created_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        res.status(200).json(await listLinks(d0.id))
        return
      }
      case 'linked-fetch': {
        const d0 = await one(`fin_documents?id=eq.${q(body.document_id)}&select=id,created_by`)
        if (!d0) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (user.role === 'employee' && d0.created_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        try {
          const r = await fetchLinked(d0.id, String(body.url || ''), user)
          if (!r.fetched) { res.status(200).json(r); return }
          // the paper is read like any upload; the result waits for a person
          const runs = await newDocRuns('manual')
          const updated = await processStored(r.document, runs, 'manual')
          await closeRuns(runs)
          res.status(200).json({ fetched: true, document: updated?.skipped ? await one(`fin_documents?id=eq.${d0.id}&select=*`) : updated })
        } catch (e) { res.status(e.status || 502).json({ error: String(e.message || e), duplicate: e.duplicate || null }) }
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
        const min = new Date(); min.setUTCFullYear(min.getUTCFullYear() - 4); min.setUTCDate(min.getUTCDate() - 1)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || Number.isNaN(d.getTime()) || d > new Date() || d < min) { res.status(400).json({ error: 'תאריך לא תקין (עד ארבע שנים אחורה)' }); return }
        const boxes = (await sb(`fin_mailboxes?status=in.(active,error)${body.mailbox_id ? `&id=eq.${q(body.mailbox_id)}` : ''}&select=id,sync_from,email,backfill_pending,backfill_until`)) || []
        for (const b of boxes) if (!b.sync_from || b.sync_from > from) await patch(`fin_mailboxes?id=eq.${b.id}`, { sync_from: from, backfill_pending: true, backfill_until: b.backfill_pending && b.backfill_until ? b.backfill_until : b.sync_from || null })
        await audit('mailbox', body.mailbox_id || 'all', 'backfill', { from, mailboxes: boxes.length }, user)
        const results = body.run === false ? [] : await syncAll({ mailboxId: body.mailbox_id, trigger: 'backfill', user, onlyBackfill: true })
        res.status(200).json({ ok: true, mailboxes: boxes.length, results, cost_usd: results.cost_usd || 0 })
        return
      }
      case 'scan-start': {
        const job = await createJob({ mailboxId: body.mailbox_id, from: String(body.from || ''), to: String(body.to || new Date().toISOString().slice(0, 10)), tz: body.tz || 'Asia/Jerusalem', includeSent: !!body.include_sent, user })
        res.status(200).json({ ok: true, job })
        return
      }
      case 'scan-control': {
        res.status(200).json({ ok: true, job: await controlJob(body.job_id, String(body.op || ''), user) })
        return
      }
      case 'scan-accept': {
        await acceptItem(body.mailbox_id, String(body.message_id || ''), user)
        res.status(200).json({ ok: true })
        return
      }
      case 'scan-overview': {
        res.status(200).json({ mailboxes: await scanOverview() })
        return
      }
      case 'scan-coverage': {
        // every active mailbox gets a scan of the last year if no scan covers it (the night run does this by itself)
        res.status(200).json({ results: await ensureCoverage({ user }) })
        return
      }
      case 'scan-night-check': {
        // the night's completeness check, on demand: a scan of the last days of every active mailbox through the scan engine
        res.status(200).json({ results: await nightlyCheck({ days: Math.max(1, Math.min(7, Number(body.days) || 3)), pass: body.pass === 2 ? 2 : 1 }) })
        return
      }
      case 'scan-run': {
        // the open screen moves the scan on too (in production pg_cron does it every minute anyway)
        res.status(200).json(await scanTick({ trigger: 'scan', limits: { segments: body.max_segments, messages: body.max_messages } }))
        return
      }
      case 'scan-step': {
        // one step of the history scan (about 45 s): the screen calls it again while it is open, the nightly run goes on
        // when it is closed. Only mailboxes that still have old mail to read take part.
        const results = await syncAll({ trigger: 'backfill', user, onlyBackfill: true })
        const pending = (await sb('fin_mailboxes?status=in.(active,error)&backfill_pending=is.true&select=id')) || []
        res.status(200).json({ ok: true, results, cost_usd: results.cost_usd || 0, done: !pending.length })
        return
      }
      case 'drive-overview': {
        res.status(200).json(await archive.overview({ user }))
        return
      }
      case 'drive-tree': {
        res.status(200).json({ rows: await archive.tree({ targetId: String(body.target_id || ''), user }) })
        return
      }
      case 'drive-run': {
        res.status(200).json({ results: await archive.tick({ trigger: 'manual', targetId: body.target_id ? String(body.target_id) : null, max: Math.max(1, Math.min(500, Number(body.max) || 500)) }) })
        return
      }
      case 'drive-requeue': {
        const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500)
        res.status(200).json(await archive.requeue({ targetId: String(body.target_id || ''), ids, user }))
        return
      }
      case 'drive-rename': {
        res.status(200).json(await archive.renameDoc({ targetId: String(body.target_id || ''), documentId: String(body.document_id || ''), name: String(body.name || ''), user }))
        return
      }
      case 'drive-settings': {
        res.status(200).json(await archive.settings({ targetId: String(body.target_id || ''), by_kind: body.by_kind, auto: body.auto, auto_correct: body.auto_correct, user }))
        return
      }
      case 'drive-reconcile': {
        // "verify all documents": the whole archive against Drive now; what does not fit in one call goes on every minute
        res.status(200).json({ results: await archive.reconcile({ trigger: 'manual', targetId: body.target_id ? String(body.target_id) : null, user }) })
        return
      }
      case 'drive-exclude': {
        const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500)
        res.status(200).json(await archive.exclude({ targetId: String(body.target_id || ''), ids, excluded: body.excluded !== false, user }))
        return
      }
      case 'drive-forget': {
        // before a document is deleted: its copy in Drive goes to the Drive trash. The same people who may delete it.
        const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200)
        const mine = []
        for (let i = 0; i < ids.length; i += 100) for (const d of (await sb(`fin_documents?id=in.(${ids.slice(i, i + 100).join(',')})&select=id,status,created_by`)) || []) {
          if (user.role === 'admin' || (user.role === 'finance_manager' && !['approved', 'sent'].includes(d.status)) || (user.role === 'employee' && d.created_by === user.id && !['approved', 'sent'].includes(d.status))) mine.push(d.id)
        }
        res.status(200).json(mine.length ? await archive.removeFromDrive({ ids: mine, user }) : { trashed: 0, failed: [] })
        return
      }
      case 'drive-pause': {
        res.status(200).json(await archive.settings({ targetId: String(body.target_id || ''), enabled: body.paused === false, user }))
        return
      }
      case 'cloud-auth-url': {
        const c = CLOUD[body.provider]
        if (!c) { res.status(400).json({ error: 'ספק לא נתמך' }); return }
        if (!c.configured()) { res.status(503).json({ error: body.provider === 'gdrive' ? 'Google Drive עוד לא הוגדר: חסרים GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET' : 'Dropbox עוד לא הוגדר: חסרים DROPBOX_APP_KEY ו-DROPBOX_APP_SECRET' }); return }
        res.status(200).json({ url: c.authUrl(signState({ u: user.id, e: user.email, p: body.provider, t: Date.now(), ...(body.back === 'drive' && body.provider === 'gdrive' ? { r: 'drive' } : {}) }), redirectUri(req)) })
        return
      }
      case 'cloud-sync': {
        res.status(200).json({ results: await syncCloud({ targetId: body.target_id, trigger: 'manual' }) })
        return
      }
      case 'cloud-save': {
        const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 100)
        if (!ids.length) { res.status(400).json({ error: 'לא נבחרו מסמכים' }); return }
        res.status(200).json(await saveDocsToCloud({ ids, targetId: body.target_id ? q(body.target_id) : null, user }))
        return
      }
      case 'cloud-test': {
        res.status(200).json(await testCloud({ targetId: q(body.target_id), user }))
        return
      }
      case 'ask': {
        res.status(200).json(await ask({ question: body.question, history: body.history, user }))
        return
      }
      case 'email-docs': {
        res.status(200).json(await sendToAccountant({ ids: body.ids, to: body.to, note: String(body.note || '').slice(0, 2000), subject: String(body.subject || '').slice(0, 200) || null, ccMe: !!body.cc_me, period: null, mark: false, kind: 'share', user }))
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
        // a person asked: retry now, whatever the backoff schedule says
        res.status(200).json(await retryFailed({ trigger: 'manual', force: true }))
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
        const r = await auth(`invite?redirect_to=${encodeURIComponent(`${origin(req)}/admin/finance`)}`, { method: 'POST', body: JSON.stringify({ email, data: { full_name: body.full_name || '' } }) })
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
        // an unchanged address is not checked again: pausing a webhook whose host went away must still work
        const before = body.id ? await one(`fin_outbound?id=eq.${q(body.id)}&select=target`) : null
        if (kind === 'webhook' && before?.target !== target) { const bad = await checkUrl(target); if (bad) { res.status(400).json({ error: bad }); return } }
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
      case 'send-to-accountant': {
        const r = await sendToAccountant({ ids: body.ids, to: body.to, note: String(body.note || '').slice(0, 2000), subject: String(body.subject || '').slice(0, 200) || null, ccMe: !!body.cc_me, period: String(body.period || '').slice(0, 60) || null, mark: !!body.mark, user })
        res.status(200).json(r)
        return
      }
      case 'tick': {
        // someone opened the app: let the engine catch up (it decides itself whether anything is due)
        res.status(200).json(await engineTick({ trigger: 'tick', force: !!body.force && user.role === 'admin' }))
        return
      }
      case 'retry-doc': {
        const doc = await one(`fin_documents?id=eq.${q(body.document_id)}&select=*`)
        if (!doc || !doc.file_path) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (user.role === 'employee' && doc.created_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        if (!['failed', 'review', 'processing'].includes(doc.status)) { res.status(409).json({ error: 'אפשר לקרוא מחדש רק מסמך שלא אושר' }); return }
        const runs = await newDocRuns('manual')
        const updated = await processStored(doc, runs, 'manual')
        await closeRuns(runs)
        res.status(200).json({ document: updated })
        return
      }
      case 'not-relevant': {
        // a person says a document the conductor was unsure about is not an invoice: it leaves the documents, its file is
        // removed, and it joins the skipped list so the same file is never read or imported again
        const doc = await one(`fin_documents?id=eq.${q(body.document_id)}&select=*`)
        if (!doc) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (['approved', 'sent'].includes(doc.status)) { res.status(409).json({ error: 'מסמך מאושר לא נמחק כאן' }); return }
        await insert('fin_skipped', { source: doc.source, mailbox_id: doc.mailbox_id, email_subject: doc.email_subject, email_from: doc.email_from, file_name: doc.file_name, file_hash: doc.file_hash, document_class: 'other', confidence: 1, reason: `סומן כלא רלוונטי ע״י ${user.email}` }, 'return=minimal').catch(() => {})
        await sb(`fin_documents?id=eq.${doc.id}`, { method: 'DELETE', prefer: 'return=minimal' })
        if (doc.file_path) await removeFile(doc.file_path).catch(() => {})
        await audit('document', doc.id, 'not_relevant', { file_name: doc.file_name, email_from: doc.email_from }, user)
        res.status(200).json({ ok: true })
        return
      }
      case 'merge-docs': {
        // Two documents are one: a person keeps one and the other is closed as its duplicate (never deleted: its file and
        // history stay). Details the kept document lacks are taken from the closed one, so nothing that was read is lost.
        const keep = await one(`fin_documents?id=eq.${q(body.keep_id)}&select=*`)
        const drop = await one(`fin_documents?id=eq.${q(body.drop_id)}&select=*`)
        if (!keep || !drop || keep.id === drop.id) { res.status(400).json({ error: 'צריך לבחור שני מסמכים שונים' }); return }
        if (['approved', 'sent'].includes(drop.status)) { res.status(409).json({ error: 'מסמך מאושר לא נסגר ככפול. אפשר להשאיר אותו ולסגור את השני' }); return }
        if (['duplicate', 'rejected', 'archived'].includes(keep.status)) { res.status(409).json({ error: 'המסמך שנבחר להישאר כבר לא פעיל' }); return }
        const FILL = ['supplier_id', 'supplier_name', 'supplier_vat_id', 'doc_number', 'issue_date', 'due_date', 'payment_date', 'amount_before_vat', 'vat_amount', 'total_amount', 'category', 'category_id', 'business_id', 'project_id', 'description', 'payment_method']
        const fill = {}
        if (!['approved', 'sent'].includes(keep.status)) for (const k of FILL) if ((keep[k] === null || keep[k] === '' || keep[k] === undefined) && drop[k] !== null && drop[k] !== '' && drop[k] !== undefined) fill[k] = drop[k]
        const clean = (d) => (d.issues || []).filter((i) => !['possible_duplicate', 'duplicate'].includes(i.code))
        const closed = await patch(`fin_documents?id=eq.${drop.id}`, { status: 'duplicate', duplicate_state: 'confirmed', duplicate_of: keep.id, issues: clean(drop) })
        // the kept one stops being "suspected" itself (it may have pointed at the one that was just closed)
        const kept = await patch(`fin_documents?id=eq.${keep.id}`, { ...fill, issues: clean(keep), ...(keep.duplicate_of === drop.id ? { duplicate_of: null, duplicate_state: 'dismissed' } : keep.duplicate_state === 'suspected' ? { duplicate_state: 'dismissed' } : {}) })
        await audit('document', keep.id, 'merged_documents', { closed: drop.id, filled: Object.keys(fill) }, user)
        await audit('document', drop.id, 'duplicate_confirmed', { of: keep.id, by: 'merge' }, user)
        res.status(200).json({ kept, closed, filled: Object.keys(fill) })
        return
      }
      case 'duplicate-decide': {
        // a person decides on a suspected duplicate: "duplicate" closes it, "not" keeps it and stops the warning
        const doc = await one(`fin_documents?id=eq.${q(body.document_id)}&select=*`)
        if (!doc) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (['approved', 'sent'].includes(doc.status)) { res.status(409).json({ error: 'מסמך מאושר לא משתנה כאן' }); return }
        const dup = body.decision === 'duplicate'
        // never close a document as a copy of something that is itself closed: the original would be lost
        if (dup) {
          const target = doc.duplicate_of ? await one(`fin_documents?id=eq.${doc.duplicate_of}&select=status`) : null
          if (!target || ['duplicate', 'rejected', 'archived'].includes(target.status)) { res.status(409).json({ error: 'המסמך המקורי כבר לא פעיל, ולכן אי אפשר לסמן את זה ככפול שלו' }); return }
        }
        const issues = (doc.issues || []).filter((i) => !['possible_duplicate', 'duplicate'].includes(i.code))
        const row = await patch(`fin_documents?id=eq.${doc.id}`, dup ? { status: 'duplicate', duplicate_state: 'confirmed', issues } : { duplicate_state: 'dismissed', issues })
        await audit('document', doc.id, dup ? 'duplicate_confirmed' : 'duplicate_dismissed', { of: doc.duplicate_of }, user)
        res.status(200).json({ document: row })
        return
      }
      case 'whatsapp-check': {
        res.status(200).json(await waHealth(origin(req)))
        return
      }
      case 'whatsapp-replies': {
        const r = await waSetReplies(body.on !== false, user)
        await audit('integration', null, 'integration_saved', { provider: 'whatsapp', auto_replies: r.replies }, user)
        res.status(200).json(r)
        return
      }
      case 'whatsapp-approved': {
        try { res.status(200).json(await waNotifyApproved(String(body.document_id || ''), user)) } catch (e) { res.status(e.status || 502).json({ error: String(e.message || e) }) }
        return
      }
      case 'receipts-drive': {
        // where each hand-delivered document (WhatsApp, upload) stands in the Drive archive: status and link only
        const docs = (await sb("fin_documents?select=id&order=created_at.desc&limit=2000")) || []
        const out = {}
        for (let i = 0; i < docs.length; i += 150) {
          const ids = docs.slice(i, i + 150).map((d) => d.id).join(',')
          for (const f of (await sb(`fin_drive_files?document_id=in.(${ids})&select=document_id,status,web_link,uploaded_at,verified_at`).catch(() => [])) || []) out[f.document_id] = { status: f.status, link: f.web_link, at: f.verified_at || f.uploaded_at }
        }
        res.status(200).json({ files: out })
        return
      }
      case 'whatsapp-setup': {
        try {
          const r = await waSetup(origin(req), { force: body.force === true })
          await audit('integration', null, 'integration_saved', { provider: 'whatsapp', webhook: true }, user)
          res.status(200).json({ ...r, health: await waHealth(origin(req)) })
        } catch (e) { res.status(e.status || 502).json({ error: String(e.message || e), elsewhere: !!e.elsewhere }) }
        return
      }
      case 'whatsapp-send-doc': {
        // share one document to a phone on WhatsApp. Employees: only their own documents, only to registered phones.
        const doc = await one(`fin_documents?id=eq.${q(body.document_id)}&select=*`)
        if (!doc || !doc.file_path) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        if (user.role === 'employee' && doc.created_by !== user.id) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        if (user.business_ids?.length && doc.business_id && !user.business_ids.includes(doc.business_id)) { res.status(403).json({ error: 'אין לך הרשאה למסמך הזה' }); return }
        let phone = String(body.phone || '').replace(/\D/g, '')
        if (phone.startsWith('0')) phone = `972${phone.slice(1)}`
        if (!/^9725\d{8}$/.test(phone) && !/^[1-9]\d{9,14}$/.test(phone)) { res.status(400).json({ error: 'מספר נייד לא תקין' }); return }
        if (user.role === 'employee' && !(await one(`fin_whatsapp_senders?phone=eq.${phone}&active=eq.true&select=id`))) { res.status(403).json({ error: 'אפשר לשלוח רק למספר שרשום במסך סורקים ניידים' }); return }
        const id = await sendDocument({ doc, phone, caption: String(body.caption || '').slice(0, 500) })
        await audit('document', doc.id, 'shared_whatsapp', { phone, message_id: id }, user)
        res.status(200).json({ ok: true, message_id: id, phone })
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
      case 'auth-event': { res.status(200).json(await authEvent(req, body, user)); return }
      case 'member-block': { res.status(200).json(await blockMember({ userId: q(body.user_id), blocked: !!body.blocked, user })); return }
      case 'member-end-sessions': { res.status(200).json(await endSessions({ userId: q(body.user_id), user })); return }
      case 'member-mfa-reset': { res.status(200).json(await resetMfa({ userId: q(body.user_id), user })); return }
      case 'members-meta': {
        // last sign-in per user, to tell an accepted invitation from one still waiting
        const r = await fetch(`${env.sbUrl()}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}` } })
        const d = await r.json().catch(() => ({}))
        const ids = new Set(((await sb('fin_members?select=user_id')) || []).map((m) => m.user_id))
        const sec = Object.fromEntries((await memberSecurity()).map((x) => [x.user_id, x]))
        res.status(200).json({ users: (d.users || []).filter((u) => ids.has(u.id)).map((u) => ({ id: u.id, sessions: sec[u.id]?.sessions || 0, last_seen: sec[u.id]?.last_seen || null, mfa: !!sec[u.id]?.mfa, banned: !!(sec[u.id]?.banned_until && new Date(sec[u.id].banned_until) > new Date()), last_sign_in_at: u.last_sign_in_at || null, invited_at: u.invited_at || null, confirmed: !!(u.email_confirmed_at || u.confirmed_at) })) })
        return
      }
      case 'integration-save': {
        const ad = ADAPTERS[body.provider]
        if (!ad) { res.status(400).json({ error: 'יעד לא מוכר' }); return }
        if (ad.kind === 'api' && body.enabled) {
          // one accounting system per company: a second one would receive the same documents twice
          const others = (await sb(`fin_integrations?enabled=eq.true&provider=not.in.(file,hashavshevet)&select=id,name,business_id${body.id ? `&id=neq.${q(body.id)}` : ''}`)) || []
          // "all companies" overlaps every company, so either side being empty is a clash too
          const clash = others.find((o) => !o.business_id || !body.business_id || o.business_id === body.business_id)
          if (clash) { res.status(409).json({ error: `${clash.business_id ? 'לחברה הזו' : 'לכל החברות'} כבר מחוברת תוכנה (${clash.name}). נתקו אותה קודם.` }); return }
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
    res.status(e.status >= 400 && e.status < 600 ? e.status : 500).json({ error: String(e.message || e) })
  }
}
