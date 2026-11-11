// The local "Supabase URL" (:54321) for the end-to-end test: routes /auth/v1, /rest/v1 and /storage/v1 to
// the GoTrue, PostgREST and Storage containers like Supabase's own gateway does, and serves /api/* by
// running the real api/[fn].js handler with the small Vercel request/response helpers it relies on.
import http from 'node:http'

const PORT = 54321
const API_PORT = 54322
const UP = { '/auth/v1': 'http://127.0.0.1:9999', '/rest/v1': 'http://127.0.0.1:3000', '/storage/v1': 'http://127.0.0.1:5000' }
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' }

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return }
  const prefix = Object.keys(UP).find((k) => req.url.startsWith(k))
  if (!prefix) { res.writeHead(404, CORS); res.end('{}'); return }
  const target = new URL(UP[prefix] + req.url.slice(prefix.length))
  const headers = { ...req.headers, host: target.host }
  const up = http.request(target, { method: req.method, headers }, (r) => {
    const h = { ...r.headers, ...CORS }
    res.writeHead(r.statusCode, h)
    r.pipe(res)
  })
  up.on('error', (e) => { res.writeHead(502, CORS); res.end(JSON.stringify({ error: e.message })) })
  req.pipe(up)
}).listen(PORT, '127.0.0.1', () => console.log(`gateway on :${PORT}`))

// /api/* with Vercel-style helpers
const { default: api } = await import('../../api/[fn].js')
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  let raw = ''
  for await (const c of req) raw += c
  req.body = raw && (req.headers['content-type'] || '').includes('json') ? JSON.parse(raw) : raw
  req.query = Object.fromEntries(url.searchParams)
  req.query.fn = url.pathname.split('/').filter(Boolean).pop()
  res.status = (s) => { res.statusCode = s; return res }
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res }
  try { await api(req, res) } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })) }
}).listen(API_PORT, '127.0.0.1', () => console.log(`api on :${API_PORT}`))
