// Sign-in security: the second step (TOTP) for the roles that require it, a record of every sign-in and failed
// attempt, a mail on a sign-in from a new device, blocking a user, and ending every session of a user.
// The same rules live in the database (fin_has_role): this file is the server's half, never the only check.
import { env } from './env.js'
import { sb, one, insert, rpc, audit } from './db.js'

/* the token's claims. The token was already verified by the auth server (caller() in db.js); this only reads it. */
export function claims(token) {
  try { return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8')) || {} } catch { return {} }
}
export async function mfaRoles() {
  const row = await one("fin_settings?key=eq.mfa_required_roles&select=value").catch(() => null)
  return Array.isArray(row?.value) ? row.value : []
}
/* null when the caller may act; otherwise the reason */
export async function mfaBlock(user) {
  if (!user?.role) return null
  const roles = await mfaRoles()
  if (!roles.includes(user.role)) return null
  return claims(user.token).aal === 'aal2' ? null : 'MFA_REQUIRED'
}

const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 64)
const uaOf = (req) => String(req.headers['user-agent'] || '').slice(0, 300)
const device = (ua) => {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'מכשיר'
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'דפדפן'
  return `${br} ב-${os}`
}

/* a failed sign-in, reported by the sign-in screen (no session yet). Only an email and a time are kept; never a password. */
const failures = new Map()
export async function loginFailed(req, body) {
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: true }
  const key = `${ipOf(req)}|${email}`; const now = Date.now()
  const list = (failures.get(key) || []).filter((t) => now - t < 15 * 60_000); list.push(now); failures.set(key, list)
  if (failures.size > 5000) failures.clear()
  if (list.length > 20) return { ok: true }   // a flood from one address is not written row by row
  const m = await one(`fin_members?email=eq.${encodeURIComponent(email)}&select=user_id`).catch(() => null)
  await insert('fin_login_events', { user_id: m?.user_id || null, email, kind: 'failed', ip: ipOf(req), user_agent: uaOf(req) }, 'return=minimal').catch(() => {})
  return { ok: true, recent: list.length }
}

/* an event of the signed-in person: signed in, second step added or used, idle timeout, signed out everywhere */
const SELF_KINDS = ['signed_in', 'mfa_enrolled', 'mfa_verified', 'mfa_failed', 'mfa_removed', 'signed_out_all', 'idle_timeout']
export async function authEvent(req, body, user) {
  const kind = String(body.kind || '')
  if (!SELF_KINDS.includes(kind)) { const e = new Error('סוג אירוע לא מוכר'); e.status = 400; throw e }
  const deviceId = String(body.device_id || '').replace(/[^\w-]/g, '').slice(0, 64) || null
  let newDevice = null
  if (kind === 'signed_in' && deviceId) {
    const seen = await one(`fin_login_events?user_id=eq.${user.id}&kind=eq.signed_in&device_id=eq.${deviceId}&select=id`).catch(() => null)
    const any = await one(`fin_login_events?user_id=eq.${user.id}&kind=eq.signed_in&select=id`).catch(() => null)
    newDevice = !seen && !!any                        // the very first sign-in is not "a new device"
    if (newDevice) await alertNewDevice(user, req).catch(() => {})
  }
  await insert('fin_login_events', { user_id: user.id, email: user.email, kind, ip: ipOf(req), user_agent: uaOf(req), device_id: deviceId, new_device: newDevice }, 'return=minimal')
  if (kind === 'signed_out_all') await rpc('fin_end_sessions', { p_user: user.id }).catch(() => {})
  return { ok: true, new_device: newDevice }
}

async function alertNewDevice(user, req) {
  if (!process.env.RESEND_API_KEY || !user.email) return
  const when = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
  await fetch(`${env.resendApi()}/emails`, {
    method: 'POST', signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.FINANCE_FROM || process.env.NOTIFY_FROM || 'Kurkoos Finance <onboarding@resend.dev>', to: [user.email],
      subject: 'כניסה חדשה ל-Kurkoos Finance ממכשיר שלא הכרנו',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;color:#1f2a33;line-height:1.6"><p>שלום,</p><p>החשבון שלך נכנס עכשיו למערכת הכספים ממכשיר חדש:</p><p><b>${device(uaOf(req))}</b><br>${when}<br>כתובת IP: ${ipOf(req) || 'לא ידועה'}</p><p>אם זה לא היית את/ה, היכנס/י למערכת ובחר/י בהגדרות "ניתוק מכל המכשירים", ושנה/י את הסיסמה.</p></div>`,
    }),
  })
}

/* an admin blocks or unblocks a member: the auth server refuses their sign-in, every session ends now, history stays */
export async function blockMember({ userId, blocked, user }) {
  if (userId === user.id) { const e = new Error('אי אפשר לחסום את עצמך'); e.status = 400; throw e }
  const m = await one(`fin_members?user_id=eq.${userId}&select=user_id,email,role`)
  if (!m) { const e = new Error('המשתמש לא נמצא'); e.status = 404; throw e }
  const r = await fetch(`${env.sbUrl()}/auth/v1/admin/users/${userId}`, { method: 'PUT', headers: { apikey: env.sbKey(), Authorization: `Bearer ${env.sbKey()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ban_duration: blocked ? '876000h' : 'none' }) })
  if (!r.ok) { const e = new Error(`שרת ההתחברות סירב (${r.status})`); e.status = 502; throw e }
  await sb(`fin_members?user_id=eq.${userId}`, { method: 'PATCH', body: { active: !blocked }, prefer: 'return=minimal' })
  const ended = blocked ? await rpc('fin_end_sessions', { p_user: userId }).catch(() => 0) : 0
  await insert('fin_login_events', { user_id: userId, email: m.email, kind: blocked ? 'blocked' : 'unblocked' }, 'return=minimal').catch(() => {})
  await audit('member', userId, blocked ? 'blocked' : 'unblocked', { email: m.email, sessions_ended: ended }, user)
  return { ok: true, sessions_ended: ended }
}

/* an admin signs a member out of every device (a lost phone, someone who left) */
export async function endSessions({ userId, user }) {
  const m = await one(`fin_members?user_id=eq.${userId}&select=email`)
  if (!m) { const e = new Error('המשתמש לא נמצא'); e.status = 404; throw e }
  const ended = await rpc('fin_end_sessions', { p_user: userId })
  await insert('fin_login_events', { user_id: userId, email: m.email, kind: 'sessions_ended' }, 'return=minimal').catch(() => {})
  await audit('member', userId, 'sessions_ended', { email: m.email, sessions: ended }, user)
  return { ok: true, sessions_ended: ended }
}

/* sessions, second step and last activity of every member, for the user management screen */
export async function memberSecurity() {
  return (await rpc('fin_member_security', {}).catch(() => [])) || []
}
