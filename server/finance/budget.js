// The spending cap of the automatic readings (docs/finance/AI-COST.md).
// What the agents spent is already written per run (fin_agent_runs.details: cost_usd of the reading, triage_usd of the
// short check). A day cap and a month cap (fin_settings.ai_budget, admins edit them in the agents screen) stop the
// AUTOMATIC readings when reached: mail and its history scan, and the nightly retries. A file that arrives then is stored,
// waits with the issue "budget_wait" and is read the next night. What a person sends (an upload, WhatsApp, "read again")
// is always read: the cap is a guard against a runaway, never a wall in front of someone's work.
import { sb, one, insert, patch } from './db.js'

export const DEFAULT_BUDGET = { day_usd: 2, month_usd: 20 }
const TZ = 'Asia/Jerusalem'
// midnight in Israel, as an instant: the day and the month the office sees
function startOf(kind, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]))
  const local = Date.UTC(+p.year, +p.month - 1, kind === 'month' ? 1 : +p.day)
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(now.getTime() / 60_000) * 60_000
  return new Date(local - offset)
}

export async function caps() {
  const v = (await one('fin_settings?key=eq.ai_budget&select=value').catch(() => null))?.value || {}
  const n = (x, d) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : d)
  return { day_usd: n(v.day_usd, DEFAULT_BUDGET.day_usd), month_usd: n(v.month_usd, DEFAULT_BUDGET.month_usd) }
}
export async function saveCaps({ day_usd, month_usd }, user) {
  const ok = (x) => Number.isFinite(Number(x)) && Number(x) >= 0 && Number(x) <= 10_000
  if (!ok(day_usd) || !ok(month_usd)) throw Object.assign(new Error('סכום לא תקין'), { status: 400 })
  const value = { day_usd: Math.round(Number(day_usd) * 100) / 100, month_usd: Math.round(Number(month_usd) * 100) / 100 }
  const body = { value, updated_by: user?.id || null, updated_at: new Date().toISOString() }
  const done = await patch('fin_settings?key=eq.ai_budget', body).catch(() => null)
  if (!done || (Array.isArray(done) && !done.length)) await insert('fin_settings', { key: 'ai_budget', ...body })
  cache = null
  return value
}

const usdOf = (r) => (Number(r.cost) || 0) + (Number(r.triage) || 0)
async function runsSince(t) {
  return (await sb(`fin_agent_runs?agent=in.(ocr,collector)&started_at=gte.${encodeURIComponent(t.toISOString())}&select=started_at,agent,processed,cost:details->>cost_usd,triage:details->>triage_usd,small:details->>tier_small,esc:details->>tier_escalated,mid:details->>tier_mid,first:details->>first_usd&limit=20000`).catch(() => [])) || []
}

// spent in this process since the last look (a run writes its cost when it ends): counted at once
let local = 0
let cache = null
export const noteSpend = (usd) => { local += Number(usd) || 0 }

export async function spend() {
  if (cache && Date.now() - cache.at < 30_000) return { ...cache.v, day: cache.v.day + local - cache.local, month: cache.v.month + local - cache.local }
  const day0 = startOf('day'); const month0 = startOf('month')
  const rows = await runsSince(month0)
  const v = { day: 0, month: 0 }
  for (const r of rows) { const u = usdOf(r); v.month += u; if (new Date(r.started_at) >= day0) v.day += u }
  cache = { at: Date.now(), v, local }
  return { ...v }
}
/* is the automatic reading over its cap? { over: false } or { over: 'day' | 'month', spent, cap } */
export async function overBudget() {
  const [c, s] = await Promise.all([caps(), spend()])
  if (s.month >= c.month_usd) return { over: 'month', spent: s.month, cap: c.month_usd }
  if (s.day >= c.day_usd) return { over: 'day', spent: s.day, cap: c.day_usd }
  return { over: false }
}

/* the agents screen: what the readings cost today, this month and per document, and how often the small model was enough */
export async function report() {
  const c = await caps()
  const since30 = new Date(Date.now() - 30 * 86400_000)
  const month0 = startOf('month'); const day0 = startOf('day')
  const rows = await runsSince(month0 < since30 ? month0 : since30)
  const sum = (list, f) => list.reduce((a, r) => a + (Number(f(r)) || 0), 0)
  const inMonth = rows.filter((r) => new Date(r.started_at) >= month0)
  const inDay = rows.filter((r) => new Date(r.started_at) >= day0)
  const last30 = rows.filter((r) => new Date(r.started_at) >= since30)
  const ocr30 = last30.filter((r) => r.agent === 'ocr')
  const small = sum(ocr30, (r) => r.small); const esc = sum(ocr30, (r) => r.esc); const mid = sum(ocr30, (r) => r.mid)
  const reads = small + esc + mid
  const docs = sum(ocr30, (r) => r.processed)
  const waiting = (await sb('fin_documents?status=eq.failed&issues=cs.[{"code":"budget_wait"}]&select=id&limit=1000').catch(() => [])) || []
  return {
    caps: c,
    today: Math.round(sum(inDay, usdOf) * 10000) / 10000,
    month: Math.round(sum(inMonth, usdOf) * 10000) / 10000,
    last30: Math.round(sum(last30, usdOf) * 10000) / 10000,
    per_doc: docs ? Math.round((sum(ocr30, (r) => r.cost) / docs) * 10000) / 10000 : null,
    docs30: docs,
    tiers: { small, escalated: esc, mid, share_small: reads ? Math.round((small / reads) * 100) : null },
    first_usd: Math.round(sum(ocr30, (r) => r.first) * 10000) / 10000,
    waiting: waiting.length,
  }
}
