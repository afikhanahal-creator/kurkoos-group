import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago, dateTime, nameOf } from './format.js'
import { Card, Empty, Field, Icon, Modal, PageHead, Pill, useAsync } from './ui.jsx'

const PROV = { gmail: 'Gmail / Google Workspace', outlook: 'Outlook / Microsoft 365', imap: 'IMAP' }
const STATE = { active: ['ok', 'מחובר'], error: ['bad', 'תקלה'], paused: ['muted', 'מושהה'], revoked: ['muted', 'מנותק'] }

export default function Mailboxes() {
  const { mailboxes, businesses, documents, can, reload } = useFinance()
  const [params, setParams] = useSearchParams()
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const runs = useAsync(() => api.loadSyncRuns(40), [mailboxes])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [biz, setBiz] = useState('')
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    const ok = params.get('connected'); const bad = params.get('error')
    if (ok) setMsg(`התיבה ${ok} חוברה. אפשר להריץ סריקה ראשונה (90 הימים האחרונים).`)
    if (bad) setErr(bad === 'no_refresh' ? 'הספק לא החזיר הרשאה קבועה. נסו שוב.' : bad === 'state' ? 'פג הזמן של החיבור. נסו שוב.' : `החיבור נכשל: ${bad}`)
    if (ok || bad) { setParams({}, { replace: true }); reload() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (provider) => {
    setBusy(provider); setErr('')
    try { const { url } = await api.callServer('auth-url', { provider, business_id: biz || null }); window.location.assign(url) } catch (e) { setErr(e.message); setBusy('') }
  }
  const sync = async (id) => {
    setBusy(id || 'all'); setErr(''); setMsg('')
    try {
      const { results } = await api.callServer('sync', { mailbox_id: id })
      const imported = results.reduce((s, r) => s + (r.imported || 0), 0)
      const skipped = results.reduce((s, r) => s + (r.skipped || 0), 0)
      const pending = results.some((r) => !r.complete && !r.error)
      setMsg(`${imported} מסמכים חדשים נאספו${skipped ? `, ${skipped} כבר היו במערכת` : ''}.${pending ? ' יש עוד מיילים: לחצו שוב כדי להמשיך.' : ''}`)
      const errs = results.filter((r) => r.error).map((r) => `${r.mailbox}: ${r.error}`)
      if (errs.length) setErr(errs.join(' · '))
      reload(); runs.reload()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const disconnect = async (m) => {
    if (!window.confirm(`לנתק את ${m.email}? ההרשאה תבוטל אצל הספק. המסמכים שכבר נאספו נשארים.`)) return
    setBusy(m.id)
    try { await api.callServer('disconnect', { mailbox_id: m.id }); reload() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const saveSettings = async (e) => {
    e.preventDefault()
    try { await api.saveRow('fin_mailboxes', { id: settings.id, business_id: settings.business_id || null, query: settings.query || null, days_back: Number(settings.days_back) || 90, status: settings.status }); setSettings(null); reload() } catch (e2) { setErr(e2.message) }
  }
  const live = mailboxes.filter((m) => m.status !== 'revoked')
  const prov = status.data?.providers || {}

  return (
    <div className="fin-stack">
      <PageHead title="חשבונות מייל מחוברים" sub="חיבור מאובטח (OAuth) בהרשאת קריאה בלבד. המערכת לא שומרת סיסמאות, ולא שולחת, משנה או מוחקת מיילים." />
      <Card className="fin-connect">
        <div>
          <h3 className="fin-card__title">חיבור תיבה חדשה</h3>
          <p className="fin-muted">אפשר לחבר כמה תיבות במקביל. הסורק עובר על הדואר הנכנס, התוויות והארכיון (לא על דואר זבל), ומחפש חשבוניות גם כשהנושא לא אומר "חשבונית".</p>
        </div>
        <div className="fin-connect__actions">
          {businesses.length > 1 && <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="החברה של התיבה"><option value="">שיוך לחברה (לא חובה)</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
          <button type="button" className="fin-btn fin-btn--primary" onClick={() => connect('gmail')} disabled={!!busy}><Icon name="mail" size={18} /> {busy === 'gmail' ? 'מעביר ל-Google…' : 'חיבור Gmail'}</button>
          <button type="button" className="fin-btn" onClick={() => connect('outlook')} disabled={!!busy}><Icon name="mail" size={18} /> {busy === 'outlook' ? 'מעביר ל-Microsoft…' : 'חיבור Outlook / 365'}</button>
        </div>
        {status.data && (!prov.gmail || !prov.outlook) && <p className="fin-muted fin-small">{!prov.gmail && 'Gmail עוד לא הוגדר בשרת (GOOGLE_CLIENT_ID). '}{!prov.outlook && 'Outlook עוד לא הוגדר בשרת (MS_CLIENT_ID).'}</p>}
      </Card>

      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {!live.length ? <Empty title="עוד לא חוברה תיבה" icon="mail">חברו את התיבה שאליה מגיעות החשבוניות, למשל של הנהלת החשבונות.</Empty> : (
        <>
          <div className="fin-card__head">
            <h3 className="fin-card__title">{live.length} תיבות</h3>
            <button type="button" className="fin-btn" onClick={() => sync()} disabled={!!busy}><Icon name="sync" size={18} /> {busy === 'all' ? 'סורק…' : 'סריקת כל התיבות'}</button>
          </div>
          <ul className="fin-boxes">
            {live.map((m) => {
              const docs = documents.filter((d) => d.mailbox_id === m.id)
              const [tone, label] = STATE[m.status] || ['muted', m.status]
              return (
                <li key={m.id} className="fin-box">
                  <div className="fin-box__head">
                    <span className={`fin-dot fin-dot--${m.status}`} aria-hidden="true" />
                    <div className="fin-box__main"><strong dir="ltr">{m.email}</strong><small>{PROV[m.provider]}{m.business_id ? ` · ${nameOf(businesses, m.business_id)}` : ''}</small></div>
                    <Pill tone={tone}>{label}</Pill>
                  </div>
                  <dl className="fin-box__stats">
                    <div><dt>סנכרון מוצלח</dt><dd>{ago(m.last_success_at)}</dd></div>
                    <div><dt>סריקה אחרונה</dt><dd>{ago(m.last_scan_at)}</dd></div>
                    <div><dt>מסמכים</dt><dd>{docs.length}</dd></div>
                    <div><dt>שגיאות</dt><dd className={m.errors_count ? 'fin-cell-err' : ''}>{m.errors_count || 0}</dd></div>
                  </dl>
                  {m.last_error && <p className="fin-cell-err fin-small">{m.last_error}</p>}
                  <div className="fin-box__actions">
                    <button type="button" className="fin-btn" onClick={() => sync(m.id)} disabled={!!busy || m.status === 'paused'}><Icon name="sync" size={18} /> {busy === m.id ? 'סורק…' : 'סריקה'}</button>
                    {m.status === 'error' && <button type="button" className="fin-btn fin-btn--primary" onClick={() => connect(m.provider)}>חיבור מחדש</button>}
                    <button type="button" className="fin-btn" onClick={() => setSettings({ ...m })}><Icon name="settings" size={18} /> הגדרות</button>
                    <button type="button" className="fin-link fin-link--danger" onClick={() => disconnect(m)} disabled={!!busy}>ניתוק</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {(runs.data || []).length > 0 && (
        <Card title="יומן סנכרון">
          <div className="fin-table-wrap fin-table-wrap--flat">
            <table className="fin-table fin-table--plain">
              <thead><tr><th>מתי</th><th>תיבה</th><th>הפעלה</th><th className="fin-num">נבדקו</th><th className="fin-num">נאספו</th><th className="fin-num">קיימים</th><th>תוצאה</th></tr></thead>
              <tbody>{runs.data.map((r) => <tr key={r.id}><td>{dateTime(r.started_at)}</td><td dir="ltr">{mailboxes.find((m) => m.id === r.mailbox_id)?.email || ''}</td><td>{r.trigger === 'cron' ? 'יומי' : 'ידני'}</td><td className="fin-num">{r.scanned}</td><td className="fin-num">{r.imported}</td><td className="fin-num">{r.skipped}</td><td>{r.error ? <span className="fin-cell-err">ניסיון {r.attempt}: {r.error}</span> : r.finished_at ? 'תקין' : 'רץ…'}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}

      {settings && (
        <Modal title={`הגדרות ${settings.email}`} onClose={() => setSettings(null)} footer={<><button type="submit" form="fin-box" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setSettings(null)}>ביטול</button></>}>
          <form id="fin-box" className="fin-form__grid" onSubmit={saveSettings}>
            <Field label="חברה"><select value={settings.business_id || ''} onChange={(e) => setSettings({ ...settings, business_id: e.target.value })}><option value="">לפי המסמך</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="מצב"><select value={settings.status} onChange={(e) => setSettings({ ...settings, status: e.target.value })}><option value="active">פעיל</option><option value="paused">מושהה</option></select></Field>
            <Field label="סריקה ראשונה: כמה ימים אחורה"><input type="number" min="1" max="730" value={settings.days_back || 90} onChange={(e) => setSettings({ ...settings, days_back: e.target.value })} /></Field>
            <Field label="חיפוש נוסף (תחביר Gmail, לא חובה)" hint='למשל: -from:newsletter@ או label:הנהלת-חשבונות'><input value={settings.query || ''} onChange={(e) => setSettings({ ...settings, query: e.target.value })} dir="ltr" /></Field>
          </form>
        </Modal>
      )}
    </div>
  )
}
