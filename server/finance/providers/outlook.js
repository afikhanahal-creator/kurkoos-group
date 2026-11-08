// Outlook / Microsoft 365 / Exchange Online through Microsoft Graph, read-only (Mail.Read).
// Never sends, changes or deletes mail.
import { env } from '../env.js'
import { fetchRetry, json } from '../http.js'

export const label = 'Outlook'
export const configured = () => !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET)
const SCOPE = 'offline_access openid email User.Read Mail.Read'

export function authUrl(state, redirectUri) {
  const q = new URLSearchParams({ client_id: process.env.MS_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', response_mode: 'query', scope: SCOPE, prompt: 'select_account', state })
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

const WORDS = /חשבונית|קבלה|חשבון עסקה|זיכוי|invoice|receipt|billing|payment|statement|סה"?״?כ לתשלום|total due|amount paid/i

// every message since the date that has an attachment or invoice words (all folders, archive included)
export async function listCandidates(accessToken, since) {
  const ids = []
  let url = `/messages?$filter=${encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`)}&$select=id,subject,hasAttachments,bodyPreview&$orderby=receivedDateTime desc&$top=50`
  while (url && ids.length < 500) {
    const page = await api(accessToken, url)
    for (const m of page.value || []) if (m.hasAttachments || WORDS.test(`${m.subject} ${m.bodyPreview}`)) ids.push(m.id)
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
