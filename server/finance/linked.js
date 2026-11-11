// A document that arrived as an email saying "click here to view the document": the paper itself sits behind a link.
// This reads the links out of the stored email, and fetches the one a person asks for. Only a real PDF or image is
// taken in; a web page (a viewer, a login) is handed back as an address for the person to open themselves.
// Every hop of the request is checked at connect time against private and internal addresses (guardedLookup).
import http from 'node:http'
import https from 'node:https'
import crypto from 'node:crypto'
import { MAX_FILE } from './env.js'
import { one, patch, insert, download, upload, audit } from './db.js'
import net from 'node:net'
import { guardedLookup, privateIp } from './outbound.js'

const WANT = /צפייה|לצפות|מסמך|הורד|חשבונית|קבלה|להדפסה|download|view|invoice|receipt|document|pdf/i
const SKIP = /unsubscribe|הסרה|להסרה|facebook\.com|instagram\.com|linkedin\.com|twitter\.com|wa\.me|youtube\.com|google\.com\/maps|adobe\.com|get\.adobe|privacy|terms|mailto:/i
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

export function linksOf(html) {
  const out = []; const seen = new Set()
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(String(html || ''))) && out.length < 60) {
    const url = (m[1] ?? m[2] ?? '').replace(/&amp;/g, '&').trim(); const text = strip(m[3]).slice(0, 80)
    let u; try { u = new URL(url) } catch { continue }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') continue
    if (SKIP.test(url) || SKIP.test(text) || seen.has(u.toString())) continue
    seen.add(u.toString())
    const score = (WANT.test(text) ? 2 : 0) + (/\.pdf(\?|$)/i.test(u.pathname + u.search) ? 3 : 0) + (/download|invoice|receipt|document|doc|view|file/i.test(url) ? 1 : 0) + (/לחץ כאן|click here/i.test(text) ? 1 : 0)
    if (score > 0) out.push({ url: u.toString(), text: text || u.hostname, host: u.hostname, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5)
}

function getOnce(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url); const mod = u.protocol === 'https:' ? https : http
    // an address written as a number never goes through the name lookup, so it is checked here
    const host = u.hostname.replace(/^\[|\]$/g, '')
    if (net.isIP(host) && privateIp(host) && process.env.FINANCE_ALLOW_PRIVATE_WEBHOOKS !== '1') { reject(Object.assign(new Error('כתובת פנימית לא מותרת'), { code: 'EBLOCKED' })); return }
    const req = mod.request(u, { method: 'GET', lookup: guardedLookup, timeout: 12_000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; document-fetch)', Accept: 'application/pdf,image/*,*/*;q=0.5' } }, (res) => {
      const loc = res.headers.location
      if (res.statusCode >= 300 && res.statusCode < 400 && loc) { res.resume(); resolve({ redirect: new URL(loc, u).toString() }); return }
      const chunks = []; let size = 0
      res.on('data', (c) => { size += c.length; if (size > MAX_FILE) { req.destroy(new Error('הקובץ שבקישור גדול מדי')); return } chunks.push(c) })
      res.on('end', () => resolve({ status: res.statusCode, type: String(res.headers['content-type'] || '').split(';')[0].trim().toLowerCase(), body: Buffer.concat(chunks) }))
    })
    req.on('timeout', () => req.destroy(new Error('הקישור לא ענה תוך 12 שניות')))
    req.on('error', reject)
    req.end()
  })
}
async function get(url) {
  let at = url
  for (let hop = 0; hop < 6; hop++) {
    const r = await getOnce(at)
    if (!r.redirect) return { ...r, url: at }
    at = r.redirect
  }
  throw new Error('הקישור מפנה יותר מדי פעמים')
}
const kindOf = (buf, type) => {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return ['application/pdf', 'pdf']
  if (buf[0] === 0xff && buf[1] === 0xd8) return ['image/jpeg', 'jpg']
  if (buf.subarray(0, 8).toString('latin1') === '\x89PNG\r\n\x1a\n') return ['image/png', 'png']
  if (type === 'image/webp' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return ['image/webp', 'webp']
  return null
}

export async function listLinks(documentId) {
  const doc = await one(`fin_documents?id=eq.${encodeURIComponent(documentId)}&select=id,file_path,file_mime`)
  if (!doc?.file_path || !String(doc.file_mime || '').startsWith('text/')) return { links: [] }
  return { links: linksOf((await download(doc.file_path)).toString('utf8')).map(({ url, text, host }) => ({ url, text, host })) }
}

/* fetches the linked file and makes it the document's file. The email stays with the document as an attachment. The
   caller reads the document again afterwards (the same reading as any upload), and a person still approves it. */
export async function fetchLinked(documentId, url, user) {
  const doc = await one(`fin_documents?id=eq.${encodeURIComponent(documentId)}&select=*`)
  if (!doc?.file_path || !String(doc.file_mime || '').startsWith('text/')) throw Object.assign(new Error('למסמך הזה אין מייל עם קישור'), { status: 400 })
  if (['approved', 'sent'].includes(doc.status)) throw Object.assign(new Error('מסמך מאושר לא מוחלף. החזירו אותו לבדיקה קודם'), { status: 409 })
  const allowed = linksOf((await download(doc.file_path)).toString('utf8'))
  const link = allowed.find((l) => l.url === url) || (!url ? allowed[0] : null)
  if (!link) throw Object.assign(new Error('הקישור הזה לא מופיע במייל של המסמך'), { status: 400 })
  let r
  try { r = await get(link.url) } catch (e) { return { fetched: false, open: link.url, reason: e.code === 'EBLOCKED' ? 'הקישור מוביל לכתובת פנימית ולא נפתח מהשרת' : `הקישור לא נפתח מהשרת (${String(e.message || e).slice(0, 80)})` } }
  const kind = r.status === 200 && r.body?.length ? kindOf(r.body, r.type) : null
  if (!kind) return { fetched: false, open: r.url || link.url, reason: r.status === 200 ? 'הקישור פותח עמוד אינטרנט ולא קובץ. פותחים אותו, מורידים את המסמך ומעלים אותו כאן' : `האתר ענה ${r.status}. ייתכן שהקישור פג או דורש כניסה` }
  const [mime, ext] = kind
  const name = (() => { try { const last = decodeURIComponent(new URL(r.url).pathname.split('/').pop() || ''); return /\.[a-z0-9]{2,5}$/i.test(last) ? last : `document.${ext}` } catch { return `document.${ext}` } })()
  const saved = await adopt(doc, r.body, mime, ext, name, user, { host: link.host })
  return { fetched: true, document: saved }
}

/* a file becomes the document's own file: refused when another document already holds it; the email it replaces stays
   with the document as an attachment */
async function adopt(doc, buf, mime, ext, name, user, detail) {
  const hash = crypto.createHash('sha256').update(buf).digest('hex')
  const dup = await one(`fin_documents?file_hash=eq.${hash}&id=neq.${doc.id}&select=id,supplier_name,doc_number`)
  if (dup) throw Object.assign(new Error(`המסמך הזה כבר נמצא במערכת${dup.supplier_name ? ` (${dup.supplier_name}${dup.doc_number ? ` ${dup.doc_number}` : ''})` : ''}`), { status: 409, duplicate: dup.id })
  const path = `linked/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${ext}`
  await upload(path, buf, mime)
  await insert('fin_document_attachments', { document_id: doc.id, kind: 'file', file_path: doc.file_path, file_name: doc.file_name || 'המייל המקורי.html', file_mime: 'text/html', file_size: doc.file_size || null, note: 'המייל שבו הגיע המסמך', created_by: user?.id || null }).catch(() => {})
  const saved = await patch(`fin_documents?id=eq.${doc.id}`, { file_path: path, file_name: String(name).slice(0, 200), file_mime: mime, file_size: buf.length, file_hash: hash })
  await audit('document', doc.id, 'linked_file_fetched', { ...detail, mime, size: buf.length }, user).catch(() => {})
  return saved
}

/* The original message, read again from the mailbox it came from (the same connection that collected it): who it is
   from, when, and the files attached to it. This is the document "as if in the original mail". */
const READABLE = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
async function originalMessage(doc) {
  if (!doc.mailbox_id || !doc.email_message_id) return { connected: false, reason: 'המסמך לא הגיע מתיבת מייל מחוברת' }
  const mb = await one(`fin_mailboxes?id=eq.${doc.mailbox_id}&select=*`)
  if (!mb) return { connected: false, reason: 'התיבה שממנה הגיע המסמך כבר לא מחוברת' }
  const { accessTokenFor } = await import('./pipeline.js')
  const provider = await import(`./providers/${mb.provider === 'outlook' ? 'outlook' : 'gmail'}.js`)
  try {
    const msg = await provider.getMessage(await accessTokenFor(mb), doc.email_message_id)
    const open = mb.provider === 'outlook' ? '' : `https://mail.google.com/mail/?authuser=${encodeURIComponent(mb.email || '')}#all/${encodeURIComponent(doc.email_message_id)}`
    return { connected: true, account: mb.email || '', subject: msg.subject || '', date: msg.date, open, msg }
  } catch (e) { return { connected: false, account: mb.email || '', reason: e.auth ? 'החיבור לתיבה פג. מחברים אותה מחדש במסך "חשבונות אימייל"' : `המייל המקורי לא נקרא מהתיבה (${String(e.message || e).slice(0, 80)})` } }
}
export async function mailSource(documentId) {
  const doc = await one(`fin_documents?id=eq.${encodeURIComponent(documentId)}&select=id,mailbox_id,email_message_id`)
  if (!doc) return { connected: false, reason: 'המסמך לא נמצא' }
  const m = await originalMessage(doc)
  if (!m.connected) return m
  return { connected: true, account: m.account, subject: m.subject, date: m.date, open: m.open, files: m.msg.files.map((f, i) => ({ i, name: f.name || `קובץ ${i + 1}`, mime: f.mime, size: f.size, readable: !!READABLE[f.mime] })).filter((f) => f.size > 0 || f.readable) }
}
/* one attached file of the original message: a link to download it, or (adopt) it becomes the document's file */
export async function mailFile(documentId, index, { adoptIt = false, user } = {}) {
  const doc = await one(`fin_documents?id=eq.${encodeURIComponent(documentId)}&select=*`)
  if (!doc) throw Object.assign(new Error('המסמך לא נמצא'), { status: 404 })
  const m = await originalMessage(doc)
  if (!m.connected) throw Object.assign(new Error(m.reason), { status: 409 })
  const f = m.msg.files[Number(index)]
  if (!f) throw Object.assign(new Error('הקובץ לא נמצא במייל המקורי'), { status: 404 })
  const buf = await f.load()
  if (buf.length > MAX_FILE) throw Object.assign(new Error('הקובץ שבמייל גדול מדי'), { status: 413 })
  if (adoptIt) {
    if (['approved', 'sent'].includes(doc.status)) throw Object.assign(new Error('מסמך מאושר לא מוחלף. החזירו אותו לבדיקה קודם'), { status: 409 })
    const kind = kindOf(buf, f.mime)
    if (!kind) throw Object.assign(new Error('אפשר לקרוא רק PDF או תמונה'), { status: 400 })
    return { adopted: true, document: await adopt(doc, buf, kind[0], kind[1], f.name || `document.${kind[1]}`, user, { from: 'mailbox' }) }
  }
  const safe = String(f.name || 'file').replace(/[^\w.\-\u0590-\u05ff ]+/g, '_').slice(0, 80)
  const path = `mailfetch/${doc.id}/${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)}-${safe}`
  await upload(path, buf, f.mime || 'application/octet-stream')
  const { signedUrl } = await import('./outbound.js')
  return { url: await signedUrl(path, 600), name: f.name || 'file' }
}
