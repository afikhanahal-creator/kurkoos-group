// ============================================================
// Vercel serverless: which services the content engine is connected to.
// GET /api/status          -> { claude, openai, video:{provider,model,configured}, metricool, storage, models } (booleans only, no secrets)
// GET /api/status?test=claude|openai|video  (signed in admin) -> makes one tiny real call and returns { ok, ms, detail }
// ============================================================

async function adminUser(req) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || !SUPABASE_URL || !KEY) return null
  const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } }).catch(() => null)
  if (!r || !r.ok) return null
  const u = await r.json().catch(() => null)
  return u && u.id ? u : null
}

function snapshot() {
  const prov = (process.env.VIDEO_PROVIDER || 'openai').toLowerCase()
  const videoKey = prov === 'veo' ? !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY) : !!process.env.OPENAI_API_KEY
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    video: { provider: prov, model: prov === 'veo' ? (process.env.VEO_MODEL || 'veo-3.0-generate-001') : (process.env.OPENAI_VIDEO_MODEL || 'sora-2'), configured: videoKey },
    metricool: !!(process.env.METRICOOL_USER_TOKEN || process.env.METRICOOL_TOKEN),
    storage: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    models: { quick: process.env.CLAUDE_MODEL_QUICK || 'claude-haiku-4-5-20251001', default: process.env.CLAUDE_MODEL_DEFAULT || 'claude-sonnet-5-5', complex: process.env.CLAUDE_MODEL_COMPLEX || 'claude-opus-5-5' },
  }
}

async function test(which) {
  const t0 = Date.now()
  if (which === 'claude') {
    const KEY = process.env.ANTHROPIC_API_KEY
    if (!KEY) return { ok: false, detail: 'ANTHROPIC_API_KEY חסר' }
    const model = process.env.CLAUDE_MODEL_QUICK || 'claude-haiku-4-5-20251001'
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'ענה במילה אחת: שלום' }] }) })
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, ms: Date.now() - t0, detail: r.ok ? ('מודל ' + (d.model || model)) : ((d.error && d.error.message) || ('HTTP ' + r.status)) }
  }
  if (which === 'openai' || which === 'video') {
    const prov = (process.env.VIDEO_PROVIDER || 'openai').toLowerCase()
    if (which === 'video' && prov === 'veo') {
      const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY
      if (!KEY) return { ok: false, detail: 'GEMINI_API_KEY חסר' }
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=1`)
      return { ok: r.ok, ms: Date.now() - t0, detail: r.ok ? 'Gemini API מגיב' : ('HTTP ' + r.status) }
    }
    const KEY = process.env.OPENAI_API_KEY
    if (!KEY) return { ok: false, detail: 'OPENAI_API_KEY חסר' }
    const r = await fetch('https://api.openai.com/v1/models/gpt-image-1', { headers: { Authorization: `Bearer ${KEY}` } })
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, ms: Date.now() - t0, detail: r.ok ? 'OpenAI מגיב, gpt-image-1 זמין' : ((d.error && d.error.message) || ('HTTP ' + r.status)) }
  }
  return { ok: false, detail: 'לא ידוע' }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const which = String((req.query && req.query.test) || '')
  res.setHeader('Cache-Control', 'no-store')
  if (!which) { res.status(200).json(snapshot()); return }
  const user = await adminUser(req)
  if (!user) { res.status(401).json({ error: 'צריך להתחבר לאדמין' }); return }
  try { res.status(200).json(await test(which)) } catch (e) { res.status(200).json({ ok: false, detail: String((e && e.message) || e) }) }
}
