import { useEffect, useRef, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { money } from './format.js'
import { exportSheet } from './exportPackage.js'
import { Icon, InfoTip } from './ui.jsx'

const EXAMPLES = ['כמה הוצאנו החודש בכל החברות?', 'איזו חברה הוציאה הכי הרבה מתחילת השנה?', 'מי חמשת הספקים עם ההוצאות הגבוהות ביותר?', 'באיזו קטגוריה נרשמה העלייה הגדולה ביותר?', 'אילו פרויקטים חורגים מהתקציב?', 'כמה מסמכים עדיין לא שויכו?', 'כמה מע״מ יש במסמכים של החודש?', 'מה ההבדל בין החודש הקודם לחודש הנוכחי?']
const fmt = (v, unit) => (unit === 'count' ? Number(v).toLocaleString('he-IL') : money(v))

/* A conversation about the real figures. Each question becomes a query (the AI reads the question, with the earlier ones
   for follow-ups such as "and last month?"); the server computes every number from the stored documents with the same
   rules as the overview, and the reply says what was checked, for which period and scope, and opens the documents
   behind it. The conversation lives in this screen only: nothing financial is kept in the browser. */
export default function Assistant() {
  const { documents, businesses, projects, go, me } = useFinance()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState([])          // { id, who: 'me' | 'ai', text?, result?, error? }
  const input = useRef(null)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs.length, busy])

  const send = async (text) => {
    const question = (text ?? q).trim()
    if (question.length < 3 || busy) return
    const history = msgs.filter((m) => m.who === 'ai' && m.result).slice(-6).map((m) => ({ q: m.result.question, intent: m.result.intent, period: m.result.period, scope: m.result.scope }))
    setMsgs((x) => [...x, { id: `q${Date.now()}`, who: 'me', text: question }]); setQ(''); setBusy(true)
    try {
      const r = await api.callServer('ask', { question, history })
      setMsgs((x) => [...x, { id: `a${Date.now()}`, who: 'ai', result: r }])
    } catch (e) {
      setMsgs((x) => [...x, { id: `e${Date.now()}`, who: 'ai', error: /credit balance|billing/i.test(e.message) ? 'אין יתרה בחשבון Claude, ולכן אי אפשר לפענח שאלות כרגע. מנהל המערכת מוסיף קרדיט ב-console.anthropic.com.' : e.message }])
    } finally { setBusy(false); input.current?.focus() }
  }
  const openDocs = (ids, title) => { try { sessionStorage.setItem('fin-x-ids', JSON.stringify({ ids, title })) } catch { /* noop */ } go('/documents?ids=1') }
  const excel = (ids, title) => exportSheet(documents.filter((d) => ids.includes(d.id)), 'excel', { businesses, projects }, {}, title)
  const first = String(me?.full_name || '').split(' ')[0]

  return (
    <div className="fin-chat">
      <header className="fin-chat__head">
        <span className="fin-chat__avatar" aria-hidden="true"><Icon name="sparkle" size={20} /></span>
        <div><h2 className="fin-pagehead__title">שאלות על הנתונים</h2><small>העוזר הפיננסי של קורקוס · עונה מתוך המסמכים במערכת</small></div>
        <InfoTip label="איך זה עובד">השאלה מתורגמת לשאילתה, והחישוב נעשה בשרת מתוך המסמכים השמורים, באותם כללים של הסקירה הפיננסית. ה-AI לא כותב אף מספר. אפשר לשאול שאלות המשך ("ומה לגבי החודש שעבר?"), וכל תשובה פותחת את המסמכים שמאחוריה.</InfoTip>
        {msgs.length > 0 && <button type="button" className="fin-btn fin-btn--sm fin-chat__new" onClick={() => setMsgs([])}><Icon name="plus" size={15} /> שיחה חדשה</button>}
      </header>

      <div className="fin-chat__body" aria-live="polite">
        {!msgs.length && (
          <div className="fin-chat__hello">
            <span className="fin-chat__avatar is-big" aria-hidden="true"><Icon name="sparkle" size={28} /></span>
            <h3>{first ? `שלום ${first}, ` : 'שלום, '}על מה נבדוק היום?</h3>
            <p>אני מחשב כל תשובה מהחשבוניות והקבלות שבמערכת: הוצאות, ספקים, חברות, פרויקטים, מע״מ ומסמכים שמחכים לטיפול.</p>
            <div className="fin-chat__chips">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => send(e)} disabled={busy}>{e}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (m.who === 'me' ? (
          <div key={m.id} className="fin-chat__row is-me"><p className="fin-chat__bubble is-me">{m.text}</p></div>
        ) : (
          <div key={m.id} className="fin-chat__row is-ai">
            <span className="fin-chat__avatar" aria-hidden="true"><Icon name="sparkle" size={16} /></span>
            <div className="fin-chat__bubble is-ai">
              {m.error ? <p className="fin-error" role="alert">{m.error}</p> : <Answer r={m.result} openDocs={openDocs} excel={excel} />}
              {!m.error && i === msgs.length - 1 && m.result?.follow?.length > 0 && (
                <div className="fin-chat__chips is-follow">{m.result.follow.map((f) => <button key={f} type="button" onClick={() => send(f)} disabled={busy}>{f}</button>)}</div>
              )}
            </div>
          </div>
        )))}
        {busy && <div className="fin-chat__row is-ai"><span className="fin-chat__avatar" aria-hidden="true"><Icon name="sparkle" size={16} /></span><div className="fin-chat__bubble is-ai fin-chat__typing" role="status" aria-label="מחשב תשובה"><i /><i /><i /></div></div>}
        <div ref={end} />
      </div>

      <form className="fin-chat__composer" onSubmit={(e) => { e.preventDefault(); send() }}>
        <textarea ref={input} value={q} rows={1} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={msgs.length ? 'שאלת המשך, למשל: ומה לגבי החודש שעבר?' : 'למשל: כמה הוצאנו על חומרי בניין מתחילת השנה?'} aria-label="שאלה" maxLength={500} enterKeyHint="send" />
        <button type="submit" className="fin-btn fin-btn--primary fin-chat__send" disabled={busy} aria-label="שליחה"><Icon name="send" size={18} /></button>
      </form>
    </div>
  )
}

function Answer({ r, openDocs, excel }) {
  const max = Math.max(1, ...(r.rows || []).map((x) => Math.abs(x.value)))
  return (
    <div className="fin-chat__answer">
      <p className="fin-chat__reply">{r.reply || r.answer}</p>
      {r.intent !== 'unknown' && <strong className="fin-chat__value">{r.answer}</strong>}
      {r.intent !== 'unknown' && <p className="fin-chat__meta"><span>{r.period}</span>{r.scope && <span>{r.scope}</span>}{r.count > 0 && <span>{r.count === 1 ? 'מסמך אחד' : `${r.count} מסמכים`}</span>}</p>}
      {r.explain && <p className="fin-chat__explain">{r.explain}</p>}
      {r.rows?.length > 1 && (
        <ul className="fin-x-bars fin-chat__rows">
          {r.rows.map((x) => (
            <li key={x.label}><button type="button" disabled={!x.ids?.length} onClick={() => openDocs(x.ids, x.label)}>
              <span className="fin-x-bars__name">{x.label}</span><strong>{fmt(x.value, x.unit || r.unit)}</strong>
              <span className="fin-x-bars__bar"><i style={{ width: `${Math.max(2, (Math.abs(x.value) / max) * 100)}%` }} /></span>
            </button></li>
          ))}
        </ul>
      )}
      {r.ids?.length > 0 && (
        <div className="fin-chat__acts">
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => openDocs(r.ids, r.question)}><Icon name="docs" size={15} /> {r.count === 1 ? 'פתיחת המסמך' : `פתיחת ${r.count} המסמכים`}</button>
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => excel(r.ids, r.question.slice(0, 40))}><Icon name="table" size={15} /> Excel</button>
        </div>
      )}
    </div>
  )
}
