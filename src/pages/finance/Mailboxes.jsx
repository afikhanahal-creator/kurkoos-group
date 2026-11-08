import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { date } from './format.js'
import { Empty, Icon } from './ui.jsx'

const ago = (t) => {
  if (!t) return 'עוד לא נסרקה'
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 60) return `לפני ${m} דקות`
  if (m < 1440) return `לפני ${Math.round(m / 60)} שעות`
  return date(t)
}

/* the mailboxes the system reads invoices from */
export default function Mailboxes() {
  const { mailboxes, businesses, reload } = useFinance()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [biz, setBiz] = useState('')
  const [runs, setRuns] = useState([])

  useEffect(() => {
    const ok = params.get('connected'); const bad = params.get('error')
    if (ok) setMsg(`התיבה ${ok} חוברה. אפשר להריץ סריקה ראשונה (90 הימים האחרונים).`)
    if (bad) setErr(bad === 'no_refresh' ? 'Google לא החזיר הרשאה קבועה. נסו שוב.' : bad === 'state' ? 'פג הזמן של החיבור. נסו שוב.' : `החיבור נכשל: ${bad}`)
    if (ok || bad) { setParams({}, { replace: true }); reload() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.loadRuns().then(setRuns).catch(() => {}) }, [mailboxes])

  const connect = async () => {
    setBusy('connect'); setErr('')
    try { const { url } = await api.callServer('gmail-auth-url', { business_id: biz || null }); window.location.assign(url) } catch (e) { setErr(e.message); setBusy('') }
  }
  const sync = async (id) => {
    setBusy(id || 'all'); setErr(''); setMsg('')
    try {
      const { results } = await api.callServer('sync', { mailbox_id: id })
      const imported = results.reduce((s, r) => s + (r.imported || 0), 0)
      const pending = results.some((r) => !r.complete && !r.error)
      setMsg(`${imported} מסמכים חדשים נאספו.${pending ? ' יש עוד מיילים, לחצו שוב כדי להמשיך.' : ''}`)
      const errs = results.filter((r) => r.error).map((r) => `${r.mailbox}: ${r.error}`)
      if (errs.length) setErr(errs.join(' · '))
      reload()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const disconnect = async (m) => {
    if (!window.confirm(`לנתק את ${m.email}? המסמכים שכבר נאספו נשארים.`)) return
    setBusy(m.id)
    try { await api.callServer('disconnect', { mailbox_id: m.id }); reload() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const setBusiness = async (m, business_id) => { await api.saveRow('fin_mailboxes', { id: m.id, business_id: business_id || null }); reload() }

  const live = mailboxes.filter((m) => m.status !== 'revoked')

  return (
    <div className="fin-stack">
      <section className="fin-card fin-connect">
        <div>
          <h2 className="fin-card__title">חיבור תיבת Gmail</h2>
          <p className="fin-muted">המערכת קוראת בלבד (הרשאת קריאה), מחפשת מיילים עם חשבוניות וקבלות, ושומרת רק את המסמכים עצמם. סריקה אוטומטית פעם ביום, ואפשר להריץ ידנית.</p>
        </div>
        <div className="fin-connect__actions">
          {businesses.length > 1 && (
            <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="החברה של התיבה">
              <option value="">איזו חברה?</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button type="button" className="fin-btn fin-btn--primary" onClick={connect} disabled={!!busy}><Icon name="mail" size={18} /> {busy === 'connect' ? 'מעביר ל-Google…' : 'חיבור Gmail'}</button>
          <button type="button" className="fin-btn" disabled title="בשלב הבא">Outlook (בקרוב)</button>
        </div>
      </section>

      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {!live.length ? <Empty title="עוד לא חוברה תיבה">חברו את תיבת המייל שאליה מגיעות החשבוניות, למשל של הנהלת החשבונות.</Empty> : (
        <>
          <div className="fin-card__head">
            <h2 className="fin-card__title">תיבות מחוברות</h2>
            <button type="button" className="fin-btn" onClick={() => sync()} disabled={!!busy}><Icon name="sync" size={18} /> {busy === 'all' ? 'סורק…' : 'סריקת כל התיבות'}</button>
          </div>
          <ul className="fin-boxes">
            {live.map((m) => (
              <li key={m.id} className="fin-box">
                <span className={`fin-dot fin-dot--${m.status}`} aria-hidden="true" />
                <div className="fin-box__main">
                  <strong dir="ltr">{m.email}</strong>
                  <small>{m.provider === 'gmail' ? 'Gmail' : m.provider} · נסרקה {ago(m.last_sync_at)} · {m.docs_found || 0} מסמכים נאספו</small>
                  {m.last_error && <small className="fin-error">{m.last_error}</small>}
                </div>
                {businesses.length > 1 && (
                  <select className="fin-select" value={m.business_id || ''} onChange={(e) => setBusiness(m, e.target.value)} aria-label={`החברה של ${m.email}`}>
                    <option value="">כל החברות</option>
                    {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                <button type="button" className="fin-btn" onClick={() => sync(m.id)} disabled={!!busy}>{busy === m.id ? 'סורק…' : 'סריקה'}</button>
                {m.status === 'error' && <button type="button" className="fin-btn" onClick={connect}>חיבור מחדש</button>}
                <button type="button" className="fin-link" onClick={() => disconnect(m)} disabled={!!busy}>ניתוק</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {runs.length > 0 && (
        <section className="fin-card">
          <h2 className="fin-card__title">סריקות אחרונות</h2>
          <table className="fin-table fin-table--plain">
            <thead><tr><th>מתי</th><th>תיבה</th><th className="fin-num">נבדקו</th><th className="fin-num">נאספו</th><th className="fin-num">כבר קיימים</th><th>הערה</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.started_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td dir="ltr">{mailboxes.find((m) => m.id === r.mailbox_id)?.email || ''}</td>
                  <td className="fin-num">{r.scanned}</td><td className="fin-num">{r.imported}</td><td className="fin-num">{r.skipped}</td>
                  <td className="fin-muted">{r.error || (r.finished_at ? '' : 'רצה…')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
