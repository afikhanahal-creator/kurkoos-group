import './SocialEngineTab.css'
import { useState } from 'react'
import { importEngineFile } from './engineImport.js'

/* ============================================================
   ContentEngineTab: מנוע התוכן לרשתות החברתיות.
   המערכת רצה עכשיו באתר עצמו, בכתובת ‎/engine, עם ההתחברות של האדמין.
   הנתונים יושבים בטבלה engine_docs והקבצים ב-engine-media (Supabase),
   ו-Claude ותמונות ChatGPT עוברים דרך השרת של האתר (המפתחות ב-Vercel).
   הגרסה הקודמת ב-claude.ai נשארת זמינה עד שהמעבר נבדק.
   ============================================================ */

export const ENGINE_URL = import.meta.env.VITE_CONTENT_ENGINE_URL || '/engine/'
export const OLD_ENGINE_URL = 'https://claude.ai/artifact/FGRUkHgHBjpBLHXFjbztz4'
const WIN_NAME = 'kurkoos-content-engine'

/** פותח (או מחזיר לפוקוס) את החלון של מנוע התוכן. חייב לרוץ מתוך לחיצה. */
export function openEngine() {
  const w = window.open(ENGINE_URL, WIN_NAME)
  if (w) { try { w.focus() } catch { /* noop */ } }
  return !!w
}

const I = {
  cal: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  art: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />,
  shuffle: <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  open: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
}
const Svg = ({ d, s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)

const FEATURES = [
  { i: 'cal', t: 'לוח שנה עם גרירה', d: 'גוררים פוסט ליום אחר, או על פוסט אחר כדי להחליף ביניהם תאריכים. מגירת טיוטות לגרירה ישירה ללוח.' },
  { i: 'edit', t: 'סטודיו עריכה לכל פוסט', d: 'טקסט, החלפת תמונה וחיתוך, תאורה, צורה ופורמט, שדרוגים בלחיצה ובדיקת איכות לפני אישור.' },
  { i: 'art', t: 'פוסטים מהכתבות באתר', d: 'כל כתבה שעולה לאתר הופכת לפוסט שמפנה אליה. לפחות 40% מהפוסטים בכל שבוע.' },
  { i: 'shuffle', t: 'בלי חזרתיות', d: 'אותה תמונה לא חוזרת בתוך 30 יום, והדמיה של אותו פרויקט לכל היותר פעמיים בחודש.' },
]

function ImportCard() {
  const [state, setState] = useState({ busy: false, msg: '', p: 0, done: null, err: '' })
  async function onFile(e) {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setState({ busy: true, msg: 'מתחיל…', p: 0, done: null, err: '' })
    try {
      const r = await importEngineFile(f, (msg, p) => setState((s) => ({ ...s, msg, p })))
      setState({ busy: false, msg: '', p: 1, done: r, err: '' })
    } catch (x) {
      setState({ busy: false, msg: '', p: 0, done: null, err: String((x && x.message) || x) })
    }
  }
  return (
    <section className="ce-import" aria-labelledby="ce-import-h">
      <h3 id="ce-import-h">ייבוא מהמערכת הקודמת</h3>
      <ol>
        <li>פותחים את המערכת הקודמת ב‑claude.ai ולוחצים בעמוד הבית על &quot;הורדת קובץ ההעברה&quot;.</li>
        <li>בוחרים כאן את הקובץ שירד (מסתיים ב‑‎.kce). זה לוקח כמה דקות. הנתונים מהקובץ מחליפים את מה שיש כרגע במערכת שבאתר, ואפשר להריץ שוב בלי חשש.</li>
      </ol>
      <div className="ce-import__row">
        <label className={`ce-btn ce-btn--pri${state.busy ? ' is-busy' : ''}`}>
          {state.busy ? 'מייבא…' : 'בחירת קובץ ההעברה'}
          <input type="file" accept=".kce" onChange={onFile} disabled={state.busy} hidden />
        </label>
        <a className="ce-btn ce-btn--ghost" href={OLD_ENGINE_URL} target="_blank" rel="noopener">פתיחת המערכת הקודמת</a>
      </div>
      {state.busy && (
        <div className="ce-import__prog" role="status" aria-live="polite">
          <span style={{ width: `${Math.round(state.p * 100)}%` }} />
          <small>{state.msg}</small>
        </div>
      )}
      {state.done && (
        <p className="ce-import__ok" role="status">
          הייבוא הסתיים: {state.done.records.toLocaleString('he-IL')} רשומות ו‑{state.done.files} קבצים
          {state.done.failed ? `, ${state.done.failed} קבצים לא עלו (אפשר להריץ שוב)` : ''}. אפשר לפתוח את המערכת.
        </p>
      )}
      {state.err && <p className="ce-import__err" role="alert">{state.err}</p>}
    </section>
  )
}

export default function SocialEngineTab() {
  return (
    <div className="se">
      <section className="ce-hero">
        <div className="ce-hero__txt">
          <span className="ce-eyebrow">פייסבוק · אינסטגרם · Metricool</span>
          <h2>מנוע התוכן של קבוצת קורקוס</h2>
          <p>
            תכנון, עיצוב ותזמון של כל הפוסטים לרשתות, עורך הווידאו וסטודיו התמונות, במקום אחד ובכתובת של האתר.
            שום דבר לא מתפרסם בלי האישור שלכם.
          </p>
          <div className="ce-hero__acts">
            <button type="button" className="ce-btn ce-btn--pri" onClick={openEngine}>
              <Svg d={I.open} s={20} /> פתיחת המערכת
            </button>
            <a className="ce-btn ce-btn--ghost" href={ENGINE_URL} target={WIN_NAME} rel="noopener">
              או פתיחה בלשונית חדשה
            </a>
          </div>
          <p className="ce-note">
            <Svg d={I.shield} s={16} /> נפתח באתר, עם אותה התחברות של עמוד הניהול. בטלפון אפשר להוסיף אותו למסך הבית כאפליקציה.
          </p>
        </div>
        <div className="ce-hero__art" aria-hidden="true">
          <div className="ce-mock">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="ce-mock__col">
                <i />{i % 2 === 0 && <b className={i === 2 ? 'r' : ''} />}{i === 4 && <b className="t" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ce-grid" aria-label="מה יש במערכת">
        {FEATURES.map((f) => (
          <article key={f.t} className="ce-card">
            <span className="ce-card__ico"><Svg d={I[f.i]} /></span>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </article>
        ))}
      </section>

      <ImportCard />

      <section className="ce-how">
        <h3>מה עובד כאן ומה עדיין ב‑claude.ai</h3>
        <p>
          באתר: הלוח והתזמונים, הגלריה ועורך הפוסטים, עורך הווידאו, סטודיו התמונות עם ChatGPT ו&quot;בקשה לעורך&quot; עם Claude.
          המפתחות של OpenAI ו‑Claude שמורים רק ב‑Vercel ולא עוברים בדפדפן.
          עדיין ב‑claude.ai: שליחה ל‑Metricool, Canva, והעורך הקולנועי בענן. אותם נעביר בשלב הבא.
        </p>
      </section>
    </div>
  )
}
