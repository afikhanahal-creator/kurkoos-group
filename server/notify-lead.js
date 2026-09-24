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

// עמודות טבלת leads — כל שדה אחר שמגיע מהדפדפן (למשל saveFailed) נזרק לפני הכנסה
const LEAD_COLS = { name: 200, phone: 30, email: 200, message: 2000, notes: 2000 }
const VALID_SOURCES = new Set(['project', 'contact', 'home', 'manual'])
function leadRowForInsert(lead) {
  const row = {}
  for (const [k, max] of Object.entries(LEAD_COLS)) {
    if (lead[k] != null && lead[k] !== '') row[k] = String(lead[k]).slice(0, max)
  }
  if (lead.project != null && lead.project !== '') {
    row.project = typeof lead.project === 'object' ? lead.project : String(lead.project).slice(0, 200)
  }
  row.source = VALID_SOURCES.has(lead.source) ? lead.source : 'contact'
  row.status = lead.status || 'new'
  return row
}

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
  /* מוגדר מחוץ ל-try כדי שגם תשובת שגיאה תישא את תוצאת ההצלה. הדפדפן מנסה
     שוב כשהוא לא מקבל rescued, ובלי זה תקלה מאוחרת יותר בפונקציה הייתה
     גוררת ניסיון נוסף והכנסה כפולה של אותה פנייה. */
  let rescued = null
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

    const SB = SUPABASE_URL.replace(/\/$/, '')
    const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    const sbGet = async (path) => {
      const r = await fetch(`${SB}/rest/v1/${path}`, { headers: sbHeaders })
      const txt = await r.text()
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${txt.slice(0, 180)}`)
      try { return JSON.parse(txt) } catch { return [] }
    }

    const lead = isTest
      ? { name: 'ליד בדיקה', phone: '050-0000000', email: 'test@example.com', project: 'בדיקת מערכת', message: 'זוהי הודעת בדיקה ממסך הגדרות ההתראות.', source: 'contact', created_at: new Date().toISOString() }
      : (body.lead || {})

    /* הצלה בצד השרת: הדפדפן לא הצליח לשמור את הפנייה (RLS, רשת של המבקר,
       מסד לא זמין לרגע). כאן יש מפתח service role והבקשה יוצאת מהשרת של
       Vercel, ולכן היא מצליחה כמעט בכל תרחיש כשל. כך הליד בכל זאת מגיע
       ללוח הלידים כליד חדש, ולא רק למייל. רץ לפני בדיקות ההתראה, כדי
       שכיבוי ההתראות או היעדר נמענים לא ימנע את ההצלה. */
    if (lead.saveFailed && !isTest && (lead.name || lead.phone || lead.email)) {
      try {
        /* ניסיון חוזר של הדפדפן, או לחיצה כפולה על "שליחה", לא יכולים ליצור
           שני לידים זהים: קודם בודקים אם אותה פנייה כבר נכנסה בדקות האחרונות. */
        const since = new Date(Date.now() - 10 * 60_000).toISOString()
        const ident = lead.phone ? `phone=eq.${encodeURIComponent(lead.phone)}`
          : lead.email ? `email=eq.${encodeURIComponent(lead.email)}`
          : `name=eq.${encodeURIComponent(lead.name)}`
        const dup = await sbGet(`leads?${ident}&created_at=gte.${since}&select=id&limit=1`).catch(() => [])
        if (Array.isArray(dup) && dup.length) {
          rescued = true
        } else {
          const r = await fetch(`${SB}/rest/v1/leads`, {
            method: 'POST',
            headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify(leadRowForInsert(lead)),
          })
          if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 180)}`)
          rescued = true
        }
      } catch {
        rescued = false
      }
    }

    /* בדיקת מפתח המייל באה רק *אחרי* ההצלה. מפתח Resend שפג או נמחק הוא
       תקלת התראות, והוא לא יכול למנוע מפנייה של אדם אמיתי להגיע למערכת. */
    if (!RESEND_API_KEY) { res.status(500).json({ error: 'חסר RESEND_API_KEY בהגדרות Vercel (ודאו גם שעשיתם Redeploy)', rescued }); return }

    const [settingsRows, recipients] = await Promise.all([
      sbGet('lead_notify_settings?id=eq.1&select=*'),
      sbGet('lead_notify_recipients?active=eq.true&select=*'),
    ])
    const settings = (Array.isArray(settingsRows) && settingsRows[0]) || { enabled: true, subject: 'ליד חדש מהאתר: {{name}}', include_fields: DEFAULT_FIELDS }
    if (!settings.enabled) { res.status(200).json({ ok: true, skipped: 'disabled', rescued }); return }

    /* נמענים קבועים, בנוסף לרשימה שבאדמין. קיימים כדי שבעלי העסק יקבלו
       כל ליד גם אם הרשימה במסך ההגדרות התרוקנה או נערכה בטעות: ליד שלא
       מגיע לאף אחד הוא ליד אבוד. ניתן לשנות בלי פריסה מחדש דרך משתנה
       הסביבה NOTIFY_ALWAYS_TO ב-Vercel (כתובות מופרדות בפסיק), ולבטל
       לגמרי על ידי הגדרתו למחרוזת ריקה. */
    const ALWAYS_TO = (process.env.NOTIFY_ALWAYS_TO ?? 'skurkoos@gmail.com')
      .split(',').map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))

    /* איחוד בלי כפילויות. השוואה באותיות קטנות, אחרת כתובת שנכתבה
       באדמין באות גדולה הייתה מקבלת עותק שני של אותו מייל. */
    const seen = new Set()
    const to = []
    for (const addr of [...(Array.isArray(recipients) ? recipients : []).map((r) => r.email), ...ALWAYS_TO]) {
      const e = String(addr || '').trim()
      if (!e) continue
      const key = e.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      to.push(e)
    }
    if (!to.length) { res.status(200).json({ ok: true, skipped: 'no_recipients', rescued }); return }

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
    /* SITE חייב להיות מוגדר לפני PROJECT_URL. כשההגדרה הייתה מתחת לשימוש,
       כל ליד שהגיע עם slug של פרויקט הפיל את הפונקציה (TDZ) ולא נשלח עליו
       מייל בכלל — בדיוק הלידים החמים ביותר. */
    const SITE = process.env.SITE_URL || 'https://www.kurkoos-group.co.il'
    const ADMIN_URL = `${SITE}/admin`
    const LOGO = `${SITE}/kurkoos-logo-nadlan.png`

    const projectName = (lead.project && typeof lead.project === 'object') ? (lead.project.he || lead.project.en || '') : (lead.project || '')
    const projectSlug = (lead.project && typeof lead.project === 'object') ? (lead.project.slug || '') : ''
    const PROJECT_URL = projectSlug ? `${SITE}/projects/${projectSlug}` : ''
    const safeName = String(lead.name || 'ללא שם').slice(0, 100).replace(/[\r\n]/g, ' ')
    const safeProject = String(projectName).slice(0, 100).replace(/[\r\n]/g, ' ')
    const prefix = rescued === true ? '↻ נשמר בגיבוי שרת: ' : rescued === false ? '⚠ ליד שלא נשמר במערכת: ' : ''
    const subject = prefix + (settings.subject || 'ליד חדש מהאתר: {{name}}')
      .replace(/{{\s*name\s*}}/g, safeName)
      .replace(/{{\s*project\s*}}/g, safeProject)
      + (isTest ? ' (בדיקה)' : '')

    /* טיפוגרפיה זהה לאתר: Heebo לכותרות, Assistant לטקסט.
       לקוחות שמרשים גופן אינטרנט (Apple Mail, Mail ב-iOS, סמסונג) טוענים
       אותם דרך ה-@import שלמטה. Gmail מוחק את ה-head ומתעלם, ולכן שרשרת
       הנפילה חייבת להסתיים בגופן סאנס עם עברית מלאה. בלי שרשרת כזאת חלק
       מהלקוחות נופלים ל"דויד", גופן סריפי שאין לו שום קשר למותג.
       לכל אלמנט טקסט כאן יש font-family משלו מאותה סיבה: ערך שיורש מה-body
       נמחק בחלק מהלקוחות, והטקסט חוזר לברירת המחדל שלהם. */
    const FONT_H = "'Heebo','Assistant','Noto Sans Hebrew','Segoe UI','Arial Hebrew',Arial,Helvetica,sans-serif"
    const FONT_B = "'Assistant','Heebo','Noto Sans Hebrew','Segoe UI','Arial Hebrew',Arial,Helvetica,sans-serif"
    const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Heebo:wght@400;700;800;900&display=swap"

    const C = {
      ink: '#07293a', inkSoft: '#3d5462', teal: '#105572', red: '#a90b0c',
      line: '#e6edf1', label: '#8494a1', page: '#eef2f5', tint: '#f5f9fb',
    }

    // ערך תא — כל ערכי המשתמש עוברים htmlEsc למניעת HTML injection במייל לאדמין
    const cell = (k) => {
      const v = val(k)
      if (v === '—') return `<span style="font-family:${FONT_B};color:#b3bfc9;font-weight:600">—</span>`
      const safe = htmlEsc(v)
      // ספרות בתוך משפט עברי מתהפכות; כיוון LTR על המספר עצמו שומר עליו קריא
      if (k === 'phone') return `<a href="tel:${String(lead.phone || '').replace(/[^\d+]/g, '')}" style="font-family:${FONT_B};color:${C.ink};text-decoration:none;font-weight:700;direction:ltr;unicode-bidi:embed;display:inline-block">${safe}</a>`
      if (k === 'email') return `<a href="mailto:${htmlEsc(lead.email)}" style="font-family:${FONT_B};color:${C.teal};text-decoration:none;font-weight:700;direction:ltr;unicode-bidi:embed;display:inline-block;word-break:break-all">${safe}</a>`
      // "24.9.2026, 10:43" הוא מחרוזת לטינית לגמרי. בלי כיוון LTR הפסיק
      // שבין התאריך לשעה קופץ לצד השני ונראה כמו שגיאה.
      if (k === 'created_at') return `<span style="direction:ltr;unicode-bidi:embed;display:inline-block">${safe}</span>`
      return safe
    }
    const rows = fields.map((k, i) => {
      const last = i === fields.length - 1
      const edge = last ? 'none' : `1px solid ${C.line}`
      return `<tr>
        <td width="104" style="padding:14px 0 14px 16px;vertical-align:top;border-bottom:${edge};font-family:${FONT_B};font-size:12px;font-weight:700;letter-spacing:0.05em;color:${C.label};white-space:nowrap">${FIELD_LABELS[k] || k}</td>
        <td style="padding:14px 0;vertical-align:top;border-bottom:${edge};font-family:${FONT_B};font-size:16px;font-weight:700;color:${C.ink};line-height:1.55">${cell(k)}</td>
      </tr>`
    }).join('')

    const digits = String(lead.phone || '').replace(/\D/g, '')
    const wa = digits ? (digits.startsWith('972') ? digits : '972' + digits.replace(/^0/, '')) : ''

    /* כפתור בנוי טבלה ולא <a> עם padding: אאוטלוק מתעלם מ-padding על קישור
       ומצייר כפתור בגובה שורת טקסט. bgcolor על התא נותן לו רקע גם שם. */
    const btn = (href, label, bg, opts = {}) => {
      const { fg = '#ffffff', size = 14, pad = '13px 26px', border = '' } = opts
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:5px 4px"><tr>
        <td align="center" bgcolor="${bg}" style="border-radius:10px;mso-padding-alt:${pad}${border ? `;border:1.5px solid ${border}` : ''}">
          <a href="${href}" style="display:inline-block;padding:${pad};font-family:${FONT_H};font-size:${size}px;font-weight:800;line-height:1;color:${fg};text-decoration:none;border-radius:10px">${label}</a>
        </td></tr></table>`
    }

    /* פס החיוג. מי שמקבל ליד רוצה קודם כל להתקשר, ולכן המספר הוא האלמנט
       הגדול בגוף המייל ולא שורה בטבלה. */
    const callStrip = lead.phone ? `
          <tr><td style="padding:22px 36px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.tint};border:1px solid ${C.line};border-radius:14px">
              <tr><td align="center" style="padding:20px 20px 18px">
                <div style="font-family:${FONT_B};font-size:11px;font-weight:700;letter-spacing:0.2em;color:${C.label}">חייגו עכשיו</div>
                <a href="tel:${digits}" style="font-family:${FONT_H};font-size:27px;font-weight:900;color:${C.ink};text-decoration:none;direction:ltr;unicode-bidi:embed;display:inline-block;margin:8px 0 0;letter-spacing:0.01em">${htmlEsc(String(lead.phone))}</a>
                <div style="margin:12px 0 0">
                  ${btn(`tel:${digits}`, 'התקשרות', C.teal, { size: 13, pad: '11px 22px' })}
                  ${wa ? btn(`https://wa.me/${wa}`, 'וואטסאפ', '#25D366', { size: 13, pad: '11px 22px' }) : ''}
                  ${lead.email ? btn(`mailto:${lead.email}`, 'מייל ללקוח', C.ink, { size: 13, pad: '11px 22px' }) : ''}
                </div>
              </td></tr>
            </table>
          </td></tr>` : (lead.email ? `
          <tr><td align="center" style="padding:22px 36px 0">${btn(`mailto:${lead.email}`, 'מייל ללקוח', C.ink, { size: 13, pad: '11px 22px' })}</td></tr>` : '')

    const banner = (bg, title, body) => `<tr><td style="background:${bg};padding:18px 36px;text-align:center">
            <div style="font-family:${FONT_H};font-size:15px;font-weight:800;color:#ffffff;line-height:1.5">${title}</div>
            <div style="font-family:${FONT_B};font-size:13px;font-weight:600;color:#ffffff;opacity:0.92;line-height:1.6;margin:5px 0 0">${body}</div>
          </td></tr>`

    /* שורת התצוגה המקדימה בתיבת הדואר, לפני שפותחים. מוסתרת בגוף המייל
       עצמו. כך רואים מי פנה ועל מה עוד ברשימת ההודעות. */
    const preheader = [safeName, String(lead.phone || ''), projectName].filter(Boolean).join(' · ')

    const html = `<!doctype html>
<html dir="rtl" lang="he" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${htmlEsc(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<!--[if mso]><style>* { font-family: Arial, 'Segoe UI', sans-serif !important; }</style><![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS_CSS}" rel="stylesheet">
<style>
  @import url('${FONTS_CSS}');
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  a { text-decoration: none; }
  /* רשת ביטחון לכל אלמנט שאיבד את ה-font-family שלו בדרך */
  body, table, td, div, p, a, h1, span { font-family: 'Heebo','Assistant','Segoe UI',Arial,sans-serif; }
  @media only screen and (max-width: 620px) {
    .kg-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .kg-h1 { font-size: 26px !important; }
    .kg-phone { font-size: 24px !important; }
    /* הכפתורים הראשיים נפרסים לרוחב מלא בטלפון, כך שהם יוצאים באותו
       רוחב זה מתחת לזה ולא בשתי מדרגות. גם התא הפנימי חייב 100%, אחרת
       הטבלה מתרחבת והכפתור עצמו נשאר ברוחב הטקסט. */
    .kg-btn { display: block !important; width: 100% !important; }
    .kg-btn table { display: table !important; width: 100% !important; margin: 6px 0 !important; }
    .kg-btn td { width: 100% !important; }
    .kg-btn a { display: block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT_B}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${htmlEsc(preheader)}</div>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
  <tr><td align="center" style="padding:34px 14px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(7,41,58,0.14)">
      ${rescued === true ? banner('#0f7b3f', 'הפנייה נשמרה דרך גיבוי השרת', 'השמירה מהדפדפן של המבקר נכשלה, והשרת הכניס את הליד ללוח הלידים. אין צורך להזין אותו ידנית.') : ''}
      ${rescued === false ? banner('#b42318', 'הליד הזה לא נשמר במערכת הניהול', 'גם השמירה מהדפדפן וגם גיבוי השרת נכשלו. הפרטים כאן הם העותק היחיד: חזרו ללקוח והזינו אותו ידנית בלוח הלידים.') : ''}

      <!-- כותרת: מי פנה, ומאיזה פרויקט -->
      <tr><td class="kg-pad" style="background:${C.ink};padding:36px 40px 32px;text-align:center">
        <div style="font-family:${FONT_B};font-size:11px;font-weight:700;letter-spacing:0.24em;color:#7ea9be">ליד חדש מהאתר</div>
        <h1 class="kg-h1" style="font-family:${FONT_H};font-weight:900;font-size:32px;line-height:1.2;color:#ffffff;margin:12px 0 0">${htmlEsc(safeName)}</h1>
        ${projectName ? `<div style="margin:14px 0 0"><span style="display:inline-block;padding:7px 17px;background:#103d54;border-radius:999px;font-family:${FONT_B};font-size:13px;font-weight:700;color:#ffd47a">${htmlEsc(projectName)}</span></div>` : ''}
        <div style="width:52px;height:4px;background:${C.red};border-radius:2px;margin:20px auto 0"></div>
      </td></tr>

      ${callStrip}

      <!-- פרטי הפנייה -->
      <tr><td class="kg-pad" style="padding:26px 36px 0">
        <div style="font-family:${FONT_B};font-size:11px;font-weight:700;letter-spacing:0.2em;color:${C.label};padding:0 0 6px">פרטי הפנייה</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${rows}</table>
      </td></tr>

      <!-- פעולה ראשית -->
      <tr><td class="kg-pad" align="center" style="padding:28px 36px 4px">
        <span class="kg-btn">${btn(ADMIN_URL, 'צפייה בליד במערכת', C.red, { size: 16, pad: '15px 42px' })}</span>
        ${PROJECT_URL ? `<span class="kg-btn">${btn(PROJECT_URL, 'עמוד הפרויקט', '#ffffff', { fg: C.teal, size: 14, pad: '14px 28px', border: '#cfdde5' })}</span>` : ''}
      </td></tr>

      <!-- פוטר -->
      <tr><td class="kg-pad" style="padding:34px 40px 36px;text-align:center;border-top:1px solid ${C.line}">
        <img src="${LOGO}" alt="Kurkoos Group" width="126" style="display:inline-block;width:126px;max-width:56%;height:auto;border:0" />
        <p style="font-family:${FONT_B};font-size:11px;font-weight:700;letter-spacing:0.16em;color:#9aa7b1;margin:16px 0 0">נכסים · בנייה · יזמות · פיקוח · תיווך</p>
        <p style="font-family:${FONT_B};font-size:11px;font-weight:600;color:#b6c0c8;margin:8px 0 0;line-height:1.6">הודעה אוטומטית ממערכת הניהול של קבוצת קורקוס</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html, reply_to: settings.reply_to || undefined }),
    })
    const outTxt = await r.text()
    let out = {}; try { out = JSON.parse(outTxt) } catch { /* non-JSON */ }
    if (!r.ok) {
      res.status(502).json({ error: `Resend ${r.status}: ${out.message || out.error?.message || outTxt.slice(0, 200) || 'שגיאת שליחה'}`, detail: out, rescued })
      return
    }
    res.status(200).json({ ok: true, sent: to.length, id: out.id, rescued })
  } catch (e) {
    res.status(500).json({ error: 'שגיאת שרת: ' + (e && e.message ? e.message : String(e)), rescued })
  }
}
