// ============================================================
// The welcome a new site lead gets on WhatsApp, from the Afik Hanahal office number.
//
// The Afik Hanahal site owns that WhatsApp line and its automations (Green API, the welcome on/off switch, no automatic
// message to a number someone already wrote to, the log, and turning a reply like "מחר ב-4" into a callback task).
// So this site does not send the message itself: it asks Afik's server to, through POST /api/meta/kurkoos-lead
// (afik-hanahal: api/meta.js handleKurkoosLead, text in lib/kurkoos-welcome.js:
// "היי <שם>, ראינו שהשארתם פרטים באתר של קבוצת קורקוס לגבי <נושא>. מתי נוח לכם שנדבר, היום או מחר?").
//
// /api/notify-lead is called from the browser, so a phone number in its body proves nothing. The welcome goes out only
// when a lead with that phone was saved in the last 15 minutes from a site form (not "manual"), checked with the
// service role. Anything missing → nothing is sent, and the lead itself is never affected.
//
// Environment (Vercel):
//   FINANCE_WHATSAPP_WEBHOOK_TOKEN — the token the two sites already share (Afik: KURKOOS_FINANCE_HOOK_TOKEN)
//   AFIK_LEAD_WELCOME_URL          — optional, default https://www.afikhanahal.co.il/api/meta/kurkoos-lead
//   LEAD_WELCOME                   — "off" stops the welcome without a deploy of the Afik site
// ============================================================

const DEFAULT_URL = 'https://www.afikhanahal.co.il/api/meta/kurkoos-lead'

const digits = (p) => String(p || '').replace(/\D/g, '')

export async function sendLeadWelcome(lead, { sbGet, isTest = false } = {}) {
  try {
    if (isTest) return { skipped: 'test' }
    if (String(process.env.LEAD_WELCOME || '').toLowerCase() === 'off') return { skipped: 'off' }
    const token = String(process.env.FINANCE_WHATSAPP_WEBHOOK_TOKEN || '').trim()
    if (!token) return { skipped: 'no token' }
    const phone = String(lead?.phone || '').trim()
    if (digits(phone).length < 9) return { skipped: 'no phone' }
    if (lead?.source === 'manual') return { skipped: 'manual' }

    // the lead must really be in the table: same phone, from a form, in the last 15 minutes
    const since = new Date(Date.now() - 15 * 60_000).toISOString()
    const rows = await sbGet(`leads?phone=eq.${encodeURIComponent(phone)}&created_at=gte.${since}&source=neq.manual&select=id,name,project&order=created_at.desc&limit=1`).catch(() => [])
    const row = Array.isArray(rows) ? rows[0] : null
    if (!row) return { skipped: 'lead not found' }

    const project = row.project && typeof row.project === 'object' ? (row.project.he || row.project.en || '') : String(row.project || '')
    const url = String(process.env.AFIK_LEAD_WELCOME_URL || DEFAULT_URL)
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: row.id, name: row.name || lead.name || '', phone, topic: project }),
      signal: AbortSignal.timeout(8000),
    })
    const out = await r.json().catch(() => ({}))
    return r.ok ? { ok: !!out.ok, skipped: out.skipped || null } : { ok: false, error: `afik ${r.status}` }
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 120) }
  }
}
