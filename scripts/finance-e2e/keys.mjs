// HS256 keys for the local stack (test secret only, never a real project)
import crypto from 'node:crypto'
export const JWT_SECRET = 'finance-e2e-local-secret-at-least-32-characters-long'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
export function jwt(payload) {
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64({ iss: 'supabase-local', iat: 1767225600, exp: 2082758400, ...payload })
  return `${head}.${body}.${crypto.createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`
}
export const ANON = jwt({ role: 'anon' })
export const SERVICE = jwt({ role: 'service_role' })
if (process.argv[2] === 'print') console.log(JSON.stringify({ ANON, SERVICE }))
