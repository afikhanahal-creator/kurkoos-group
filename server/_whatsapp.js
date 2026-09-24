// ============================================================
// התראת וואטסאפ על ליד חדש, דרך GREEN API.
//
// משתני סביבה (Vercel → Settings → Environment Variables):
//   GREENAPI_ID_INSTANCE  — מזהה המופע מהקונסולה של Green API
//   GREENAPI_TOKEN        — טוקן המופע
//   GREENAPI_BASE         — אופציונלי. כתובת ה-API כפי שהיא מופיעה
//                           בקונסולה (apiUrl), אם היא שונה מברירת המחדל
//   WHATSAPP_NOTIFY_TO    — אופציונלי. מספרים מופרדים בפסיק, שמחליפים
//                           את ברירת המחדל שבקובץ הזה
//
// הטוקן לא נכתב בקוד בשום מצב: המאגר ציבורי, וטוקן שנדחף אליו נשאר
// בהיסטוריה לתמיד וגלוי לכולם. בלי משתני הסביבה הפונקציה פשוט לא
// שולחת, ומדווחת על כך, אבל היא לעולם לא מפילה את שליחת המייל ולא את
// שמירת הליד.
// ============================================================

/* מספרי ברירת המחדל. אלה מספרי עסק ולא סוד, ולכן הם כאן ולא במשתנה
   סביבה: כך ההתראה עובדת מיד עם הגדרת הטוקן, בלי הגדרה נוספת. */
const DEFAULT_NUMBERS = ['972543049491', '972506855656']

const SEND_TIMEOUT_MS = 8000

/* מנרמל מספר לפורמט בינלאומי בספרות בלבד, כמו ש-Green API מצפה.
   מקבל 0543049491, 972-54-304-9491, ‎+972 54 304 9491 ומחזיר 972543049491. */
export function normalizeNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

export function whatsappRecipients() {
  const src = process.env.WHATSAPP_NOTIFY_TO
  const list = (src == null ? DEFAULT_NUMBERS : String(src).split(','))
    .map(normalizeNumber)
    // מספר ישראלי תקין הוא 972 ועוד תשע ספרות. סינון כאן חוסך פנייה
    // מיותרת ל-API ושגיאה שקשה לפענח בצד השני.
    .filter((n) => n.length >= 10 && n.length <= 15)
  return [...new Set(list)]
}

/* כתובות ה-API האפשריות, לפי הסדר. מופעים חדשים ב-Green API מקבלים
   כתובת ייעודית לפי קידומת המזהה, ומופעים ותיקים עובדים מול הכתובת
   הכללית. מנסים אחת אחרי השנייה כדי שלא תידרש הגדרה ידנית. */
function apiBases(idInstance) {
  const fromEnv = String(process.env.GREENAPI_BASE || '').trim().replace(/\/+$/, '')
  const prefix = String(idInstance).slice(0, 4)
  return [...new Set([
    fromEnv,
    `https://${prefix}.api.greenapi.com`,
    'https://api.green-api.com',
  ].filter(Boolean))]
}

const SOURCE_LABELS = { project: 'עמוד פרויקט', home: 'דף הבית', contact: 'צור קשר', manual: 'ידני' }

/* טקסט ההודעה. וואטסאפ מדגיש בין כוכביות, וזה כל העיצוב שיש.
   המספר נשאר בפורמט שהלקוח הקליד כדי שוואטסאפ יזהה אותו ויהפוך אותו
   ללחיץ, וכך אפשר לחייג ישירות מההתראה. */
export function leadWhatsAppText(lead = {}, opts = {}) {
  const { isTest = false, rescued = null } = opts
  const site = String(process.env.SITE_URL || 'https://www.kurkoos-group.co.il').replace(/\/+$/, '')
  const clean = (v, max = 300) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)

  const projectName = (lead.project && typeof lead.project === 'object')
    ? (lead.project.he || lead.project.en || '')
    : (lead.project || '')
  const projectSlug = (lead.project && typeof lead.project === 'object') ? (lead.project.slug || '') : ''

  let when = ''
  try { when = new Date(lead.created_at || Date.now()).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) }
  catch { when = '' }

  const lines = []
  if (isTest) lines.push('🧪 *הודעת בדיקה ממערכת הניהול*', '')
  else if (rescued === false) lines.push('⚠️ *הליד הזה לא נשמר במערכת*', 'הפרטים כאן הם העותק היחיד, הזינו אותו ידנית.', '')
  else if (rescued === true) lines.push('↻ *נשמר דרך גיבוי השרת*', '')

  lines.push('🔔 *ליד חדש מהאתר*', '')
  lines.push(`*שם:* ${clean(lead.name) || 'ללא שם'}`)
  if (lead.phone) lines.push(`*טלפון:* ${clean(lead.phone, 30)}`)
  if (lead.email) lines.push(`*אימייל:* ${clean(lead.email, 200)}`)
  if (projectName) lines.push(`*פרויקט:* ${clean(projectName, 100)}`)
  if (lead.source) lines.push(`*מקור:* ${SOURCE_LABELS[lead.source] || clean(lead.source, 40)}`)
  if (when) lines.push(`*זמן:* ${when}`)
  if (lead.message) lines.push('', '*הודעה:*', clean(lead.message, 700))
  lines.push('', `לצפייה בליד: ${site}/admin`)
  if (projectSlug) lines.push(`עמוד הפרויקט: ${site}/projects/${projectSlug}`)

  return lines.join('\n')
}

async function postOnce(url, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const txt = await r.text()
    return { ok: r.ok, status: r.status, txt }
  } finally {
    clearTimeout(timer)
  }
}

/* שולח לכל הנמענים. לעולם לא זורק: כשל בוואטסאפ הוא תקלת התראות,
   והוא לא יכול למנוע מהמייל לצאת או מהליד להישמר.
   מחזיר סיכום קצר שנכנס לתשובת ה-API, כדי שמסך הבדיקה באדמין יראה
   מה קרה בלי לחפש בלוגים. הטוקן עצמו לא מוחזר ולא נרשם בלוג. */
export async function sendLeadWhatsApp(lead, opts = {}) {
  try { return await send(lead, opts) }
  // רשת ביטחון אחרונה: גם באג כאן לא יפיל את שליחת המייל ולא את הליד
  catch (e) { return { skipped: 'error', error: String(e?.message || e).slice(0, 160) } }
}

async function send(lead, opts) {
  const idInstance = String(process.env.GREENAPI_ID_INSTANCE || '').trim()
  const token = String(process.env.GREENAPI_TOKEN || '').trim()
  if (!idInstance || !token) {
    return { skipped: 'missing_credentials', hint: 'הגדירו GREENAPI_ID_INSTANCE ו-GREENAPI_TOKEN ב-Vercel ואז Redeploy' }
  }

  const numbers = whatsappRecipients()
  if (!numbers.length) return { skipped: 'no_numbers' }

  const message = leadWhatsAppText(lead, opts)
  const bases = apiBases(idInstance)
  const sent = []
  const failed = []
  /* הכתובת שעבדה לנמען הראשון משמשת לשאר, כדי לא לחזור על הניסיונות
     מול כתובת שכבר ידוע שאינה נכונה. */
  let known = null

  for (const number of numbers) {
    let done = false
    let lastErr = ''
    for (const base of (known ? [known] : bases)) {
      const url = `${base}/waInstance${encodeURIComponent(idInstance)}/sendMessage/${encodeURIComponent(token)}`
      try {
        const { ok, status, txt } = await postOnce(url, { chatId: `${number}@c.us`, message })
        if (ok) { known = base; sent.push(number); done = true; break }
        lastErr = `${status}: ${String(txt).slice(0, 160)}`
      } catch (e) {
        lastErr = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e).slice(0, 160)
      }
    }
    if (!done) failed.push({ number, error: lastErr })
  }

  return { sent: sent.length, numbers: sent, failed: failed.length ? failed : undefined }
}

export default sendLeadWhatsApp
