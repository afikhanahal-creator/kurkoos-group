import { useRef, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { money } from './format.js'
import { exportSheet } from './exportPackage.js'
import { Icon, InfoTip } from './ui.jsx'

const EXAMPLES = ['כמה הוצאנו החודש בכל החברות?', 'איזו חברה הוציאה הכי הרבה מתחילת השנה?', 'מי חמשת הספקים עם ההוצאות הגבוהות ביותר?', 'באיזו קטגוריה נרשמה העלייה הגדולה ביותר?', 'אילו פרויקטים חורגים מהתקציב?', 'כמה מסמכים עדיין לא שויכו?', 'כמה מע״מ יש במסמכים של החודש?', 'מה ההבדל בין החודש הקודם לחודש הנוכחי?']
const fmt = (v, unit) => (unit === 'count' ? Number(v).toLocaleString('he-IL') : money(v))

/* Questions about the real figures. The question becomes a query; the server computes the answer from the stored
   documents (never the AI), and every answer shows the period, the scope and opens the documents behind it. */
export default function Assistant() {
  const { documents, businesses, projects, go } = useFinance()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState([])
  const input = useRef(null)
  const send = async (text) => {
    const question = (text ?? q).trim()
    if (!question || busy) return
    setBusy(true); setQ('')
    try { const r = await api.callServer('ask', { question }); setItems((x) => [{ id: Date.now(), ...r }, ...x]) } catch (e) { setItems((x) => [{ id: Date.now(), question, error: e.message }, ...x]) } finally { setBusy(false); input.current?.focus() }
  }
  const openDocs = (ids, title) => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids, title })) } catch { /* noop */ } go('/documents?ids=1') }
  const excel = (ids, title) => exportSheet(documents.filter((d) => ids.includes(d.id)), 'excel', { businesses, projects }, {}, title)

  return (
    <div className="fin-ask fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">שאלות על הנתונים</h2>
        <InfoTip label="איך זה עובד">השאלה מתורגמת לשאילתה, והחישוב נעשה בשרת מתוך המסמכים השמורים, באותם כללים של הסקירה הפיננסית. ה-AI לא כותב אף מספר. כל תשובה מראה תקופה והיקף, ואפשר לפתוח את המסמכים שעליהם היא מבוססת.</InfoTip>
      </div>
      <form className="fin-ask__bar" onSubmit={(e) => { e.preventDefault(); send() }}>
        <Icon name="sparkle" size={19} />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="למשל: כמה הוצאנו על חומרי בניין מתחילת השנה?" aria-label="שאלה" maxLength={500} enterKeyHint="send" />
        <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || q.trim().length < 3}>{busy ? 'מחשב…' : 'שאלה'}</button>
      </form>
      {!items.length && (
        <div className="fin-ask__examples" aria-label="דוגמאות">
          {EXAMPLES.map((e) => <button key={e} type="button" onClick={() => send(e)} disabled={busy}>{e}</button>)}
        </div>
      )}
      <ol className="fin-ask__list" aria-live="polite">
        {items.map((it) => (
          <li key={it.id} className="fin-ask__item">
            <p className="fin-ask__q">{it.question}</p>
            {it.error ? <p className="fin-error fin-error--block" role="alert">{it.error}</p> : (
              <div className="fin-ask__a">
                <strong className="fin-ask__value">{it.answer}</strong>
                <p className="fin-ask__meta"><span>{it.period}</span>{it.scope && <span>{it.scope}</span>}{it.count > 0 && <span>{it.count === 1 ? 'מסמך אחד' : `${it.count} מסמכים`}</span>}</p>
                {it.explain && <p className="fin-ask__explain">{it.explain}</p>}
                {it.rows?.length > 1 && (() => { const max = Math.max(1, ...it.rows.map((r) => Math.abs(r.value))); return (
                  <ul className="fin-x-list fin-ask__rows">
                    {it.rows.map((r) => (
                      <li key={r.label}><button type="button" disabled={!r.ids?.length} onClick={() => openDocs(r.ids, r.label)}><span>{r.label}</span><span className="fin-ask__bar"><i style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} /></span><strong>{fmt(r.value, r.unit || it.unit)}</strong></button></li>
                    ))}
                  </ul>
                ) })()}
                {it.ids?.length > 0 && (
                  <div className="fin-form__actions">
                    <button type="button" className="fin-btn fin-btn--sm" onClick={() => openDocs(it.ids, it.question)}><Icon name="docs" size={15} /> פתיחת המסמכים</button>
                    <button type="button" className="fin-btn fin-btn--sm" onClick={() => excel(it.ids, it.question.slice(0, 40))}><Icon name="table" size={15} /> Excel</button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
