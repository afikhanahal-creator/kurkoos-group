import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { counts, docDate, money, monthLabel, nameOf, period, shiftMonth, signedTotal, thisMonth } from './format.js'
import { Empty, Icon, PageHead, Pill, askConfirm } from './ui.jsx'
import Select from './Select.jsx'

// "הוצאות קבועות": suppliers whose invoice comes again and again. A person marks one document as fixed (here, or on the
// document); from then on every document of that supplier is classified by itself (the trigger in finance.sql). The screen
// answers three questions: what do they cost a month and a year, which one did not arrive this month, which one changed.
const short = (k) => new Date(`${k}-01T00:00:00`).toLocaleDateString('he-IL', { month: 'short' })

function Spark({ values, months, expected }) {
  const max = Math.max(...values.map(Math.abs), expected || 0, 1)
  return (
    <span className="fin-fixed__spark" role="img" aria-label={`12 חודשים: ${values.map((v, i) => `${short(months[i])} ${money(v)}`).join(', ')}`}>
      {values.map((v, i) => <i key={months[i]} title={`${monthLabel(months[i])}: ${v ? money(v) : 'אין מסמך'}`} className={v ? (i === 11 ? 'is-now' : '') : 'is-none'} style={{ height: `${v ? Math.max(12, (Math.abs(v) / max) * 100) : 6}%` }} />)}
    </span>
  )
}

export default function Fixed() {
  const { documents, businesses, can, go } = useFinance()
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [biz, setBiz] = useState('')
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => { try { setList(await api.loadRecurring()) } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { load() }, [load])
  const now = thisMonth()
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => shiftMonth(now, i - 11)), [now])
  const operate = can('operate')

  const rows = useMemo(() => (list || []).filter((r) => r.active && (!biz || r.business_id === biz)).map((r) => {
    const docs = documents.filter((d) => d.recurring_id === r.id && counts(d))
    const values = months.map((m) => docs.filter((d) => period(d) === m).reduce((s, d) => s + signedTotal(d), 0))
    const full = values.slice(0, 11).filter(Boolean)                 // finished months with a document
    const last3 = full.slice(-3)
    const monthly = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : values[11] || Number(r.expected_amount) || 0
    const yearly = values.reduce((a, b) => a + b, 0)
    const usual = full.length >= 2                                    // it has a rhythm: a missing month means something
    const arrived = !!values[11]
    const changed = arrived && monthly && Math.abs(values[11] - monthly) / Math.abs(monthly) > 0.2
    const since = docs.map((d) => period(d)).sort()[0]
    return { r, docs, values, monthly, yearly, arrived, missing: usual && !arrived, changed, since }
  }).sort((a, b) => b.monthly - a.monthly), [list, documents, months, biz])

  // suppliers that look fixed and are not marked: a document in at least 3 of the last 4 finished months
  const suggestions = useMemo(() => {
    if (!list) return []
    const taken = new Set(list.filter((r) => r.active).map((r) => `${r.supplier_key}|${r.business_id || ''}`))
    const last4 = [1, 2, 3, 4].map((n) => shiftMonth(now, -n))
    const by = new Map()
    for (const d of documents) {
      if (!counts(d) || !d.supplier_name || d.recurring_id || d.recurring_off || (biz && d.business_id !== biz)) continue
      const k = `${d.supplier_name.trim().toLowerCase().replace(/\s+/g, ' ')}|${d.business_id || ''}`
      if (taken.has(k)) continue
      if (!by.has(k)) by.set(k, { name: d.supplier_name, business_id: d.business_id, docs: [] })
      by.get(k).docs.push(d)
    }
    return [...by.values()].map((s) => ({ ...s, hits: last4.filter((m) => s.docs.some((d) => period(d) === m)).length, latest: [...s.docs].sort((a, b) => String(docDate(b)).localeCompare(String(docDate(a))))[0] }))
      .filter((s) => s.hits >= 3).sort((a, b) => b.hits - a.hits).slice(0, 12)
  }, [list, documents, now, biz])

  const act = async (key, fn, done) => { setBusy(key); setErr(''); setMsg(''); try { await fn(); await load(); if (done) setMsg(done) } catch (e) { setErr(e.message) } finally { setBusy('') } }
  const openDocs = (docs, title) => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids: docs.map((d) => d.id), title, sort: 'chrono' })) } catch { /* noop */ } go('/documents?ids=1') }
  const stop = async (x) => { if (await askConfirm({ title: 'הפסקת הוצאה קבועה', text: `להפסיק לסווג את ${x.r.label} כהוצאה קבועה? המסמכים נשארים במערכת, בלי הסימון.`, ok: 'הפסקה' })) act(x.r.id, () => api.setRecurring(x.r.id, { active: false }), `${x.r.label} כבר לא הוצאה קבועה.`) }
  const tot = rows.reduce((a, x) => ({ monthly: a.monthly + x.monthly, yearly: a.yearly + x.yearly }), { monthly: 0, yearly: 0 })
  const missing = rows.filter((x) => x.missing)

  return (
    <div className="fin-stack">
      <PageHead title="הוצאות קבועות" sub="ספקים שהחשבונית שלהם חוזרת כל חודש. מסמך חדש של ספק כזה מסווג לבד כהוצאה קבועה" />
      {businesses.length > 1 && (
        <div className="fin-filters">
          <Select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
        </div>
      )}
      {msg && <p className="fin-ok" role="status">{msg}</p>}
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
      {list === null ? <p className="fin-muted" aria-busy="true">טוען…</p> : (
        <>
          {rows.length > 0 && (
            <dl className="fin-scan__totals" aria-label="סיכום ההוצאות הקבועות">
              <div><dt>לחודש (ממוצע 3 חודשים)</dt><dd>{money(tot.monthly)}</dd></div>
              <div><dt>ב-12 החודשים האחרונים</dt><dd>{money(tot.yearly)}</dd></div>
              <div><dt>הוצאות קבועות</dt><dd>{rows.length}</dd></div>
              <div className={missing.length ? 'is-bad' : ''}><dt>לא הגיעו ב{monthLabel(now).split(' ')[0]}</dt><dd>{missing.length}</dd></div>
            </dl>
          )}
          {!rows.length ? (
            <Empty title="עוד לא סומנה הוצאה קבועה" icon="calendar">
              פותחים חשבונית של ספק קבוע (חשמל, שכירות, תוכנה) ולוחצים "הוצאה קבועה". מאותו רגע כל חשבונית של הספק הזה מסווגת לבד, והמסך הזה מראה כמה היא עולה בחודש ובשנה, ואם היא לא הגיעה החודש.{suggestions.length ? ' למטה יש ספקים שנראים קבועים.' : ''}
            </Empty>
          ) : (
            <div className="fin-table-wrap">
              <table className="fin-table fin-fixed">
                <thead><tr><th>הוצאה</th><th>12 חודשים</th><th className="fin-num">לחודש</th><th className="fin-num">לשנה</th><th>החודש</th><th><span className="fin-sr">פעולות</span></th></tr></thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.r.id}>
                      <td className="fin-td-main" data-label="הוצאה">
                        <button type="button" className="fin-link" onClick={() => openDocs(x.docs, `הוצאה קבועה: ${x.r.label}`)}>{x.r.label}</button>
                        <small className="fin-fixed__meta">{[businesses.length > 1 ? nameOf(businesses, x.r.business_id) || 'כל החברות' : null, x.since ? `מאז ${monthLabel(x.since)}` : 'עוד בלי מסמכים', `${x.docs.length} מסמכים`].filter(Boolean).join(' · ')}</small>
                      </td>
                      <td data-label="12 חודשים"><Spark values={x.values} months={months} expected={Number(x.r.expected_amount) || 0} /></td>
                      <td className="fin-num" data-label="לחודש"><strong>{money(x.monthly)}</strong></td>
                      <td className="fin-num" data-label="לשנה">{money(x.yearly)}</td>
                      <td data-label="החודש">{x.missing ? <Pill tone="warn">עוד לא הגיעה</Pill> : x.changed ? <Pill tone="info">{money(x.values[11])}, שונה מהרגיל</Pill> : x.arrived ? <Pill tone="ok">הגיעה</Pill> : <Pill tone="muted">—</Pill>}</td>
                      <td className="fin-table__acts">{operate && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" disabled={busy === x.r.id} onClick={() => stop(x)}>הפסקה</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {operate && suggestions.length > 0 && (
            <section className="fin-fixed__sug" aria-label="ספקים שנראים קבועים">
              <h3>נראים קבועים</h3>
              <p className="fin-muted fin-small">ספקים שהגיעה מהם חשבונית ב-3 לפחות מ-4 החודשים האחרונים. הסימון הוא שלכם: המערכת לא מסמנת לבד.</p>
              <ul>
                {suggestions.map((s) => (
                  <li key={`${s.name}|${s.business_id || ''}`}>
                    <div><strong dir="auto">{s.name}</strong><small>{[businesses.length > 1 ? nameOf(businesses, s.business_id) || 'ללא שיוך' : null, `${s.hits} מתוך 4 חודשים`, `אחרון: ${money(signedTotal(s.latest))}`].filter(Boolean).join(' · ')}</small></div>
                    <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => act(`s-${s.name}`, () => api.markRecurring(s.latest.id, true), `${s.name} סומן כהוצאה קבועה, וכל המסמכים שלו סווגו.`)}><Icon name="plus" size={15} /> סימון כהוצאה קבועה</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
