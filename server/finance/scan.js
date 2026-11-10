// The mail scan engine: a job reads one mailbox over one period and makes sure every message was checked.
//   1. the period is cut into week segments (a month each past 3 years), in the business's time zone
//   2. a run (pg_cron every minute in production, or the open screen) claims a segment under a lease, lists its messages
//      page by page with no cap, and keeps the page token and the last message as the checkpoint, so a stop resumes there
//   3. every message gets a row in fin_scan_items: done, failed (retried up to 3 times) or unreadable (a damaged file)
//   4. a segment is done only when every listed message has a final row; failures make it "retry", then "failed"
//   5. after the scan phase, a verify phase lists the whole period again and processes anything with no row (missed)
//   6. the job ends "done" only when nothing failed and nothing is unreadable; otherwise "incomplete", with the list
// The reading of each message is the same as the regular sync (pipeline.js messageProcessor): rules, the cheap check, the
// full reading only for invoices and receipts. Docs: docs/finance/SCAN-AND-COMPANIES-PLAN.md
import { TIME_BUDGET_MS, QUOTA_STOP } from './env.js'
import { sb, one, insert, patch, rpc, audit, storageUsage } from './db.js'
import { PROVIDERS, accessTokenFor, messageProcessor, conductorContext } from './pipeline.js'
import { newRuns, closeRuns } from './agents.js'

const MAX_TRIES = 3
const RETRY_MIN = [15, 60, 240]
const q = (v) => encodeURIComponent(v)
const DAY = 86400_000

/* the UTC instant of local midnight of a date in a time zone (DST included), without a library */
function zoneOffset(tz, at) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date(at)).find((x) => x.type === 'timeZoneName')?.value || 'GMT'
  const m = p.match(/GMT([+-])(\d{2}):?(\d{2})?/)
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) * 60_000 : 0
}
export function localMidnight(dateStr, tz) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const guess = Date.UTC(y, mo - 1, d)
  let t = guess - zoneOffset(tz, guess)
  t = guess - zoneOffset(tz, t)        // once more, in case the offset changed at that night (summer time)
  return new Date(t)
}

/* the windows of a period: a week each, a month each when the period is longer than 3 years */
export function windows(from, to, monthly = false) {
  const out = []
  for (let a = new Date(from); a < to;) {
    const b = new Date(a)
    if (monthly) b.setUTCMonth(b.getUTCMonth() + 1); else b.setTime(b.getTime() + 7 * DAY)
    out.push([new Date(a), b < to ? b : new Date(to)])
    a = b
  }
  return out
}

/* a new scan of one mailbox over a period. One active scan per mailbox. */
export async function createJob({ mailboxId, from, to, tz = 'Asia/Jerusalem', includeSent = false, user }) {
  const mb = await one(`fin_mailboxes?id=eq.${q(mailboxId)}&select=*`)
  if (!mb) throw Object.assign(new Error('התיבה לא נמצאה'), { status: 404 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw Object.assign(new Error('תאריכים לא תקינים'), { status: 400 })
  if (await one(`fin_scan_jobs?mailbox_id=eq.${mb.id}&status=in.(queued,running,paused)&select=id`)) throw Object.assign(new Error('כבר יש סריקה פעילה לתיבה הזו. אפשר לעצור אותה או להמשיך אותה'), { status: 409 })
  const start = localMidnight(from, tz)
  const endDay = new Date(Date.parse(`${to}T00:00:00Z`) + DAY).toISOString().slice(0, 10)
  const end = new Date(Math.min(localMidnight(endDay, tz).getTime(), Date.now() + 60_000))
  const job = await insert('fin_scan_jobs', { mailbox_id: mb.id, date_from: from, date_to: to, tz, include_sent: !!includeSent, requested_by: user?.id || null })
  const wins = windows(start, end, end - start > 3 * 366 * DAY)
  for (let i = 0; i < wins.length; i += 200) {
    await sb('fin_scan_segments', { method: 'POST', body: wins.slice(i, i + 200).map(([a, b], k) => ({ job_id: job.id, mailbox_id: mb.id, phase: 'scan', seq: i + k, t_from: a.toISOString(), t_to: b.toISOString() })), prefer: 'return=minimal' })
  }
  await audit('mailbox', mb.id, 'scan_started', { job: job.id, from, to, tz, include_sent: !!includeSent, segments: wins.length }, user)
  return { ...job, segments: wins.length }
}

/* pause / resume / cancel; "rescan" starts a new job over the same period in which failed messages get new tries */
export async function controlJob(jobId, op, user) {
  const job = await one(`fin_scan_jobs?id=eq.${q(jobId)}&select=*`)
  if (!job) throw Object.assign(new Error('הסריקה לא נמצאה'), { status: 404 })
  if (op === 'pause' && ['queued', 'running'].includes(job.status)) await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'paused' })
  else if (op === 'resume' && ['paused', 'failed'].includes(job.status)) { await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'running', error: null }); await patch(`fin_scan_segments?job_id=eq.${job.id}&status=eq.failed`, { status: 'retry', attempts: 0, next_try_at: null }) }
  else if (op === 'cancel' && ['queued', 'running', 'paused'].includes(job.status)) await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'cancelled', finished_at: new Date().toISOString() })
  else if (op === 'rescan') {
    await patch(`fin_scan_items?mailbox_id=eq.${job.mailbox_id}&status=eq.failed`, { attempts: 0 })
    await audit('mailbox', job.mailbox_id, 'scan_rescan', { job: job.id }, user)
    return createJob({ mailboxId: job.mailbox_id, from: job.date_from, to: job.date_to, tz: job.tz, includeSent: job.include_sent, user })
  } else throw Object.assign(new Error('פעולה לא אפשרית במצב הנוכחי'), { status: 409 })
  await audit('mailbox', job.mailbox_id, `scan_${op}`, { job: job.id }, user)
  return one(`fin_scan_jobs?id=eq.${job.id}&select=*`)
}

/* a person decides about a message that could not be read (a damaged file): it counts as checked */
export async function acceptItem(mailboxId, messageId, user) {
  await patch(`fin_scan_items?mailbox_id=eq.${q(mailboxId)}&message_id=eq.${q(messageId)}&status=in.(failed,unreadable)`, { status: 'accepted', error: `סומן כנבדק ע״י ${user?.email || 'אדם'}` })
  await audit('mailbox', mailboxId, 'scan_item_accepted', { message_id: messageId }, user)
  const jobs = (await sb(`fin_scan_jobs?mailbox_id=eq.${q(mailboxId)}&status=eq.incomplete&select=*`)) || []
  for (const j of jobs) await finishJob(j)
}

/* the final rows already written for these ids (fin_mail_seen counts as done: the regular sync read it) */
async function knownOf(mailboxId, ids) {
  const known = new Map()
  for (let i = 0; i < ids.length; i += 150) {
    const part = ids.slice(i, i + 150).map((x) => `"${x}"`).join(',')
    for (const r of (await sb(`fin_scan_items?mailbox_id=eq.${mailboxId}&message_id=in.(${part})&select=message_id,status,attempts`)) || []) known.set(r.message_id, r)
    for (const r of (await sb(`fin_mail_seen?mailbox_id=eq.${mailboxId}&message_id=in.(${part})&select=message_id`)) || []) if (!known.has(r.message_id)) known.set(r.message_id, { status: 'done', seen: true })
  }
  return known
}
const item = (row) => sb('fin_scan_items', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })

/* one segment until it is finished or the time is up. Returns 'done' | 'paused' | 'time' */
async function runSegment(seg, started, runs, cache) {
  const job = await one(`fin_scan_jobs?id=eq.${seg.job_id}&select=*`)
  const mb = await one(`fin_mailboxes?id=eq.${seg.mailbox_id}&select=*`)
  const release = (upd = {}) => patch(`fin_scan_segments?id=eq.${seg.id}`, { status: 'pending', locked_until: null, updated_at: new Date().toISOString(), ...upd })
  if (!job || !mb || !['queued', 'running'].includes(job.status)) { await release(); return 'paused' }
  if (job.status === 'queued') await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'running', started_at: new Date().toISOString() })
  const prov = PROVIDERS[mb.provider]
  let token
  try { token = cache.tokens.get(mb.id) || await accessTokenFor(mb); cache.tokens.set(mb.id, token) } catch (e) {
    await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'paused', error: e.auth ? 'ההרשאה לתיבה בוטלה או פגה. חברו אותה מחדש ואז "המשך"' : String(e.message || e).slice(0, 300) })
    await release(); return 'paused'
  }
  if (!cache.ctx) cache.ctx = await conductorContext(runs)
  await patch(`fin_mailboxes?id=eq.${mb.id}`, { last_scan_at: new Date().toISOString() }).catch(() => {})
  const stats = { scanned: 0, imported: 0, skipped: 0 }
  const processMessage = messageProcessor({ mb, runs, stats, started, ...cache.ctx })
  const c = { pages: seg.pages, listed: seg.listed, processed: seg.processed, failed: seg.failed, unreadable: seg.unreadable, kept: seg.kept, skipped: seg.skipped, duplicates: seg.duplicates, missed: seg.missed, already: seg.already || 0, last_message_id: seg.last_message_id, last_message_at: seg.last_message_at }
  let pageToken = seg.page_token || ''
  // a fresh pass over the window (the first, or a retry after failures): every message is counted once in this pass,
  // as read now (processed) or as checked before (already), so checked never exceeds what was listed
  if (!pageToken && !seg.last_message_id) { c.pages = 0; c.listed = 0; c.already = 0; c.processed = 0 }
  const save = (extra = {}) => patch(`fin_scan_segments?id=eq.${seg.id}`, { ...c, page_token: pageToken || null, locked_until: new Date(Date.now() + 90_000).toISOString(), updated_at: new Date().toISOString(), ...extra })
  const timeUp = () => Date.now() - started > TIME_BUDGET_MS - 8_000

  for (;;) {
    let page
    try { page = await prov.listPage(token, { from: new Date(seg.t_from), to: new Date(seg.t_to), pageToken, includeSent: job.include_sent }) } catch (e) {
      // the provider failed on listing (429, 5xx after retries, an expired page token): the segment is tried again later
      const attempts = (seg.attempts || 0) + 1
      const stale = /pageToken|invalid.*token|400/i.test(String(e.message || ''))
      await save({ status: attempts >= MAX_TRIES * 2 ? 'failed' : 'retry', attempts, next_try_at: new Date(Date.now() + 5 * 60_000).toISOString(), error: String(e.message || e).slice(0, 300), locked_until: null, ...(stale ? { page_token: null } : {}) })
      return 'done'
    }
    const known = await knownOf(mb.id, page.ids)
    const pageDone = new Set()   // a page read again after a stop does not count its earlier messages twice
    if (pageToken === (seg.page_token || '') && seg.last_message_id) for (const id of page.ids) { if (known.get(id)?.status === 'done') pageDone.add(id); if (id === seg.last_message_id) break }
    for (const id of page.ids) {
      const k = known.get(id)
      if (k && (k.status !== 'failed' || (k.attempts || 0) >= MAX_TRIES)) { if (k.status !== 'failed' && !pageDone.has(id)) { c.already++; pageDone.add(id) } continue }
      if (timeUp() || cache.msgLeft <= 0) { await save({ status: 'pending', locked_until: null }); return 'time' }
      cache.msgLeft--
      const usage = await storageUsage()
      if (usage !== null && usage >= QUOTA_STOP) { await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'paused', error: `האחסון מלא ב-${Math.round(usage * 100)}%. הסריקה נעצרה כדי לא לחסום את האתר` }); await save({ status: 'pending', locked_until: null }); return 'paused' }
      if (seg.phase === 'verify' && !k) c.missed++                    // the first pass did not get to it
      const dupBefore = runs.collector.stat.details.duplicates || 0
      try {
        const r = await processMessage(prov, token, id)
        await item({ mailbox_id: mb.id, message_id: id, segment_id: seg.id, status: r.unreadable ? 'unreadable' : 'done', attempts: (k?.attempts || 0) + 1, error: r.unreadable ? `${r.unreadable} קבצים לא נפתחו (פגומים או מוגנים)` : null, files: r.files, kept: r.kept, skipped: r.skipped, subject: r.subject, email_from: r.from, email_date: r.date, at: new Date().toISOString() })
        await sb('fin_mail_seen', { method: 'POST', body: { mailbox_id: mb.id, message_id: id }, prefer: 'resolution=ignore-duplicates,return=minimal' })
        const dups = (runs.collector.stat.details.duplicates || 0) - dupBefore     // a copy of a stored document is a duplicate, not "not relevant"
        c.processed++; c.kept += r.kept; c.skipped += Math.max(0, r.skipped - dups); c.duplicates += dups; if (r.unreadable) c.unreadable++
        c.last_message_id = id; c.last_message_at = r.date || null
      } catch (e) {
        if (e.auth) { await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: 'paused', error: 'ההרשאה לתיבה בוטלה או פגה. חברו אותה מחדש ואז "המשך"' }); await save({ status: 'pending', locked_until: null }); return 'paused' }
        await item({ mailbox_id: mb.id, message_id: id, segment_id: seg.id, status: 'failed', attempts: (k?.attempts || 0) + 1, error: String(e.message || e).slice(0, 300), at: new Date().toISOString() })
        c.failed++
      }
      if ((c.processed + c.failed) % 10 === 0) await save()
    }
    c.pages++; c.listed += page.ids.length
    if (page.next) { pageToken = page.next; await save(); if (timeUp()) { await save({ status: 'pending', locked_until: null }); return 'time' } continue }
    // the window was listed to its last page: is anything left?
    const open = (await sb(`fin_scan_items?segment_id=eq.${seg.id}&status=eq.failed&attempts=lt.${MAX_TRIES}&select=message_id`)) || []
    const attempts = (seg.attempts || 0) + 1
    pageToken = ''
    if (open.length) await save({ status: 'retry', attempts, next_try_at: new Date(Date.now() + RETRY_MIN[Math.min(attempts - 1, 2)] * 60_000).toISOString(), last_message_id: null, error: `${open.length} הודעות ייבדקו שוב`, locked_until: null })
    else await save({ status: 'done', attempts, last_message_id: null, error: null, locked_until: null })
    await finishJob(job)
    return 'done'
  }
}

/* when every segment of the phase is closed: the scan phase opens a verify phase, the verify phase writes the report */
export async function finishJob(job) {
  job = await one(`fin_scan_jobs?id=eq.${job.id}&select=*`)
  if (!job) return
  const segs = (await sb(`fin_scan_segments?job_id=eq.${job.id}&phase=eq.${job.phase}&select=status`)) || []
  if (['running', 'queued'].includes(job.status) && segs.some((s) => !['done', 'failed'].includes(s.status))) return
  if (job.phase === 'scan' && ['running', 'queued'].includes(job.status)) {
    // the completeness pass: a month a window, only messages with no final row are read
    const start = localMidnight(job.date_from, job.tz)
    const end = new Date(Math.min(localMidnight(new Date(Date.parse(`${job.date_to}T00:00:00Z`) + DAY).toISOString().slice(0, 10), job.tz).getTime(), Date.now()))
    const wins = windows(start, end, true)
    await sb('fin_scan_segments', { method: 'POST', body: wins.map(([a, b], k) => ({ job_id: job.id, mailbox_id: job.mailbox_id, phase: 'verify', seq: k, t_from: a.toISOString(), t_to: b.toISOString() })), prefer: 'return=minimal' })
    await patch(`fin_scan_jobs?id=eq.${job.id}`, { phase: 'verify' })
    return
  }
  const report = await buildReport(job)
  const complete = report.failed === 0 && report.unreadable === 0 && report.failed_segments === 0
  await patch(`fin_scan_jobs?id=eq.${job.id}`, { status: complete ? 'done' : 'incomplete', finished_at: job.finished_at || new Date().toISOString(), report })
  // the mailbox's period now starts at the scanned period, when that is earlier (the regular sync goes on from its last run)
  const mb = await one(`fin_mailboxes?id=eq.${job.mailbox_id}&select=sync_from`)
  if (mb && (!mb.sync_from || job.date_from < mb.sync_from)) await patch(`fin_mailboxes?id=eq.${job.mailbox_id}`, { sync_from: job.date_from })
  await audit('mailbox', job.mailbox_id, complete ? 'scan_done' : 'scan_incomplete', { job: job.id, ...report }, null)
}

/* the summary of a job: what was listed and checked, what was found, what is left */
export async function buildReport(job) {
  const segs = (await sb(`fin_scan_segments?job_id=eq.${job.id}&select=phase,status,listed,processed,failed,unreadable,kept,skipped,duplicates,missed,already`)) || []
  const scan = segs.filter((s) => s.phase === 'scan'); const verify = segs.filter((s) => s.phase === 'verify')
  const sum = (list, k) => list.reduce((a, s) => a + (s[k] || 0), 0)
  const start = localMidnight(job.date_from, job.tz).toISOString()
  const end = localMidnight(new Date(Date.parse(`${job.date_to}T00:00:00Z`) + DAY).toISOString().slice(0, 10), job.tz).toISOString()
  const problems = (await sb(`fin_scan_items?mailbox_id=eq.${job.mailbox_id}&status=in.(failed,unreadable)&or=(email_date.is.null,and(email_date.gte.${q(start)},email_date.lt.${q(end)}))&select=status,attempts`)) || []
  const docs = (await sb(`fin_documents?mailbox_id=eq.${job.mailbox_id}&email_date=gte.${q(start)}&email_date=lt.${q(end)}&select=doc_type,status,duplicate_state`)) || []
  const by = (f) => docs.filter(f).length
  return {
    listed: sum(scan, 'listed'),
    checked: sum(scan, 'processed') + sum(scan, 'already'),
    read_now: sum(scan, 'processed'),
    missed_found: sum(verify, 'missed'),
    failed: problems.filter((p) => p.status === 'failed').length,
    unreadable: problems.filter((p) => p.status === 'unreadable').length,
    failed_segments: segs.filter((s) => s.status === 'failed').length,
    invoices: by((d) => ['invoice', 'invoice_receipt', 'supplier_bill', 'proforma'].includes(d.doc_type)),
    receipts: by((d) => d.doc_type === 'receipt'),
    credits: by((d) => d.doc_type === 'credit'),
    other_financial: by((d) => ['payment_confirmation', 'other'].includes(d.doc_type)),
    not_relevant: sum(scan, 'skipped') + sum(verify, 'skipped'),
    duplicates: sum(scan, 'duplicates') + sum(verify, 'duplicates') + by((d) => d.status === 'duplicate'),
    awaiting_review: by((d) => d.status === 'review'),
  }
}

/* one run: segments one after another until the time is up, a different mailbox each time while there are several */
export async function tick({ started = Date.now(), trigger = 'scan', limits = {} } = {}) {
  const runs = await newRuns(trigger)
  // limits: at most this many segments / messages in this run (the screen's "step", and the tests of stop and resume)
  const maxSegments = Math.max(1, Math.min(10_000, Number(limits.segments) || 10_000))
  const cache = { tokens: new Map(), ctx: null, msgLeft: Math.max(1, Math.min(1e9, Number(limits.messages) || 1e9)) }
  const served = []; const done = []
  try {
    while (Date.now() - started < TIME_BUDGET_MS - 12_000) {
      let seg = ((await rpc('fin_scan_claim', { p_skip: served, p_lease_seconds: 90 })) || [])[0]
      if (!seg && served.length) { served.length = 0; seg = ((await rpc('fin_scan_claim', { p_skip: [], p_lease_seconds: 90 })) || [])[0] }
      if (!seg) break
      served.push(seg.mailbox_id)
      const r = await runSegment(seg, started, runs, cache)
      done.push({ segment: seg.id, mailbox: seg.mailbox_id, result: r })
      if (r === 'time' || done.length >= maxSegments) break
    }
  } finally { await closeRuns(runs) }
  const left = (await sb('fin_scan_segments?status=in.(pending,retry,running)&select=id&limit=1')) || []
  return { segments: done, more: left.length > 0, cost_usd: Math.round(((runs.ocr.stat.details.cost_usd || 0) + (runs.collector.stat.details.triage_usd || 0)) * 10000) / 10000 }
}

/* what the screen shows per mailbox: the latest job with its segments' totals, and the problems left */
export async function overview() {
  const boxes = (await sb('fin_mailboxes?status=neq.revoked&select=id,email,provider,status,business_id,last_scan_at,last_error,sync_from&order=created_at')) || []
  const out = []
  for (const mb of boxes) {
    const jobs = (await sb(`fin_scan_jobs?mailbox_id=eq.${mb.id}&select=*&order=created_at.desc&limit=5`)) || []
    const job = jobs[0] || null
    let progress = null
    if (job) {
      const segs = (await sb(`fin_scan_segments?job_id=eq.${job.id}&select=phase,status,listed,processed,failed,unreadable,kept,skipped,missed,already,t_from,t_to`)) || []
      const cur = segs.filter((s) => s.phase === job.phase)
      const closed = cur.filter((s) => ['done', 'failed'].includes(s.status)).length
      const sum = (k) => segs.filter((s) => s.phase === 'scan').reduce((a, s) => a + (s[k] || 0), 0)
      progress = { phase: job.phase, segments: cur.length, closed, pct: job.status === 'done' ? 100 : Math.round(((job.phase === 'verify' ? 0.9 : 0) + (cur.length ? closed / cur.length : 0) * (job.phase === 'verify' ? 0.1 : 0.9)) * 100), listed: sum('listed'), checked: sum('processed') + sum('already'), kept: sum('kept'), skipped: sum('skipped'), failed: sum('failed'), unreadable: sum('unreadable') }
    }
    const problems = (await sb(`fin_scan_items?mailbox_id=eq.${mb.id}&status=in.(failed,unreadable)&select=message_id,status,attempts,error,subject,email_from,email_date&order=at.desc&limit=50`)) || []
    out.push({ mailbox: mb, job, jobs, progress, problems })
  }
  return out
}
