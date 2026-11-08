import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from './session.js'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ROLE, ago, date, money, nameOf, thisMonth } from './format.js'
import { Card, Empty, Field, Icon, InfoTip, Modal, MoreMenu, Pill, Toggle, useAsync } from './ui.jsx'
import Select from './Select.jsx'

const ROLE_DESC = {
  admin: 'הכול: הגדרות, משתמשים, חיבורים, אינטגרציות, מסמכים וייצוא',
  finance_manager: 'מסמכים, בדיקה ואישור, דוחות, ייצוא, ספקים, פרויקטים וכללים',
  employee: 'מעלה מסמכים, מחבר תיבות, ורואה רק את המסמכים שהביא',
  accountant: 'צפייה במסמכים מאושרים, דוחות, הורדות והיסטוריית ייצוא. בלי גישה לניהול',
}

const ROLE_TONE = { admin: 'done', finance_manager: 'ok', employee: 'muted', accountant: 'info' }
const TABS = [['members', 'חברי ארגון'], ['companies', 'חברות'], ['usage', 'שימוש']]
const initials = (m) => (m.full_name || m.email || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const ROLE_PICK = [
  ['accountant', 'רואה חשבון', 'רואה מסמכים מאושרים ודוחות, ומוריד חבילות. לא משנה כלום.'],
  ['employee', 'חבר/ת צוות', 'מעלה קבלות, מחבר תיבה וטלפון, ורואה רק את מה שהביא.'],
  ['finance_manager', 'מנהל/ת כספים', 'בודק, מתקן ומאשר מסמכים, ומייצא לרו״ח.'],
  ['admin', 'מנהל מערכת', 'הכול, כולל משתמשים, חיבורים והגדרות.'],
]
function RolePick({ value, onChange }) {
  return (
    <fieldset className="fin-field fin-field--wide fin-rolepick"><legend className="fin-field__label">תפקיד</legend>
      {ROLE_PICK.map(([k, title, desc]) => (
        <label key={k} className={`fin-rolecard ${value === k ? 'is-on' : ''}`}>
          <input type="radio" name="fin-role" value={k} checked={value === k} onChange={() => onChange(k)} />
          <span><strong>{title}</strong><small>{desc}</small></span>
        </label>
      ))}
    </fieldset>
  )
}
function InviteGuide({ onClose, onInvite }) {
  return (
    <Modal title="הזמנת רו״ח או חבר צוות, שלב אחרי שלב" onClose={onClose} footer={<><button type="button" className="fin-btn fin-btn--primary" onClick={onInvite}>להזמנה</button><button type="button" className="fin-btn fin-btn--ghost" onClick={onClose}>סגירה</button></>}>
      <ol className="fin-guide__steps fin-guide__steps--modal">
        <li><strong>בוחרים תפקיד.</strong> רו״ח רואה רק מסמכים מאושרים ודוחות. חבר צוות מעלה קבלות ורואה רק את שלו. מנהל כספים מאשר ומייצא.</li>
        <li><strong>מגבילים לחברות</strong> (לא חובה). רו״ח של חברה אחת יראה רק אותה. ההגבלה נאכפת במסד הנתונים, לא רק במסך.</li>
        <li><strong>שולחים.</strong> המוזמן מקבל מייל עם קישור להגדרת סיסמה, ומופיע כאן כ"ממתין להצטרפות" עד הכניסה הראשונה.</li>
        <li><strong>עדיין לא נכנס?</strong> בתפריט שליד השם: "שליחת ההזמנה שוב".</li>
        <li><strong>מישהו עזב?</strong> משביתים אותו. ההיסטוריה שלו נשארת ביומן, והגישה נחסמת מיד.</li>
      </ol>
    </Modal>
  )
}

function Usage() {
  const { documents, mailboxes } = useFinance()
  const usage = useAsync(() => api.storageUsage(), [])
  const runs = useAsync(() => api.loadAgentRuns(500), [])
  const phones = useAsync(() => api.loadWhatsappSenders(), [])
  const clouds = useAsync(() => api.loadCloudTargets(), [])
  const month = thisMonth()
  const docsMonth = documents.filter((d) => String(d.created_at || '').slice(0, 7) === month)
  const reads = (runs.data || []).filter((r) => r.agent === 'ocr' && String(r.started_at).slice(0, 7) === month).reduce((a, r) => a + (r.processed || 0), 0)
  const pct = usage.data ? (usage.data.storage_bytes / 1024 ** 3) * 100 : null
  const fin = usage.data?.buckets?.['finance-docs'] || 0
  return (
    <div className="fin-stack">
      <section className="fin-org-panel">
        <h3>אחסון</h3>
        {pct === null ? <p className="fin-muted">{usage.loading ? 'טוען…' : 'נתוני האחסון לא זמינים.'}</p> : (
          <>
            <div className="fin-org-stat"><strong>{pct.toFixed(1)}%</strong><span>מ-1GB של התוכנית החינמית</span></div>
            <div className={`fin-meter ${pct >= 75 ? 'is-bad' : pct >= 60 ? 'is-warn' : ''}`} role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="שימוש באחסון"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
            <p className="fin-muted fin-small">מסמכי הכספים תופסים {(fin / 1024 ** 2).toFixed(1)}MB. המכסה משותפת לכל האתר, ולכן קליטת מסמכים נעצרת ב-75%.</p>
          </>
        )}
      </section>
      <section className="fin-org-panel">
        <h3>החודש</h3>
        <dl className="fin-org-grid">
          <div><dt>מסמכים שנקלטו</dt><dd>{docsMonth.length}</dd></div>
          <div><dt>קריאות AI</dt><dd>{reads}</dd></div>
          <div><dt>סכום המסמכים</dt><dd>{money(docsMonth.filter((d) => !['rejected', 'duplicate'].includes(d.status)).reduce((a, d) => a + Number(d.total_amount || 0), 0))}</dd></div>
          <div><dt>תיבות מייל</dt><dd>{mailboxes.filter((m) => m.status !== 'revoked').length}</dd></div>
          <div><dt>טלפונים סורקים</dt><dd>{(phones.data || []).filter((p) => p.active).length}</dd></div>
          <div><dt>חיבורי ענן</dt><dd>{(clouds.data || []).filter((c) => c.status !== 'revoked').length}</dd></div>
        </dl>
        <p className="fin-muted fin-small">המערכת פנימית ואין בה חיוב לפי משתמש. העלות היחידה שמשתנה היא קריאות ה-AI, לפי המפתח של Anthropic.</p>
      </section>
    </div>
  )
}

export default function Users() {
  const { members, businesses, mailboxes, documents, reload, go } = useFinance()
  const me = useSession()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'members'
  const meta = useAsync(() => api.callServer('members-meta').catch(() => ({ users: [] })), [members.length])
  const [invite, setInvite] = useState(null)
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [term, setTerm] = useState('')
  const [role, setRole] = useState('')
  const [sort, setSort] = useState('name')
  const [guide, setGuide] = useState(false)
  const newInvite = () => { setGuide(false); setInvite({ email: '', full_name: '', role: 'accountant', business_ids: null }) }
  const admins = members.filter((m) => m.role === 'admin' && m.active).length
  const seen = useMemo(() => Object.fromEntries((meta.data?.users || []).map((u) => [u.id, u])), [meta.data])
  const pendingOf = (m) => meta.data && seen[m.user_id] && !seen[m.user_id].last_sign_in_at
  const pending = members.filter((m) => m.active && pendingOf(m)).length
  const shown = members
    .filter((m) => (!role || m.role === role) && (!term.trim() || `${m.full_name || ''} ${m.email}`.toLowerCase().includes(term.trim().toLowerCase())))
    .sort((a, b) => (sort === 'name' ? (a.full_name || a.email).localeCompare(b.full_name || b.email, 'he') : String(b.created_at).localeCompare(String(a.created_at))))

  const send = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { const r = await api.callServer('invite', invite); setInvite(null); setMsg(r.emailed ? `נשלחה הזמנה ל-${invite.email}` : `${invite.email} נוסף (כבר היה לו חשבון, הוא יכול להיכנס עם הסיסמה שלו)`); reload() } catch (e2) { setMsg(e2.message) } finally { setBusy(false) }
  }
  const resend = async (m) => {
    setMsg('')
    try { await api.callServer('invite', { email: m.email, full_name: m.full_name || '', role: m.role, business_ids: m.business_ids }); setMsg(`ההזמנה נשלחה שוב ל-${m.email}`) } catch (e) { setMsg(e.message) }
  }
  const save = async (e) => {
    e.preventDefault()
    if (edit.user_id === me?.id && edit.role !== 'admin' && admins <= 1) { setMsg('אי אפשר להוריד את מנהל המערכת האחרון'); return }
    try {
      await api.updateMember(edit.user_id, { role: edit.role, full_name: edit.full_name || null, business_ids: edit.business_ids?.length ? edit.business_ids : null, active: edit.active })
      setEdit(null); reload()
    } catch (e2) { setMsg(e2.message) }
  }
  const setActive = async (m, active) => {
    if (m.user_id === me?.id) return
    try { await api.updateMember(m.user_id, { active }); reload() } catch (e) { setMsg(e.message) }
  }
  const BizPick = ({ value, onChange }) => (
    <fieldset className="fin-field fin-field--wide fin-checkset"><legend className="fin-field__label">גישה לחברות</legend>
      <label className="fin-check"><input type="checkbox" checked={!value?.length} onChange={(e) => onChange(e.target.checked ? null : [])} /> כל החברות</label>
      {value && businesses.map((b) => <label key={b.id} className="fin-check"><input type="checkbox" checked={value.includes(b.id)} onChange={(e) => onChange(e.target.checked ? [...value, b.id] : value.filter((x) => x !== b.id))} /> {b.name}</label>)}
    </fieldset>
  )

  return (
    <div className="fin-stack fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">הארגון</h2>
        <InfoTip label="על ההרשאות">ההרשאות נאכפות במסד הנתונים עצמו: כל משתמש רואה רק את מה שהתפקיד והחברות שלו מתירים. משתמשים שאינם מנהלי מערכת לא יכולים לערוך את תוכן האתר.</InfoTip>
      </div>
      <div className="fin-seg fin-seg--wide" role="tablist" aria-label="חלקי הארגון">
        {TABS.map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setParams(k === 'members' ? {} : { tab: k }, { replace: true })}>{v}</button>)}
      </div>
      {msg && <p className="fin-note" role="status">{msg}</p>}

      {tab === 'members' && members.length <= 1 && (
        <div className="fin-hero-empty">
          <span className="fin-hero-empty__icon" aria-hidden="true"><Icon name="users" size={44} /></span>
          <h3>הזמינו את רואה החשבון או את חברי הצוות</h3>
          <p>תנו גישה לרו״ח או לאנשי הצוות. הם יקבלו הזמנה במייל, וכל אחד יראה רק את מה שהתפקיד שלו מתיר.</p>
          <button type="button" className="fin-btn fin-btn--primary fin-btn--wide" onClick={newInvite}>הזמנה</button>
          <button type="button" className="fin-link" onClick={() => setGuide(true)}>מדריך שלב אחרי שלב <Icon name="next" size={15} /></button>
        </div>
      )}
      {tab === 'members' && members.length > 1 && (
        <>
          <h3 className="fin-org-name">קבוצת קורקוס</h3>
          <div className="fin-org-stats">
            <div className="fin-org-stat"><Icon name="users" size={20} /><strong>{members.filter((m) => m.active).length}</strong><span>משתמשים פעילים</span></div>
            <div className="fin-org-stat"><Icon name="mail" size={20} /><strong>{meta.data ? pending : '…'}</strong><span>{pending === 1 ? 'הזמנה ממתינה' : 'הזמנות ממתינות'}</span></div>
          </div>
          <div className="fin-org-tools">
            <label className="fin-search"><Icon name="search" size={18} /><input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="חיפוש שם או מייל" aria-label="חיפוש לפי שם או אימייל" /></label>
            <Select className="fin-select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="סינון לפי תפקיד"><option value="">כל התפקידים</option>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <button type="button" className="fin-icon-btn" onClick={() => setSort(sort === 'name' ? 'new' : 'name')} title={sort === 'name' ? 'ממוין לפי שם' : 'ממוין לפי הצטרפות'} aria-label={sort === 'name' ? 'מיון לפי הצטרפות' : 'מיון לפי שם'}><Icon name="sort" size={19} /></button>
          </div>
          <button type="button" className="fin-btn fin-btn--primary fin-btn--block" onClick={newInvite}><Icon name="plus" size={18} /> הוספת רו״ח או חבר צוות</button>
          <div className="fin-section-head"><h3>חברי ארגון <span className="fin-count">{shown.length}</span></h3><button type="button" className="fin-link" onClick={() => setGuide(true)}>מדריך הזמנה</button></div>
          {!shown.length ? <Empty title="אין משתמשים שמתאימים לחיפוש" icon="users">נסו מילה אחרת או הסירו את הסינון.</Empty> : (
            <ul className="fin-member-list">
              {shown.map((m) => {
                const wait = pendingOf(m)
                return (
                  <li key={m.user_id} className="fin-member">
                    <button type="button" className="fin-member__main" onClick={() => setEdit({ ...m })} aria-label={`עריכת ${m.full_name || m.email}`}>
                      <span className="fin-avatar" aria-hidden="true">{initials(m)}</span>
                      <span className="fin-member__who"><strong>{m.full_name || m.email}{m.user_id === me?.id ? ' (את/ה)' : ''}</strong><small dir="ltr">{m.email}</small></span>
                    </button>
                    <div className="fin-member__foot">
                      <Pill tone={ROLE_TONE[m.role]}>{ROLE[m.role]}</Pill>
                      <span className="fin-acc__sub">{m.business_ids?.length ? m.business_ids.map((b) => nameOf(businesses, b)).join(', ') : 'כל החברות'}</span>
                      <span className="fin-grow" />
                      {!m.active ? <Pill>מושבת</Pill> : wait ? <Pill tone="warn">ממתין להצטרפות</Pill> : <Pill tone="ok">פעיל</Pill>}
                      <MoreMenu label={`פעולות עבור ${m.email}`} items={[
                        { label: 'עריכה', onClick: () => setEdit({ ...m }) },
                        wait && m.active && { label: 'שליחת ההזמנה שוב', onClick: () => resend(m) },
                        m.user_id !== me?.id && { label: m.active ? 'השבתה' : 'הפעלה מחדש', onClick: () => setActive(m, !m.active), danger: m.active },
                      ]} />
                    </div>
                    {seen[m.user_id]?.last_sign_in_at && <small className="fin-member__seen">כניסה אחרונה {ago(seen[m.user_id].last_sign_in_at)} · הצטרף {date(m.created_at)}</small>}
                  </li>
                )
              })}
            </ul>
          )}
          <details className="fin-disclosure">
            <summary>מה כל תפקיד יכול</summary>
            <ul className="fin-kv">{Object.entries(ROLE).map(([k, v]) => <li key={k}><span>{v}</span><strong className="fin-kv__text">{ROLE_DESC[k]}</strong></li>)}</ul>
          </details>
        </>
      )}

      {tab === 'companies' && (
        businesses.length ? (
          <ul className="fin-acc-list">
            {businesses.map((b) => {
              const people = members.filter((m) => m.active && (!m.business_ids?.length || m.business_ids.includes(b.id))).length
              const boxes = mailboxes.filter((x) => x.business_id === b.id && x.status !== 'revoked').length
              const docs = documents.filter((d) => d.business_id === b.id && !['rejected', 'duplicate'].includes(d.status)).length
              return (
                <li key={b.id} className="fin-acc fin-acc--link">
                  <span className="fin-avatar fin-avatar--square" aria-hidden="true"><Icon name="company" size={20} /></span>
                  <button type="button" className="fin-acc__main fin-acc__btn" onClick={() => go(`/companies/${b.id}`)}>
                    <strong>{b.name}</strong>
                    <span className="fin-acc__sub">{b.vat_id ? `ח.פ ${b.vat_id} · ` : ''}{people === 1 ? 'משתמש אחד' : `${people} משתמשים`} · {boxes === 1 ? 'תיבה אחת' : `${boxes} תיבות`} · {docs === 1 ? 'מסמך אחד' : `${docs} מסמכים`}</span>
                  </button>
                  <Pill tone={b.active === false ? 'muted' : 'ok'}>{b.active === false ? 'בארכיון' : 'פעילה'}</Pill>
                  <Icon name="next" size={18} />
                </li>
              )
            })}
          </ul>
        ) : <Empty title="עוד אין חברות" icon="company" action={<button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/companies')}>הוספת חברה</button>}>החברות בקבוצה, עם ח.פ ומייל של רו״ח.</Empty>
      )}

      {tab === 'usage' && <Usage />}
      {guide && <InviteGuide onClose={() => setGuide(false)} onInvite={newInvite} />}

      {invite && (
        <Modal title="הוספת רו״ח או חבר צוות" onClose={() => setInvite(null)} footer={<><button type="submit" form="fin-invite" className="fin-btn fin-btn--primary" disabled={busy}>{busy ? 'שולח…' : 'שליחת הזמנה'}</button><button type="button" className="fin-btn" onClick={() => setInvite(null)}>ביטול</button></>}>
          <form id="fin-invite" className="fin-form__grid" onSubmit={send}>
            <Field label="אימייל" wide><input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} dir="ltr" /></Field>
            <Field label="שם"><input value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} /></Field>
            <RolePick value={invite.role} onChange={(r) => setInvite({ ...invite, role: r })} />
            {BizPick({ value: invite.business_ids, onChange: (v) => setInvite({ ...invite, business_ids: v }) })}
          </form>
          <p className="fin-muted">המשתמש יקבל מייל עם קישור להגדרת סיסמה.</p>
        </Modal>
      )}
      {edit && (
        <Modal title={edit.full_name || edit.email} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-member" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-member" className="fin-form__grid" onSubmit={save}>
            <Field label="שם"><input value={edit.full_name || ''} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="תפקיד" hint={ROLE_DESC[edit.role]}><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            {BizPick({ value: edit.business_ids, onChange: (v) => setEdit({ ...edit, business_ids: v }) })}
            <div className="fin-field fin-field--wide fin-field--row"><span className="fin-field__label">משתמש פעיל</span><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="משתמש פעיל" disabled={edit.user_id === me?.id} /></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
