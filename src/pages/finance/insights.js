// Management figures for the group, computed from stored documents only. Used by the executive overview in the
// browser and by the finance assistant on the server, so a number on the screen and in an answer is the same number.
// Pure: no DOM, no network. Documents must have gone through markLedger (ledger.js) first.
import { markLedger, payState } from './ledger.js'

export { markLedger }
const sign = (d) => (d.doc_type === 'credit' ? -1 : 1)
const total = (d) => sign(d) * Math.abs(Number(d.total_amount) || 0)
const vatOf = (d) => sign(d) * Math.abs(Number(d.vat_amount) || 0)
const pad = (n) => String(n).padStart(2, '0')
// one formatter for every call (creating one per date was 90% of the overview's time at 10,000 documents)
const IL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })
const israelDay = (t) => { const x = new Date(t || 0); return !t || Number.isNaN(x.getTime()) ? '' : IL_DAY.format(x) }
export const dayOf = (d) => d.issue_date || israelDay(d.email_date || d.created_at)
/* in the books: not rejected, duplicate, unread, a quote, a proforma replaced or not, a payment proof of a counted invoice */
export const booked = (d) => !['rejected', 'duplicate', 'failed', 'processing', 'archived'].includes(d.status) && !['quote', 'proforma', 'payment_confirmation'].includes(d.doc_type) && !d._proofFor
const INVOICE = ['invoice', 'invoice_receipt', 'supplier_bill', 'credit']
const RECEIPT = ['receipt', 'payment_confirmation']
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export const monthName = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MONTHS[m - 1]} ${y}` }
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()   // m is 1-based

/* a named period and the period before it, of the same length */
export function periodOf(key, now = new Date(), custom = {}) {
  const [y, m] = israelDay(now).split('-').map(Number)
  const ym = (yy, mm) => { const t = new Date(Date.UTC(yy, mm - 1, 1)); return [t.getUTCFullYear(), t.getUTCMonth() + 1] }
  const span = (fy, fm, ty, tm) => ({ from: `${fy}-${pad(fm)}-01`, to: `${ty}-${pad(tm)}-${pad(lastDay(ty, tm))}` })
  let cur; let prev; let label
  if (key === 'last_month') { const [a, b] = ym(y, m - 1); const [c, d] = ym(y, m - 2); cur = span(a, b, a, b); prev = span(c, d, c, d); label = monthName(`${a}-${pad(b)}`) }
  else if (key === 'quarter') { const q0 = Math.floor((m - 1) / 3) * 3 + 1; const [c, d] = ym(y, q0 - 3); cur = span(y, q0, y, q0 + 2); prev = span(c, d, ...ym(c, d + 2)); label = `רבעון ${(q0 + 2) / 3} ${y}` }
  else if (key === 'ytd') { cur = { from: `${y}-01-01`, to: israelDay(now) }; prev = { from: `${y - 1}-01-01`, to: `${y - 1}-${israelDay(now).slice(5)}` }; label = `מתחילת ${y}` }
  else if (key === 'year_last') { cur = span(y - 1, 1, y - 1, 12); prev = span(y - 2, 1, y - 2, 12); label = `${y - 1}` }
  else if (key === '12m') { const [a, b] = ym(y, m - 11); const [c, d] = ym(y, m - 23); const [e, f] = ym(y, m - 12); cur = span(a, b, y, m); prev = span(c, d, e, f); label = '12 החודשים האחרונים' }
  else if (key === 'custom' && custom.from && custom.to && custom.from.slice(0, 7) === custom.to.slice(0, 7) && custom.from.endsWith('-01') && custom.to === span(...custom.from.slice(0, 7).split('-').map(Number), ...custom.from.slice(0, 7).split('-').map(Number)).to) {
    // a whole calendar month (a bar in the monthly chart): named like a month and compared with the month before
    const [a, b] = custom.from.slice(0, 7).split('-').map(Number); const [c, d] = ym(a, b - 1)
    cur = span(a, b, a, b); prev = span(c, d, c, d); label = monthName(custom.from.slice(0, 7))
  } else if (key === 'custom' && custom.from && custom.to) {
    const len = (new Date(custom.to) - new Date(custom.from)) / 86400_000 + 1
    const pTo = new Date(new Date(custom.from).getTime() - 86400_000); const pFrom = new Date(pTo.getTime() - (len - 1) * 86400_000)
    cur = { from: custom.from, to: custom.to }; prev = { from: pFrom.toISOString().slice(0, 10), to: pTo.toISOString().slice(0, 10) }; const dm = (x) => `${Number(x.slice(8, 10))}.${Number(x.slice(5, 7))}${x.slice(0, 4) !== custom.to.slice(0, 4) || x === custom.to ? `.${x.slice(2, 4)}` : ''}`; label = custom.from === custom.to ? dm(custom.from) : `${dm(custom.from)}–${dm(custom.to)}`
  } else { const [c, d] = ym(y, m - 1); cur = span(y, m, y, m); prev = span(c, d, c, d); label = monthName(`${y}-${pad(m)}`) }
  return { key, label, ...cur, prevFrom: prev.from, prevTo: prev.to }
}
export const within = (d, from, to) => { const t = dayOf(d); return !!t && t >= from && t <= to }
const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : null)
const sum = (list, f = total) => list.reduce((s, d) => s + f(d), 0)

/* project share of a document: a split invoice counts only its allocation */
function projectShares(docs, allocations) {
  const by = {}
  for (const a of allocations || []) (by[a.document_id] ||= []).push(a)
  const out = []
  for (const d of docs) {
    const al = by[d.id]
    if (al?.length) { const t = Math.abs(Number(d.total_amount) || 0); for (const a of al) out.push({ d, project: a.project_id, part: t ? Math.abs(Number(a.amount)) / t : 0 }) }
    else if (d.project_id) out.push({ d, project: d.project_id, part: 1 })
  }
  return out
}
const rank = (map, n = 999) => [...map.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.total - a.total).slice(0, n)
function group(list, keyOf, val = total) {
  const m = new Map()
  for (const d of list) { const k = keyOf(d) || ''; const g = m.get(k) || { total: 0, count: 0, ids: [] }; g.total += val(d); g.count++; if (g.ids.length < 400) g.ids.push(d.id); m.set(k, g) }
  return m
}

/* everything the executive overview shows, for one period and (optionally) one company */
export function overview(documents, { businesses = [], projects = [], categories = [], allocations = [] }, period, { businessId = null, now = new Date() } = {}) {
  const scope = businessId ? documents.filter((d) => d.business_id === businessId) : documents
  const live = scope.filter((d) => !['rejected', 'archived'].includes(d.status))
  const books = live.filter(booked)
  const cur = books.filter((d) => within(d, period.from, period.to))
  const prev = books.filter((d) => within(d, period.prevFrom, period.prevTo))
  const today = israelDay(now)
  const year = today.slice(0, 4)
  const ytd = books.filter((d) => within(d, `${year}-01-01`, today))
  const pytd = books.filter((d) => within(d, `${Number(year) - 1}-01-01`, `${Number(year) - 1}-${today.slice(5)}`))
  const thisMonth = today.slice(0, 7)
  const month = books.filter((d) => dayOf(d).startsWith(thisMonth))
  const ils = (list) => list.filter((d) => !d.currency || d.currency === 'ILS')
  const claimable = (d) => { const c = categories.find((x) => x.name === d.category); return vatOf(d) * (c ? Number(c.vat_deductible_pct ?? 100) : 100) / 100 }
  const docsIn = live.filter((d) => within(d, period.from, period.to))
  const open = ils(cur).filter((d) => payState(d) === 'open')

  // months: the last 12, plus the same months a year earlier, for the trend and the year-over-year comparison
  const [cy, cm] = period.to.slice(0, 7).split('-').map(Number)
  const months = Array.from({ length: 12 }, (_, i) => { const t = new Date(Date.UTC(cy, cm - 12 + i, 1)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}` })
  const byMonth = group(ils(books), (d) => dayOf(d).slice(0, 7))
  const trend = months.map((k) => { const [yy, mm] = k.split('-'); const ly = `${Number(yy) - 1}-${mm}`; return { key: k, total: byMonth.get(k)?.total || 0, count: byMonth.get(k)?.count || 0, ids: byMonth.get(k)?.ids || [], lastYear: byMonth.get(ly)?.total || 0 } })

  const comp = (keyOf) => {
    const a = group(ils(cur), keyOf); const b = group(ils(prev), keyOf)
    return rank(a).map((r) => ({ ...r, prev: b.get(r.key)?.total || 0, change: pct(r.total, b.get(r.key)?.total || 0) }))
  }
  const byCompany = comp((d) => d.business_id || '').map((r) => ({ ...r, name: businesses.find((b) => b.id === r.key)?.name || 'ממתין לשיוך', projects: projects.filter((p) => p.business_id === r.key && ['active', 'planning'].includes(p.status) && !p.archived_at).length }))
  for (const b of businesses) if (b.active !== false && !businessId && !byCompany.some((r) => r.key === b.id)) byCompany.push({ key: b.id, name: b.name, total: 0, count: 0, ids: [], prev: 0, change: null, projects: projects.filter((p) => p.business_id === b.id && ['active', 'planning'].includes(p.status) && !p.archived_at).length })
  const curTotal = sum(ils(cur))
  const byCategory = comp((d) => d.category || '').map((r) => ({ ...r, name: r.key || 'ללא קטגוריה', id: categories.find((c) => c.name === r.key)?.id || null, share: curTotal ? r.total / curTotal : 0 }))
  const bySupplier = comp((d) => d.supplier_id || d.supplier_name || '').map((r) => ({ ...r, name: cur.find((d) => (d.supplier_id || d.supplier_name) === r.key)?.supplier_name || 'ספק לא מזוהה', id: cur.find((d) => d.supplier_id === r.key)?.supplier_id || null }))

  // projects: budget against everything booked to the project (all time), and the period's share
  const allShares = projectShares(ils(books), allocations)
  const curShares = projectShares(ils(cur), allocations)
  const projectRows = projects.filter((p) => !p.archived_at && (!businessId || p.business_id === businessId)).map((p) => {
    const spent = allShares.filter((s) => s.project === p.id).reduce((a, s) => a + total(s.d) * s.part, 0)
    const inPeriod = curShares.filter((s) => s.project === p.id).reduce((a, s) => a + total(s.d) * s.part, 0)
    const budget = Number(p.budget) || 0
    return { id: p.id, name: p.name, business: businesses.find((b) => b.id === p.business_id)?.name || '', budget, spent, inPeriod, used: budget ? spent / budget : null, over: budget > 0 && spent > budget, near: budget > 0 && spent > budget * 0.85 && spent <= budget, status: p.status, count: allShares.filter((s) => s.project === p.id).length }
  }).sort((a, b) => b.spent - a.spent)

  // quality: what was extracted, what a person checked, what still needs a look
  const read = docsIn.filter((d) => d.processed_at || ['review', 'approved', 'sent'].includes(d.status))
  const checked = docsIn.filter((d) => ['approved', 'sent'].includes(d.status))
  const needs = docsIn.filter((d) => ['review', 'failed', 'duplicate', 'processing'].includes(d.status))

  // what needs the CEO's attention, most important first, each with the documents behind it
  const alerts = []
  const unassigned = live.filter((d) => !d.business_id && !['duplicate', 'failed', 'processing'].includes(d.status))
  if (!businessId && unassigned.length) alerts.push({ key: 'unassigned', tone: 'attn', title: `${unassigned.length === 1 ? 'מסמך אחד' : `${unassigned.length} מסמכים`} בלי חברה`, sub: `${moneyTxt(sum(ils(unassigned)))} שלא נכנסים לאף חברה`, to: '/documents?status=unassigned', ids: unassigned.map((d) => d.id) })
  // the conductor's completeness check: a supplier whose document arrived in each of the last three months and not this
  // month, past its usual day by five days, probably sent one that did not reach the system (or did not send it at all)
  {
    const [ty, tm] = thisMonth.split('-').map(Number)
    const back = [1, 2, 3].map((k) => { const t = new Date(Date.UTC(ty, tm - 1 - k, 1)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}` })
    const bySup = new Map()
    for (const d of live) {
      const key = d.supplier_id || d.supplier_name; const m = dayOf(d).slice(0, 7)
      if (!key || !m) continue
      const g = bySup.get(key) || { name: d.supplier_name, id: d.supplier_id, months: new Map() }
      g.months.set(m, Math.max(g.months.get(m) || 0, Number(dayOf(d).slice(8, 10)) || 0)); bySup.set(key, g)
    }
    const dayNow = Number(today.slice(8, 10))
    const missing = [...bySup.values()].filter((g) => back.every((m) => g.months.has(m)) && !g.months.has(thisMonth))
      .map((g) => ({ ...g, usual: Math.max(...back.map((m) => g.months.get(m))) })).filter((g) => dayNow > Math.min(28, g.usual + 5)).slice(0, 5)
    for (const g of missing) alerts.push({ key: `missing-${g.id || g.name}`, tone: 'warn', title: `${g.name}: החשבונית של החודש עוד לא הגיעה`, sub: `הגיעה בכל אחד משלושת החודשים האחרונים, בדרך כלל עד ה-${g.usual} בחודש`, to: g.id ? `/suppliers/${g.id}` : '/documents' })
  }
  for (const p of projectRows.filter((r) => r.over)) alerts.push({ key: `over-${p.id}`, tone: 'attn', title: `${p.name}: חריגה מהתקציב`, sub: `${moneyTxt(p.spent)} מתוך ${moneyTxt(p.budget)} (${Math.round(p.used * 100)}%)`, to: `/projects/${p.id}` })
  for (const p of projectRows.filter((r) => r.near)) alerts.push({ key: `near-${p.id}`, tone: 'warn', title: `${p.name}: ${Math.round(p.used * 100)}% מהתקציב`, sub: `נשארו ${moneyTxt(p.budget - p.spent)}`, to: `/projects/${p.id}` })
  for (const s of bySupplier.filter((r) => r.prev > 0 && r.total - r.prev > 5000 && r.change > 50).slice(0, 3)) alerts.push({ key: `sup-${s.key}`, tone: 'warn', title: `${s.name}: עלייה של ${Math.round(s.change)}%`, sub: `${moneyTxt(s.total)} לעומת ${moneyTxt(s.prev)} בתקופה הקודמת`, to: s.id ? `/suppliers/${s.id}` : '/documents', ids: s.ids })
  const dups = live.filter((d) => d.status === 'duplicate' || d.duplicate_state === 'suspected')
  if (dups.length) alerts.push({ key: 'dups', tone: 'warn', title: `${dups.length === 1 ? 'מסמך אחד חשוד' : `${dups.length} מסמכים חשודים`} ככפילות`, sub: 'לא נספרים פעמיים, אבל צריך להחליט', to: '/documents?status=problems', ids: dups.map((d) => d.id) })
  const noProject = cur.filter((d) => !d.project_id && !(allocations || []).some((a) => a.document_id === d.id) && projects.some((p) => p.business_id === d.business_id && p.status === 'active'))
  if (noProject.length >= 3) alerts.push({ key: 'noproj', tone: 'info', title: `${noProject.length} הוצאות בלי פרויקט`, sub: `${moneyTxt(sum(ils(noProject)))} בחברות שיש להן פרויקטים פעילים`, to: '/documents?project=none', ids: noProject.map((d) => d.id) })
  const waiting = live.filter((d) => d.status === 'review')
  if (waiting.length) alerts.push({ key: 'review', tone: 'info', title: `${waiting.length} מסמכים ממתינים לבדיקה`, sub: 'נספרים בסכומים, עוד לא אושרו', to: '/pending', ids: waiting.map((d) => d.id) })
  const unread = live.filter((d) => d.status === 'failed')
  if (unread.length) alerts.push({ key: 'failed', tone: 'warn', title: `${unread.length === 1 ? 'מסמך אחד לא נקרא' : `${unread.length} מסמכים לא נקראו`}`, sub: 'לא נכללים בסכומים עד שייקראו', to: '/documents?status=problems', ids: unread.map((d) => d.id) })

  const otherCurrency = cur.filter((d) => d.currency && d.currency !== 'ILS')
  return {
    period,
    kpi: {
      spend: curTotal, spendPrev: sum(ils(prev)), spendChange: pct(curTotal, sum(ils(prev))),
      month: sum(ils(month)), ytd: sum(ils(ytd)), ytdPrev: sum(ils(pytd)), ytdChange: pct(sum(ils(ytd)), sum(ils(pytd))),
      invoices: docsIn.filter((d) => INVOICE.includes(d.doc_type) && booked(d)).length,
      invoicesPrev: live.filter((d) => within(d, period.prevFrom, period.prevTo) && INVOICE.includes(d.doc_type) && booked(d)).length,
      receipts: docsIn.filter((d) => RECEIPT.includes(d.doc_type)).length,
      receiptsAsProof: docsIn.filter((d) => d._proofFor).length,
      receiptsPrev: live.filter((d) => within(d, period.prevFrom, period.prevTo) && RECEIPT.includes(d.doc_type)).length,
      openNoProof: sum(open), openCount: open.length,
      reviewing: live.filter((d) => d.status === 'review').length, processing: live.filter((d) => ['processing', 'failed'].includes(d.status)).length,
      vat: sum(ils(cur), vatOf), vatClaimable: sum(ils(cur).filter((d) => ['invoice', 'invoice_receipt', 'credit'].includes(d.doc_type)), claimable),
      vatPrev: sum(ils(prev), vatOf), duplicates: dups.length, otherCurrencyCount: otherCurrency.length,
    },
    ids: { spend: cur.map((d) => d.id), open: open.map((d) => d.id) },
    quality: { total: docsIn.length, read: read.length, checked: checked.length, needs: needs.length },
    trend, byCompany, byCategory, bySupplier, projects: projectRows, alerts,
  }
}
function moneyTxt(v) { return `${Math.round(v).toLocaleString('he-IL')} ₪` }
