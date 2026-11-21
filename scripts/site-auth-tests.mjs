// The site handlers' admin check (server/_auth.js): a signed-in account that is not site staff is refused.
// Run: node scripts/site-auth-tests.mjs
import assert from 'node:assert/strict'
process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
const { adminUser, isStaff, bearer } = await import('../server/_auth.js')

let world
const calls = []
globalThis.fetch = async (url, o = {}) => {
  calls.push({ url: String(url), auth: o.headers && o.headers.Authorization })
  const tok = String((o.headers && o.headers.Authorization) || '').replace('Bearer ', '')
  const J = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
  if (String(url).endsWith('/auth/v1/user')) return world.users[tok] ? J(200, { id: world.users[tok] }) : J(401, {})
  if (String(url).endsWith('/rpc/is_site_staff')) {
    if (world.rpc === 'missing') return J(404, {})
    if (world.rpc === 'down') throw new Error('network')
    return world.users[tok] ? J(200, world.staff.includes(world.users[tok])) : J(401, {})
  }
  throw new Error('unexpected ' + url)
}
const req = (t) => ({ headers: t ? { authorization: 'Bearer ' + t } : {} })
let n = 0
const t = async (name, fn) => { await fn(); n++; console.log('ok', name) }

world = { users: { a: 'u1', b: 'u2' }, staff: ['u1'], rpc: 'ok' }
await t('A1 staff account is accepted', async () => assert.equal((await adminUser(req('a'))).id, 'u1'))
await t('A2 signed-in account that is not staff is refused', async () => assert.equal(await adminUser(req('b')), null))
await t('A3 no token, or an unknown token, is refused', async () => { assert.equal(await adminUser(req('')), null); assert.equal(await adminUser(req('zzz')), null); assert.equal(await isStaff('zzz'), false) })
await t('A4 the staff question is asked with the user token, never the service key', async () => { calls.length = 0; await adminUser(req('a')); const c = calls.find((x) => x.url.includes('is_site_staff')); assert.equal(c.auth, 'Bearer a') })
await t('A5 database without the staff list: a signed-in account is accepted as before', async () => { world.rpc = 'missing'; assert.equal((await adminUser(req('b'))).id, 'u2') })
await t('A6 staff question fails: refused, not accepted', async () => { world.rpc = 'down'; assert.equal(await adminUser(req('a')), null) })
await t('A7 bearer reads the header in any case', async () => assert.equal(bearer({ headers: { authorization: 'bearer  x ' } }), 'x'))
console.log(`${n}/7 passed`)
