import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, claimableVat, date, docDate, money, monthLabel, nameOf, period, shiftMonth, signedTotal, thisMonth } from './format.js'
import { buildPackage } from './exportPackage.js'
import { Card, Empty, Field, Icon, Modal, PageHead, Pill, useAsync } from './ui.jsx'

const FORMATS = { zip: 'ZIP: קבצים מקוריים + Excel + CSV + metadata', excel: 'Excel', csv: 'CSV', pdf: 'PDF (דוח להדפסה)' }

function ExportWizard({ onDone }) {
  const { documents, businesses, projects, categories, reload, go } = useFinance()
  const [params] = useSearchParams()
  const preset = useMemo(() => { if (params.get('from') !== 'selection') return null; try { return JSON.parse(sessionStorage.getItem('fin-export-ids') || 'null') } catch { return null } }, [params])
  const [biz, setBiz] = useState(businesses.length === 1 ? businesses[0].id : '')
  const [per, setPer] = useState(shiftMonth(thisMonth(), -1))
  const [withExported, setWithExported] = useState(false)
  const [format, setFormat] = useState(() => businesses.find((b) => b.id === biz)?.export_settings?.format || 'zip')
  const [dest, setDest] = useState('download')
  const [picked, setPicked] = useState(() => (preset ? new Set(preset) : null))
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const candidates = useMemo(() => documents.filter((d) => (preset ? preset.includes(d.id) : (!biz || d.business_id === biz) && period(d) === per) && ['approved', 'sent'].includes(d.status) && (withExported || !d.exported_at)), [documents, preset, biz, per, withExported])
  const notApproved = useMemo(() => documents.filter((d) => (preset ? preset.includes(d.id) : (!biz || d.business_id === biz) && period(d) === per) && !['approved', 'sent', 'rejected', 'duplicate'].includes(d.status)).length, [documents, preset, biz, per])
  const chosen = candidates.filter((d) => !picked || picked.has(d.id))
  const again = chosen.filter((d) => d.exported_at).length
  const accountant = businesses.find((b) => b.id === biz)?.accountant_email
  const total = chosen.reduce((a, d) => a + signedTotal(d), 0)
  const vat = chosen.reduce((a, d) => a + claimableVat(d, categories), 0)

  const run = async () => {
    setBusy(true); setMsg('')
    try {
      await buildPackage(chosen, format, { businesses, projects, categories }, { period: preset ? null : per, company: nameOf(businesses, biz) })
      await api.recordExport({ ids: chosen.map((d) => d.id), businessId: biz || null, period: preset ? null : per, format, destination: dest === 'email' ? `email:${accountant}` : 'download', allowReexport: again > 0 })
      if (dest === 'email' && accountant) window.location.href = `mailto:${accountant}?subject=${encodeURIComponent(`חומר להנהלת חשבונות ${preset ? '' : monthLabel(per)} · ${nameOf(businesses, biz) || 'קבוצת קורקוס'}`)}&body=${encodeURIComponent(`שלום,\nמצורפת חבילת המסמכים: ${chosen.length} מסמכים, סה״כ ${money(total)}, מע״מ לקיזוז ${money(vat)}.\n(הקובץ הורד למחשב, יש לצרף אותו למייל)\n`)}`
      try { sessionStorage.removeItem('fin-export-ids') } catch { /* noop */ }
      setConfirm(false); await reload(); onDone?.()
      setMsg(`הייצוא הושלם ונרשם בהיסטוריה: ${chosen.length} מסמכים.`)
    } catch (e) {
      setMsg(/ALREADY_EXPORTED/.test(e.message) ? 'חלק מהמסמכים כבר יוצאו. סמנו "לכלול מסמכים שכבר יוצאו" כדי לייצא שוב.' : e.message)
    } finally { setBusy(false) }
  }

  return (
    <Card title="ייצוא לרואה החשבון" className="fin-wizard">
      <ol className="fin-steps">
        <li><span>1</span><div className="fin-steps__body"><strong>חברה ותקופה</strong>
          {preset ? <p className="fin-muted">{preset.length} מסמכים שנבחרו ברשימת המסמכים. <button type="button" className="fin-link" onClick={() => { try { sessionStorage.removeItem('fin-export-ids') } catch { /* noop */ } go('/integrations') }}>בחירה לפי תקופה במקום</button></p> : (
            <div className="fin-filters">
              <select className="fin-select" value={biz} onChange={(e) => { setBiz(e.target.value); setPicked(null) }} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <input type="month" className="fin-select" value={per} max={thisMonth()} onChange={(e) => { setPer(e.target.value); setPicked(null) }} aria-label="תקופה חשבונאית" />
            </div>
          )}
          <label className="fin-check"><input type="checkbox" checked={withExported} onChange={(e) => setWithExported(e.target.checked)} /> לכלול מסמכים שכבר יוצאו (ייצוא חוזר)</label>
        </div></li>
        <li><span>2</span><div className="fin-steps__body"><strong>מסמכים ({chosen.length} מתוך {candidates.length})</strong>
          {notApproved > 0 && <p className="fin-note fin-note--warn"><Icon name="alert" size={16} /> {notApproved} מסמכים מהתקופה עוד לא אושרו ולא ייכללו. רק מסמכים מאושרים יוצאים. <button type="button" className="fin-link" onClick={() => go('/pending')}>לאישור</button></p>}
          {!candidates.length ? <p className="fin-muted">אין מסמכים מאושרים שעוד לא יוצאו לבחירה הזו.</p> : (
            <div className="fin-pick">
              <label className="fin-check"><input type="checkbox" checked={!picked || picked.size === candidates.length} onChange={(e) => setPicked(e.target.checked ? null : new Set())} /> הכול</label>
              <ul>{candidates.map((d) => (
                <li key={d.id}><label className="fin-check"><input type="checkbox" checked={!picked || picked.has(d.id)} onChange={(e) => { const n = new Set(picked || candidates.map((x) => x.id)); if (e.target.checked) n.add(d.id); else n.delete(d.id); setPicked(n) }} />
                  <span>{d.supplier_name} · {DOC_TYPE[d.doc_type]} {d.doc_number} · {date(docDate(d))}</span><strong>{money(d.total_amount, d.currency)}</strong>{d.exported_at && <Pill tone="done">יוצא {date(d.exported_at)}</Pill>}</label></li>
              ))}</ul>
            </div>
          )}
        </div></li>
        <li><span>3</span><div className="fin-steps__body"><strong>פורמט ויעד</strong>
          <div className="fin-filters">
            <select className="fin-select" value={format} onChange={(e) => setFormat(e.target.value)} aria-label="פורמט">{Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className="fin-select" value={dest} onChange={(e) => setDest(e.target.value)} aria-label="יעד"><option value="download">הורדה למחשב</option><option value="email" disabled={!accountant}>מייל לרו״ח{accountant ? ` (${accountant})` : ' (אין מייל לחברה)'}</option><option value="api" disabled>חיבור API לתוכנה (לא הופעל)</option></select>
          </div>
        </div></li>
      </ol>
      <div className="fin-wizard__foot">
        <p><strong>{chosen.length}</strong> מסמכים · סה״כ <strong>{money(total)}</strong> · מע״מ לקיזוז <strong>{money(vat)}</strong></p>
        <button type="button" className="fin-btn fin-btn--primary" disabled={!chosen.length || busy} onClick={() => setConfirm(true)}><Icon name="export" size={18} /> המשך לאישור הייצוא</button>
      </div>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {confirm && (
        <Modal title="אישור ייצוא" onClose={() => setConfirm(false)} footer={<><button type="button" className="fin-btn fin-btn--primary" onClick={run} disabled={busy}>{busy ? 'מייצא…' : 'אני מאשר/ת את הייצוא'}</button><button type="button" className="fin-btn" onClick={() => setConfirm(false)}>ביטול</button></>}>
          <ul className="fin-kv">
            <li><span>חברה</span><strong>{nameOf(businesses, biz) || 'כל החברות'}</strong></li>
            <li><span>תקופה</span><strong>{preset ? 'בחירה ידנית' : monthLabel(per)}</strong></li>
            <li><span>מסמכים</span><strong>{chosen.length}</strong></li>
            <li><span>סה״כ</span><strong>{money(total)}</strong></li>
            <li><span>פורמט</span><strong>{FORMATS[format]}</strong></li>
            <li><span>יעד</span><strong>{dest === 'email' ? accountant : 'הורדה'}</strong></li>
          </ul>
          {again > 0 && <p className="fin-note fin-note--warn">{again} מהמסמכים כבר יוצאו בעבר. זה ייצוא חוזר, והוא יירשם ככזה.</p>}
          <p className="fin-muted">אחרי הייצוא המסמכים מסומנים "יוצא לרו״ח", והייצוא נרשם בהיסטוריה עם התאריך, היעד והמשתמש. שינוי סכום במסמך שיוצא יחזיר אותו לאישור.</p>
        </Modal>
      )}
    </Card>
  )
}

export default function Integrations() {
  const { businesses, can } = useFinance()
  const list = useAsync(() => api.loadIntegrations(), [])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const adapters = status.data?.adapters || []
  const save = async (e) => {
    e.preventDefault()
    try { await api.callServer('integration-save', edit); setEdit(null); list.reload() } catch (e2) { setMsg(e2.message) }
  }
  const test = async (it) => {
    setMsg('')
    try { const r = await api.callServer('integration-test', { id: it.id }); setMsg(r.ok ? `${it.name}: החיבור תקין${r.note ? ` (${r.note})` : ''}` : `${it.name}: ${r.error}`); list.reload() } catch (e) { setMsg(e.message) }
  }
  return (
    <div className="fin-stack">
      <PageHead title="אינטגרציות הנהלת חשבונות" sub="ייצוא מסמכים מאושרים בלבד, עם אישור לפני כל שליחה, בלי כפילויות, וכל ייצוא נרשם." />
      <ExportWizard onDone={list.reload} />
      <Card title="יעדים ותוכנות" actions={can('manage') && <button type="button" className="fin-btn" onClick={() => setEdit({ provider: 'file', name: '', business_id: '', config: {}, enabled: true })}><Icon name="plus" size={18} /> הגדרת יעד</button>}>
        <p className="fin-muted">תוכנת הנהלת החשבונות של רו״ח עוד לא נקבעה. ייצוא קבצים עובד תמיד; חיבור API (iCount, Morning ועוד) יופעל אחרי שרו״ח יאשר באיזו תוכנה הוא עובד ויינתן מפתח API.</p>
        {msg && <p className="fin-note" role="status">{msg}</p>}
        <ul className="fin-adapters">
          {adapters.map((a) => {
            const mine = (list.data || []).filter((i) => i.provider === a.id)
            return (
              <li key={a.id}>
                <div><strong>{a.label}</strong><small className="fin-muted">{a.kind === 'file' ? 'ייצוא קובץ' : 'חיבור API'}</small></div>
                {mine.length ? mine.map((i) => (
                  <span key={i.id} className="fin-adapters__item">{i.name}{i.business_id ? ` · ${nameOf(businesses, i.business_id)}` : ''} <Pill tone={i.status === 'ready' ? 'ok' : i.status === 'error' ? 'bad' : 'muted'}>{i.status === 'ready' ? 'מוכן' : i.status === 'not_active' ? 'לא הופעל' : i.status === 'error' ? 'שגיאה' : i.status}</Pill>{i.last_error && <small className="fin-cell-err"> {i.last_error}</small>} <button type="button" className="fin-link" onClick={() => test(i)}>בדיקה</button></span>
                )) : <Pill tone={a.kind === 'file' ? 'ok' : 'muted'}>{a.kind === 'file' ? 'זמין' : 'לא מוגדר'}</Pill>}
              </li>
            )
          })}
        </ul>
        {!adapters.length && <Empty title="השרת לא זמין" icon="plug">רשימת היעדים נטענת מהשרת.</Empty>}
      </Card>
      {edit && (
        <Modal title="הגדרת יעד ייצוא" onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-int" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-int" className="fin-form__grid" onSubmit={save}>
            <Field label="תוכנה / יעד"><select value={edit.provider} onChange={(e) => setEdit({ ...edit, provider: e.target.value })}>{adapters.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></Field>
            <Field label="חברה"><select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="שם" wide><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={adapters.find((a) => a.id === edit.provider)?.label} /></Field>
            {(adapters.find((a) => a.id === edit.provider)?.secrets || []).map((s) => <Field key={s} label={`${s} (נשמר מוצפן בשרת)`} wide><input type="password" autoComplete="off" onChange={(e) => setEdit({ ...edit, secret: { ...(edit.secret || {}), [s]: e.target.value } })} dir="ltr" /></Field>)}
          </form>
        </Modal>
      )}
    </div>
  )
}
