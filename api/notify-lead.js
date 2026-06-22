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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
    if (typeof fetch !== 'function') { res.status(500).json({ error: 'הסביבה לא תומכת ב-fetch (גרסת Node ישנה מדי ב-Vercel — הגדירו Node 18+)' }); return }

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

    const serif = "Georgia,'Times New Roman','Times',serif"
    // ערך תא — טלפון/אימייל הופכים לקישור ללחיצה ישירה
    const cell = (k) => {
      const v = val(k)
      if (v === '—') return '<span style="color:#b7bcae">—</span>'
      if (k === 'phone') return `<a href="tel:${String(lead.phone || '').replace(/[^\d+]/g, '')}" style="color:#0c2230;text-decoration:none">${v}</a>`
      if (k === 'email') return `<a href="mailto:${lead.email}" style="color:#0c2230;text-decoration:none">${v}</a>`
      return v
    }
    const rows = fields.map((k, i, arr) => {
      const border = i < arr.length - 1 ? 'border-bottom:1px solid #ece7da;' : ''
      return `<tr>
        <td style="padding:15px 0 15px 18px;vertical-align:top;width:34%;${border}"><span style="font-family:${serif};font-size:12px;color:#b08d4f;letter-spacing:0.04em">${FIELD_LABELS[k] || k}</span></td>
        <td style="padding:15px 0;vertical-align:top;${border}"><span style="font-family:${serif};font-size:16px;color:#0c2230;line-height:1.5">${cell(k)}</span></td>
      </tr>`
    }).join('')

    // כפתורי פעולה מהירה (התקשרות / וואטסאפ / מייל) — סגנון אאוטליין מעודן
    const digits = String(lead.phone || '').replace(/\D/g, '')
    const wa = digits ? (digits.startsWith('972') ? digits : '972' + digits.replace(/^0/, '')) : ''
    const actionBtn = (href, label) => `<a href="${href}" style="font-family:${serif};display:inline-block;margin:5px 4px;padding:10px 22px;border:1px solid #d8cfbd;color:#0c2230;text-decoration:none;border-radius:2px;font-size:13px;letter-spacing:0.03em">${label}</a>`
    const quickActions = (lead.phone || lead.email) ? `
          <tr><td align="center" style="padding:6px 40px 8px">
            ${lead.phone ? actionBtn(`tel:${digits}`, 'התקשרות') : ''}
            ${wa ? actionBtn(`https://wa.me/${wa}`, 'וואטסאפ') : ''}
            ${lead.email ? actionBtn(`mailto:${lead.email}`, 'מייל ללקוח') : ''}
          </td></tr>` : ''

    const html = `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;padding:0;background:#f1efe9">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9">
      <tr><td align="center" style="padding:34px 14px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #eae4d7;font-family:${serif}">
          <!-- כותרת מגזין -->
          <tr><td style="padding:42px 40px 0;text-align:center">
            <div style="font-family:${serif};font-size:12px;letter-spacing:0.24em;color:#b08d4f">התראת מערכת</div>
            <h1 style="font-family:${serif};font-weight:400;font-size:31px;color:#0c2230;margin:12px 0 0;letter-spacing:0.01em">ליד חדש מהאתר</h1>
          </td></tr>
          <!-- קו זהב כפול -->
          <tr><td style="padding:24px 40px 0">
            <div style="border-top:2px solid #c2a35c"></div>
            <div style="border-top:1px solid #e7e0d2;margin-top:3px"></div>
          </td></tr>
          <!-- אינטרו -->
          <tr><td style="padding:20px 40px 0;text-align:center">
            <p style="font-family:${serif};font-style:italic;font-size:15px;color:#5b6b74;margin:0">התקבלה פנייה חדשה דרך האתר · להלן הפרטים</p>
          </td></tr>
          <!-- פרטים -->
          <tr><td style="padding:14px 40px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
          </td></tr>
          <!-- כפתור ראשי -->
          <tr><td align="center" style="padding:32px 40px 6px">
            <a href="${ADMIN_URL}" style="font-family:${serif};display:inline-block;background:#0c2230;color:#ffffff;text-decoration:none;font-size:15px;letter-spacing:0.05em;padding:15px 44px;border-radius:2px">צפייה בליד במערכת</a>
          </td></tr>
          ${quickActions}
          <!-- פוטר עם לוגו -->
          <tr><td style="padding:36px 40px 42px;text-align:center;border-top:1px solid #ece7da">
            <img src="${LOGO}" alt="Kurkoos Group" width="120" style="display:inline-block;width:120px;max-width:55%;height:auto" />
            <p style="font-family:${serif};font-size:11px;letter-spacing:0.18em;color:#9aa7af;margin:18px 0 0">נכסים · בנייה · יזמות · פיקוח · תיווך</p>
            <p style="font-family:${serif};font-size:10.5px;color:#bcc4c9;margin:8px 0 0">הודעה אוטומטית ממערכת הניהול של קבוצת קורקוס</p>
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
