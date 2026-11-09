// Automatic delivery: every document event (received, approved, rejected, exported) is queued in the database by a
// trigger on fin_documents, and drained here. A webhook gets signed JSON; an email address gets the file attached.
// Signature: X-Kurkoos-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the endpoint secret>.
import crypto from 'node:crypto'
import dns from 'node:dns/promises'
import net from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { env, BUCKET } from './env.js'
import { sb, one, patch, download, agentRun, rpc } from './db.js'
import { money } from './format-server.js'

export const EVENTS = ['document.received', 'document.approved', 'document.rejected', 'document.exported']
const BACKOFF_MIN = [1, 5, 30, 120, 720]           // minutes between attempts; after the last one the delivery is dropped
const MAX_ATTEMPTS = BACKOFF_MIN.length + 1
const MAX_ATTACH = 10 * 1024 * 1024

const allowPrivate = () => process.env.FINANCE_ALLOW_PRIVATE_WEBHOOKS === '1'

// every address range a webhook must never reach (private, loopback, link-local, CGNAT, benchmark, multicast, reserved,
// and the IPv6 forms that embed an IPv4 address: mapped ::ffff:0:0/96, NAT64 64:ff9b::/96, 6to4 2002::/16)
const BLOCK = new net.BlockList()
for (const [a, n] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) BLOCK.addSubnet(a, n, 'ipv4')
for (const [a, n] of [['::', 127], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8]]) BLOCK.addSubnet(a, n, 'ipv6')
export function privateIp(ip) {
  const fam = net.isIP(ip)
  if (!fam) return true
  return BLOCK.check(ip, fam === 4 ? 'ipv4' : 'ipv6')
}

// the address is checked at connect time, so a name that resolves to a public address for the check and to a private
// one for the request (DNS rebinding) is still refused
function guardedLookup(host, opts, cb) {
  dns.lookup(host, { ...opts, all: true }).then((list) => {
    const bad = list.find((r) => privateIp(r.address))
    if (bad && !allowPrivate()) return cb(Object.assign(new Error('כתובת פנימית לא מותרת'), { code: 'EBLOCKED' }))
    if (opts && opts.all) return cb(null, list)
    return cb(null, list[0].address, list[0].family)
  }, (e) => cb(e))
}

/* POST with the guarded lookup, no redirects, 10 s timeout */
function postGuarded(target, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(target)
    const mod = u.protocol === 'https:' ? https : http
    const req = mod.request(u, { method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }, lookup: guardedLookup, timeout: 10_000 }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); res.on('error', reject) })
    req.on('timeout', () => req.destroy(new Error('הכתובת לא ענתה תוך 10 שניות')))
    req.on('error', reject)
    req.end(body)
  })
}

/* https only, and never an address inside a private network (the server must not be used to reach internal services) */
export async function checkUrl(raw) {
  let u
  try { u = new URL(String(raw || '').trim()) } catch { return 'כתובת לא תקינה' }
  if (u.username || u.password) return 'כתובת עם שם משתמש וסיסמה לא נתמכת'
  if (u.protocol !== 'https:' && !(allowPrivate() && u.protocol === 'http:')) return 'הכתובת חייבת להתחיל ב-https://'
  if (allowPrivate()) return null
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return 'כתובת פנימית לא מותרת'
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => [])).map((r) => r.address)
  if (!ips.length) return 'השרת בכתובת הזו לא נמצא'
  if (ips.some(privateIp)) return 'כתובת פנימית לא מותרת'
  return null
}
export const emailOk = (s) => /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]{2,}$/.test(String(s || '').trim())

export const sign = (secret, t, body) => crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')

export async function signedUrl(path, seconds = 86400) {
  const r = await fetch(`${env.sbUrl()}/storage/v1/object/sign/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: seconds }),
  }).catch(() => null)
  const d = r && r.ok ? await r.json().catch(() => null) : null
  return d?.signedURL ? `${env.sbUrl()}/storage/v1${d.signedURL}` : null
}

/* the document as the receiver sees it: the business fields, never internal flags or AI snapshots */
async function docPayload(d, names) {
  return {
    id: d.id, status: d.status, type: d.doc_type, number: d.doc_number,
    supplier: { name: d.supplier_name, tax_id: d.supplier_tax_id },
    company: d.business_id ? { id: d.business_id, name: names.businesses[d.business_id] || null } : null,
    project: d.project_id ? { id: d.project_id, name: names.projects[d.project_id] || null } : null,
    issue_date: d.issue_date, accounting_period: d.accounting_period, currency: d.currency || 'ILS',
    amount_before_vat: d.amount_before_vat, vat_amount: d.vat_amount, total_amount: d.total_amount,
    source: d.source, file_name: d.file_name, file_url: d.file_path ? await signedUrl(d.file_path) : null,
    created_at: d.created_at, approved_at: d.approved_at || null,
  }
}

const SUBJECT = { 'document.received': 'מסמך חדש', 'document.approved': 'מסמך אושר', 'document.rejected': 'מסמך נדחה', 'document.exported': 'מסמך יוצא לרו״ח', ping: 'בדיקת חיבור' }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function deliverWebhook(o, secret, event, data, deliveryId) {
  const body = JSON.stringify({ id: String(deliveryId), event, created_at: new Date().toISOString(), data })
  const t = Math.floor(Date.now() / 1000)
  return postGuarded(o.target, { 'Content-Type': 'application/json', 'User-Agent': 'Kurkoos-Finance-Webhook/1', 'X-Kurkoos-Event': event, 'X-Kurkoos-Delivery': String(deliveryId), 'X-Kurkoos-Signature': `t=${t},v1=${sign(secret, t, body)}` }, body)
}

async function deliverEmail(o, event, doc, data) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw Object.assign(new Error('RESEND_API_KEY לא מוגדר'), { permanent: false })
  const attachments = []
  if (doc?.file_path && (doc.file_size || 0) <= MAX_ATTACH) {
    const buf = await download(doc.file_path)
    if (buf.length <= MAX_ATTACH) attachments.push({ filename: doc.file_name || 'document.pdf', content: buf.toString('base64') })
  }
  const title = doc ? `${SUBJECT[event]}: ${doc.supplier_name || doc.file_name || 'מסמך'}${doc.total_amount ? ` · ${money(doc.total_amount)}` : ''}` : SUBJECT[event]
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif">${doc ? `<p><b>${esc(doc.supplier_name || 'ספק לא מזוהה')}</b>${doc.doc_number ? ` · ${esc(doc.doc_number)}` : ''}</p><p>${doc.issue_date ? `תאריך: ${esc(doc.issue_date)}<br>` : ''}${doc.total_amount ? `סה״כ: ${esc(money(doc.total_amount))}<br>` : ''}${data?.company?.name ? `חברה: ${esc(data.company.name)}<br>` : ''}</p>${attachments.length ? '<p>הקובץ המקורי מצורף.</p>' : data?.file_url ? `<p><a href="${esc(data.file_url)}">להורדת הקובץ</a> (הקישור בתוקף 24 שעות)</p>` : ''}` : '<p>זו הודעת בדיקה ממערכת הנהלת החשבונות של קבוצת קורקוס. החיבור תקין.</p>'}</div>`
  const r = await fetch(`${env.resendApi()}/emails`, {
    method: 'POST', signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FINANCE_FROM || process.env.NOTIFY_FROM || 'Kurkoos Finance <onboarding@resend.dev>', to: [o.target], subject: title, html, attachments }),
  })
  await r.arrayBuffer().catch(() => {})
  return r.status
}

async function namesMap() {
  return {
    businesses: Object.fromEntries(((await sb('fin_businesses?select=id,name')) || []).map((b) => [b.id, b.name])),
    projects: Object.fromEntries(((await sb('fin_projects?select=id,name')) || []).map((p) => [p.id, p.name])),
  }
}

/* sends what is due. Safe to call often and from several places: each row is claimed before it is sent. */
export async function flushOutbound({ max = 40, started = Date.now(), budgetMs = 25_000, trigger = 'event' } = {}) {
  const due = (await sb(`fin_outbound_queue?done_at=is.null&next_at=lte.${encodeURIComponent(new Date().toISOString())}&attempts=lt.${MAX_ATTEMPTS}&select=*&order=id.asc&limit=${max}`)) || []
  // a delivery that crashed on its last attempt is closed here
  await sb(`fin_outbound_queue?done_at=is.null&attempts=gte.${MAX_ATTEMPTS}&next_at=lte.${encodeURIComponent(new Date().toISOString())}`, { method: 'PATCH', prefer: 'return=minimal', body: { done_at: new Date().toISOString(), last_error: 'נכשל אחרי כל הניסיונות' } }).catch(() => {})
  if (!due.length) return { sent: 0, failed: 0 }
  const run = await agentRun('outbound', trigger)
  const outs = Object.fromEntries(((await sb(`fin_outbound?id=in.(${[...new Set(due.map((d) => d.outbound_id))].join(',')})&select=*`)) || []).map((o) => [o.id, o]))
  const names = await namesMap()
  let sent = 0; let failed = 0
  for (const q of due) {
    if (Date.now() - started > budgetMs) break
    // claim: push next_at forward so a parallel flush skips this row
    const o = outs[q.outbound_id]
    if (!o) continue
    if (!o.enabled) continue                          // paused: the row waits for the target to be turned on again
    // claim: the attempt is counted now, so a delivery that kills the function still runs out of attempts
    const attempts = q.attempts + 1
    const claimed = await sb(`fin_outbound_queue?id=eq.${q.id}&done_at=is.null&attempts=eq.${q.attempts}&next_at=eq.${encodeURIComponent(q.next_at)}`, { method: 'PATCH', body: { attempts, next_at: new Date(Date.now() + 2 * 60_000).toISOString() } }).catch(() => [])
    if (!claimed?.length) continue
    let status = 0; let error = null
    try {
      const doc = q.document_id ? await one(`fin_documents?id=eq.${q.document_id}&select=*`) : null
      if (q.document_id && !doc) { await patch(`fin_outbound_queue?id=eq.${q.id}`, { done_at: new Date().toISOString(), last_error: 'המסמך נמחק' }); continue }
      const data = doc ? await docPayload(doc, names) : { ping: true }
      if (o.kind === 'webhook') {
        const bad = await checkUrl(o.target)
        if (bad) throw new Error(bad)
        const secret = (await one(`fin_outbound_secrets?outbound_id=eq.${o.id}&select=secret`))?.secret
        if (!secret) throw new Error('הסוד של ה-webhook חסר')
        status = await deliverWebhook(o, secret, q.event, data, q.id)
      } else status = await deliverEmail(o, q.event, doc, data)
      if (status < 200 || status >= 300) error = `HTTP ${status}`
    } catch (e) { error = String(e.message || e).slice(0, 200) }
    if (!error) {
      await patch(`fin_outbound_queue?id=eq.${q.id}`, { attempts, done_at: new Date().toISOString(), last_status: status, last_error: null })
      await rpc('fin_outbound_count', { p_id: o.id, p_ok: true, p_status: 'ok' }).catch(() => {})
      sent++; run.stat.processed++
    } else {
      const giveUp = attempts >= MAX_ATTEMPTS
      await patch(`fin_outbound_queue?id=eq.${q.id}`, { attempts, last_status: status || null, last_error: error, ...(giveUp ? { done_at: new Date().toISOString() } : { next_at: new Date(Date.now() + BACKOFF_MIN[attempts - 1] * 60_000).toISOString() }) })
      await rpc('fin_outbound_count', { p_id: o.id, p_ok: false, p_status: error }).catch(() => {})
      failed++; run.stat.errors++
    }
  }
  run.stat.details = { sent, failed }
  await run.done()
  return { sent, failed }
}

/* a test delivery right now, outside the queue */
export async function testOutbound(o) {
  try {
    if (o.kind === 'webhook') {
      const bad = await checkUrl(o.target)
      if (bad) return { ok: false, error: bad }
      const secret = (await one(`fin_outbound_secrets?outbound_id=eq.${o.id}&select=secret`))?.secret
      const status = await deliverWebhook(o, secret, 'ping', { ping: true }, `test-${Date.now()}`)
      return status >= 200 && status < 300 ? { ok: true, status } : { ok: false, error: `השרת ענה ${status}` }
    }
    const status = await deliverEmail(o, 'ping', null, null)
    return status >= 200 && status < 300 ? { ok: true, status } : { ok: false, error: `שליחת המייל נכשלה (${status})` }
  } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 200) } }
}
