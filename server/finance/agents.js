// The daily run (Vercel cron) and the automations it drives. Each automation records its own
// last run, status and error in fin_automations, and each agent records its batch in fin_agent_runs.
import { env, TIME_BUDGET_MS } from './env.js'
import { rpc, sb, one, patch, insert, agentRun, audit } from './db.js'
import { syncMailbox, processStored, MAX_ATTEMPTS } from './pipeline.js'

export function newRuns(trigger) {
  const make = async () => ({
    scanner: await agentRun('scanner', trigger),
    collector: await agentRun('collector', trigger),
    ocr: await agentRun('ocr', trigger),
    validation: await agentRun('validation', trigger),
    classification: await agentRun('classification', trigger),
  })
  return make()
}
export async function closeRuns(runs) {
  for (const r of Object.values(runs)) await r.done()
}
/* an upload touches only the reading agents */
export async function newDocRuns(trigger) {
  const ocr = await agentRun('ocr', trigger); const validation = await agentRun('validation', trigger); const classification = await agentRun('classification', trigger)
  return { ocr, validation, classification, collector: { stat: { processed: 0, errors: 0, details: {} }, done: async () => {} }, scanner: { stat: { processed: 0, errors: 0, details: {} }, done: async () => {} } }
}

const nextRun = (frequency, cfg = {}) => {
  const d = new Date()
  d.setUTCHours(3, 23, 0, 0)
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else if (frequency === 'monthly') { d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(Number(cfg.day) || 1) }
  else return null
  return d.toISOString()
}

async function automation(key, fn, { force = false } = {}) {
  const a = await one(`fin_automations?key=eq.${key}&select=*`)
  if (!a) return { key, status: 'missing' }
  if (!a.enabled && !force) return { key, status: 'disabled' }
  if (!force && a.frequency === 'monthly' && new Date().getUTCDate() !== (Number(a.config?.day) || 1)) return { key, status: 'not_today' }
  let status = 'ok'; let error = null; let result = null
  try { result = await fn(a.config || {}) } catch (e) { status = 'error'; error = String(e.message || e).slice(0, 500) }
  await patch(`fin_automations?key=eq.${key}`, { last_run_at: new Date().toISOString(), last_status: status, last_error: error, next_run_at: nextRun(a.frequency, a.config), updated_at: new Date().toISOString() }).catch(() => {})
  return { key, status, error, result }
}

export async function syncAll({ mailboxId, trigger = 'manual', started = Date.now(), user, onlyBackfill = false } = {}) {
  let boxes = (await sb(`fin_mailboxes?status=in.(active,error)${mailboxId ? `&id=eq.${mailboxId}` : ''}${onlyBackfill ? '&backfill_pending=is.true' : ''}&select=*&order=last_scan_at.asc.nullsfirst`)) || []
  if (user && user.role === 'employee') boxes = boxes.filter((b) => b.connected_by === user.id)
  const runs = await newRuns(trigger)
  const results = []
  for (const mb of boxes) {
    if (Date.now() - started > TIME_BUDGET_MS) { results.push({ mailbox: mb.email, complete: false, error: null, deferred: true }); continue }
    results.push(await syncMailbox(mb, started, runs, trigger))
  }
  runs.scanner.stat.details.mailboxes = boxes.length
  await closeRuns(runs)
  // what this run cost in Claude calls (triage + reading + second reading), for the history scan's running total
  results.cost_usd = Math.round(((runs.ocr.stat.details.cost_usd || 0) + (runs.collector.stat.details.triage_usd || 0)) * 10000) / 10000
  return results
}

/* failed readings whose backoff time has come (15 min, 1 h, 4 h, 12 h), and documents stuck "in processing"
   because a function died half way (a deploy, a timeout). Nothing is lost: the original file is always stored. */
export async function retryFailed({ max = MAX_ATTEMPTS, started = Date.now(), trigger = 'retry', force = false, stuckOnly = false } = {}) {
  const now = encodeURIComponent(new Date().toISOString())
  const due = force ? '' : `&or=(next_retry_at.is.null,next_retry_at.lte.${now})`
  // failures counts readings that failed in a row (a success resets it), so successful re-reads never use up retries
  const docs = stuckOnly ? [] : (await sb(`fin_documents?status=eq.failed&failures=lt.${max}&file_path=not.is.null${due}&select=*&order=updated_at.asc&limit=20`)) || []
  const stuckBefore = encodeURIComponent(new Date(Date.now() - 10 * 60_000).toISOString())
  const stuck = (await sb(`fin_documents?status=eq.processing&failures=lt.${MAX_ATTEMPTS}&file_path=not.is.null&or=(stage_at.lt.${stuckBefore},and(stage_at.is.null,created_at.lt.${stuckBefore}))&select=*&limit=20`)) || []
  if (!docs.length && !stuck.length) return { retried: 0, recovered: 0, stuck: 0 }
  const runs = await newDocRuns(trigger)
  let ok = 0; let unstuck = 0
  for (const d of [...stuck, ...docs]) {
    // a reading takes up to ~20 s: never start one that cannot finish inside the function limit
    if (Date.now() - started > TIME_BUDGET_MS - 20_000) break
    const r = await processStored(d, runs, 'retry', started)
    if (r && r.status && r.status !== 'failed') { ok++; if (d.status === 'processing') unstuck++ }
  }
  await closeRuns(runs)
  return { retried: docs.length, recovered: ok, stuck: stuck.length, unstuck }
}

/* the engine between the nightly runs: recover and retry, and when the last collection is older than the
   configured gap, a short incremental collection. Runs when the cron calls it or when someone opens the app. */
export async function engineTick({ started = Date.now(), trigger = 'tick', force = false } = {}) {
  let claimed = force
  if (!claimed) {
    const r = await rpc('fin_engine_claim', { p_minutes: 5 }).catch((e) => (/fin_engine_claim|schema cache/.test(String(e.message)) ? 'missing' : false))
    if (r === 'missing') return { skipped: 'not_installed', hint: 'run supabase/finance.sql (v9)' }
    claimed = r === true
  }
  if (!claimed) return { skipped: 'busy' }
  // collection and retries happen once a night (runDaily). Between nights only documents a crashed function left
  // "in processing" are read again (an admin can force a full retry from the agents screen)
  const out = { retry: await retryFailed({ started, trigger, stuckOnly: !force }) }
  try { const { flushOutbound } = await import('./outbound.js'); out.outbound = await flushOutbound({ budgetMs: 8_000 }) } catch { /* optional */ }
  return out
}

async function managers() {
  return ((await sb("fin_members?active=eq.true&role=in.(admin,finance_manager)&select=email")) || []).map((m) => m.email).filter(Boolean)
}
export async function sendMail(to, subject, html) {
  const key = process.env.RESEND_API_KEY
  if (!key || !to.length) return { sent: false, reason: key ? 'no recipients' : 'RESEND_API_KEY missing' }
  const r = await fetch(`${env.resendApi()}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FINANCE_FROM || process.env.NOTIFY_FROM || 'Kurkoos Finance <onboarding@resend.dev>', to, subject, html }),
  })
  if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return { sent: true }
}

/* Agent 7: the day's numbers, read from the stored records (not from AI) */
export async function buildSummary(now = new Date()) {
  const from = new Date(now.getTime() - 24 * 3600_000).toISOString()
  const count = async (path) => ((await sb(`${path}&select=id`)) || []).length
  const data = {
    since: from,
    collected: await count(`fin_documents?created_at=gte.${from}`),
    processed: await count(`fin_documents?processed_at=gte.${from}&status=neq.failed`),
    review: await count('fin_documents?status=eq.review'),
    duplicates: await count(`fin_documents?status=eq.duplicate&created_at=gte.${from}`),
    failed_docs: await count('fin_documents?status=eq.failed'),
    failed_mailboxes: ((await sb("fin_mailboxes?status=eq.error&select=email,last_error")) || []),
    ready_to_export: await count('fin_documents?status=eq.approved&exported_at=is.null'),
    by_whatsapp: await count(`fin_documents?created_at=gte.${from}&source=eq.whatsapp`),
    by_email: await count(`fin_documents?created_at=gte.${from}&mailbox_id=not.is.null`),
    by_upload: await count(`fin_documents?created_at=gte.${from}&source=in.(upload,camera)`),
    suspected_duplicates: await count('fin_documents?duplicate_state=eq.suspected&status=eq.review'),
    needs_person: await count(`fin_documents?status=eq.failed&failures=gte.${MAX_ATTEMPTS}`),
    verified: await count(`fin_documents?processed_at=gte.${from}&extraction->verification->second=not.is.null`),
    ai_tokens: ((await sb(`fin_documents?processed_at=gte.${from}&select=ai_tokens_in,ai_tokens_out`)) || []).reduce((a, d) => a + (d.ai_tokens_in || 0) + (d.ai_tokens_out || 0), 0),
  }
  return data
}

const summaryHtml = (d, origin) => `<div dir="rtl" style="font-family:Arial,sans-serif;color:#1a1f2b">
<h2 style="color:#07293a">KURKOOS FINANCE AI · דוח בוקר</h2>
<table cellpadding="6" style="border-collapse:collapse">
<tr><td>נאספו ב-24 השעות האחרונות</td><td><b>${d.collected}</b> (מייל ${d.by_email ?? 0}, WhatsApp ${d.by_whatsapp ?? 0}, העלאה וצילום ${d.by_upload ?? 0})</td></tr>
<tr><td>עובדו בהצלחה</td><td><b>${d.processed}</b></td></tr>
<tr><td>ממתינים לבדיקה</td><td><b>${d.review}</b></td></tr>
<tr><td>כפילויות שזוהו</td><td><b>${d.duplicates}</b>${d.suspected_duplicates ? ` ועוד ${d.suspected_duplicates} חשודות לבדיקה` : ''}</td></tr>
<tr><td>מסמכים שהקריאה שלהם נכשלה</td><td><b>${d.failed_docs}</b></td></tr>
<tr><td>תיבות מייל עם תקלה</td><td><b>${d.failed_mailboxes.length}</b>${d.failed_mailboxes.map((m) => `<br><small>${m.email}: ${m.last_error || ''}</small>`).join('')}</td></tr>
<tr><td>מאושרים ומוכנים לייצוא</td><td><b>${d.ready_to_export}</b></td></tr>
</table>
<p>כל המסמכים שבדוח נשמרו במערכת.${d.needs_person ? ` ${d.needs_person} מסמכים לא נקראו גם אחרי 3 ניסיונות ומחכים לטיפול ידני.` : ''}</p>
<p><a href="${origin}/admin/finance">לכניסה למערכת</a></p></div>`

export async function dailySummary({ origin = '', email = true } = {}) {
  const run = await agentRun('summary', 'cron')
  try {
    const data = await buildSummary()
    const day = new Date().toISOString().slice(0, 10)
    let sentTo = []
    if (email) { const to = await managers(); const s = await sendMail(to, `דוח בוקר · נאספו ${data.collected}, ${data.review} לבדיקה${data.failed_mailboxes.length ? `, ${data.failed_mailboxes.length} תיבות עם תקלה` : ''}`, summaryHtml(data, origin)); if (s.sent) sentTo = to; run.stat.details.email = s }
    await sb('fin_summaries', { method: 'POST', body: { day, data, sent_to: sentTo }, prefer: 'resolution=merge-duplicates,return=minimal' })
    run.stat.processed = 1
    await run.done('ok')
    return data
  } catch (e) { run.stat.errors = 1; run.stat.details.error = String(e.message || e); await run.done('error'); throw e }
}

/* the whole daily run */
export async function runDaily(origin) {
  const started = Date.now()
  const out = []
  out.push(await automation('daily_scan', () => syncAll({ trigger: 'cron', started })))
  out.push(await automation('retry_failed', () => retryFailed({ started, trigger: 'cron' })))
  // the scan engine runs every minute through pg_cron; if that is not set up yet, the night run moves active scans on too
  try { const { tick, ensureCoverage } = await import('./scan.js'); out.push({ key: 'scan_coverage', result: await ensureCoverage({}) }); out.push({ key: 'scan_engine', result: await tick({ started, trigger: 'cron' }) }) } catch (e) { out.push({ key: 'scan_engine', error: String(e.message || e).slice(0, 200) }) }
  out.push(await automation('connection_alerts', async () => {
    const bad = (await sb('fin_mailboxes?status=eq.error&select=email,last_error')) || []
    if (!bad.length) return { alerts: 0 }
    return sendMail(await managers(), `תיבת מייל מנותקת · ${bad.map((b) => b.email).join(', ')}`, `<div dir="rtl">${bad.map((b) => `<p><b>${b.email}</b>: ${b.last_error || ''}</p>`).join('')}<p><a href="${origin}/admin/finance/mailboxes">לחיבור מחדש</a></p></div>`)
  }))
  out.push(await automation('missing_docs', async () => {
    // regular suppliers (3 of the last 4 months) with nothing yet this month
    const since = new Date(); since.setUTCMonth(since.getUTCMonth() - 4); since.setUTCDate(1)
    const rows = (await sb(`fin_documents?issue_date=gte.${since.toISOString().slice(0, 10)}&status=in.(review,approved,sent)&select=supplier_name,accounting_period`)) || []
    const now = new Date().toISOString().slice(0, 7)
    const by = {}
    for (const r of rows) if (r.supplier_name) (by[r.supplier_name] ||= new Set()).add(r.accounting_period)
    const missing = Object.entries(by).filter(([, s]) => s.size >= 3 && !s.has(now)).map(([n]) => n)
    if (missing.length) await sendMail(await managers(), `חסרות ${missing.length} חשבוניות קבועות החודש`, `<div dir="rtl"><p>לא הגיעה עדיין חשבונית החודש מ:</p><ul>${missing.map((m) => `<li>${m}</li>`).join('')}</ul></div>`)
    return { missing }
  }))
  out.push(await automation('outbound', async () => { const { flushOutbound } = await import('./outbound.js'); return flushOutbound({ max: 200, started, budgetMs: 40_000, trigger: 'cron' }) }))
  out.push(await automation('cloud_sync', async () => { const { syncCloud } = await import('./cloud.js'); return syncCloud({ started, trigger: 'cron' }) }))

  out.push(await automation('monthly_package', async () => {
    const prev = new Date(); prev.setUTCDate(1); prev.setUTCMonth(prev.getUTCMonth() - 1)
    const period = prev.toISOString().slice(0, 7)
    const ready = ((await sb(`fin_documents?accounting_period=eq.${period}&status=eq.approved&exported_at=is.null&select=id`)) || []).length
    const pending = ((await sb(`fin_documents?accounting_period=eq.${period}&status=in.(review,processing,failed)&select=id`)) || []).length
    await sendMail(await managers(), `חבילת ${period} לרו״ח: ${ready} מאושרים, ${pending} עוד לא נבדקו`, `<div dir="rtl"><p>${ready} מסמכים מאושרים מחודש ${period} מוכנים לייצוא, ו-${pending} עוד מחכים לבדיקה.</p><p><a href="${origin}/admin/finance/integrations">לייצוא</a></p></div>`)
    return { period, ready, pending }
  }))
  await audit('automation', 'daily', 'cron_run', { results: out.map((o) => ({ key: o.key, status: o.status, error: o.error })) }, null)
  return out
}


/* the morning: the report of what the night collected (in the app, and by email when enabled) */
export async function morningReport(origin) {
  const started = Date.now()
  // the report reads the database only: no mail scan and no AI in the morning
  void started
  return [await automation('morning_report', (cfg) => dailySummary({ origin, email: cfg.email !== false }))]
}
