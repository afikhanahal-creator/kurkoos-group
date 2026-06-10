// ============================================================
// Vercel serverless function — מפיץ מייל לנמענים על כל ליד חדש (זמן אמת).
// משתני סביבה (Vercel → Settings → Environment Variables):
//   SUPABASE_URL                 (או VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY    — מפתח service role (קורא נמענים/הגדרות, עוקף RLS)
//   RESEND_API_KEY               — מפתח Resend לשליחת מיילים
//   NOTIFY_FROM                  — כתובת השולח (ברירת מחדל onboarding@resend.dev)
// נקרא מ-cms.js בכל createLead (fire-and-forget), וגם לשליחת מייל בדיקה.
// ============================================================

const FIELD_LABELS = {
  name: 'שם', phone: 'טלפון', email: 'אימייל', project: 'פרויקט',
  message: 'הודעה', source: 'מקור', notes: 'הערות', created_at: 'תאריך',
}
const SOURCE_LABELS = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }
const DEFAULT_FIELDS = ['name', 'phone', 'email', 'project', 'message', 'source', 'created_at']

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM = process.env.NOTIFY_FROM || 'Kurkoos Leads <onboarding@resend.dev>'

  if (!SUPABASE_URL || !SERVICE_KEY) { res.status(500).json({ error: 'חסר SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY בהגדרות Vercel' }); return }
  if (!RESEND_API_KEY) { res.status(500).json({ error: 'חסר RESEND_API_KEY בהגדרות Vercel' }); return }

  const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  const sbGet = async (path) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders })
    if (!r.ok) throw new Error(`Supabase ${r.status}`)
    return r.json()
  }

  try {
    const [settingsRows, recipients] = await Promise.all([
      sbGet('lead_notify_settings?id=eq.1&select=*'),
      sbGet('lead_notify_recipients?active=eq.true&select=*'),
    ])
    const settings = settingsRows[0] || { enabled: true, subject: 'ליד חדש מהאתר: {{name}}', include_fields: DEFAULT_FIELDS }
    if (!settings.enabled) { res.status(200).json({ ok: true, skipped: 'disabled' }); return }

    const to = recipients.map((r) => r.email).filter(Boolean)
    if (!to.length) { res.status(200).json({ ok: true, skipped: 'no_recipients' }); return }

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const isTest = !!body.test
    const lead = isTest
      ? { name: 'ליד בדיקה', phone: '050-0000000', email: 'test@example.com', project: 'בדיקת מערכת', message: 'זוהי הודעת בדיקה ממסך הגדרות ההתראות.', source: 'contact', created_at: new Date().toISOString() }
      : (body.lead || {})

    const fields = Array.isArray(settings.include_fields) && settings.include_fields.length ? settings.include_fields : DEFAULT_FIELDS
    const val = (k) => {
      let v = lead[k]
      if (k === 'source') v = SOURCE_LABELS[v] || v
      if (k === 'project' && v && typeof v === 'object') v = v.he || v.en || ''
      if (k === 'created_at' && v) { try { v = new Date(v).toLocaleString('he-IL') } catch { /* ignore */ } }
      return (v == null || v === '') ? '—' : String(v)
    }
    const projectName = (lead.project && typeof lead.project === 'object') ? (lead.project.he || lead.project.en || '') : (lead.project || '')
    const subject = (settings.subject || 'ליד חדש מהאתר: {{name}}')
      .replace(/{{\s*name\s*}}/g, lead.name || 'ללא שם')
      .replace(/{{\s*project\s*}}/g, projectName)
      + (isTest ? ' (בדיקה)' : '')

    const rows = fields.map((k) =>
      `<tr><td style="padding:7px 14px;color:#647c8c;font-weight:700;white-space:nowrap;border-bottom:1px solid #e4eaed">${FIELD_LABELS[k] || k}</td><td style="padding:7px 14px;color:#07293a;border-bottom:1px solid #e4eaed">${val(k)}</td></tr>`
    ).join('')
    const html = `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:8px">
      <h2 style="color:#07293a;border-bottom:3px solid #a90b0c;padding-bottom:8px;margin:0 0 14px">ליד חדש מהאתר</h2>
      <table style="width:100%;border-collapse:collapse;background:#f4f7f9;border-radius:10px;overflow:hidden">${rows}</table>
      <p style="color:#9fb6c2;font-size:12px;margin-top:18px">התקבל אוטומטית ממערכת הניהול של קורקוס גרופ</p>
    </div>`

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html, reply_to: settings.reply_to || undefined }),
    })
    const out = await r.json().catch(() => ({}))
    if (!r.ok) { res.status(502).json({ error: out.message || 'שגיאת Resend', detail: out }); return }
    res.status(200).json({ ok: true, sent: to.length, id: out.id })
  } catch (e) {
    res.status(500).json({ error: e.message || 'שגיאה לא ידועה' })
  }
}
