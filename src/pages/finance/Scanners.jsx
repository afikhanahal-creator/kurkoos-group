import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { ago, dateTime, nameOf } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, useAsync, Skeleton, askConfirm } from './ui.jsx'
import Select from './Select.jsx'
import { normalizePhone, validMobile, prettyPhone as pretty, localPhone } from './phone.js'

export { normalizePhone, validMobile }
const OUTCOME = { unauthorized: ['attn', 'נדחה: קוד אימות שגוי'], imported: ['ok', 'נקלט'], duplicate: ['muted', 'כבר קיים'], refused_unknown_number: ['attn', 'מספר לא רשום'], unsupported: ['warn', 'אין קובץ מצורף'], failed: ['bad', 'נכשל'] }
const initials = (t) => String(t || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

/* The WhatsApp numbers that may send documents: the office number people send to, every registered phone with what
   it sent and when, and the last messages with their outcome. A number that is not registered is refused, and the
   refusal shows here, so the fix ("add this number") is one tap away. */
export default function Scanners() {
  const { businesses, members, can } = useFinance()
  const me = useSession()
  const list = useAsync(() => api.loadWhatsappSenders(), [])
  const inbox = useAsync(() => (can('operate') ? api.loadWhatsappInbox(60) : []), [list.data])
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const [add, setAdd] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [q, setQ] = useState('')
  // the connection check asks the WhatsApp provider itself: is the office phone linked, and do incoming messages reach us
  const [check, setCheck] = useState(null)
  const [checking, setChecking] = useState('')
  // lines of the log that brought no document (failed, refused, not a file) can be cleared; a line that brought one stays
  const clearLog = async (ids) => {
    if (!ids.length) return
    if (ids.length > 1 && !(await askConfirm({ title: 'ניקוי היומן', text: `למחוק מהיומן ${ids.length} הודעות שלא נקלטו? מסמכים שכבר במערכת לא מושפעים.`, ok: 'ניקוי', danger: true }))) return
    try { const r = await api.callServer('whatsapp-inbox-delete', { ids }); setMsg(r.removed === 1 ? 'שורה אחת נמחקה מהיומן' : `${r.removed} שורות נמחקו מהיומן`); inbox.reload?.() } catch (e) { setMsg(e.message) }
  }
  const runCheck = async () => { setChecking('check'); try { setCheck(await api.callServer('whatsapp-check')) } catch (e) { setCheck({ error: e.message, steps: [] }) } finally { setChecking('') } }
  const turnOn = async (force = false) => {
    setChecking('setup')
    try { const r = await api.callServer('whatsapp-setup', { force }); setCheck(r.health); setMsg('הקליטה הופעלה. ההגדרה נכנסת לתוקף אצל ספק ה-WhatsApp תוך כמה דקות.') } catch (e) {
      if (/כתובת אחרת/.test(e.message) && (await askConfirm({ text: 'ההודעות הנכנסות של מספר המשרד נשלחות כרגע למערכת אחרת. אם מפעילים כאן, המערכת האחרת תפסיק לקבל אותן. להפעיל בכל זאת?', ok: 'להפעיל כאן', danger: true }))) return turnOn(true)
      setCheck((c) => ({ ...(c || { steps: [] }), error: e.message }))
    } finally { setChecking('') }
    return undefined
  }
  const office = status.data?.whatsapp?.number || ''
  const configured = !!status.data?.whatsapp?.configured
  const waLink = office ? `https://wa.me/${office}?text=${encodeURIComponent('שלום, אני רוצה לשלוח חשבוניות לקבוצת קורקוס')}` : null
  const people = members.map((m) => ({ id: m.user_id, name: m.full_name || m.email }))
  const phones = list.data || []
  const shown = phones.filter((s) => !q.trim() || `${s.phone} ${localPhone(s.phone)} ${s.label || ''} ${nameOf(people, s.user_id)}`.toLowerCase().includes(q.trim().toLowerCase().replace(/[\s-]/g, '')) || `${s.label || ''} ${nameOf(people, s.user_id)}`.toLowerCase().includes(q.trim().toLowerCase()))
  const month = Date.now() - 30 * 86400_000
  const stats = useMemo(() => {
    const msgs = inbox.data || []
    return {
      active: phones.filter((p) => p.active).length,
      docs: phones.reduce((s, p) => s + (p.docs_count || 0), 0),
      month: msgs.filter((m) => m.outcome === 'imported' && new Date(m.at).getTime() > month).length,
      refused: msgs.filter((m) => m.outcome === 'refused_unknown_number' && new Date(m.at).getTime() > month),
    }
  }, [phones, inbox.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const unknown = [...new Set(stats.refused.map((m) => m.phone).filter(Boolean))].filter((p) => !phones.some((s) => s.phone === p))

  const openAdd = (phone = '') => { setErr(''); setAdd({ phone: phone ? localPhone(phone) : '', label: '', business_id: '', user_id: me?.id || '' }) }
  const save = async (e) => {
    e.preventDefault(); setErr('')
    const phone = normalizePhone(add.phone)
    if (!validMobile(phone)) { setErr('מספר נייד לא תקין. למשל 054-3049491'); return }
    if (busy) return
    setBusy(true)
    try {
      await api.saveRow('fin_whatsapp_senders', { phone, label: add.label || null, business_id: add.business_id || null, user_id: add.user_id || me?.id || null, created_by: me?.id || null })
      setAdd(null); setMsg(`המספר ${pretty(phone)} נוסף. מעכשיו כל צילום או PDF שיישלח ממנו ל-WhatsApp של המשרד ייכנס למערכת.`); list.reload()
    } catch (e2) { setErr(/unique|duplicate/i.test(e2.message) ? 'המספר הזה כבר רשום' : e2.message) } finally { setBusy(false) }
  }
  const toggle = async (s) => { await api.saveRow('fin_whatsapp_senders', { id: s.id, active: !s.active }); setMsg(s.active ? `${pretty(s.phone)} הושהה: הודעות ממנו לא ייקלטו עד שתפעילו שוב.` : `${pretty(s.phone)} פעיל שוב.`); list.reload() }
  const remove = async (s) => { if ((await askConfirm({ text: `להסיר את ${pretty(s.phone)}? המסמכים שנשלחו ממנו נשארים.`, ok: 'הסרה', danger: true }))) { await api.deleteRow('fin_whatsapp_senders', s.id); list.reload() } }
  const copy = async () => { try { await navigator.clipboard.writeText(`+${office}`); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* the number stays visible to copy by hand */ } }

  return (
    <div className="fin-stack fin-narrow fin-wa">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">מספרים מחוברים ב-WhatsApp</h2>
        <InfoTip label="איך זה עובד">כל טלפון שרשום כאן יכול לשלוח צילום של קבלה או קובץ PDF למספר ה-WhatsApp של המשרד. המסמך נכנס למערכת, נקרא, ומחכה לבדיקה. הודעה ממספר שלא רשום לא נקלטת, ומופיעה כאן.</InfoTip>
      </div>

      <section className={`fin-wa__office ${office ? '' : 'is-off'}`} aria-label="מספר ה-WhatsApp של המשרד">
        <span className="fin-wa__office-icon"><ProviderLogo name="whatsapp" size={30} /></span>
        <div className="fin-wa__office-main">
          <span className="fin-wa__office-label">שולחים חשבוניות למספר</span>
          {office ? <strong dir="ltr" className="fin-wa__office-num">{pretty(office)}</strong> : <strong className="fin-wa__office-num is-off">{status.loading ? '…' : 'עוד לא הופעל'}</strong>}
          <small>{office ? 'צילום או PDF, אחד בכל הודעה או כמה ביחד. אישור חוזר תוך כמה שניות.' : can('manage') ? 'צריך להגדיר בשרת את חיבור Green API (GREENAPI_ID_INSTANCE, GREENAPI_TOKEN, FINANCE_WHATSAPP_WEBHOOK_TOKEN).' : 'מנהל המערכת עוד לא הפעיל את הקליטה מ-WhatsApp.'}</small>
        </div>
        {office && (
          <div className="fin-wa__office-actions">
            <button type="button" className="fin-btn" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'הועתק' : 'העתקה'}</button>
            <a className="fin-btn fin-btn--primary" href={waLink} target="_blank" rel="noopener noreferrer"><ProviderLogo name="whatsapp" size={16} /> פתיחת שיחה</a>
          </div>
        )}
      </section>

      {can('operate') && (
        <section className={`fin-wacheck ${check ? (check.ok ? 'is-ok' : 'is-open') : ''}`} aria-label="בדיקת החיבור ל-WhatsApp">
          <header>
            <div>
              <h3>האם הקליטה מ-WhatsApp עובדת?</h3>
              <p className="fin-muted fin-small">{!check ? 'הבדיקה שואלת את ספק ה-WhatsApp אם הטלפון של המשרד מחובר ואם הודעות נכנסות מגיעות למערכת.' : check.ok ? 'הכול מחובר. צילום שנשלח למספר המשרד מטלפון רשום ייכנס למערכת וייקרא.' : 'יש מה לתקן. כל שורה אומרת מה חסר ומה עושים.'}</p>
            </div>
            <button type="button" className="fin-btn" onClick={runCheck} disabled={!!checking}><Icon name="sync" size={16} /> {checking === 'check' ? 'בודק…' : check ? 'בדיקה מחדש' : 'בדיקת החיבור'}</button>
          </header>
          {check?.error && <p className="fin-error" role="alert">{check.error}</p>}
          {check?.steps?.length > 0 && (
            <ul className="fin-wacheck__steps">
              {check.steps.map((st) => (
                <li key={st.key} className={st.ok ? 'is-ok' : 'is-bad'}>
                  <span className="fin-wacheck__mark" aria-hidden="true"><Icon name={({ server: 'plug', phone: 'phone', number: 'users', webhook: 'inbox', office: 'send', forward: 'webhook', code: 'shield', senders: 'users' })[st.key] || 'check'} size={18} /></span>
                  <div><strong>{st.title}</strong><small>{st.detail}</small>{!st.ok && st.fix && <small className="fin-wacheck__fix">מה עושים: {st.fix}</small>}</div>
                  <span className={`fin-pill fin-pill--${st.ok ? 'ok' : 'attn'} fin-wacheck__state`}>{st.ok ? 'תקין' : 'לטיפול'}</span>
                </li>
              ))}
            </ul>
          )}
          {check?.can_setup && can('manage') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => turnOn(false)} disabled={!!checking}>{checking === 'setup' ? 'מפעיל…' : 'הפעלת הקליטה'}</button>}
          {check && !check.error && typeof check.replies === 'boolean' && (
            <label className="fin-wacheck__replies">
              <input type="checkbox" checked={check.replies} disabled={!can('manage') || checking === 'replies'} onChange={async (e) => { const on = e.target.checked; setChecking('replies'); try { const r = await api.callServer('whatsapp-replies', { on }); setCheck((c) => ({ ...c, replies: r.replies })) } catch (er) { setMsg(er.message) } finally { setChecking('') } }} />
              <span><strong>הודעות אוטומטיות לשולח</strong><small>"קיבלנו את המסמך", "המסמך אושר ונשמר" והודעה כשיש בעיה בקריאה. כשזה כבוי המסמכים נקלטים כרגיל ושום הודעה לא נשלחת.</small></span>
            </label>
          )}
          {check?.last && <p className="fin-muted fin-small">ההודעה האחרונה שהגיעה: {dateTime(check.last.at)} · {OUTCOME[check.last.outcome]?.[1] || check.last.outcome}</p>}
          {check && !check.last && check.ok && <p className="fin-muted fin-small">עוד לא הגיעה אף הודעה. שלחו צילום של קבלה למספר המשרד כדי לבדוק.</p>}
        </section>
      )}

      <dl className="fin-wa__stats">
        <div><dt>מספרים פעילים</dt><dd>{stats.active}</dd></div>
        <div><dt>מסמכים שנקלטו</dt><dd>{stats.docs.toLocaleString('he-IL')}</dd></div>
        <div><dt>ב-30 הימים האחרונים</dt><dd>{stats.month}</dd></div>
        {can('operate') && <div className={stats.refused.length ? 'is-attn' : ''}><dt>ממספרים לא רשומים</dt><dd>{stats.refused.length}</dd></div>}
      </dl>

      {unknown.length > 0 && can('operate') && (
        <div className="fin-wa__unknown" role="status">
          <Icon name="alert" size={18} />
          <span>{unknown.length === 1 ? 'מספר אחד שלא רשום ניסה לשלוח מסמכים' : `${unknown.length} מספרים שלא רשומים ניסו לשלוח מסמכים`}. אם הם שלכם, הוסיפו אותם:</span>
          <span className="fin-wa__unknown-list">{unknown.slice(0, 4).map((p) => <button key={p} type="button" className="fin-btn fin-btn--sm" onClick={() => openAdd(p)} dir="ltr"><Icon name="plus" size={14} /> {pretty(p)}</button>)}</span>
        </div>
      )}
      {msg && <p className="fin-note" role="status">{msg}</p>}

      <div className="fin-section-head">
        <h3>הטלפונים שלכם</h3>
        {phones.length > 4 && <label className="fin-search fin-wa__search"><Icon name="search" size={17} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="מספר, שם או משתמש" aria-label="חיפוש טלפון" /></label>}
        <button type="button" className="fin-btn fin-btn--primary fin-btn--block-sm" onClick={() => openAdd()} disabled={!can('upload')}><Icon name="plus" size={18} /> הוספת טלפון</button>
      </div>

      {list.loading ? <Skeleton /> : !phones.length ? (
        <Empty title="עוד אין טלפונים" icon="phone" action={can('upload') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => openAdd()}><Icon name="plus" size={17} /> הוספת הטלפון שלי</button>}>הוסיפו את המספר שלכם, ומהיום כל קבלה שתצלמו ותשלחו למשרד תגיע לכאן, בלי להיכנס למערכת.</Empty>
      ) : (
        <ul className="fin-wa__list">
          {shown.map((s) => {
            const owner = s.label || nameOf(people, s.user_id) || ''
            return (
              <li key={s.id} className={`fin-wa__phone ${s.active ? '' : 'is-paused'}`}>
                <span className="fin-wa__avatar" aria-hidden="true">{initials(owner || s.phone.slice(-2))}</span>
                <div className="fin-wa__phone-main">
                  <strong>{owner || 'ללא שם'}</strong>
                  <span dir="ltr" className="fin-wa__phone-num">{pretty(s.phone)}</span>
                  <span className="fin-wa__phone-meta">
                    {s.business_id && <span className="fin-chipbtn is-static">{nameOf(businesses, s.business_id)}</span>}
                    {s.last_received_at ? <>מסמך אחרון {ago(s.last_received_at)} · {s.docs_count === 1 ? 'מסמך אחד' : `${s.docs_count} מסמכים`}</> : 'עוד לא נשלחו מסמכים'}
                  </span>
                </div>
                <Pill tone={s.active ? 'ok' : 'muted'}>{s.active ? 'פעיל' : 'מושהה'}</Pill>
                <MoreMenu label={`פעולות עבור ${pretty(s.phone)}`} items={[
                  { label: s.active ? 'השהיה' : 'הפעלה', onClick: () => toggle(s) },
                  { label: 'הסרה', onClick: () => remove(s), danger: true },
                ]} />
              </li>
            )
          })}
          {!shown.length && <li className="fin-muted fin-wa__none">אין טלפון שמתאים לחיפוש.</li>}
        </ul>
      )}

      {can('operate') && (inbox.data || []).length > 0 && (
        <section className="fin-panelcard" aria-label="הודעות אחרונות">
          <header>
            <h3>הודעות אחרונות</h3>
            {can('manage') && inbox.data.some((r) => !r.document_id && r.outcome !== 'imported') && <button type="button" className="fin-btn fin-btn--sm fin-btn--ghost" disabled={busy} onClick={() => clearLog(inbox.data.filter((r) => !r.document_id && r.outcome !== 'imported').map((r) => r.id))}><Icon name="trash" size={15} /> ניקוי הודעות שלא נקלטו</button>}
          </header>
          <ul className="fin-wa__log">
            {inbox.data.slice(0, 20).map((r) => {
              const [tone, label] = OUTCOME[r.outcome] || ['muted', r.outcome]
              return (
                <li key={r.id}>
                  <span className="fin-wa__log-main"><strong>{r.document_id ? <a className="fin-link" href={`/admin/finance/documents/${r.document_id}`}>{r.file_name || 'מסמך'}</a> : r.file_name || (r.kind === 'text' ? 'הודעת טקסט' : 'הודעה')}</strong><small><bdi dir="ltr">{pretty(r.phone || '')}</bdi> · {dateTime(r.at)}</small></span>
                  <Pill tone={tone}>{label}</Pill>
                  {r.outcome === 'refused_unknown_number' && r.phone && !phones.some((s) => s.phone === r.phone) && <button type="button" className="fin-btn fin-btn--sm" onClick={() => openAdd(r.phone)}>הוספה</button>}
                  {can('manage') && !r.document_id && r.outcome !== 'imported' && <button type="button" className="fin-icon-btn fin-icon-btn--danger" disabled={busy} onClick={() => clearLog([r.id])} aria-label="מחיקת השורה מהיומן" title="מחיקה מהיומן"><Icon name="trash" size={16} /></button>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {add && (
        <Modal title="הוספת טלפון" onClose={() => setAdd(null)} footer={<><button type="submit" form="fin-wa" disabled={busy} className="fin-btn fin-btn--primary">{busy ? 'מוסיף…' : 'הוספת המספר'}</button><button type="button" className="fin-btn fin-btn--ghost" onClick={() => setAdd(null)}>ביטול</button></>}>
          <form id="fin-wa" className="fin-form__grid" onSubmit={save} noValidate>
            <Field label="מספר הנייד" wide tone={err ? 'error' : undefined} hint={err || 'המספר שממנו תשלחו את הצילומים'}><input type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="054-3049491" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} autoFocus /></Field>
            <Field label="שם (לא חובה)"><input value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} placeholder="למשל: הטלפון של שלומי" /></Field>
            <Field label="שיוך לחברה (לא חובה)"><Select value={add.business_id} onChange={(e) => setAdd({ ...add, business_id: e.target.value })}><option value="">לפי החשבונית</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            {can('operate') && <Field label="המשתמש" wide hint="המסמכים יירשמו כאילו המשתמש הזה העלה אותם"><Select value={add.user_id} onChange={(e) => setAdd({ ...add, user_id: e.target.value })}>{members.filter((m) => m.active).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>)}</Select></Field>}
          </form>
          <ol className="fin-steps" aria-label="איך זה עובד">
            <li><b>מוסיפים כאן את מספר הנייד.</b> רק מספרים רשומים יכולים לשלוח מסמכים למערכת.</li>
            <li><b>שומרים באנשי הקשר את מספר המשרד{office ? <>: <span dir="ltr">{pretty(office)}</span></> : ''}.</b>{!office && ' הוא יופיע כאן אחרי שהקליטה מ-WhatsApp תופעל.'}</li>
            <li><b>שולחים אליו ב-WhatsApp צילום או PDF של חשבונית.</b> אפשר כמה ברצף.</li>
            <li><b>המערכת קוראת את המסמך (OCR) ומחזירה אישור תוך כמה שניות.</b> הוא מופיע ב"ממתינים לבדיקה" עם הספק, התאריך והסכום.</li>
            <li><b>אחרי שמאשרים אותו</b> הוא נכנס לדוחות, למסמכי החודש ולארכיון ב-Google Drive.</li>
          </ol>
          {!configured && <p className="fin-callout fin-callout--warn">הקליטה מ-WhatsApp עוד לא הופעלה בשרת, ולכן שליחה לא תעבוד כרגע. המספר יישמר ויתחיל לעבוד ברגע שתופעל. עד אז אפשר להעלות חשבוניות ידנית מהכפתור "העלאת מסמכים": הן עוברות את אותה קריאה ואותו אישור.</p>}
        </Modal>
      )}
    </div>
  )
}
