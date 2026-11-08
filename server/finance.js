// ============================================================
// Kurkoos Finance: the server side of the invoice system (/admin/finance).
//
//   POST /api/finance  { action: 'gmail-auth-url', business_id? }  → { url }  (Google consent screen)
//   GET  /api/finance-oauth?code&state                               ← Google sends the admin back here
//   POST /api/finance  { action: 'sync', mailbox_id? }              → scans the mailbox(es) for invoices
//   POST /api/finance  { action: 'extract', document_id }           → Claude reads one uploaded file
//   POST /api/finance  { action: 'disconnect', mailbox_id }         → revokes the Google token
//   GET  /api/finance?action=cron                                   ← Vercel cron, once a day
//
// Environment (Vercel > Settings > Environment Variables, never in code):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   database + the private finance-docs bucket
//   ANTHROPIC_API_KEY                         reading the invoices
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET    the Gmail connection (OAuth client of type "Web application",
//                                             redirect URI: https://<site>/api/finance-oauth)
//   CRON_SECRET                               Vercel sends it to the daily cron
//   optional: FINANCE_MODEL, FINANCE_EFFORT, FINANCE_STATE_SECRET, SITE_URL
//
// The free Supabase plan has 1 GB of files for the whole organization (CLAUDE.md): before any upload
// we read public.storage_usage() and stop at 75%.
// ============================================================
import crypto from 'node:crypto'

const SB_URL = () => String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = 'finance-docs'
const QUOTA_BYTES = 1024 ** 3
const QUOTA_STOP = 0.75
const MAX_FILE = 12 * 1024 * 1024
const TIME_BUDGET_MS = 45_000          // the function has 60s; leave room to answer
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const MODEL = () => process.env.FINANCE_MODEL || 'claude-opus-5-5'
// low effort keeps one document at a few seconds inside the 60s function; raise it if mistakes show
const EFFORT = () => process.env.FINANCE_EFFORT || 'low'

const DOC_TYPES = ['invoice', 'receipt', 'invoice_receipt', 'credit', 'proforma', 'quote', 'other']
const MIME_OK = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// ---------- supabase (service role) ----------
async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(`${SB_URL()}/rest/v1/${path}`, {
    method,
    headers: { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!r.ok) { const e = new Error((data && data.message) || `supabase ${r.status}`); e.status = r.status; e.code = data && data.code; throw e }
  return data
}
const one = async (path) => (await sb(path))?.[0] || null

async function storageUsage() {
  const r = await fetch(`${SB_URL()}/rest/v1/rpc/storage_usage`, { method: 'POST', headers: { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}`, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json().catch(() => null)
  return u && typeof u.storage_bytes === 'number' ? u.storage_bytes / QUOTA_BYTES : null
}

async function upload(path, buf, mime) {
  const r = await fetch(`${SB_URL()}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}`, 'Content-Type': mime, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
    body: buf,
  })
  if (!r.ok) throw new Error(`storage upload ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

async function download(path) {
  const r = await fetch(`${SB_URL()}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}` } })
  if (!r.ok) throw new Error(`storage download ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

async function adminUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || !SB_URL() || !SB_KEY()) return null
  const r = await fetch(`${SB_URL()}/auth/v1/user`, { headers: { apikey: SB_KEY(), Authorization: `Bearer ${token}` } }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json().catch(() => null)
  return u && u.id ? u : null
}

// ---------- signed OAuth state (so the callback knows which admin asked, and nobody can forge it) ----------
const STATE_KEY = () => process.env.FINANCE_STATE_SECRET || SB_KEY()
const b64u = (s) => Buffer.from(s).toString('base64url')
function signState(obj) {
  const p = b64u(JSON.stringify(obj))
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

const siteOrigin = (req) => String(process.env.SITE_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '')
const redirectUri = (req) => `${siteOrigin(req)}/api/finance-oauth`

// ---------- Google ----------
async function googleToken(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...params }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(d.error_description || d.error || `google token ${r.status}`); e.google = d.error; throw e }
  return d
}

async function accessTokenFor(mailboxId) {
  const s = await one(`fin_mailbox_secrets?mailbox_id=eq.${mailboxId}&select=*`)
  if (!s) throw new Error('החיבור לתיבה חסר. חברו אותה מחדש')
  if (s.access_token && s.expires_at && new Date(s.expires_at).getTime() - Date.now() > 60_000) return s.access_token
  const t = await googleToken({ grant_type: 'refresh_token', refresh_token: s.refresh_token })
  await sb(`fin_mailbox_secrets?mailbox_id=eq.${mailboxId}`, { method: 'PATCH', body: { access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() } })
  return t.access_token
}

async function gmail(token, path) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) { const e = new Error(`gmail ${r.status}`); e.status = r.status; throw e }
  return r.json()
}

// the words an invoice email usually carries, in Hebrew and English
const BASE_QUERY = '(subject:(חשבונית OR קבלה OR "חשבון עסקה" OR invoice OR receipt OR "tax invoice" OR billing OR payment) OR filename:(חשבונית OR קבלה OR invoice OR receipt)) -in:sent -in:chats -in:drafts'

function walkParts(part, out = []) {
  if (!part) return out
  if (part.filename && part.body && (part.body.attachmentId || part.body.data)) out.push(part)
  for (const p of part.parts || []) walkParts(p, out)
  return out
}
function bodyOf(part, mime) {
  if (!part) return ''
  if (part.mimeType === mime && part.body?.data && !part.filename) return Buffer.from(part.body.data, 'base64url').toString('utf8')
  for (const p of part.parts || []) { const t = bodyOf(p, mime); if (t) return t }
  return ''
}
const header = (msg, name) => (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name)?.value || ''
const mimeFromName = (name, given) => {
  if (MIME_OK.has(given)) return given
  const ext = String(name).toLowerCase().split('.').pop()
  return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || given
}

// ---------- Claude reads the document ----------
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_financial_document', 'doc_type', 'supplier_name', 'supplier_vat_id', 'customer_name', 'customer_vat_id', 'doc_number', 'issue_date', 'due_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'description', 'category', 'payment_method', 'confidence'],
  properties: {
    is_financial_document: { type: 'boolean', description: 'true only for an invoice, receipt, credit note, proforma or quote addressed to the customer' },
    doc_type: { type: 'string', enum: DOC_TYPES },
    supplier_name: { type: 'string', description: 'the business that issued the document, as printed' },
    supplier_vat_id: { type: 'string', description: 'issuer ח.פ / ע.מ / VAT number, digits only, empty if missing' },
    customer_name: { type: 'string' },
    customer_vat_id: { type: 'string', description: 'digits only, empty if missing' },
    doc_number: { type: 'string' },
    issue_date: { type: 'string', description: 'YYYY-MM-DD, empty if missing' },
    due_date: { type: 'string', description: 'YYYY-MM-DD, empty if missing' },
    currency: { type: 'string', description: 'ISO 4217, ILS for ₪' },
    amount_before_vat: { type: ['number', 'null'] },
    vat_amount: { type: ['number', 'null'] },
    total_amount: { type: ['number', 'null'], description: 'the amount to pay, VAT included' },
    description: { type: 'string', description: 'one short Hebrew line: what was bought' },
    category: { type: 'string' },
    payment_method: { type: 'string', description: 'אשראי / העברה בנקאית / מזומן / צ׳ק / הוראת קבע, empty if unknown' },
    confidence: { type: 'number', description: '0 to 1: how sure you are of the amounts, date and supplier' },
  },
}

async function extract({ buf, mime, text, categories, hint }) {
  const KEY = process.env.ANTHROPIC_API_KEY
  if (!KEY) throw new Error('ANTHROPIC_API_KEY לא הוגדר ב-Vercel')
  const content = []
  if (buf && mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } })
  else if (buf) content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } })
  const prompt = [
    'This is a document (or an email) received by an Israeli company of the Kurkoos group (construction, real estate development, supervision, brokerage).',
    'Read it and fill the fields. Israeli VAT is 18% since 2025. Amounts are numbers without currency signs or thousands separators.',
    'A חשבונית מס is invoice, קבלה is receipt, חשבונית מס/קבלה is invoice_receipt, חשבונית זיכוי is credit, חשבון עסקה is proforma, הצעת מחיר is quote.',
    'If it is a marketing email, a newsletter, an order confirmation without amounts or anything that is not a financial document, set is_financial_document to false.',
    `category: pick the closest one of: ${categories.join(' | ')}.`,
    hint ? `Context: ${hint}` : '',
    text ? `\n--- email ---\n${text.slice(0, 40_000)}` : '',
  ].filter(Boolean).join('\n')
  content.push({ type: 'text', text: prompt })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({
      model: MODEL(),
      max_tokens: 4000,
      fallbacks: 'default',
      output_config: { effort: EFFORT(), format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d.error && d.error.message) || `claude ${r.status}`)
  if (d.stop_reason === 'refusal') throw new Error('Claude declined to read this document')
  const out = (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
  return JSON.parse(out)
}

const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : null)
const digits = (s) => String(s || '').replace(/\D/g, '') || null
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null)

// turns Claude's answer into document fields, links the supplier and the company, flags duplicates
async function applyExtraction(x, { mailbox, fallbackCategory }) {
  const vat = digits(x.supplier_vat_id)
  const custVat = digits(x.customer_vat_id)
  let supplier = null
  if (vat) supplier = await one(`fin_suppliers?vat_id=eq.${vat}&select=*`)
  if (!supplier && x.supplier_name) supplier = await one(`fin_suppliers?name=ilike.${encodeURIComponent(x.supplier_name.replace(/[%*,()]/g, ''))}&select=*`)
  if (!supplier && x.supplier_name) {
    const domain = mailbox?.fromDomain || null
    supplier = (await sb('fin_suppliers', { method: 'POST', body: { name: x.supplier_name.slice(0, 200), vat_id: vat, email_domain: domain, default_category: x.category || null } }).catch(() => null))?.[0] || null
  }
  let business = null
  if (custVat) business = await one(`fin_businesses?vat_id=eq.${custVat}&select=id`)
  const docNumber = String(x.doc_number || '').trim() || null
  let status = 'review'
  if (docNumber && vat) {
    const dup = await one(`fin_documents?supplier_vat_id=eq.${vat}&doc_number=eq.${encodeURIComponent(docNumber)}&select=id`)
    if (dup) status = 'duplicate'
  }
  return {
    supplier_id: supplier?.id || null,
    supplier_name: x.supplier_name || null,
    supplier_vat_id: vat,
    business_id: business?.id || mailbox?.business_id || null,
    doc_type: DOC_TYPES.includes(x.doc_type) ? x.doc_type : 'other',
    doc_number: docNumber,
    issue_date: isoDate(x.issue_date),
    due_date: isoDate(x.due_date),
    currency: /^[A-Z]{3}$/.test(x.currency || '') ? x.currency : 'ILS',
    amount_before_vat: num(x.amount_before_vat),
    vat_amount: num(x.vat_amount),
    total_amount: num(x.total_amount),
    description: x.description || null,
    category: supplier?.default_category || x.category || fallbackCategory || null,
    payment_method: x.payment_method || null,
    confidence: num(x.confidence),
    extraction: x,
    status,
  }
}

const categoryNames = async () => ((await sb('fin_categories?select=name&order=sort')) || []).map((c) => c.name)

// ---------- one mailbox ----------
async function syncMailbox(mb, started) {
  const run = (await sb('fin_sync_runs', { method: 'POST', body: { mailbox_id: mb.id } }))[0]
  const stats = { scanned: 0, imported: 0, skipped: 0 }
  let complete = true
  let error = null
  try {
    const token = await accessTokenFor(mb.id)
    const since = mb.last_sync_at ? new Date(new Date(mb.last_sync_at).getTime() - 2 * 86400_000) : new Date(Date.now() - 90 * 86400_000)
    const q = `${BASE_QUERY} after:${Math.floor(since.getTime() / 1000)}${mb.query ? ` ${mb.query}` : ''}`
    const ids = []
    let pageToken = ''
    do {
      const list = await gmail(token, `messages?maxResults=100&q=${encodeURIComponent(q)}${pageToken ? `&pageToken=${pageToken}` : ''}`)
      for (const m of list.messages || []) ids.push(m.id)
      pageToken = list.nextPageToken || ''
    } while (pageToken && ids.length < 500)

    const seenRows = ids.length ? await sb(`fin_mail_seen?mailbox_id=eq.${mb.id}&select=message_id&message_id=in.(${ids.join(',')})`) : []
    const seen = new Set((seenRows || []).map((r) => r.message_id))
    const todo = ids.filter((id) => !seen.has(id)).reverse()   // oldest first, so an interrupted run resumes in order
    const categories = await categoryNames()

    for (const id of todo) {
      if (Date.now() - started > TIME_BUDGET_MS) { complete = false; break }
      const usage = await storageUsage()
      if (usage !== null && usage >= QUOTA_STOP) { complete = false; error = `האחסון ב-Supabase מלא ב-${Math.round(usage * 100)}%. הייבוא נעצר כדי לא לחסום את האתר`; break }
      stats.scanned++
      const msg = await gmail(token, `messages/${id}?format=full`)
      const meta = {
        email_message_id: id,
        email_subject: header(msg, 'subject').slice(0, 300),
        email_from: header(msg, 'from').slice(0, 300),
        email_date: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
      }
      const fromDomain = (meta.email_from.match(/@([\w.-]+)/) || [])[1] || null
      const files = walkParts(msg.payload).filter((p) => MIME_OK.has(mimeFromName(p.filename, p.mimeType)) && (p.body.size || 0) <= MAX_FILE)
      let got = 0

      for (const part of files.slice(0, 5)) {
        const mime = mimeFromName(part.filename, part.mimeType)
        // tiny images are logos and signatures, not invoices
        if (mime.startsWith('image/') && (part.body.size || 0) < 15_000) continue
        const data = part.body.attachmentId ? (await gmail(token, `messages/${id}/attachments/${part.body.attachmentId}`)).data : part.body.data
        const buf = Buffer.from(data, 'base64url')
        const hash = crypto.createHash('sha256').update(buf).digest('hex')
        if (await one(`fin_documents?file_hash=eq.${hash}&select=id`)) { stats.skipped++; continue }
        const x = await extract({ buf, mime, categories, hint: `email from ${meta.email_from}, subject "${meta.email_subject}", file ${part.filename}` }).catch((e) => ({ _error: e.message }))
        if (x._error || !x.is_financial_document) continue
        const path = `gmail/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${mime === 'application/pdf' ? 'pdf' : mime.split('/')[1]}`
        await upload(path, buf, mime)
        const fields = await applyExtraction(x, { mailbox: { ...mb, fromDomain } })
        await sb('fin_documents', { method: 'POST', body: { ...meta, ...fields, source: 'gmail', mailbox_id: mb.id, file_path: path, file_name: part.filename.slice(0, 200), file_mime: mime, file_size: buf.length, file_hash: hash } })
          .then(() => { stats.imported++; got++ })
          .catch((e) => { if (e.code === '23505') stats.skipped++; else throw e })
      }

      // a receipt written in the email itself (no attachment): keep the email as the document
      if (!got && !files.length) {
        const html = bodyOf(msg.payload, 'text/html')
        const plain = bodyOf(msg.payload, 'text/plain') || html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
        if (plain.length > 80) {
          const x = await extract({ text: `From: ${meta.email_from}\nSubject: ${meta.email_subject}\n\n${plain}`, categories }).catch(() => null)
          if (x && x.is_financial_document && x.total_amount) {
            const buf = Buffer.from(html || `<pre>${plain.replace(/</g, '&lt;')}</pre>`, 'utf8')
            const hash = crypto.createHash('sha256').update(buf).digest('hex')
            if (!(await one(`fin_documents?file_hash=eq.${hash}&select=id`))) {
              const path = `gmail/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.html`
              await upload(path, buf, 'text/html; charset=utf-8')
              const fields = await applyExtraction(x, { mailbox: { ...mb, fromDomain } })
              await sb('fin_documents', { method: 'POST', body: { ...meta, ...fields, source: 'gmail', mailbox_id: mb.id, file_path: path, file_name: `${meta.email_subject || 'email'}.html`.slice(0, 200), file_mime: 'text/html', file_size: buf.length, file_hash: hash } })
                .then(() => { stats.imported++ }).catch((e) => { if (e.code !== '23505') throw e })
            }
          }
        }
      }
      await sb('fin_mail_seen', { method: 'POST', body: { mailbox_id: mb.id, message_id: id }, headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } })
    }
  } catch (e) {
    complete = false
    error = e.google === 'invalid_grant' ? 'Google ביטל את ההרשאה. חברו את התיבה מחדש' : String(e.message || e)
  }
  const patch = { last_error: error, status: error && /הרשאה|חסר/.test(error) ? 'error' : 'active', docs_found: (mb.docs_found || 0) + stats.imported }
  if (complete) patch.last_sync_at = new Date(started).toISOString()
  await sb(`fin_mailboxes?id=eq.${mb.id}`, { method: 'PATCH', body: patch }).catch(() => {})
  await sb(`fin_sync_runs?id=eq.${run.id}`, { method: 'PATCH', body: { ...stats, finished_at: new Date().toISOString(), error } }).catch(() => {})
  return { mailbox: mb.email, ...stats, complete, error }
}

async function syncAll(mailboxId) {
  const started = Date.now()
  const boxes = await sb(`fin_mailboxes?status=in.(active,error)&provider=eq.gmail${mailboxId ? `&id=eq.${mailboxId}` : ''}&select=*&order=last_sync_at.asc.nullsfirst`)
  const results = []
  for (const mb of boxes || []) {
    if (Date.now() - started > TIME_BUDGET_MS) { results.push({ mailbox: mb.email, complete: false, error: 'ימשיך בסריקה הבאה' }); continue }
    results.push(await syncMailbox(mb, started))
  }
  return results
}

// ---------- handler ----------
const readBody = (req) => {
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
  return b || {}
}
const redirect = (res, url) => { res.statusCode = 302; res.setHeader('Location', url); res.end() }

export default async function handler(req, res) {
  if (!SB_URL() || !SB_KEY()) { res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY לא הוגדר ב-Vercel' }); return }
  const url = new URL(req.url, 'http://x')

  // Google sends the admin back here after the consent screen
  if (url.pathname.endsWith('/finance-oauth')) {
    const back = (q) => redirect(res, `${siteOrigin(req)}/admin/finance/mailboxes?${q}`)
    const st = readState(url.searchParams.get('state'))
    if (!st) return back('error=state')
    if (url.searchParams.get('error')) return back(`error=${encodeURIComponent(url.searchParams.get('error'))}`)
    try {
      const t = await googleToken({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: redirectUri(req) })
      const profile = await gmail(t.access_token, 'profile')
      const email = String(profile.emailAddress || '').toLowerCase()
      let mb = await one(`fin_mailboxes?provider=eq.gmail&email=eq.${encodeURIComponent(email)}&select=*`)
      if (!mb) mb = (await sb('fin_mailboxes', { method: 'POST', body: { provider: 'gmail', email, business_id: st.b || null, connected_by: st.u } }))[0]
      else await sb(`fin_mailboxes?id=eq.${mb.id}`, { method: 'PATCH', body: { status: 'active', last_error: null } })
      const existing = await one(`fin_mailbox_secrets?mailbox_id=eq.${mb.id}&select=refresh_token`)
      const refresh = t.refresh_token || existing?.refresh_token
      if (!refresh) return back('error=no_refresh')
      await sb('fin_mailbox_secrets', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { mailbox_id: mb.id, refresh_token: refresh, access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() } })
      return back(`connected=${encodeURIComponent(email)}`)
    } catch (e) {
      return back(`error=${encodeURIComponent(String(e.message || e).slice(0, 120))}`)
    }
  }

  // the daily Vercel cron
  if (req.method === 'GET' && url.searchParams.get('action') === 'cron') {
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.status(401).json({ error: 'unauthorized' }); return }
    try { res.status(200).json({ results: await syncAll() }) } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
    return
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין' }); return }
  const body = readBody(req)

  try {
    switch (body.action) {
      case 'gmail-auth-url': {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) { res.status(503).json({ error: 'חיבור Gmail עוד לא הוגדר: חסרים GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET ב-Vercel' }); return }
        const q = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          redirect_uri: redirectUri(req),
          response_type: 'code',
          scope: `${GMAIL_SCOPE} openid email`,
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
          state: signState({ u: user.id, b: body.business_id || null, t: Date.now() }),
        })
        res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${q}` })
        return
      }
      case 'sync': {
        res.status(200).json({ results: await syncAll(body.mailbox_id) })
        return
      }
      case 'extract': {
        const doc = await one(`fin_documents?id=eq.${encodeURIComponent(body.document_id)}&select=*`)
        if (!doc || !doc.file_path) { res.status(404).json({ error: 'המסמך לא נמצא' }); return }
        const buf = await download(doc.file_path)
        const mime = doc.file_mime || 'application/pdf'
        const isText = mime.startsWith('text/')
        if (!isText && !MIME_OK.has(mime)) { res.status(400).json({ error: 'סוג קובץ שלא נתמך. PDF או תמונה' }); return }
        let fields
        try {
          const x = await extract(isText ? { text: buf.toString('utf8').replace(/<[^>]+>/g, ' '), categories: await categoryNames() } : { buf, mime, categories: await categoryNames(), hint: `uploaded file ${doc.file_name || ''}` })
          fields = await applyExtraction(x, { mailbox: doc.business_id ? { business_id: doc.business_id } : null })
          if (doc.business_id) fields.business_id = doc.business_id
          if (!x.is_financial_document) fields.notes = [doc.notes, 'Claude: לא נראה כמו חשבונית או קבלה'].filter(Boolean).join('\n')
        } catch (e) {
          fields = { status: 'failed', notes: `הקריאה האוטומטית נכשלה: ${String(e.message || e).slice(0, 200)}` }
        }
        const updated = await sb(`fin_documents?id=eq.${doc.id}`, { method: 'PATCH', body: fields })
        res.status(200).json({ document: updated?.[0] || null })
        return
      }
      case 'disconnect': {
        const s = await one(`fin_mailbox_secrets?mailbox_id=eq.${encodeURIComponent(body.mailbox_id)}&select=refresh_token`)
        if (s) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(s.refresh_token)}`, { method: 'POST' }).catch(() => {})
        await sb(`fin_mailbox_secrets?mailbox_id=eq.${encodeURIComponent(body.mailbox_id)}`, { method: 'DELETE' })
        await sb(`fin_mailboxes?id=eq.${encodeURIComponent(body.mailbox_id)}`, { method: 'PATCH', body: { status: 'revoked' } })
        res.status(200).json({ ok: true })
        return
      }
      default:
        res.status(400).json({ error: 'unknown action' })
    }
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
