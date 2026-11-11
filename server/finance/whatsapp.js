// Mobile scanners: a registered phone sends a photo or a PDF to the office WhatsApp number, and it enters the same
// pipeline as an upload. Green API (already used for the lead alerts) posts each incoming message to
// /api/finance-whatsapp with "Authorization: Bearer <FINANCE_WHATSAPP_WEBHOOK_TOKEN>" (the webhookUrlToken setting).
// Every message is logged in fin_whatsapp_inbox, accepted or refused; unknown numbers are refused with a reply.
import crypto from 'node:crypto'
import { env, MIME_OK, MAX_FILE, QUOTA_STOP } from './env.js'
import { sb, one, insert, patch, upload, storageUsage, audit } from './db.js'
import { processStored } from './pipeline.js'
import { newDocRuns, closeRuns } from './agents.js'
import { money as _m } from './format-server.js'

export const officeNumber = () => String(process.env.FINANCE_WHATSAPP_NUMBER || '').replace(/\D/g, '')
export const configured = () => !!(process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_TOKEN && process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN)

/* the automatic messages to the sender (received, approved, a problem) can be turned off in the WhatsApp screen.
   Off means the document is still taken in, only nothing is written back. */
export async function repliesOn() {
  const row = await one('fin_settings?key=eq.whatsapp_auto_replies&select=value').catch(() => null)
  return row?.value !== false
}
export async function setReplies(on, user) {
  const body = { value: !!on, updated_by: user?.id || null, updated_at: new Date().toISOString() }
  const done = await patch('fin_settings?key=eq.whatsapp_auto_replies', body).catch(() => null)
  if (!done || (Array.isArray(done) && !done.length)) await insert('fin_settings', { key: 'whatsapp_auto_replies', ...body })
  return { replies: !!on }
}
export async function reply(phone, message) {
  if (!process.env.GREENAPI_ID_INSTANCE || !process.env.GREENAPI_TOKEN) return false
  if (!(await repliesOn())) return false
  const r = await fetch(`${env.greenApi()}/waInstance${process.env.GREENAPI_ID_INSTANCE}/sendMessage/${process.env.GREENAPI_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
  }).catch(() => null)
  return !!r?.ok
}
/* a document that came by WhatsApp was approved: its sender is told, once. The audit trail is the memory of "once". */
export async function notifyApproved(documentId, user) {
  const doc = await one(`fin_documents?id=eq.${encodeURIComponent(documentId)}&select=id,status,source,supplier_name,total_amount,currency,email_from`)
  if (!doc) throw Object.assign(new Error('המסמך לא נמצא'), { status: 404 })
  if (doc.source !== 'whatsapp' || !['approved', 'sent'].includes(doc.status)) return { sent: false, reason: 'not_applicable' }
  const phone = String(doc.email_from || '').replace(/\D/g, '')
  if (!phone) return { sent: false, reason: 'no_sender' }
  if (await one(`fin_audit?entity_id=eq.${doc.id}&action=eq.whatsapp_approved_notice&select=id`)) return { sent: false, reason: 'already' }
  const sent = await reply(phone, `המסמך אושר ונשמר בהצלחה במערכת.${doc.supplier_name ? `\n${doc.supplier_name}${doc.total_amount != null ? ` · ${_m(doc.total_amount)}` : ''}` : ''}`)
  if (sent) await audit('document', doc.id, 'whatsapp_approved_notice', { phone: `…${phone.slice(-4)}` }, user)
  return { sent, reason: sent ? 'sent' : 'off_or_failed' }
}

// Green API serves media from its own storage hosts. Anything else is refused (no fetching of internal URLs).
// Green API keeps media on its own domains and on object storage it rents (DigitalOcean "do-media-<pool>", Yandex "sw-media")
const MEDIA_STORAGE = [/^do-media-\d+\.[a-z0-9-]+\.digitaloceanspaces\.com$/, /^sw-media(-out)?\.storage\.yandexcloud\.net$/]
const MEDIA_HOSTS = () => String(process.env.FINANCE_WA_MEDIA_HOSTS || 'greenapi.net,green-api.com,greenapi.com').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
export function mediaUrlOk(raw) {
  let u; try { u = new URL(raw) } catch { return false }
  const host = u.hostname.toLowerCase()
  const local = process.env.FINANCE_WA_MEDIA_HOSTS && (u.protocol === 'http:' || u.protocol === 'https:')
  if (u.protocol !== 'https:' && !local) return false
  return MEDIA_HOSTS().some((h) => host === h || host.endsWith(`.${h}`)) || (u.protocol === 'https:' && MEDIA_STORAGE.some((re) => re.test(host)))
}
async function fetchMedia(url) {
  const r = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) })
  if (!r.ok) throw new Error(`download ${r.status}`)
  if (Number(r.headers.get('content-length') || 0) > MAX_FILE) return null
  const chunks = []; let size = 0
  for await (const c of r.body) { size += c.length; if (size > MAX_FILE) return null; chunks.push(c) }
  return Buffer.concat(chunks)
}

const extOf = (mime) => (mime === 'application/pdf' ? 'pdf' : mime.split('/')[1])

/* The office number may already feed another system (a chatbot, a CRM). Green API sends each message to one address
   only, so when this system takes the address over it passes every message on, unchanged, to the address that had it
   before: FINANCE_WHATSAPP_FORWARD_URL, with FINANCE_WHATSAPP_FORWARD_TOKEN as its bearer token when it has one. */
export const forwardTo = () => { try { const u = new URL(String(process.env.FINANCE_WHATSAPP_FORWARD_URL || '')); return u.protocol === 'https:' || process.env.FINANCE_ALLOW_PRIVATE_WEBHOOKS === '1' ? u.toString() : '' } catch { return '' } }
async function forward(body) {
  const url = forwardTo()
  if (!url) return
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000)
  const tok = process.env.FINANCE_WHATSAPP_FORWARD_TOKEN
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify(body), signal: ctl.signal })
    if (!r.ok) console.warn('[finance-whatsapp] forward answered', r.status)
  } catch (e) { console.warn('[finance-whatsapp] forward failed', String(e.message || e).slice(0, 120)) } finally { clearTimeout(t) }
}

export default async function whatsappWebhook(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const want = process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN || ''
  if (!want || token.length !== want.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(want))) {
    // A delivery that carries the wrong code is the usual reason "nothing arrives": it is noted (once in ten minutes,
    // nothing about the message itself) so the connection check can say so instead of staying silent.
    if (req.headers['x-finance-probe']) { res.status(401).json({ error: 'unauthorized' }); return }   // the system asking its own address
    try {
      const since = new Date(Date.now() - 10 * 60_000).toISOString()
      if (!(await one(`fin_whatsapp_inbox?outcome=eq.unauthorized&at=gt.${encodeURIComponent(since)}&select=id`))) await insert('fin_whatsapp_inbox', { kind: 'delivery', outcome: 'unauthorized', detail: token ? 'קוד האימות שנשלח לא תואם את זה שבשרת' : 'ההודעה הגיעה בלי קוד אימות' })
    } catch { /* the refusal itself does not depend on the note */ }
    res.status(401).json({ error: 'unauthorized' }); return
  }
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
  b = b || {}
  // the other system gets the message whatever this one decides about it
  await Promise.all([forward(b), take(b, res)])
}
async function take(b, res) {
  // Two kinds of message bring a document: one that arrives at the office number, and one sent FROM the office phone
  // itself (Green API: outgoingMessageReceived, "messages sent from the phone"). Messages this system sends through the
  // API (outgoingAPIMessageReceived) are never read, so its own confirmations cannot loop back.
  const fromOffice = b.typeWebhook === 'outgoingMessageReceived'
  if (b.typeWebhook !== 'incomingMessageReceived' && !fromOffice) { res.status(200).json({ ok: true, ignored: b.typeWebhook || 'unknown' }); return }
  const chat = String(b.senderData?.chatId || b.senderData?.sender || '')
  if (!chat.endsWith('@c.us')) { res.status(200).json({ ok: true, ignored: 'group' }); return }   // groups are not scanners
  const phone = chat.split('@')[0].replace(/\D/g, '')
  const messageId = String(b.idMessage || '')
  const md = b.messageData || {}
  const kind = md.typeMessage || 'unknown'
  let sender = await one(`fin_whatsapp_senders?phone=eq.${phone}&active=eq.true&select=*`)
  if (fromOffice) {
    // The office phone talks to clients all day, so only two chats count: the note-to-self chat (the office number
    // writing to itself) and a chat with a registered scanner. A file sent anywhere else is the office's own business
    // and leaves no trace here; so does plain text in any chat.
    const own = String(b.instanceData?.wid || '').split('@')[0].replace(/\D/g, '')
    const toSelf = !!own && phone === own
    if (!['imageMessage', 'documentMessage'].includes(kind) || !(toSelf || sender)) { res.status(200).json({ ok: true, ignored: 'office_chat' }); return }
    if (!sender) sender = { id: null, user_id: null, business_id: null, docs_count: 0 }
  }
  // a phone whose user was deactivated stops being a scanner
  if (sender?.user_id && !(await one(`fin_members?user_id=eq.${sender.user_id}&active=eq.true&select=user_id`))) sender = null
  // On a number that also serves another system (clients write to it), a stranger's message leaves no trace here:
  // it is not this system's business, and their phone numbers do not belong in the finance records.
  if (!sender && forwardTo()) { res.status(200).json({ ok: true, outcome: 'refused_unknown_number' }); return }
  // the inbox row is claimed first: its unique message_id makes a Green API retry a no-op even while the first delivery is still being read
  let row
  try { row = await insert('fin_whatsapp_inbox', { message_id: messageId || null, phone, kind, outcome: 'received' }) } catch (e) {
    if (!/duplicate|unique|23505|409/i.test(String(e.message || e.status))) throw e
    // a retry of a delivery that died half way (function timeout) may take it over after 3 minutes
    const stale = new Date(Date.now() - 3 * 60_000).toISOString()
    row = (await sb(`fin_whatsapp_inbox?message_id=eq.${encodeURIComponent(messageId)}&outcome=eq.received&at=lt.${encodeURIComponent(stale)}`, { method: 'PATCH', body: { at: new Date().toISOString() } }).catch(() => []))?.[0]
    if (!row) { res.status(200).json({ ok: true, repeat: true }); return }
  }
  const log = (r) => patch(`fin_whatsapp_inbox?id=eq.${row.id}`, r).catch(() => {})

  if (!sender) {
    // nothing is written back: the office number is also where clients write, and they must never hear from this system
    await log({ outcome: 'refused_unknown_number' })
    res.status(200).json({ ok: true, outcome: 'refused_unknown_number' }); return
  }
  const file = md.fileMessageData
  if (!['imageMessage', 'documentMessage'].includes(kind) || !file?.downloadUrl) {
    // an ordinary chat message from a registered phone is not a failed scan: logged, not answered
    await log({ sender_id: sender.id, outcome: 'unsupported' })
    res.status(200).json({ ok: true, outcome: 'unsupported' }); return
  }
  try {
    const mime = MIME_OK.has(file.mimeType) ? file.mimeType : kind === 'imageMessage' ? 'image/jpeg' : file.mimeType
    if (!MIME_OK.has(mime)) { await log({ sender_id: sender.id, outcome: 'unsupported', file_name: file.fileName, detail: mime }); await reply(phone, 'אפשר לשלוח רק תמונה או PDF.'); res.status(200).json({ ok: true, outcome: 'unsupported' }); return }
    if (!mediaUrlOk(file.downloadUrl)) { await log({ sender_id: sender.id, outcome: 'failed', file_name: file.fileName, detail: `download host not allowed: ${(() => { try { return new URL(file.downloadUrl).hostname } catch { return 'unreadable address' } })()}` }); res.status(200).json({ ok: false, outcome: 'failed' }); return }
    const usage = await storageUsage()
    if (usage !== null && usage >= QUOTA_STOP) {
      await log({ sender_id: sender.id, outcome: 'refused_quota', file_name: file.fileName, detail: `storage ${Math.round(usage * 100)}%` })
      await reply(phone, 'המערכת לא יכולה לקבל קבצים כרגע (האחסון מלא). המשרד קיבל התראה. נסו שוב מחר.')
      res.status(200).json({ ok: true, outcome: 'refused_quota' }); return
    }
    const buf = await fetchMedia(file.downloadUrl)
    if (!buf) { await log({ sender_id: sender.id, outcome: 'unsupported', file_name: file.fileName, detail: 'too large' }); await reply(phone, 'הקובץ גדול מ-12MB.'); res.status(200).json({ ok: true, outcome: 'too_large' }); return }
    const hash = crypto.createHash('sha256').update(buf).digest('hex')
    const dup = await one(`fin_documents?file_hash=eq.${hash}&select=id`)
    if (dup) { await log({ sender_id: sender.id, outcome: 'duplicate', document_id: dup.id, file_name: file.fileName }); await reply(phone, 'המסמך הזה כבר במערכת. אין צורך לשלוח שוב.'); res.status(200).json({ ok: true, outcome: 'duplicate' }); return }
    const path = `whatsapp/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${extOf(mime)}`
    await upload(path, buf, mime)
    const doc = await insert('fin_documents', { status: 'processing', source: 'whatsapp', business_id: sender.business_id, created_by: sender.user_id, file_path: path, file_name: String(file.fileName || `whatsapp.${extOf(mime)}`).slice(0, 200), file_mime: mime, file_size: buf.length, file_hash: hash, email_from: `WhatsApp ${phone}`, email_subject: file.caption ? String(file.caption).slice(0, 300) : null })
    const runs = await newDocRuns('whatsapp')
    const done = await processStored(doc, runs, 'whatsapp')
    await closeRuns(runs)
    if (sender.id) await patch(`fin_whatsapp_senders?id=eq.${sender.id}`, { docs_count: (sender.docs_count || 0) + 1, last_received_at: new Date().toISOString() })
    await log({ sender_id: sender.id, outcome: 'imported', document_id: doc.id, file_name: file.fileName })
    const site = String(process.env.SITE_URL || '').replace(/\/$/, '')
    const link = site ? `\n${site}/admin/finance/documents/${doc.id}` : ''
    const company = done?.business_id ? (await one(`fin_businesses?id=eq.${done.business_id}&select=name`))?.name : null
    const unclear = done?.status === 'failed' || !done?.supplier_name || !done?.total_amount
    await reply(phone, unclear
      ? `קיבלנו את הקובץ, אבל לא הצלחנו לקרוא את כל הפרטים. המסמך נשמר וממתין לבדיקה ידנית.${link}`
      : `החשבונית התקבלה ונקלטה במערכת בהצלחה.\n\nספק: ${done.supplier_name}\nסכום: ${_m(done.total_amount)}${company ? `\nחברה: ${company}` : ''}\n\nאפשר לצפות בה ב-Kurkoos Finance.${link}`)
    // the sender already has the confirmation; now the automatic deliveries (webhook / email) for the new document
    const { flushOutbound } = await import('./outbound.js'); await flushOutbound({ budgetMs: 6_000 }).catch(() => {})
    res.status(200).json({ ok: true, outcome: 'imported', document_id: doc.id })
  } catch (e) {
    await log({ sender_id: sender.id, outcome: 'failed', file_name: file?.fileName, detail: String(e.message || e).slice(0, 300) })
    await reply(phone, 'משהו השתבש בקבלת הקובץ. נסו שוב בעוד כמה דקות.')
    res.status(200).json({ ok: false, outcome: 'failed' })   // 200: a retry storm would not help
  }
}

/* sends one document as a WhatsApp file message. Green API fetches the file from a signed link (24 hours). */
export async function sendDocument({ doc, phone, caption }) {
  if (!process.env.GREENAPI_ID_INSTANCE || !process.env.GREENAPI_TOKEN) throw Object.assign(new Error('WhatsApp לא הוגדר בשרת (GREENAPI_ID_INSTANCE, GREENAPI_TOKEN)'), { status: 503 })
  const { signedUrl } = await import('./outbound.js')
  const url = await signedUrl(doc.file_path, 86400)
  if (!url) throw Object.assign(new Error('לא הצלחנו להכין קישור לקובץ'), { status: 500 })
  const ext = (doc.file_name || '').match(/\.[a-z0-9]{2,5}$/i)?.[0] || (doc.file_mime === 'application/pdf' ? '.pdf' : '.jpg')
  const r = await fetch(`${env.greenApi()}/waInstance${process.env.GREENAPI_ID_INSTANCE}/sendFileByUrl/${process.env.GREENAPI_TOKEN}`, {
    method: 'POST', signal: AbortSignal.timeout(20_000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${phone}@c.us`, urlFile: url, fileName: `${String(doc.supplier_name || 'מסמך').slice(0, 40)}${doc.doc_number ? `-${doc.doc_number}` : ''}${ext}`, caption: caption || '' }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || !d.idMessage) throw Object.assign(new Error(`השליחה ב-WhatsApp נכשלה (${r.status})`), { status: 502 })
  return d.idMessage
}

/* ---------- is the reception really on? ----------
   The answers come from Green API itself (the state of the instance and its settings), not from what we hope is set.
   Nothing secret leaves the server: the token is only compared. */
const hookUrl = (origin) => `${String(origin || '').replace(/\/$/, '')}/api/finance-whatsapp`
/* The address Green API is given must answer by itself: a site that redirects (the bare domain to "www") would make
   every message depend on the sender following a redirect of a POST. The address is asked once and, when it redirects
   to the same path on another host of this site, the final address is the one that is registered and checked. */
async function finalHook(origin) {
  const want = hookUrl(origin)
  try {
    const r = await fetch(want, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', 'X-Finance-Probe': '1' }, body: '{}', signal: AbortSignal.timeout(6000) })
    const to = r.status >= 300 && r.status < 400 ? r.headers.get('location') : ''
    if (to) { const u = new URL(to, want); if (u.protocol === 'https:' && u.pathname === '/api/finance-whatsapp') return u.toString().replace(/\/$/, '') }
  } catch { /* the plain address stands */ }
  return want
}
const green = async (method, path, body) => {
  const r = await fetch(`${env.greenApi()}/waInstance${process.env.GREENAPI_ID_INSTANCE}/${path}/${process.env.GREENAPI_TOKEN}`, {
    method, signal: AbortSignal.timeout(12_000), ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const d = await r.json().catch(() => null)
  if (!r.ok || !d) throw new Error(`Green API ${r.status}`)
  return d
}
export async function health(origin) {
  const steps = []
  const add = (key, ok, title, detail = '', fix = '') => steps.push({ key, ok, title, detail, fix })
  const hasInstance = !!(process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_TOKEN)
  const hasToken = !!process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN
  add('server', hasInstance && hasToken, 'הגדרות השרת',
    hasInstance && hasToken ? 'פרטי החיבור ל-WhatsApp שמורים בשרת' : `חסר בשרת: ${[!process.env.GREENAPI_ID_INSTANCE && 'GREENAPI_ID_INSTANCE', !process.env.GREENAPI_TOKEN && 'GREENAPI_TOKEN', !hasToken && 'FINANCE_WHATSAPP_WEBHOOK_TOKEN'].filter(Boolean).join(', ')}`,
    hasInstance && hasToken ? '' : 'מוסיפים את המשתנים ב-Vercel › Settings › Environment Variables ומעלים גרסה מחדש')
  let settings = null; let state = null; let apiError = ''
  if (hasInstance) {
    try { state = (await green('GET', 'getStateInstance'))?.stateInstance || null; settings = await green('GET', 'getSettings') } catch (e) { apiError = String(e.message || e).slice(0, 120) }
    add('phone', state === 'authorized', 'הטלפון של המשרד מחובר',
      apiError ? `לא התקבלה תשובה מספק ה-WhatsApp (${apiError})` : state === 'authorized' ? 'המכשיר מחובר ופעיל' : `מצב המכשיר: ${state || 'לא ידוע'}`,
      state === 'authorized' || apiError ? '' : 'נכנסים לחשבון Green API וסורקים את קוד ה-QR עם ה-WhatsApp של המשרד')
  } else add('phone', false, 'הטלפון של המשרד מחובר', 'אי אפשר לבדוק בלי פרטי החיבור בשרת')
  const wid = String(settings?.wid || '').replace(/\D/g, '')
  const office = officeNumber()
  add('number', !!office && (!wid || wid === office), 'מספר המשרד',
    !office ? 'המספר שמוצג לעובדים לא הוגדר בשרת (FINANCE_WHATSAPP_NUMBER)' : wid && wid !== office ? `במערכת מוצג ${office}, אבל המכשיר המחובר הוא ${wid}` : `העובדים שולחים אל ${office}`,
    !office ? `מוסיפים ב-Vercel את FINANCE_WHATSAPP_NUMBER${wid ? ` = ${wid}` : ''}` : wid && wid !== office ? 'מתקנים את FINANCE_WHATSAPP_NUMBER למספר של המכשיר המחובר' : '')
  const want = await finalHook(origin)
  const urlOk = !!settings && String(settings.webhookUrl || '').replace(/\/$/, '') === want
  const tokenOk = !!settings && hasToken && String(settings.webhookUrlToken || '') === process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN
  const incomingOk = !!settings && settings.incomingWebhook === 'yes'
  const officeOk = !!settings && settings.outgoingMessageWebhook === 'yes'
  const elsewhere = !!settings?.webhookUrl && !urlOk
  // the other address is shown without its query string (a token may ride there)
  const bare = (u) => { try { const x = new URL(u); return `${x.origin}${x.pathname}`.replace(/\/$/, '') } catch { return '' } }
  const other = elsewhere ? bare(settings.webhookUrl) : ''
  const fwd = forwardTo()
  const fwdSame = !!fwd && !!other && bare(fwd) === other
  add('webhook', urlOk && tokenOk && incomingOk, 'הודעות נכנסות מגיעות למערכת',
    !settings ? 'אי אפשר לבדוק בלי תשובה מספק ה-WhatsApp' : urlOk && tokenOk && incomingOk ? 'כל הודעה שמגיעה למספר המשרד נשלחת למערכת' : elsewhere ? `ההודעות הנכנסות נשלחות כרגע לכתובת אחרת: ${other}${fwdSame ? '. היא מוגדרת כיעד העברה, ולכן אפשר להפעיל כאן בלי לנתק אותה' : ''}` : !urlOk ? 'הודעות נכנסות לא נשלחות למערכת' : !tokenOk ? 'קוד האימות של ההודעות לא תואם' : 'קבלת הודעות נכנסות כבויה',
    !settings || (urlOk && tokenOk && incomingOk) ? '' : 'לוחצים "הפעלת הקליטה" והמערכת מגדירה את זה לבד')
  if (settings) add('office', officeOk, 'שליחה מהטלפון של המשרד', officeOk ? 'קבלה שנשלחת מהטלפון של המשרד בצ׳אט "הודעה לעצמי", או לטלפון רשום, נקלטת' : 'קבלות שנשלחות מהטלפון של המשרד עצמו עוד לא מגיעות למערכת', officeOk ? '' : 'לוחצים "הפעלת הקליטה"')
  if (fwd) add('forward', true, 'העברה למערכת הקודמת', `כל הודעה שמגיעה מועברת גם ל-${bare(fwd)}`)
  const senders = (await sb('fin_whatsapp_senders?active=eq.true&select=id')) || []
  add('senders', senders.length > 0, 'טלפונים רשומים', senders.length ? `${senders.length} טלפונים יכולים לשלוח מסמכים` : 'עוד לא נרשם אף טלפון', senders.length ? '' : 'מוסיפים טלפון בכפתור "הוספת טלפון"')
  const last = ((await sb('fin_whatsapp_inbox?outcome=neq.unauthorized&select=outcome,at,kind&order=at.desc&limit=1')) || [])[0] || null
  // deliveries that were refused for a wrong code in the last day: the provider is sending, with a code this server does not accept
  const dayAgo = new Date(Date.now() - 86400_000).toISOString()
  const badCode = ((await sb(`fin_whatsapp_inbox?outcome=eq.unauthorized&at=gt.${encodeURIComponent(dayAgo)}&select=at,detail&order=at.desc&limit=1`).catch(() => [])) || [])[0] || null
  if (badCode && (!last || badCode.at > last.at)) add('code', false, 'הודעות מגיעות ונדחות', `ההודעה האחרונה נדחתה: ${badCode.detail}`, 'לוחצים "הפעלת הקליטה" כדי לרשום מחדש את הכתובת ואת קוד האימות אצל ספק ה-WhatsApp')
  return { ok: steps.every((x) => x.ok), steps, last, replies: await repliesOn(), can_setup: hasInstance && hasToken && !!settings && (!(urlOk && tokenOk && incomingOk && officeOk) || !!(badCode && (!last || badCode.at > last.at))), elsewhere: elsewhere && !fwdSame, other, forwarding: !!fwd }
}
/* points the incoming messages of the office number at this system. A webhook that already goes somewhere else is
   replaced only when the person says so (force): another tool may be listening on it. */
export async function setup(origin, { force = false } = {}) {
  if (!configured()) throw Object.assign(new Error('חסרות הגדרות בשרת. הריצו קודם את בדיקת החיבור'), { status: 400 })
  const cur = await green('GET', 'getSettings')
  const want = await finalHook(origin)
  const bare = (u) => { try { const x = new URL(u); return `${x.origin}${x.pathname}`.replace(/\/$/, '') } catch { return '' } }
  const kept = !!forwardTo() && bare(forwardTo()) === bare(cur.webhookUrl || '')
  if (cur.webhookUrl && String(cur.webhookUrl).replace(/\/$/, '') !== want && !force && !kept) throw Object.assign(new Error('ההודעות הנכנסות נשלחות כרגע לכתובת אחרת. אם מערכת אחרת משתמשת בהן היא תפסיק לקבל אותן'), { status: 409, elsewhere: true })
  const r = await green('POST', 'setSettings', { webhookUrl: want, webhookUrlToken: process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN, incomingWebhook: 'yes', outgoingMessageWebhook: 'yes' })
  if (!r.saveSettings) throw Object.assign(new Error('ספק ה-WhatsApp לא שמר את ההגדרות'), { status: 502 })
  return { saved: true }
}
