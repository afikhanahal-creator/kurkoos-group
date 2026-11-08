import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago, nameOf } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Field, Icon, InfoTip, Modal, Pill, Toggle, useAsync } from './ui.jsx'

const P = {
  gdrive: { title: 'Google Drive', desc: 'מסמכים מאושרים מועתקים לתיקייה ב-Google Drive, מסודרים לפי חברה וחודש.' },
  dropbox: { title: 'Dropbox', desc: 'מסמכים מאושרים מועתקים לתיקייה ב-Dropbox, מסודרים לפי חברה וחודש.' },
}
const STRUCT = { '{company}/{period}': 'חברה ‹ חודש', '{period}/{company}': 'חודש ‹ חברה', '{company}/{project}/{period}': 'חברה ‹ פרויקט ‹ חודש', '{period}': 'חודש בלבד' }

export default function Cloud() {
  const { businesses, can } = useFinance()
  const [params, setParams] = useSearchParams()
  const list = useAsync(() => api.loadCloudTargets(), [])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState(null)
  const admin = can('manage')

  useEffect(() => {
    const ok = params.get('connected'); const bad = params.get('error')
    if (ok) setMsg(`החשבון ${ok} חובר. מסמכים מאושרים יועתקו אליו בריצה היומית, או עכשיו ב"סנכרון".`)
    if (bad) setErr(`החיבור נכשל: ${bad}`)
    if (ok || bad) { setParams({}, { replace: true }); list.reload() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (provider) => {
    setBusy(provider); setErr('')
    try { const { url } = await api.callServer('cloud-auth-url', { provider }); window.location.assign(url) } catch (e) { setErr(e.message); setBusy('') }
  }
  const sync = async (t) => {
    setBusy(t.id); setErr(''); setMsg('')
    try { const { results } = await api.callServer('cloud-sync', { target_id: t.id }); const r = results[0]; if (r?.error) setErr(r.error); else setMsg(r?.copied ? `${r.copied === 1 ? 'מסמך אחד הועתק' : `${r.copied} מסמכים הועתקו`} ל-${P[t.provider].title}.` : `הכול כבר נמצא ב-${P[t.provider].title}. אין מסמכים חדשים להעתקה.`); list.reload() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const disconnect = async (t) => {
    if (!window.confirm(`לנתק את ${P[t.provider].title} (${t.account_email})? הקבצים שכבר הועתקו נשארים בתיקייה.`)) return
    try { await api.callServer('cloud-disconnect', { target_id: t.id }); list.reload() } catch (e) { setErr(e.message) }
  }
  const save = async (e) => {
    e.preventDefault()
    try { await api.saveRow('fin_cloud_targets', { id: edit.id, folder: edit.folder.trim() || 'Kurkoos Finance', structure: edit.structure, statuses: edit.onlyApproved ? ['approved', 'sent'] : ['review', 'approved', 'sent'], business_id: edit.business_id || null, enabled: edit.enabled }); setEdit(null); list.reload() } catch (e2) { setErr(e2.message) }
  }

  return (
    <div className="fin-stack fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">סנכרון לענן</h2>
        <InfoTip label="על סנכרון לענן">עותק של כל מסמך מאושר נשמר גם בתיקייה בענן שלכם, לגיבוי ולשיתוף עם רו״ח. המקור נשאר במערכת. Google Drive מקבל הרשאה רק לקבצים שהמערכת יוצרת, לא לשאר הדרייב.</InfoTip>
      </div>
      <p className="fin-muted fin-lead">חברו את Google Drive או Dropbox, והמערכת תעתיק את המסמכים המאושרים לתיקייה שבחרתם.</p>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {Object.entries(P).map(([id, p]) => {
        const mine = (list.data || []).filter((t) => t.provider === id && t.status !== 'revoked')
        const configured = status.data?.cloud?.[id]
        return (
          <article key={id} className="fin-cloud-card">
            <header>
              <ProviderLogo name={id} size={32} />
              <div><h3>{p.title}</h3><span className="fin-muted">{mine.length ? `מחובר · ${mine.map((t) => t.account_email).join(', ')}` : 'לא מחובר'}</span></div>
            </header>
            <p>{p.desc}</p>
            {mine.map((t) => (
              <div key={t.id} className="fin-cloud-target">
                <dl>
                  <div><dt>תיקייה</dt><dd><bdi>{t.folder}</bdi> ‹ {STRUCT[t.structure] || t.structure}</dd></div>
                  <div><dt>מה מועתק</dt><dd>{t.statuses.includes('review') ? 'כל המסמכים שנקראו' : 'מאושרים ומיוצאים'}{t.business_id ? `, רק ${nameOf(businesses, t.business_id)}` : ''}</dd></div>
                  <div><dt>הועתקו</dt><dd>{t.files_synced} קבצים</dd></div>
                  <div><dt>סנכרון אחרון</dt><dd>{t.last_sync_at ? ago(t.last_sync_at) : 'עוד לא'}</dd></div>
                </dl>
                {t.last_error && <p className="fin-acc__err">{t.last_error}</p>}
                <div className="fin-form__actions">
                  <Pill tone={!t.enabled ? 'muted' : t.status === 'error' ? 'attn' : 'ok'}>{!t.enabled ? 'כבוי' : t.status === 'error' ? 'תקלה' : 'פעיל'}</Pill>
                  <button type="button" className="fin-btn fin-btn--sm" onClick={() => sync(t)} disabled={!!busy || !t.enabled}><Icon name="sync" size={15} /> {busy === t.id ? 'מעתיק…' : 'סנכרון עכשיו'}</button>
                  {admin && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" onClick={() => setEdit({ ...t, onlyApproved: !t.statuses.includes('review') })}>הגדרות</button>}
                  {admin && t.status === 'error' && <button type="button" className="fin-btn fin-btn--sm" onClick={() => connect(id)}>חיבור מחדש</button>}
                  {admin && <button type="button" className="fin-link fin-link--danger" onClick={() => disconnect(t)}>ניתוק</button>}
                </div>
              </div>
            ))}
            {admin && !mine.length && <button type="button" className="fin-btn fin-btn--primary fin-btn--block" onClick={() => connect(id)} disabled={!!busy}>{busy === id ? 'מעביר…' : `חיבור ${p.title}`}</button>}
            {status.data && !configured && !mine.length && <small className="fin-muted">{id === 'gdrive' ? 'משתמש באותו חיבור Google של Gmail (GOOGLE_CLIENT_ID), עם הרשאת drive.file.' : 'דורש אפליקציית Dropbox (DROPBOX_APP_KEY, DROPBOX_APP_SECRET).'}</small>}
            {!admin && !mine.length && <small className="fin-muted">רק מנהל מערכת מחבר חשבונות ענן.</small>}
          </article>
        )
      })}

      {edit && (
        <Modal title={`הגדרות ${P[edit.provider].title}`} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-cloud" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-cloud" className="fin-form__grid" onSubmit={save}>
            <Field label="שם תיקיית הבסיס" wide><input value={edit.folder} onChange={(e) => setEdit({ ...edit, folder: e.target.value })} /></Field>
            <Field label="סידור התיקיות"><select value={edit.structure} onChange={(e) => setEdit({ ...edit, structure: e.target.value })}>{Object.entries(STRUCT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="חברה"><select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <label className="fin-field fin-field--check fin-field--wide"><input type="checkbox" checked={edit.onlyApproved} onChange={(e) => setEdit({ ...edit, onlyApproved: e.target.checked })} /> רק מסמכים מאושרים (מומלץ)</label>
            <div className="fin-field fin-field--wide fin-field--row"><span className="fin-field__label">סנכרון פעיל</span><Toggle checked={edit.enabled} onChange={(v) => setEdit({ ...edit, enabled: v })} label="סנכרון פעיל" /></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
