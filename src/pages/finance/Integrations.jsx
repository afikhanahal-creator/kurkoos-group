import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, claimableVat, date, dateTime, docDate, money, monthLabel, nameOf, period, recentMonths, shiftMonth, signedTotal, thisMonth } from './format.js'
import { buildPackage } from './exportPackage.js'
import { Card, Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync, askConfirm } from './ui.jsx'
import { VendorLogo } from './logos.jsx'
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
              <Select className="fin-select" value={per} onChange={(e) => { setPer(e.target.value); setPicked(null) }} aria-label="תקופה חשבונאית">{recentMonths().map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}</Select>
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
          <p className="fin-muted">אחרי הייצוא המסמכים מסומנים "נשלח לרו״ח", והייצוא נרשם בהיסטוריה עם התאריך, היעד והמשתמש. שינוי סכום במסמך שיוצא יחזיר אותו לאישור.</p>
        </Modal>
      )}
    </Card>
  )
}

/* The directory of accounting software. What each card says comes from the server's registry (server/finance/providers.js),
   which holds only what the vendor's own documentation says, and from what is really connected: a provider is "connected"
   only after a real sign-in or a real delivery, never because it is listed. */
const MONO = { morning: ['M', 'green'], icount: ['iC', 'ocean'], sumit: ['S', 'ink'], priority: ['Pr', 'ink'], sap_b1: ['SAP', 'ocean'], rivhit: ['ר', 'red'], ezcount: ['EZ', 'ocean'], invoice4u: ['i4U', 'ink'], accountit: ['Ac', 'ocean'], costapp: ['CA', 'green'], dokka: ['Dk', 'ink'], accountant_email: ['@', 'ocean'], smartbee: ['SB', 'red'], finbot: ['Fb', 'ocean'], paperless: ['P', 'muted'], hashavshevet: ['ח', 'green'], file: ['ZIP', 'muted'] }
const CAP = { verified: ['ok', 'מאומת'], built: ['info', 'בנוי, עוד לא נבדק מול חשבון אמיתי'], documented: ['muted', 'מתועד אצל הספק, לא בנוי כאן'], none: ['muted', 'לא קיים ב-API הציבורי'], unknown: ['warn', 'לא נמצא מקור רשמי'] }
const CAP_ROWS = [['auth', 'התחברות'], ['send', 'שליחת מסמכים'], ['attach', 'צירוף הקובץ'], ['read', 'קריאה חזרה וסטטוסים'], ['webhooks', 'התראות (Webhooks)'], ['sandbox', 'סביבת ניסיון']]
const GROUPS = [['software', 'תוכנות הנהלת חשבונות'], ['intake', 'קליטת מסמכים אצל רו״ח'], ['file', 'ייצוא קבצים']]
const TAG = /^\[([a-z0-9_]+)\]\s*/
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim())

export default function Integrations() {
  const { businesses, can } = useFinance()
  const list = useAsync(() => api.loadIntegrations(), [])
  const routes = useAsync(() => api.loadOutbound(), [])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [open, setOpen] = useState(null)        // provider id whose details are open
  const [form, setForm] = useState(null)        // a connection being added
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [term, setTerm] = useState('')
  const providers = status.data?.accounting || []
  const admin = can('manage')
  const apiRows = (list.data || []).filter((i) => i.enabled)
  // an email connection is an automatic delivery whose name carries the provider's tag
  const mailRows = (routes.data || []).filter((o) => o.kind === 'email' && TAG.test(o.name || '')).map((o) => ({ ...o, provider: TAG.exec(o.name)[1], label: o.name.replace(TAG, '') }))
  const bizName = (id) => (id ? nameOf(businesses, id) : 'כל החברות')
  const reload = () => { list.reload(); routes.reload() }

  const stateOf = (p) => {
    const mails = mailRows.filter((o) => o.provider === p.id); const apis = apiRows.filter((i) => i.provider === p.id)
    const last = [...mails.map((o) => o.last_at), ...apis.map((i) => i.last_sync_at)].filter(Boolean).sort().pop() || null
    const conns = mails.length + apis.length
    let pill
    if (p.route === 'file') pill = ['ok', 'זמין']
    else if (mails.some((o) => o.enabled && o.last_status && o.last_status !== 'ok') || apis.some((i) => i.status === 'error')) pill = ['bad', mails.length ? 'שגיאת סנכרון' : 'שגיאת חיבור']
    else if (mails.some((o) => o.enabled && o.sent_count > 0)) pill = ['ok', 'סונכרן']
    else if (mails.some((o) => o.enabled) || apis.some((i) => i.status === 'ready')) pill = ['ok', 'מחובר']
    else if (mails.length) pill = ['muted', 'מושהה']
    else if (apis.length && p.cap.auth === 'built') pill = ['warn', 'נדרשת הגדרת API']
    else if (p.route === 'email') pill = ['info', 'נדרש חיבור']
    else if (p.api && p.cap.send === 'documented') pill = ['muted', 'בקרוב']
    else pill = ['muted', 'אין חיבור ישיר']
    return { mails, apis, conns, last, pill, sent: mails.reduce((a, o) => a + (o.sent_count || 0), 0), failed: mails.reduce((a, o) => a + (o.fail_count || 0), 0) }
  }
  const match = (p) => !term.trim() || `${p.label} ${p.about || ''}`.toLowerCase().includes(term.trim().toLowerCase())
  const shown = providers.filter(match)
  const all = providers.map((p) => stateOf(p))
  const sum = { connected: all.filter((x) => x.conns && ['מחובר', 'סונכרן'].includes(x.pill[1])).length, sent: all.reduce((a, x) => a + x.sent, 0), failed: all.reduce((a, x) => a + x.failed, 0), errors: all.filter((x) => x.pill[0] === 'bad').length }

  const run = async (key, fn) => { setBusy(key); setErr(''); setMsg(''); try { const m = await fn(); if (m) setMsg(m); reload() } catch (e) { setErr(e.message) } finally { setBusy('') } }
  const startForm = (p) => { setErr(''); setForm({ provider: p.id, mode: p.route === 'email' ? 'email' : 'api', business_id: businesses.length === 1 ? businesses[0].id : '', target: '', sandbox: false, secret: {} }) }
  const saveForm = (e) => {
    e.preventDefault()
    const p = providers.find((x) => x.id === form.provider)
    if (form.mode === 'email') {
      if (!form.business_id) { setErr('בוחרים חברה: כל כתובת קליטה שייכת לחברה אחת, כדי שמסמך לא יגיע לחברה הלא נכונה.'); return }
      if (!emailOk(form.target)) { setErr('כתובת המייל לא תקינה.'); return }
      if (mailRows.some((o) => o.provider === p.id && o.business_id === form.business_id)) { setErr(`ל${bizName(form.business_id)} כבר מחוברת כתובת ב-${p.label}. מוחקים אותה קודם.`); return }
      run('save', async () => {
        await api.callServer('outbound-save', { kind: 'email', target: form.target.trim(), name: `[${p.id}] ${p.label}`, events: ['document.approved'], business_id: form.business_id, enabled: true })
        setForm(null)
        return `${p.label} חובר ל${bizName(form.business_id)}. כל מסמך שיאושר מעכשיו יישלח לכתובת עם הקובץ. מסמכים שכבר אושרו לא נשלחים למפרע.`
      })
    } else {
      run('save', async () => {
        const { integration } = await api.callServer('integration-save', { provider: p.id, name: p.label, business_id: form.business_id || '', config: { sandbox: !!form.sandbox }, secret: form.secret, enabled: true })
        const r = await api.callServer('integration-test', { id: integration.id })
        if (!r.ok) throw new Error(`המפתחות נשמרו, אבל ההתחברות נכשלה: ${r.error}`)
        setForm(null)
        return `${p.label}: ${r.note || 'ההתחברות אושרה'}.`
      })
    }
  }
  const testMail = async (o) => {
    if (!(await askConfirm({ title: 'שליחת מייל בדיקה', text: `מייל בדיקה קצר, בלי מסמך, יישלח עכשיו ל-${o.target}. בתוכנה שקולטת כל מייל כמסמך הוא עלול להופיע כפריט ריק.`, ok: 'שליחה' }))) return
    run(`t${o.id}`, async () => { const r = await api.callServer('outbound-test', { id: o.id }); if (!r.ok) throw new Error(`מייל הבדיקה לא נשלח: ${r.error}`); return 'מייל הבדיקה נשלח. זה מאשר שהמייל יצא מכאן; שהוא נקלט בתוכנה רואים רק בתוכנה עצמה.' })
  }
  const pauseMail = (o) => run(`p${o.id}`, async () => { await api.callServer('outbound-save', { id: o.id, kind: 'email', target: o.target, name: o.name, events: o.events, business_id: o.business_id, enabled: !o.enabled }); return o.enabled ? 'השליחה הושהתה.' : 'השליחה חודשה.' })
  const removeMail = async (o) => {
    if (!(await askConfirm({ title: 'ניתוק', text: `לנתק את ${o.label} מ${bizName(o.business_id)}? מסמכים שכבר נשלחו לא משתנים.`, ok: 'ניתוק', danger: true }))) return
    run(`d${o.id}`, async () => { await api.callServer('outbound-delete', { id: o.id }); return 'החיבור נותק.' })
  }
  const testApi = (i) => run(`a${i.id}`, async () => { const r = await api.callServer('integration-test', { id: i.id }); if (!r.ok) throw new Error(`${i.name}: ${r.error}`); return `${i.name}: ${r.note || 'ההתחברות אושרה'}.` })
  const removeApi = async (i) => {
    if (!(await askConfirm({ title: 'ניתוק', text: `לנתק את ${i.name}?`, ok: 'ניתוק', danger: true }))) return
    run(`x${i.id}`, async () => { await api.callServer('integration-save', { ...i, enabled: false }); return 'החיבור נותק.' })
  }

  const card = (p) => {
    const st = stateOf(p); const [mono, tone] = MONO[p.id] || [p.label.slice(0, 2), 'ink']
    const canConnect = admin && (p.route === 'email' || (p.route !== 'file' && (p.needs || []).length > 0) || (p.id === 'morning'))
    return (
      <article key={p.id} className={`fin-app-card fin-prov ${st.conns ? 'is-on' : ''}`}>
        <div className="fin-app-card__top">
          <VendorLogo id={p.id} mono={mono} tone={tone} />
          <div className="fin-app-card__head">
            <h4>{p.label}</h4>
            <Pill tone={st.pill[0]}>{st.pill[1]}</Pill>
          </div>
        </div>
        <p>{p.about}</p>
        <dl className="fin-prov__facts">
          <div><dt>כיוון</dt><dd>{p.route === 'file' ? 'קובץ להורדה' : p.route === 'none' ? '—' : 'מהמערכת לתוכנה'}</dd></div>
          <div><dt>חברות מחוברות</dt><dd>{st.conns || '—'}</dd></div>
          <div><dt>פעילות אחרונה</dt><dd>{st.last ? dateTime(st.last) : '—'}</dd></div>
          {(st.sent > 0 || st.failed > 0) && <div><dt>נשלחו / נכשלו</dt><dd>{st.sent} / <span className={st.failed ? 'fin-cell-err' : ''}>{st.failed}</span></dd></div>}
        </dl>
        <div className="fin-prov__acts">
          {canConnect && <button type="button" className={`fin-btn ${st.conns ? '' : 'fin-btn--primary'}`} onClick={() => startForm(p)}><Icon name={st.conns ? 'plus' : 'plug'} size={16} /> {st.conns ? 'חברה נוספת' : 'חיבור'}</button>}
          <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setOpen(p.id)}>{st.conns ? 'ניהול החיבור' : 'פרטים ויכולות'}</button>
        </div>
      </article>
    )
  }
  const openP = open ? providers.find((p) => p.id === open) : null
  const openS = openP ? stateOf(openP) : null
  const formP = form ? providers.find((p) => p.id === form.provider) : null

  return (
    <div className="fin-stack">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">חיבור תוכנת הנהלת החשבונות</h2>
        <InfoTip label="על החיבורים">רק מסמכים מאושרים יוצאים. תוכנה מסומנת "מחובר" רק אחרי התחברות אמיתית או שליחה אמיתית, ולכל תוכנה מוצג מה נבדק בפועל ומה רק מתועד אצל הספק.</InfoTip>
      </div>
      <p className="fin-muted fin-lead">לכל תוכנה מוצג מה אפשר לעשות איתה היום באמת: שליחה לכתובת הקליטה שלה, התחברות ב-API, או ייצוא קבצים.</p>
      <label className="fin-search fin-search--wide">
        <Icon name="search" size={18} />
        <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="חיפוש תוכנת הנהלת חשבונות" aria-label="חיפוש תוכנת הנהלת חשבונות" />
      </label>
      {providers.length > 0 && (
        <div className="fin-app-sum" role="status">
          <span><b>{providers.length}</b> תוכנות ברשימה</span>
          <span><b>{sum.connected}</b> מחוברות</span>
          <span><b>{sum.sent}</b> מסמכים נשלחו</span>
          {sum.failed > 0 && <span className="is-warn"><b>{sum.failed}</b> שליחות נכשלו</span>}
          {sum.errors > 0 && <span className="is-bad"><b>{sum.errors}</b> בשגיאה</span>}
        </div>
      )}
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && !form && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      {!providers.length && !status.loading ? <Empty title="השרת לא זמין" icon="plug">רשימת התוכנות נטענת מהשרת.</Empty> : (
        <>
          {GROUPS.map(([g, title]) => { const items = shown.filter((p) => p.group === g); return items.length ? <section key={g} className="fin-app-section"><h3>{title}</h3><div className="fin-app-grid">{items.map(card)}</div></section> : null })}
          {!shown.length && <Empty title={`לא מצאנו את "${term}"`} icon="search">אם התוכנה של רו״ח לא ברשימה, אפשר לחבר כל כתובת מייל לקליטת מסמכים, וייצוא הקבצים נקלט בכל תוכנה.</Empty>}
        </>
      )}

      <ExportWizard onDone={list.reload} />

      {openP && (
        <Modal wide title={openP.label} onClose={() => setOpen(null)} footer={<>
          {admin && (openP.route === 'email' || openP.id === 'morning') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => { setOpen(null); startForm(openP) }}><Icon name="plug" size={16} /> {openS.conns ? 'חיבור חברה נוספת' : 'חיבור'}</button>}
          {openP.docs && <a className="fin-btn" href={openP.docs} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> המקור אצל הספק</a>}
          <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setOpen(null)}>סגירה</button>
        </>}>
          <p className="fin-prov__about"><Pill tone={openS.pill[0]}>{openS.pill[1]}</Pill> {openP.about}</p>
          {openP.intake && <p className="fin-callout">{openP.intake}</p>}
          {openP.note && <p className="fin-muted">{openP.note}</p>}
          {(openS.mails.length > 0 || openS.apis.length > 0) && (
            <section className="fin-prov__conns" aria-label="חיבורים">
              <h4>חברות מחוברות</h4>
              <ul>
                {openS.mails.map((o) => (
                  <li key={o.id}>
                    <div><strong>{bizName(o.business_id)}</strong><bdi dir="ltr">{o.target}</bdi>
                      <small>{o.sent_count || 0} נשלחו · {o.fail_count || 0} נכשלו{o.last_at ? ` · אחרון ${dateTime(o.last_at)}` : ''}{o.last_status && o.last_status !== 'ok' ? ` · ${o.last_status}` : ''}</small></div>
                    <Pill tone={!o.enabled ? 'muted' : o.last_status && o.last_status !== 'ok' ? 'bad' : o.sent_count ? 'ok' : 'info'}>{!o.enabled ? 'מושהה' : o.last_status && o.last_status !== 'ok' ? 'שגיאה' : o.sent_count ? 'סונכרן' : 'מחובר, עוד לא נשלח מסמך'}</Pill>
                    {admin && <span className="fin-prov__rowacts">
                      <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => testMail(o)}>מייל בדיקה</button>
                      <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => pauseMail(o)}>{o.enabled ? 'השהיה' : 'חידוש'}</button>
                      <button type="button" className="fin-btn fin-btn--sm fin-btn--danger" disabled={!!busy} onClick={() => removeMail(o)}>ניתוק</button>
                    </span>}
                  </li>
                ))}
                {openS.apis.map((i) => (
                  <li key={i.id}>
                    <div><strong>{bizName(i.business_id)}</strong><span>חיבור API{i.config?.sandbox ? ' · סביבת ניסיון' : ''}</span>
                      <small>{i.last_sync_at ? `התחברות אחרונה ${dateTime(i.last_sync_at)}` : 'עוד לא נבדק'}{i.status === 'error' && i.last_error ? ` · ${i.last_error}` : ''}</small></div>
                    <Pill tone={i.status === 'ready' ? 'ok' : i.status === 'error' ? 'bad' : 'warn'}>{i.status === 'ready' ? 'ההתחברות אושרה' : i.status === 'error' ? 'שגיאת חיבור' : 'נדרשת הגדרת API'}</Pill>
                    <span className="fin-prov__rowacts">
                      <button type="button" className="fin-btn fin-btn--sm" disabled={!!busy} onClick={() => testApi(i)}>בדיקת התחברות</button>
                      {admin && <button type="button" className="fin-btn fin-btn--sm fin-btn--danger" disabled={!!busy} onClick={() => removeApi(i)}>ניתוק</button>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-label="יכולות">
            <h4>מה נבדק ומה לא</h4>
            <table className="fin-prov__caps">
              <tbody>{CAP_ROWS.map(([k, label]) => { const [tone, text] = CAP[openP.cap?.[k]] || CAP.unknown; return <tr key={k}><th scope="row">{label}</th><td><Pill tone={tone}>{text}</Pill></td></tr> })}</tbody>
            </table>
            <p className="fin-muted fin-small">"מאומת" מסומן רק אחרי שהפעולה רצה מול חשבון אמיתי. קריאה חזרה מהתוכנה למערכת עוד לא בנויה לאף ספק.</p>
          </section>
          {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
          {msg && <p className="fin-note" role="status">{msg}</p>}
        </Modal>
      )}

      {formP && (
        <Modal title={`חיבור ${formP.label}`} onClose={() => setForm(null)} footer={<><button type="submit" form="fin-prov-form" className="fin-btn fin-btn--primary" disabled={busy === 'save'}>{busy === 'save' ? 'מחבר…' : form.mode === 'email' ? 'חיבור' : 'שמירה ובדיקת התחברות'}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setForm(null)}>ביטול</button></>}>
          {formP.route === 'email' && (formP.needs || []).length > 0 && (
            <div className="fin-seg fin-prov__mode" role="group" aria-label="אופן החיבור">
              <button type="button" className={form.mode === 'email' ? 'is-on' : ''} aria-pressed={form.mode === 'email'} onClick={() => { setErr(''); setForm({ ...form, mode: 'email' }) }}>כתובת המייל להוצאות</button>
              <button type="button" className={form.mode === 'api' ? 'is-on' : ''} aria-pressed={form.mode === 'api'} onClick={() => { setErr(''); setForm({ ...form, mode: 'api' }) }}>מפתחות API</button>
            </div>
          )}
          <form id="fin-prov-form" className="fin-form__grid" onSubmit={saveForm}>
            <Field label="חברה" hint={form.mode === 'email' ? 'המסמכים של החברה הזו בלבד יישלחו לכתובת' : 'החיבור ישמש את החברה הזו'} wide>
              <Select value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })}><option value="">{form.mode === 'email' ? 'בחרו חברה…' : 'כל החברות'}</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
            </Field>
            {form.mode === 'email' && <Field label="כתובת הקליטה" hint={formP.intake || 'הכתובת שהתוכנה או רו״ח נתנו לקליטת מסמכים'} wide><input type="email" dir="ltr" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="name@example.com" autoComplete="off" /></Field>}
            {form.mode !== 'email' && <>
              {(formP.needs || []).map((k) => <Field key={k} label={{ client_id: 'מזהה (Client ID)', client_secret: 'מפתח סודי (Client Secret)' }[k] || k} hint="נשמר בשרת בלבד, ולא מוצג שוב" wide><input type="password" autoComplete="off" dir="ltr" onChange={(e) => setForm({ ...form, secret: { ...form.secret, [k]: e.target.value } })} /></Field>)}
              <label className="fin-check"><input type="checkbox" checked={form.sandbox} onChange={(e) => setForm({ ...form, sandbox: e.target.checked })} /> מפתחות של סביבת הניסיון (Sandbox)</label>
            </>}
          </form>
          {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
          <p className="fin-callout">{form.mode === 'email' ? 'מרגע החיבור, כל מסמך של החברה שמאושר נשלח לכתובת עם הקובץ המקורי, עם ניסיונות חוזרים אם השליחה נכשלת, וכל שליחה נרשמת. מסמך לא נשלח פעמיים.' : 'המפתחות נבדקים מיד בהתחברות אמיתית לספק. שליחת הוצאות ב-API עוד לא פעילה, ולכן שום מסמך לא נשלח דרך החיבור הזה.'}</p>
        </Modal>
      )}
    </div>
  )
}
