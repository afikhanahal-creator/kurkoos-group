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
