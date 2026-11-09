import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { AGENTS, ago, dateTime } from './format.js'
import { Card, Icon, PageHead, Pill, useAsync } from './ui.jsx'

const TONE = { ok: 'ok', partial: 'warn', error: 'bad', running: 'info' }
const LABEL = { ok: 'תקין', partial: 'חלקי', error: 'שגיאה', running: 'רץ' }
const TRIG = { manual: 'ידני', cron: 'יומי', upload: 'העלאה', retry: 'ניסיון חוזר' }

/* each agent's real state, read from fin_agent_runs (no simulated activity) */
export default function Agents() {
  const { mailboxes, documents, can } = useFinance()
  const runs = useAsync(() => api.loadAgentRuns(300), [documents.length])
  const sums = useAsync(() => api.loadSummaries(), [])
  const sync = useAsync(() => api.loadSyncRuns(30), [documents.length])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const list = runs.data || []
  const cards = useMemo(() => Object.entries(AGENTS).map(([k, a]) => {
    const mine = list.filter((r) => r.agent === k)
    const week = mine.filter((r) => Date.now() - new Date(r.started_at).getTime() < 7 * 86400_000)
    return { k, ...a, last: mine[0], runs: week.length, processed: week.reduce((s, r) => s + (r.processed || 0), 0), errors: week.reduce((s, r) => s + (r.errors || 0), 0) }
  }), [list])
  const act = async (action, label, payload) => {
    setBusy(action); setMsg('')
    try {
      const r = await api.callServer(action, payload)
      setMsg(action === 'sync' ? `נסרקו ${r.results.length} תיבות, ${r.results.reduce((a, x) => a + (x.imported || 0), 0)} מסמכים חדשים` : action === 'retry-failed' ? `נוסו ${r.retried || 0}, הצליחו ${r.recovered || 0}` : `${label} הושלם`)
      runs.reload(); sums.reload(); sync.reload()
    } catch (e) { setMsg(e.message) } finally { setBusy('') }
  }
  const latest = (sums.data || [])[0]
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const inbox = useAsync(() => api.loadWhatsappInbox(1), [])
  const at = (h, m) => { const n = new Date(); const t = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), h, m)); if (t <= n) t.setUTCDate(t.getUTCDate() + 1); return `${t.toDateString() === n.toDateString() ? 'היום' : 'מחר'} ${t.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` }

  // an agent is "active" only when its last real run worked; switched on is not enough
  const engine = useMemo(() => {
    const boxes = mailboxes.filter((m) => m.status !== 'revoked')
    const lastOk = boxes.map((m) => m.last_success_at).filter(Boolean).sort().pop()
    const ocrRuns = list.filter((r) => r.agent === 'ocr')
    const lastOcr = ocrRuns[0]
    const today = new Date().toDateString()
    const month = new Date().toISOString().slice(0, 7)
    const todays = documents.filter((d) => new Date(d.created_at).toDateString() === today)
    const thisMonth = documents.filter((d) => String(d.processed_at || d.created_at).slice(0, 7) === month)
    const fresh = (t, h) => t && Date.now() - new Date(t).getTime() < h * 3600_000
    return {
      email: !boxes.length ? ['muted', 'לא מחובר', 'אין תיבה מחוברת'] : boxes.some((m) => m.status === 'error') ? ['attn', 'תקלה', `${boxes.filter((m) => m.status === 'error').length} תיבות צריכות חיבור מחדש`] : fresh(lastOk, 26) ? ['ok', 'פעיל', `נסרק ${ago(lastOk)}`] : ['warn', 'לא נסרק לאחרונה', lastOk ? `נסרק ${ago(lastOk)}` : 'עוד לא נסרק'],
      whatsapp: !status.data ? ['muted', 'לא ידוע', ''] : !status.data.whatsapp?.configured ? ['muted', 'לא מוגדר', 'חסרים פרטי Green API בשרת'] : (inbox.data || [])[0] ? ['ok', 'פעיל', `הודעה אחרונה ${ago(inbox.data[0].at)}`] : ['ok', 'מוגדר', 'ממתין להודעה ראשונה'],
      ocr: !status.data ? ['muted', 'לא ידוע', ''] : !status.data.claude ? ['attn', 'לא מוגדר', 'חסר ANTHROPIC_API_KEY'] : lastOcr && lastOcr.errors && !lastOcr.processed ? ['attn', 'תקלה', `קריאה אחרונה נכשלה ${ago(lastOcr.started_at)}`] : lastOcr ? ['ok', 'פעיל', `קריאה אחרונה ${ago(lastOcr.finished_at || lastOcr.started_at)}`] : ['ok', 'מוגדר', 'עוד לא נקרא מסמך'],
      lastOk,
      today: { collected: todays.length, ok: todays.filter((d) => ['review', 'approved', 'sent', 'duplicate'].includes(d.status)).length, review: documents.filter((d) => d.status === 'review').length, retrying: documents.filter((d) => d.status === 'failed' && d.next_retry_at).length, person: documents.filter((d) => d.status === 'failed' && !d.next_retry_at).length },
      ai: { calls: thisMonth.reduce((a, d) => a + (d.ai_calls || 0), 0), tokens: thisMonth.reduce((a, d) => a + (d.ai_tokens_in || 0) + (d.ai_tokens_out || 0), 0), second: thisMonth.filter((d) => d.extraction?.verification && !d.extraction.verification.error).length, docs: thisMonth.filter((d) => d.ai_calls).length },
    }
  }, [mailboxes, list, documents, status.data, inbox.data])

  return (
    <div className="fin-stack">
      <PageHead title="סוכני AI" sub="שבעה סוכנים שעובדים ברצף על כל מייל ומסמך. כאן רואים מה כל אחד עשה באמת, מתי ובאיזו הצלחה.">
        <button type="button" className="fin-btn" onClick={() => act('sync', 'סריקה')} disabled={!!busy || !mailboxes.some((m) => m.status !== 'revoked')}><Icon name="sync" size={18} /> {busy === 'sync' ? 'סורק…' : 'סריקת כל התיבות'}</button>
        <button type="button" className="fin-btn" onClick={() => act('retry-failed', 'ניסיון חוזר')} disabled={!!busy}><Icon name="refresh" size={18} /> ניסיון חוזר</button>
        <button type="button" className="fin-btn" onClick={() => act('summary-now', 'סיכום', { email: false })} disabled={!!busy}><Icon name="docs" size={18} /> סיכום עכשיו</button>
      </PageHead>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      <section className="fin-engine" aria-label="מצב המנוע">
        <ul className="fin-engine__agents">
          {[['mail', 'איסוף ממייל', engine.email], ['phone', 'איסוף מ-WhatsApp', engine.whatsapp], ['sparkle', 'קריאה (OCR ו-AI)', engine.ocr]].map(([icon, name, [tone, state, note]]) => (
            <li key={name}><span className="fin-engine__icon"><Icon name={icon} size={18} /></span><span className="fin-engine__name"><strong>{name}</strong><small>{note}</small></span><Pill tone={tone}>{state}</Pill></li>
          ))}
        </ul>
        <dl className="fin-engine__facts">
          <div><dt>איסוף אחרון</dt><dd>{engine.lastOk ? ago(engine.lastOk) : '—'}</dd></div>
          <div><dt>איסוף הלילה הבא</dt><dd>{at(0, 23)}</dd></div>
          <div><dt>דוח בוקר</dt><dd>{at(4, 57)}</dd></div>
          <div><dt>נאספו היום</dt><dd>{engine.today.collected}</dd></div>
          <div><dt>נקראו בהצלחה היום</dt><dd>{engine.today.ok}</dd></div>
          <div><dt>ממתינים לבדיקה</dt><dd>{engine.today.review}</dd></div>
          <div className={engine.today.person ? 'is-attn' : ''}><dt>נכשלו</dt><dd>{engine.today.retrying + engine.today.person}{engine.today.person ? ` (${engine.today.person} לטיפול ידני)` : ''}</dd></div>
        </dl>
        <p className="fin-muted fin-small">AI החודש: {engine.ai.docs} מסמכים, {engine.ai.calls} קריאות ({engine.ai.second} מהן קריאה שנייה לאימות), {engine.ai.tokens.toLocaleString('he-IL')} טוקנים. העלות לפי המחירון של Anthropic לטוקנים.</p>
      </section>
      <div className="fin-agent-grid">
        {cards.map((c) => (
          <article key={c.k} className="fin-agent">
            <header><span className={`fin-agent-dot fin-agent-dot--${c.last ? TONE[c.last.status] : 'idle'}`} aria-hidden="true" /><h3>{c.name}</h3>{c.last ? <Pill tone={TONE[c.last.status]}>{LABEL[c.last.status]}</Pill> : <Pill>לא רץ עדיין</Pill>}</header>
            <p className="fin-muted">{c.desc}</p>
            <dl><div><dt>ריצה אחרונה</dt><dd>{c.last ? ago(c.last.finished_at || c.last.started_at) : '—'}</dd></div><div><dt>ריצות (7 ימים)</dt><dd>{c.runs}</dd></div><div><dt>טופלו</dt><dd>{c.processed}</dd></div><div><dt>שגיאות</dt><dd className={c.errors ? 'fin-cell-err' : ''}>{c.errors}</dd></div></dl>
            {c.last?.details?.not_financial?.length > 0 && <p className="fin-muted fin-small">דולגו כלא כספיים: {c.last.details.not_financial.slice(-3).join(' · ')}</p>}
            {c.last?.details?.error && <p className="fin-cell-err fin-small">{c.last.details.error}</p>}
          </article>
        ))}
      </div>
      <div className="fin-grid">
        <Card title="סיכום יומי אחרון">
          {!latest ? <p className="fin-muted">עוד לא נוצר סיכום. הוא נוצר כל בוקר, או בכפתור "סיכום עכשיו".</p> : (
            <ul className="fin-kv">
              <li><span>יום</span><strong>{latest.day}</strong></li>
              <li><span>מסמכים חדשים</span><strong>{latest.data.collected}</strong></li>
              <li><span>עובדו בהצלחה</span><strong>{latest.data.processed}</strong></li>
              <li><span>ממתינים לבדיקה</span><strong>{latest.data.review}</strong></li>
              <li><span>כפילויות</span><strong>{latest.data.duplicates}</strong></li>
              <li><span>שגיאות קריאה</span><strong>{latest.data.failed_docs}</strong></li>
              <li><span>תיבות בתקלה</span><strong>{latest.data.failed_mailboxes?.length || 0}</strong></li>
              <li><span>מוכנים לייצוא</span><strong>{latest.data.ready_to_export}</strong></li>
              <li><span>נשלח במייל</span><strong>{latest.sent_to?.length ? latest.sent_to.join(', ') : 'לא'}</strong></li>
            </ul>
          )}
        </Card>
        <Card title="סריקות תיבות אחרונות">
          {!(sync.data || []).length ? <p className="fin-muted">אין סריקות.</p> : (
            <table className="fin-table fin-table--plain">
              <thead><tr><th>מתי</th><th>תיבה</th><th className="fin-num">נבדקו</th><th className="fin-num">נאספו</th><th>תוצאה</th></tr></thead>
              <tbody>{sync.data.map((r) => <tr key={r.id}><td>{dateTime(r.started_at)}</td><td dir="ltr">{mailboxes.find((m) => m.id === r.mailbox_id)?.email || ''}</td><td className="fin-num">{r.scanned}</td><td className="fin-num">{r.imported}</td><td>{r.error ? <span className="fin-cell-err">ניסיון {r.attempt}: {r.error}</span> : r.finished_at ? 'תקין' : 'רץ…'}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      </div>
      <Card title="יומן ריצות">
        <div className="fin-table-wrap fin-table-wrap--flat">
          <table className="fin-table fin-table--plain">
            <thead><tr><th>סוכן</th><th>הפעלה</th><th>התחיל</th><th className="fin-num">טופלו</th><th className="fin-num">שגיאות</th><th>מצב</th></tr></thead>
            <tbody>{list.slice(0, 40).map((r) => <tr key={r.id}><td>{AGENTS[r.agent]?.name}</td><td>{TRIG[r.trigger] || r.trigger}</td><td>{dateTime(r.started_at)}</td><td className="fin-num">{r.processed}</td><td className="fin-num">{r.errors}</td><td><Pill tone={TONE[r.status]}>{LABEL[r.status]}</Pill></td></tr>)}</tbody>
          </table>
        </div>
        {!list.length && <p className="fin-muted">הסוכנים עוד לא רצו. חברו תיבה או העלו מסמך.</p>}
      </Card>
    </div>
  )
}
