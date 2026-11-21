/* fetch with retries for the providers: 429 and 5xx are retried with backoff (1s, 3s), other errors are not */
export async function fetchRetry(url, opts = {}, tries = 3) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts)
      if (r.status !== 429 && r.status < 500) return r
      last = r
    } catch (e) { last = e }
    if (i < tries - 1) await new Promise((res) => setTimeout(res, i === 0 ? 1000 : 3000))
  }
  if (last instanceof Error) throw last
  return last
}
export async function json(r, label) {
  const d = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error((d.error && (d.error.message || d.error_description)) || d.error_description || (typeof d.error === 'string' ? d.error : '') || `${label} ${r.status}`)
    e.status = r.status
    e.code = typeof d.error === 'string' ? d.error : d.error && d.error.code
    throw e
  }
  return d
}

/* ---------- Claude: the one place the finance server calls the Messages API ----------
   opts: beta (an anthropic-beta value), tries (0 = one attempt, no retry), signal.
   Returns the HTTP response; `claudeText(d)` is the text of an answer. */
export async function claudePost(body, { beta, tries = 3, signal } = {}) {
  const { env } = await import('./env.js')
  const req = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.anthropicKey(), 'anthropic-version': '2023-06-01', ...(beta ? { 'anthropic-beta': beta } : {}) },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  }
  const url = `${env.anthropic()}/v1/messages`
  return tries ? fetchRetry(url, req, tries) : fetch(url, req)
}
export const claudeText = (d) => ((d && d.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

/* ---------- e-mail: the one place the finance server calls Resend ----------
   The sender is the finance system's own: FINANCE_FROM, else the site's verified address under the name "Kurkoos Finance"
   (the site's NOTIFY_FROM is "Kurkoos Leads <…>", the name of the lead notifications). */
export function financeFrom(e = process.env) {
  if (e.FINANCE_FROM) return e.FINANCE_FROM
  const addr = /<([^>]+)>/.exec(String(e.NOTIFY_FROM || ''))?.[1] || (/^[^\s<>]+@[^\s<>]+$/.test(String(e.NOTIFY_FROM || '').trim()) ? String(e.NOTIFY_FROM).trim() : '')
  return `Kurkoos Finance <${addr || 'onboarding@resend.dev'}>`
}
export const mailReady = () => !!process.env.RESEND_API_KEY
/** POST one message to Resend; `from` is filled in. Returns the HTTP response (the caller decides what a failure means). */
export async function resendPost(message, timeoutMs = 15_000) {
  const { env } = await import('./env.js')
  return fetch(`${env.resendApi()}/emails`, {
    method: 'POST', signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: financeFrom(), ...message }),
  })
}
