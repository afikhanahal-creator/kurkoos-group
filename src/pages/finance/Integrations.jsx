import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { DOC_TYPE, claimableVat, date, docDate, money, monthLabel, nameOf, period, recentMonths, shiftMonth, signedTotal, thisMonth } from './format.js'
import { buildPackage } from './exportPackage.js'
import { Card, Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync, askConfirm } from './ui.jsx'
import { VendorLogo } from './logos.jsx'
import { CompanyMark } from './CompanySettings.jsx'
import Select from './Select.jsx'

const FORMATS = { zip: 'ZIP: קבצים מקוריים + Excel + CSV + metadata', excel: 'Excel', csv: 'CSV', pdf: 'PDF (דוח להדפסה)' }

/* a valid intake address of a connection ('' when it has none) */
const intakeOf = (i) => { const a = String(i?.config?.intake_email || '').trim(); return /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]{2,}$/.test(a) ? a : '' }

function ExportWizard({ onDone, links = [] }) {
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
  // the software connected to this company (or to all of them) that takes documents by email
  const software = links.filter((i) => !i.business_id || i.business_id === biz)
  const target = dest.startsWith('int:') ? software.find((i) => `int:${i.id}` === dest) : null
  const total = chosen.reduce((a, d) => a + signedTotal(d), 0)
  const vat = chosen.reduce((a, d) => a + claimableVat(d, categories), 0)

  const run = async () => {
    setBusy(true); setMsg('')
    try {
      if (dest.startsWith('int:')) {
        // the server sends the mail (original files + Excel / CSV summary) and records the export; nothing is marked before it answers
        if (!target) throw new Error('החיבור לתוכנה לא נמצא לחברה שנבחרה')
        const r = await api.callServer('integration-send', { id: target.id, ids: chosen.map((d) => d.id), period: preset ? null : monthLabel(per) })
        try { sessionStorage.removeItem('fin-export-ids') } catch { /* noop */ }
        setConfirm(false); await reload(); onDone?.()
        setMsg(`${r.sent === 1 ? 'מסמך אחד נשלח' : `${r.sent} מסמכים נשלחו`} אל ${r.software} (${r.to.join(', ')}), עם הקבצים המקוריים וקובץ הסיכום.${r.marked ? ` ${r.marked === 1 ? 'מסמך אחד סומן' : `${r.marked} סומנו`} "נשלח לרו״ח".` : ''}`)
        return
      }
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
              <Select className="fin-select" value={biz} onChange={(e) => { setBiz(e.target.value); setPicked(null); if (dest.startsWith('int:')) setDest('download') }} aria-label="חברה"><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
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
            <Select className="fin-select" value={format} onChange={(e) => setFormat(e.target.value)} aria-label="פורמט" disabled={!!target}>{Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <Select className="fin-select" value={dest} onChange={(e) => setDest(e.target.value)} aria-label="יעד"><option value="download">הורדה למחשב</option><option value="email" disabled={!accountant}>מייל לרו״ח{accountant ? ` (${accountant})` : ' (אין מייל לחברה)'}</option>{software.map((i) => <option key={i.id} value={`int:${i.id}`}>שליחה ל-{i.name} ({intakeOf(i)})</option>)}<option value="api" disabled>חיבור API לתוכנה (לא הופעל)</option></Select>
          </div>
          {target && <p className="fin-muted fin-small">המסמכים יישלחו במייל אל {target.name}, עם הקבצים המקוריים וקובץ סיכום (Excel ו-CSV). הפורמט נקבע לפי המייל.</p>}
        </div></li>
      </ol>
      <div className="fin-wizard__foot">
        <p><strong>{chosen.length}</strong> מסמכים · סה״כ <strong>{money(total)}</strong> · מע״מ לקיזוז <strong>{money(vat)}</strong></p>
        <button type="button" className="fin-btn fin-btn--primary" disabled={!chosen.length || busy} onClick={() => setConfirm(true)}><Icon name="export" size={18} /> המשך לאישור הייצוא</button>
      </div>
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {confirm && (
        <Modal title="אישור ייצוא" onClose={() => setConfirm(false)} footer={<><button type="button" className="fin-btn fin-btn--primary" onClick={run} disabled={busy}>{busy ? (target ? 'שולח…' : 'מייצא…') : target ? 'אישור ושליחה' : 'אני מאשר/ת את הייצוא'}</button><button type="button" className="fin-btn" onClick={() => setConfirm(false)}>ביטול</button></>}>
          <ul className="fin-kv">
            <li><span>חברה</span><strong>{nameOf(businesses, biz) || 'כל החברות'}</strong></li>
            <li><span>תקופה</span><strong>{preset ? 'בחירה ידנית' : monthLabel(per)}</strong></li>
            <li><span>מסמכים</span><strong>{chosen.length}</strong></li>
            <li><span>סה״כ</span><strong>{money(total)}</strong></li>
            <li><span>פורמט</span><strong>{target ? 'מייל עם הקבצים המקוריים' : FORMATS[format]}</strong></li>
            <li><span>יעד</span><strong>{target ? `${target.name} (${intakeOf(target)})` : dest === 'email' ? accountant : 'הורדה'}</strong></li>
          </ul>
          {again > 0 && <p className="fin-note fin-note--warn">{again} מהמסמכים כבר יוצאו בעבר. זה ייצוא חוזר, והוא יירשם ככזה.</p>}
          <p className="fin-muted">אחרי הייצוא המסמכים מסומנים "נשלח לרו״ח", והייצוא נרשם בהיסטוריה עם התאריך, היעד והמשתמש. שינוי סכום במסמך שיוצא יחזיר אותו לאישור.</p>
        </Modal>
      )}
    </Card>
  )
}

/* What each software is on this screen: a monogram for the ones without a published icon, a line that says how the
   documents get there, and the names people search by. `kind` itself comes from the server (adapters.js). */
const SOFTWARE = {
  morning: { mono: 'M', tone: 'green', desc: 'חשבוניות ספקים מאושרות עוברות ל-Morning (חשבונית ירוקה).', alias: 'חשבונית ירוקה greeninvoice green invoice מורנינג' },
  icount: { mono: 'iC', tone: 'ocean', desc: 'מסמכי הוצאות מאושרים עוברים ל-iCount.', alias: 'איי קאונט' },
  rivhit: { mono: 'ר', tone: 'red', desc: 'הוצאות מאושרות עוברות לרווחית.', alias: 'rivhit' },
  sumit: { mono: 'S', tone: 'ink', desc: 'מסמכים מאושרים עוברים ל-SUMIT.', alias: 'סאמיט' },
  paperless: { mono: 'P', tone: 'ocean', desc: 'מסמכים מאושרים עוברים ל-Paperless.', alias: 'פייפרלס' },
  priority: { mono: 'Pr', tone: 'ink', desc: 'חשבוניות ספק נקלטות ב-Priority ERP.', alias: 'פריוריטי' },
  costapp: { mono: 'CA', tone: 'ocean', desc: 'מסמכי הוצאות מאושרים נשלחים במייל לכתובת שקיבלתם מ-CostApp או מרו״ח.', alias: 'קוסטאפ cost app' },
  smartbee: { mono: 'SB', tone: 'green', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-SmartBee או מרו״ח.', alias: 'סמארטבי smart bee smartbett smartbet' },
  finbot: { mono: 'FB', tone: 'ink', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-Finbot או מרו״ח.', alias: 'פינבוט' },
  ezcount: { mono: 'EZ', tone: 'ocean', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-EZcount או מרו״ח.', alias: 'איזי קאונט' },
  invoice4u: { mono: 'i4', tone: 'ink', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-Invoice4U או מרו״ח.', alias: 'אינווייס פור יו' },
  cardcom: { mono: 'CC', tone: 'red', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-Cardcom או מרו״ח.', alias: 'קארדקום' },
  linet: { mono: 'Li', tone: 'green', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-Linet או מרו״ח.', alias: 'לינט' },
  wizcloud: { mono: 'Wz', tone: 'ocean', desc: 'מסמכים מאושרים נשלחים במייל לכתובת שקיבלתם מ-WizCloud או מרו״ח.', alias: 'וויזקלאוד wizsoft וויזסופט' },
  hashavshevet: { mono: 'ח', tone: 'green', desc: 'קובץ קליטה במבנה של חשבשבת, להורדה או לשליחה לרו״ח.', alias: 'hashavshevet h-erp' },
  file: { mono: 'ZIP', tone: 'muted', desc: 'הקבצים המקוריים עם Excel ו-CSV, שכל תוכנה קולטת.', alias: 'zip excel csv pdf קובץ' },
}
const STATUS_TXT = { ready: ['ok', 'מחובר'], not_tested: ['warn', 'ממתין לבדיקה'], not_active: ['warn', 'ממתין להפעלה'], error: ['bad', 'שגיאה'] }
const GROUPS = [['on', 'מחוברות'], ['email', 'קליטה במייל'], ['api', 'חיבור ישיר (API)'], ['file', 'ייצוא קבצים']]
const GROUP_NOTE = {
  email: 'התוכנה (או משרד רו״ח) נותנת לעסק כתובת מייל לקליטת מסמכים. המסמכים המאושרים נשלחים אליה עם הקבצים המקוריים וקובץ סיכום.',
  api: 'חיבור ישיר מופעל אחרי שרו״ח מאשר באיזו תוכנה הוא עובד ונותן מפתח API. עד אז אפשר לתת כתובת קליטה במייל, או לייצא קבצים.',
}
const when = (iso) => (iso ? new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

export default function Integrations() {
  const { businesses, can } = useFinance()
  const list = useAsync(() => api.loadIntegrations(), [])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState('')
  const adapters = status.data?.adapters || []
  const kindOf = useMemo(() => Object.fromEntries(adapters.map((a) => [a.id, a.kind])), [adapters])
  const admin = can('manage')
  const live = (list.data || []).filter((i) => i.enabled)
  const isFile = (i) => kindOf[i.provider] === 'file'
  // how a connection delivers today: by email, in files, or waiting for the direct connection
  const delivery = (i) => (isFile(i) || (kindOf[i.provider] === 'custom' && i.config?.mode === 'files') ? 'file' : intakeOf(i) ? 'email' : kindOf[i.provider] === 'api' ? 'api_pending' : 'email')
  const deliveryText = (i) => ({ email: `מייל אל ${intakeOf(i) || 'כתובת שעוד לא הוגדרה'}`, file: 'ייצוא קבצים', api_pending: 'חיבור ישיר: ממתין להפעלה. בינתיים יוצאים קבצים' })[delivery(i)]
  const q = term.trim().toLowerCase()
  const match = (a) => !q || `${a.label} ${SOFTWARE[a.id]?.desc || ''} ${SOFTWARE[a.id]?.alias || ''}`.toLowerCase().includes(q)
  const customs = live.filter((i) => i.provider === 'custom' && (!q || `${i.name} ${i.config?.note || ''}`.toLowerCase().includes(q)))
  const shown = adapters.filter((a) => a.kind !== 'custom' && match(a))
  const groupOf = (a) => (a.kind === 'file' ? 'file' : live.some((i) => i.provider === a.id) ? 'on' : a.kind)
  const mailLinks = live.filter((i) => delivery(i) === 'email' && intakeOf(i))

  // one line per company: which software it works with, how the documents get there, and when it last worked
  const softwareFor = (b) => live.find((i) => !isFile(i) && i.business_id === b.id) || live.find((i) => !isFile(i) && !i.business_id)
  const board = businesses.filter((b) => b.active !== false).map((b) => ({ b, it: softwareFor(b) }))

  const test = async (it) => {
    setMsg(''); setErr(''); setBusy(it.id)
    try { const r = await api.callServer('integration-test', { id: it.id }); if (r.ok) setMsg(`${it.name}: ${delivery(it) === 'email' ? '' : 'החיבור תקין. '}${r.note || 'החיבור תקין'}.`); else setErr(`${it.name}: ${r.error}`); list.reload() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const save = async (e) => {
    e.preventDefault(); setErr('')
    const a = adapters.find((x) => x.id === edit.provider)
    try {
      const r = await api.callServer('integration-save', edit)
      const saved = r.integration; const name = edit.name || a?.label
      setEdit(null); await list.reload()
      // a new or changed intake address is checked at once: one short mail goes there, and the result is what the card shows
      if (saved?.status === 'not_tested') await test({ ...saved, name })
      else setMsg(`${name} נשמר.`)
    } catch (e2) { setErr(e2.message) }
  }
  const disconnect = async (it) => {
    if (!(await askConfirm({ text: `לנתק את ${it.name}? מסמכים שכבר יוצאו לא משתנים.`, ok: 'ניתוק', danger: true }))) return
    try { await api.callServer('integration-save', { ...it, enabled: false }); list.reload() } catch (e) { setErr(e.message) }
  }
  const open = (a, it, name) => { setErr(''); setEdit(it ? { ...it, config: { ...(it.config || {}) } } : { provider: a.id, name: a.kind === 'custom' ? (name || '') : a.label, business_id: businesses.length === 1 ? businesses[0].id : '', config: a.kind === 'custom' ? { mode: 'email' } : {}, enabled: true }) }
  const custom = adapters.find((a) => a.kind === 'custom')
  const toCatalogue = () => { const el = document.getElementById('fin-acct-search'); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true }) }

  const instance = (a, i) => {
    const [tone, label] = STATUS_TXT[i.status] || ['muted', i.status]
    return (
      <div key={i.id} className="fin-app-card__row">
        <span className="fin-app-card__who"><strong>{i.business_id ? nameOf(businesses, i.business_id) : 'כל החברות'}</strong><small>{deliveryText(i)}</small></span>
        <Pill tone={tone}>{label}</Pill>
        {i.last_error && i.status === 'error' && <small className="fin-cell-err fin-app-card__err">{i.last_error}</small>}
        <span className="fin-app-card__acts">
          <button type="button" className="fin-btn fin-btn--sm" disabled={busy === i.id} onClick={() => test(i)}>{busy === i.id ? 'בודק…' : 'בדיקת חיבור'}</button>
          {admin && <MoreMenu label={`פעולות עבור ${i.name}`} items={[{ label: 'הגדרות', onClick: () => open(a, i) }, { label: 'ניתוק', onClick: () => disconnect(i), danger: true }]} />}
        </span>
      </div>
    )
  }
  const card = (a) => {
    const sw = SOFTWARE[a.id] || { mono: a.label.slice(0, 2), tone: 'ink', desc: '' }
    const mine = live.filter((i) => i.provider === a.id)
    const state = mine.length ? mine.map((i) => (i.business_id ? nameOf(businesses, i.business_id) : 'כל החברות')).join(', ') : a.kind === 'file' ? 'זמין תמיד' : a.kind === 'api' ? 'חיבור ישיר: ממתין להפעלה' : 'לא מחובר'
    return (
      <article key={a.id} className={`fin-app-card ${mine.length ? 'is-on' : ''}`}>
        <div className="fin-app-card__top">
          <VendorLogo id={a.id} mono={sw.mono} tone={sw.tone} />
          <div className="fin-app-card__head">
            <h4>{a.label}</h4>
            <span className="fin-muted">{state}</span>
          </div>
        </div>
        <p>{sw.desc}</p>
        {a.kind === 'api' && !mine.length && <small className="fin-app-card__hint">בינתיים: שליחה במייל לכתובת קליטה, או ייצוא קבצים.</small>}
        {mine.map((i) => instance(a, i))}
        {admin && (!mine.length || a.kind === 'file') && (
          <button type="button" className={`fin-btn ${mine.length ? 'fin-btn--ghost' : ''} fin-app-card__cta`} onClick={() => open(a)}>
            <Icon name={mine.length ? 'plus' : 'plug'} size={17} /> {mine.length ? 'חיבור לחברה נוספת' : `חיבור ${a.label}`}
          </button>
        )}
      </article>
    )
  }
  const customCard = (i) => (
    <article key={i.id} className="fin-app-card is-on">
      <div className="fin-app-card__top">
        <VendorLogo id="custom" mono={String(i.name || '?').trim().slice(0, 2)} tone="ink" />
        <div className="fin-app-card__head"><h4>{i.name}</h4><span className="fin-muted">תוכנה שהוספתם</span></div>
      </div>
      <p>{i.config?.note || (i.config?.mode === 'files' ? 'המסמכים המאושרים יוצאים בקבצים.' : 'המסמכים המאושרים נשלחים במייל לכתובת הקליטה.')}{i.config?.contact ? ` איש קשר: ${i.config.contact}${i.config.contact_email ? ` (${i.config.contact_email})` : ''}.` : ''}</p>
      {instance(custom, i)}
    </article>
  )
  const groups = GROUPS.map(([id, title]) => [id, title, shown.filter((a) => groupOf(a) === id)])
  const nothing = !shown.length && !customs.length

  return (
    <div className="fin-stack fin-acct">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">חיבור תוכנת הנהלת החשבונות</h2>
        <InfoTip label="על חיבור תוכנה">רק מסמכים מאושרים יוצאים, עם אישור לפני כל שליחה, ובלי כפילויות: מסמך שיוצא מסומן ולא יוצא שוב אלא אם מבקשים ייצוא חוזר. כל ייצוא נרשם בהיסטוריה.</InfoTip>
      </div>
      <p className="fin-muted fin-lead">בחרו את התוכנה שרו״ח עובד איתה. לכל חברה אפשר לחבר תוכנה אחת, וייצוא קבצים זמין תמיד.</p>

      {adapters.length > 0 && board.length > 0 && (
        <section className="fin-acct__board" aria-label="מה מחובר לכל חברה">
          <header>
            <h3>מה מחובר עכשיו</h3>
            <div className="fin-app-sum" role="status">
              <span><b>{board.filter((r) => r.it).length}</b> מתוך {board.length} חברות עם תוכנה</span>
              <span><b>{live.filter((i) => !isFile(i) && i.status === 'ready').length}</b> פעילות</span>
              {live.some((i) => ['not_active', 'not_tested'].includes(i.status)) && <span className="is-warn"><b>{live.filter((i) => ['not_active', 'not_tested'].includes(i.status)).length}</b> ממתינות</span>}
              {live.some((i) => i.status === 'error') && <span className="is-bad"><b>{live.filter((i) => i.status === 'error').length}</b> בשגיאה</span>}
            </div>
          </header>
          <ul>
            {board.map(({ b, it }) => {
              const [tone, label] = it ? STATUS_TXT[it.status] || ['muted', it.status] : ['muted', 'קבצים בלבד']
              const a = it && adapters.find((x) => x.id === it.provider)
              return (
                <li key={b.id} className="fin-acct__row">
                  <span className="fin-acct__co"><CompanyMark b={b} size={40} /><span><strong>{b.name}</strong>{b.vat_id && <small>ח.פ <bdi>{b.vat_id}</bdi></small>}</span></span>
                  <span className="fin-acct__sw">
                    {it ? <VendorLogo id={it.provider} mono={SOFTWARE[it.provider]?.mono || String(it.name).trim().slice(0, 2)} tone={SOFTWARE[it.provider]?.tone || 'ink'} size={40} /> : <span className="fin-acct__none" aria-hidden="true"><Icon name="plug" size={18} /></span>}
                    <span><strong>{it ? it.name : 'לא מחוברת תוכנה'}{it && !it.business_id ? <small> (לכל החברות)</small> : null}</strong><small>{it ? deliveryText(it) : 'המסמכים יוצאים בקבצים: ZIP, Excel, CSV'}</small></span>
                  </span>
                  <span className="fin-acct__last">{it?.last_sync_at ? <><small>בדיקה או שליחה אחרונה</small><bdi>{when(it.last_sync_at)}</bdi></> : it ? <small>עוד לא נבדק</small> : null}</span>
                  <span className="fin-acct__state"><Pill tone={tone}>{label}</Pill></span>
                  <span className="fin-acct__act">
                    {it ? <button type="button" className="fin-btn fin-btn--sm" disabled={busy === it.id} onClick={() => test(it)}>{busy === it.id ? 'בודק…' : 'בדיקת חיבור'}</button>
                      : admin ? <button type="button" className="fin-btn fin-btn--sm fin-btn--primary" onClick={toCatalogue}>בחירת תוכנה</button> : null}
                    {it && admin && a && <button type="button" className="fin-icon-btn" onClick={() => open(a, it)} aria-label={`הגדרות ${it.name}`} title="הגדרות"><Icon name="edit" size={16} /></button>}
                  </span>
                  {it?.status === 'error' && it.last_error && <small className="fin-cell-err fin-acct__err">{it.last_error}</small>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {msg && <p className="fin-note" role="status">{msg}</p>}
      {err && !edit && <p className="fin-error fin-error--block" role="alert">{err}</p>}

      <label className="fin-search fin-search--wide">
        <Icon name="search" size={18} />
        <input id="fin-acct-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="חיפוש תוכנת הנהלת חשבונות" aria-label="חיפוש תוכנת הנהלת חשבונות" />
      </label>

      {!adapters.length && !status.loading ? <Empty title="השרת לא זמין" icon="plug">רשימת התוכנות נטענת מהשרת.</Empty> : (
        <>
          {groups.map(([id, title, items]) => (items.length || (id === 'on' && customs.length)) ? (
            <section key={id} className="fin-app-section">
              <h3>{title} <small>{items.length + (id === 'on' ? customs.length : 0)}</small></h3>
              {GROUP_NOTE[id] && <p className="fin-muted fin-small fin-app-section__note">{GROUP_NOTE[id]}</p>}
              <div className="fin-app-grid">{items.map(card)}{id === 'on' && customs.map(customCard)}</div>
            </section>
          ) : null)}
          {nothing && adapters.length > 0 && <Empty title={`לא מצאנו את "${term}"`} icon="search" action={admin && custom && <button type="button" className="fin-btn fin-btn--primary" onClick={() => open(custom, null, term.trim())}><Icon name="plus" size={17} /> הוספת "{term.trim()}" כתוכנה חדשה</button>}>אפשר להוסיף כל תוכנה שרו״ח עובד איתה, עם כתובת הקליטה שלה במייל. ייצוא הקבצים (ZIP, Excel, CSV) נקלט בכל תוכנה.</Empty>}
          {admin && custom && !nothing && (
            <section className="fin-app-section">
              <h3>תוכנה שלא ברשימה</h3>
              <button type="button" className="fin-app-add" onClick={() => open(custom, null, '')}>
                <span className="fin-app-add__icon" aria-hidden="true"><Icon name="plus" size={22} /></span>
                <span><strong>הוספת תוכנה אחרת</strong><small>כותבים את שם התוכנה ואת כתובת המייל שבה היא מקבלת מסמכים. אפשר גם לנהל תוכנה שמקבלת קבצים בלבד.</small></span>
              </button>
            </section>
          )}
        </>
      )}

      <ExportWizard onDone={list.reload} links={mailLinks} />

      {edit && (() => {
        const a = adapters.find((x) => x.id === edit.provider)
        const isCustom = a?.kind === 'custom'
        const byMail = a?.kind === 'email' || (isCustom && edit.config?.mode !== 'files')
        const cfg = (k, v) => setEdit({ ...edit, config: { ...(edit.config || {}), [k]: v } })
        const willTest = (byMail || a?.kind === 'api') && String(edit.config?.intake_email || '').trim() && !(edit.id && edit.status === 'ready' && intakeOf(edit) === String((list.data || []).find((i) => i.id === edit.id)?.config?.intake_email || '').trim().toLowerCase())
        return (
          <Modal title={edit.id ? `הגדרות ${edit.name}` : isCustom ? 'הוספת תוכנה שלא ברשימה' : `חיבור ${a?.label || ''}`} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-int" className="fin-btn fin-btn--primary">{willTest ? (edit.id ? 'שמירה ושליחת מייל בדיקה' : 'חיבור ושליחת מייל בדיקה') : edit.id ? 'שמירה' : 'חיבור'}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setEdit(null)}>ביטול</button></>}>
            <form id="fin-int" className="fin-form__grid" onSubmit={save}>
              <Field label="חברה" hint="התוכנה תקבל רק את המסמכים של החברה הזו"><Select value={edit.business_id || ''} onChange={(e) => setEdit({ ...edit, business_id: e.target.value })}><option value="">כל החברות</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
              <Field label={isCustom ? 'שם התוכנה' : 'שם'}><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={isCustom ? 'למשל: התוכנה של משרד רו״ח' : a?.label} required={isCustom} maxLength={80} /></Field>
              {isCustom && (
                <fieldset className="fin-radio-cards fin-field--wide fin-acct__mode">
                  <legend className="fin-field__label">איך התוכנה מקבלת מסמכים</legend>
                  <label className={edit.config?.mode !== 'files' ? 'is-on' : ''}><input type="radio" name="fin-int-mode" checked={edit.config?.mode !== 'files'} onChange={() => cfg('mode', 'email')} /><strong>במייל</strong><span>לכתובת קליטה שהתוכנה או רו״ח נתנו</span></label>
                  <label className={edit.config?.mode === 'files' ? 'is-on' : ''}><input type="radio" name="fin-int-mode" checked={edit.config?.mode === 'files'} onChange={() => cfg('mode', 'files')} /><strong>בקבצים</strong><span>מורידים ZIP, Excel או CSV ומעבירים</span></label>
                </fieldset>
              )}
              {(byMail || a?.kind === 'api') && (
                <Field label={a?.kind === 'api' ? 'כתובת קליטה במייל (לא חובה)' : 'כתובת הקליטה במייל'} hint={a?.kind === 'api' ? 'עד שהחיבור הישיר יופעל, המסמכים יישלחו לכתובת הזו' : 'הכתובת שהתוכנה או משרד רו״ח נתנו לקליטת מסמכים'} wide>
                  <input type="email" dir="ltr" inputMode="email" autoComplete="off" value={edit.config?.intake_email || ''} onChange={(e) => cfg('intake_email', e.target.value)} placeholder="docs@example.co.il" required={byMail} />
                </Field>
              )}
              {isCustom && <>
                <Field label="איש קשר אצל רו״ח"><input value={edit.config?.contact || ''} onChange={(e) => cfg('contact', e.target.value)} maxLength={120} /></Field>
                <Field label="המייל של איש הקשר"><input type="email" dir="ltr" autoComplete="off" value={edit.config?.contact_email || ''} onChange={(e) => cfg('contact_email', e.target.value)} /></Field>
                <Field label="הערה" hint="למשל: באיזה יום בחודש רו״ח מצפה לחומר" wide><textarea rows={2} value={edit.config?.note || ''} onChange={(e) => cfg('note', e.target.value)} maxLength={500} /></Field>
              </>}
              {(a?.secrets || []).map((s2) => <Field key={s2} label={s2.replace(/_/g, ' ')} hint="נשמר בשרת בלבד, ולא מוצג שוב" wide><input type="password" autoComplete="off" onChange={(e) => setEdit({ ...edit, secret: { ...(edit.secret || {}), [s2]: e.target.value } })} dir="ltr" /></Field>)}
            </form>
            {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
            {a?.kind === 'api' && <p className="fin-callout">המפתחות נשמרים עכשיו, והשליחה הישירה תופעל אחרי בדיקה מול התוכנה. עד אז המסמכים יוצאים בקבצים או במייל לכתובת הקליטה, ושום דבר לא נשלח בלי אישור.</p>}
            {byMail && <p className="fin-callout">אחרי השמירה נשלח מייל בדיקה קצר לכתובת, והחיבור מסומן "מחובר" רק אם שירות המייל קיבל אותו. מסמכים נשלחים רק מהמסך הזה, אחרי אישור.</p>}
          </Modal>
        )
      })()}
    </div>
  )
}
