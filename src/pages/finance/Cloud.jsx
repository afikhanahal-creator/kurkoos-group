import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago, nameOf } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Field, Icon, InfoTip, Modal, MoreMenu, Pill, Toggle, useAsync, askConfirm } from './ui.jsx'
import Select from './Select.jsx'

const P = {
  gdrive: { title: 'Google Drive', desc: 'מסמכים מאושרים מועתקים לתיקייה ב-Google Drive, מסודרים לפי שנה וחודש לפי התאריך שעל המסמך.' },
  dropbox: { title: 'Dropbox', desc: 'מסמכים מאושרים מועתקים לתיקייה ב-Dropbox, מסודרים לפי שנה וחודש לפי התאריך שעל המסמך.' },
}
// {year}/{month} = "2026/11 נובמבר", by the date printed on the document
const STRUCT = { '{year}/{month}': 'שנה ‹ חודש (מומלץ)', '{company}/{year}/{month}': 'חברה ‹ שנה ‹ חודש', '{year}/{month}/{company}': 'שנה ‹ חודש ‹ חברה', '{company}/{project}/{year}/{month}': 'חברה ‹ פרויקט ‹ שנה ‹ חודש', '{company}/{period}': 'חברה ‹ חודש (הסידור הקודם)', '{period}': 'חודש בלבד' }
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const example = (t, company) => { const n = new Date(); const mm = String(n.getMonth() + 1).padStart(2, '0'); return [t.folder || 'Kurkoos Finance', ...String(t.structure || '{year}/{month}').replace('{year}', n.getFullYear()).replace('{month}', `${mm} ${MONTHS[n.getMonth()]}`).replace('{period}', `${n.getFullYear()}-${mm}`).replace('{company}', company || 'חברה').replace('{project}', 'פרויקט').split('/')].join(' / ') }

export default function Cloud() {
  const { businesses, can } = useFinance()
  const [params, setParams] = useSearchParams()
  const list = useAsync(() => api.loadCloudTargets(), [])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [cardMsg, setCardMsg] = useState({})
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
    setBusy(t.id); setErr(''); setMsg(''); setCardMsg({})
    try {
      const { results } = await api.callServer('cloud-sync', { target_id: t.id }); const r = results[0]
      const c = Number(r?.copied) || 0
      if (r?.error) setErr(r.error)
      else if (r?.busy) setCardMsg({ [t.id]: 'סנכרון אחר כבר רץ עכשיו. נסו שוב בעוד דקה.' })
      else setCardMsg({ [t.id]: c ? `${c === 1 ? 'מסמך אחד הועתק' : `${c} מסמכים הועתקו`} עכשיו.` : 'הכול כבר בתיקייה. אין מסמכים חדשים להעתקה.' })
      list.reload()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  // a real test: connects, creates the folder, uploads a small file and reads it back
  const test = async (t) => {
    setBusy(`test-${t.id}`); setErr(''); setCardMsg({})
    try {
      const r = await api.testCloud(t.id)
      setCardMsg({ [t.id]: r.ok ? 'הבדיקה עברה: התחברנו, יצרנו תיקייה, העלינו קובץ בדיקה ומצאנו אותו בתיקייה.' : `הבדיקה נכשלה${r.steps?.length ? ` אחרי: ${r.steps.join(', ')}` : ''}. ${r.error || ''}` })
      list.reload()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const disconnect = async (t) => {
    if (!(await askConfirm({ text: `לנתק את ${P[t.provider].title} (${t.account_email})? הקבצים שכבר הועתקו נשארים בתיקייה.`, ok: 'ניתוק', danger: true }))) return
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
        <InfoTip label="על סנכרון לענן">עותק של כל מסמך מאושר נשמר גם בתיקייה בענן שלכם, לגיבוי ולשיתוף עם רו״ח. המקור נשאר במערכת. Google Drive מקבל הרשאה רק לקבצים שהמערכת יוצרת, לא לשאר הדרייב. שם כל קובץ: תאריך_ספק_סוג_מספר, וקובץ שכבר קיים בתיקייה לא מועתק שוב.</InfoTip>
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
              <div><h3>{p.title}</h3><span className="fin-muted">{mine.length ? <bdi dir="ltr">{mine.map((t) => t.account_email).join(', ')}</bdi> : 'לא מחובר'}</span></div>
              {mine.map((t) => <Pill key={t.id} tone={!t.enabled ? 'muted' : t.status === 'error' ? 'attn' : 'ok'}>{!t.enabled ? 'כבוי' : t.status === 'error' ? 'תקלה' : 'מחובר'}</Pill>)}
            </header>
            {!mine.length && <p>{p.desc}</p>}
            {mine.map((t) => (
              <div key={t.id} className="fin-cloud-target">
                <dl>
                  <div><dt>תיקייה</dt><dd><bdi>{example(t, nameOf(businesses, t.business_id))}</bdi></dd></div>
                  <div><dt>מה מועתק</dt><dd>{t.statuses.includes('review') ? 'כל המסמכים שנקראו' : 'מאושרים ומיוצאים'}{t.business_id ? `, רק ${nameOf(businesses, t.business_id)}` : ''}</dd></div>
                  <div><dt>הועתקו</dt><dd>{t.files_synced} קבצים</dd></div>
                  <div><dt>סנכרון אחרון</dt><dd>{t.last_sync_at ? ago(t.last_sync_at) : 'עוד לא'}</dd></div>
                  <div><dt>בדיקת חיבור</dt><dd>{!t.last_test_at ? 'עוד לא נבדק' : t.last_test_ok ? <span className="fin-ok-text">עברה {ago(t.last_test_at)}{t.last_test_link && <> · <a href={t.last_test_link} target="_blank" rel="noopener noreferrer">קובץ הבדיקה</a></>}</span> : <span className="fin-attn-text">נכשלה {ago(t.last_test_at)}</span>}</dd></div>
                </dl>
                {t.last_test_ok === false && t.last_test_error && <p className="fin-acc__err">{t.last_test_error}</p>}
                {t.last_error && <p className="fin-acc__err">{t.last_error}</p>}
                <div className="fin-form__actions">
                  <button type="button" className="fin-btn fin-btn--sm" onClick={() => sync(t)} disabled={!!busy || !t.enabled}><Icon name="sync" size={15} /> {busy === t.id ? 'מעתיק…' : 'סנכרון עכשיו'}</button>
                  <button type="button" className="fin-btn fin-btn--sm" onClick={() => test(t)} disabled={!!busy}><Icon name="shield" size={15} /> {busy === `test-${t.id}` ? 'בודק…' : 'בדיקת חיבור'}</button>
                  {admin && t.status === 'error' && <button type="button" className="fin-btn fin-btn--sm" onClick={() => connect(id)}>חיבור מחדש</button>}
                  {cardMsg[t.id] && <span className="fin-muted fin-small" role="status">{cardMsg[t.id]}</span>}
                  {admin && <MoreMenu label={`פעולות עבור ${p.title}`} items={[
                    { label: 'הגדרות', onClick: () => setEdit({ ...t, onlyApproved: !t.statuses.includes('review') }) },
                    { label: 'ניתוק', onClick: () => disconnect(t), danger: true },
                  ]} />}
                </div>
              </div>
            ))}
            {admin && !mine.length && (status.data && !configured ? (
              <div className="fin-connect-card__soon"><Pill tone="muted">בקרוב</Pill><small className="fin-muted">{id === 'gdrive' ? 'GOOGLE_CLIENT_ID לא מוגדר בשרת' : 'DROPBOX_APP_KEY לא מוגדר בשרת'}</small></div>
            ) : <button type="button" className="fin-btn fin-btn--primary fin-btn--block-sm fin-btn--start" onClick={() => connect(id)} disabled={!!busy}>{busy === id ? 'מעביר…' : `חיבור ${p.title}`}</button>)}
            {!admin && !mine.length && <small className="fin-muted">רק מנהל מערכת מחבר חשבונות ענן.</small>}
          </article>
        )
      })}

      {edit && (
        <Modal title={`הגדרות ${P[edit.provider].title}`} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-cloud" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-cloud" className="fin-form__grid" onSubmit={save}>
            <Field label="שם תיקיית הבסיס" wide><input value={edit.folder} onChange={(e) => setEdit({ ...edit, folder: e.target.value })} /></Field>
            <Field label="סידור התיקיות" hint={`לדוגמה: ${example(edit, nameOf(businesses, edit.business_id))}`}><Select value={edit.structure} onChange={(e) => setEdit({ ...edit, structure: e.target.value })}>{Object.entries(STRUCT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="חברה"><Select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <label className="fin-field fin-field--check fin-field--wide"><input type="checkbox" checked={edit.onlyApproved} onChange={(e) => setEdit({ ...edit, onlyApproved: e.target.checked })} /> רק מסמכים מאושרים (מומלץ)</label>
            <div className="fin-field fin-field--wide fin-field--row"><span className="fin-field__label">סנכרון פעיל</span><Toggle checked={edit.enabled} onChange={(v) => setEdit({ ...edit, enabled: v })} label="סנכרון פעיל" /></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
