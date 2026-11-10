// Gmail / Google Workspace through the official Gmail API, read-only (gmail.readonly).
// Never sends, changes or deletes mail.
import { env } from '../env.js'
import { fetchRetry, json } from '../http.js'

export const label = 'Gmail'
export const configured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly openid email'

// hint: the address to connect (Google opens straight on it); choose: show Google's account picker (another mailbox)
export function authUrl(state, redirectUri, { hint = '', choose = false } = {}) {
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: choose ? 'select_account consent' : 'consent', include_granted_scopes: 'true', state })
  if (hint) q.set('login_hint', hint)
  return `${env.googleAuthorize()}?${q}`
}

async function token(params) {
  const r = await fetchRetry(`${env.googleOauth()}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...params }) })
  return json(r, 'google token')
}

export async function exchange(code, redirectUri) {
  const t = await token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  const p = await api(t.access_token, 'profile')
  return { email: String(p.emailAddress || '').toLowerCase(), refresh_token: t.refresh_token, access_token: t.access_token, expires_in: t.expires_in }
}
export const refresh = (refreshToken) => token({ grant_type: 'refresh_token', refresh_token: refreshToken })
export async function revoke(refreshToken) {
  await fetch(`${env.googleOauth()}/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' }).catch(() => {})
}

async function api(accessToken, path) {
  return json(await fetchRetry(`${env.gmailApi()}/${path}`, { headers: { Authorization: `Bearer ${accessToken}` } }), 'gmail')
}

// The words an invoice email carries, plus any email with a document attached (PDF, image, TIFF, ZIP, Word, Excel): Claude decides what is
// financial, so an invoice whose subject says nothing ("Your October statement", "מסמך מצורף") is still found.
// Gmail search covers the inbox, labels and archived mail (not spam or trash).
const BASE = '(subject:(חשבונית OR קבלה OR "חשבון עסקה" OR זיכוי OR invoice OR receipt OR "tax invoice" OR billing OR payment OR statement) OR filename:(חשבונית OR קבלה OR invoice OR receipt) OR "סה״כ לתשלום" OR "total due" OR "amount paid" OR (has:attachment filename:(pdf OR jpg OR jpeg OR png OR tif OR tiff OR zip OR docx OR xlsx))) -in:sent -in:chats -in:drafts'

export async function listCandidates(accessToken, since, extra, { until, max = 500 } = {}) {
  const q = `${BASE} after:${Math.floor(since.getTime() / 1000)}${until ? ` before:${Math.floor(until.getTime() / 1000)}` : ''}${extra ? ` ${extra}` : ''}`
  const ids = []
  let page = ''
  do {
    const list = await api(accessToken, `messages?maxResults=100&q=${encodeURIComponent(q)}${page ? `&pageToken=${page}` : ''}`)
    for (const m of list.messages || []) ids.push(m.id)
    page = list.nextPageToken || ''
  } while (page && ids.length < max)
  return ids
}

function walk(part, out = []) {
  if (!part) return out
  if (part.filename && part.body && (part.body.attachmentId || part.body.data)) out.push(part)
  for (const p of part.parts || []) walk(p, out)
  return out
}
function body(part, mime) {
  if (!part) return ''
  if (part.mimeType === mime && part.body?.data && !part.filename) return Buffer.from(part.body.data, 'base64url').toString('utf8')
  for (const p of part.parts || []) { const t = body(p, mime); if (t) return t }
  return ''
}

export async function getMessage(accessToken, id) {
  const msg = await api(accessToken, `messages/${id}?format=full`)
  const h = (n) => (msg.payload?.headers || []).find((x) => x.name.toLowerCase() === n)?.value || ''
  return {
    id,
    subject: h('subject'),
    from: h('from'),
    date: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
    html: body(msg.payload, 'text/html'),
    text: body(msg.payload, 'text/plain'),
    files: walk(msg.payload).map((p) => ({
      name: p.filename,
      mime: p.mimeType,
      size: p.body.size || 0,
      load: async () => Buffer.from(p.body.attachmentId ? (await api(accessToken, `messages/${id}/attachments/${p.body.attachmentId}`)).data : p.body.data, 'base64url'),
    })),
  }
}
