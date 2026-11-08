// Mobile scanners: a registered phone sends a photo or a PDF to the office WhatsApp number, and it enters the same
// pipeline as an upload. Green API (already used for the lead alerts) posts each incoming message to
// /api/finance-whatsapp with "Authorization: Bearer <FINANCE_WHATSAPP_WEBHOOK_TOKEN>" (the webhookUrlToken setting).
// Every message is logged in fin_whatsapp_inbox, accepted or refused; unknown numbers are refused with a reply.
import crypto from 'node:crypto'
import { env, MIME_OK, MAX_FILE, QUOTA_STOP } from './env.js'
import { sb, one, insert, patch, upload, storageUsage } from './db.js'
import { processStored } from './pipeline.js'
import { newDocRuns, closeRuns } from './agents.js'
import { money as _m } from './format-server.js'

export const officeNumber = () => String(process.env.FINANCE_WHATSAPP_NUMBER || '').replace(/\D/g, '')
export const configured = () => !!(process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_TOKEN && process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN)

export async function reply(phone, message) {
  if (!process.env.GREENAPI_ID_INSTANCE || !process.env.GREENAPI_TOKEN) return
  await fetch(`${env.greenApi()}/waInstance${process.env.GREENAPI_ID_INSTANCE}/sendMessage/${process.env.GREENAPI_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
  }).catch(() => {})
}

// Green API serves media from its own storage hosts. Anything else is refused (no fetching of internal URLs).
const MEDIA_HOSTS = () => String(process.env.FINANCE_WA_MEDIA_HOSTS || 'greenapi.net,green-api.com').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
export function mediaUrlOk(raw) {
  let u; try { u = new URL(raw) } catch { return false }
  const host = u.hostname.toLowerCase()
  const local = process.env.FINANCE_WA_MEDIA_HOSTS && (u.protocol === 'http:' || u.protocol === 'https:')
  if (u.protocol !== 'https:' && !local) return false
  return MEDIA_HOSTS().some((h) => host === h || host.endsWith(`.${h}`))
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

export default async function whatsappWebhook(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const want = process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN || ''
  if (!want || token.length !== want.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(want))) { res.status(401).json({ error: 'unauthorized' }); return }
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
  b = b || {}
  if (b.typeWebhook !== 'incomingMessageReceived') { res.status(200).json({ ok: true, ignored: b.typeWebhook || 'unknown' }); return }
  const chat = String(b.senderData?.chatId || b.senderData?.sender || '')
  if (!chat.endsWith('@c.us')) { res.status(200).json({ ok: true, ignored: 'group' }); return }   // groups are not scanners
  const phone = chat.split('@')[0].replace(/\D/g, '')
  const messageId = String(b.idMessage || '')
  const md = b.messageData || {}
  const kind = md.typeMessage || 'unknown'
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

  let sender = await one(`fin_whatsapp_senders?phone=eq.${phone}&active=eq.true&select=*`)
  // a phone whose user was deactivated stops being a scanner
  if (sender?.user_id && !(await one(`fin_members?user_id=eq.${sender.user_id}&active=eq.true&select=user_id`))) sender = null
  if (!sender) {
    await log({ outcome: 'refused_unknown_number' })
    await reply(phone, 'המספר הזה לא רשום כסורק במערכת הנהלת החשבונות של קבוצת קורקוס. בקשו ממנהל המערכת להוסיף אותו במסך "סורקים ניידים".')
    res.status(200).json({ ok: true, outcome: 'refused_unknown_number' }); return
  }
  const file = md.fileMessageData
  if (!['imageMessage', 'documentMessage'].includes(kind) || !file?.downloadUrl) {
    await log({ sender_id: sender.id, outcome: 'unsupported' })
    await reply(phone, 'כדי להוסיף חשבונית שלחו צילום שלה או קובץ PDF.')
    res.status(200).json({ ok: true, outcome: 'unsupported' }); return
  }
  try {
    const mime = MIME_OK.has(file.mimeType) ? file.mimeType : kind === 'imageMessage' ? 'image/jpeg' : file.mimeType
    if (!MIME_OK.has(mime)) { await log({ sender_id: sender.id, outcome: 'unsupported', file_name: file.fileName, detail: mime }); await reply(phone, 'אפשר לשלוח רק תמונה או PDF.'); res.status(200).json({ ok: true, outcome: 'unsupported' }); return }
    if (!mediaUrlOk(file.downloadUrl)) { await log({ sender_id: sender.id, outcome: 'failed', file_name: file.fileName, detail: 'download host not allowed' }); res.status(200).json({ ok: false, outcome: 'failed' }); return }
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
    await patch(`fin_whatsapp_senders?id=eq.${sender.id}`, { docs_count: (sender.docs_count || 0) + 1, last_received_at: new Date().toISOString() })
    await log({ sender_id: sender.id, outcome: 'imported', document_id: doc.id, file_name: file.fileName })
    await reply(phone, done?.status === 'failed' ? 'קיבלנו את הקובץ. הקריאה האוטומטית נכשלה, והמסמך ממתין לבדיקה ידנית.' : `קיבלנו ✓ ${done?.supplier_name || 'המסמך'}${done?.total_amount ? `, ${_m(done.total_amount)}` : ''}. ממתין לאישור.`)
    // the sender already has the confirmation; now the automatic deliveries (webhook / email) for the new document
    const { flushOutbound } = await import('./outbound.js'); await flushOutbound({ budgetMs: 6_000 }).catch(() => {})
    res.status(200).json({ ok: true, outcome: 'imported', document_id: doc.id })
  } catch (e) {
    await log({ sender_id: sender.id, outcome: 'failed', file_name: file?.fileName, detail: String(e.message || e).slice(0, 300) })
    await reply(phone, 'משהו השתבש בקבלת הקובץ. נסו שוב בעוד כמה דקות.')
    res.status(200).json({ ok: false, outcome: 'failed' })   // 200: a retry storm would not help
  }
}
