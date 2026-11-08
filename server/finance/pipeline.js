// The agents' pipeline. One email or one uploaded file goes through:
//   collector (download, fingerprint, de-duplicate) → ocr (Claude reads it) → validation (rules)
//   → classification (company, project, category) → the document waits in review for a person.
import crypto from 'node:crypto'
import { MIME_OK, MAX_FILE, QUOTA_STOP, TIME_BUDGET_MS, DOC_TYPES } from './env.js'
import { sb, one, insert, patch, q, upload, download, storageUsage } from './db.js'
import { extract } from './extract.js'
import { validate, minConfidence } from './validate.js'
import { assign } from './assign.js'
import * as gmail from './providers/gmail.js'
import * as outlook from './providers/outlook.js'

export const PROVIDERS = { gmail, outlook }
const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : null)
const digits = (s) => String(s || '').replace(/\D/g, '') || null
const money = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null)
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const extOf = (mime) => (mime === 'application/pdf' ? 'pdf' : mime.startsWith('text/') ? 'html' : mime.split('/')[1])
export const mimeOf = (name, given) => {
  if (MIME_OK.has(given)) return given
  return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[String(name).toLowerCase().split('.').pop()] || given
}

let catCache = null
const categories = async () => (catCache ||= ((await sb('fin_categories?select=name&order=sort')) || []).map((c) => c.name))
const automation = async (key) => one(`fin_automations?key=eq.${key}&select=*`)

async function findOrCreateSupplier(name, vat, domain) {
  let s = null
  if (vat) s = await one(`fin_suppliers?vat_id=eq.${vat}&select=*`)
  if (!s && name) s = await one(`fin_suppliers?name=ilike.${q(name.replace(/[%*,()]/g, ''))}&select=*`)
  if (!s && name) s = await insert('fin_suppliers', { name: name.slice(0, 200), vat_id: vat, email_domain: domain }).catch(() => null)
  return s
}

/* Claude's answer → document fields, issues and suggestions. Never approves. */
export async function analyze(x, { selfId = null, mailbox = null, fromEmail = '', subject = '', text = '' } = {}, runs) {
  const vat = digits(x.supplier_vat_id)
  const domain = (String(fromEmail).match(/@([\w.-]+)/) || [])[1] || null
  const fields = {
    supplier_name: x.supplier_name || null,
    supplier_vat_id: vat,
    doc_type: DOC_TYPES.includes(x.doc_type) ? x.doc_type : 'other',
    doc_number: String(x.doc_number || '').trim() || null,
    issue_date: isoDate(x.issue_date),
    due_date: isoDate(x.due_date),
    payment_date: isoDate(x.payment_date),
    currency: /^[A-Z]{3}$/.test(x.currency || '') ? x.currency : 'ILS',
    amount_before_vat: money(x.amount_before_vat),
    vat_amount: money(x.vat_amount),
    total_amount: money(x.total_amount),
    description: x.description || null,
    payment_method: x.payment_method || null,
    field_confidence: x.field_confidence || null,
    confidence: minConfidence(x.field_confidence),
    extraction: x,
    email_subject: subject || undefined,
  }
  const supplier = await findOrCreateSupplier(fields.supplier_name, vat, domain)
  fields.supplier_id = supplier?.id || null

  // classification
  const cls = await assign({ fields, x, mailbox, fromEmail, text, supplier })
  if (runs) runs.classification.stat.processed++
  for (const k of ['business_id', 'project_id', 'category']) if (cls[k]) fields[k] = cls[k]
  fields.suggestions = cls.suggestions

  // validation
  const not = selfId ? `&id=neq.${selfId}` : ''
  const dupCheck = await automation('duplicate_check')
  let duplicateOf = null; let possibleDuplicate = false
  if (dupCheck?.enabled !== false) {
    if (fields.doc_number && vat) duplicateOf = (await one(`fin_documents?supplier_vat_id=eq.${vat}&doc_number=eq.${q(fields.doc_number)}&status=neq.rejected${not}&select=id`))?.id || null
    if (!duplicateOf && fields.supplier_id && fields.issue_date && fields.total_amount !== null) {
      possibleDuplicate = !!(await one(`fin_documents?supplier_id=eq.${fields.supplier_id}&issue_date=eq.${fields.issue_date}&total_amount=eq.${fields.total_amount}&status=neq.rejected${not}&select=id`))
    }
  }
  const flag = await automation('amount_flag')
  const rules = (await sb('fin_rules?enabled=eq.true&kind=eq.amount_flag&select=match')) || []
  const thresholds = [flag?.enabled !== false ? Number(flag?.config?.min_amount) : null, ...rules.map((r) => Number(r.match?.min_amount))].filter((v) => v > 0)
  let supplierMedian = null
  if (fields.supplier_id) {
    const past = ((await sb(`fin_documents?supplier_id=eq.${fields.supplier_id}&status=in.(approved,sent)&select=total_amount&limit=30`)) || []).map((d) => Number(d.total_amount)).filter((v) => v > 0).sort((a, b) => a - b)
    if (past.length >= 3) supplierMedian = past[Math.floor(past.length / 2)]
  }
  fields.issues = validate(fields, { duplicateOf, possibleDuplicate, flagAmount: thresholds.length ? Math.min(...thresholds) : null, supplierMedian, extractionNotes: x.notes })
  if (!x.is_financial_document) fields.issues.unshift({ level: 'warn', code: 'not_financial', field: null, message: 'Claude: לא נראה כמו מסמך כספי' })
  if (runs) { runs.validation.stat.processed++; if (fields.issues.some((i) => i.level === 'error')) runs.validation.stat.details.flagged = (runs.validation.stat.details.flagged || 0) + 1 }

  fields.status = duplicateOf ? 'duplicate' : 'review'
  fields.processed_at = new Date().toISOString()
  if (fields.email_subject === undefined) delete fields.email_subject
  return fields
}

/* after a person edits a document: run the validation rules again on the stored fields (no AI) */
export async function revalidate(doc) {
  const not = `&id=neq.${doc.id}`
  let duplicateOf = null; let possibleDuplicate = false
  if (doc.doc_number && doc.supplier_vat_id) duplicateOf = (await one(`fin_documents?supplier_vat_id=eq.${doc.supplier_vat_id}&doc_number=eq.${q(doc.doc_number)}&status=neq.rejected${not}&select=id`))?.id || null
  if (!duplicateOf && doc.supplier_id && doc.issue_date && doc.total_amount !== null) possibleDuplicate = !!(await one(`fin_documents?supplier_id=eq.${doc.supplier_id}&issue_date=eq.${doc.issue_date}&total_amount=eq.${doc.total_amount}&status=neq.rejected${not}&select=id`))
  const flag = await automation('amount_flag')
  // a value a person typed is no longer "unsure": drop the AI confidence of fields that changed
  const fc = { ...(doc.field_confidence || {}) }
  for (const k of Object.keys(fc)) if (doc.extraction && String(doc.extraction[k] ?? '') !== String(doc[k] ?? '') && !(Number(doc.extraction[k]) === Number(doc[k]) && doc[k] !== null)) fc[k] = 1
  const issues = validate({ ...doc, field_confidence: fc }, { duplicateOf, possibleDuplicate, flagAmount: flag?.enabled !== false ? Number(flag?.config?.min_amount) || null : null })
  return patch(`fin_documents?id=eq.${doc.id}`, { issues, field_confidence: fc, confidence: minConfidence(fc) })
}

/* re-read a stored document (an upload, or a retry of a failed one). Approved ones are left alone. */
export async function processStored(doc, runs, trigger = 'upload') {
  if (['approved', 'sent'].includes(doc.status)) return { skipped: 'approved' }
  try {
    const buf = await download(doc.file_path)
    const mime = doc.file_mime || 'application/pdf'
    const isText = mime.startsWith('text/')
    const x = await extract(isText ? { text: buf.toString('utf8').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '), categories: await categories() } : { buf, mime, categories: await categories(), hint: `${trigger} file ${doc.file_name || ''}` })
    runs.ocr.stat.processed++
    const mb = doc.mailbox_id ? await one(`fin_mailboxes?id=eq.${doc.mailbox_id}&select=*`) : null
    const fields = await analyze(x, { selfId: doc.id, mailbox: mb, fromEmail: doc.email_from || '' }, runs)
    if (doc.business_id) fields.business_id = doc.business_id      // a company chosen at upload wins
    fields.attempts = (doc.attempts || 0) + 1
    return await patch(`fin_documents?id=eq.${doc.id}`, fields)
  } catch (e) {
    runs.ocr.stat.errors++
    const attempts = (doc.attempts || 0) + 1
    return await patch(`fin_documents?id=eq.${doc.id}`, { status: 'failed', attempts, issues: [{ level: 'error', code: 'ocr_failed', field: null, message: `הקריאה נכשלה (ניסיון ${attempts}): ${String(e.message || e).slice(0, 200)}` }] })
  }
}

async function accessTokenFor(mb) {
  const s = await one(`fin_mailbox_secrets?mailbox_id=eq.${mb.id}&select=*`)
  if (!s) { const e = new Error('החיבור לתיבה חסר. חברו אותה מחדש'); e.auth = true; throw e }
  if (s.access_token && s.expires_at && new Date(s.expires_at).getTime() - Date.now() > 60_000) return s.access_token
  try {
    const t = await PROVIDERS[mb.provider].refresh(s.refresh_token)
    await patch(`fin_mailbox_secrets?mailbox_id=eq.${mb.id}`, { access_token: t.access_token, refresh_token: t.refresh_token || s.refresh_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() })
    return t.access_token
  } catch (e) {
    if (e.code === 'invalid_grant' || e.status === 400 || e.status === 401) { const err = new Error('ההרשאה בוטלה או פגה. חברו את התיבה מחדש'); err.auth = true; throw err }
    throw e
  }
}

/* one mailbox: scanner finds candidates, collector downloads, the rest of the pipeline reads them */
export async function syncMailbox(mb, started, runs, trigger) {
  const prov = PROVIDERS[mb.provider]
  const lastRuns = (await sb(`fin_sync_runs?mailbox_id=eq.${mb.id}&select=error&order=started_at.desc&limit=5`)) || []
  let attempt = 1
  for (const r of lastRuns) { if (r.error) attempt++; else break }
  const run = await insert('fin_sync_runs', { mailbox_id: mb.id, trigger, attempt })
  const stats = { scanned: 0, imported: 0, skipped: 0 }
  let complete = true; let error = null; let authError = false
  const scanStart = new Date().toISOString()
  try {
    if (!prov) throw new Error(`ספק לא נתמך: ${mb.provider}`)
    const token = await accessTokenFor(mb)
    const since = mb.last_sync_at ? new Date(new Date(mb.last_sync_at).getTime() - 2 * 86400_000) : new Date(Date.now() - (mb.days_back || 90) * 86400_000)
    const ids = await prov.listCandidates(token, since, mb.query)
    runs.scanner.stat.processed += ids.length
    const seenRows = ids.length ? await sb(`fin_mail_seen?mailbox_id=eq.${mb.id}&select=message_id&message_id=in.(${ids.map((i) => `"${i}"`).join(',')})`) : []
    const seen = new Set((seenRows || []).map((r) => r.message_id))
    const todo = ids.filter((id) => !seen.has(id)).reverse()       // oldest first
    runs.scanner.stat.details.new_messages = (runs.scanner.stat.details.new_messages || 0) + todo.length

    for (const id of todo) {
      if (Date.now() - started > TIME_BUDGET_MS) { complete = false; break }
      const usage = await storageUsage()
      if (usage !== null && usage >= QUOTA_STOP) { complete = false; error = `האחסון ב-Supabase מלא ב-${Math.round(usage * 100)}%. הייבוא נעצר כדי לא לחסום את האתר`; break }
      stats.scanned++
      const msg = await prov.getMessage(token, id)
      const meta = { email_message_id: id, email_subject: (msg.subject || '').slice(0, 300), email_from: (msg.from || '').slice(0, 300), email_date: msg.date, mailbox_id: mb.id, source: mb.provider }
      const files = msg.files.map((f) => ({ ...f, mime: mimeOf(f.name, f.mime) })).filter((f) => MIME_OK.has(f.mime) && f.size <= MAX_FILE && !(f.mime.startsWith('image/') && f.size < 15_000))
      let got = 0

      const take = async (buf, mime, name, extractInput) => {
        const hash = sha(buf)
        if (await one(`fin_documents?file_hash=eq.${hash}&select=id`)) { stats.skipped++; runs.collector.stat.details.duplicates = (runs.collector.stat.details.duplicates || 0) + 1; return }
        let x = null; let failure = null
        try { x = await extract(extractInput); runs.ocr.stat.processed++ } catch (e) { failure = e; runs.ocr.stat.errors++ }
        if (x && !x.is_financial_document) {
          runs.collector.stat.details.not_financial = [...(runs.collector.stat.details.not_financial || []), `${meta.email_subject} · ${name}`].slice(-20)
          return
        }
        const path = `${mb.provider}/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${extOf(mime)}`
        await upload(path, buf, mime.startsWith('text/') ? 'text/html; charset=utf-8' : mime)
        runs.collector.stat.processed++
        const base = { ...meta, file_path: path, file_name: String(name).slice(0, 200), file_mime: mime.startsWith('text/') ? 'text/html' : mime, file_size: buf.length, file_hash: hash, attempts: 1 }
        const fields = x
          ? await analyze(x, { mailbox: mb, fromEmail: meta.email_from, subject: meta.email_subject, text: msg.text || '' }, runs)
          : { status: 'failed', issues: [{ level: 'error', code: 'ocr_failed', field: null, message: `הקריאה נכשלה (ניסיון 1): ${String(failure.message || failure).slice(0, 200)}` }] }
        try { await insert('fin_documents', { ...base, ...fields }); stats.imported++; got++ } catch (e) { if (e.code === '23505') stats.skipped++; else throw e }
      }

      for (const f of files.slice(0, 5)) {
        const buf = await f.load()
        await take(buf, f.mime, f.name, { buf, mime: f.mime, categories: await categories(), hint: `email from ${meta.email_from}, subject "${meta.email_subject}", file ${f.name}` })
      }
      // a receipt written in the email itself
      if (!got && !files.length) {
        const plain = msg.text || String(msg.html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
        if (plain.length > 80) {
          const buf = Buffer.from(msg.html || `<pre>${plain.replace(/</g, '&lt;')}</pre>`, 'utf8')
          await take(buf, 'text/html', `${meta.email_subject || 'email'}.html`, { text: `From: ${meta.email_from}\nSubject: ${meta.email_subject}\n\n${plain}`, categories: await categories() })
        }
      }
      await sb('fin_mail_seen', { method: 'POST', body: { mailbox_id: mb.id, message_id: id }, prefer: 'resolution=ignore-duplicates,return=minimal' })
    }
  } catch (e) {
    complete = false
    authError = !!e.auth
    error = String(e.message || e)
    runs.scanner.stat.errors++
  }
  const upd = {
    last_scan_at: scanStart,
    last_error: error,
    status: authError ? 'error' : error ? (mb.status === 'paused' ? 'paused' : 'error') : 'active',
    docs_found: (mb.docs_found || 0) + stats.imported,
    errors_count: error ? (mb.errors_count || 0) + 1 : mb.errors_count || 0,
  }
  if (!error) upd.last_success_at = new Date().toISOString()
  if (complete) upd.last_sync_at = scanStart
  await patch(`fin_mailboxes?id=eq.${mb.id}`, upd).catch(() => {})
  if (run) await patch(`fin_sync_runs?id=eq.${run.id}`, { ...stats, finished_at: new Date().toISOString(), error }).catch(() => {})
  return { mailbox: mb.email, provider: mb.provider, ...stats, complete, error, attempt }
}
