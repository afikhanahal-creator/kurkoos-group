// Scheduled reports (docs/finance/REPORTS.md): the morning report grown into reports an admin sets up.
// A report = a template + companies + a period + a weekly schedule (days and hours, several a day) + who gets it
// (members by email, registered WhatsApp numbers). They live in fin_automations.config.reports of "morning_report".
// The five-minute tick sends what is due (reportsTick); a claim row makes each slot go out once. Every sending is a run
// in fin_agent_runs (agent "summary", details.kind "report") with the figures it sent and a line per recipient, so a
// past report opens as it was and a failed delivery is sent again. All figures are computed from fin_documents; the
// optional AI lines are written only from those figures and are marked as AI.
import { sb, one, insert, patch, agentRun } from './db.js'
import { env, costOf } from './env.js'
import { DOC_TYPE, docDate } from '../../src/pages/finance/format.js'

export const TEMPLATES = {
  morning: { name: 'דוח בוקר', hint: 'מה נאסף ב-24 השעות האחרונות, מה ממתין לבדיקה ומה מוכן לרו״ח בתקופת הדיווח', fixedPeriod: true },
  daily: { name: 'סקירה פיננסית יומית', hint: 'לכל חברה: מסמכים שהתקבלו, חשבוניות, סך ההוצאות ומה ממתין לטיפול', blocks: ['by_company_fin', 'pending', 'alerts'] },
  expenses: { name: 'מעקב הוצאות', hint: 'סך ההוצאות לפי חברה וקטגוריה, ההוצאות הגבוהות, שינוי מול התקופה הקודמת וחריגות', blocks: ['by_company_change', 'by_category', 'top_expenses', 'suspicious', 'alerts'] },
  documents: { name: 'פעילות מסמכים', hint: 'כמה מסמכים התקבלו, נקראו, ממתינים ונכשלו, לפי חברה ולפי סוג מסמך', blocks: ['by_company_docs', 'by_type', 'missing', 'alerts'] },
  executive: { name: 'תקציר מנהלים', hint: 'תמונה קצרה להנהלה: הוצאות, חלוקה לפי חברה, מצב המסמכים ומה דורש תשומת לב', blocks: ['by_company_change', 'pending', 'alerts'] },
  custom: { name: 'דוח בהתאמה אישית', hint: 'בוחרים אילו נתונים וטבלאות יופיעו' },
}
/* what a custom report can show */
export const FIELDS = {
  total_expenses: 'סך ההוצאות', docs_count: 'מספר המסמכים', invoices_count: 'מספר החשבוניות', pending_count: 'ממתינים לבדיקה',
  by_company_fin: 'טבלה: הוצאות לפי חברה', by_company_change: 'טבלה: שינוי מול התקופה הקודמת', by_company_docs: 'טבלה: מסמכים לפי חברה',
  by_category: 'טבלה: הוצאות לפי קטגוריה', top_expenses: 'טבלה: ההוצאות הגבוהות', by_type: 'טבלה: לפי סוג מסמך',
  suspicious: 'חריגות וכפילויות אפשריות', pending: 'מה ממתין לטיפול', missing: 'ספקים קבועים שלא שלחו החודש', alerts: 'התראות',
}
export const PERIODS = { today: 'היום', yesterday: 'אתמול', last7: '7 הימים האחרונים', this_week: 'השבוע', prev_week: 'השבוע שעבר', this_month: 'החודש', prev_month: 'החודש שעבר', custom: 'טווח תאריכים' }
export const TZS = ['Asia/Jerusalem', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC']
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const HE_M = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

// ---------- time ----------
/* the wall clock of a time zone: { date: 'YYYY-MM-DD', time: 'HH:MM', dow: 0 (Sunday) … 6 } */
export function clockIn(tz, now = new Date()) {
  const zone = TZS.includes(tz) ? tz : 'Asia/Jerusalem'
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) }
}
const addDays = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
const dmy = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.${iso.slice(0, 4)}`
/* the dates a report covers and the equal period before it, for "compared with" */
export function periodOf(report, today) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay()
  const month0 = `${today.slice(0, 7)}-01`
  const prevMonthEnd = addDays(month0, -1); const prevMonth0 = `${prevMonthEnd.slice(0, 7)}-01`
  let from; let to; let label
  switch (report.period) {
    case 'today': from = to = today; label = `היום, ${dmy(today)}`; break
    case 'last7': from = addDays(today, -6); to = today; label = `7 הימים האחרונים (${dmy(from)} – ${dmy(to)})`; break
    case 'this_week': from = addDays(today, -dow); to = today; label = `השבוע (${dmy(from)} – ${dmy(to)})`; break
    case 'prev_week': to = addDays(today, -dow - 1); from = addDays(to, -6); label = `השבוע שעבר (${dmy(from)} – ${dmy(to)})`; break
    case 'this_month': from = month0; to = today; label = `${HE_M[Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}`; break
    case 'prev_month': from = prevMonth0; to = prevMonthEnd; label = `${HE_M[Number(from.slice(5, 7)) - 1]} ${from.slice(0, 4)}`; break
    case 'custom': from = /^\d{4}-\d{2}-\d{2}$/.test(report.from || '') ? report.from : today; to = /^\d{4}-\d{2}-\d{2}$/.test(report.to || '') && report.to >= from ? report.to : from; label = from === to ? dmy(from) : `${dmy(from)} – ${dmy(to)}`; break
    default: from = to = addDays(today, -1); label = `אתמול, ${dmy(from)}`
  }
  const len = Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400_000) + 1
  return { from, to, label, prevFrom: addDays(from, -len), prevTo: addDays(from, -1), days: len }
}

// ---------- the figures ----------
const INVOICE = ['invoice', 'invoice_receipt', 'supplier_bill', 'proforma']
const OUT = ['rejected', 'duplicate', 'archived', 'failed', 'processing']
const r2 = (v) => Math.round(v * 100) / 100
const ils = (d) => ((d.currency || 'ILS') === 'ILS' ? (d.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(d.total_amount) || 0) : 0)
const nis = (v) => `₪${Number(v || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const int = (v) => Number(v || 0).toLocaleString('he-IL')
const need = (d) => !d.supplier_name || !d.doc_type || d.doc_type === 'other' || !d.business_id || !d.issue_date || d.total_amount == null || d.total_amount === '' || !d.doc_number
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : null)
const change = (cur, prev) => { const p = pct(cur, prev); return p === null ? (cur ? 'חדש' : '—') : `${p > 0 ? '+' : ''}${p}%` }

/* everything a report can say, from the documents themselves. Pure: (report, { docs, businesses, today }) → model */
export function buildModel(report, { docs, businesses, today }) {
  const tpl = TEMPLATES[report.template] ? report.template : 'daily'
  const p = periodOf(report, today)
  const chosen = Array.isArray(report.companies) && report.companies.length ? new Set(report.companies) : null
  const names = new Map(businesses.map((b) => [b.id, b.name]))
  const NONE = 'לא משויך לחברה'
  const mine = docs.filter((d) => d.status !== 'archived' && (!chosen || chosen.has(d.business_id)))
  const day = (d) => String(docDate(d)).slice(0, 10)
  const got = (d) => String(d.created_at || '').slice(0, 10)
  const counted = mine.filter((d) => !OUT.includes(d.status))
  const cur = counted.filter((d) => day(d) >= p.from && day(d) <= p.to)
  const prev = counted.filter((d) => day(d) >= p.prevFrom && day(d) <= p.prevTo)
  const received = mine.filter((d) => got(d) >= p.from && got(d) <= p.to)
  const waiting = mine.filter((d) => d.status === 'review')
  const lacking = waiting.filter(need)
  const failed = mine.filter((d) => d.status === 'failed')
  const sum = (list) => r2(list.reduce((a, d) => a + ils(d), 0))
  const total = sum(cur); const totalPrev = sum(prev)
  const foreign = cur.filter((d) => (d.currency || 'ILS') !== 'ILS').length

  const companyKey = (d) => (d.business_id && names.has(d.business_id) ? d.business_id : 'none')
  const order = [...businesses.filter((b) => !chosen || chosen.has(b.id)).map((b) => b.id), ...(chosen ? [] : ['none'])]
  const perCompany = order.map((id) => {
    const of = (list) => list.filter((d) => companyKey(d) === id)
    const c = of(cur)
    return { id, name: id === 'none' ? NONE : names.get(id), docs: c.length, invoices: c.filter((d) => INVOICE.includes(d.doc_type)).length, other: c.filter((d) => !INVOICE.includes(d.doc_type)).length, total: sum(c), prev: sum(of(prev)), received: of(received).length, waiting: of(waiting).length, lacking: of(lacking).length, failed: of(failed).length }
  }).filter((c) => c.docs || c.prev || c.received || c.waiting || c.failed || (chosen && chosen.has(c.id)))

  const cats = new Map()
  for (const d of cur) { const k = d.category || 'ללא קטגוריה'; const g = cats.get(k) || { name: k, docs: 0, total: 0 }; g.docs++; g.total += ils(d); cats.set(k, g) }
  const byCategory = [...cats.values()].map((g) => ({ ...g, total: r2(g.total) })).sort((a, b) => b.total - a.total)
  const top = [...cur].filter((d) => ils(d) > 0).sort((a, b) => ils(b) - ils(a)).slice(0, 5)
  const types = new Map()
  for (const d of received) { const k = DOC_TYPE[d.doc_type] || 'לא ידוע'; types.set(k, (types.get(k) || 0) + 1) }

  // unusual: a possible duplicate, or a sum far above what this supplier usually bills (3 earlier documents at least)
  const bySupplier = new Map()
  for (const d of counted) if (d.supplier_name && ils(d) > 0 && day(d) < p.from) (bySupplier.get(d.supplier_name) || bySupplier.set(d.supplier_name, []).get(d.supplier_name)).push(ils(d))
  const suspicious = []
  for (const d of mine.filter((x) => day(x) >= p.from && day(x) <= p.to)) {
    if (d.duplicate_state === 'suspected' && d.status === 'review') suspicious.push({ d, why: 'חשד לכפילות של מסמך קיים' })
    else if (!OUT.includes(d.status)) { const past = (bySupplier.get(d.supplier_name) || []).sort((a, b) => a - b); const med = past.length >= 3 ? past[Math.floor(past.length / 2)] : 0; if (med && ils(d) >= med * 3 && ils(d) - med >= 500) suspicious.push({ d, why: `גבוה פי ${Math.round(ils(d) / med)} מהרגיל אצל הספק (${nis(med)})` }) }
  }
  // regular suppliers (3 of the last 4 months) with nothing yet this month
  const monthNow = today.slice(0, 7); const seen = new Map()
  for (const d of counted) if (d.supplier_name) (seen.get(d.supplier_name) || seen.set(d.supplier_name, new Set()).get(d.supplier_name)).add(day(d).slice(0, 7))
  const last4 = [1, 2, 3, 4].map((i) => { const t = new Date(`${monthNow}-01T00:00:00Z`); t.setUTCMonth(t.getUTCMonth() - i); return t.toISOString().slice(0, 7) })
  const missing = [...seen.entries()].filter(([, s]) => last4.filter((m) => s.has(m)).length >= 3 && !s.has(monthNow)).map(([n]) => n).sort((a, b) => a.localeCompare(b, 'he')).slice(0, 12)

  const alerts = []
  if (failed.length) alerts.push(`${failed.length === 1 ? 'מסמך אחד לא נקרא' : `${int(failed.length)} מסמכים לא נקראו`} ומחכים לקריאה חוזרת או להשלמה ידנית`)
  if (lacking.length) alerts.push(`${lacking.length === 1 ? 'למסמך אחד חסרים פרטים' : `ל-${int(lacking.length)} מסמכים חסרים פרטים`} (חברה, סכום, תאריך או מספר)`)
  const unassigned = waiting.filter((d) => !d.business_id).length
  if (unassigned && !chosen) alerts.push((unassigned === 1 ? 'מסמך אחד ממתין בלי שיוך לחברה' : `${int(unassigned)} מסמכים ממתינים בלי שיוך לחברה`))
  for (const c of perCompany) if (c.id !== 'none' && c.prev >= 1000 && c.total >= c.prev * 1.3 && c.total - c.prev >= 1000) alerts.push(`ההוצאות של ${c.name} עלו ב-${pct(c.total, c.prev)}% מול התקופה הקודמת (${nis(c.prev)} ← ${nis(c.total)})`)
  if (suspicious.length) alerts.push(`${suspicious.length === 1 ? 'מסמך אחד חריג או חשוד ככפול' : `${int(suspicious.length)} מסמכים חריגים או חשודים ככפולים`} בתקופה`)
  if (foreign) alerts.push(`${foreign === 1 ? 'מסמך אחד במטבע זר' : `${int(foreign)} מסמכים במטבע זר`} מופיעים בספירה ואינם בסכומים בשקלים`)

  const card = { total_expenses: { label: 'סך ההוצאות', value: nis(total), sub: `מול ${nis(totalPrev)} בתקופה הקודמת (${change(total, totalPrev)})`, tone: 'navy' }, docs_count: { label: 'מסמכים בתקופה', value: int(cur.length), sub: `${int(received.length)} התקבלו בתקופה`, tone: 'blue' }, invoices_count: { label: 'חשבוניות', value: int(cur.filter((d) => INVOICE.includes(d.doc_type)).length), sub: `${int(cur.filter((d) => !INVOICE.includes(d.doc_type)).length)} קבלות ומסמכים אחרים`, tone: 'blue' }, pending_count: { label: 'ממתינים לבדיקה', value: int(waiting.length), sub: waiting.length ? `${int(lacking.length)} מהם חסרי פרטים` : 'אין מה לאשר', tone: waiting.length ? 'warn' : 'ok' },
    received: { label: 'התקבלו', value: int(received.length), sub: 'מסמכים שנכנסו בתקופה', tone: 'blue' }, processed: { label: 'נקראו בהצלחה', value: int(received.filter((d) => !['failed', 'processing'].includes(d.status)).length), sub: 'מתוך מה שהתקבל', tone: 'ok' }, failed: { label: 'הקריאה נכשלה', value: int(failed.length), sub: failed.length ? 'דורשים טיפול' : 'אין תקלות', tone: failed.length ? 'bad' : 'ok' }, alerts: { label: 'דורש תשומת לב', value: int(alerts.length), sub: alerts.length ? 'מפורט למטה' : 'הכול תקין', tone: alerts.length ? 'warn' : 'ok' },
    top: { label: 'ההוצאה הגבוהה', value: top[0] ? nis(ils(top[0])) : '—', sub: top[0] ? String(top[0].supplier_name || '').slice(0, 40) : 'אין הוצאות בתקופה', tone: 'navy' }, change: { label: 'שינוי מהתקופה הקודמת', value: change(total, totalPrev), sub: `${nis(totalPrev)} ← ${nis(total)}`, tone: 'blue' } }
  const table = {
    by_company_fin: perCompany.length && { title: 'לפי חברה', head: ['חברה', 'מסמכים', 'חשבוניות', 'מסמכי הוצאה אחרים', 'סך ההוצאות'], rows: perCompany.map((c) => [c.name, int(c.docs), int(c.invoices), int(c.other), nis(c.total)]), foot: ['סה״כ', int(cur.length), '', '', nis(total)] },
    by_company_change: perCompany.length && { title: 'הוצאות לפי חברה, מול התקופה הקודמת', head: ['חברה', 'התקופה', 'התקופה הקודמת', 'שינוי'], rows: perCompany.map((c) => [c.name, nis(c.total), nis(c.prev), change(c.total, c.prev)]), foot: ['סה״כ', nis(total), nis(totalPrev), change(total, totalPrev)] },
    by_company_docs: perCompany.length && { title: 'מסמכים לפי חברה', head: ['חברה', 'התקבלו', 'ממתינים לבדיקה', 'חסרי פרטים', 'נכשלו'], rows: perCompany.map((c) => [c.name, int(c.received), int(c.waiting), int(c.lacking), int(c.failed)]) },
    by_category: byCategory.length && { title: 'הוצאות לפי קטגוריה', head: ['קטגוריה', 'מסמכים', 'סכום', 'חלק מההוצאות'], rows: byCategory.slice(0, 10).map((g) => [g.name, int(g.docs), nis(g.total), total ? `${Math.round((g.total / total) * 100)}%` : '—']) },
    top_expenses: top.length && { title: 'ההוצאות הגבוהות בתקופה', head: ['ספק', 'חברה', 'תאריך', 'סכום'], rows: top.map((d) => [d.supplier_name || 'לא ידוע', names.get(d.business_id) || NONE, dmy(day(d)), nis(ils(d))]) },
    by_type: types.size && { title: 'לפי סוג מסמך', head: ['סוג מסמך', 'התקבלו'], rows: [...types.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, int(v)]) },
    suspicious: suspicious.length && { title: 'חריגות וכפילויות אפשריות', head: ['ספק', 'סכום', 'הסיבה'], rows: suspicious.slice(0, 8).map(({ d, why }) => [d.supplier_name || 'לא ידוע', nis(Math.abs(Number(d.total_amount) || 0)), why]) },
    pending: (waiting.length || failed.length) ? { title: 'מה ממתין לטיפול', head: ['מה', 'כמה'], rows: [['ממתינים לבדיקה ולאישור', int(waiting.length)], ['מתוכם חסרי פרטים', int(lacking.length)], ['הקריאה נכשלה', int(failed.length)]] } : null,
    missing: missing.length && { title: 'ספקים קבועים שעוד לא שלחו החודש', head: ['ספק'], rows: missing.map((n) => [n]) },
  }
  const CARDS = { daily: ['received', 'invoices_count', 'total_expenses', 'pending_count'], expenses: ['total_expenses', 'docs_count', 'top', 'change'], documents: ['received', 'processed', 'pending_count', 'failed'], executive: ['total_expenses', 'docs_count', 'pending_count', 'alerts'] }
  const fields = tpl === 'custom' ? (Array.isArray(report.fields) ? report.fields : []).filter((f) => FIELDS[f]) : null
  const cards = (fields ? fields.filter((f) => card[f]) : CARDS[tpl] || CARDS.daily).slice(0, 4).map((k) => card[k])
  const blocks = fields ? fields.filter((f) => f in table || f === 'alerts') : TEMPLATES[tpl].blocks || []
  return {
    template: tpl, title: report.name || TEMPLATES[tpl].name, period: p, companies: chosen ? perCompany.filter((c) => c.id !== 'none').map((c) => c.name) : null,
    cards, tables: blocks.filter((b) => b !== 'alerts').map((b) => table[b]).filter(Boolean), alerts: blocks.includes('alerts') ? alerts : [], insights: [],
    empty: !cur.length && !received.length && !waiting.length,
  }
}

// ---------- how it reads ----------
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const TONE = { navy: '#07293a', blue: '#16688c', warn: '#b7791f', ok: '#1f6f4c', bad: '#a90b0c' }
/* the email: tables and inline styles, every cell right to left (mail apps drop <body> styles) */
export function reportHtml(m, origin = '', now = new Date()) {
  const F = 'font-family:Arial,Helvetica,sans-serif'
  const day = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const w = m.cards.length ? Math.floor(100 / m.cards.length) : 100
  const card = (c) => `<td dir="rtl" width="${w}%" valign="top" style="padding:5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #dbe3ea;border-top:4px solid ${TONE[c.tone] || TONE.navy};border-radius:12px"><tr><td dir="rtl" height="112" valign="top" style="padding:14px 12px 12px;text-align:right;${F}">
    <div style="font-size:13px;font-weight:700;color:#3d4b57;${F}">${esc(c.label)}</div>
    <div dir="ltr" style="font-size:26px;font-weight:700;color:${TONE[c.tone] || TONE.navy};line-height:1.2;margin:6px 0 8px;text-align:right;${F}">${esc(c.value)}</div>
    <div style="font-size:12px;line-height:1.5;color:#5b6b7a;${F}">${esc(c.sub)}</div></td></tr></table></td>`
  const tbl = (t) => `<tr><td dir="rtl" style="padding:10px 26px 4px;text-align:right;${F}">
    <div style="font-size:15px;font-weight:700;color:#07293a;margin-bottom:6px;${F}">${esc(t.title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d5dee8;border-radius:12px;background:#ffffff">
      <tr>${t.head.map((h, i) => `<td dir="rtl" style="padding:9px 8px;background:#eef3f7;color:#5b6b7a;font-size:12px;font-weight:700;text-align:${i ? 'center' : 'right'};${F}">${esc(h)}</td>`).join('')}</tr>
      ${t.rows.map((r) => `<tr>${r.map((v, i) => `<td dir="${i ? 'ltr' : 'rtl'}" style="padding:10px 8px;border-top:1px solid #e6ecf2;text-align:${i ? 'center' : 'right'};color:#14202b;font-size:13px;${i ? '' : 'font-weight:700;'}line-height:1.35;${F}">${esc(v)}</td>`).join('')}</tr>`).join('')}
      ${t.foot ? `<tr>${t.foot.map((v, i) => `<td dir="${i ? 'ltr' : 'rtl'}" style="padding:10px 8px;border-top:2px solid #c5d3df;background:#f3f7fa;text-align:${i ? 'center' : 'right'};color:#07293a;font-size:13px;font-weight:700;${F}">${esc(v)}</td>`).join('')}</tr>` : ''}
    </table></td></tr>`
  const box = (title, lines, bg, line, ink, note = '') => `<tr><td dir="rtl" style="padding:8px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:1px solid ${line};border-radius:12px"><tr><td dir="rtl" style="padding:12px 16px;text-align:right;color:${ink};font-size:14px;${F}"><b>${title}</b>${lines.map((t) => `<div style="margin-top:4px;line-height:1.5;${F}">• ${esc(t)}</div>`).join('')}${note ? `<div style="margin-top:8px;font-size:12px;opacity:0.85;${F}">${note}</div>` : ''}</td></tr></table></td></tr>`
  const btn = (label, href, main) => `<a href="${href}" style="display:inline-block;margin:4px;padding:12px 22px;border-radius:10px;${main ? 'background:#07293a;color:#ffffff;' : 'background:#ffffff;color:#07293a;border:1px solid #c5d3df;'}font-size:14px;font-weight:700;text-decoration:none;${F}">${label}</a>`
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body dir="rtl" style="margin:0;padding:0;background:#eef2f6;${F}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="760" cellpadding="0" cellspacing="0" style="max-width:760px;width:100%;background:#f7f9fb;border-radius:16px;overflow:hidden">
  <tr><td dir="rtl" style="background:#07293a;padding:20px 26px;${F}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td dir="rtl" valign="middle" style="text-align:right;${F}">
      <div style="font-size:12px;letter-spacing:0.08em;color:#8cc4dc;font-weight:700;${F}">KURKOOS FINANCE</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;${F}">${esc(m.title)}</div>
      <div style="font-size:13px;color:#cfe3ec;margin-top:2px;${F}">${esc(m.period.label)} · ${m.companies ? esc(m.companies.join(', ')) : 'כל החברות'}</div>
    </td>
    <td width="70" valign="middle" style="text-align:left"><img src="${esc(origin)}/finance/email-logo.png" width="55" height="64" alt="Kurkoos Group" style="display:block;border:0;width:55px;height:64px"></td>
  </tr></table></td></tr>
  ${m.cards.length ? `<tr><td style="padding:16px 14px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${m.cards.map(card).join('')}</tr></table></td></tr>` : ''}
  ${m.empty ? `<tr><td dir="rtl" style="padding:14px 26px;text-align:right;color:#5b6b7a;font-size:14px;${F}">אין מסמכים בתקופה הזו בחברות שנבחרו.</td></tr>` : ''}
  ${m.alerts.length ? box('דורש תשומת לב', m.alerts, '#fbf2dc', '#ecd9a6', '#6b4600') : ''}
  ${m.insights.length ? box('תובנות AI', m.insights, '#eaf3f8', '#c3dbe8', '#0d4560', 'נכתבו על ידי AI מתוך הנתונים שבדוח. הנתונים עצמם מחושבים מהמסמכים שבמערכת.') : ''}
  ${m.tables.map(tbl).join('')}
  <tr><td align="center" style="padding:18px 20px 22px">${btn('כניסה למערכת', `${esc(origin)}/admin/finance`, true)}${btn('לבדיקה ואישור', `${esc(origin)}/admin/finance/pending`, false)}</td></tr>
  <tr><td dir="rtl" style="padding:14px 26px;border-top:1px solid #e1e8ef;text-align:right;color:#8a97a3;font-size:12px;${F}">הופק ${esc(day)}. הסכומים בשקלים, לפי התאריך שעל המסמך; מסמכים שנדחו, כפולים או בארכיון אינם נספרים.<br>Kurkoos Finance · קבוצת קורקוס</td></tr>
</table></td></tr></table></body></html>`
}
/* WhatsApp: the main figures in a few lines and a link to the system */
export function reportText(m, origin = '') {
  const lines = [`*${m.title}*`, `${m.period.label} · ${m.companies ? m.companies.join(', ') : 'כל החברות'}`, '']
  for (const c of m.cards) lines.push(`• ${c.label}: ${c.value}`)
  const t = m.tables.find((x) => /חברה/.test(x.head[0]))
  if (t) { lines.push('', `${t.title}:`); const col = t.head.findIndex((h) => /סך ההוצאות|התקופה$/.test(h)); for (const r of t.rows.slice(0, 6)) lines.push(`• ${r[0]}: ${r[col > 0 ? col : 1]}`) }
  if (m.alerts.length) { lines.push('', 'דורש תשומת לב:'); for (const a of m.alerts.slice(0, 3)) lines.push(`• ${a}`) }
  if (m.insights.length) { lines.push('', 'תובנות AI:'); for (const a of m.insights.slice(0, 2)) lines.push(`• ${a}`) }
  if (origin) lines.push('', `לדוח המלא: ${origin}/admin/finance`)
  return lines.join('\n').slice(0, 3500)
}

// ---------- the optional AI lines: only from the figures above ----------
async function aiInsights(m) {
  if (!env.anthropicKey() || m.empty) return []
  try {
    const { overBudget, noteSpend } = await import('./budget.js')
    if ((await overBudget().catch(() => ({ over: false }))).over) return []
    const facts = JSON.stringify({ period: m.period.label, cards: m.cards.map((c) => [c.label, c.value, c.sub]), tables: m.tables.map((t) => ({ title: t.title, head: t.head, rows: t.rows.slice(0, 12) })), alerts: m.alerts })
    const schema = { type: 'object', additionalProperties: false, required: ['insights'], properties: { insights: { type: 'array', items: { type: 'string' } } } }
    const r = await fetch(`${env.anthropic()}/v1/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.anthropicKey(), 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ model: env.modelTriage(), max_tokens: 400, output_config: { format: { type: 'json_schema', schema } }, messages: [{ role: 'user', content: `REPORT INSIGHTS: אלה הנתונים של דוח כספי של קבוצת חברות, בפורמט JSON. כתוב עד שלוש תובנות קצרות בעברית (משפט אחד כל אחת) שמנהל יכול לפעול לפיהן: עלייה חדה בהוצאות של חברה, הוצאה חריגה, הרבה מסמכים שממתינים, חברה עם מסמכים חסרים. השתמש רק במספרים ובשמות שמופיעים בנתונים. אל תמציא נתון, חברה או מסמך. אם אין משהו ששווה לציין, החזר רשימה ריקה.\n\n${facts}` }] }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return []
    noteSpend(costOf(env.modelTriage(), d.usage?.input_tokens || 0, d.usage?.output_tokens || 0))
    const x = JSON.parse((d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('') || '{}')
    return (Array.isArray(x.insights) ? x.insights : []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 220)).slice(0, 3)
  } catch { return [] }
}

// ---------- configuration ----------
export const LEGACY = { id: 'default', name: 'דוח בוקר', enabled: true, template: 'morning', companies: 'all', period: 'yesterday', tz: 'Asia/Jerusalem', slots: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ id: `d${d}`, day: d, time: '07:00', enabled: true })), users: 'managers', wa: [], ai: false }
const uid = () => Math.random().toString(36).slice(2, 10)
/* what an admin sent, kept only if it is valid and points at members, numbers and companies that exist */
export function cleanReports(input, { members = [], senders = [], businesses = [] } = {}) {
  const mem = new Set(members.filter((m) => m.active !== false).map((m) => m.user_id)); const snd = new Set(senders.filter((s) => s.active !== false).map((s) => s.id)); const biz = new Set(businesses.map((b) => b.id))
  return (Array.isArray(input) ? input : []).slice(0, 20).map((r) => {
    const template = TEMPLATES[r.template] ? r.template : 'daily'
    const slots = (Array.isArray(r.slots) ? r.slots : []).filter((s) => Number.isInteger(s.day) && s.day >= 0 && s.day <= 6 && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time || '')).slice(0, 42)
      .map((s) => ({ id: /^[a-z0-9]{2,12}$/.test(s.id || '') ? s.id : uid(), day: s.day, time: s.time, enabled: s.enabled !== false }))
    const seen = new Set(); const uniq = slots.filter((s) => { const k = `${s.day}|${s.time}`; if (seen.has(k)) return false; seen.add(k); return true }).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    const companies = Array.isArray(r.companies) ? r.companies.filter((id) => biz.has(id)) : 'all'
    return {
      id: /^[a-z0-9]{2,12}$/.test(r.id || '') ? r.id : uid(), name: String(r.name || TEMPLATES[template].name).trim().slice(0, 60) || TEMPLATES[template].name, enabled: r.enabled !== false, template,
      fields: template === 'custom' ? (Array.isArray(r.fields) ? r.fields.filter((f) => FIELDS[f]) : []).slice(0, 14) : undefined,
      companies: Array.isArray(companies) && companies.length ? companies : 'all', period: PERIODS[r.period] ? r.period : 'yesterday',
      from: r.period === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(r.from || '') ? r.from : undefined, to: r.period === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(r.to || '') ? r.to : undefined,
      tz: TZS.includes(r.tz) ? r.tz : 'Asia/Jerusalem', slots: uniq,
      users: r.users === 'managers' ? 'managers' : (Array.isArray(r.users) ? r.users.filter((id) => mem.has(id)) : []), wa: (Array.isArray(r.wa) ? r.wa.filter((id) => snd.has(id)) : []), ai: r.ai === true,
    }
  })
}
async function world() {
  const [members, senders, businesses] = await Promise.all([sb('fin_members?select=user_id,email,full_name,role,active'), sb('fin_whatsapp_senders?select=id,phone,label,active'), sb('fin_businesses?select=id,name,sort,active,archived_at&order=sort,name')])
  return { members: members || [], senders: senders || [], businesses: (businesses || []).filter((b) => !b.archived_at) }
}
export async function loadReports() {
  const a = await one('fin_automations?key=eq.morning_report&select=enabled,config')
  const set = Array.isArray(a?.config?.reports)
  return { enabled: a?.enabled !== false, configured: set, reports: set ? a.config.reports : [LEGACY], templates: Array.isArray(a?.config?.templates) ? a.config.templates : [], config: a?.config || {} }
}
export async function saveReports(input, templates) {
  const w = await world()
  const cur = await loadReports()
  const reports = cleanReports(input, w)
  const tpls = (Array.isArray(templates) ? templates : cur.templates).slice(0, 20).map((t) => ({ id: /^[a-z0-9]{2,12}$/.test(t.id || '') ? t.id : uid(), name: String(t.name || '').trim().slice(0, 60) || 'תבנית', fields: (Array.isArray(t.fields) ? t.fields : []).filter((f) => FIELDS[f]).slice(0, 14) }))
  await patch('fin_automations?key=eq.morning_report', { config: { ...cur.config, reports, templates: tpls }, updated_at: new Date().toISOString() })
  return { reports, templates: tpls }
}

// ---------- building and sending ----------
async function modelOf(report, { origin = '', now = new Date() } = {}) {
  if (report.template === 'morning') {
    const { buildSummary, summaryHtml } = await import('./agents.js')
    const d = await buildSummary(now)
    const text = [`*${report.name || 'דוח בוקר'}*`, '', `• ממתינים לבדיקה: ${d.review}`, `• מוכנים לרו״ח (${d.period?.label || ''}): ${d.ready_to_export}${d.ready_to_export ? `, ${nis(d.ready_total)}` : ''}`, `• נאספו ב-24 שעות: ${d.collected}`, ...((d.by_company || []).length ? ['', 'לפי חברה:', ...d.by_company.slice(0, 6).map((c) => `• ${c.name}: ${c.review} לבדיקה, ${c.ready} מוכנים`)] : []), ...(origin ? ['', `לדוח המלא: ${origin}/admin/finance`] : [])].join('\n')
    return { model: { template: 'morning', title: report.name || 'דוח בוקר', summary: d, period: { label: '24 השעות האחרונות' } }, html: summaryHtml(d, origin, now), text, subject: `${report.name || 'דוח בוקר'} · ${d.review} לבדיקה · ${d.ready_to_export} מוכנים לרו״ח (${d.period?.label || ''})` }
  }
  const w = await world()
  const today = clockIn(report.tz, now).date
  const p = periodOf(report, today)
  const back = new Date(`${today.slice(0, 7)}-01T00:00:00Z`); back.setUTCMonth(back.getUTCMonth() - 4)
  const since = [p.prevFrom, back.toISOString().slice(0, 10)].sort()[0]
  const docs = (await sb(`fin_documents?or=(issue_date.gte.${since},created_at.gte.${since})&select=id,business_id,supplier_name,doc_type,doc_number,issue_date,email_date,created_at,status,total_amount,currency,category,duplicate_state&limit=20000`)) || []
  const model = buildModel(report, { docs, businesses: w.businesses, today })
  if (report.ai) model.insights = await aiInsights(model)
  return { model, html: reportHtml(model, origin, now), text: reportText(model, origin), subject: `${model.title} · ${model.period.label}` }
}
export const previewReport = async (report, origin) => { const w = await world(); const [clean] = cleanReports([report], w); const r = await modelOf(clean, { origin }); return { html: r.html, text: r.text, subject: r.subject, empty: !!r.model.empty } }

async function recipientsOf(report, w) {
  const active = w.members.filter((m) => m.active !== false && m.email)
  const users = report.users === 'managers' ? active.filter((m) => ['admin', 'finance_manager'].includes(m.role)) : active.filter((m) => (report.users || []).includes(m.user_id))
  const wa = w.senders.filter((s) => s.active !== false && (report.wa || []).includes(s.id))
  return { emails: users.map((m) => ({ channel: 'email', to: m.email, name: m.full_name || m.email })), phones: wa.map((s) => ({ channel: 'whatsapp', to: s.phone, name: s.label || s.phone })) }
}
async function deliver(list, { html, text, subject }) {
  const { sendMail } = await import('./agents.js'); const { sendText } = await import('./whatsapp.js')
  const out = []
  for (const r of list) {
    try {
      if (r.channel === 'email') { const s = await sendMail([r.to], subject, html); out.push({ ...r, ok: !!s.sent, error: s.sent ? null : (s.reason === 'RESEND_API_KEY missing' ? 'שירות המייל לא מוגדר' : s.reason || 'לא נשלח') }) }
      else { const s = await sendText(r.to, text); out.push({ ...r, ok: s.ok, error: s.ok ? null : s.error }) }
    } catch (e) { out.push({ ...r, ok: false, error: String(e.message || e).slice(0, 160) }) }
  }
  return out
}
/* one sending. `only`: a test goes to these recipients instead of the report's own. */
export async function runReport(report, { trigger = 'schedule', slot = null, origin = '', only = null } = {}) {
  const run = await agentRun('summary', trigger)
  try {
    const w = await world()
    const built = await modelOf(report, { origin })
    const list = only || (await recipientsOf(report, w).then((r) => [...r.emails, ...r.phones]))
    const results = await deliver(list, built)
    const okN = results.filter((r) => r.ok).length
    run.stat.processed = okN; run.stat.errors = results.length - okN
    run.stat.details = { kind: 'report', report_id: report.id, report_name: report.name, template: report.template, slot: slot ? `${DAYS[slot.day]} ${slot.time}` : null, test: trigger === 'test', period: built.model.period?.label || '', companies: built.model.companies || null, subject: built.subject, results, report, model: built.model }
    if (!results.length) run.stat.details.error = 'לא נבחרו נמענים לדוח'
    await run.done(!results.length ? 'error' : okN === results.length ? 'ok' : okN ? 'partial' : 'error')
    return { sent: okN, failed: results.length - okN, results, recipients: results.length }
  } catch (e) { run.stat.errors = 1; run.stat.details = { kind: 'report', report_id: report.id, report_name: report.name, template: report.template, error: String(e.message || e).slice(0, 300), results: [] }; await run.done('error'); throw e }
}

/* the five-minute tick: every enabled slot whose hour has come today (and not more than 90 minutes ago) goes out once */
export async function reportsTick({ origin = '', now = new Date() } = {}) {
  const cfg = await loadReports()
  if (!cfg.enabled || !cfg.configured) return null
  const out = []
  for (const r of cfg.reports.filter((x) => x.enabled)) {
    const c = clockIn(r.tz, now)
    const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
    for (const s of r.slots.filter((x) => x.enabled && x.day === c.dow && mins(x.time) <= mins(c.time) && mins(c.time) - mins(x.time) <= 90)) {
      // the claim: one row per report, slot and day; a second tick (or a second server) finds it taken
      try { await insert('fin_settings', { key: `report_sent:${r.id}:${s.id}:${c.date}`, value: new Date().toISOString(), updated_at: new Date().toISOString() }, 'return=minimal') } catch { continue }
      try { out.push({ report: r.name, slot: s.time, ...(await runReport(r, { trigger: 'schedule', slot: s, origin })) }) } catch (e) { out.push({ report: r.name, slot: s.time, error: String(e.message || e).slice(0, 160) }) }
    }
  }
  if (out.length) await sb(`fin_settings?key=like.report_sent:*&updated_at=lt.${encodeURIComponent(new Date(now.getTime() - 8 * 86400_000).toISOString())}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {})
  return out.length ? out : null
}
/* when each report goes out next (for the screen) */
export function nextSlot(report, now = new Date()) {
  const c = clockIn(report.tz, now); let best = null
  for (const s of (report.slots || []).filter((x) => x.enabled)) { const ahead = ((s.day - c.dow + 7) % 7) || (s.time > c.time ? 0 : 7); if (!best || ahead < best.ahead || (ahead === best.ahead && s.time < best.time)) best = { ahead, time: s.time, day: s.day } }
  return best && { day: DAYS[best.day], time: best.time, in_days: best.ahead }
}

// ---------- history ----------
export async function history(limit = 40) {
  const rows = (await sb(`fin_agent_runs?agent=eq.summary&details->>kind=eq.report&select=id,started_at,finished_at,status,trigger,processed,errors,details&order=started_at.desc&limit=${limit}`)) || []
  return rows.map((r) => ({ id: r.id, at: r.started_at, status: r.status, trigger: r.trigger, sent: r.processed, failed: r.errors, report_id: r.details?.report_id, name: r.details?.report_name, template: r.details?.template, slot: r.details?.slot, period: r.details?.period, companies: r.details?.companies, results: r.details?.results || [], error: r.details?.error || null }))
}
const renderRun = (d, origin, at) => (d.template === 'morning' ? import('./agents.js').then((a) => ({ html: a.summaryHtml(d.model.summary, origin, new Date(at)), text: `*${d.model.title}*\n${origin}/admin/finance` })) : Promise.resolve({ html: reportHtml(d.model, origin, new Date(at)), text: reportText(d.model, origin) }))
export async function openRun(id, origin) {
  const r = await one(`fin_agent_runs?id=eq.${encodeURIComponent(id)}&agent=eq.summary&select=started_at,details`)
  if (!r?.details?.model) throw Object.assign(new Error('הדוח הזה לא נשמר'), { status: 404 })
  return { html: (await renderRun(r.details, origin, r.started_at)).html, subject: r.details.subject }
}
/* the deliveries that failed go out again, with the very figures that were sent */
export async function retryRun(id, origin) {
  const r = await one(`fin_agent_runs?id=eq.${encodeURIComponent(id)}&agent=eq.summary&select=started_at,details`)
  if (!r?.details?.model) throw Object.assign(new Error('הדוח הזה לא נשמר'), { status: 404 })
  const failed = (r.details.results || []).filter((x) => !x.ok)
  if (!failed.length) return { retried: 0 }
  const body = await renderRun(r.details, origin, r.started_at)
  const again = await deliver(failed.map(({ channel, to, name }) => ({ channel, to, name })), { ...body, subject: r.details.subject })
  const results = (r.details.results || []).map((x) => (x.ok ? x : again.find((a) => a.channel === x.channel && a.to === x.to) || x))
  const okN = results.filter((x) => x.ok).length
  await patch(`fin_agent_runs?id=eq.${encodeURIComponent(id)}`, { status: okN === results.length ? 'ok' : okN ? 'partial' : 'error', processed: okN, errors: results.length - okN, details: { ...r.details, results, retried_at: new Date().toISOString() } })
  return { retried: failed.length, sent: again.filter((x) => x.ok).length }
}

// ---------- the screen ----------
export const cleanOne = async (report) => cleanReports([report], await world())[0]
/* a test goes to the person who asked: their own email, and one registered WhatsApp number if they picked one */
export async function testRecipients(user, waId) {
  const w = await world()
  const me = w.members.find((m) => m.user_id === user?.id)
  const list = me?.email ? [{ channel: 'email', to: me.email, name: me.full_name || me.email }] : []
  const s = waId && w.senders.find((x) => x.id === waId && x.active !== false)
  if (s) list.push({ channel: 'whatsapp', to: s.phone, name: s.label || s.phone })
  return list
}
export async function screen() {
  const [cfg, w, wa] = await Promise.all([loadReports(), world(), import('./whatsapp.js')])
  return {
    enabled: cfg.enabled, configured: cfg.configured, templates: cfg.templates,
    reports: cfg.reports.map((r) => ({ ...r, next: r.enabled && cfg.enabled ? nextSlot(r) : null })),
    members: w.members.filter((m) => m.active !== false).map((m) => ({ user_id: m.user_id, email: m.email, full_name: m.full_name, role: m.role })),
    senders: w.senders.filter((s) => s.active !== false).map((s) => ({ id: s.id, phone: s.phone, label: s.label })),
    businesses: w.businesses.filter((b) => b.active !== false).map((b) => ({ id: b.id, name: b.name })),
    channels: { email: !!process.env.RESEND_API_KEY, whatsapp: !!(process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_TOKEN), whatsapp_number: wa.officeNumber() || null, ai: !!env.anthropicKey() },
    defs: { templates: TEMPLATES, fields: FIELDS, periods: PERIODS, tzs: TZS },
  }
}
