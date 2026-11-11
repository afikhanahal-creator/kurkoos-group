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

// Every message since the date, like the history scan (not spam, trash, drafts, chats or sent mail). The daily collection
// used to search for invoice words or an attachment with a known ending; an invoice whose subject says nothing of the
// kind ("פרסום באתר Yad2") and whose file has no such ending was read by the year scan and missed by the daily one.
// What is financial is decided after listing: the sender rules and the cheap check first, a full reading only if needed.
const BASE = '-in:spam -in:trash -in:sent -in:chats -in:drafts'

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

/* the scan engine lists every message of a time window, page by page (500 a page, Gmail's maximum), and keeps the page
   token as its checkpoint. Spam, trash, drafts and chats are left out; sent mail only when asked. after/before are exact
   seconds, so no message falls between two windows whatever the time zone. */
export async function listPage(accessToken, { from, to, pageToken = '', includeSent = false }) {
  const q = `-in:spam -in:trash -in:drafts -in:chats${includeSent ? '' : ' -in:sent'} after:${Math.floor(from.getTime() / 1000) - 1} before:${Math.floor(to.getTime() / 1000)}`
  const list = await api(accessToken, `messages?maxResults=500&includeSpamTrash=false&q=${encodeURIComponent(q)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)
  return { ids: (list.messages || []).map((m) => m.id), next: list.nextPageToken || '', estimate: list.resultSizeEstimate ?? null }
}
