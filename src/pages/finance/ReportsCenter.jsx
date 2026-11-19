import { useEffect, useMemo, useState } from 'react'
import * as api from './api.js'
import { dateTime } from './format.js'
import { Empty, Field, Icon, Modal, Pill, Skeleton, Toggle, WaIcon, askConfirm } from './ui.jsx'
import Select from './Select.jsx'

/* Scheduled reports (server/finance/reports.js): each report has a template, companies, a period, a weekly schedule
   and its own recipients. The list, the five-step set-up and the sending history live here; the server keeps and sends. */
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const DAY1 = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const ROLE = { admin: 'מנהל מערכת', finance_manager: 'מנהל כספים', employee: 'עובד', accountant: 'רואה חשבון' }
const TZ = { 'Asia/Jerusalem': 'ישראל', 'Europe/London': 'לונדון', 'Europe/Berlin': 'מרכז אירופה', 'America/New_York': 'ניו יורק', UTC: 'UTC' }
const TRIGGER = { schedule: 'מתוזמן', manual: 'ידני', test: 'בדיקה' }
const STEPS = ['תבנית', 'חברות ותקופה', 'ימים ושעות', 'נמענים', 'תצוגה ושמירה']
const rid = () => Math.random().toString(36).slice(2, 10)
const phone = (p) => `+${String(p).replace(/^(\d{3})(\d{2})(\d{3})(\d+)$/, '$1 $2-$3-$4')}`
export const blank = () => ({ id: rid(), name: '', enabled: true, template: 'daily', companies: 'all', period: 'yesterday', tz: 'Asia/Jerusalem', slots: [1, 2, 3, 4, 0].map((d) => ({ id: rid(), day: d, time: '08:00', enabled: true })), users: [], wa: [], ai: false, fields: [] })

/* "א׳–ה׳ 08:00 · ו׳ 09:00": days that share the same hours are written together */
export function scheduleText(slots = []) {
  const on = slots.filter((s) => s.enabled)
  if (!on.length) return 'לא נקבעו ימים ושעות'
  const byDay = DAYS.map((_, d) => on.filter((s) => s.day === d).map((s) => s.time).sort().join(', '))
  const out = []
  for (let d = 0; d < 7; d++) {
    if (!byDay[d]) continue
    let e = d
    while (e + 1 < 7 && byDay[e + 1] === byDay[d]) e++
    out.push(`${e > d ? `${DAY1[d]}–${DAY1[e]}` : DAY1[d]} ${byDay[d]}`)
    d = e
  }
  return out.join(' · ')
}

export default function ReportsCenter({ admin, onChange }) {
  const [data, setData] = useState(null)
  const [runs, setRuns] = useState(null)
  const [edit, setEdit] = useState(null)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const load = async () => {
    try { const [d, h] = await Promise.all([api.callServer('reports-view', {}), api.callServer('reports-view', { op: 'history' })]); setData(d); setRuns(h.runs || []); onChange?.(d, h.runs || []) } catch (e) { setMsg({ tone: 'warn', text: e.message }) }
  }
  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (reports, templates) => {
    const d = await api.callServer('reports', { op: 'save', reports, templates: templates || data.templates })
    setData(d); onChange?.(d, runs || []); return d
  }
  const act = async (key, fn, done) => { setBusy(key); setMsg(null); try { const r = await fn(); setMsg({ tone: 'ok', text: typeof done === 'function' ? done(r) : done }); await load() } catch (e) { setMsg({ tone: 'warn', text: e.message }) } finally { setBusy('') } }
  const sentText = (r) => (!r.recipients ? 'לא נבחרו נמענים לדוח הזה' : `נשלח ל-${r.sent} מתוך ${r.recipients} נמענים${r.failed ? `. ${r.failed} נכשלו, הפירוט בהיסטוריה` : ''}`)

  if (!data) return <section className="fin-panel-block"><div className="fin-panel-block__head"><h3>דוחות מתוזמנים</h3></div><Skeleton lines={3} /></section>
  const nameOfUser = (id) => { const m = data.members.find((x) => x.user_id === id); return m ? m.full_name || m.email : '' }
  const whoText = (r) => {
    const u = r.users === 'managers' ? data.members.filter((m) => ['admin', 'finance_manager'].includes(m.role)) : data.members.filter((m) => (r.users || []).includes(m.user_id))
    return { emails: u, wa: data.senders.filter((s) => (r.wa || []).includes(s.id)) }
  }

  return (
    <>
      <section className="fin-panel-block" id="fin-reports">
        <div className="fin-panel-block__head">
          <h3>דוחות מתוזמנים</h3>
          <span className="fin-muted">{data.reports.length} דוחות</span>
          {admin && <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => setEdit({ report: blank(), isNew: true })}><Icon name="plus" size={16} /> דוח חדש</button>}
        </div>
        {msg && <p className={`fin-note ${msg.tone === 'warn' ? 'fin-note--warn' : ''}`} role="status">{msg.text}</p>}
        {!data.configured && <p className="fin-note">כרגע דוח הבוקר נשלח כל יום ב-07:00 לכל המנהלים. שמירה של ימים, שעות ונמענים תעביר אותו לתזמון שתבחרו.</p>}
        {!data.channels.email && <p className="fin-note fin-note--warn">שירות המייל לא מוגדר בשרת, ולכן דוחות לא יישלחו במייל.</p>}
        <div className="fin-rep-grid">
          {data.reports.map((r) => {
            const w = whoText(r); const t = data.defs.templates[r.template]
            return (
              <article key={r.id} className={`fin-rep ${r.enabled ? '' : 'is-off'}`}>
                <header className="fin-rep__head">
                  <div className="fin-rep__title"><strong>{r.name}</strong><span>{t?.name}</span></div>
                  <Toggle checked={r.enabled} disabled={!admin || !!busy} label={`הפעלת הדוח ${r.name}`} onChange={(v) => act(`t${r.id}`, () => save(data.reports.map((x) => (x.id === r.id ? { ...x, enabled: v } : x))), v ? 'הדוח הופעל' : 'הדוח הושבת')} />
                </header>
                <dl className="fin-rep__facts">
                  <div><dt><Icon name="calendar" size={15} /> מתי</dt><dd>{scheduleText(r.slots)}{r.tz !== 'Asia/Jerusalem' && <small> · שעון {TZ[r.tz]}</small>}</dd></div>
                  <div><dt><Icon name="company" size={15} /> מה</dt><dd>{r.template === 'morning' ? '24 השעות האחרונות ותקופת הדיווח' : r.period === 'days' ? `ימים ${(r.days || []).map((d) => DAY1[d]).join(', ')}` : data.defs.periods[r.period]} · {r.companies === 'all' ? 'כל החברות' : `${r.companies.length} חברות`}</dd></div>
                  <div><dt><Icon name="users" size={15} /> למי</dt><dd>{w.emails.length ? `${w.emails.length} במייל` : 'אין נמעני מייל'}{w.wa.length ? ` · ${w.wa.length} בוואטסאפ` : ''}{r.users === 'managers' && <small> · כל המנהלים</small>}</dd></div>
                  <div><dt><Icon name="clock" size={15} /> הבא</dt><dd>{r.next ? `${r.next.in_days === 0 ? 'היום' : r.next.in_days === 1 ? 'מחר' : `יום ${r.next.day}`} ב-${r.next.time}` : r.enabled ? 'לא נקבע' : 'מושבת'}</dd></div>
                </dl>
                {admin && (
                  <footer className="fin-rep__foot">
                    <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => setEdit({ report: { ...blank(), ...r, users: r.users === 'managers' ? w.emails.map((m) => m.user_id) : r.users }, isNew: false })}><Icon name="edit" size={15} /> הגדרות</button>
                    <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" disabled={!!busy} onClick={() => act(`s${r.id}`, () => api.callServer('reports', { op: 'send', id: data.configured ? r.id : undefined, report: data.configured ? undefined : r }), sentText)}><Icon name="send" size={15} /> {busy === `s${r.id}` ? 'שולח…' : 'שליחה עכשיו'}</button>
                    <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" disabled={!!busy} onClick={() => act(`x${r.id}`, () => api.callServer('reports', { op: 'test', report: r }), (x) => (x.sent ? 'דוח הבדיקה נשלח למייל שלכם' : 'דוח הבדיקה לא נשלח, הפירוט בהיסטוריה'))}>{busy === `x${r.id}` ? 'שולח…' : 'בדיקה אליי'}</button>
                    {data.configured && <button type="button" className="fin-link fin-link--danger" onClick={async () => { if (await askConfirm({ text: `למחוק את הדוח "${r.name}"? ההיסטוריה שלו נשארת.`, ok: 'מחיקה', danger: true })) act(`d${r.id}`, () => save(data.reports.filter((x) => x.id !== r.id)), 'הדוח נמחק') }}>מחיקה</button>}
                  </footer>
                )}
              </article>
            )
          })}
          {!data.reports.length && <Empty title="אין דוחות מתוזמנים" icon="reports">הוסיפו דוח, בחרו ימים, שעות ונמענים, והוא יישלח לבד.</Empty>}
        </div>
      </section>

      <section className="fin-panel-block">
        <div className="fin-panel-block__head"><h3>היסטוריית שליחות</h3><span className="fin-muted">{(runs || []).length ? `${runs.length} אחרונות` : ''}</span></div>
        {!runs ? <Skeleton lines={2} /> : !runs.length ? <p className="fin-muted">עוד לא נשלח דוח. שליחה ידנית או בדיקה יופיעו כאן.</p> : (
          <div className="fin-table-wrap fin-table-wrap--flat">
            <table className="fin-table fin-table--plain">
              <thead><tr><th>מתי</th><th>דוח</th><th className="fin-col-md">איך</th><th className="fin-col-lg">תקופה</th><th>נמענים</th><th>מצב</th><th /></tr></thead>
              <tbody>
                {runs.map((h) => (
                  <tr key={h.id}>
                    <td>{dateTime(h.at)}</td>
                    <td className="fin-td-main"><span className="fin-cell-main">{h.name || 'דוח'}</span><small className="fin-cell-sub">{data.defs.templates[h.template]?.name}</small></td>
                    <td className="fin-col-md">{TRIGGER[h.trigger] || h.trigger}{h.slot && <small className="fin-cell-sub">{h.slot}</small>}</td>
                    <td className="fin-col-lg">{h.period || '—'}</td>
                    <td>{h.results.length ? `${h.sent} מתוך ${h.results.length}` : '—'}</td>
                    <td><Pill tone={h.status === 'ok' ? 'ok' : h.status === 'partial' ? 'warn' : h.status === 'running' ? 'info' : 'bad'}>{h.status === 'ok' ? 'נשלח' : h.status === 'partial' ? 'נשלח חלקית' : h.status === 'running' ? 'בשליחה' : 'נכשל'}</Pill></td>
                    <td className="fin-row-actions">
                      <button type="button" className="fin-link" onClick={() => setOpen(h)}>פתיחה</button>
                      {admin && h.failed > 0 && h.results.length > 0 && <button type="button" className="fin-link" disabled={!!busy} onClick={() => act(`r${h.id}`, () => api.callServer('reports', { op: 'retry', id: h.id }), (x) => `נשלח שוב ל-${x.sent} מתוך ${x.retried} שנכשלו`)}>{busy === `r${h.id}` ? 'שולח…' : 'שליחה חוזרת'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {edit && <Wizard data={data} start={edit} nameOfUser={nameOfUser} onClose={() => setEdit(null)} onSaved={async (report, templates) => { const list = data.configured ? data.reports : []; const next = list.some((x) => x.id === report.id) ? list.map((x) => (x.id === report.id ? report : x)) : [...(data.configured ? list : data.reports.filter((x) => x.id !== report.id)), report]; await save(next, templates); setEdit(null); setMsg({ tone: 'ok', text: `הדוח "${report.name}" נשמר` }); load() }} />}
      {open && <RunModal run={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function RunModal({ run, onClose }) {
  const [html, setHtml] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.callServer('reports-view', { op: 'open', id: run.id }).then((r) => setHtml(r.html)).catch((e) => setErr(e.message)) }, [run.id])
  return (
    <Modal title={`${run.name || 'דוח'} · ${dateTime(run.at)}`} onClose={onClose} wide>
      {run.error && <p className="fin-note fin-note--warn">{run.error}</p>}
      {run.results.length > 0 && (
        <ul className="fin-rep-results">
          {run.results.map((r, i) => <li key={i}>{r.channel === 'whatsapp' ? <WaIcon size={16} /> : <Icon name="mail" size={16} />}<span>{r.name}</span><bdi dir="ltr">{r.channel === 'whatsapp' ? phone(r.to) : r.to}</bdi><Pill tone={r.ok ? 'ok' : 'bad'}>{r.ok ? 'נשלח' : 'נכשל'}</Pill>{r.error && <small className="fin-cell-err">{r.error}</small>}</li>)}
        </ul>
      )}
      {err ? <p className="fin-muted">{err}</p> : html === null ? <Skeleton lines={4} /> : <iframe title="הדוח כפי שנשלח" className="fin-rep-frame" sandbox="" srcDoc={html} />}
    </Modal>
  )
}

function Wizard({ data, start, onClose, onSaved }) {
  const [r, setR] = useState(start.report)
  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const [tplName, setTplName] = useState('')
  const [templates, setTemplates] = useState(data.templates)
  const [prev, setPrev] = useState(null)
  const [tab, setTab] = useState('email')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const set = (p) => setR((x) => ({ ...x, ...p }))
  const T = data.defs.templates
  const morning = r.template === 'morning'
  const named = { ...r, name: r.name.trim() || T[r.template].name }

  const problems = useMemo(() => {
    const p = []
    if (r.template === 'custom' && !(r.fields || []).length) p[0] = 'בחרו לפחות נתון אחד לדוח'
    if (r.period === 'custom' && !morning && !(r.from && r.to)) p[1] = 'בחרו תאריך התחלה וסיום'
    if (r.period === 'custom' && r.from && r.to && r.to < r.from) p[1] = 'תאריך הסיום לפני תאריך ההתחלה'
    if (r.period === 'days' && !morning && !(r.days || []).length) p[1] = 'בחרו לפחות יום אחד שהדוח יסכם'
    if (!r.slots.some((s) => s.enabled)) p[2] = 'בחרו לפחות יום ושעה אחד'
    if (!r.users.length && !r.wa.length) p[3] = 'בחרו לפחות נמען אחד'
    return p
  }, [r, morning])

  useEffect(() => {
    if (step !== 4) return
    let live = true; setPrev(null); setErr('')
    api.callServer('reports-view', { op: 'preview', report: named }).then((x) => live && setPrev(x)).catch((e) => live && setErr(e.message))
    return () => { live = false }
  }, [step])   // eslint-disable-line react-hooks/exhaustive-deps

  const daySlots = (d) => r.slots.filter((s) => s.day === d).sort((a, b) => a.time.localeCompare(b.time))
  const addTime = (d) => { const used = daySlots(d).map((s) => s.time); const t = ['08:00', '13:00', '17:00', '20:00', '07:00', '10:00', '15:00'].find((x) => !used.includes(x)) || '12:00'; set({ slots: [...r.slots, { id: rid(), day: d, time: t, enabled: true }] }) }
  const patchSlot = (id, p) => set({ slots: r.slots.map((s) => (s.id === id ? { ...s, ...p } : s)) })
  const copyDay = (d) => set({ slots: [...r.slots.filter((s) => s.day === d), ...DAYS.flatMap((_, x) => (x === d ? [] : daySlots(d).map((s) => ({ ...s, id: rid(), day: x }))))] })
  const preset = (days) => { const times = [...new Set(r.slots.map((s) => s.time))].slice(0, 3); set({ slots: days.flatMap((d) => (times.length ? times : ['08:00']).map((t) => ({ id: rid(), day: d, time: t, enabled: true }))) }) }
  const people = data.members.filter((m) => !q.trim() || `${m.full_name || ''} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (key, id) => set({ [key]: r[key].includes(id) ? r[key].filter((x) => x !== id) : [...r[key], id] })
  const companies = r.companies === 'all' ? [] : r.companies

  const finish = async () => { setBusy('save'); setErr(''); try { await onSaved(named, templates) } catch (e) { setErr(e.message); setBusy('') } }
  const test = async () => { setBusy('test'); setErr(''); try { const x = await api.callServer('reports', { op: 'test', report: named }); setErr(x.sent ? 'דוח הבדיקה נשלח למייל שלכם.' : 'דוח הבדיקה לא נשלח. בדקו שהמייל שלכם רשום במערכת.') } catch (e) { setErr(e.message) } finally { setBusy('') } }

  const footer = (
    <>
      {step < 4 ? <button type="button" className="fin-btn fin-btn--primary" onClick={() => (problems[step] ? setErr(problems[step]) : (setErr(''), setStep(step + 1)))}>המשך</button>
        : <button type="button" className="fin-btn fin-btn--primary" disabled={!!busy || problems.some(Boolean)} onClick={finish}>{busy === 'save' ? 'שומר…' : 'שמירת הדוח'}</button>}
      {step === 4 && <button type="button" className="fin-btn fin-btn--ghost" disabled={!!busy} onClick={test}>{busy === 'test' ? 'שולח…' : 'שליחת בדיקה אליי'}</button>}
      {step > 0 && <button type="button" className="fin-btn fin-btn--ghost" onClick={() => { setErr(''); setStep(step - 1) }}>חזרה</button>}
      <button type="button" className="fin-btn fin-btn--ghost fin-wiz-cancel" onClick={onClose}>ביטול</button>
    </>
  )

  return (
    <Modal title={start.isNew ? 'דוח מתוזמן חדש' : `הגדרות הדוח: ${start.report.name}`} onClose={onClose} wide footer={footer}>
      <ol className="fin-wiz" aria-label="שלבי ההגדרה">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'is-on' : i < step ? 'is-done' : ''}><button type="button" onClick={() => { if (i < step || !problems.slice(0, i).some(Boolean)) { setErr(''); setStep(i) } }} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{s}</button></li>)}
      </ol>
      {err && <p className="fin-note fin-note--warn" role="alert">{err}</p>}

      {step === 0 && (
        <div className="fin-stack">
          <Field label="שם הדוח" wide hint="השם מופיע בכותרת המייל ובהיסטוריה"><input value={r.name} placeholder={T[r.template].name} maxLength={60} onChange={(e) => set({ name: e.target.value })} /></Field>
          <div className="fin-tpl-grid" role="radiogroup" aria-label="תבנית הדוח">
            {Object.entries(T).map(([k, t]) => (
              <button key={k} type="button" role="radio" aria-checked={r.template === k} className={`fin-tpl ${r.template === k ? 'is-on' : ''}`} onClick={() => set({ template: k })}>
                <strong>{t.name}</strong><span>{t.hint}</span>
              </button>
            ))}
          </div>
          {r.template === 'custom' && (
            <div className="fin-wiz-box">
              <h4>מה יופיע בדוח</h4>
              {templates.length > 0 && <p className="fin-wiz-row"><span className="fin-muted">תבניות שמורות:</span>{templates.map((t) => <button key={t.id} type="button" className="fin-chip" onClick={() => set({ fields: t.fields })}>{t.name}</button>)}</p>}
              <div className="fin-checks">
                {Object.entries(data.defs.fields).map(([k, label]) => <label key={k} className="fin-check"><input type="checkbox" checked={(r.fields || []).includes(k)} onChange={() => toggle('fields', k)} /> {label}</label>)}
              </div>
              <p className="fin-wiz-row"><input className="fin-wiz-input" value={tplName} placeholder="שם לתבנית, כדי להשתמש בה שוב" aria-label="שם התבנית לשמירה" onChange={(e) => setTplName(e.target.value)} /><button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" disabled={!tplName.trim() || !(r.fields || []).length} onClick={() => { setTemplates([...templates, { id: rid(), name: tplName.trim(), fields: r.fields }]); setTplName('') }}>שמירה כתבנית</button></p>
            </div>
          )}
          {!morning && (
            <label className="fin-check fin-check--box"><input type="checkbox" checked={r.ai} disabled={!data.channels.ai} onChange={(e) => set({ ai: e.target.checked })} />
              <span><b>להוסיף תובנות AI</b><small>עד שלוש שורות שנכתבות רק מהמספרים שבדוח, ומסומנות בנפרד מהנתונים המחושבים.{!data.channels.ai && ' לא זמין: אין מפתח AI בשרת.'}</small></span></label>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="fin-stack">
          <div className="fin-wiz-box">
            <h4>אילו חברות</h4>
            <div className="fin-wiz-row">
              <button type="button" className={`fin-chip ${r.companies === 'all' ? 'is-on' : ''}`} aria-pressed={r.companies === 'all'} onClick={() => set({ companies: 'all' })}>כל החברות</button>
              {data.businesses.map((b) => <button key={b.id} type="button" className={`fin-chip ${companies.includes(b.id) ? 'is-on' : ''}`} aria-pressed={companies.includes(b.id)} onClick={() => { const next = companies.includes(b.id) ? companies.filter((x) => x !== b.id) : [...companies, b.id]; set({ companies: next.length ? next : 'all' }) }}>{b.name}</button>)}
            </div>
            {morning && <p className="fin-muted fin-small">דוח הבוקר מציג תמיד את כל החברות.</p>}
          </div>
          <div className="fin-wiz-box">
            <h4>על איזו תקופה</h4>
            {morning ? <p className="fin-muted">דוח הבוקר מציג את 24 השעות האחרונות ואת תקופת הדיווח הנוכחית למע״מ.</p> : (
              <>
                <div className="fin-wiz-row">{Object.entries(data.defs.periods).map(([k, label]) => <button key={k} type="button" className={`fin-chip ${r.period === k ? 'is-on' : ''}`} aria-pressed={r.period === k} onClick={() => set({ period: k })}>{label}</button>)}</div>
                {r.period === 'days' && (
                  <>
                    <div className="fin-wiz-row" role="group" aria-label="הימים שהדוח מסכם">{DAYS.map((name, d) => <button key={d} type="button" className={`fin-chip ${(r.days || []).includes(d) ? 'is-on' : ''}`} aria-pressed={(r.days || []).includes(d)} onClick={() => set({ days: (r.days || []).includes(d) ? r.days.filter((x) => x !== d) : [...(r.days || []), d].sort() })}>יום {name}</button>)}</div>
                    <p className="fin-hint">הדוח מסכם כל יום שנבחר בתאריך האחרון שלו עד יום השליחה. לדוגמה: דוח שנשלח ביום חמישי עם שני, שלישי ורביעי מסכם את שלושת הימים האלה של אותו שבוע.</p>
                  </>
                )}
                {r.period === 'custom' && <div className="fin-form__grid"><Field label="מתאריך"><input type="date" value={r.from || ''} onChange={(e) => set({ from: e.target.value })} /></Field><Field label="עד תאריך"><input type="date" value={r.to || ''} onChange={(e) => set({ to: e.target.value })} /></Field></div>}
                <p className="fin-muted fin-small">התקופה נפרדת מהתזמון: דוח שנשלח כל בוקר יכול לסכם את אתמול, את השבוע או את החודש.</p>
              </>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fin-stack">
          <div className="fin-wiz-row">
            <span className="fin-muted">בחירה מהירה:</span>
            <button type="button" className="fin-chip" onClick={() => preset([0, 1, 2, 3, 4])}>א׳–ה׳</button>
            <button type="button" className="fin-chip" onClick={() => preset([0, 1, 2, 3, 4, 5, 6])}>כל יום</button>
            <button type="button" className="fin-chip" onClick={() => set({ slots: [] })}>ניקוי</button>
            <span className="fin-wiz-tz"><Field label="אזור זמן"><Select value={r.tz} onChange={(e) => set({ tz: e.target.value })}>{data.defs.tzs.map((z) => <option key={z} value={z}>{TZ[z] || z}</option>)}</Select></Field></span>
          </div>
          <div className="fin-week">
            {DAYS.map((name, d) => {
              const list = daySlots(d)
              return (
                <div key={d} className={`fin-week__day ${list.some((s) => s.enabled) ? 'is-on' : ''}`}>
                  <strong>יום {name}</strong>
                  <div className="fin-week__times">
                    {list.map((s) => (
                      <span key={s.id} className={`fin-slot ${s.enabled ? '' : 'is-off'}`}>
                        <input type="time" value={s.time} aria-label={`שעת שליחה ביום ${name}`} onChange={(e) => e.target.value && patchSlot(s.id, { time: e.target.value })} />
                        <Toggle checked={s.enabled} label={`הפעלת ${s.time} ביום ${name}`} onChange={(v) => patchSlot(s.id, { enabled: v })} />
                        <button type="button" className="fin-slot__x" aria-label={`הסרת ${s.time} מיום ${name}`} onClick={() => set({ slots: r.slots.filter((x) => x.id !== s.id) })}><Icon name="x" size={14} /></button>
                      </span>
                    ))}
                    {!list.length && <span className="fin-muted fin-small">לא נשלח</span>}
                  </div>
                  <div className="fin-week__acts">
                    <button type="button" className="fin-link" onClick={() => addTime(d)}>+ שעה</button>
                    {list.length > 0 && <button type="button" className="fin-link" onClick={() => copyDay(d)}>לכל הימים</button>}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="fin-muted fin-small">{scheduleText(r.slots)} · הדוח יוצא עד חמש דקות אחרי השעה, ופעם אחת בלבד לכל שעה שנקבעה.</p>
        </div>
      )}

      {step === 3 && (
        <div className="fin-stack">
          <div className="fin-wiz-box">
            <h4>במייל, למשתמשים במערכת <span className="fin-muted">{r.users.length} נבחרו</span></h4>
            {r.users.length > 0 && <div className="fin-wiz-row">{r.users.map((id) => { const m = data.members.find((x) => x.user_id === id); return m && <span key={id} className="fin-person">{m.full_name || m.email}<button type="button" aria-label={`הסרת ${m.full_name || m.email}`} onClick={() => toggle('users', id)}><Icon name="x" size={13} /></button></span> })}</div>}
            <div className="fin-wiz-row">
              <label className="fin-search"><Icon name="search" size={16} /><input type="search" value={q} placeholder="חיפוש לפי שם או מייל" aria-label="חיפוש משתמשים" onChange={(e) => setQ(e.target.value)} /></label>
              <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => set({ users: [...new Set([...r.users, ...people.map((m) => m.user_id)])] })}>בחירת הכול</button>
              {r.users.length > 0 && <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => set({ users: [] })}>ניקוי</button>}
            </div>
            <ul className="fin-people">
              {people.map((m) => <li key={m.user_id}><label className="fin-check"><input type="checkbox" checked={r.users.includes(m.user_id)} onChange={() => toggle('users', m.user_id)} /><span className="fin-people__name">{m.full_name || m.email}</span><bdi dir="ltr" className="fin-muted">{m.email}</bdi><Pill>{ROLE[m.role] || m.role}</Pill></label></li>)}
              {!people.length && <li className="fin-muted">לא נמצא משתמש.</li>}
            </ul>
          </div>
          <div className="fin-wiz-box">
            <h4><WaIcon size={18} /> בוואטסאפ <span className="fin-muted">{r.wa.length} נבחרו</span></h4>
            {!data.channels.whatsapp ? <p className="fin-note fin-note--warn">קו הוואטסאפ לא מחובר בשרת, ולכן אי אפשר לשלוח דוחות בוואטסאפ.</p> : (
              <>
                <p className="fin-muted fin-small">הקו השולח: <bdi dir="ltr">{data.channels.whatsapp_number ? phone(data.channels.whatsapp_number) : 'הקו המחובר'}</bdi>. הדוח נשלח רק למספרים שרשומים במערכת. בוואטסאפ יוצא תקציר קצר עם קישור לדוח המלא.</p>
                {!data.senders.length ? <p className="fin-muted">אין מספרים רשומים. מוסיפים מספר במסך "סורקים ניידים".</p> : (
                  <ul className="fin-people">{data.senders.map((s) => <li key={s.id}><label className="fin-check"><input type="checkbox" checked={r.wa.includes(s.id)} onChange={() => toggle('wa', s.id)} /><span className="fin-people__name">{s.label || 'ללא שם'}</span><bdi dir="ltr" className="fin-muted">{phone(s.phone)}</bdi></label></li>)}</ul>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fin-stack">
          <dl className="fin-rep__facts fin-rep__facts--sum">
            <div><dt>דוח</dt><dd>{named.name} · {T[r.template].name}</dd></div>
            <div><dt>מתי</dt><dd>{scheduleText(r.slots)}</dd></div>
            <div><dt>למי</dt><dd>{r.users.length} במייל{r.wa.length ? ` · ${r.wa.length} בוואטסאפ` : ''}</dd></div>
          </dl>
          <div className="fin-seg" role="tablist" aria-label="תצוגה מקדימה">
            <button type="button" role="tab" aria-selected={tab === 'email'} className={tab === 'email' ? 'is-on' : ''} onClick={() => setTab('email')}><Icon name="mail" size={15} /> מייל</button>
            <button type="button" role="tab" aria-selected={tab === 'wa'} className={tab === 'wa' ? 'is-on' : ''} onClick={() => setTab('wa')}><WaIcon size={15} /> וואטסאפ</button>
          </div>
          {!prev ? (err ? null : <Skeleton lines={5} label="מכין תצוגה מקדימה" />) : tab === 'email'
            ? <><p className="fin-muted fin-small">נושא: {prev.subject}{prev.empty ? ' · אין כרגע מסמכים בתקופה, הדוח יצא ריק' : ''}</p><iframe title="תצוגה מקדימה של המייל" className="fin-rep-frame" sandbox="" srcDoc={prev.html} /></>
            : <pre className="fin-wa-prev" dir="rtl">{prev.text}</pre>}
        </div>
      )}
    </Modal>
  )
}
