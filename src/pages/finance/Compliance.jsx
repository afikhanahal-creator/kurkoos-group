import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, date, dateTime, money, monthLabel, nameOf } from './format.js'
import { AREA, LEVEL, STATUS, auditCompliance } from './compliance.js'
import { ENGINE_VERSION, RULES, SOURCE_KIND, WATCH, ruleOn, ruleState } from './taxRules.js'
import { buildXlsx, XLSX_MIME } from './xlsx.js'
import { saveBlob } from './zip.js'
import { Empty, Icon, PageHead, Pill } from './ui.jsx'
import Select from './Select.jsx'

/* The compliance centre. Every figure is the answer of the one compliance check (compliance.js) for the documents now
   in the system, so it is always current. The check raises notes; it decides nothing: a document with a doubt waits
   for a person, and anything about the law itself waits for the accountant. */
const n = (v) => Number(v || 0).toLocaleString('he-IL')
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100) / 100}%`)
const OPEN = (c) => c.checks.filter((x) => x.level === 'error' || x.level === 'doubt')
const WATCH_STATE = { ok: ['ok', 'נקרא, בלי שינוי'], changed: ['warn', 'העמוד השתנה: לבדוק'], value_missing: ['bad', 'ערך של כלל לא נמצא בעמוד'], unreachable: ['muted', 'לא נקרא'], never: ['muted', 'עוד לא נבדק'] }
const valueText = (r, day) => { const v = ruleOn(r.id, day); return v ? (r.show ? r.show(v.value) : String(v.value ?? '')) : '—' }

export function useCompliance() {
  const { documents, categories, settings } = useFinance()
  return useMemo(() => auditCompliance(documents, { categories, confirmed: settings?.tax_rules_confirmed || {} }), [documents, categories, settings])
}

export default function Compliance() {
  const { businesses, settings, can, role, go, reload } = useFinance()
  const audit = useCompliance()
  const [biz, setBiz] = useState('')
  const [per, setPer] = useState('')
  const [st, setSt] = useState('')
  const [limit, setLimit] = useState(30)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [tab, setTab] = useState('docs')
  const today = new Date().toISOString().slice(0, 10)
  const periods = useMemo(() => [...new Set(audit.rows.map((x) => x.c.period).filter((p) => /^\d{4}-\d{2}$/.test(p)))].sort().reverse(), [audit])
  const scope = useMemo(() => audit.rows.filter((x) => !['excluded', 'reading'].includes(x.c.status) && (!biz || (biz === 'none' ? !x.doc.business_id : x.doc.business_id === biz)) && (!per || x.c.period === per)), [audit, biz, per])
  const t = useMemo(() => totalsOf(scope), [scope])
  const queue = useMemo(() => scope.filter((x) => x.c.flagged).sort((a, b) => (b.c.errors - a.c.errors) || Math.abs(Number(b.doc.total_amount) || 0) - Math.abs(Number(a.doc.total_amount) || 0)), [scope])
  const listed = scope.filter((x) => !st || x.c.status === st).sort((a, b) => String(b.c.day).localeCompare(String(a.c.day)))
  const last = settings?.tax_audit_last
  const watch = settings?.tax_watch_state || {}
  const confirmed = settings?.tax_rules_confirmed || {}
  const rules = Object.values(RULES)
  const canConfirm = role === 'admin' || role === 'accountant'

  const act = async (key, fn, okText) => {
    setBusy(key); setMsg(null)
    try { const r = await fn(); if (r && r.ok === false) throw new Error(r.error || 'הפעולה נכשלה'); setMsg(['ok', typeof okText === 'function' ? okText(r) : okText]); await reload() } catch (e) { setMsg(['bad', e.message]) } finally { setBusy('') }
  }
  const run = () => act('audit', () => api.callServer('tax-audit', {}, { timeout: 90000 }), (r) => (r.first ? `בדיקה מלאה ראשונה: ${n(r.checked)} מסמכים נבדקו ונרשמו.` : `${n(r.checked)} מסמכים נבדקו. ${r.changed ? `${n(r.changed)} השתנו מאז הבדיקה הקודמת ונרשמו ביומן.` : 'שום דבר לא השתנה מאז הבדיקה הקודמת.'}`))
  const runWatch = () => act('watch', () => api.callServer('tax-watch', {}, { timeout: 90000 }), (r) => `${n(r.sources)} מקורות נבדקו: ${n(r.unchanged)} נקראו בלי שינוי${r.changed ? `, ${n(r.changed)} דורשים בדיקה` : ''}${r.unreachable ? `, ${n(r.unreachable)} לא נקראו` : ''}.`)
  const exportBook = () => saveBlob(new Blob([complianceWorkbook(scope, businesses, { today })], { type: XLSX_MIME }), `חבילה לרו״ח${per ? ` ${per}` : ''}${biz && biz !== 'none' ? ` ${nameOf(businesses, biz)}` : ''}.xlsx`)

  return (
    <div className="fin-stack fin-vat fin-tax">
      <PageHead title="ציות ומס" sub="כל מסמך נבדק מול כללי המע״מ ומס ההכנסה שבתוקף בתאריך שלו. ספק או טעות מסומנים בהערה, לבדיקה מול רואה החשבון.">
        <button type="button" className="fin-btn" onClick={exportBook}><Icon name="download" size={17} /> חבילה לרו״ח (Excel)</button>
        {can('operate') && <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy} onClick={run}><Icon name={busy === 'audit' ? 'sync' : 'shield'} size={17} /> {busy === 'audit' ? 'בודק…' : 'בדיקה עכשיו'}</button>}
      </PageHead>
      {msg && <p className={msg[0] === 'ok' ? 'fin-note' : 'fin-error fin-error--block'} role={msg[0] === 'ok' ? 'status' : 'alert'}>{msg[1]}</p>}
      <p className="fin-callout">המערכת היא כלי בקרה והכנת חומר לרואה החשבון. היא לא מאשרת מסמך, לא משנה סכום ולא מגישה דיווח. הכללים מבוססים על מקורות רשמיים שמפורטים למטה, וכלל שרואה החשבון עוד לא אישר מסומן ככזה.</p>
      <p className="fin-vat__last">{last ? (last.ok ? <>הבדיקה האחרונה של הסוכן: <b>{dateTime(last.finished || last.at)}</b> · {n(last.checked)} מסמכים · {last.changed ? `${n(last.changed)} שינויים` : 'בלי שינויים'}</> : <span className="fin-cell-err">הבדיקה האחרונה ({dateTime(last.at)}) נכשלה: {last.error}</span>) : 'הסוכן הלילי עוד לא רץ. "בדיקה עכשיו" מריצה אותו ורושמת את המצב הנוכחי ביומן.'} · גרסת הכללים {ENGINE_VERSION}</p>

      <div className="fin-filters">
        <Select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}<option value="none">לא משויך לחברה</option></Select>
        <Select className="fin-select" value={per} onChange={(e) => setPer(e.target.value)} aria-label="חודש חשבונאי"><option value="">כל החודשים</option>{periods.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}</Select>
      </div>

      <dl className="fin-vat__figs fin-tax__figs">
        <div className="is-main"><dt>כמה הוצאנו</dt><dd>{money(t.spent)}</dd><small>{n(t.documents)} מסמכים, כל רכישה פעם אחת{t.foreign ? ` · ${n(t.foreign)} במטבע זר לא בסכום` : ''}</small></div>
        <div><dt>מוכר במס הכנסה</dt><dd>{money(t.recognised)}</dd><small>לפי סוג ההוצאה; הערכה עד אישור רו״ח</small></div>
        <div><dt>לא מוכר במס הכנסה</dt><dd>{money(t.notRecognised)}</dd><small>חלק ההוצאה שהכללים מגבילים</small></div>
        <div className={t.vatWaiting ? 'is-wait' : ''}><dt>מע״מ מותר לקיזוז</dt><dd>{money(t.vatConfirmed)}</dd><small>מאושר · ועוד {money(t.vatWaiting)} ממתין לאישור</small></div>
        <div><dt>מע״מ שלא מקוזז</dt><dd>{money(t.vatBlocked)}</dd><small>לפי סוג ההוצאה</small></div>
        <div className={t.fix ? 'is-wait' : ''}><dt>דורשים תיקון</dt><dd>{n(t.fix)}</dd><small>פער בנתונים או פרט חובה חסר</small></div>
        <div className={t.accountant ? 'is-wait' : ''}><dt>לבדיקת רואה חשבון</dt><dd>{n(t.accountant)}</dd><small>{n(t.waiting)} נוספים ממתינים לבדיקה · {n(t.missingInvoice)} בלי חשבונית מס</small></div>
        <div><dt>מוכן לרואה החשבון</dt><dd>{money(t.readyAmount)}</dd><small>{n(t.ready)} מסמכים מאושרים בלי הערות · {n(t.exported)} כבר נשלחו</small></div>
      </dl>

      <div className="fin-tabs fin-tax__tabs" role="tablist" aria-label="תצוגה">
        {[['docs', `מסמכים (${n(queue.length)} עם הערות)`], ['rules', `מאגר הכללים (${n(rules.length)})`], ['watch', 'מעקב אחרי המקורות']].map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={`fin-tab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      {tab === 'docs' && <>
        <section className="fin-panel-block" aria-label="מסמכים עם הערות">
          <header className="fin-vat__head"><h3>הערות לבדיקה ({n(queue.length)})</h3><small>טעויות קודם, אחר כך לפי סכום</small></header>
          {!queue.length ? <Empty title="אין הערות פתוחות" icon="check">כל המסמכים בתחום שנבחר עברו את הבדיקות בלי ספק.</Empty> : (
            <ul className="fin-vat__queue">
              {queue.slice(0, limit).map(({ doc, c }) => (
                <li key={doc.id}>
                  <button type="button" className="fin-vat__item" onClick={() => go(`/documents/${doc.id}`)}>
                    <span className="fin-vat__who"><strong dir="auto">{doc.supplier_name || doc.file_name || 'מסמך'}</strong><small>{[DOC_TYPE[doc.doc_type], doc.doc_number && `מס׳ ${doc.doc_number}`, c.day && date(c.day), nameOf(businesses, doc.business_id) || 'לא משויך'].filter(Boolean).join(' · ')}</small></span>
                    <span className="fin-vat__sum"><b>{doc.total_amount != null ? money(doc.total_amount, doc.currency) : '—'}</b><small>סכום המסמך</small></span>
                    <span className="fin-vat__needs">{OPEN(c).map((x) => <span key={x.code} className={x.level === 'error' ? 'is-bad' : ''}><Icon name="alert" size={14} /> {x.text}</span>)}</span>
                    <Pill tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Pill>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {queue.length > limit && <p className="fin-vat__more"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 30)}>הצגת עוד {n(Math.min(30, queue.length - limit))}</button></p>}
        </section>

        <section className="fin-panel-block" aria-label="כל המסמכים">
          <header className="fin-vat__head"><h3>כל המסמכים ({n(listed.length)})</h3></header>
          <p className="fin-vat__chips">
            <button type="button" className={`fin-vat__chip ${!st ? 'is-on' : ''}`} aria-pressed={!st} onClick={() => setSt('')}>הכול</button>
            {Object.entries(STATUS).filter(([k]) => scope.some((x) => x.c.status === k)).map(([k, [, label]]) => <button key={k} type="button" className={`fin-vat__chip ${st === k ? 'is-on' : ''}`} aria-pressed={st === k} onClick={() => setSt(st === k ? '' : k)}>{label} ({n(scope.filter((x) => x.c.status === k).length)})</button>)}
          </p>
          <ul className="fin-vat__all">
            {listed.slice(0, limit).map(({ doc, c }) => (
              <li key={doc.id}>
                <button type="button" className="fin-vat__row" onClick={() => go(`/documents/${doc.id}`)}>
                  <span className="fin-vat__who"><strong dir="auto">{doc.supplier_name || doc.file_name || 'מסמך'}</strong><small>{[DOC_TYPE[doc.doc_type], c.day && date(c.day), c.kind?.label].filter(Boolean).join(' · ')}</small></span>
                  <span className="fin-vat__nums"><span><i>סכום</i>{doc.total_amount != null ? money(doc.total_amount, doc.currency) : '—'}</span><span><i>מוכר במס הכנסה</i>{c.income.pct === null ? '—' : <>{pct(c.income.pct)} · <b>{money(c.income.amount)}</b></>}</span><span><i>מע״מ לקיזוז</i>{pct(c.vat.pct)} · <b>{money(c.vat.eligible + c.vat.potential)}</b></span></span>
                  <Pill tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Pill>
                </button>
              </li>
            ))}
          </ul>
          {listed.length > limit && <p className="fin-vat__more"><button type="button" className="fin-btn" onClick={() => setLimit((v) => v + 30)}>הצגת עוד {n(Math.min(30, listed.length - limit))}</button></p>}
        </section>
      </>}

      {tab === 'rules' && (
        <section className="fin-panel-block" aria-label="מאגר הכללים">
          <header className="fin-vat__head"><h3>מאגר הכללים</h3><small>כל כלל עם המקור שלו, מתי הוא בתוקף ומתי אומת</small></header>
          <ul className="fin-tax__rules">
            {rules.map((r) => {
              const s = ruleState(r, today, watch); const ok = confirmed[r.id]; const cur = ruleOn(r.id, today)
              return (
                <li key={r.id} className="fin-tax__rule" data-rule={r.id}>
                  <header><strong>{r.name}</strong><span className="fin-tax__pills"><Pill tone={s.tone}>{s.label}</Pill><Pill tone={ok ? 'ok' : 'warn'}>{ok ? `אושר על ידי רו״ח${ok.at ? ` · ${date(ok.at.slice(0, 10))}` : ''}` : 'ממתין לאישור רו״ח'}</Pill></span></header>
                  <p>{r.text}</p>
                  <dl>
                    <div><dt>בתוקף עכשיו</dt><dd><b>{valueText(r, today)}</b>{cur?.from ? ` · מ-${date(cur.from)}` : ''}</dd></div>
                    <div><dt>מקור</dt><dd>{r.source.url ? <a href={r.source.url} target="_blank" rel="noopener noreferrer">{r.source.name}</a> : r.source.name} <small>({SOURCE_KIND[r.source.kind] || r.source.kind})</small></dd></div>
                    <div><dt>אומת מול המקור</dt><dd>{r.verified ? date(r.verified) : 'לא אומת'}{r.verifiedHow ? <small> · {r.verifiedHow}</small> : null}</dd></div>
                    <div><dt>גרסה</dt><dd>{cur?.v || r.versions[r.versions.length - 1].v} · חל על {r.applies}</dd></div>
                  </dl>
                  {r.versions.length > 1 && <details><summary>היסטוריית הכלל ({n(r.versions.length)} גרסאות)</summary><ul>{r.versions.map((v) => <li key={v.v}><b>{r.show ? r.show(v.value) : String(v.value)}</b> · מ-{date(v.from)}{v.to ? ` עד ${date(v.to)}` : ''}{v.note ? ` · ${v.note}` : ''}</li>)}</ul></details>}
                  {r.caveat && <p className="fin-tax__caveat"><Icon name="info" size={14} /> {r.caveat}</p>}
                  {canConfirm && <p className="fin-tax__act"><button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => act(`rule-${r.id}`, () => api.callServer('tax-rule-confirm', { id: r.id, confirmed: !ok }), ok ? 'האישור של הכלל בוטל.' : 'הכלל סומן כמאושר על ידי רו״ח, ונרשם ביומן.')}>{ok ? 'ביטול האישור' : 'אישור הכלל (רו״ח)'}</button></p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {tab === 'watch' && (
        <section className="fin-panel-block" aria-label="מעקב אחרי המקורות">
          <header className="fin-vat__head"><h3>מעקב אחרי המקורות הרשמיים</h3>{can('operate') && <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={runWatch}><Icon name="refresh" size={15} /> {busy === 'watch' ? 'בודק…' : 'בדיקה עכשיו'}</button>}</header>
          <p className="fin-callout">פעם ביום הסוכן קורא את העמודים הרשמיים שהכללים נשענים עליהם ומשווה לקריאה הקודמת. עמוד שהשתנה מסומן לבדיקה של אדם; הסוכן לא משנה כלל לבד. עמוד שלא נקרא מוצג עם מועד הקריאה המוצלחת האחרונה, ולא כמאומת.</p>
          <p className="fin-vat__last">{watch._last ? <>הבדיקה האחרונה: <b>{dateTime(watch._last.at)}</b> · {n(watch._last.ok)} בלי שינוי · {n(watch._last.changed)} לבדיקה · {n(watch._last.unreachable)} לא נקראו</> : 'המקורות עוד לא נבדקו.'}</p>
          <ul className="fin-tax__watch">
            {WATCH.map((w) => {
              const s = watch[w.id]; const [tone, label] = WATCH_STATE[s?.status || 'never']
              return (
                <li key={w.id} data-source={w.id}>
                  <span className="fin-tax__src"><a href={w.url} target="_blank" rel="noopener noreferrer">{w.label}</a><small>{w.rules.map((id) => RULES[id]?.name).filter(Boolean).join(' · ')}</small></span>
                  <span className="fin-tax__when"><Pill tone={tone}>{label}</Pill><small>{s?.ok_at ? `נקרא לאחרונה ${dateTime(s.ok_at)}` : 'עוד לא נקרא בהצלחה'}{s?.status === 'unreachable' && s.why ? ` · ${s.why}` : ''}{s?.missing?.length ? ` · חסר: ${s.missing.join(', ')}` : ''}</small></span>
                  {role === 'admin' && ['changed', 'value_missing'].includes(s?.status) && <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => act(`ack-${w.id}`, () => api.callServer('tax-watch-ack', { id: w.id }), 'סומן שנבדק: העמוד כפי שהוא עכשיו הוא נקודת ההשוואה.')}>בדקתי, הכללים נכונים</button>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

const r2 = (v) => Math.round(v * 100) / 100
function totalsOf(rows) {
  const ils = rows.filter((x) => !x.doc.currency || x.doc.currency === 'ILS')
  const sum = (list, f) => r2(list.reduce((s, x) => s + (f(x) || 0), 0))
  const once = (x) => !(x.c.vat.paysInvoice || x.doc._proofFor || x.doc._replacedBy)
  const spent = (x) => (once(x) && x.doc.total_amount != null ? (x.doc.doc_type === 'credit' ? -1 : 1) * Math.abs(Number(x.doc.total_amount)) : 0)
  return {
    documents: rows.length, spent: sum(ils, spent), recognised: sum(ils, (x) => x.c.income.amount), notRecognised: sum(ils, (x) => x.c.income.blocked),
    vatConfirmed: sum(ils, (x) => x.c.vat.eligible), vatWaiting: sum(ils, (x) => x.c.vat.potential), vatBlocked: sum(ils, (x) => (['none', 'partial', 'full'].includes(x.c.vat.cls) || x.c.vat.confirmed ? x.c.vat.blocked : 0)),
    foreign: rows.length - ils.length, fix: rows.filter((x) => x.c.status === 'fix').length, accountant: rows.filter((x) => x.c.status === 'accountant').length, waiting: rows.filter((x) => x.c.status === 'waiting').length,
    missingInvoice: rows.filter((x) => x.c.checks.some((c) => c.code === 'vat_tax_invoice')).length, ready: rows.filter((x) => x.c.status === 'ready').length, readyAmount: sum(ils.filter((x) => x.c.status === 'ready'), spent), exported: rows.filter((x) => x.c.status === 'exported').length,
  }
}

/* the accountant's workbook: every document with its check, and the tables an accountant asks for */
export function complianceWorkbook(rows, businesses, { today } = {}) {
  const T = (header, type = 'text', width = 16) => ({ header, type, width })
  const sgn = (doc) => (doc.doc_type === 'credit' ? -1 : 1)
  const abs = (v) => (v === null || v === undefined ? null : Math.abs(Number(v)))
  const biz = (doc) => nameOf(businesses, doc.business_id) || 'לא משויך'
  const notes = (c, levels) => c.checks.filter((x) => levels.includes(x.level)).map((x) => x.text).join(' | ')
  const base = (x) => [x.c.day, x.doc.supplier_name || '', x.doc.supplier_vat_id || '', DOC_TYPE[x.doc.doc_type] || x.doc.doc_type || '', x.doc.doc_number || '', biz(x.doc), x.c.period]
  const baseCols = [T('תאריך', 'date', 12), T('ספק', 'text', 26), T('ח.פ / עוסק', 'text', 13), T('סוג מסמך', 'text', 16), T('מספר', 'text', 13), T('חברה', 'text', 20), T('חודש חשבונאי', 'text', 12)]
  const ils = rows.filter((x) => !x.doc.currency || x.doc.currency === 'ILS')
  const sum = (list, f) => r2(list.reduce((s, x) => s + (Number(f(x)) || 0), 0))
  const all = rows.map((x) => [...base(x), x.doc.currency || 'ILS', x.c.vat.net === null ? null : sgn(x.doc) * x.c.vat.net, x.c.vat.rate === null ? null : x.c.vat.rate, x.c.vat.vat === null ? null : sgn(x.doc) * x.c.vat.vat, x.doc.total_amount === null ? null : sgn(x.doc) * abs(x.doc.total_amount),
    x.c.kind?.label || '', x.doc.category || '', x.c.income.pct === null ? null : x.c.income.pct / 100, x.c.income.amount, x.c.income.blocked, x.c.vat.pct / 100, r2(x.c.vat.eligible + x.c.vat.potential), x.c.vat.confirmed ? 'מאושר' : x.c.vat.potential ? 'ממתין לאישור' : '', x.c.vat.blocked,
    STATUS[x.c.status][1], notes(x.c, ['error', 'doubt']), notes(x.c, ['info']), x.c.rules.map((r) => `${r.name} (${r.version})`).join(' | '), typeof x.doc.confidence === 'number' ? x.doc.confidence : null])
  const allCols = [...baseCols, T('מטבע', 'text', 8), T('לפני מע״מ', 'money', 14), T('שיעור מע״מ', 'pct', 10), T('מע״מ', 'money', 13), T('סכום כולל', 'money', 14), T('סוג ההוצאה', 'text', 18), T('קטגוריה', 'text', 18), T('% הכרה במס הכנסה', 'pct', 12), T('הוצאה מוכרת', 'money', 14), T('הוצאה לא מוכרת', 'money', 14), T('% קיזוז מע״מ', 'pct', 11), T('מס תשומות לקיזוז', 'money', 14), T('מצב הקיזוז', 'text', 14), T('מע״מ שלא מקוזז', 'money', 14), T('סטטוס בדיקה', 'text', 22), T('הערות לרו״ח', 'text', 60), T('לידיעה', 'text', 50), T('כללים וגרסאות', 'text', 50), T('ודאות הקריאה', 'pct', 10)]
  const pick = (list, cols, f) => ({ columns: [...baseCols, ...cols], rows: list.map((x) => [...base(x), ...f(x)]) })
  const vatRows = ils.filter((x) => (x.c.vat.vat || 0) > 0 && !x.c.vat.paysInvoice && !x.doc._proofFor)
  const partial = ils.filter((x) => (x.c.income.pct !== null && x.c.income.pct > 0 && x.c.income.pct < 100) || x.c.vat.cls === 'partial')
  const noVat = ils.filter((x) => x.c.vat.cls === 'no_vat' || (x.c.vat.vat || 0) < 0.005)
  const review = rows.filter((x) => x.c.flagged)
  const pairs = rows.filter((x) => x.c.vat.paysInvoice || x.doc._proofFor)
  const credits = rows.filter((x) => x.doc.doc_type === 'credit')
  const byId = new Map(rows.map((x) => [x.doc.id, x]))
  const months = [...new Set(ils.map((x) => x.c.period))].sort()
  const monthRow = (p) => { const list = ils.filter((x) => x.c.period === p); const once = list.filter((x) => !(x.c.vat.paysInvoice || x.doc._proofFor || x.doc._replacedBy)); return [p, list.length, sum(once, (x) => sgn(x.doc) * abs(x.doc.total_amount)), sum(list, (x) => x.c.income.amount), sum(list, (x) => x.c.income.blocked), sum(once, (x) => sgn(x.doc) * (x.c.vat.vat || 0)), sum(list, (x) => x.c.vat.eligible), sum(list, (x) => x.c.vat.potential), sum(list, (x) => x.c.vat.blocked), list.filter((x) => x.c.flagged).length] }
  const mRows = months.map(monthRow)
  const tot = (rws, from) => rws[0] ? ['סה״כ', ...rws[0].slice(1).map((_, i) => (i + 1 >= from ? r2(rws.reduce((s, r) => s + (Number(r[i + 1]) || 0), 0)) : ''))] : null
  const sheets = [
    { name: 'סיכום חודשי', columns: [T('חודש', 'text', 12), T('מסמכים', 'int', 10), T('הוצאות', 'money', 15), T('מוכר במס הכנסה', 'money', 16), T('לא מוכר', 'money', 14), T('מע״מ במסמכים', 'money', 15), T('מס תשומות מאושר', 'money', 16), T('ממתין לאישור', 'money', 15), T('מע״מ שלא מקוזז', 'money', 15), T('מסמכים עם הערות', 'int', 12)], rows: mRows, totals: mRows.length ? [tot(mRows, 1)] : [] },
    { name: 'כל המסמכים', columns: allCols, rows: all },
    { name: 'מע״מ תשומות', ...pick(vatRows, [T('לפני מע״מ', 'money', 14), T('מע״מ', 'money', 13), T('% קיזוז', 'pct', 10), T('לקיזוז', 'money', 13), T('מצב', 'text', 14), T('לא מקוזז', 'money', 13), T('מספר הקצאה', 'text', 14), T('הערות', 'text', 50)], (x) => [sgn(x.doc) * (x.c.vat.net || 0), sgn(x.doc) * x.c.vat.vat, x.c.vat.pct / 100, r2(x.c.vat.eligible + x.c.vat.potential), x.c.vat.confirmed ? 'מאושר' : 'ממתין לאישור', x.c.vat.blocked, x.c.vat.allocation?.required ? (x.c.vat.allocation.present ? (x.doc.allocation_number || 'קיים') : 'נדרש וחסר') : 'לא נדרש', notes(x.c, ['error', 'doubt'])]) },
    { name: 'מוכר ולא מוכר', ...pick(ils.filter((x) => x.c.income.pct !== null && x.c.income.basis !== 'paid_invoice' && x.c.income.basis !== 'replaced'), [T('סוג ההוצאה', 'text', 18), T('סכום ההוצאה', 'money', 14), T('% הכרה', 'pct', 10), T('מוכר', 'money', 14), T('לא מוכר', 'money', 14), T('הבסיס', 'text', 50)], (x) => [x.c.kind?.label || '', r2(x.c.income.amount + x.c.income.blocked), x.c.income.pct / 100, x.c.income.amount, x.c.income.blocked, `${x.c.income.note || ''}${x.c.income.basis === 'estimate' ? ' (הערכה, לבדיקת רו״ח)' : ''}`]) },
    { name: 'הכרה חלקית', ...pick(partial, [T('סוג ההוצאה', 'text', 18), T('% הכרה במס הכנסה', 'pct', 12), T('% קיזוז מע״מ', 'pct', 11), T('הסבר', 'text', 60)], (x) => [x.c.kind?.label || '', x.c.income.pct === null ? null : x.c.income.pct / 100, x.c.vat.pct / 100, [x.c.income.note, x.c.vat.explain].filter(Boolean).join(' | ')]) },
    { name: 'בלי מע״מ', ...pick(noVat, [T('סכום', 'money', 14), T('הסבר', 'text', 60)], (x) => [sgn(x.doc) * abs(x.doc.total_amount), x.c.vat.explain || '']) },
    { name: 'דורשים בדיקה', ...pick(review, [T('סכום', 'money', 14), T('סטטוס', 'text', 22), T('ההערות', 'text', 90)], (x) => [x.doc.total_amount === null ? null : sgn(x.doc) * abs(x.doc.total_amount), STATUS[x.c.status][1], notes(x.c, ['error', 'doubt'])]) },
    { name: 'חשבוניות וקבלות', ...pick(pairs, [T('סכום הקבלה', 'money', 14), T('החשבונית', 'text', 16), T('תאריך החשבונית', 'date', 12), T('סכום החשבונית', 'money', 14)], (x) => { const inv = byId.get(x.c.vat.paysInvoice || x.doc._proofFor); return [abs(x.doc.total_amount), inv?.doc.doc_number || '', inv?.c.day || '', inv ? abs(inv.doc.total_amount) : null] }) },
    { name: 'זיכויים', ...pick(credits, [T('סכום הזיכוי', 'money', 14), T('החשבונית המקורית', 'text', 16), T('סכום המקורית', 'money', 14), T('מלא / חלקי', 'text', 12), T('השפעה על מע״מ', 'money', 14), T('הערות', 'text', 50)], (x) => { const o = byId.get(x.c.vat.creditOf); const full = o && Math.abs(abs(o.doc.total_amount) - abs(x.doc.total_amount)) <= 1; return [-abs(x.doc.total_amount), o?.doc.doc_number || 'לא נמצאה', o ? abs(o.doc.total_amount) : null, o ? (full ? 'מלא' : 'חלקי') : '', r2(x.c.vat.eligible + x.c.vat.potential), notes(x.c, ['error', 'doubt'])] }) },
    { name: 'הכללים', columns: [T('כלל', 'text', 30), T('בתוקף היום', 'text', 22), T('מתאריך', 'date', 12), T('מקור', 'text', 44), T('סוג המקור', 'text', 16), T('קישור', 'text', 50), T('אומת', 'date', 12), T('גרסה', 'text', 14), T('תיאור', 'text', 80)],
      rows: Object.values(RULES).map((r) => { const v = ruleOn(r.id, today); return [r.name, v ? (r.show ? r.show(v.value) : String(v.value ?? '')) : '', v?.from || '', r.source.name, SOURCE_KIND[r.source.kind] || r.source.kind, r.source.url || '', r.verified || '', v?.v || '', r.text] }) },
  ]
  return buildXlsx(sheets, { title: 'חבילה לרואה החשבון' })
}

/* inside a document: the check's answer, each point with the rule behind it */
export function ComplianceNote({ doc }) {
  const audit = useCompliance()
  const [open, setOpen] = useState(false)
  const c = audit.rows.find((x) => x.doc.id === doc.id)?.c
  if (!c || ['excluded', 'reading'].includes(c.status)) return null
  const openPts = OPEN(c); const rest = c.checks.filter((x) => x.level === 'ok' || x.level === 'info')
  return (
    <aside className={`fin-vatnote fin-taxnote is-${STATUS[c.status][0]}`} aria-label="בדיקת ציות">
      <p className="fin-vatnote__top"><Icon name="shield" size={16} /> <strong>בדיקת ציות:</strong> <Pill tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Pill>
        {c.income.pct !== null && <span>מוכר במס הכנסה {pct(c.income.pct)}{c.income.basis === 'estimate' ? ' (הערכה)' : ''} · {money(c.income.amount)}</span>}</p>
      {openPts.length > 0 && <ul className="fin-vatnote__needs fin-taxnote__open">{openPts.map((x) => <li key={x.code} className={x.level === 'error' ? 'is-bad' : ''}><b>{AREA[x.area]}:</b> {x.text}{x.source && <small> · {x.source.name}</small>}</li>)}</ul>}
      {!openPts.length && <p className="fin-vatnote__why">כל הבדיקות האוטומטיות עברו בלי ספק. האישור המקצועי נשאר של רואה החשבון.</p>}
      <button type="button" className="fin-link fin-taxnote__more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? 'הסתרת הדוח המלא' : `הדוח המלא (${n(c.checks.length)} בדיקות)`}</button>
      {open && (
        <div className="fin-taxnote__report">
          <ul>{rest.map((x) => <li key={x.code}><Pill tone={LEVEL[x.level][0]}>{LEVEL[x.level][1]}</Pill> <b>{AREA[x.area]}:</b> {x.text}</li>)}</ul>
          {c.rules.length > 0 && <p className="fin-taxnote__rules"><b>הכללים שלפיהם נבדק:</b> {c.rules.map((r) => <span key={r.id}>{r.source?.url ? <a href={r.source.url} target="_blank" rel="noopener noreferrer">{r.name}</a> : r.name} <small>(גרסה {r.version})</small></span>)}</p>}
          <p className="fin-taxnote__meta">סוג ההוצאה: {c.kind?.label || '—'} · נבדק {date(c.today)} · מנוע {c.engine}</p>
        </div>
      )}
    </aside>
  )
}
