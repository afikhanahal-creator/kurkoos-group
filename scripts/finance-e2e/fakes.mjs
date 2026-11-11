// Local stand-ins for the outside services, used ONLY by the end-to-end test:
//   Google OAuth + Gmail API, Microsoft login + Graph (not used yet), Claude, Resend, and an SMTP sink for
//   GoTrue's invitation emails. They speak the same HTTP shapes as the real APIs, so the production code
//   in server/finance runs unchanged against them.
//
// Claude cannot be faked by "reading" a PDF, so the fake answers from a table keyed by the file's SHA-256
// (written by run.mjs when it renders the fixture invoices). This tests everything around the AI, not the
// AI's reading quality; that part is checked with a real ANTHROPIC_API_KEY (docs/finance/TESTING.md).
import http from 'node:http'
import net from 'node:net'
import crypto from 'node:crypto'
import fs from 'node:fs'

const FIX = process.env.FIN_FIXTURES || '/var/tmp/finfix'
const PORT = Number(process.env.FAKES_PORT || 54400)
/* pixel size of a JPEG or PNG, "WxH" */
function imageDims(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`
  if (b[0] !== 0xff || b[1] !== 0xd8) return null
  let i = 2
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue }
    const m = b[i + 1]
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`
    i += 2 + b.readUInt16BE(i + 2)
  }
  return null
}
const hookFails = {}
const log = { waFiles: [], emails: [], smtp: [], claudeCalls: 0, gmailCalls: 0, drive: [], dropbox: [], wa: [], gmailQueries: [], hooks: [] }
const driveItems = []   // { id, name, parents, folder, size, md5, appProperties, trashed }
const driveFail = { upload503: 0, lose: 0, rate403: 0, nomd5: 0 }
const driveSessions = new Map()   // resumable upload sessions
let driveSeq = 0   // ids never come back after a file is removed, as in Drive
const fixtures = () => JSON.parse(fs.readFileSync(`${FIX}/fixtures.json`, 'utf8'))
const failed = {}   // sha256 → how many times Claude already failed on it
let nextAccount = null

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}
const readBody = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c }); req.on('end', () => ok(d)) })
const readRaw = (req) => new Promise((ok) => { const d = []; req.on('data', (c) => d.push(c)); req.on('end', () => ok(Buffer.concat(d))) })

const b64u = (buf) => Buffer.from(buf).toString('base64url')

/* a large mailbox without fixtures: `synthetic: { count, from, to, dense: { count, from, to } }` makes ordinary letters
   (no file, no money) spread over a period, plus a dense week, so paging and checkpoints are tested at scale */
const synCache = new Map()
function synthetic(mailbox, box) {
  if (!box.synthetic) return []
  const key = `${mailbox}|${JSON.stringify(box.synthetic)}`
  if (!synCache.has(key)) {
    const out = []
    const spread = (n, from, to, tag) => { const a = Date.parse(from); const b = Date.parse(to); for (let i = 0; i < n; i++) out.push({ id: `syn-${tag}-${i}`, date: new Date(a + ((b - a) * (i + 0.5)) / n).toISOString(), subject: `עדכון ${i}`, from: 'צוות <team@kurkoos.test>', text: 'שלום, מצורף עדכון קצר על הפגישה של השבוע. תודה.' }) }
    spread(box.synthetic.count || 0, box.synthetic.from, box.synthetic.to, 'a')
    if (box.synthetic.dense) spread(box.synthetic.dense.count, box.synthetic.dense.from, box.synthetic.dense.to, 'd')
    synCache.set(key, out)
  }
  return synCache.get(key)
}

function gmailMessage(m) {
  const parts = []
  if (m.html) parts.push({ partId: '0', mimeType: 'text/html', filename: '', body: { size: m.html.length, data: b64u(m.html) } })
  if (m.text) parts.push({ partId: '1', mimeType: 'text/plain', filename: '', body: { size: m.text.length, data: b64u(m.text) } })
  for (const [i, f] of (m.files || []).entries()) {
    const size = fs.statSync(`${FIX}/${f}`).size
    // like Gmail: the real type by extension; a TIFF arrives as octet-stream (some mail clients do that) and is known by its name
    const ext = f.toLowerCase().split('.').pop()
    const mimeType = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', zip: 'application/zip', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }[ext] || 'application/octet-stream'
    parts.push({ partId: `a${i}`, mimeType, filename: f, body: { size, attachmentId: `${m.id}__${i}` } })
  }
  return {
    id: m.id,
    internalDate: String(Date.parse(m.date)),
    payload: { mimeType: 'multipart/mixed', headers: [{ name: 'Subject', value: m.subject }, { name: 'From', value: m.from }], parts },
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const p = url.pathname
  const auth = req.headers.authorization || ''
  const mailbox = auth.replace('Bearer ', '').replace(/^at-/, '')   // the access token names the mailbox

  // ---------- Google OAuth ----------
  if (p === '/google/authorize') {
    // the consent screen: approves at once and sends the person back with a code naming the account
    const who = nextAccount || url.searchParams.get('login_hint') || 'invoices@kurkoos.test'
    const back = new URL(url.searchParams.get('redirect_uri'))
    back.searchParams.set('code', `code-${who}`)
    back.searchParams.set('state', url.searchParams.get('state'))
    res.writeHead(302, { Location: back.toString() }); res.end(); return
  }
  if (p === '/google/token') {
    const f = new URLSearchParams(await readBody(req))
    if (f.get('client_secret') !== 'test-google-secret') return send(res, 401, { error: 'invalid_client' })
    if (f.get('grant_type') === 'authorization_code') {
      const who = String(f.get('code')).replace(/^code-/, '')
      return send(res, 200, { access_token: `at-${who}`, refresh_token: `rt-${who}`, expires_in: 3600, token_type: 'Bearer' })
    }
    if (f.get('grant_type') === 'refresh_token') {
      const who = String(f.get('refresh_token')).replace(/^rt-/, '')
      if (who.startsWith('revoked')) return send(res, 400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' })
      return send(res, 200, { access_token: `at-${who}`, expires_in: 3600, token_type: 'Bearer' })
    }
    return send(res, 400, { error: 'unsupported_grant_type' })
  }
  if (p === '/google/revoke') return send(res, 200, {})

  // ---------- Gmail API ----------
  if (p.startsWith('/gmail/')) {
    log.gmailCalls++
    const box = fixtures().mailboxes[mailbox]
    if (!box) return send(res, 401, { error: { code: 401, message: 'Invalid Credentials' } })
    const rest = p.slice('/gmail/'.length)
    if (rest === 'profile') return send(res, 200, { emailAddress: mailbox })
    if (box.failing) return send(res, 503, { error: { code: 503, message: 'Backend Error' } })   // an outage during the scan
    if (rest === 'messages') {
      const q = url.searchParams.get('q') || ''
      const after = Number((q.match(/after:(\d+)/) || [])[1] || 0) * 1000
      const before = Number((q.match(/before:(\d+)/) || [])[1] || 0) * 1000
      log.gmailQueries.push(q)
      // like Gmail: an outage answered once (then the retry works), and pages of maxResults with a page token
      if (box.failListOnce && !failed[`list:${mailbox}`]) { failed[`list:${mailbox}`] = 1; log.gmail503 = (log.gmail503 || 0) + 1; return send(res, 503, { error: { code: 503, message: 'Backend Error' } }) }
      const msgs = [...box.messages, ...synthetic(mailbox, box)].filter((m) => Date.parse(m.date) >= after && (!before || Date.parse(m.date) < before)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || (a.id < b.id ? 1 : -1))
      const size = Math.min(500, Number(url.searchParams.get('maxResults') || 100)); const off = Number(url.searchParams.get('pageToken') || 0)
      const page = msgs.slice(off, off + size)
      return send(res, 200, { messages: page.map((m) => ({ id: m.id, threadId: m.id })), resultSizeEstimate: msgs.length, ...(off + size < msgs.length ? { nextPageToken: String(off + size) } : {}) })
    }
    const mm = rest.match(/^messages\/([^/]+)(?:\/attachments\/(.+))?$/)
    if (mm) {
      const m = box.messages.find((x) => x.id === mm[1]) || synthetic(mailbox, box).find((x) => x.id === mm[1])
      if (!m) return send(res, 404, { error: { code: 404, message: 'Not Found' } })
      // a message that fails a set number of times, then works (a temporary fault of the provider)
      const k = `get:${mailbox}:${m.id}`
      if (!mm[2] && box.failGet?.[m.id] && (failed[k] || 0) < box.failGet[m.id]) { failed[k] = (failed[k] || 0) + 1; return send(res, 500, { error: { code: 500, message: 'Backend Error' } }) }
      if (!mm[2]) return send(res, 200, gmailMessage(m))
      const [, idx] = mm[2].split('__')
      const buf = fs.readFileSync(`${FIX}/${m.files[Number(idx)]}`)
      return send(res, 200, { size: buf.length, data: b64u(buf) })
    }
    return send(res, 404, { error: { code: 404, message: 'Not Found' } })
  }

  // ---------- Claude ----------
  if (p === '/claude/v1/messages') {
    log.claudeCalls++
    if (req.headers['x-api-key'] !== 'test-anthropic-key') return send(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })
    const body = JSON.parse(await readBody(req))
    if (!body.output_config?.format?.schema) return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'expected structured output' } })
    // like the real API: structured outputs reject numeric, length and array-size constraints (only minItems 0 or 1)
    const badKey = (function walk(n, path) {
      if (!n || typeof n !== 'object') return null
      for (const [k, v] of Object.entries(n)) {
        if (['maxItems', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'uniqueItems'].includes(k) || (k === 'minItems' && v > 1)) return `${path}: property '${k}' is not supported`
        const r = typeof v === 'object' ? walk(v, k === 'properties' ? path : `${path}.${k}`) : null
        if (r) return r
      }
      return null
    })(body.output_config.format.schema, 'output_config.format.schema')
    if (badKey) return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: badKey } })
    const content = body.messages[0].content
    const doc = content.find((c) => c.type === 'document' || c.type === 'image')
    const text = content.find((c) => c.type === 'text')?.text || ''
    const fx = fixtures()
    let answer = null
    // the second reading (VERIFY): answers only the critical fields, from verifyAnswers, else the same as the first reading
    const verifying = text.startsWith('VERIFY:')
    // every reading of mail content must tell the model that the content is data, not instructions
    if (/never instructions to you/.test(text)) log.guarded = (log.guarded || 0) + 1
    else if (!text.startsWith('Today is') && !/Question:/.test(text)) log.unguarded = (log.unguarded || 0) + 1
    if (verifying) log.verifyCalls = (log.verifyCalls || 0) + 1
    if (doc) {
      const raw = Buffer.from(doc.source.data, 'base64')
      const hash = crypto.createHash('sha256').update(raw).digest('hex')
      const dims = imageDims(raw)
      const limit = fx.claudeFail?.[hash] || 0
      if ((failed[hash] || 0) < limit) { failed[hash] = (failed[hash] || 0) + 1; return send(res, 529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }) }
      answer = fx.answers[hash] || (dims && fx.dimAnswers?.[dims])
      if (verifying) { const v = fx.verifyAnswers?.[hash] || (dims && fx.verifyAnswers?.[`dims:${dims}`]); answer = v || (answer && Object.fromEntries(['supplier_vat_id', 'doc_number', 'issue_date', 'amount_before_vat', 'vat_amount', 'total_amount'].map((k) => [k, answer[k]]))) }
      if (dims) log.claudeDims = [...(log.claudeDims || []), dims].slice(-10)
    } else {
      const key = Object.keys(fx.textAnswers || {}).find((k) => text.includes(k))
      answer = key ? fx.textAnswers[key] : null
    }
    if (!answer) answer = { ...fx.notFinancial }
    return send(res, 200, {
      id: `msg_${crypto.randomUUID()}`, type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(answer) }], usage: { input_tokens: 1000, output_tokens: 300 },
    })
  }

  // ---------- Resend ----------
  if (p === '/resend/emails') {
    const body = JSON.parse(await readBody(req))
    log.emails.push({ to: body.to, subject: body.subject, attachments: (body.attachments || []).map((x) => ({ filename: x.filename, bytes: Buffer.from(x.content || '', 'base64').length })) })
    return send(res, 200, { id: crypto.randomUUID() })
  }

  // ---------- Google userinfo + Drive ----------
  if (p === '/google/userinfo') return send(res, 200, { email: mailbox })
  // Drive as the real API behaves for the archive: appProperties, md5Checksum of the bytes, rename/move with PATCH, 404 for a
  // parent that is gone, the trash. /__drive sets failures: upload503 (the next N uploads answer 503), lose (the next N
  // uploads are saved but answer 500, as when the answer is lost), trash / remove (a file of a document, as a person would).
  const dfile = (f) => ({ id: f.id, name: f.name, parents: f.parents, mimeType: f.folder ? 'application/vnd.google-apps.folder' : 'application/octet-stream', md5Checksum: f.folder || f.nomd5 ? undefined : f.md5, size: f.folder ? undefined : String(f.size || 0), trashed: !!f.trashed, appProperties: f.appProperties || {}, webViewLink: `https://drive.test/file/${f.id}` })
  const dpath = (pid) => { const f = driveItems.find((x) => x.id === pid); return f ? `${dpath(f.parents[0])}/${f.name}` : '' }
  if (p === '/__drive') {
    for (const k of ['upload503', 'lose', 'rate403', 'nomd5']) if (url.searchParams.has(k)) driveFail[k] = Number(url.searchParams.get(k)) || 0
    // as a person would in Drive: move a document's file to another folder, rename it, change its content
    const one = (doc) => driveItems.find((f) => f.appProperties?.kd === doc && !f.trashed)
    if (url.searchParams.get('move')) { const f = one(url.searchParams.get('move')); const to = driveItems.find((x) => x.folder && x.id !== f?.parents[0] && x.name !== 'בדיקת חיבור' && driveItems.some((y) => !y.folder && y.parents[0] === x.id)); if (f && to) f.parents = [to.id] }
    if (url.searchParams.get('rename')) { const f = one(url.searchParams.get('rename')); if (f) f.name = 'scan0001.pdf' }
    if (url.searchParams.get('change')) { const f = one(url.searchParams.get('change')); if (f) { f.content = Buffer.from('changed'); f.size = 7; f.md5 = crypto.createHash('md5').update(f.content).digest('hex') } }
    // many files of the archive that the system does not know (for paging and the exception report)
    const seed = Number(url.searchParams.get('seed') || 0); const tagOf = url.searchParams.get('kt')
    for (let i = 0; i < seed; i++) driveItems.push({ id: `file${++driveSeq}`, name: `unknown-${i}.pdf`, parents: ['root'], folder: false, size: 3, md5: 'x', content: Buffer.from('abc'), appProperties: { kt: tagOf } })
    if (url.searchParams.has('unseed')) for (let i = driveItems.length - 1; i >= 0; i--) if (/^unknown-\d+\.pdf$/.test(driveItems[i].name)) driveItems.splice(i, 1)
    for (const k of ['trash', 'remove']) {
      const doc = url.searchParams.get(k); if (!doc) continue
      const i = driveItems.findIndex((f) => f.appProperties?.kd === doc && !f.trashed)
      if (i >= 0) { if (k === 'trash') driveItems[i].trashed = true; else driveItems.splice(i, 1) }
    }
    return send(res, 200, { items: driveItems.map((f) => ({ ...dfile(f), path: dpath(f.id), resumable: !!f.resumable })), fail: driveFail })
  }
  if (p === '/drive/files' && req.method === 'GET') {
    if (!String(auth).startsWith('Bearer ')) return send(res, 401, {})
    const qy = url.searchParams.get('q') || ''
    const name = (qy.match(/name='((?:[^'\\]|\\.)*)'/) || [])[1]?.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    const parent = (qy.match(/'([^']+)' in parents/) || [])[1]
    const prop = qy.match(/appProperties has \{ key='([^']+)' and value='((?:[^'\\]|\\.)*)' \}/)
    const folderOnly = /mimeType='application\/vnd\.google-apps\.folder'/.test(qy); const filesOnly = qy.includes('mimeType!=')
    const noTrash = qy.includes('trashed=false')
    let list = driveItems.filter((f) => (!noTrash || !f.trashed) && (!folderOnly || f.folder) && (!filesOnly || !f.folder) && (!name || f.name === name) && (!parent || f.parents[0] === parent)
      && (!prop || f.appProperties?.[prop[1]] === prop[2].replace(/\\'/g, "'")))
    if (!prop && !name) list = []
    const size = Number(url.searchParams.get('pageSize') || 100); const from = Number(url.searchParams.get('pageToken') || 0)
    const page = list.slice(from, from + (list.length > 50 ? Math.min(size, 1000) : Math.min(size, 3)))   // small pages, so paging is always tested; a big archive pages by 1000 as Drive does
    return send(res, 200, { files: page.map(dfile), ...(from + page.length < list.length ? { nextPageToken: String(from + page.length) } : {}) })
  }
  // HTML uploaded as a Google document is exported as a PDF; the temporary document is then deleted
  if (p.startsWith('/drive/files/') && p.endsWith('/export') && req.method === 'GET') {
    const f = driveItems.find((x) => x.id === decodeURIComponent(p.slice('/drive/files/'.length, -'/export'.length)))
    if (!f || !f.gdoc) return send(res, 404, { error: { message: 'File not found' } })
    res.writeHead(200, { 'Content-Type': 'application/pdf' }); res.end(Buffer.concat([Buffer.from('%PDF-1.4\n% made from an email\n'), Buffer.from(crypto.createHash('sha256').update(f.content).digest('hex'))])); return
  }
  if (p.startsWith('/drive/files/') && req.method === 'DELETE') {
    const i = driveItems.findIndex((x) => x.id === decodeURIComponent(p.slice('/drive/files/'.length)))
    if (i < 0) return send(res, 404, { error: { message: 'File not found' } })
    log.drive.push(`delete:${driveItems[i].name}`); driveItems.splice(i, 1); res.writeHead(204); res.end(); return
  }
  if (p.startsWith('/drive/files/') && req.method === 'GET') {
    if (!String(auth).startsWith('Bearer ')) return send(res, 401, {})
    const f = driveItems.find((x) => x.id === decodeURIComponent(p.slice('/drive/files/'.length)))
    if (f && url.searchParams.get('alt') === 'media') { res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); res.end(f.content || Buffer.alloc(0)); return }
    return f ? send(res, 200, dfile(f)) : send(res, 404, { error: { message: 'File not found' } })
  }
  if (p.startsWith('/drive/files/') && req.method === 'PATCH') {
    const f = driveItems.find((x) => x.id === decodeURIComponent(p.slice('/drive/files/'.length)))
    if (!f) return send(res, 404, { error: { message: 'File not found' } })
    const b = JSON.parse(await readBody(req) || '{}')
    if (b.name) f.name = b.name
    if (b.trashed === true) { f.trashed = true; log.drive.push(`trash:${dpath(f.id)}`); return send(res, 200, dfile(f)) }
    const add = url.searchParams.get('addParents'); const rm = (url.searchParams.get('removeParents') || '').split(',').filter(Boolean)
    if (add) { if (!driveItems.some((x) => x.id === add && x.folder)) return send(res, 404, { error: { message: 'File not found: parent' } }); f.parents = [add, ...f.parents.filter((x) => !rm.includes(x) && x !== add)] }
    else if (rm.length) f.parents = f.parents.filter((x) => !rm.includes(x))
    log.drive.push(`patch:${dpath(f.id)}`)
    return send(res, 200, dfile(f))
  }
  if (p === '/drive/files' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req))
    const par = b.parents?.[0] || 'root'
    if (par !== 'root' && !driveItems.some((x) => x.id === par && x.folder && !x.trashed)) return send(res, 404, { error: { message: 'File not found: parent' } })
    const id = `fld${++driveSeq}`
    driveItems.push({ id, name: b.name, parents: [par], folder: true, appProperties: b.appProperties || {} }); return send(res, 200, { id })
  }
  // a resumable upload: the metadata opens a session, the bytes are PUT to it
  if (p === '/drive-upload/files' && url.searchParams.get('uploadType') === 'resumable') {
    const meta = JSON.parse(await readBody(req)); const sid = crypto.randomUUID(); driveSessions.set(sid, meta)
    res.writeHead(200, { Location: `http://127.0.0.1:${PORT}/drive-upload/session/${sid}` }); res.end(); return
  }
  if (p.startsWith('/drive-upload/session/') && req.method === 'PUT') {
    const meta = driveSessions.get(p.split('/').pop()); const content = await readRaw(req)
    if (!meta) return send(res, 404, { error: { message: 'session not found' } })
    // the same failures as a plain upload: 503, the rate limit, an answer that is lost, a file without md5
    if (driveFail.upload503 > 0) { driveFail.upload503--; return send(res, 503, { error: { message: 'Backend Error' } }) }
    if (driveFail.rate403 > 0) { driveFail.rate403--; return send(res, 403, { error: { code: 403, message: 'User rate limit exceeded.', errors: [{ reason: 'userRateLimitExceeded' }] } }) }
    if (!driveItems.some((x) => x.id === meta.parents?.[0] && x.folder && !x.trashed)) return send(res, 404, { error: { message: 'File not found: parent' } })
    const id = `file${++driveSeq}`
    driveItems.push({ id, name: meta.name, parents: [meta.parents?.[0]], folder: false, size: content.length, content, md5: crypto.createHash('md5').update(content).digest('hex'), nomd5: driveFail.nomd5 > 0 && !!driveFail.nomd5--, appProperties: meta.appProperties || {}, resumable: true })
    log.drive.push(`${dpath(meta.parents?.[0])}/${meta.name}`)
    if (driveFail.lose > 0) { driveFail.lose--; return send(res, 500, { error: { message: 'Internal Error' } }) }
    return send(res, 200, dfile(driveItems[driveItems.length - 1]))
  }
  if (p === '/drive-upload/files') {
    const raw = await readRaw(req); const ct = String(req.headers['content-type'] || ''); const boundary = (ct.match(/boundary=([^;]+)/) || [])[1]
    const sep = Buffer.from(`--${boundary}`); const partsAt = []; let at = raw.indexOf(sep)
    while (at >= 0) { partsAt.push(at); at = raw.indexOf(sep, at + sep.length) }
    const piece = (i) => { const chunk = raw.subarray(partsAt[i] + sep.length, partsAt[i + 1]); const h = chunk.indexOf('\r\n\r\n'); return chunk.subarray(h + 4, chunk.length - 2) }
    const meta = JSON.parse(piece(0).toString('utf8')); const content = piece(1)
    if (driveFail.upload503 > 0) { driveFail.upload503--; return send(res, 503, { error: { message: 'Backend Error' } }) }
    if (driveFail.rate403 > 0) { driveFail.rate403--; return send(res, 403, { error: { code: 403, message: 'User rate limit exceeded.', errors: [{ reason: 'userRateLimitExceeded' }] } }) }
    if (meta.mimeType === 'application/vnd.google-apps.document') { const gid = `gdoc${++driveSeq}`; driveItems.push({ id: gid, name: meta.name, parents: ['root'], folder: false, gdoc: true, size: content.length, content, md5: 'gdoc', appProperties: meta.appProperties || {} }); return send(res, 200, { id: gid }) }
    const par = meta.parents?.[0]
    if (!driveItems.some((x) => x.id === par && x.folder && !x.trashed)) return send(res, 404, { error: { message: 'File not found: parent' } })
    const id = `file${++driveSeq}`
    driveItems.push({ id, name: meta.name, parents: [par], folder: false, size: content.length, content, md5: crypto.createHash('md5').update(content).digest('hex'), nomd5: driveFail.nomd5 > 0 && !!driveFail.nomd5--, appProperties: meta.appProperties || {} })
    log.drive.push(`${dpath(par)}/${meta.name}`)
    if (driveFail.lose > 0) { driveFail.lose--; return send(res, 500, { error: { message: 'Internal Error' } }) }
    return send(res, 200, dfile(driveItems[driveItems.length - 1]))
  }
  // ---------- Dropbox ----------
  if (p === '/dropbox/authorize') { const back = new URL(url.searchParams.get('redirect_uri')); back.searchParams.set('code', 'dbx-code'); back.searchParams.set('state', url.searchParams.get('state')); res.writeHead(302, { Location: back.toString() }); res.end(); return }
  if (p === '/dropbox/api/oauth2/token') { const f = new URLSearchParams(await readBody(req)); if (f.get('client_secret') !== 'test-dropbox-secret') return send(res, 400, { error: 'invalid_client' }); if (f.get('grant_type') === 'refresh_token' && f.get('refresh_token') !== 'dbx-rt') return send(res, 400, { error: 'invalid_grant' }); return send(res, 200, { access_token: 'dbx-at', refresh_token: 'dbx-rt', expires_in: 14400 }) }
  if (p === '/dropbox/api/2/users/get_current_account') return send(res, auth === 'Bearer dbx-at' ? 200 : 401, { email: 'office@kurkoos.test' })
  if (p === '/dropbox/api/2/files/get_metadata') { const b = JSON.parse(await readBody(req)); const hit = log.dropbox.find((x) => x === b.path || `id:${log.dropbox.indexOf(x) + 1}` === b.path); return hit ? send(res, 200, { '.tag': 'file', name: hit.split('/').pop(), path_display: hit }) : send(res, 409, { error_summary: 'path/not_found/' }) }
  if (p === '/dropbox/content/2/files/upload') { if (auth !== 'Bearer dbx-at') return send(res, 401, {}); const arg = JSON.parse(req.headers['dropbox-api-arg']); await readBody(req); log.dropbox.push(arg.path); return send(res, 200, { id: `id:${log.dropbox.length}`, path_display: arg.path }) }
  // ---------- Green API (WhatsApp) ----------
  // Green API sendFileByUrl: downloads the file like the real service does, and records what arrived
  if (/^\/green\/waInstance[^/]+\/sendFileByUrl\//.test(p)) {
    const b = JSON.parse(await readBody(req))
    const f = await fetch(b.urlFile).catch(() => null)
    const buf = f && f.ok ? Buffer.from(await f.arrayBuffer()) : null
    log.waFiles.push({ to: b.chatId, fileName: b.fileName, caption: b.caption, bytes: buf ? buf.length : 0, sha: buf ? crypto.createHash('sha256').update(buf).digest('hex') : null })
    return send(res, buf ? 200 : 400, buf ? { idMessage: `file${log.waFiles.length}` } : { error: 'download failed' })
  }
  // the instance: its state and settings, as getStateInstance / getSettings / setSettings answer
  if (/^\/green\/waInstance[^/]+\/getStateInstance\//.test(p)) return send(res, 200, { stateInstance: log.greenState || 'authorized' })
  if (/^\/green\/waInstance[^/]+\/getSettings\//.test(p)) return send(res, 200, { wid: '972501234567@c.us', webhookUrl: '', webhookUrlToken: '', incomingWebhook: 'no', outgoingWebhook: 'no', ...(log.greenSettings || {}) })
  if (/^\/green\/waInstance[^/]+\/setSettings\//.test(p)) { log.greenSettings = { ...(log.greenSettings || {}), ...JSON.parse(await readBody(req)) }; return send(res, 200, { saveSettings: true }) }
  if (p === '/__green') { const u = new URL(req.url, 'http://x'); if (u.searchParams.has('state')) log.greenState = u.searchParams.get('state') || null; if (u.searchParams.has('webhook')) log.greenSettings = { ...(log.greenSettings || {}), webhookUrl: u.searchParams.get('webhook') }; if (u.searchParams.has('reset')) { log.greenSettings = null; log.greenState = null } return send(res, 200, { ok: true }) }
  if (/^\/green\/waInstance[^/]+\/sendMessage\//.test(p)) { const b = JSON.parse(await readBody(req)); log.wa.push({ to: b.chatId, message: b.message }); return send(res, 200, { idMessage: `out${log.wa.length}` }) }
  if (p.startsWith('/green/file/')) { const f = decodeURIComponent(p.slice('/green/file/'.length)); res.writeHead(200, { 'Content-Type': f.endsWith('.pdf') ? 'application/pdf' : 'image/png' }); res.end(fs.readFileSync(`${FIX}/${f}`)); return }
  // a webhook receiver: records every delivery; ?fail=N answers 500 to the first N deliveries
  if (p === '/hook') {
    const raw = await readBody(req)
    const key = url.search
    hookFails[key] = (hookFails[key] || 0) + 1
    const fail = Number(url.searchParams.get('fail') || 0) >= hookFails[key]
    log.hooks.push({ query: key, event: req.headers['x-kurkoos-event'], delivery: req.headers['x-kurkoos-delivery'], signature: req.headers['x-kurkoos-signature'], auth: req.headers.authorization || '', raw, status: fail ? 500 : 200 })
    return send(res, fail ? 500 : 200, { ok: !fail })
  }
  if (p === '/__log') return send(res, 200, log)
  if (p === '/__reset') { for (const k of Object.keys(failed)) delete failed[k]; nextAccount = null; log.emails = []; log.smtp = []; log.claudeCalls = 0; log.gmailCalls = 0; log.drive = []; log.dropbox = []; log.wa = []; log.gmailQueries = []; log.hooks = []; log.waFiles = []; log.verifyCalls = 0; log.claudeDims = []; for (const k of Object.keys(hookFails)) delete hookFails[k]; driveItems.length = 0; driveFail.upload503 = 0; driveFail.lose = 0; driveFail.rate403 = 0; driveFail.nomd5 = 0; driveSeq = 0; return send(res, 200, { ok: true }) }
  if (p === '/__next_account') { nextAccount = url.searchParams.get('email'); return send(res, 200, { nextAccount }) }
  send(res, 404, { error: 'fake: no route' })
})
server.listen(PORT, '127.0.0.1', () => console.log(`fakes on :${PORT}`))

// a minimal SMTP sink for GoTrue's invitation emails
net.createServer((sock) => {
  let data = false; let buf = ''
  sock.write('220 fake-smtp ready\r\n')
  sock.on('data', (chunk) => {
    for (const line of chunk.toString().split('\r\n')) {
      if (data) { if (line === '.') { data = false; log.smtp.push(buf.slice(0, 2000)); buf = ''; sock.write('250 queued\r\n') } else buf += `${line}\n`; continue }
      if (!line) continue
      const cmd = line.slice(0, 4).toUpperCase()
      if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-fake\r\n250 AUTH PLAIN LOGIN\r\n')
      else if (cmd === 'DATA') { data = true; sock.write('354 go\r\n') }
      else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end() }
      else if (cmd === 'AUTH') sock.write('235 ok\r\n')
      else sock.write('250 ok\r\n')
    }
  })
}).listen(2525, '127.0.0.1')
