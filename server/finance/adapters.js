// Accounting software the approved documents go to. Every destination implements the same contract:
//   { id, label, kind, fields: [config fields], secrets: [secret fields], test(cfg, secret, ctx), send }
// Four kinds, each honest about what it does:
//   file   — a package built in the browser (ZIP / Excel / CSV / PDF). Always works.
//   email  — the documents are emailed, with their original files and the Excel / CSV summary, to the intake address the
//            software (or the accountant's office) gave the business. Works as soon as the address is saved; "test" really
//            sends one short mail there through the system's own mail path.
//   api    — a direct connection. It stays inactive until the accountant confirms which system they use and gives an API
//            key: we do not guess endpoints of a financial system, so test()/send() refuse instead of pretending. Until
//            then such a connection may carry an intake address and deliver by email like the kind above.
//   custom — a software that is not in the list: the office names it and says how it receives documents (an intake
//            address, or files only).
import { sendMail } from './agents.js'
import { emailOk } from './outbound.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const fail = (message, code) => Object.assign(new Error(message), { code })
const notActive = (label) => async () => { throw fail(`החיבור הישיר ל-${label} עוד לא הופעל. צריך מפתח API ואישור של רו״ח על מבנה הנתונים. עד אז אפשר לשלוח במייל לכתובת הקליטה או לייצא קבצים.`, 'NOT_ACTIVE') }

/** the intake address of a connection, when it has a valid one */
export const intakeOf = (cfg) => { const a = String(cfg?.intake_email || '').trim().toLowerCase(); return emailOk(a) ? a : '' }

/** how a connection delivers today: 'email' | 'file' | 'api_pending' */
export function deliveryOf(provider, cfg) {
  const ad = ADAPTERS[provider]
  if (!ad) return 'file'
  if (ad.kind === 'file' || (ad.kind === 'custom' && cfg?.mode === 'files')) return 'file'
  if (intakeOf(cfg)) return 'email'
  return ad.kind === 'api' ? 'api_pending' : 'email'
}

// one short mail to the intake address, through the same mail path as every other mail of the system
const mailTest = (label) => async (cfg, _secret, ctx = {}) => {
  const to = intakeOf(cfg)
  if (!to) throw fail('חסרה כתובת קליטה תקינה. מוסיפים אותה בהגדרות החיבור.', 'NO_ADDRESS')
  if (!process.env.RESEND_API_KEY) throw fail('שליחת מיילים לא הוגדרה בשרת (RESEND_API_KEY), ולכן אי אפשר לשלוח לכתובת הקליטה.', 'NO_MAIL')
  const name = ctx.name || label
  await sendMail([to], `בדיקת חיבור · ${ctx.business || 'קבוצת קורקוס'}`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;color:#1f2a33;line-height:1.5"><p>שלום,</p><p>זו הודעת בדיקה ממערכת הנהלת החשבונות של קבוצת קורקוס${ctx.business ? ` (${esc(ctx.business)})` : ''}.</p><p>מעכשיו מסמכים מאושרים יישלחו לכתובת הזו (${esc(name)}), עם הקבצים המקוריים וקובץ סיכום. אין צורך להשיב.</p>${ctx.by ? `<p style="color:#6b7680;font-size:12px">נשלח ע״י ${esc(ctx.by)}</p>` : ''}</div>`)
  return { ok: true, note: `מייל בדיקה נשלח אל ${to}. כדאי לוודא שהוא התקבל ב-${name}` }
}

const file = (id, label, fields = [], note) => ({ id, label, kind: 'file', fields, secrets: [], test: async () => ({ ok: true, ...(note ? { note } : {}) }), send: null })
const api = (id, label, fields, secrets) => ({ id, label, kind: 'api', fields: [...fields, 'intake_email'], secrets, test: async (cfg, s, ctx) => (intakeOf(cfg) ? mailTest(label)(cfg, s, ctx) : notActive(label)()), send: notActive(label) })
const mail = (id, label) => ({ id, label, kind: 'email', fields: ['intake_email'], secrets: [], test: mailTest(label), send: null })

export const ADAPTERS = {
  file: file('file', 'קבצים (ZIP / Excel / CSV / PDF)'),
  icount: api('icount', 'iCount', ['company_id', 'user'], ['api_token']),
  morning: api('morning', 'Morning (חשבונית ירוקה)', ['business_id'], ['api_key', 'api_secret']),
  hashavshevet: file('hashavshevet', 'חשבשבת', ['import_format'], 'ייצוא קובץ לקליטה בחשבשבת'),
  rivhit: api('rivhit', 'רווחית', [], ['api_token']),
  sumit: api('sumit', 'SUMIT', ['company_id'], ['api_key']),
  paperless: api('paperless', 'Paperless', [], ['api_key']),
  priority: api('priority', 'Priority', ['url', 'company'], ['user', 'password']),
  costapp: mail('costapp', 'CostApp'),
  smartbee: mail('smartbee', 'SmartBee'),
  finbot: mail('finbot', 'Finbot'),
  ezcount: mail('ezcount', 'EZcount'),
  invoice4u: mail('invoice4u', 'Invoice4U'),
  cardcom: mail('cardcom', 'Cardcom'),
  linet: mail('linet', 'Linet'),
  wizcloud: mail('wizcloud', 'WizCloud'),
  custom: { id: 'custom', label: 'תוכנה אחרת', kind: 'custom', fields: ['mode', 'intake_email', 'note', 'contact', 'contact_email'], secrets: [], test: async (cfg, s, ctx) => (cfg?.mode === 'files' ? { ok: true, note: 'המסמכים יוצאים בקבצים' } : mailTest(ctx?.name || 'התוכנה')(cfg, s, ctx)), send: null },
}

/** only the settings an adapter knows, as short plain text (nothing else is stored on the connection) */
export function cleanConfig(provider, raw) {
  const ad = ADAPTERS[provider]; const out = {}
  for (const k of ad?.fields || []) {
    const v = raw?.[k]
    if (v == null || typeof v === 'object') continue
    const s = String(v).replace(/[\u0000-\u001f‎‏‪-‮]/g, ' ').trim().slice(0, k === 'note' ? 500 : 200)
    if (s) out[k] = k === 'intake_email' || k === 'contact_email' ? s.toLowerCase() : s
  }
  if (ad?.kind === 'custom') out.mode = out.mode === 'files' ? 'files' : 'email'
  return out
}
