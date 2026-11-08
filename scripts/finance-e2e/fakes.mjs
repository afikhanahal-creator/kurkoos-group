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
const log = { emails: [], smtp: [], claudeCalls: 0, gmailCalls: 0 }
const fixtures = () => JSON.parse(fs.readFileSync(`${FIX}/fixtures.json`, 'utf8'))
const failed = {}   // sha256 → how many times Claude already failed on it
let nextAccount = null

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}
const readBody = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c }); req.on('end', () => ok(d)) })

const b64u = (buf) => Buffer.from(buf).toString('base64url')

function gmailMessage(m) {
  const parts = []
  if (m.html) parts.push({ partId: '0', mimeType: 'text/html', filename: '', body: { size: m.html.length, data: b64u(m.html) } })
  if (m.text) parts.push({ partId: '1', mimeType: 'text/plain', filename: '', body: { size: m.text.length, data: b64u(m.text) } })
  for (const [i, f] of (m.files || []).entries()) {
    const size = fs.statSync(`${FIX}/${f}`).size
    parts.push({ partId: `a${i}`, mimeType: f.endsWith('.pdf') ? 'application/pdf' : 'image/png', filename: f, body: { size, attachmentId: `${m.id}__${i}` } })
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
      const msgs = box.messages.filter((m) => Date.parse(m.date) >= after).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      return send(res, 200, { messages: msgs.map((m) => ({ id: m.id, threadId: m.id })), resultSizeEstimate: msgs.length })
    }
    const mm = rest.match(/^messages\/([^/]+)(?:\/attachments\/(.+))?$/)
    if (mm) {
      const m = box.messages.find((x) => x.id === mm[1])
      if (!m) return send(res, 404, { error: { code: 404, message: 'Not Found' } })
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
    const content = body.messages[0].content
    const doc = content.find((c) => c.type === 'document' || c.type === 'image')
    const text = content.find((c) => c.type === 'text')?.text || ''
    const fx = fixtures()
    let answer = null
    if (doc) {
      const hash = crypto.createHash('sha256').update(Buffer.from(doc.source.data, 'base64')).digest('hex')
      const limit = fx.claudeFail?.[hash] || 0
      if ((failed[hash] || 0) < limit) { failed[hash] = (failed[hash] || 0) + 1; return send(res, 529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }) }
      answer = fx.answers[hash]
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
    log.emails.push({ to: body.to, subject: body.subject })
    return send(res, 200, { id: crypto.randomUUID() })
  }

  if (p === '/__log') return send(res, 200, log)
  if (p === '/__reset') { for (const k of Object.keys(failed)) delete failed[k]; nextAccount = null; log.emails = []; log.smtp = []; log.claudeCalls = 0; log.gmailCalls = 0; return send(res, 200, { ok: true }) }
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
