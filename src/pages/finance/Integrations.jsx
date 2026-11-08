import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, claimableVat, date, docDate, money, monthLabel, nameOf, period, shiftMonth, signedTotal, thisMonth } from './format.js'
import { buildPackage } from './exportPackage.js'
import { Card, Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync } from './ui.jsx'
import { Monogram } from './logos.jsx'
import Select from './Select.jsx'

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
              <Select className="fin-select" value={biz} onChange={(e) => { setBiz(e.target.value); setPicked(null) }} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
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
            <Select className="fin-select" value={format} onChange={(e) => setFormat(e.target.value)} aria-label="פורמט">{Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <Select className="fin-select" value={dest} onChange={(e) => setDest(e.target.value)} aria-label="יעד"><option value="download">הורדה למחשב</option><option value="email" disabled={!accountant}>מייל לרו״ח{accountant ? ` (${accountant})` : ' (אין מייל לחברה)'}</option><option value="api" disabled>חיבור API לתוכנה (לא הופעל)</option></Select>
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

const SOFTWARE = {
  morning: { mono: 'M', tone: 'green', desc: 'העברת חשבוניות ספקים מאושרות ל-Morning (חשבונית ירוקה).' },
  icount: { mono: 'iC', tone: 'ocean', desc: 'העברת מסמכי הוצאות מאושרים ל-iCount.' },
  rivhit: { mono: 'ר', tone: 'red', desc: 'העברת הוצאות מאושרות לרווחית.' },
  sumit: { mono: 'S', tone: 'ink', desc: 'העברת מסמכים מאושרים ל-SUMIT.' },
  paperless: { mono: 'P', tone: 'ocean', desc: 'העברת מסמכים מאושרים ל-Paperless.' },
  priority: { mono: 'Pr', tone: 'ink', desc: 'קליטת חשבוניות ספק ב-Priority ERP.' },
  hashavshevet: { mono: 'ח', tone: 'green', desc: 'קובץ קליטה במבנה של חשבשבת, להורדה או לשליחה לרו״ח.' },
  file: { mono: 'ZIP', tone: 'muted', desc: 'הקבצים המקוריים עם Excel ו-CSV, שכל תוכנה קולטת.' },
}
const STATUS_TXT = { ready: ['ok', 'מחובר'], not_active: ['warn', 'ממתין להפעלה'], error: ['bad', 'שגיאה'] }

export default function Integrations() {
  const { businesses, can } = useFinance()
  const list = useAsync(() => api.loadIntegrations(), [])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [term, setTerm] = useState('')
  const adapters = status.data?.adapters || []
  const admin = can('manage')
  const live = (list.data || []).filter((i) => i.enabled)
  const match = (a) => !term.trim() || `${a.label} ${SOFTWARE[a.id]?.desc || ''}`.toLowerCase().includes(term.trim().toLowerCase())
  const apiApps = adapters.filter((a) => a.kind === 'api' && match(a))
  const fileApps = adapters.filter((a) => a.kind === 'file' && match(a))

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try { await api.callServer('integration-save', edit); setMsg(`${edit.name || adapters.find((a) => a.id === edit.provider)?.label} נשמר.`); setEdit(null); list.reload() } catch (e2) { setErr(e2.message) }
  }
  const test = async (it) => {
    setMsg(''); setErr('')
    try { const r = await api.callServer('integration-test', { id: it.id }); if (r.ok) setMsg(`${it.name}: החיבור תקין${r.note ? ` (${r.note})` : ''}`); else setErr(`${it.name}: ${r.error}`); list.reload() } catch (e) { setErr(e.message) }
  }
  const disconnect = async (it) => {
    if (!window.confirm(`לנתק את ${it.name}? מסמכים שכבר יוצאו לא משתנים.`)) return
    try { await api.callServer('integration-save', { ...it, enabled: false }); list.reload() } catch (e) { setErr(e.message) }
  }
  const open = (a, it) => { setErr(''); setEdit(it ? { ...it } : { provider: a.id, name: a.label, business_id: businesses.length === 1 ? businesses[0].id : '', config: {}, enabled: true }) }

  const card = (a) => {
    const sw = SOFTWARE[a.id] || { mono: a.label.slice(0, 2), tone: 'ink', desc: '' }
    const mine = live.filter((i) => i.provider === a.id)
    return (
      <article key={a.id} className="fin-app-card">
        <Monogram text={sw.mono} tone={sw.tone} />
        <div className="fin-app-card__head">
          <h4>{a.label}</h4>
          <span className="fin-muted">{mine.length ? mine.map((i) => (i.business_id ? nameOf(businesses, i.business_id) : 'כל החברות')).join(', ') : 'לא מחובר'}</span>
        </div>
        <p>{sw.desc}</p>
        {mine.map((i) => {
          const [tone, label] = STATUS_TXT[i.status] || ['muted', i.status]
          return (
            <div key={i.id} className="fin-app-card__row">
              <Pill tone={tone}>{label}</Pill>
              {i.last_error && i.status === 'error' && <small className="fin-cell-err">{i.last_error}</small>}
              <span className="fin-grow" />
              <button type="button" className="fin-btn fin-btn--sm" onClick={() => test(i)}>בדיקת חיבור</button>
              {admin && <MoreMenu label={`פעולות עבור ${i.name}`} items={[{ label: 'הגדרות', onClick: () => open(a, i) }, { label: 'ניתוק', onClick: () => disconnect(i), danger: true }]} />}
            </div>
          )
        })}
        {admin && (!mine.length || a.kind === 'file') && (
          <button type="button" className={`fin-btn ${mine.length ? 'fin-btn--ghost' : ''} fin-app-card__cta`} onClick={() => open(a)}>
            <Icon name={mine.length ? 'plus' : 'plug'} size={17} /> {mine.length ? 'חיבור לחברה נוספת' : `חיבור ${a.label}`}
          </button>
        )}
      </article>
    )
  }

  return (
    <div className="fin-stack">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">חיבור תוכנת הנהלת החשבונות</h2>
        <InfoTip label="על חיבור תוכנה">רק מסמכים מאושרים יוצאים, עם אישור לפני כל שליחה, ובלי כפילויות: מסמך שיוצא מסומן ולא יוצא שוב אלא אם מבקשים ייצוא חוזר. כל ייצוא נרשם בהיסטוריה.</InfoTip>
      </div>
      <p className="fin-muted fin-lead">בחרו את התוכנה שרו״ח עובד איתה. לכל חברה אפשר לחבר תוכנה אחת, וייצוא קבצים זמין תמיד.</p>
      <label className="fin-search fin-search--wide">
        <Icon name="search" size={18} />
        <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="חיפוש תוכנת הנהלת חשבונות" aria-label="חיפוש תוכנת הנהלת חשבונות" />
      </label>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && !edit && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {!adapters.length && !status.loading ? <Empty title="השרת לא זמין" icon="plug">רשימת התוכנות נטענת מהשרת.</Empty> : (
        <>
          {apiApps.length > 0 && <section className="fin-app-section"><h3>תוכנות הנהלת חשבונות ישראליות</h3><div className="fin-app-grid">{apiApps.map(card)}</div></section>}
          {fileApps.length > 0 && <section className="fin-app-section"><h3>ייצוא קבצים</h3><div className="fin-app-grid">{fileApps.map(card)}</div></section>}
          {!apiApps.length && !fileApps.length && <Empty title={`לא מצאנו את "${term}"`} icon="search">אם התוכנה של רו״ח לא ברשימה, ייצוא הקבצים (ZIP, Excel, CSV) נקלט בכל תוכנה.</Empty>}
          {apiApps.length > 0 && <p className="fin-muted fin-small">חיבור ישיר לתוכנה מופעל אחרי שרו״ח מאשר באיזו תוכנה הוא עובד ונותן מפתח API. עד אז המסמכים יוצאים בקבצים.</p>}
        </>
      )}

      <ExportWizard onDone={list.reload} />

      {edit && (() => {
        const a = adapters.find((x) => x.id === edit.provider)
        return (
          <Modal title={edit.id ? `הגדרות ${edit.name}` : `חיבור ${a?.label || ''}`} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-int" className="fin-btn fin-btn--primary">{edit.id ? 'שמירה' : 'חיבור'}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></>}>
            <form id="fin-int" className="fin-form__grid" onSubmit={save}>
              <Field label="חברה" hint="התוכנה תקבל רק את המסמכים של החברה הזו"><Select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
              <Field label="שם"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={a?.label} /></Field>
              {(a?.secrets || []).map((s) => <Field key={s} label={s.replace(/_/g, ' ')} hint="נשמר בשרת בלבד, ולא מוצג שוב" wide><input type="password" autoComplete="off" onChange={(e) => setEdit({ ...edit, secret: { ...(edit.secret || {}), [s]: e.target.value } })} dir="ltr" /></Field>)}
            </form>
            {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
            {a?.kind === 'api' && <p className="fin-callout">המפתחות נשמרים עכשיו, והשליחה הישירה תופעל אחרי בדיקה מול התוכנה. עד אז המסמכים יוצאים בקבצים, ושום דבר לא נשלח בלי אישור.</p>}
          </Modal>
        )
      })()}
    </div>
  )
}
