import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { date, dateTime } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync, askConfirm } from './ui.jsx'
import Select from './Select.jsx'

const PROV = { gmail: 'Gmail', outlook: 'Office 365', imap: 'IMAP' }
const STATE = { active: ['ok', 'מחובר'], error: ['attn', 'תקלה בחיבור'], paused: ['muted', 'מושהה'] }
export default function Mailboxes() {
  const { mailboxes, businesses, documents, can, reload, go } = useFinance()
  const [params, setParams] = useSearchParams()
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const runs = useAsync(() => api.loadSyncRuns(30), [mailboxes])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [settings, setSettings] = useState(null)
  const [pickBiz, setPickBiz] = useState(null)

  useEffect(() => {
    const ok = params.get('connected'); const bad = params.get('error')
    if (ok) setMsg(`התיבה ${ok} חוברה. אפשר להריץ סריקה ראשונה (90 הימים האחרונים).`)
    if (bad) setErr(bad === 'no_refresh' ? 'הספק לא החזיר הרשאה קבועה. נסו שוב.' : bad === 'state' ? 'פג הזמן של החיבור. נסו שוב.' : bad === 'forbidden' ? 'אין לך הרשאה לחבר תיבה.' : `החיבור נכשל: ${bad}`)
    if (ok || bad) { setParams({}, { replace: true }); reload() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const live = mailboxes.filter((m) => m.status !== 'revoked')
  // "קבלות ישנות" in the top bar lands here with ?old=1
  useEffect(() => {
    if (params.get('old') !== '1') return
    setParams({}, { replace: true })
    if (!can('operate')) return
    if (live.length) go('/scans')
    else setMsg('כדי לאסוף קבלות ישנות, חברו קודם תיבת דואר.')
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps
  const periodFrom = useMemo(() => live.map((m) => m.sync_from).filter(Boolean).sort()[0] || null, [live])
  const prov = status.data?.providers || {}

  const connect = async (provider) => {
    setBusy(provider); setErr('')
    try { const { url } = await api.callServer('auth-url', { provider, choose: true }); window.location.assign(url) } catch (e) { setErr(e.message); setBusy('') }
  }
  const sync = async (id) => {
    setBusy(id || 'all'); setErr(''); setMsg('')
    try {
      const { results } = await api.callServer('sync', { mailbox_id: id })
      const imported = results.reduce((s, r) => s + (r.imported || 0), 0)
      const skipped = results.reduce((s, r) => s + (r.skipped || 0), 0)
      const pending = results.some((r) => !r.complete && !r.error)
      setMsg(`${imported ? `${imported} מסמכים חדשים נאספו` : 'אין מסמכים חדשים'}${skipped ? `, ${skipped} כבר היו במערכת` : ''}.${pending ? ' יש עוד מיילים: לחצו שוב כדי להמשיך.' : ''}`)
      const errs = results.filter((r) => r.error).map((r) => `${r.mailbox}: ${r.error}`)
      if (errs.length) setErr(errs.join(' · '))
      reload(); runs.reload()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const disconnect = async (m) => {
    if (!(await askConfirm({ text: `לנתק את ${m.email}? ההרשאה תבוטל אצל הספק. המסמכים שכבר נאספו נשארים.`, ok: 'ניתוק', danger: true }))) return
    setBusy(m.id)
    try { await api.callServer('disconnect', { mailbox_id: m.id }); reload() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const setBusiness = async (m, id) => {
    try { await api.saveRow('fin_mailboxes', { id: m.id, business_id: id || null }); setPickBiz(null); reload() } catch (e) { setErr(e.message) }
  }
  const saveSettings = async (e) => {
    e.preventDefault()
    try { await api.saveRow('fin_mailboxes', { id: settings.id, query: settings.query || null, status: settings.status }); setSettings(null); reload() } catch (e2) { setErr(e2.message) }
  }

  return (
    <div className="fin-stack fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">חשבונות אימייל</h2>
        <InfoTip label="על חשבונות אימייל">המערכת מתחברת לתיבה בהרשאת קריאה בלבד (OAuth): היא לא שומרת סיסמה, ולא שולחת, משנה או מוחקת מיילים. כל בוקר הסוכנים עוברים על הדואר הנכנס, התוויות והארכיון, ואוספים חשבוניות וקבלות גם כשהנושא לא אומר "חשבונית".</InfoTip>
      </div>

      {live.length > 0 && (
        <>
          <div className="fin-section-head">
            <h3>התיבות שלכם</h3>
            <button type="button" className="fin-btn" onClick={() => sync()} disabled={!!busy}><Icon name="sync" size={17} /> {busy === 'all' ? 'מסנכרן…' : 'סנכרון כל החשבונות עכשיו'}</button>
          </div>
          <p className="fin-period">תקופת סנכרון: {periodFrom ? `מ-${date(periodFrom)}` : 'מהחיבור'}. {can('operate') && <button type="button" className="fin-link" onClick={() => go('/scans')}>קבלות ישנות</button>}</p>
        </>
      )}
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {live.length > 0 && (
        <ul className="fin-acc-list">
          {live.map((m) => {
            const [tone, label] = STATE[m.status] || ['muted', m.status]
            const n = documents.filter((d) => d.mailbox_id === m.id).length
            const biz = businesses.find((b) => b.id === m.business_id)
            return (
              <li key={m.id} className="fin-acc">
                <ProviderLogo name={m.provider} />
                <div className="fin-acc__main">
                  <strong dir="ltr">{m.email}</strong>
                  <span className="fin-acc__meta">
                    {PROV[m.provider]}
                    {pickBiz === m.id ? (
                      <Select className="fin-select fin-select--sm" autoFocus defaultValue={m.business_id || ''} onChange={(e) => setBusiness(m, e.target.value)} onBlur={() => setPickBiz(null)} aria-label={`החברה של ${m.email}`}><option value="">ללא חברה (לפי החשבונית)</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
                    ) : (
                      <button type="button" className={`fin-chipbtn${biz ? '' : ' is-empty'}`} onClick={() => can('operate') && setPickBiz(m.id)} disabled={!can('operate')} title="שיוך התיבה לחברה">{biz ? biz.name : can('operate') ? '+ שיוך לחברה' : 'ללא חברה'}</button>
                    )}
                  </span>
                  <span className="fin-acc__sub">{m.last_success_at ? `סנכרון אחרון ${dateTime(m.last_success_at)}` : 'עוד לא סונכרנה'}{n ? ` · ${n === 1 ? 'מסמך אחד' : `${n} מסמכים`}` : ''}{m.backfill_pending ? ' · סריקת קבלות ישנות בהמתנה' : ''}</span>
                  {m.last_error && <span className="fin-acc__err">{m.last_error}</span>}
                </div>
                <Pill tone={tone}>{busy === m.id ? 'מסנכרן…' : label}</Pill>
                <MoreMenu label={`פעולות עבור ${m.email}`} items={[
                  { label: 'סנכרון עכשיו', onClick: () => sync(m.id), disabled: !!busy || m.status === 'paused' },
                  m.status === 'error' && { label: 'חיבור מחדש', onClick: () => connect(m.provider) },
                  { label: 'הגדרות', onClick: () => setSettings({ ...m }) },
                  { label: 'ניתוק', onClick: () => disconnect(m), danger: true },
                ]} />
              </li>
            )
          })}
        </ul>
      )}

      <div className="fin-section-head"><h3>הוספת תיבת דואר</h3></div>
      {!live.length && <Empty title="עוד לא חוברה תיבה" icon="mail">חברו את התיבה שאליה מגיעות החשבוניות, למשל של הנהלת החשבונות.</Empty>}
      <div className="fin-connect-cards">
        {[['gmail', 'Gmail', 'חשבונות Gmail ו-Google Workspace', 'חיבור Gmail', true], ['outlook', 'Office 365', 'חשבונות Outlook ו-Microsoft 365, כולל Exchange', 'חיבור Office 365', false]].map(([id, title, desc, cta, primary]) => (
          <article key={id} className="fin-connect-card">
            <ProviderLogo name={id} size={30} />
            <h4>{title}</h4>
            <p>{desc}. קריאה בלבד.</p>
            {status.data && !prov[id] ? (
              <div className="fin-connect-card__soon"><Pill tone="muted">בקרוב</Pill>{can('manage') && <small className="fin-muted">{id === 'gmail' ? 'GOOGLE_CLIENT_ID לא מוגדר בשרת' : 'MS_CLIENT_ID לא מוגדר בשרת'}</small>}</div>
            ) : (
              <button type="button" className={`fin-btn ${primary && !live.length ? 'fin-btn--primary' : ''}`} onClick={() => connect(id)} disabled={!!busy}>{busy === id ? 'מעביר…' : cta}</button>
            )}
          </article>
        ))}
      </div>
      {can('manage') && status.data?.oauth_redirect && (
        <details className="fin-disclosure">
          <summary>הגדרה ב-Google וב-Microsoft: כתובת החזרה</summary>
          <p className="fin-muted fin-small">אם Google מציג "redirect_uri_mismatch", הכתובת הזו לא רשומה באפליקציה. ב-Google Cloud Console › APIs &amp; Services › Credentials › ה-OAuth client › Authorized redirect URIs מוסיפים אותה בדיוק כך (וב-Azure › App registrations › Authentication › Redirect URIs):</p>
          <span className="fin-copyline"><code dir="ltr">{status.data.oauth_redirect}</code><button type="button" className="fin-btn fin-btn--sm" onClick={() => navigator.clipboard?.writeText(status.data.oauth_redirect)}>העתקה</button></span>
        </details>
      )}

      {(runs.data || []).length > 0 && (
        <details className="fin-disclosure">
          <summary>יומן סנכרון</summary>
          <div className="fin-table-wrap fin-table-wrap--flat">
            <table className="fin-table fin-table--plain">
              <thead><tr><th>מתי</th><th>תיבה</th><th>הפעלה</th><th className="fin-num">נבדקו</th><th className="fin-num">נאספו</th><th>תוצאה</th></tr></thead>
              <tbody>{runs.data.map((r) => <tr key={r.id}><td>{dateTime(r.started_at)}</td><td dir="ltr">{mailboxes.find((x) => x.id === r.mailbox_id)?.email || ''}</td><td>{({ cron: 'יומי', backfill: 'קבלות ישנות' })[r.trigger] || 'ידני'}</td><td className="fin-num">{r.scanned}</td><td className="fin-num">{r.imported}</td><td>{r.error ? <span className="fin-cell-err">ניסיון {r.attempt}: {r.error}</span> : r.finished_at ? 'תקין' : 'רץ…'}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      )}

      {settings && (
        <Modal title={`הגדרות ${settings.email}`} onClose={() => setSettings(null)} footer={<><button type="submit" form="fin-box" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setSettings(null)}>ביטול</button></>}>
          <form id="fin-box" className="fin-form__grid" onSubmit={saveSettings}>
            <Field label="מצב"><Select value={settings.status} onChange={(e) => setSettings({ ...settings, status: e.target.value })}><option value="active">פעיל</option><option value="paused">מושהה</option></Select></Field>
            <Field label="חיפוש נוסף (תחביר Gmail)" hint="למשל: -from:newsletter@ או label:הנהלת-חשבונות"><input value={settings.query || ''} onChange={(e) => setSettings({ ...settings, query: e.target.value })} dir="ltr" /></Field>
          </form>
          <p className="fin-muted fin-small">נסרקת מ-{date(settings.sync_from)}. לסריקה של תקופה מוקדמת יותר: "קבלות ישנות".</p>
        </Modal>
      )}
    </div>
  )
}
