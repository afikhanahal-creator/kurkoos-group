/* The registry of accounting software: what each product really offers for the documents this system holds (supplier
   invoices and receipts, i.e. expenses), and what this system really does with it today.

   Every fact here was read from the vendor's own site, documentation or API specification on 2026-11-13; `docs` is where.
   Nothing is marked as working because it is listed: `route` says how documents reach the product from here today, and
   `cap` says, per capability, whether it was verified against a real account ('verified'), is built but was never run
   against a real account ('built'), is documented by the vendor but not built here ('documented'), or does not exist in
   the vendor's public API as far as its documentation shows ('none'). 'unknown' = no official source was found.

   route:
     file   - a file package the user downloads or mails (always works; nothing is sent to the vendor by this system)
     email  - documents are mailed, each with its file, to the intake address the vendor (or the accountant) gave for
              the company; sent through the automatic deliveries (outbound.js), with retries and a delivery log
     api    - a direct connection; only `auth` may be built before a sandbox account exists
     none   - no way to hand documents over from here yet */
const C = (auth, send, attach, read, webhooks, sandbox) => ({ auth, send, attach, read, webhooks, sandbox })

export const PROVIDERS = [
  { id: 'file', label: 'קבצים (ZIP / Excel / CSV / PDF)', route: 'file', group: 'file',
    about: 'הקבצים המקוריים עם Excel ו-CSV, שכל תוכנה ומשרד רו״ח קולטים.',
    cap: C('none', 'verified', 'verified', 'none', 'none', 'none'), directions: 'out' },
  { id: 'hashavshevet', label: 'חשבשבת', route: 'file', group: 'file', docs: 'https://docs.wizcloud.co.il/docs/intro',
    about: 'קובץ קליטה לחשבשבת, להורדה או לשליחה לרו״ח.',
    note: 'לגרסת הענן (WizCloud) יש API מתועד לפקודות יומן ולצירוף קבצים. החיבור הישיר עוד לא נבנה כאן.',
    cap: C('documented', 'documented', 'documented', 'documented', 'documented', 'unknown'), directions: 'out' },

  { id: 'morning', label: 'Morning (חשבונית ירוקה)', route: 'email', group: 'software', api: true, docs: 'https://developers.morning.co/api',
    about: 'הוצאות נקלטות ב-Morning כטיוטות לאישור: במייל הייעודי של העסק, או ב-API.',
    intake: 'לכל עסק ב-Morning יש כתובת מייל ייעודית להוצאות (קובץ אחד בכל מייל). הכתובת מופיעה ב-Morning תחת "הוצאות".',
    note: 'API מתועד עם יצירת הוצאה, העלאת קובץ, קריאה חזרה וסביבת ניסיון. כאן בנויה בדיקת ההתחברות; שליחת הוצאות ב-API תופעל אחרי בדיקה מול חשבון ניסיון.',
    cap: C('built', 'documented', 'documented', 'documented', 'documented', 'documented'), directions: 'out', fields: [], secrets: ['client_id', 'client_secret'] },
  { id: 'icount', label: 'iCount', route: 'none', group: 'software', api: true, docs: 'https://apiv3.icount.co.il/',
    about: 'ל-iCount יש API מתועד ליצירת הוצאה עם קובץ סרוק.',
    note: 'החיבור עוד לא נבנה כאן. לא נמצאה סביבת ניסיון מתועדת, ולכן הוא ייבדק מול חשבון אמיתי עם מסמך בדיקה.',
    cap: C('documented', 'documented', 'documented', 'documented', 'unknown', 'unknown'), directions: 'out' },
  { id: 'sumit', label: 'SUMIT', route: 'none', group: 'software', api: true, docs: 'https://app.sumit.co.il/developers/api/',
    about: 'ל-SUMIT יש API מתועד להוספת הוצאה עם קובץ.',
    note: 'החיבור עוד לא נבנה כאן. לא נמצאה סביבת ניסיון מתועדת.',
    cap: C('documented', 'documented', 'documented', 'unknown', 'documented', 'unknown'), directions: 'out' },
  { id: 'priority', label: 'Priority', route: 'none', group: 'software', api: true, docs: 'https://prioritysoftware.github.io/restapi/',
    about: 'ל-Priority יש API (OData) לחשבוניות ספק עם קובץ מצורף.',
    note: 'החיבור עוד לא נבנה כאן. שם הטופס והכתובת שונים בכל התקנה, ומנהל המערכת צריך לפתוח את הטפסים ל-API.',
    cap: C('documented', 'documented', 'documented', 'documented', 'documented', 'documented'), directions: 'out' },
  { id: 'sap_b1', label: 'SAP Business One', route: 'none', group: 'software', api: true, docs: 'https://help.sap.com/doc/056f69366b5345a386bb8149f1700c19/10.0/en-US/Service%20Layer%20API%20Reference.html',
    about: 'ל-SAP Business One יש API (Service Layer) לחשבוניות ספק עם קובץ מצורף.',
    note: 'החיבור עוד לא נבנה כאן. השרת מותקן אצל כל לקוח, וצריך גישת רשת אליו.',
    cap: C('documented', 'documented', 'documented', 'documented', 'unknown', 'unknown'), directions: 'out' },
  { id: 'rivhit', label: 'רווחית', route: 'none', group: 'software', docs: 'https://rivhit-api.readme.io/docs/general',
    about: 'ב-API של רווחית אין קליטת הוצאה עם קובץ, רק פקודת יומן.',
    note: 'מסמכים מועברים בקבצים. למשרדי רו״ח יש את "ריווחית דוקס" לקליטת מסמכים סרוקים מלקוחות; הערוץ ללקוח לא מתועד באתר.',
    cap: C('documented', 'none', 'unknown', 'documented', 'none', 'documented'), directions: 'out' },
  { id: 'ezcount', label: 'EZcount', route: 'none', group: 'software', docs: 'https://www.ezcount.co.il/api',
    about: 'ה-API של EZcount מפיק מסמכי הכנסה בלבד; לא נמצאה בו קליטת הוצאות.',
    cap: C('documented', 'none', 'none', 'unknown', 'none', 'documented'), directions: 'out' },
  { id: 'invoice4u', label: 'Invoice4U', route: 'none', group: 'software', docs: 'https://api.invoice4u.co.il/Services/ApiService.svc?wsdl',
    about: 'בשירות של Invoice4U לא נמצאה פעולה לקליטת הוצאה.',
    cap: C('documented', 'none', 'none', 'documented', 'unknown', 'unknown'), directions: 'out' },
  { id: 'accountit', label: 'AccountIT', route: 'none', group: 'software', docs: 'https://my.accountit.co.il/assets/AccountitDirectAPIUsage.html',
    about: 'ה-API של AccountIT יוצר מסמכי הכנסה בלבד; אין בו קליטת מסמך הוצאה.',
    cap: C('documented', 'none', 'none', 'documented', 'none', 'documented'), directions: 'out' },

  { id: 'costapp', label: 'CostApp', route: 'email', group: 'intake', docs: 'https://www.costapp.co.il/',
    about: 'מערכת של משרדי רו״ח לקליטת חשבוניות מלקוחות: המסמך מפוענח ונרשם אצל רו״ח.',
    intake: 'לפי האתר של CostApp, לקוחות שולחים מסמכים בוואטסאפ, במייל או באפליקציה, אחרי הזמנה ממשרד רו״ח. את כתובת המייל לשליחה מקבלים ממשרד רו״ח.',
    note: 'לא נמצא API ציבורי. החיבור מכאן הוא שליחת כל מסמך מאושר, עם הקובץ, לכתובת שרו״ח נתן.',
    cap: C('none', 'built', 'built', 'none', 'none', 'none'), directions: 'out' },
  { id: 'dokka', label: 'Dokka', route: 'email', group: 'intake', docs: 'https://support.dokka.com/en/support/solutions/articles/62000224476',
    about: 'מערכת לקליטת חשבוניות ספקים, שותפה רשמית של Priority.',
    intake: 'לכל חברה ב-Dokka יש כתובת מייל ייעודית; מסמך שנשלח אליה נקלט במערכת. הכתובת מופיעה בהגדרות החברה ב-Dokka.',
    note: 'לא נמצא תיעוד API ציבורי. דפוס הכתובת נלקח מאתר התמיכה של Dokka ולא נבדק מול חשבון.',
    cap: C('none', 'built', 'built', 'none', 'none', 'none'), directions: 'out' },
  { id: 'accountant_email', label: 'מייל של רו״ח או של תוכנה אחרת', route: 'email', group: 'intake',
    about: 'כל תוכנה או משרד שקולטים מסמכים בכתובת מייל: כל מסמך מאושר נשלח לשם עם הקובץ.',
    intake: 'מזינים את הכתובת שרו״ח או התוכנה נתנו לקליטת מסמכים.',
    cap: C('none', 'verified', 'verified', 'none', 'none', 'none'), directions: 'out' },
  { id: 'smartbee', label: 'SmartBee', route: 'none', group: 'intake', docs: 'https://smartbee.co.il/',
    about: 'מערכת חשבוניות והוצאות לעסקים קטנים, עם אפליקציה לצילום הוצאות.',
    note: 'האתר מציין "API פתוח" בתשלום והעברת חשבוניות מהמייל, אבל לא נמצא תיעוד ציבורי לאף אחד מהם. כדי לחבר צריך לקבל מ-SmartBee את תיעוד ה-API או כתובת מייל לקליטה; עם כתובת כזו אפשר לחבר כבר עכשיו דרך "מייל של רו״ח או של תוכנה אחרת".',
    cap: C('unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'), directions: 'out' },
  { id: 'finbot', label: 'Finbot', route: 'none', group: 'intake', docs: 'https://www.fin-bot.co.il/',
    about: 'פלטפורמה של משרדי רו״ח; הלקוח מצלם מסמכים באפליקציה של המשרד.',
    note: 'לא נמצאו API ציבורי או כתובת מייל לקליטה. מסמכים מועברים בקבצים.',
    cap: C('none', 'none', 'none', 'none', 'none', 'none'), directions: 'out' },
  { id: 'paperless', label: 'Paperless', route: 'none', group: 'intake',
    about: 'מופיע ברשימה מגרסה קודמת. לא נבדק מול מקור רשמי.',
    cap: C('unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'), directions: 'out' },
]
export const providerOf = (id) => PROVIDERS.find((p) => p.id === id) || null
// what the client may know about a provider (everything here is public information; no secrets live in this file)
export const publicProviders = () => PROVIDERS.map(({ secrets, fields, ...p }) => ({ ...p, needs: secrets || [], fields: fields || [] }))

/* Morning: a real sign-in with the keys of one environment (documented at developers.morning.co: OAuth2 client
   credentials, POST /idp/v1/oauth/token, a JWT valid for an hour). It proves the keys work and nothing else: no
   document is read or written. `sandbox: true` in the connection's settings signs in to Morning's test environment. */
export async function morningAuth(config = {}, secret = {}) {
  const id = String(secret.client_id || '').trim(); const key = String(secret.client_secret || '').trim()
  if (!id || !key) { const e = new Error('חסרים מזהה ומפתח ה-API של Morning (נוצרים ב-Morning תחת הגדרות ← כלים למפתחים ← מפתחות API)'); e.code = 'NOT_ACTIVE'; throw e }
  // FINANCE_MORNING_AUTH points the sign-in at a stand-in during the tests; in production it is not set
  const host = process.env.FINANCE_MORNING_AUTH || (config.sandbox ? 'https://api.sandbox.morning.dev' : 'https://api.morning.co')
  let r
  try { r = await fetch(`${host}/idp/v1/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant_type: 'client_credentials', client_id: id, client_secret: key }), signal: AbortSignal.timeout(12000) }) } catch (e) { throw new Error(`לא הצלחנו להגיע ל-Morning: ${String(e.message || e).slice(0, 120)}`) }
  const text = await r.text(); let d = null; try { d = JSON.parse(text) } catch { /* not JSON */ }
  if (!r.ok || !(d?.accessToken || d?.access_token)) {
    const why = d?.error || d?.errorMessage || d?.message || `HTTP ${r.status}`
    throw new Error(/unauthorized_client/.test(String(why)) ? 'Morning דחה את המפתחות: המנוי של העסק לא כולל גישת API' : `Morning דחה את ההתחברות (${String(why).slice(0, 120)})`)
  }
  return { ok: true, note: `ההתחברות ל-Morning${config.sandbox ? ' (סביבת ניסיון)' : ''} אושרה. שליחת הוצאות ב-API עוד לא פעילה; מסמכים נשלחים במייל הייעודי או בקבצים` }
}
