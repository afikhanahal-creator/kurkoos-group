// The daily run (Vercel cron) and the automations it drives. Each automation records its own
// last run, status and error in fin_automations, and each agent records its batch in fin_agent_runs.
import { env, TIME_BUDGET_MS } from './env.js'
import { sb, one, patch, insert, agentRun, audit } from './db.js'
import { syncMailbox, processStored } from './pipeline.js'

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

export async function syncAll({ mailboxId, trigger = 'manual', started = Date.now(), user } = {}) {
  let boxes = (await sb(`fin_mailboxes?status=in.(active,error)${mailboxId ? `&id=eq.${mailboxId}` : ''}&select=*&order=last_scan_at.asc.nullsfirst`)) || []
  if (user && user.role === 'employee') boxes = boxes.filter((b) => b.connected_by === user.id)
  const runs = await newRuns(trigger)
  const results = []
  for (const mb of boxes) {
    if (Date.now() - started > TIME_BUDGET_MS) { results.push({ mailbox: mb.email, complete: false, error: null, deferred: true }); continue }
    results.push(await syncMailbox(mb, started, runs, trigger))
  }
  runs.scanner.stat.details.mailboxes = boxes.length
  await closeRuns(runs)
  return results
}

export async function retryFailed({ max = 3, started = Date.now(), trigger = 'retry' } = {}) {
  const docs = (await sb(`fin_documents?status=eq.failed&attempts=lt.${max}&file_path=not.is.null&select=*&order=updated_at.asc&limit=20`)) || []
  if (!docs.length) return { retried: 0 }
  const runs = await newDocRuns(trigger)
  let ok = 0
  for (const d of docs) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    const r = await processStored(d, runs, 'retry')
    if (r && r.status !== 'failed') ok++
  }
  await closeRuns(runs)
  return { retried: docs.length, recovered: ok }
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
export async function buildSummary(day = new Date()) {
  const from = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - 1)).toISOString()
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
  }
  return data
}

const summaryHtml = (d, origin) => `<div dir="rtl" style="font-family:Arial,sans-serif;color:#1a1f2b">
<h2 style="color:#07293a">סיכום יומי · הנהלת חשבונות קורקוס</h2>
<table cellpadding="6" style="border-collapse:collapse">
<tr><td>מסמכים חדשים שנאספו</td><td><b>${d.collected}</b></td></tr>
<tr><td>עובדו בהצלחה</td><td><b>${d.processed}</b></td></tr>
<tr><td>ממתינים לבדיקה</td><td><b>${d.review}</b></td></tr>
<tr><td>כפילויות שזוהו</td><td><b>${d.duplicates}</b></td></tr>
<tr><td>מסמכים שהקריאה שלהם נכשלה</td><td><b>${d.failed_docs}</b></td></tr>
<tr><td>תיבות מייל עם תקלה</td><td><b>${d.failed_mailboxes.length}</b>${d.failed_mailboxes.map((m) => `<br><small>${m.email}: ${m.last_error || ''}</small>`).join('')}</td></tr>
<tr><td>מאושרים ומוכנים לייצוא</td><td><b>${d.ready_to_export}</b></td></tr>
</table>
<p><a href="${origin}/admin/finance">לכניסה למערכת</a></p></div>`

export async function dailySummary({ origin = '', email = true } = {}) {
  const run = await agentRun('summary', 'cron')
  try {
    const data = await buildSummary()
    const day = new Date().toISOString().slice(0, 10)
    let sentTo = []
    if (email) { const to = await managers(); const s = await sendMail(to, `סיכום יומי · ${data.collected} חדשים, ${data.review} לבדיקה`, summaryHtml(data, origin)); if (s.sent) sentTo = to; run.stat.details.email = s }
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
  out.push(await automation('retry_failed', (cfg) => retryFailed({ max: Number(cfg.max_attempts) || 3, started, trigger: 'cron' })))
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
  out.push(await automation('daily_summary', (cfg) => dailySummary({ origin, email: cfg.email !== false })))
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

