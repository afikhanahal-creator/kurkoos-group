import { useState } from 'react'
import * as api from './api.js'
import { Field, Icon, Pill, useAsync } from './ui.jsx'

const usd = (n) => (n === null || n === undefined ? '—' : `$${Number(n) < 1 ? Number(n).toFixed(3) : Number(n).toFixed(2)}`)

/* What the readings cost and the cap on the automatic ones (server/finance/budget.js, docs/finance/AI-COST.md).
   Admins change the caps; a finance manager sees the numbers. */
export default function AiCost({ canEdit }) {
  const r = useAsync(() => api.callServer('ai-cost'), [])
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const d = r.data
  if (!d) return null
  const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0)
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { await api.callServer('ai-budget-save', { day_usd: edit.day, month_usd: edit.month }); setEdit(null); setMsg('התקציב נשמר'); r.reload() } catch (x) { setMsg(x.message) } finally { setBusy(false) }
  }
  return (
    <section className="fin-panelcard fin-aicost" aria-label="עלות הקריאה">
      <header>
        <h3>עלות הקריאה</h3>
        {canEdit && !edit && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setEdit({ day: String(d.caps.day_usd), month: String(d.caps.month_usd) })}><Icon name="edit" size={15} /> שינוי התקציב</button>}
      </header>
      <p className="fin-muted fin-small">מודל קטן וזול קורא כל מסמך קודם. רק כשהקריאה שלו לא עוברת את הבדיקות (סכומים שלא מסתדרים, ספק או תאריך חסרים, מספר עוסק לא תקין) קורא אותו המודל הגדול. מעל התקציב, מסמכים שמגיעים מהמייל נשמרים ונקראים בלילה; מה שאדם מעלה או שולח ב-WhatsApp נקרא תמיד.</p>
      <dl className="fin-aicost__nums">
        <div><dt>היום</dt><dd>{usd(d.today)} <small>מתוך {usd(d.caps.day_usd)}</small></dd><span className="fin-aicost__bar" aria-hidden="true"><i style={{ width: `${pct(d.today, d.caps.day_usd)}%` }} /></span></div>
        <div><dt>החודש</dt><dd>{usd(d.month)} <small>מתוך {usd(d.caps.month_usd)}</small></dd><span className="fin-aicost__bar" aria-hidden="true"><i style={{ width: `${pct(d.month, d.caps.month_usd)}%` }} /></span></div>
        <div><dt>ממוצע למסמך (30 יום)</dt><dd>{usd(d.per_doc)}</dd></div>
        <div><dt>נקראו במודל הקטן</dt><dd>{d.tiers.share_small === null ? '—' : `${d.tiers.share_small}%`} <small>{d.tiers.small} מתוך {d.tiers.small + d.tiers.escalated + d.tiers.mid}</small></dd></div>
      </dl>
      {d.waiting > 0 && <p className="fin-note" role="status"><Pill tone="warn">ממתינים לתקציב</Pill> {d.waiting === 1 ? 'מסמך אחד מחכה' : `${d.waiting} מסמכים מחכים`} לקריאה בלילה, כי התקציב נוצל.</p>}
      {edit && (
        <form className="fin-form__grid fin-aicost__form" onSubmit={save} noValidate>
          <Field label="תקציב יומי (דולר)"><input type="number" inputMode="decimal" min="0" step="0.5" dir="ltr" value={edit.day} onChange={(e) => setEdit({ ...edit, day: e.target.value })} /></Field>
          <Field label="תקציב חודשי (דולר)"><input type="number" inputMode="decimal" min="0" step="1" dir="ltr" value={edit.month} onChange={(e) => setEdit({ ...edit, month: e.target.value })} /></Field>
          <div className="fin-aicost__actions"><button type="submit" className="fin-btn fin-btn--primary fin-btn--sm" disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</button><button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></div>
        </form>
      )}
      {msg && <p className="fin-small" role="status">{msg}</p>}
    </section>
  )
}
