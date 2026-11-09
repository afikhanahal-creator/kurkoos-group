// The agents' pipeline. One email or one uploaded file goes through:
//   collector (download, fingerprint, de-duplicate) → ocr (Claude reads it) → validation (rules)
//   → classification (company, project, category) → the document waits in review for a person.
import crypto from 'node:crypto'
import { MIME_OK, MAX_FILE, QUOTA_STOP, TIME_BUDGET_MS, DOC_TYPES } from './env.js'
import { sb, one, insert, patch, q, rpc, upload, download, storageUsage } from './db.js'
import { extract, verify, needsVerify, crossCheck, relevanceOf, CLASS_LABEL } from './extract.js'
import { validate, minConfidence } from './validate.js'
import { assign, identifySupplier, settings, flushHits } from './assign.js'
import * as gmail from './providers/gmail.js'
import * as outlook from './providers/outlook.js'

export const PROVIDERS = { gmail, outlook }
/* a reading failure in words the office can act on; the known causes come from Anthropic's API, anything else as is */
export function explainFailure(e) {
  const m = String(e?.message || e || '')
  if (/credit balance is too low|billing/i.test(m)) return 'אין יתרה בחשבון Claude (Anthropic). מנהל המערכת מוסיף קרדיט ב-console.anthropic.com › Plans & Billing, ואז "קריאה מחדש"'
  if (/invalid x-api-key|authentication_error|401/i.test(m)) return 'מפתח Claude לא תקין. בודקים את ANTHROPIC_API_KEY ב-Vercel'
  if (/overloaded|rate.?limit|529|429/i.test(m)) return 'שירות הקריאה עמוס כרגע'
  return m.slice(0, 200)
}
const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : null)
const digits = (s) => String(s || '').replace(/\D/g, '') || null
const money = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null)
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const extOf = (mime) => (mime === 'application/pdf' ? 'pdf' : mime.startsWith('text/') ? 'html' : mime.split('/')[1])
export const mimeOf = (name, given) => {
  if (MIME_OK.has(given)) return given
  return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[String(name).toLowerCase().split('.').pop()] || given
}

/* every source reads documents the same way: a full reading, then, when the reading is unsure, the arithmetic does
   not close or the image is poor, a second independent reading of the critical fields (validation layer 3) */
export async function readDocument(input, runs, { deadline = Infinity } = {}) {
  const x = await extract(input)
  const usage = { ...(x._usage || { in: 0, out: 0, calls: 1 }) }
  if (x.is_financial_document && needsVerify(x) && Date.now() > deadline) x.verification = { skipped: 'time' }
  else if (x.is_financial_document && needsVerify(x)) {
    try {
      const y = await verify(input)
      const cc = crossCheck(x, y)
      x.field_confidence = cc.field_confidence
      x.verification = { second: y, disagree: cc.disagree, at: new Date().toISOString() }
      usage.in += y._usage?.in || 0; usage.out += y._usage?.out || 0; usage.calls += 1
      if (runs) runs.validation.stat.details.verified = (runs.validation.stat.details.verified || 0) + 1
    } catch (e) { x.verification = { error: String(e.message || e).slice(0, 200) } }
  }
  Object.defineProperty(x, '_usage', { value: usage, enumerable: false, configurable: true, writable: true })
  return x
}
const usageFields = (x, prev = {}) => ({ ai_tokens_in: (prev.ai_tokens_in || 0) + (x?._usage?.in || 0), ai_tokens_out: (prev.ai_tokens_out || 0) + (x?._usage?.out || 0), ai_calls: (prev.ai_calls || 0) + (x?._usage?.calls || 0) })

/* a failed reading is tried again in the next night run (00:23 UTC), at most 3 times in all; then it waits for a
   person. Retrying during the day would spend money on the same file again and again. */
export const MAX_ATTEMPTS = 3
export const NIGHT_UTC = { h: 0, m: 23 }
export function nextNight(from = new Date()) {
  const t = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), NIGHT_UTC.h, NIGHT_UTC.m))
  if (t.getTime() - from.getTime() < 60 * 60_000) t.setUTCDate(t.getUTCDate() + 1)   // too close: the night after
  return t
}
export const nextRetry = (failures) => (failures >= MAX_ATTEMPTS ? null : new Date(nextNight().getTime() - 60_000).toISOString())

let catCache = null
const categories = async () => (catCache ||= ((await sb('fin_categories?select=name&order=sort')) || []).map((c) => c.name))
const automation = async (key) => one(`fin_automations?key=eq.${key}&select=*`)

/* Claude's answer → document fields, issues and suggestions. Never approves. */
export async function analyze(x, { selfId = null, selfCreated = null, mailbox = null, fromEmail = '', subject = '', text = '' } = {}, runs) {
  const vat = digits(x.supplier_vat_id)
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
    quality: x.quality || null,
    page_count: Number.isInteger(x.page_count) ? x.page_count : null,
    document_class: x.document_class || null,
    relevance: Number.isFinite(Number(x.relevance_confidence)) ? Math.round(Number(x.relevance_confidence) * 100) / 100 : null,
    confidence: minConfidence(x.field_confidence),
    extraction: x,
    email_subject: subject || undefined,
  }
  // step 4: the supplier (existing, or a suggestion that waits for approval in controlled mode)
  const cfg = await settings()
  const sup = await identifySupplier(x, { fromEmail, cfg, documentId: selfId })
  const supplier = sup.supplier
  fields.supplier_id = supplier?.id || null
  if (x.supplier_email) fields.supplier_email = x.supplier_email

  // steps 5-7: company, category, project
  const cls = await assign({ fields, x, mailbox, fromEmail, text, supplier, cfg, documentId: selfId })
  if (runs) runs.classification.stat.processed++
  for (const k of ['business_id', 'project_id', 'category', 'business_source']) if (cls[k]) fields[k] = cls[k]
  fields.suggestions = { ...cls.suggestions, supplier: { value: supplier?.id || null, match: sup.match, confidence: Math.round((sup.confidence || 0) * 100) / 100, pending: !!sup.pending } }
  fields.ai_snapshot = { supplier_id: supplier?.id || null, supplier_match: sup.match, business_id: cls.suggestions.business_id?.value || null, category: cls.suggestions.category?.value || null, project_id: cls.suggestions.project_id?.value || null }
  fields._pendingHits = cls.pendingHits

  // validation
  const not = selfId ? `&id=neq.${selfId}` : ''
  const dupCheck = await automation('duplicate_check')
  let duplicateOf = null; let possibleDuplicate = false
  if (dupCheck?.enabled !== false) {
    // signal 1: the same issuer number and document number (any source, any file)
    if (fields.doc_number && vat) duplicateOf = (await one(`fin_documents?supplier_vat_id=eq.${vat}&doc_number=eq.${q(fields.doc_number)}&status=not.in.(rejected,duplicate,archived)${not}&select=id&order=created_at.asc`))?.id || null
    // signal 2: the same supplier, total and date (±1 day): a photo of an invoice that also arrived by email
    if (!duplicateOf && fields.total_amount !== null && fields.issue_date && (fields.supplier_id || vat)) {
      const d0 = new Date(`${fields.issue_date}T00:00:00Z`); const lo = new Date(d0.getTime() - 86400_000).toISOString().slice(0, 10); const hi = new Date(d0.getTime() + 86400_000).toISOString().slice(0, 10)
      const who = fields.supplier_id ? `supplier_id=eq.${fields.supplier_id}` : `supplier_vat_id=eq.${vat}`
      // two receipts with different printed numbers are two purchases (two coffees, two fuel fill-ups): only a copy
      // without a number, or with the same number, is suspected; and only an earlier document can be "the original"
      // a receipt with a number is compared only with the same number; one without a number with any earlier receipt
      const numbers = fields.doc_number ? `&doc_number=eq.${q(fields.doc_number)}` : ''
      const earlier = selfCreated ? `&created_at=lt.${encodeURIComponent(selfCreated)}` : ''
      possibleDuplicate = (await one(`fin_documents?${who}&total_amount=eq.${fields.total_amount}&issue_date=gte.${lo}&issue_date=lte.${hi}&status=not.in.(rejected,duplicate,archived)${not}${numbers}${earlier}&select=id&order=created_at.asc`))?.id || false
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
  fields.issues = [...validate(fields, { duplicateOf, possibleDuplicate: !!possibleDuplicate, flagAmount: thresholds.length ? Math.min(...thresholds) : null, supplierMedian, extractionNotes: x.notes, quality: x.quality, disagree: x.verification?.disagree }), ...cls.issues]
  // a suspected duplicate is linked to the original, never dropped: a person confirms or dismisses it
  fields.duplicate_of = duplicateOf || possibleDuplicate || null
  fields.duplicate_state = duplicateOf ? 'confirmed' : possibleDuplicate ? 'suspected' : null
  if (sup.pending) fields.issues.push({ level: 'warn', code: 'supplier_pending', field: 'supplier_name', message: 'ספק חדש: נוצרה הצעה שממתינה לאישור' })
  if (sup.conflict) fields.issues.push({ level: 'error', code: 'supplier_conflict', field: 'supplier_vat_id', message: `השם תואם לספק "${sup.conflict.name}" אבל מספר העוסק שונה` })
  const rel = relevanceOf(x)
  const what = rel.cls ? CLASS_LABEL[rel.cls] : null
  if (rel.verdict === 'skip') fields.issues.unshift({ level: 'warn', code: 'not_financial', field: null, message: what ? `זה נראה כמו ${what}, לא חשבונית או קבלה. אם זו לא הוצאה, דחו אותו` : 'לא נראה כמו מסמך כספי' })
  else if (rel.verdict === 'unsure') fields.issues.unshift({ level: 'warn', code: 'unsure_class', field: null, message: `לא בטוח שזה מסמך הוצאה${what ? ` (אולי ${what})` : ''}. בדקו לפני האישור` })
  if (runs) { runs.validation.stat.processed++; if (fields.issues.some((i) => i.level === 'error')) runs.validation.stat.details.flagged = (runs.validation.stat.details.flagged || 0) + 1 }

  fields.status = duplicateOf ? 'duplicate' : 'review'
  fields.processed_at = new Date().toISOString()
  fields.stage = duplicateOf ? 'ready' : fields.issues.some((i) => i.level === 'error') ? 'validating' : 'ready'
  fields.stage_at = fields.processed_at
  if (fields.email_subject === undefined) delete fields.email_subject
  return fields
}

/* a project of another company never rides along: it becomes a suggestion and the document is flagged */
async function keepProjectInCompany(fields) {
  if (!fields.project_id || !fields.business_id) return
  const p = await one(`fin_projects?id=eq.${fields.project_id}&select=business_id,name`)
  if (p?.business_id && p.business_id !== fields.business_id) {
    fields.project_id = null
    ;(fields.issues ||= []).push({ level: 'warn', code: 'project_company', field: 'project_id', message: `הפרויקט "${p.name}" שייך לחברה אחרת ולכן לא שויך` })
  }
}

/* after a person edits a document: run the validation rules again on the stored fields (no AI) */
export async function revalidate(doc) {
  const not = `&id=neq.${doc.id}`
  let duplicateOf = null; let possibleDuplicate = false
  if (doc.doc_number && doc.supplier_vat_id) duplicateOf = (await one(`fin_documents?supplier_vat_id=eq.${doc.supplier_vat_id}&doc_number=eq.${q(doc.doc_number)}&status=not.in.(rejected,duplicate,archived)${not}&select=id`))?.id || null
  if (!duplicateOf && doc.duplicate_state !== 'dismissed' && doc.supplier_id && doc.issue_date && doc.total_amount !== null) possibleDuplicate = !!(await one(`fin_documents?supplier_id=eq.${doc.supplier_id}&issue_date=eq.${doc.issue_date}&total_amount=eq.${doc.total_amount}&status=not.in.(rejected,duplicate,archived)${not}&select=id`))
  const flag = await automation('amount_flag')
  // a value a person typed is no longer "unsure": drop the AI confidence of fields that changed
  const fc = { ...(doc.field_confidence || {}) }
  for (const k of Object.keys(fc)) if (doc.extraction && String(doc.extraction[k] ?? '') !== String(doc[k] ?? '') && !(Number(doc.extraction[k]) === Number(doc[k]) && doc[k] !== null)) fc[k] = 1
  const issues = validate({ ...doc, field_confidence: fc }, { duplicateOf, possibleDuplicate, flagAmount: flag?.enabled !== false ? Number(flag?.config?.min_amount) || null : null })
  // assignment findings that are still true after the edit
  const sup = doc.supplier_id ? await one(`fin_suppliers?id=eq.${doc.supplier_id}&select=status`) : null
  for (const i of doc.issues || []) {
    // what the reading found about the paper itself stays true after an edit
    if (['unreadable', 'blurry', 'cropped', 'missing_pages', 'handwritten'].includes(i.code)) issues.push(i)
    // a disagreement between the two readings stays until a person changes that field
    if (i.code === 'ai_disagree' && doc.extraction && String(doc.extraction[i.field] ?? '') === String(doc[i.field] ?? '')) issues.push(i)
    if (i.code === 'possible_duplicate' && doc.duplicate_state === 'suspected' && !possibleDuplicate) issues.push(i)
    if (i.code === 'supplier_pending' && sup?.status === 'pending') issues.push(i)
    if (['no_company', 'unknown_recipient', 'company_suggested'].includes(i.code) && !doc.business_id) issues.push(i)
    if (i.code === 'rule_missing_vat' && !doc.supplier_vat_id) issues.push(i)
  }
  return patch(`fin_documents?id=eq.${doc.id}`, { issues, field_confidence: fc, confidence: minConfidence(fc) })
}

/* re-read a stored document (an upload, or a retry of a failed one). Approved ones are left alone. */
export async function processStored(doc, runs, trigger = 'upload', started = Date.now()) {
  if (['approved', 'sent'].includes(doc.status)) return { skipped: 'approved' }
  // one reader per document: the claim counts the attempt up front and parks the next retry in the future, so two runs
  // never read (and pay for) the same document, and a reading that kills the function still runs out of attempts
  let legacy = false
  const claimed = await rpc('fin_doc_claim', { p_id: doc.id, p_next: nextRetry((doc.failures || 0) + 1) }).catch((e) => { if (/fin_doc_claim|schema cache/.test(String(e.message))) { legacy = true; return 0 } throw e })
  if (!legacy && (claimed === null || claimed === undefined || (Array.isArray(claimed) && !claimed.length))) return { skipped: 'busy' }
  const cur = legacy ? { ...doc, attempts: (doc.attempts || 0) + 1, failures: (doc.failures || 0) + 1 } : await one(`fin_documents?id=eq.${doc.id}&select=attempts,failures,ai_tokens_in,ai_tokens_out,ai_calls`)
  let x = null
  try {
    const buf = await download(doc.file_path)
    const mime = doc.file_mime || 'application/pdf'
    const isText = mime.startsWith('text/')
    x = await readDocument(isText ? { text: buf.toString('utf8').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '), categories: await categories() } : { buf, mime, categories: await categories(), hint: `${trigger} file ${doc.file_name || ''}` }, runs, { deadline: started + 25_000 })
    runs.ocr.stat.processed++
    const mb = doc.mailbox_id ? await one(`fin_mailboxes?id=eq.${doc.mailbox_id}&select=*`) : null
    const fields = await analyze(x, { selfId: doc.id, selfCreated: doc.created_at, mailbox: mb, fromEmail: doc.email_from || '' }, runs)
    if (doc.business_id) fields.business_id = doc.business_id      // a company chosen at upload wins
    // a person already said "not a duplicate": a new reading does not raise it again
    if (doc.duplicate_state === 'dismissed' && fields.duplicate_state === 'suspected') { fields.duplicate_state = 'dismissed'; fields.issues = fields.issues.filter((i) => i.code !== 'possible_duplicate') }
    await keepProjectInCompany(fields)
    fields.attempts = cur.attempts
    fields.failures = 0
    fields.next_retry_at = null
    Object.assign(fields, usageFields(x, cur))
    delete fields._pendingHits
    return await patch(`fin_documents?id=eq.${doc.id}`, fields)
  } catch (e) {
    runs.ocr.stat.errors++
    const retry = nextRetry(cur.failures)
    const why = explainFailure(e)
    return await patch(`fin_documents?id=eq.${doc.id}`, {
      status: 'failed', attempts: cur.attempts, failures: cur.failures, stage: retry ? 'failed' : 'dead', stage_at: new Date().toISOString(), next_retry_at: retry, ...usageFields(x, cur),
      issues: [{ level: 'error', code: 'ocr_failed', field: null, message: retry ? `הקריאה נכשלה (ניסיון ${cur.attempts}): ${why}. ניסיון נוסף אוטומטי בסריקת הלילה.` : `הקריאה נכשלה ${cur.failures} פעמים ברצף: ${why}. אפשר לנסות שוב ידנית או למלא את הפרטים.` }],
    })
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
    // a backfill ("old receipts") scans from the new start of the period; seen messages are skipped, so only the gap costs anything
    const start = mb.sync_from ? new Date(`${mb.sync_from}T00:00:00Z`) : new Date(Date.now() - (mb.days_back || 90) * 86400_000)
    // a backfill reads only the gap [sync_from, backfill_until), with a higher cap, so a busy mailbox still reaches its old mail
    const gap = mb.backfill_pending && mb.backfill_until && mb.last_sync_at
    const since = mb.backfill_pending || !mb.last_sync_at ? start : new Date(new Date(mb.last_sync_at).getTime() - 2 * 86400_000)
    const ids = await prov.listCandidates(token, since, mb.query, gap ? { until: new Date(`${mb.backfill_until}T00:00:00Z`), max: 3000 } : {})
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
        // a file that was already read and skipped as "not an invoice" is not read (and paid for) again
        if (await one(`fin_skipped?file_hash=eq.${hash}&select=id`).catch(() => null)) { stats.skipped++; return }
        let x = null; let failure = null
        try { x = await readDocument(extractInput, runs, { deadline: started + TIME_BUDGET_MS - 20_000 }); runs.ocr.stat.processed++ } catch (e) { failure = e; runs.ocr.stat.errors++ }
        // not an invoice or a receipt (quote, contract, newsletter, letter): no financial record, one line in the skip list.
        // Only a sure answer skips; an unsure one is kept and goes to a person.
        const rel = x ? relevanceOf(x) : null
        if (rel?.verdict === 'skip') {
          runs.collector.stat.details.not_financial = [...(runs.collector.stat.details.not_financial || []), `${meta.email_subject} · ${name}`].slice(-20)
          runs.collector.stat.details.skipped_by_class = { ...(runs.collector.stat.details.skipped_by_class || {}), [rel.cls || 'other']: ((runs.collector.stat.details.skipped_by_class || {})[rel.cls || 'other'] || 0) + 1 }
          await insert('fin_skipped', { source: mb.provider, mailbox_id: mb.id, email_subject: meta.email_subject, email_from: meta.email_from, file_name: String(name).slice(0, 200), file_hash: hash, document_class: rel.cls, confidence: rel.conf, reason: rel.cls ? `${CLASS_LABEL[rel.cls]}, לא חשבונית או קבלה` : 'לא מסמך כספי' }, 'return=minimal').catch(() => {})
          stats.skipped++
          return
        }
        const path = `${mb.provider}/${new Date().toISOString().slice(0, 7)}/${hash.slice(0, 24)}.${extOf(mime)}`
        await upload(path, buf, mime.startsWith('text/') ? 'text/html; charset=utf-8' : mime)
        runs.collector.stat.processed++
        const base = { ...meta, file_path: path, file_name: String(name).slice(0, 200), file_mime: mime.startsWith('text/') ? 'text/html' : mime, file_size: buf.length, file_hash: hash, attempts: 1 }
        const fields = x
          ? await analyze(x, { mailbox: mb, fromEmail: meta.email_from, subject: meta.email_subject, text: msg.text || '' }, runs)
          : { status: 'failed', failures: 1, stage: 'failed', stage_at: new Date().toISOString(), next_retry_at: nextRetry(1), issues: [{ level: 'error', code: 'ocr_failed', field: null, message: `הקריאה נכשלה (ניסיון 1): ${explainFailure(failure)}. ניסיון נוסף אוטומטי בסריקת הלילה.` }] }
        if (x) Object.assign(fields, usageFields(x))
        const pendingHits = fields._pendingHits; delete fields._pendingHits
        await keepProjectInCompany(fields)
        const newSupplier = fields.suggestions?.supplier?.match === 'new' ? fields.supplier_id : null
        try {
          const row = await insert('fin_documents', { ...base, ...fields }); stats.imported++; got++
          if (row) { await flushHits(row.id, pendingHits); if (fields.supplier_id) await patch(`fin_suppliers?id=eq.${fields.supplier_id}&suggested_from=is.null&status=eq.pending`, { suggested_from: row.id }).catch(() => {}) }
        } catch (e) {
          // the document was not stored: a supplier suggested only by it goes too
          if (newSupplier) await sb(`fin_suppliers?id=eq.${newSupplier}&status=eq.pending`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {})
          if (e.code === '23505') stats.skipped++; else throw e
        }
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
  // a gap scan does not move last_sync_at: the regular scan still owns the recent mail
  if (complete) { if (!(mb.backfill_pending && mb.backfill_until && mb.last_sync_at)) upd.last_sync_at = scanStart; upd.backfill_pending = false; upd.backfill_until = null }
  await patch(`fin_mailboxes?id=eq.${mb.id}`, upd).catch(() => {})
  if (run) await patch(`fin_sync_runs?id=eq.${run.id}`, { ...stats, finished_at: new Date().toISOString(), error }).catch(() => {})
  return { mailbox: mb.email, provider: mb.provider, ...stats, complete, error, attempt }
}
