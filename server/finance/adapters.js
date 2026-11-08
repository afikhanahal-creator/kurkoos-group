// Accounting export adapters. Every destination implements the same contract:
//   { id, label, kind: 'file' | 'api', fields: [config fields], secrets: [secret fields], test(cfg, secret), send(pkg, cfg, secret) }
// The file adapter (ZIP / CSV / Excel / PDF, built in the browser) always works.
// API adapters stay inactive until the accountant confirms which system they use and gives an API key:
// we do not guess endpoints of a financial system, so test()/send() refuse instead of pretending.
const notActive = (label) => async () => { const e = new Error(`החיבור ל-${label} עוד לא הופעל. צריך מפתח API ואישור של רו״ח על מבנה הנתונים`); e.code = 'NOT_ACTIVE'; throw e }

export const ADAPTERS = {
  file: { id: 'file', label: 'קבצים (ZIP / Excel / CSV / PDF)', kind: 'file', fields: [], secrets: [], test: async () => ({ ok: true }), send: null },
  icount: { id: 'icount', label: 'iCount', kind: 'api', fields: ['company_id', 'user'], secrets: ['api_token'], test: notActive('iCount'), send: notActive('iCount') },
  morning: { id: 'morning', label: 'Morning (חשבונית ירוקה)', kind: 'api', fields: ['business_id'], secrets: ['api_key', 'api_secret'], test: notActive('Morning'), send: notActive('Morning') },
  hashavshevet: { id: 'hashavshevet', label: 'חשבשבת', kind: 'file', fields: ['import_format'], secrets: [], test: async () => ({ ok: true, note: 'ייצוא קובץ לקליטה בחשבשבת' }), send: null },
  rivhit: { id: 'rivhit', label: 'רווחית', kind: 'api', fields: [], secrets: ['api_token'], test: notActive('רווחית'), send: notActive('רווחית') },
  priority: { id: 'priority', label: 'Priority', kind: 'api', fields: ['url', 'company'], secrets: ['user', 'password'], test: notActive('Priority'), send: notActive('Priority') },
}
