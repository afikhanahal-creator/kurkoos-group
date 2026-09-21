// ============================================================
// Vercel serverless function — מפיץ מייל לנמענים על כל ליד חדש (זמן אמת).
// משתני סביבה (Vercel → Settings → Environment Variables):
//   SUPABASE_URL                 (או VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY    — מפתח service role (קורא נמענים/הגדרות, עוקף RLS)
//   RESEND_API_KEY               — מפתח Resend לשליחת מיילים
//   NOTIFY_FROM                  — כתובת השולח (ברירת מחדל onboarding@resend.dev)
// נקרא מ-cms.js בכל createLead (fire-and-forget), וגם לשליחת מייל בדיקה.
// ============================================================

// Rate limiter פשוט בזיכרון — מגן מפני SPAM/flood בכל instance של Vercel
const _rl = new Map()
function rateLimit(ip, max = 15, windowMs = 60_000) {
  const now = Date.now()
  const e = _rl.get(ip) || { n: 0, reset: now + windowMs }
  if (now > e.reset) { e.n = 0; e.reset = now + windowMs }
  e.n++
  _rl.set(ip, e)
  if (_rl.size > 5_000) _rl.clear()
  return e.n > max
}

const FIELD_LABELS = {
  name: 'שם', phone: 'טלפון', email: 'אימייל', project: 'פרויקט',
  message: 'הודעה', source: 'מקור', notes: 'הערות', created_at: 'תאריך',
}
const SOURCE_LABELS = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }
const DEFAULT_FIELDS = ['name', 'phone', 'email', 'project', 'message', 'source', 'created_at']

// מונע HTML injection — מחליף תווים מיוחדים בישויות HTML בטוחות
function htmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
    if (typeof fetch !== 'function') { res.status(500).json({ error: 'הסביבה לא תומכת ב-fetch (גרסת Node ישנה מדי ב-Vercel — הגדירו Node 18+)' }); return }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
    if (rateLimit(ip, 15, 60_000)) { res.status(429).json({ error: 'יותר מדי בקשות — נסו שוב בעוד דקה' }); return }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM = process.env.NOTIFY_FROM || 'Kurkoos Leads <onboarding@resend.dev>'

    if (!SUPABASE_URL || !SERVICE_KEY) { res.status(500).json({ error: 'חסר SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY בהגדרות Vercel (ודאו גם שעשיתם Redeploy)' }); return }
    if (!RESEND_API_KEY) { res.status(500).json({ error: 'חסר RESEND_API_KEY בהגדרות Vercel (ודאו גם שעשיתם Redeploy)' }); return }

    // body — עשוי להגיע כאובייקט (Vercel פירסר) או כמחרוזת JSON
    const body = (req.body && typeof req.body === 'object')
      ? req.body
      : (() => { try { return JSON.parse(req.body || '{}') } catch { return {} } })()

    // בקשות test מגיעות רק ממסך האדמין — דורשות JWT תקף של Supabase
    const isTest = !!body.test
    if (isTest) {
      const authHeader = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim()
      if (!authHeader) { res.status(401).json({ error: 'Unauthorized — test requires admin session' }); return }
      const authCheck = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${authHeader}` },
      })
      if (!authCheck.ok) { res.status(401).json({ error: 'Unauthorized — invalid session' }); return }
    }

    const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    const sbGet = async (path) => {
      const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, { headers: sbHeaders })
      const txt = await r.text()
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${txt.slice(0, 180)}`)
      try { return JSON.parse(txt) } catch { return [] }
    }

    const [settingsRows, recipients] = await Promise.all([
      sbGet('lead_notify_settings?id=eq.1&select=*'),
      sbGet('lead_notify_recipients?active=eq.true&select=*'),
    ])
    const settings = (Array.isArray(settingsRows) && settingsRows[0]) || { enabled: true, subject: 'ליד חדש מהאתר: {{name}}', include_fields: DEFAULT_FIELDS }
    if (!settings.enabled) { res.status(200).json({ ok: true, skipped: 'disabled' }); return }

    const to = (Array.isArray(recipients) ? recipients : []).map((r) => r.email).filter(Boolean)
    if (!to.length) { res.status(200).json({ ok: true, skipped: 'no_recipients' }); return }

    const lead = isTest
      ? { name: 'ליד בדיקה', phone: '050-0000000', email: 'test@example.com', project: 'בדיקת מערכת', message: 'זוהי הודעת בדיקה ממסך הגדרות ההתראות.', source: 'contact', created_at: new Date().toISOString() }
      : (body.lead || {})

    const fields = Array.isArray(settings.include_fields) && settings.include_fields.length ? settings.include_fields : DEFAULT_FIELDS
    const val = (k) => {
      let v = lead[k]
      if (k === 'source') v = SOURCE_LABELS[v] || v
      if (k === 'project' && v && typeof v === 'object') v = v.he || v.en || v.slug || ''
      if (k === 'created_at' && v) {
        try { v = new Date(v).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) }
        catch { try { v = new Date(v).toLocaleString('he-IL') } catch { /* ignore */ } }
      }
      return (v == null || v === '') ? '—' : String(v)
    }
    const projectName = (lead.project && typeof lead.project === 'object') ? (lead.project.he || lead.project.en || '') : (lead.project || '')
    const projectSlug = (lead.project && typeof lead.project === 'object') ? (lead.project.slug || '') : ''
    const PROJECT_URL = projectSlug ? `${SITE}/projects/${projectSlug}` : ''
    const safeName = String(lead.name || 'ללא שם').slice(0, 100).replace(/[\r\n]/g, ' ')
    const safeProject = String(projectName).slice(0, 100).replace(/[\r\n]/g, ' ')
    const subject = (settings.subject || 'ליד חדש מהאתר: {{name}}')
      .replace(/{{\s*name\s*}}/g, safeName)
      .replace(/{{\s*project\s*}}/g, safeProject)
      + (isTest ? ' (בדיקה)' : '')

    const SITE = process.env.SITE_URL || 'https://www.kurkoos-group.co.il'
    const ADMIN_URL = `${SITE}/admin`
    const LOGO = `${SITE}/kurkoos-logo-nadlan.png`

    const font = "'Heebo','Assistant','Segoe UI',Arial,sans-serif"
    // ערך תא — כל ערכי המשתמש עוברים htmlEsc למניעת HTML injection במייל לאדמין
    const cell = (k) => {
      const v = val(k)
      if (v === '—') return `<span style="font-family:${font};color:#9aa6b2">—</span>`
      const safe = htmlEsc(v)
      if (k === 'phone') return `<a href="tel:${String(lead.phone || '').replace(/[^\d+]/g, '')}" style="font-family:${font};color:#07293a;text-decoration:none;font-weight:800">${safe}</a>`
      if (k === 'email') return `<a href="mailto:${htmlEsc(lead.email)}" style="font-family:${font};color:#07293a;text-decoration:none;font-weight:800">${safe}</a>`
      return safe
    }
    const rows = fields.map((k, i) =>
      `<tr>
        <td style="padding:14px 18px;vertical-align:middle;width:34%;background:${i % 2 ? '#ffffff' : '#eef3f6'};border-bottom:1px solid #dfe7ec"><span style="font-family:${font};font-size:13px;font-weight:700;color:#105572">${FIELD_LABELS[k] || k}</span></td>
        <td style="padding:14px 18px;vertical-align:middle;background:${i % 2 ? '#ffffff' : '#eef3f6'};border-bottom:1px solid #dfe7ec"><span style="font-family:${font};font-size:16px;font-weight:700;color:#07293a;line-height:1.5">${cell(k)}</span></td>
      </tr>`
    ).join('')

    // כפתורי פעולה מהירה (התקשרות / וואטסאפ / מייל)
    const digits = String(lead.phone || '').replace(/\D/g, '')
    const wa = digits ? (digits.startsWith('972') ? digits : '972' + digits.replace(/^0/, '')) : ''
    // אייקון לפני הטקסט (אימוג'י נתמך בכל לקוחות המייל המודרניים, כולל מובייל)
    const actionBtn = (href, icon, label, bg) =>
      `<a href="${href}" style="font-family:${font};display:inline-block;margin:5px 4px;padding:11px 22px;background:${bg || '#105572'};color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700"><span style="font-size:15px;vertical-align:middle">${icon}</span>&nbsp;${label}</a>`
    const quickActions = (lead.phone || lead.email) ? `
          <tr><td align="center" style="padding:6px 36px 10px">
            ${lead.phone ? actionBtn(`tel:${digits}`, '📞', 'התקשרות') : ''}
            ${wa ? actionBtn(`https://wa.me/${wa}`, '💬', 'וואטסאפ', '#25D366') : ''}
            ${lead.email ? actionBtn(`mailto:${lead.email}`, '📩', 'מייל ללקוח') : ''}
          </td></tr>` : ''

    const html = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    </head><body style="margin:0;padding:0;background:#eef2f5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5">
      <tr><td align="center" style="padding:32px 14px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 16px 46px rgba(7,41,58,0.16)">
          <!-- באנר כותרת כהה (פלטת המותג) -->
          <tr><td style="background:#07293a;padding:34px 40px;text-align:center">
            <div style="font-family:${font};font-size:12px;font-weight:700;letter-spacing:0.22em;color:#8fb6c8">התראת מערכת</div>
            <h1 style="font-family:${font};font-weight:900;font-size:30px;color:#ffffff;margin:10px 0 0">ליד חדש מהאתר</h1>
            ${projectName ? `<div style="font-family:${font};font-size:16px;font-weight:700;color:#f0c040;margin:10px 0 0">📌 פרויקט: ${htmlEsc(projectName)}</div>` : ''}
            <div style="width:54px;height:4px;background:#a90b0c;border-radius:2px;margin:16px auto 0"></div>
          </td></tr>
          <!-- אינטרו -->
          <tr><td style="padding:24px 40px 4px;text-align:center">
            <p style="font-family:${font};font-size:15px;font-weight:600;color:#58606e;margin:0">התקבלה פנייה חדשה דרך האתר · להלן הפרטים</p>
          </td></tr>
          <!-- פרטים -->
          <tr><td style="padding:16px 40px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #dfe7ec;border-radius:10px;overflow:hidden">${rows}</table>
          </td></tr>
          <!-- כפתורים ראשיים -->
          <tr><td align="center" style="padding:30px 40px 6px">
            <a href="${ADMIN_URL}" style="font-family:${font};display:inline-block;background:#a90b0c;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:15px 46px;border-radius:10px;box-shadow:0 8px 20px rgba(169,11,12,0.30)">צפייה בליד במערכת</a>
            ${PROJECT_URL ? `&nbsp;&nbsp;<a href="${PROJECT_URL}" style="font-family:${font};display:inline-block;background:#105572;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:15px 28px;border-radius:10px">🏢 עמוד הפרויקט</a>` : ''}
          </td></tr>
          ${quickActions}
          <!-- פוטר עם לוגו -->
          <tr><td style="padding:32px 40px 38px;text-align:center;border-top:1px solid #e7edf1;background:#ffffff">
            <img src="${LOGO}" alt="Kurkoos Group" width="132" style="display:inline-block;width:132px;max-width:58%;height:auto" />
            <p style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.14em;color:#8a97a3;margin:16px 0 0">נכסים · בנייה · יזמות · פיקוח · תיווך</p>
            <p style="font-family:${font};font-size:11px;color:#aeb8c0;margin:7px 0 0">הודעה אוטומטית ממערכת הניהול של קבוצת קורקוס</p>
          </td></tr>
        </table>
      </td></tr>
    </table></body></html>`

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html, reply_to: settings.reply_to || undefined }),
    })
    const outTxt = await r.text()
    let out = {}; try { out = JSON.parse(outTxt) } catch { /* non-JSON */ }
    if (!r.ok) {
      res.status(502).json({ error: `Resend ${r.status}: ${out.message || out.error?.message || outTxt.slice(0, 200) || 'שגיאת שליחה'}`, detail: out })
      return
    }
    res.status(200).json({ ok: true, sent: to.length, id: out.id })
  } catch (e) {
    res.status(500).json({ error: 'שגיאת שרת: ' + (e && e.message ? e.message : String(e)) })
  }
}
