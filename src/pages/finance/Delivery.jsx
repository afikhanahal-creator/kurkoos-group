import { useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago, dateTime, nameOf } from './format.js'
import { Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync } from './ui.jsx'

export const EVENTS = {
  'document.received': 'מסמך חדש נקלט',
  'document.approved': 'מסמך אושר',
  'document.rejected': 'מסמך נדחה',
  'document.exported': 'מסמך יוצא לרו״ח',
}
const KIND = {
  webhook: { title: 'API (Webhook)', icon: 'webhook', desc: 'הודעה בזמן אמת לכתובת שלכם בכל פעם שמסמך נקלט או משנה סטטוס, כולל כל הנתונים וקישור לקובץ.', cta: 'חיבור webhook', defaults: ['document.received', 'document.approved', 'document.rejected', 'document.exported'] },
  email: { title: 'העברה למייל', icon: 'mail', desc: 'כל מסמך חדש נשלח אוטומטית לכתובת המייל שהגדרתם, עם הקובץ המקורי מצורף. מתאים למשל לתיבה של רו״ח.', cta: 'הוספת מייל לייצוא אוטומטי', defaults: ['document.received'] },
}

const SAMPLE = `{
  "id": "1842",
  "event": "document.approved",
  "created_at": "2026-11-08T09:12:44.120Z",
  "data": {
    "id": "6f1c…",
    "status": "approved",
    "type": "tax_invoice",
    "number": "4521",
    "supplier": { "name": "טמבור בע״מ", "tax_id": "520033143" },
    "company": { "id": "…", "name": "קורקוס ביצוע" },
    "issue_date": "2026-11-02",
    "total_amount": 3600,
    "vat_amount": 549.15,
    "file_url": "https://…/sign/…"
  }
}`
const VERIFY = `import crypto from 'node:crypto'

// raw = the request body exactly as received (before JSON.parse)
export function verify(raw, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false   // older than 5 minutes
  const want = crypto.createHmac('sha256', secret).update(\`\${t}.\${raw}\`).digest('hex')
  return v1.length === want.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(want))
}`

function Guide() {
  return (
    <details className="fin-guide">
      <summary>מדריך צעד אחר צעד</summary>
      <ol className="fin-guide__steps">
        <li><strong>כתובת שמקבלת POST.</strong> שרת, Make, Zapier או n8n. הכתובת חייבת להתחיל ב-<bdi dir="ltr">https://</bdi>.</li>
        <li><strong>חיבור כאן.</strong> מדביקים את הכתובת, בוחרים אירועים, ושומרים את הסוד שמוצג פעם אחת בלבד.</li>
        <li><strong>אימות.</strong> כל בקשה חתומה בכותרת <bdi dir="ltr">X-Kurkoos-Signature</bdi>. בדקו את החתימה לפני שאתם סומכים על התוכן:
          <pre dir="ltr" className="fin-code">{VERIFY}</pre>
        </li>
        <li><strong>תשובה.</strong> החזירו קוד 2xx תוך 10 שניות. תשובה אחרת נשלחת שוב אחרי 1, 5, 30 דקות, שעתיים ו-12 שעות. הכותרת <bdi dir="ltr">X-Kurkoos-Delivery</bdi> זהה בכל הניסיונות, כך שאפשר לזהות כפילות.</li>
        <li><strong>מה נשלח.</strong> הקישור לקובץ בתוקף 7 ימים.
          <pre dir="ltr" className="fin-code">{SAMPLE}</pre>
        </li>
      </ol>
    </details>
  )
}

export default function Delivery() {
  const { businesses } = useFinance()
  const list = useAsync(() => api.loadOutbound(), [])
  const queue = useAsync(() => api.loadOutboundQueue(30), [list.data])
  const [edit, setEdit] = useState(null)
  const [secret, setSecret] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const rows = list.data || []

  const open = (kind, o) => { setErr(''); setEdit(o ? { ...o } : { kind, target: '', name: '', events: KIND[kind].defaults, business_id: '', enabled: true }) }
  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy('save')
    try {
      const r = await api.callServer('outbound-save', edit)
      setEdit(null); list.reload()
      if (r.secret) setSecret({ secret: r.secret, target: r.outbound.target })
      else setMsg(edit.id ? 'השינויים נשמרו.' : `מעכשיו כל מסמך חדש יישלח ל-${r.outbound.target}.`)
    } catch (e2) { setErr(e2.message) } finally { setBusy('') }
  }
  const test = async (o) => {
    setBusy(o.id); setMsg(''); setErr('')
    try { const r = await api.callServer('outbound-test', { id: o.id }); if (r.ok) setMsg(o.kind === 'email' ? `נשלח מייל בדיקה ל-${o.target}.` : `הכתובת ענתה ${r.status}. החיבור תקין.`); else setErr(r.error); list.reload() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const toggle = async (o) => { try { await api.callServer('outbound-save', { ...o, enabled: !o.enabled }); list.reload() } catch (e) { setErr(e.message) } }
  const remove = async (o) => {
    if (!window.confirm(`להפסיק לשלוח ל-${o.target}?`)) return
    try { await api.callServer('outbound-delete', { id: o.id }); list.reload() } catch (e) { setErr(e.message) }
  }
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); setMsg('הועתק.') } catch { /* the field is selectable */ } }

  return (
    <div className="fin-stack fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">שליחה אוטומטית</h2>
        <InfoTip label="על שליחה אוטומטית">כל מסמך שנקלט, אושר, נדחה או יוצא יכול להישלח מיד למערכת אחרת או לתיבת מייל. השליחה נעשית מהשרת, עם ניסיונות חוזרים, וכל משלוח נרשם ביומן למטה.</InfoTip>
      </div>
      <p className="fin-muted fin-lead">שלחו מסמכים חדשים אוטומטית דרך webhook או לכתובת אימייל.</p>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && !edit && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {Object.entries(KIND).map(([kind, k]) => {
        const mine = rows.filter((o) => o.kind === kind)
        return (
          <article key={kind} className="fin-out-card">
            <header>
              <span className="fin-out-card__icon"><Icon name={k.icon} size={22} /></span>
              <div><h3>{k.title}</h3><p>{k.desc}</p></div>
            </header>
            {kind === 'webhook' && <Guide />}
            {mine.length > 0 && (
              <ul className="fin-out-list">
                {mine.map((o) => (
                  <li key={o.id}>
                    <div className="fin-out-list__main">
                      <strong dir="ltr">{o.target}</strong>
                      <span className="fin-acc__sub">{o.events.map((e) => EVENTS[e] || e).join(' · ')}{o.business_id ? ` · רק ${nameOf(businesses, o.business_id)}` : ''}</span>
                      <span className="fin-acc__sub">{o.sent_count ? `${o.sent_count === 1 ? 'משלוח אחד' : `${o.sent_count} משלוחים`}` : 'עוד לא נשלח'}{o.last_at ? ` · אחרון ${ago(o.last_at)}` : ''}{o.fail_count ? ` · ${o.fail_count} כשלים` : ''}</span>
                      {o.last_status && o.last_status !== 'ok' && <span className="fin-acc__err">{o.last_status}</span>}
                    </div>
                    <Pill tone={!o.enabled ? 'muted' : o.last_status && o.last_status !== 'ok' ? 'attn' : 'ok'}>{!o.enabled ? 'כבוי' : o.last_status && o.last_status !== 'ok' ? 'תקלה' : 'פעיל'}</Pill>
                    <MoreMenu label={`פעולות עבור ${o.target}`} items={[
                      { label: busy === o.id ? 'שולח…' : 'שליחת בדיקה', onClick: () => test(o), disabled: !!busy },
                      { label: 'עריכה', onClick: () => open(kind, o) },
                      { label: o.enabled ? 'השהיה' : 'הפעלה', onClick: () => toggle(o) },
                      { label: 'מחיקה', onClick: () => remove(o), danger: true },
                    ]} />
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className={`fin-btn ${mine.length ? '' : 'fin-btn--primary'} fin-btn--block-sm fin-btn--start`} onClick={() => open(kind)}><Icon name="plus" size={17} /> {k.cta}</button>
          </article>
        )
      })}

      {(queue.data || []).length > 0 && (
        <details className="fin-disclosure">
          <summary>יומן משלוחים</summary>
          <div className="fin-table-wrap fin-table-wrap--flat">
            <table className="fin-table fin-table--plain">
              <thead><tr><th>מתי</th><th>יעד</th><th>אירוע</th><th>תוצאה</th></tr></thead>
              <tbody>{queue.data.map((r) => {
                const o = rows.find((x) => x.id === r.outbound_id)
                return <tr key={r.id}><td>{dateTime(r.created_at)}</td><td dir="ltr" className="fin-td-clip">{o?.target || '—'}</td><td>{EVENTS[r.event] || r.event}</td><td>{r.done_at && !r.last_error ? <Pill tone="ok">נשלח</Pill> : r.done_at ? <Pill tone="bad">נכשל</Pill> : r.attempts ? <span className="fin-cell-err">ניסיון {r.attempts}: {r.last_error} · שוב ב-{dateTime(r.next_at)}</span> : <Pill tone="muted">ממתין</Pill>}</td></tr>
              })}</tbody>
            </table>
          </div>
        </details>
      )}

      {edit && (
        <Modal title={edit.id ? 'עריכת יעד' : KIND[edit.kind].cta} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-out" className="fin-btn fin-btn--primary" disabled={busy === 'save'}>{busy === 'save' ? 'שומר…' : 'שמירה'}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-out" className="fin-form__grid" onSubmit={save} noValidate>
            <Field label={edit.kind === 'email' ? 'כתובת המייל' : 'כתובת ה-webhook'} wide tone={err ? 'error' : undefined} hint={err || (edit.kind === 'email' ? 'למשל התיבה של רו״ח' : 'https://… שמקבלת POST עם JSON')}>
              <input type={edit.kind === 'email' ? 'email' : 'url'} dir="ltr" value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} placeholder={edit.kind === 'email' ? 'cpa@example.co.il' : 'https://example.com/hooks/kurkoos'} required autoFocus />
            </Field>
            <fieldset className="fin-field fin-field--wide fin-checkset"><legend className="fin-field__label">מתי לשלוח</legend>
              {Object.entries(EVENTS).map(([k, v]) => <label key={k} className="fin-check"><input type="checkbox" checked={edit.events.includes(k)} onChange={(e) => setEdit({ ...edit, events: e.target.checked ? [...edit.events, k] : edit.events.filter((x) => x !== k) })} /> {v}</label>)}
            </fieldset>
            <Field label="חברה"><select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="שם (לא חובה)"><input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={edit.kind === 'email' ? 'רו״ח' : 'Make'} /></Field>
          </form>
        </Modal>
      )}
      {secret && (
        <Modal title="ה-webhook חובר" onClose={() => setSecret(null)} footer={<button type="button" className="fin-btn fin-btn--primary" onClick={() => setSecret(null)}>שמרתי את הסוד</button>}>
          <p>זה הסוד שחותם על כל בקשה ל-<bdi dir="ltr">{secret.target}</bdi>. הוא מוצג רק עכשיו. שמרו אותו בשרת שלכם, ובדקו איתו את הכותרת X-Kurkoos-Signature.</p>
          <div className="fin-secret"><input readOnly dir="ltr" value={secret.secret} onFocus={(e) => e.target.select()} aria-label="סוד ה-webhook" /><button type="button" className="fin-btn fin-btn--sm" onClick={() => copy(secret.secret)}><Icon name="copy" size={15} /> העתקה</button></div>
        </Modal>
      )}
    </div>
  )
}
