// Outlook / Microsoft 365 / Exchange Online through Microsoft Graph, read-only (Mail.Read).
// Never sends, changes or deletes mail.
import { env } from '../env.js'
import { fetchRetry, json } from '../http.js'

export const label = 'Outlook'
export const configured = () => !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET)
const SCOPE = 'offline_access openid email User.Read Mail.Read'

export function authUrl(state, redirectUri, { hint = '', choose = true } = {}) {
  const q = new URLSearchParams({ client_id: process.env.MS_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', response_mode: 'query', scope: SCOPE, prompt: choose || !hint ? 'select_account' : 'login', state })
  if (hint) q.set('login_hint', hint)
  return `${env.msLogin()}/authorize?${q}`
}
async function token(params) {
  const r = await fetchRetry(`${env.msLogin()}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID, client_secret: process.env.MS_CLIENT_SECRET, scope: SCOPE, ...params }) })
  return json(r, 'microsoft token')
}
async function api(accessToken, path) {
  return json(await fetchRetry(path.startsWith('http') ? path : `${env.graphApi()}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } }), 'graph')
}
export async function exchange(code, redirectUri) {
  const t = await token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  const me = await api(t.access_token, '?$select=mail,userPrincipalName')
  return { email: String(me.mail || me.userPrincipalName || '').toLowerCase(), refresh_token: t.refresh_token, access_token: t.access_token, expires_in: t.expires_in }
}
export const refresh = (refreshToken) => token({ grant_type: 'refresh_token', refresh_token: refreshToken })
export async function revoke() { /* Microsoft has no token revoke endpoint for this flow; the secret row is deleted */ }


// every message since the date (all folders, archive included)
export async function listCandidates(accessToken, since, _extra, { until, max = 500 } = {}) {
  const ids = []
  let url = `/messages?$filter=${encodeURIComponent(`receivedDateTime ge ${since.toISOString()}${until ? ` and receivedDateTime lt ${until.toISOString()}` : ''}`)}&$select=id,subject,hasAttachments,bodyPreview&$orderby=receivedDateTime desc&$top=50`
  while (url && ids.length < max) {
    const page = await api(accessToken, url)
    for (const m of page.value || []) ids.push(m.id)   // every message: what is financial is decided after listing, as in the history scan
    url = page['@odata.nextLink'] || ''
  }
  return ids
}

export async function getMessage(accessToken, id) {
  const m = await api(accessToken, `/messages/${id}?$select=id,subject,from,receivedDateTime,body,hasAttachments`)
  const atts = m.hasAttachments ? (await api(accessToken, `/messages/${id}/attachments`)).value || [] : []
  const html = m.body?.contentType === 'html' ? m.body.content : ''
  return {
    id,
    subject: m.subject || '',
    from: m.from?.emailAddress ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>` : '',
    date: m.receivedDateTime || null,
    html,
    text: m.body?.contentType === 'text' ? m.body.content : '',
    files: atts.filter((a) => a['@odata.type'] === '#microsoft.graph.fileAttachment' && !a.isInline).map((a) => ({
      name: a.name, mime: a.contentType, size: a.size || 0, load: async () => Buffer.from(a.contentBytes || '', 'base64'),
    })),
  }
}

/* the scan engine lists every message of a time window, page by page, in every folder except junk, deleted items and
   drafts (sent items only when asked); the next-page link is the checkpoint */
const SKIP_FOLDERS = ['junkemail', 'deleteditems', 'drafts']
const folderCache = new Map()
async function skippedFolders(accessToken, includeSent) {
  const key = `${accessToken.slice(-12)}|${includeSent}`
  if (!folderCache.has(key)) {
    const ids = []
    for (const f of [...SKIP_FOLDERS, ...(includeSent ? [] : ['sentitems'])]) { try { ids.push((await api(accessToken, `/mailFolders/${f}?$select=id`)).id) } catch { /* a folder that does not exist */ } }
    folderCache.set(key, new Set(ids.filter(Boolean)))
  }
  return folderCache.get(key)
}
export async function listPage(accessToken, { from, to, pageToken = '', includeSent = false }) {
  const skip = await skippedFolders(accessToken, includeSent)
  const url = pageToken || `/messages?$filter=${encodeURIComponent(`receivedDateTime ge ${from.toISOString()} and receivedDateTime lt ${to.toISOString()}`)}&$select=id,parentFolderId&$orderby=receivedDateTime desc&$top=250`
  const page = await api(accessToken, url)
  return { ids: (page.value || []).filter((m) => !skip.has(m.parentFolderId)).map((m) => m.id), next: page['@odata.nextLink'] || '', estimate: null }
}
