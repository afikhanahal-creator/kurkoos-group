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

    const SITE = process.env.SITE_URL || 'https://www.kurkoos-group.co.il'
    const ADMIN_URL = `${SITE}/admin`
    const LOGO = `${SITE}/kurkoos-groip-logo.png`

    // ערך תא — טלפון/אימייל הופכים לקישור ללחיצה ישירה
    const cell = (k) => {
      const v = val(k)
      if (v === '—') return '<span style="color:#9fb6c2">—</span>'
      if (k === 'phone') return `<a href="tel:${String(lead.phone || '').replace(/[^\d+]/g, '')}" style="color:#0d3a52;text-decoration:none;font-weight:700">${v}</a>`
      if (k === 'email') return `<a href="mailto:${lead.email}" style="color:#0d3a52;text-decoration:none;font-weight:700">${v}</a>`
      return v
    }
    const rows = fields.map((k, i) =>
      `<tr>
        <td style="padding:13px 18px;color:#7c8f9b;font-weight:700;font-size:13px;white-space:nowrap;width:32%;background:${i % 2 ? '#ffffff' : '#f6f9fb'};border-bottom:1px solid #eef3f5">${FIELD_LABELS[k] || k}</td>
        <td style="padding:13px 18px;color:#07293a;font-size:15px;font-weight:600;background:${i % 2 ? '#ffffff' : '#f6f9fb'};border-bottom:1px solid #eef3f5">${cell(k)}</td>
      </tr>`
    ).join('')

    // כפתורי פעולה מהירה (התקשרות / וואטסאפ / מייל) — רק כשיש טלפון/אימייל
    const digits = String(lead.phone || '').replace(/\D/g, '')
    const wa = digits ? (digits.startsWith('972') ? digits : '972' + digits.replace(/^0/, '')) : ''
    const actionBtn = (href, label, bg) => `<a href="${href}" style="display:inline-block;margin:4px 5px;padding:10px 20px;background:${bg};color:#ffffff;text-decoration:none;border-radius:9px;font-size:13px;font-weight:700">${label}</a>`
    const quickActions = (lead.phone || lead.email) ? `
          <tr><td align="center" style="padding:2px 26px 10px">
            ${lead.phone ? actionBtn(`tel:${digits}`, 'התקשרות', '#0d3a52') : ''}
            ${wa ? actionBtn(`https://wa.me/${wa}`, 'וואטסאפ', '#1f7a4d') : ''}
            ${lead.email ? actionBtn(`mailto:${lead.email}`, 'מייל ללקוח', '#0d3a52') : ''}
          </td></tr>` : ''

    const html = `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;padding:0;background:#e9eff2">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9eff2">
      <tr><td align="center" style="padding:30px 14px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 14px 44px rgba(7,41,58,0.14);font-family:'Segoe UI',Arial,Helvetica,sans-serif">
          <!-- כותרת: תווית מימין, לוגו משמאל-למעלה -->
          <tr><td style="padding:24px 28px 16px;background:#ffffff">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="right" style="vertical-align:middle">
                <div style="color:#b9962f;font-size:11px;letter-spacing:0.16em;font-weight:700">התראת מערכת</div>
                <div style="color:#07293a;font-size:23px;font-weight:800;margin-top:5px">ליד חדש מהאתר</div>
              </td>
              <td align="left" style="vertical-align:middle;width:150px">
                <img src="${LOGO}" alt="Kurkoos Group" height="42" style="display:block;height:42px;width:auto;margin-inline-start:auto" />
              </td>
            </tr></table>
          </td></tr>
          <!-- קו זהב מפריד -->
          <tr><td style="padding:0 28px"><div style="height:2px;background:linear-gradient(90deg,#c9a45a,#e7d6a8,rgba(201,164,90,0))"></div></td></tr>
          <!-- אינטרו -->
          <tr><td style="padding:20px 28px 6px"><p style="margin:0;color:#3f535f;font-size:14px;line-height:1.6">התקבלה פנייה חדשה דרך האתר. להלן פרטי הליד:</p></td></tr>
          <!-- טבלת פרטים -->
          <tr><td style="padding:10px 28px 6px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #eef3f5;border-radius:12px;overflow:hidden">${rows}</table>
          </td></tr>
          <!-- כפתור ראשי: צפייה בליד -->
          <tr><td align="center" style="padding:22px 28px 6px">
            <a href="${ADMIN_URL}" style="display:inline-block;background:#a90b0c;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 36px;border-radius:11px;box-shadow:0 6px 16px rgba(169,11,12,0.28)">צפייה בליד במערכת</a>
          </td></tr>
          ${quickActions}
          <!-- פוטר -->
          <tr><td style="padding:22px 28px 26px;text-align:center;border-top:1px solid #eef3f5;background:#fbfcfd">
            <p style="margin:0;color:#9fb6c2;font-size:11px;line-height:1.8">הודעה אוטומטית ממערכת הניהול של קבוצת קורקוס<br>נכסים · בנייה · יזמות · פיקוח · תיווך</p>
          </td></tr>
        </table>
      </td></tr>
    </table></body></html>`

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
