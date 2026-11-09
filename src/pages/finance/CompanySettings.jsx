import { useEffect, useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { prettyPhone } from './phone.js'
import Select from './Select.jsx'
import { Empty, Icon, Pill, askConfirm, useAsync } from './ui.jsx'

/* How each company of the group reports, in four tabs: its details, VAT and reporting, its accountant, and where its
   documents come from. Stored on the company (fin_businesses.report_settings, plus the existing columns), so every
   screen that reports on a company reads the same answers: the VAT report groups by the company's VAT period, the
   accountant mail goes to its accountant, the exported files follow its formats. */
export const REPORT_DEFAULTS = { logo: '', deductions_file: '', incorporated_on: '', zip: '', website: '', entity_type: 'company', vat_period: 'monthly', fiscal_start: '01', currency: 'ILS', date_format: 'dd/mm/yyyy', send_format: 'both', include_originals: true, send_day: 15, accountant_office: '', accountant_phone: '' }
export const reportOf = (b) => ({ ...REPORT_DEFAULTS, ...(b?.report_settings || {}) })
const ENTITY = { company: 'חברה בע״מ', licensed: 'עוסק מורשה', exempt: 'עוסק פטור', partnership: 'שותפות', nonprofit: 'עמותה / מלכ״ר' }
const VAT_PERIOD = { monthly: 'חודשי', bimonthly: 'דו-חודשי', none: 'לא מדווח (פטור)' }
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const TABS = [['details', 'פרופיל החברה', 'company'], ['reporting', 'דיווח ומע״מ', 'reports'], ['accountant', 'רואה החשבון', 'users'], ['sources', 'מקורות קליטה', 'inbox']]
const digits = (s) => String(s || '').replace(/\D/g, '')
const idOk = (s) => { const d = digits(s); if (!d) return true; if (d.length !== 9) return false; let sum = 0; for (let i = 0; i < 9; i++) { let x = Number(d[i]) * ((i % 2) + 1); if (x > 9) x -= 9; sum += x } return sum % 10 === 0 }
const emailOk = (s) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)
/* the number's first digits say what kind of body registered it (Registrar of Companies, Israel) */
const PREFIX = { company: [['51', 'חברה פרטית'], ['52', 'חברה ציבורית']], partnership: [['55', 'שותפות רשומה']], nonprofit: [['58', 'עמותה'], ['51', 'חל״צ']] }
const prefixNote = (type, num) => {
  const d = digits(num); const list = PREFIX[type]
  if (!d || d.length !== 9 || !list) return ''
  const hit = list.find(([p]) => d.startsWith(p))
  return hit ? `${hit[1]} (מספר שמתחיל ב-${hit[0]})` : `מספר של ${ENTITY[type]} מתחיל בדרך כלל ב-${list.map(([p]) => p).join(' או ')}. כדאי לבדוק מול תעודת ההתאגדות.`
}
/* the logo is kept small on the company itself (a 256px WebP, tens of KB): no file storage, shown everywhere at once */
async function shrinkLogo(file) {
  if (!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(file.type)) throw new Error('לוגו צריך להיות PNG, JPG, WebP או SVG.')
  if (file.size > 3 * 1024 * 1024) throw new Error('הקובץ גדול מ-3MB. נסו קובץ קטן יותר.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('אי אפשר לקרוא את התמונה.')); i.src = url })
    const w0 = img.naturalWidth || 256; const h0 = img.naturalHeight || 256; const k = Math.min(1, 256 / Math.max(w0, h0))
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k))
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    let out = c.toDataURL('image/webp', 0.9)
    if (out.length > 120000) out = c.toDataURL('image/webp', 0.72)
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png')
    return out
  } finally { URL.revokeObjectURL(url) }
}
export const CompanyMark = ({ b, size = 36 }) => {
  const logo = reportOf(b).logo
  return logo ? <img className="fin-cset__logo-img" src={logo} alt="" width={size} height={size} style={{ width: size, height: size }} /> : <span className="fin-cset__mark" aria-hidden="true" style={{ width: size, height: size }}>{String(b?.name || '?').trim().slice(0, 1)}</span>
}

function Row({ label, hint, children, wide }) {
  return <label className={`fin-cset__field ${wide ? 'is-wide' : ''}`}><span className="fin-cset__label">{label}</span>{children}{hint && <small className="fin-cset__hint">{hint}</small>}</label>
}

export default function CompanySettings() {
  const { businesses, mailboxes, can, reload, go } = useFinance()
  const admin = can('manage')
  const active = businesses.filter((b) => b.active !== false)
  const [id, setId] = useState(() => { try { return new URLSearchParams(window.location.search).get('company') || '' } catch { return '' } })
  const [tab, setTab] = useState('details')
  const DRAFT = useMemo(() => ({ id: null, name: '', report_settings: {} }), [])
  const company = id === 'new' ? DRAFT : businesses.find((b) => b.id === id) || active[0] || businesses[0]
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const phones = useAsync(() => api.loadWhatsappSenders(), [])
  useEffect(() => { if (company) setForm({ ...company, rs: reportOf(company) }); setMsg(''); setErr('') }, [company?.id, id === 'new']) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => form && company && JSON.stringify({ ...form, rs: undefined }) !== JSON.stringify({ ...company, rs: undefined }) || (form && company && JSON.stringify(form.rs) !== JSON.stringify(reportOf(company))), [form, company])
  if (!businesses.length && id !== 'new') return <Empty title="עוד אין חברות" icon="company" action={admin && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setId('new')}>הוספת חברה</button>}>מוסיפים את החברות של הקבוצה במסך "חברות", ואז מגדירים כאן איך כל אחת מדווחת.</Empty>
  if (!form) return null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setR = (k) => (e) => setForm((f) => ({ ...f, rs: { ...f.rs, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value } }))

  const save = async (e) => {
    e?.preventDefault(); setErr(''); setMsg('')
    if (!form.name?.trim()) { setErr('לחברה חייב להיות שם.'); setTab('details'); return }
    if (!idOk(form.reg_number)) { setErr('מספר החברה (ח.פ) לא תקין: 9 ספרות עם ספרת ביקורת.'); setTab('details'); return }
    if (!idOk(form.vat_id)) { setErr('מספר העוסק במע״מ (ע.מ) לא תקין: 9 ספרות עם ספרת ביקורת.'); setTab('details'); return }
    if (form.rs.deductions_file && digits(form.rs.deductions_file).length !== 9) { setErr('מספר תיק הניכויים הוא 9 ספרות.'); setTab('details'); return }
    if (form.rs.zip && !/^\d{7}$/.test(digits(form.rs.zip))) { setErr('מיקוד הוא 7 ספרות.'); setTab('details'); return }
    if (!emailOk(form.accountant_email) || !emailOk(form.email)) { setErr('כתובת מייל לא תקינה.'); return }
    if (form.rs.entity_type === 'exempt') form.rs.vat_period = 'none'
    setBusy(true)
    try {
      const saved = await api.saveRow('fin_businesses', {
        ...(form.id ? { id: form.id } : { sort: businesses.length }), name: form.name.trim(), commercial_name: form.commercial_name || null, name_en: form.name_en || null, reg_number: digits(form.reg_number) || null, vat_id: digits(form.vat_id) || null, address: form.address || null, phone: form.phone || null, email: form.email || null,
        accountant_name: form.accountant_name || null, accountant_email: (form.accountant_email || '').trim().toLowerCase() || null, report_settings: form.rs,
      })
      await reload(); if (!form.id && saved?.id) setId(saved.id); setMsg(form.id ? `ההגדרות של ${form.name} נשמרו.` : `${form.name} נוספה לקבוצה.`)
    } catch (e2) { setErr(/report_settings/.test(e2.message) ? 'צריך להריץ את supabase/finance.sql (גרסה 13) כדי לשמור את הגדרות הדיווח.' : e2.message) } finally { setBusy(false) }
  }
  const pickLogo = async (file) => { if (!file) return; setErr(''); try { const logo = await shrinkLogo(file); setForm((f) => ({ ...f, rs: { ...f.rs, logo } })) } catch (e2) { setErr(e2.message) } }
  const boxes = mailboxes.filter((m) => m.business_id === company.id && m.status !== 'revoked')
  const generalBoxes = mailboxes.filter((m) => !m.business_id && m.status !== 'revoked')
  const companyPhones = (phones.data || []).filter((p) => p.business_id === company.id)
  const r = form.rs

  return (
    <div className="fin-cset">
      <div className="fin-cset__pick" role="tablist" aria-label="חברה">
        {businesses.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={b.id === company.id} className={b.id === company.id ? 'is-on' : ''} onClick={async () => { if (dirty && !(await askConfirm({ text: 'יש שינויים שלא נשמרו. לעבור לחברה אחרת בלי לשמור?', ok: 'מעבר בלי לשמור', danger: true }))) return; setId(b.id) }}>
            <CompanyMark b={b} />
            <span><strong>{b.name}</strong><small>{b.active === false ? 'מושבתת' : `${ENTITY[reportOf(b).entity_type]} · מע״מ ${VAT_PERIOD[reportOf(b).vat_period]}`}</small></span>
          </button>
        ))}
        {admin && <button type="button" role="tab" aria-selected={id === 'new'} className={`fin-cset__new ${id === 'new' ? 'is-on' : ''}`} onClick={() => setId('new')}><span className="fin-cset__mark" aria-hidden="true"><Icon name="plus" size={16} /></span><span><strong>חברה חדשה</strong><small>הוספה לקבוצה</small></span></button>}
      </div>

      <form className="fin-cset__card" onSubmit={save} noValidate>
        <header className="fin-cset__head">
          <div className="fin-cset__who"><CompanyMark b={{ ...form, report_settings: form.rs }} size={44} /><div><h3>{form.name || (form.id ? 'חברה' : 'חברה חדשה')}</h3><p>{form.reg_number || form.vat_id ? `ח.פ ${form.reg_number || form.vat_id}` : 'עוד אין מספר ח.פ'}{form.accountant_email ? ` · רו״ח ${form.accountant_name || form.accountant_email}` : ''}</p></div></div>
          {company.id && <button type="button" className="fin-link" onClick={() => go(`/companies/${company.id}`)}>דשבורד החברה ←</button>}
        </header>
        <div className="fin-cset__tabs" role="tablist" aria-label="נושא">
          {TABS.filter(([k]) => form.id || k !== 'sources').map(([k, label, icon]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}><Icon name={icon} size={16} /> {label}</button>)}
        </div>

        <fieldset className="fin-cset__body" disabled={!admin}>
          {tab === 'details' && (() => {
            const isCo = r.entity_type === 'company'
            const nameWarn = isCo && form.name && !/בע["״'׳]?מ|בעמ|ltd/i.test(form.name) ? 'לפי חוק החברות, שם של חברה בע״מ מסתיים ב"בע״מ".' : ''
            const must = [['שם', !!form.name?.trim()], ['מספר עוסק (ע.מ)', !!digits(form.vat_id || form.reg_number)], ['כתובת', !!form.address?.trim()]]
            return (
              <div className="fin-cprof">
                <div className="fin-cprof__main">
                  <section className="fin-cprof__sec" aria-label="זהות החברה">
                    <h4>זהות החברה</h4>
                    <div className="fin-cprof__logo">
                      {r.logo ? <img src={r.logo} alt="הלוגו של החברה" /> : <span className="fin-cprof__logo-empty"><Icon name="company" size={26} /></span>}
                      <div>
                        <strong>לוגו</strong>
                        <small>PNG, SVG או JPG. מופיע בבחירת החברה, בסקירה ובכרטיס החברה.</small>
                        <span className="fin-cprof__logo-acts">
                          <label className="fin-btn fin-btn--sm">{r.logo ? 'החלפה' : 'העלאת לוגו'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = '' }} /></label>
                          {r.logo && <button type="button" className="fin-link" onClick={() => setForm((f) => ({ ...f, rs: { ...f.rs, logo: '' } }))}>הסרה</button>}
                        </span>
                      </div>
                    </div>
                    <div className="fin-cset__grid">
                      <Row label="סוג התאגיד"><Select value={r.entity_type} onChange={setR('entity_type')}>{Object.entries(ENTITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Row>
                      <Row label="תאריך התאגדות"><input type="date" value={r.incorporated_on || ''} onChange={setR('incorporated_on')} /></Row>
                      <Row label="השם הרשום" hint={nameWarn || 'כפי שמופיע בתעודת ההתאגדות וברשם החברות'} wide><input value={form.name || ''} onChange={set('name')} required placeholder={isCo ? 'למשל: ראיתה חברה לבניין בע״מ' : ''} /></Row>
                      <Row label="שם מסחרי" hint="אם החשבוניות מגיעות על שם אחר"><input value={form.commercial_name || ''} onChange={set('commercial_name')} /></Row>
                      <Row label="שם באנגלית" hint="לחשבוניות מספקים מחו״ל"><input dir="ltr" value={form.name_en || ''} onChange={set('name_en')} placeholder="Company Ltd." /></Row>
                    </div>
                  </section>
                  <section className="fin-cprof__sec" aria-label="מספרים רשמיים">
                    <h4>מספרים רשמיים</h4>
                    <div className="fin-cset__grid">
                      <Row label={r.entity_type === 'licensed' || r.entity_type === 'exempt' ? 'מספר זהות' : 'מספר חברה (ח.פ)'} hint={!idOk(form.reg_number) ? 'המספר לא תקין: 9 ספרות עם ספרת ביקורת' : prefixNote(r.entity_type, form.reg_number) || 'ברשם החברות / ברשם השותפויות / ברשם העמותות'}>
                        <input value={form.reg_number || ''} onChange={set('reg_number')} inputMode="numeric" dir="ltr" maxLength={11} aria-invalid={!idOk(form.reg_number)} /></Row>
                      <Row label="מספר עוסק במע״מ (ע.מ)" hint={!idOk(form.vat_id) ? 'המספר לא תקין' : 'הסימן החזק ביותר לשיוך חשבונית לחברה. בחברה זהה בדרך כלל לח.פ'}>
                        <span className="fin-cprof__inline"><input value={form.vat_id || ''} onChange={set('vat_id')} inputMode="numeric" dir="ltr" maxLength={11} aria-invalid={!idOk(form.vat_id)} />{form.reg_number && digits(form.reg_number) !== digits(form.vat_id) && <button type="button" className="fin-btn fin-btn--sm" onClick={() => setForm((f) => ({ ...f, vat_id: digits(f.reg_number) }))}>זהה לח.פ</button>}</span></Row>
                      <Row label="תיק ניכויים" hint="9 ספרות. לדיווחי 102 ו-856 על משכורות ותשלומים לספקים"><input value={r.deductions_file || ''} onChange={setR('deductions_file')} inputMode="numeric" dir="ltr" maxLength={11} /></Row>
                      <Row label="סוג דיווח מע״מ" hint="נקבע בלשונית 'דיווח ומע״מ'"><input value={r.entity_type === 'exempt' ? 'פטור' : VAT_PERIOD[r.vat_period]} readOnly tabIndex={-1} /></Row>
                    </div>
                  </section>
                  <section className="fin-cprof__sec" aria-label="כתובת ופרטי קשר">
                    <h4>כתובת ופרטי קשר</h4>
                    <div className="fin-cset__grid">
                      <Row label="כתובת רשומה" hint="רחוב, מספר ועיר. גם הכתובת שעל החשבונית עוזרת לשיוך" wide><input value={form.address || ''} onChange={set('address')} placeholder="למשל: הברזל 30, תל אביב" /></Row>
                      <Row label="מיקוד"><input value={r.zip || ''} onChange={setR('zip')} inputMode="numeric" dir="ltr" maxLength={7} /></Row>
                      <Row label="טלפון"><input type="tel" inputMode="tel" dir="ltr" value={form.phone || ''} onChange={set('phone')} /></Row>
                      <Row label="מייל החברה"><input type="email" dir="ltr" value={form.email || ''} onChange={set('email')} /></Row>
                      <Row label="אתר"><input type="url" dir="ltr" value={r.website || ''} onChange={setR('website')} placeholder="https://" /></Row>
                    </div>
                  </section>
                </div>
                <aside className="fin-cprof__card" aria-label="כרטיס החברה">
                  <span className="fin-cprof__card-label">כך החברה מופיעה במסמכים</span>
                  <div className="fin-cprof__card-head">
                    <CompanyMark b={{ ...form, report_settings: r }} size={52} />
                    <div><strong>{form.name || 'שם החברה'}</strong>{form.commercial_name && <small>{form.commercial_name}</small>}</div>
                  </div>
                  <dl>
                    <div><dt>{ENTITY[r.entity_type]}</dt><dd dir="ltr">{digits(form.reg_number) || '—'}</dd></div>
                    <div><dt>ע.מ</dt><dd dir="ltr">{digits(form.vat_id) || '—'}</dd></div>
                    {r.deductions_file && <div><dt>תיק ניכויים</dt><dd dir="ltr">{digits(r.deductions_file)}</dd></div>}
                    <div><dt>כתובת</dt><dd>{[form.address, r.zip].filter(Boolean).join(', ') || '—'}</dd></div>
                    {(form.phone || form.email) && <div><dt>קשר</dt><dd dir="ltr">{[form.phone, form.email].filter(Boolean).join(' · ')}</dd></div>}
                  </dl>
                  <ul className="fin-cprof__must" aria-label="פרטי חובה בחשבונית מס">
                    <li className="fin-cprof__must-title">פרטי חובה בחשבונית מס</li>
                    {must.map(([k, ok]) => <li key={k} className={ok ? 'is-ok' : 'is-miss'}><Icon name={ok ? 'check' : 'alert'} size={14} /> {k}</li>)}
                  </ul>
                </aside>
              </div>
            )
          })()}
          {tab === 'reporting' && (
            <div className="fin-cset__grid">
              <Row label="סוג העוסק"><Select value={r.entity_type} onChange={setR('entity_type')}>{Object.entries(ENTITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Row>
              <Row label="תדירות דיווח מע״מ" hint={r.entity_type === 'exempt' ? 'עוסק פטור לא מדווח מע״מ' : 'דוח המע״מ בדוחות מקובץ לפי התקופה הזו'}><Select value={r.entity_type === 'exempt' ? 'none' : r.vat_period} onChange={setR('vat_period')} disabled={r.entity_type === 'exempt'}>{Object.entries(VAT_PERIOD).filter(([k]) => r.entity_type === 'exempt' || k !== 'none').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Row>
              <Row label="תחילת שנת הכספים"><Select value={r.fiscal_start} onChange={setR('fiscal_start')}>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</Select></Row>
              <Row label="מטבע ראשי"><Select value={r.currency} onChange={setR('currency')}><option value="ILS">שקל חדש (₪)</option><option value="USD">דולר ($)</option><option value="EUR">אירו (€)</option></Select></Row>
              <Row label="פורמט תאריך בקבצים"><Select value={r.date_format} onChange={setR('date_format')}><option value="dd/mm/yyyy">31/12/2026</option><option value="yyyy-mm-dd">2026-12-31</option></Select></Row>
              <div className="fin-cset__note is-wide"><Icon name="info" size={16} /> {r.entity_type === 'exempt' ? 'לעוסק פטור אין מע״מ תשומות לקיזוז; המע״מ בחשבוניות יוצג כהוצאה.' : `דוח מע״מ ${VAT_PERIOD[r.vat_period]}: בדוחות › סיכום מע״מ, כשבוחרים את החברה, התקופות מקובצות ${r.vat_period === 'bimonthly' ? 'בזוגות חודשים (ינואר–פברואר…)' : 'לפי חודש'}.`}</div>
            </div>
          )}
          {tab === 'accountant' && (
            <div className="fin-cset__grid">
              <Row label="שם רואה החשבון"><input value={form.accountant_name || ''} onChange={set('accountant_name')} /></Row>
              <Row label="מייל רואה החשבון" hint="אליו נשלחים המסמכים והדוח החודשי של החברה"><input type="email" dir="ltr" value={form.accountant_email || ''} onChange={set('accountant_email')} /></Row>
              <Row label="שם המשרד"><input value={r.accountant_office} onChange={setR('accountant_office')} /></Row>
              <Row label="טלפון המשרד"><input type="tel" inputMode="tel" dir="ltr" value={r.accountant_phone} onChange={setR('accountant_phone')} /></Row>
              <Row label="קבצי סיכום במייל"><Select value={r.send_format} onChange={setR('send_format')}><option value="both">Excel וגם CSV</option><option value="xlsx">Excel בלבד</option><option value="csv">CSV בלבד</option></Select></Row>
              <Row label="יום מועדף לדוח החודשי" hint="תזכורת בלבד; השליחה תמיד אחרי אישור"><input type="number" inputMode="numeric" min={1} max={28} value={r.send_day} onChange={setR('send_day')} /></Row>
              <label className="fin-check is-wide"><input type="checkbox" checked={!!r.include_originals} onChange={setR('include_originals')} /> לצרף את הקבצים המקוריים (PDF ותמונות) לכל שליחה</label>
            </div>
          )}
          {tab === 'sources' && (
            <div className="fin-cset__sources">
              <p className="fin-muted">מסמכים מהמקורות האלה משויכים לחברה גם כשהחשבונית עצמה לא אומרת לאיזו חברה היא שייכת (כסימן חלש, לא לבד).</p>
              <h4>תיבות מייל</h4>
              {boxes.length ? <ul>{boxes.map((m) => <li key={m.id}><ProviderLogo name={m.provider} size={18} /><bdi dir="ltr">{m.email}</bdi><Pill tone={m.status === 'error' ? 'attn' : 'ok'}>{m.status === 'error' ? 'צריך חיבור מחדש' : `נסרק ${ago(m.last_success_at)}`}</Pill></li>)}</ul> : <p className="fin-muted">אין תיבה ששויכה רק לחברה הזו.{generalBoxes.length ? ` ${generalBoxes.length === 1 ? 'תיבה אחת כללית' : `${generalBoxes.length} תיבות כלליות`} אוספות לכל החברות.` : ''}</p>}
              <h4>טלפונים ב-WhatsApp</h4>
              {companyPhones.length ? <ul>{companyPhones.map((p) => <li key={p.id}><ProviderLogo name="whatsapp" size={18} /><bdi dir="ltr">{prettyPhone(p.phone)}</bdi><span>{p.label || ''}</span></li>)}</ul> : <p className="fin-muted">אין טלפון ששויך לחברה הזו.</p>}
              <div className="fin-cset__links"><button type="button" className="fin-btn fin-btn--sm" onClick={() => go('/mailboxes')}><Icon name="mail" size={15} /> תיבות מייל</button><button type="button" className="fin-btn fin-btn--sm" onClick={() => go('/scanners')}><ProviderLogo name="whatsapp" size={15} /> מספרי WhatsApp</button></div>
            </div>
          )}
        </fieldset>

        {err && <p className="fin-error fin-error--block" role="alert">{err}</p>}
        {msg && <p className="fin-note" role="status"><Icon name="check" size={16} /> {msg}</p>}
        {admin && tab !== 'sources' && (
          <footer className="fin-cset__foot">
            <button type="submit" className="fin-btn fin-btn--primary" disabled={busy || !dirty}>{busy ? 'שומר…' : 'שמירת השינויים'}</button>
            {dirty && <button type="button" className="fin-link" onClick={() => setForm({ ...company, rs: reportOf(company) })}>ביטול השינויים</button>}
          </footer>
        )}
        {!admin && <p className="fin-muted fin-small">רק מנהל מערכת משנה את הגדרות החברה.</p>}
      </form>
    </div>
  )
}
