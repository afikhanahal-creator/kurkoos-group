import { useEffect, useRef, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { money } from './format.js'
import { exportSheet } from './exportPackage.js'
import { Icon, InfoTip } from './ui.jsx'

const EXAMPLES = ['כמה הוצאנו החודש בכל החברות?', 'איזו חברה הוציאה הכי הרבה מתחילת השנה?', 'מי חמשת הספקים עם ההוצאות הגבוהות ביותר?', 'באיזו קטגוריה נרשמה העלייה הגדולה ביותר?', 'אילו פרויקטים חורגים מהתקציב?', 'כמה מסמכים עדיין לא שויכו?', 'כמה מע״מ יש במסמכים של החודש?', 'מה ההבדל בין החודש הקודם לחודש הנוכחי?']
const PHASES = ['קורא את השאלה…', 'טוען את המסמכים מהמאגר…', 'מחשב סכומים לפי החברות והתקופה…', 'משווה ומדרג…', 'מנסח את התשובה…']
const COMPLEX = ['כמה הוצאנו על חומרי בניין מתחילת השנה, ומי הספק הכי גדול בקטגוריה?', 'מה ההוצאה החודשית הממוצעת השנה, ובאיזה חודש היה השיא?', 'כמה מסמכים מחכים לבדיקה, וכמה חשבוניות עוד בלי אישור תשלום?', 'מהן 5 החשבוניות הגדולות ברבעון?']
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
  const [phase, setPhase] = useState(0)
  useEffect(() => { if (!busy) { setPhase(0); return undefined } const t = setInterval(() => setPhase((x) => Math.min(PHASES.length - 1, x + 1)), 1300); return () => clearInterval(t) }, [busy])
  const fill = (text) => { setQ(text); requestAnimationFrame(() => input.current?.focus()) }
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
      setMsgs((x) => [...x, { id: `e${Date.now()}`, who: 'ai', error: /credit balance|billing/i.test(e.message) ? 'אין יתרה בחשבון Claude, ולכן אי אפשר לפענח שאלות כרגע. מנהל המערכת מוסיף קרדיט ב-console.anthropic.com.'
        : /failed to fetch|networkerror|load failed/i.test(e.message) ? 'אין חיבור לשרת כרגע. בודקים את האינטרנט ושולחים שוב.'
        : /[\u0590-\u05FF]/.test(e.message) && !/^שגיאה \d+$/.test(e.message) ? e.message
        : 'לא הצלחתי לענות כרגע בגלל תקלה בשרת. השאלה נשמרה בתיבה, אפשר לשלוח שוב בעוד רגע.' }])
      setQ((cur) => cur || question)
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
            <div className="fin-chat__cards">
              {[...EXAMPLES.slice(0, 4), ...COMPLEX].map((e) => (
                <div key={e} className={`fin-chat__card ${COMPLEX.includes(e) ? 'is-complex' : ''}`}>
                  <button type="button" className="fin-chat__card-q" onClick={() => fill(e)} title="לחיצה ממלאת את תיבת השאלה, אפשר לערוך לפני השליחה">{COMPLEX.includes(e) && <em>שאלה מורכבת</em>}{e}</button>
                  <button type="button" className="fin-chat__card-go" onClick={() => send(e)} disabled={busy} aria-label={`שליחה: ${e}`} title="שליחה כמו שהיא"><Icon name="send" size={15} /></button>
                </div>
              ))}
            </div>
            <p className="fin-chat__hint">אפשר לשאול חופשי ובכמה חלקים: תקופה ("ברבעון", "באוקטובר", "מתחילת השנה"), חברה, פרויקט, קטגוריה או ספק, והשוואה לתקופה קודמת. כל מספר מחושב מהמסמכים עצמם.</p>
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
        {busy && <div className="fin-chat__row is-ai"><span className="fin-chat__avatar" aria-hidden="true"><Icon name="sparkle" size={16} /></span><div className="fin-chat__bubble is-ai fin-chat__thinking" role="status"><span className="fin-chat__typing" aria-hidden="true"><i /><i /><i /></span><span>{PHASES[phase]}</span></div></div>}
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
  const [copied, setCopied] = useState(false)
  if (r.intent === 'unknown') return <div className="fin-chat__answer"><p className="fin-chat__reply">{r.reply || r.answer}</p>{r.explain && <p className="fin-chat__explain">{r.explain}</p>}</div>
  const all = [r, ...(r.parts || [])]
  const copy = () => {
    const lines = [r.question, '', ...all.map((x) => `• ${x.answer}${x.period ? ` (${[x.scope, x.period].filter(Boolean).join(', ')})` : ''}`), '', ...(r.limits || []).map((l) => `הערה: ${l}`)]
    navigator.clipboard?.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }).catch(() => {})
  }
  return (
    <div className="fin-chat__answer">
      <p className="fin-chat__reply">{all.length > 1 ? `בדקתי ${all.length} חלקים בשאלה:` : 'בדקתי במסמכים:'}</p>
      <strong className="fin-chat__value">{r.answer}</strong>
      <p className="fin-chat__meta"><span>{r.period}</span>{r.scope && <span>{r.scope}</span>}{r.count > 0 && <span>{r.count === 1 ? 'מסמך אחד' : `${r.count} מסמכים`}</span>}</p>
      {r.explain && <p className="fin-chat__explain">{r.explain}</p>}
      <Rows r={r} openDocs={openDocs} />
      {(r.parts || []).map((x, i) => (
        <section key={i} className="fin-chat__part">
          <span className="fin-chat__part-label">חלק {i + 2}</span>
          <strong>{x.answer}</strong>
          <p className="fin-chat__meta"><span>{x.period}</span>{x.scope && <span>{x.scope}</span>}{x.count > 0 && <span>{x.count === 1 ? 'מסמך אחד' : `${x.count} מסמכים`}</span>}</p>
          {x.explain && <p className="fin-chat__explain">{x.explain}</p>}
          <Rows r={x} openDocs={openDocs} />
          {x.ids?.length > 0 && <button type="button" className="fin-link" onClick={() => openDocs(x.ids, x.answer)}>{x.count === 1 ? 'פתיחת המסמך' : `פתיחת ${x.count} המסמכים`}</button>}
        </section>
      ))}
      <details className="fin-chat__basis">
        <summary><Icon name="info" size={14} /> על סמך מה?</summary>
        <ul>
          <li>{r.checked ? `${Number(r.checked).toLocaleString('he-IL')} מסמכים נבדקו` : 'אין מסמכים בהיקף שנבחר'}{r.period ? `, ${r.period}` : ''}{r.scope ? `, ${r.scope}` : ''}.</li>
          <li>כל מספר חושב בשרת מהמסמכים השמורים, באותם כללים של הסקירה הפיננסית. ה-AI רק הבין את השאלה.</li>
          <li>קבלה שמשלמת חשבונית שכבר במערכת לא נספרת פעמיים; זיכוי מקטין את הסכום.</li>
        </ul>
      </details>
      {r.limits?.length > 0 && <ul className="fin-chat__limits">{r.limits.map((l) => <li key={l}><Icon name="alert" size={13} /> {l}</li>)}</ul>}
      <div className="fin-chat__acts">
        {r.ids?.length > 0 && <button type="button" className="fin-btn fin-btn--sm" onClick={() => openDocs(r.ids, r.question)}><Icon name="docs" size={15} /> {r.count === 1 ? 'פתיחת המסמך' : `פתיחת ${r.count} המסמכים`}</button>}
        {r.ids?.length > 0 && <button type="button" className="fin-btn fin-btn--sm" onClick={() => excel(r.ids, r.question.slice(0, 40))}><Icon name="table" size={15} /> Excel</button>}
        <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={copy}><Icon name="copy" size={15} /> {copied ? 'הועתק' : 'העתקה'}</button>
      </div>
    </div>
  )
}

function Rows({ r, openDocs }) {
  if (!(r.rows?.length > 1)) return null
  const max = Math.max(1, ...r.rows.map((x) => Math.abs(x.value)))
  return (
    <ul className="fin-x-bars fin-chat__rows">
      {r.rows.map((x) => (
        <li key={x.label}><button type="button" disabled={!x.ids?.length} onClick={() => openDocs(x.ids, x.label)}>
          <span className="fin-x-bars__name">{x.label}</span><strong>{fmt(x.value, x.unit || r.unit)}</strong>
          <span className="fin-x-bars__bar"><i style={{ width: `${Math.max(2, (Math.abs(x.value) / max) * 100)}%` }} /></span>
        </button></li>
      ))}
    </ul>
  )
}
