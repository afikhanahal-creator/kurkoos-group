import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { dm } from '../../lib/dm.js'
import { toast } from '../../lib/toast.js'
import './DmTab.css'

/* ============================================================
   DmTab — הודעות ואוטומציות לאינסטגרם ולפייסבוק (בסגנון ManyChat).
   • שיחות: תיבה אחת לכל העמודים, או לחשבון אחד שבוחרים למעלה
   • אוטומציות: תגובה על פוסט עם מילה ← הודעה פרטית, תשובה להודעה, ברוכים הבאים
   • חשבונות: התחברות עם פייסבוק (כמה חשבונות), התנתקות, הפעלה וכיבוי של כל עמוד
   התשובות האוטומטיות עונות רק למי שפנה קודם, פעם אחת לאדם.
   ============================================================ */

const ACC_KEY = 'kurkoos-dm-account'
const VIEWS = [['inbox', 'שיחות'], ['rules', 'אוטומציות'], ['accounts', 'חשבונות וחיבור']]
const TRIGGERS = {
  comment: { label: 'מישהו מגיב על פוסט', short: 'תגובה על פוסט', hint: 'שולחים לו הודעה פרטית, ואפשר גם תגובה ציבורית מתחת לתגובה שלו' },
  dm: { label: 'מישהו שולח הודעה', short: 'הודעה נכנסת', hint: 'עונים בהודעה, פעם אחת לכל אדם' },
  first_dm: { label: 'פונה חדש שולח הודעה ראשונה', short: 'הודעה ראשונה', hint: 'הודעת ברוכים הבאים, נשלחת רק בהודעה הראשונה של כל אדם' },
}
const PRESETS = [
  { name: 'מחיר בתגובה', trigger: 'comment', keywords: 'מחיר, כמה עולה, פרטים', reply_text: 'היי {שם}, תודה על ההתעניינות! אשמח לשלוח פרטים. מה מספר הטלפון שלך?', public_reply: 'שלחנו לך הודעה פרטית 🙂' },
  { name: 'ברוכים הבאים', trigger: 'first_dm', keywords: '', reply_text: 'היי {שם}, תודה שפנית לקבוצת קורקוס. נחזור אליך בהקדם. במה נוכל לעזור?', public_reply: '' },
  { name: 'פגישה', trigger: 'dm', keywords: 'פגישה, לתאם, שיחה', reply_text: 'בשמחה! אפשר לבחור מועד לשיחה קצרה כאן, או להשאיר מספר ונחזור אליך.', public_reply: '' },
]
const EMPTY_RULE = { name: '', trigger: 'comment', keywords: '', account_id: '', post_id: '', reply_text: '', public_reply: '', enabled: true }

const NetIcon = ({ net, size = 14 }) => net === 'instagram'
  ? <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
  : <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v6h4v-6h3l.5-4h-3.5V8.9c0-.6.3-.9.9-.9z" /></svg>
const netName = (n) => (n === 'instagram' ? 'אינסטגרם' : 'פייסבוק')
const accLabel = (a) => (a ? `${a.username ? '@' + a.username : a.name || ''} · ${netName(a.network)}` : '')

function when(iso) {
  if (!iso) return ''
  const d = new Date(iso), n = new Date()
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}
function Avatar({ src, name, net }) {
  const [bad, setBad] = useState(false)
  return (
    <span className="dm-av" aria-hidden="true">
      {src && !bad ? <img src={src} alt="" onError={() => setBad(true)} /> : <span>{(name || '?').trim().charAt(0)}</span>}
      {net && <i className={`dm-av__net dm-av__net--${net}`}><NetIcon net={net} size={10} /></i>}
    </span>
  )
}
async function copy(text, what) {
  try { await navigator.clipboard.writeText(text); toast.success(`${what} הועתק`) } catch { toast.error('ההעתקה נכשלה, אפשר לסמן ולהעתיק ידנית') }
}

export default function DmTab() {
  const [st, setSt] = useState(null)
  const [err, setErr] = useState('')
  const [view, setView] = useState('inbox')
  const [acc, setAcc] = useState(() => { try { return localStorage.getItem(ACC_KEY) || '' } catch { return '' } })
  const tabRefs = useRef([])

  const load = useCallback(async () => {
    try { setSt(await dm('status')); setErr('') } catch (e) { setErr(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  // חזרה מחלון ההתחברות של פייסבוק
  useEffect(() => {
    const u = new URL(window.location.href)
    const r = u.searchParams.get('dm')
    if (!r) return
    if (r === 'ok') toast.success(`החשבון חובר: ${u.searchParams.get('n') || ''} עמודים וחשבונות`)
    else toast.error(u.searchParams.get('m') || 'ההתחברות נכשלה')
    ;['dm', 'm', 'n'].forEach((k) => u.searchParams.delete(k))
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
    if (r === 'ok') setView('inbox')
    else setView('accounts')
  }, [])

  const accounts = useMemo(() => (st?.connections || []).flatMap((c) => c.accounts.map((a) => ({ ...a, connName: c.name }))), [st])
  useEffect(() => {
    if (acc && st && !accounts.some((a) => a.id === acc)) setAcc('')
  }, [acc, accounts, st])
  useEffect(() => { try { localStorage.setItem(ACC_KEY, acc) } catch { /* noop */ } }, [acc])
  const noAccounts = st && !accounts.length
  useEffect(() => { if (noAccounts) setView('accounts') }, [noAccounts])

  const onTabKey = (e, i) => {
    const d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : e.key === 'Home' ? -i : e.key === 'End' ? VIEWS.length - 1 - i : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + VIEWS.length) % VIEWS.length
    setView(VIEWS[n][0]); tabRefs.current[n]?.focus()
  }
  const totalUnread = accounts.reduce((s, a) => s + (a.unread || 0), 0)

  if (!st && !err) return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען את ההודעות…</div>

  return (
    <div className="dm">
      <div className="dm-bar">
        <div className="dm-switch">
          <label htmlFor="dm-acc" className="dm-switch__label">חשבון</label>
          <div className="dm-switch__box">
            {acc ? <Avatar src={accounts.find((a) => a.id === acc)?.picture} name={accounts.find((a) => a.id === acc)?.name} net={accounts.find((a) => a.id === acc)?.network} /> : <span className="dm-av dm-av--all" aria-hidden="true">הכל</span>}
            <select id="dm-acc" value={acc} onChange={(e) => setAcc(e.target.value)} disabled={!accounts.length}>
              <option value="">כל החשבונות{totalUnread ? ` (${totalUnread} חדשות)` : ''}</option>
              {(st?.connections || []).map((c) => (
                <optgroup key={c.id} label={`מחובר דרך ${c.name || 'פייסבוק'}`}>
                  {c.accounts.map((a) => <option key={a.id} value={a.id}>{accLabel(a)}{a.unread ? ` (${a.unread})` : ''}{a.enabled ? '' : ' · כבוי'}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className="dm-tabs" role="tablist" aria-label="אזורים">
          {VIEWS.map(([k, l], i) => (
            <button key={k} ref={(el) => { tabRefs.current[i] = el }} type="button" role="tab" id={`dm-tab-${k}`} aria-selected={view === k} aria-controls={`dm-panel-${k}`} tabIndex={view === k ? 0 : -1} className="dm-tab" onClick={() => setView(k)} onKeyDown={(e) => onTabKey(e, i)}>
              {l}{k === 'inbox' && totalUnread > 0 && <span className="dm-badge" aria-label={`${totalUnread} הודעות שלא נקראו`}>{totalUnread}</span>}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="dm-alert" role="alert">{err} <button type="button" className="dm-link" onClick={load}>לנסות שוב</button></div>}

      <section id={`dm-panel-${view}`} role="tabpanel" aria-labelledby={`dm-tab-${view}`} className="dm-panel">
        {view === 'inbox' && <Inbox acc={acc} accounts={accounts} onChanged={load} empty={noAccounts} goAccounts={() => setView('accounts')} />}
        {view === 'rules' && <Rules accounts={accounts} />}
        {view === 'accounts' && st && <Accounts st={st} reload={load} />}
      </section>
    </div>
  )
}

/* ---------------- שיחות ---------------- */
function Inbox({ acc, accounts, onChanged, empty, goAccounts }) {
  const [threads, setThreads] = useState(null)
  const [q, setQ] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [open, setOpen] = useState(null)
  const [conv, setConv] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [snips, setSnips] = useState([])
  const logRef = useRef(null)
  const listBtn = useRef(null)
  const byId = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])

  const loadThreads = useCallback(async () => {
    try { const d = await dm('threads', { account_id: acc || undefined, q: q || undefined, filter: unreadOnly ? 'unread' : 'all' }); setThreads(d.threads) } catch (e) { setThreads((t) => t || []); toast.error(e.message) }
  }, [acc, q, unreadOnly])
  const loadConv = useCallback(async (id) => {
    try { setConv(await dm('thread', { id })) } catch (e) { toast.error(e.message) }
  }, [])
  useEffect(() => { const t = setTimeout(loadThreads, q ? 300 : 0); return () => clearTimeout(t) }, [loadThreads, q])
  useEffect(() => { dm('snippets').then((d) => setSnips(d.snippets)).catch(() => {}) }, [])
  useEffect(() => { setOpen(null); setConv(null) }, [acc])
  useEffect(() => { if (open) { setConv(null); loadConv(open) } }, [open, loadConv])
  // רענון שקט כל 15 שניות כשהחלון גלוי
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') { loadThreads(); if (open) loadConv(open) } }
    const i = setInterval(tick, 15000)
    return () => clearInterval(i)
  }, [loadThreads, loadConv, open])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [conv?.messages?.length])

  const openThread = (id, btn) => { listBtn.current = btn; setOpen(id); setText('') }
  const back = () => { setOpen(null); setConv(null); setTimeout(() => listBtn.current?.focus(), 0); loadThreads(); onChanged() }

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !conv) return
    setSending(true)
    try {
      await dm('send', { thread_id: conv.thread.id, text, comment_id: conv.canDm ? undefined : conv.comment || undefined })
      setText(''); await loadConv(conv.thread.id); loadThreads(); toast.success('ההודעה נשלחה')
    } catch (er) { toast.error(er.message) } finally { setSending(false) }
  }
  const togglePause = async () => {
    const paused = !conv.thread.bot_paused
    try { await dm('pause', { thread_id: conv.thread.id, paused }); setConv({ ...conv, thread: { ...conv.thread, bot_paused: paused } }); toast.success(paused ? 'האוטומציות מושהות בשיחה הזו' : 'האוטומציות פעילות שוב בשיחה הזו') } catch (er) { toast.error(er.message) }
  }

  if (empty) return (
    <div className="dm-empty">
      <h2>עוד לא חובר אף חשבון</h2>
      <p>מחברים את פייסבוק פעם אחת, ואז כל ההודעות והתגובות מאינסטגרם ומהעמודים מגיעות לכאן.</p>
      <button type="button" className="dm-btn dm-btn--pri" onClick={goAccounts}>לחיבור חשבון</button>
    </div>
  )

  const t = conv?.thread
  const tAcc = t && byId[t.account_id]
  const canSend = conv && (conv.canDm || conv.comment)
  return (
    <div className={`dm-inbox${open ? ' dm-inbox--open' : ''}`}>
      <aside className="dm-list" aria-label="רשימת השיחות">
        <div className="dm-list__tools">
          <label className="dm-sr" htmlFor="dm-q">חיפוש בשיחות</label>
          <input id="dm-q" type="search" className="dm-input" placeholder="חיפוש לפי שם או טקסט" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="dm-check"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> רק שלא נקראו</label>
        </div>
        {threads === null ? <p className="dm-muted dm-pad">טוען…</p>
          : !threads.length ? <p className="dm-muted dm-pad">{q || unreadOnly ? 'לא נמצאו שיחות.' : 'אין עדיין שיחות. כשמישהו יכתוב או יגיב, השיחה תופיע כאן.'}</p>
          : (
            <ul className="dm-threads">
              {threads.map((th) => {
                const a = byId[th.account_id]
                return (
                  <li key={th.id}>
                    <button type="button" className={`dm-th${open === th.id ? ' dm-th--on' : ''}`} aria-current={open === th.id ? 'true' : undefined} onClick={(e) => openThread(th.id, e.currentTarget)}>
                      <Avatar src={th.picture} name={th.name || th.username} net={a?.network} />
                      <span className="dm-th__body">
                        <span className="dm-th__top"><b>{th.name || (th.username ? '@' + th.username : 'פונה')}</b><time dateTime={th.last_at}>{when(th.last_at)}</time></span>
                        <span className="dm-th__last">{th.last_dir === 'out' ? 'אתם: ' : ''}{th.last_text}</span>
                        {!acc && a && <span className="dm-th__acc">{accLabel(a)}</span>}
                      </span>
                      {th.unread > 0 && <span className="dm-badge" aria-label={`${th.unread} לא נקראו`}>{th.unread}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
      </aside>

      <div className="dm-conv">
        {!open ? <p className="dm-muted dm-conv__none">בחרו שיחה מהרשימה.</p> : !conv ? <p className="dm-muted dm-pad">טוען את השיחה…</p> : (
          <>
            <header className="dm-conv__head">
              <button type="button" className="dm-btn dm-btn--ghost dm-back" onClick={back} aria-label="חזרה לרשימת השיחות">→ חזרה</button>
              <Avatar src={t.picture} name={t.name || t.username} net={tAcc?.network} />
              <div className="dm-conv__who">
                <h2>{t.name || (t.username ? '@' + t.username : 'פונה')}</h2>
                <span className="dm-muted">{t.username && t.name ? '@' + t.username + ' · ' : ''}{tAcc ? accLabel(tAcc) : ''}</span>
              </div>
              <label className="dm-toggle" title="כשמושהה, האוטומציות לא עונות בשיחה הזו ואתם עונים בעצמכם">
                <input type="checkbox" role="switch" checked={!t.bot_paused} onChange={togglePause} />
                <span>{t.bot_paused ? 'אוטומציות מושהות' : 'אוטומציות פעילות'}</span>
              </label>
            </header>
            <ol className="dm-log" ref={logRef} aria-label="ההודעות בשיחה" aria-live="polite">
              {conv.messages.map((m) => (
                <li key={m.id} className={`dm-msg dm-msg--${m.dir}${m.kind !== 'dm' ? ' dm-msg--' + m.kind : ''}`}>
                  {m.kind === 'comment' && <span className="dm-msg__tag">תגובה על פוסט</span>}
                  {m.kind === 'reply' && <span className="dm-msg__tag">תגובה ציבורית</span>}
                  {m.media_url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(m.media_url) ? <img className="dm-msg__img" src={m.media_url} alt="תמונה שנשלחה" /> : null}
                  <p>{m.text}</p>
                  <span className="dm-msg__meta">
                    <time dateTime={m.at}>{when(m.at)}</time>
                    {m.via?.startsWith('rule:') && ' · נשלח אוטומטית'}
                    {m.via === 'meta' && ' · נשלח מאפליקציית מטא'}
                  </span>
                </li>
              ))}
            </ol>
            <form className="dm-compose" onSubmit={send}>
              {!conv.canDm && (
                <p className="dm-note" id="dm-window">
                  {conv.comment ? 'האדם הזה רק הגיב על פוסט. אפשר לשלוח לו הודעה פרטית אחת בתשובה לתגובה שלו.' : 'עברו יותר מ-24 שעות מההודעה האחרונה שלו, ולכן מטא לא מאפשרת לשלוח עכשיו. כשהוא יכתוב שוב, אפשר יהיה לענות.'}
                </p>
              )}
              <div className="dm-compose__row">
                <label className="dm-sr" htmlFor="dm-text">ההודעה</label>
                <textarea id="dm-text" className="dm-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} disabled={!canSend || sending} placeholder={canSend ? 'כתבו תשובה…' : ''} aria-describedby={!conv.canDm ? 'dm-window' : undefined}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e) }} />
                <button type="submit" className="dm-btn dm-btn--pri" disabled={!canSend || sending || !text.trim()}>{sending ? 'שולח…' : 'שליחה'}</button>
              </div>
              {snips.length > 0 && canSend && (
                <div className="dm-snips" role="group" aria-label="תשובות מוכנות">
                  {snips.map((s) => <button key={s.id} type="button" className="dm-chip" onClick={() => setText((x) => (x ? x + '\n' : '') + s.text.replace(/\{שם\}|\{name\}/g, (t.name || '').split(' ')[0]))}>{s.title}</button>)}
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- אוטומציות ---------------- */
function Rules({ accounts }) {
  const [rules, setRules] = useState(null)
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)
  const load = useCallback(() => dm('rules').then((d) => setRules(d.rules)).catch((e) => { setRules([]); toast.error(e.message) }), [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (edit) setTimeout(() => formRef.current?.querySelector('input,textarea')?.focus(), 0) }, [edit?.id, !!edit])

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await dm('rule_save', { rule: { ...edit, account_id: edit.account_id || null } }); toast.success('האוטומציה נשמרה'); setEdit(null); load() } catch (er) { toast.error(er.message) } finally { setBusy(false) }
  }
  const toggle = async (r) => {
    try { await dm('rule_save', { rule: { ...r, enabled: !r.enabled } }); load() } catch (er) { toast.error(er.message) }
  }
  const del = async (r) => {
    if (!window.confirm(`למחוק את האוטומציה "${r.name}"?`)) return
    try { await dm('rule_delete', { id: r.id }); toast.success('האוטומציה נמחקה'); load() } catch (er) { toast.error(er.message) }
  }
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const accName = (id) => { const a = accounts.find((x) => x.id === id); return a ? accLabel(a) : 'כל החשבונות' }

  return (
    <div className="dm-rules">
      <div className="dm-intro">
        <p>אוטומציות עונות רק למי שפנה אליכם קודם: הגיב על פוסט או שלח הודעה. כל אוטומציה עונה לכל אדם פעם אחת, ולא עונה בשיחה שבה השהיתם אותה.</p>
        {!edit && <button type="button" className="dm-btn dm-btn--pri" onClick={() => setEdit({ ...EMPTY_RULE })}>+ אוטומציה חדשה</button>}
      </div>

      {edit && (
        <form className="dm-card dm-form" ref={formRef} onSubmit={save} aria-labelledby="dm-form-h">
          <h2 id="dm-form-h">{edit.id ? 'עריכת אוטומציה' : 'אוטומציה חדשה'}</h2>
          {!edit.id && (
            <div className="dm-presets" role="group" aria-label="להתחיל מתבנית">
              <span className="dm-muted">להתחיל מתבנית:</span>
              {PRESETS.map((p) => <button key={p.name} type="button" className="dm-chip" onClick={() => setEdit({ ...EMPTY_RULE, ...p })}>{p.name}</button>)}
            </div>
          )}
          <fieldset className="dm-fs">
            <legend>מתי לשלוח</legend>
            {Object.entries(TRIGGERS).map(([k, v]) => (
              <label key={k} className="dm-radio"><input type="radio" name="trigger" value={k} checked={edit.trigger === k} onChange={set('trigger')} /><span><b>{v.label}</b><small>{v.hint}</small></span></label>
            ))}
          </fieldset>
          <div className="dm-grid2">
            {edit.trigger !== 'first_dm' && (
              <div className="dm-field">
                <label htmlFor="r-kw">מילות מפתח</label>
                <input id="r-kw" className="dm-input" value={edit.keywords} onChange={set('keywords')} aria-describedby="r-kw-h" placeholder="מחיר, פרטים" />
                <small id="r-kw-h">מפרידים בפסיק. השאירו ריק כדי לענות על כל {edit.trigger === 'comment' ? 'תגובה' : 'הודעה'}.</small>
              </div>
            )}
            <div className="dm-field">
              <label htmlFor="r-acc">באיזה חשבון</label>
              <select id="r-acc" className="dm-input" value={edit.account_id || ''} onChange={set('account_id')}>
                <option value="">כל החשבונות</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
              </select>
            </div>
            {edit.trigger === 'comment' && (
              <div className="dm-field">
                <label htmlFor="r-post">פוסט מסוים (לא חובה)</label>
                <input id="r-post" className="dm-input" dir="ltr" value={edit.post_id || ''} onChange={set('post_id')} aria-describedby="r-post-h" placeholder="קישור או מזהה של הפוסט" />
                <small id="r-post-h">השאירו ריק כדי שהאוטומציה תעבוד על כל הפוסטים.</small>
              </div>
            )}
          </div>
          <div className="dm-field">
            <label htmlFor="r-reply">ההודעה הפרטית שנשלחת</label>
            <textarea id="r-reply" className="dm-input" rows={3} required value={edit.reply_text} onChange={set('reply_text')} aria-describedby="r-reply-h" />
            <small id="r-reply-h">אפשר לכתוב {'{שם}'} והמערכת תכניס את השם הפרטי של הפונה.</small>
          </div>
          {edit.trigger === 'comment' && (
            <div className="dm-field">
              <label htmlFor="r-pub">תגובה ציבורית מתחת לתגובה (לא חובה)</label>
              <input id="r-pub" className="dm-input" value={edit.public_reply || ''} onChange={set('public_reply')} placeholder="שלחנו לך הודעה פרטית 🙂" />
            </div>
          )}
          <div className="dm-field">
            <label htmlFor="r-name">שם לאוטומציה</label>
            <input id="r-name" className="dm-input" value={edit.name} onChange={set('name')} placeholder="למשל: מחיר בתגובה" />
          </div>
          {edit.reply_text && (
            <div className="dm-preview" aria-label="תצוגה מקדימה">
              <span className="dm-muted">כך זה ייראה:</span>
              <p className="dm-msg dm-msg--out"><span>{edit.reply_text.replace(/\{שם\}|\{name\}/g, 'דנה')}</span></p>
            </div>
          )}
          <div className="dm-actions">
            <label className="dm-toggle"><input type="checkbox" role="switch" checked={edit.enabled} onChange={set('enabled')} /><span>{edit.enabled ? 'פעילה' : 'כבויה'}</span></label>
            <button type="button" className="dm-btn dm-btn--ghost" onClick={() => setEdit(null)}>ביטול</button>
            <button type="submit" className="dm-btn dm-btn--pri" disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</button>
          </div>
        </form>
      )}

      {rules === null ? <p className="dm-muted">טוען…</p> : !rules.length && !edit ? (
        <div className="dm-empty"><h2>אין עדיין אוטומציות</h2><p>התחילו מתבנית, למשל "מחיר בתגובה": מי שמגיב "מחיר" על פוסט מקבל הודעה פרטית עם פרטים.</p></div>
      ) : (
        <ul className="dm-rule-list">
          {rules.map((r) => (
            <li key={r.id} className={`dm-card dm-rule${r.enabled ? '' : ' dm-rule--off'}`}>
              <div className="dm-rule__main">
                <h3>{r.name}</h3>
                <p className="dm-muted">{TRIGGERS[r.trigger]?.short} · {accName(r.account_id)}{r.post_id ? ' · פוסט אחד' : ''}</p>
                {r.keywords?.length > 0 && <p className="dm-kws">{r.keywords.map((k) => <span key={k} className="dm-kw">{k}</span>)}</p>}
                <p className="dm-rule__reply">{r.reply_text}</p>
              </div>
              <div className="dm-rule__side">
                <span className="dm-stat"><b>{r.hits}</b> נשלחו</span>
                <label className="dm-toggle"><input type="checkbox" role="switch" checked={r.enabled} onChange={() => toggle(r)} aria-label={`הפעלה של ${r.name}`} /><span>{r.enabled ? 'פעילה' : 'כבויה'}</span></label>
                <button type="button" className="dm-btn dm-btn--ghost" onClick={() => setEdit({ ...r, keywords: (r.keywords || []).join(', '), account_id: r.account_id || '' })} aria-label={`עריכה של ${r.name}`}>עריכה</button>
                <button type="button" className="dm-btn dm-btn--ghost dm-btn--danger" onClick={() => del(r)} aria-label={`מחיקה של ${r.name}`}>מחיקה</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Snippets />
    </div>
  )
}

function Snippets() {
  const [list, setList] = useState([])
  const [f, setF] = useState({ title: '', text: '' })
  const load = useCallback(() => dm('snippets').then((d) => setList(d.snippets)).catch(() => {}), [])
  useEffect(() => { load() }, [load])
  const add = async (e) => {
    e.preventDefault()
    try { await dm('snippet_save', f); setF({ title: '', text: '' }); toast.success('התשובה המוכנה נשמרה'); load() } catch (er) { toast.error(er.message) }
  }
  const del = async (s) => { if (!window.confirm(`למחוק את "${s.title}"?`)) return; try { await dm('snippet_delete', { id: s.id }); load() } catch (er) { toast.error(er.message) } }
  return (
    <section className="dm-card dm-snipbox" aria-labelledby="dm-snip-h">
      <h2 id="dm-snip-h">תשובות מוכנות</h2>
      <p className="dm-muted">טקסטים קבועים שמכניסים לשיחה בלחיצה, כשעונים בעצמכם.</p>
      {list.length > 0 && (
        <ul className="dm-sniplist">
          {list.map((s) => <li key={s.id}><b>{s.title}</b><span>{s.text}</span><button type="button" className="dm-btn dm-btn--ghost dm-btn--danger" onClick={() => del(s)} aria-label={`מחיקה של ${s.title}`}>מחיקה</button></li>)}
        </ul>
      )}
      <form className="dm-snipform" onSubmit={add}>
        <div className="dm-field"><label htmlFor="s-t">כותרת</label><input id="s-t" className="dm-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={60} /></div>
        <div className="dm-field dm-field--grow"><label htmlFor="s-x">הטקסט</label><input id="s-x" className="dm-input" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required /></div>
        <button type="submit" className="dm-btn">הוספה</button>
      </form>
    </section>
  )
}

/* ---------------- חשבונות וחיבור ---------------- */
function Accounts({ st, reload }) {
  const [busy, setBusy] = useState('')
  const [app, setApp] = useState({ app_id: '', app_secret: '' })
  const [showApp, setShowApp] = useState(!st.app)

  const login = async () => {
    setBusy('login')
    // inside the content engine the screen is framed, and Facebook refuses to open in a frame: log in in a new tab
    const framed = window.top !== window.self
    const tab = framed ? window.open('', '_blank') : null
    try {
      const back = framed ? `${window.location.origin}/admin?tab=dm` : window.location.href.split('#')[0]
      const d = await dm('start', { back })
      if (tab) { tab.location.href = d.url; toast.info('ההתחברות נפתחה בלשונית חדשה. בסיום חוזרים לכאן ולוחצים "רענון"'); setBusy('') }
      else window.location.href = d.url
    } catch (e) { if (tab) tab.close(); toast.error(e.message); setBusy('') }
  }
  const logout = async (c) => {
    if (!window.confirm(`להתנתק מ"${c.name}"? העמודים שלו יפסיקו לקבל הודעות כאן, וההיסטוריה תישמר.`)) return
    setBusy('out:' + c.id)
    try { await dm('logout', { connection_id: c.id }); toast.success('ההתנתקות בוצעה'); await reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }
  const toggle = async (a) => {
    try { await dm('account', { id: a.id, enabled: !a.enabled }); await reload() } catch (e) { toast.error(e.message) }
  }
  const resub = async () => {
    setBusy('sub')
    try { const d = await dm('resubscribe'); const bad = Object.values(d.results).filter(Boolean); bad.length ? toast.error(bad[0]) : toast.success('כל העמודים מחוברים לקבלת הודעות'); await reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }
  const saveApp = async (e) => {
    e.preventDefault(); setBusy('app')
    try { await dm('config', app); setApp({ app_id: '', app_secret: '' }); setShowApp(false); toast.success('פרטי האפליקציה נשמרו'); await reload() } catch (er) { toast.error(er.message) } finally { setBusy('') }
  }
  const hookOk = st.lastHook && Date.now() - new Date(st.lastHook).getTime() < 14 * 864e5

  return (
    <div className="dm-accounts">
      <section className="dm-card" aria-labelledby="dm-con-h">
        <div className="dm-card__head">
          <h2 id="dm-con-h">חשבונות מחוברים</h2>
          <div className="dm-actions">
            <button type="button" className="dm-btn dm-btn--ghost" onClick={reload}>רענון</button>
            <button type="button" className="dm-btn dm-btn--pri" onClick={login} disabled={!st.app || busy === 'login'}>{busy === 'login' ? 'פותח את פייסבוק…' : st.connections.length ? '+ התחברות לחשבון נוסף' : 'התחברות עם פייסבוק'}</button>
          </div>
        </div>
        <p className="dm-muted">בחלון של פייסבוק מסמנים את כל העמודים ואת חשבונות האינסטגרם שרוצים לנהל כאן. כדי לחבר משתמש פייסבוק אחר, מתנתקים קודם מפייסבוק בדפדפן ונכנסים עם המשתמש השני.</p>
        {!st.connections.length ? <p className="dm-pad">עוד לא חובר חשבון.</p> : st.connections.map((c) => (
          <div key={c.id} className="dm-con">
            <div className="dm-con__head">
              <Avatar src={c.picture} name={c.name} />
              <div><b>{c.name || 'משתמש פייסבוק'}</b><span className="dm-muted"> · חובר ב-{new Date(c.connected_at).toLocaleDateString('he-IL')}</span></div>
              <button type="button" className="dm-btn dm-btn--ghost dm-btn--danger" onClick={() => logout(c)} disabled={busy === 'out:' + c.id}>{busy === 'out:' + c.id ? 'מתנתק…' : 'התנתקות'}</button>
            </div>
            <ul className="dm-acc-list">
              {c.accounts.map((a) => (
                <li key={a.id} className="dm-acc">
                  <Avatar src={a.picture} name={a.name} net={a.network} />
                  <div className="dm-acc__name"><b>{a.username ? '@' + a.username : a.name}</b><span className="dm-muted">{netName(a.network)}{a.username && a.name ? ' · ' + a.name : ''}</span>
                    {a.subscribed ? <span className="dm-ok">מקבל הודעות</span> : <span className="dm-warn">{a.sub_error || 'לא מחובר לקבלת הודעות'}</span>}
                  </div>
                  <label className="dm-toggle"><input type="checkbox" role="switch" checked={a.enabled} onChange={() => toggle(a)} aria-label={`אוטומציות פעילות ב-${a.username || a.name}`} /><span>{a.enabled ? 'פעיל' : 'כבוי'}</span></label>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {st.connections.length > 0 && <button type="button" className="dm-btn" onClick={resub} disabled={busy === 'sub'}>{busy === 'sub' ? 'מחבר…' : 'חיבור מחדש של קבלת ההודעות'}</button>}
      </section>

      <section className="dm-card" aria-labelledby="dm-setup-h">
        <h2 id="dm-setup-h">הגדרה חד־פעמית באפליקציה של מטא</h2>
        <ol className="dm-steps">
          <li className={st.app ? 'dm-step--done' : ''}>
            <b>אפליקציית מטא</b> {st.app ? <span className="dm-ok">מוגדרת{st.ownApp ? ' (אפליקציה נפרדת להודעות)' : ' (אותה אפליקציה של הפרסום)'}</span> : <span className="dm-warn">חסרה</span>}
            {!showApp && <button type="button" className="dm-link" onClick={() => setShowApp(true)}>{st.app ? 'החלפה לאפליקציה אחרת' : 'הגדרה'}</button>}
            {showApp && (
              <form className="dm-appform" onSubmit={saveApp}>
                <div className="dm-field"><label htmlFor="a-id">App ID</label><input id="a-id" className="dm-input" dir="ltr" inputMode="numeric" value={app.app_id} onChange={(e) => setApp({ ...app, app_id: e.target.value })} required /></div>
                <div className="dm-field"><label htmlFor="a-sec">App Secret</label><input id="a-sec" className="dm-input" dir="ltr" type="password" autoComplete="off" value={app.app_secret} onChange={(e) => setApp({ ...app, app_secret: e.target.value })} required /></div>
                <small className="dm-muted">נשמר בשרת בלבד ולא מוצג שוב. בפייסבוק: האפליקציה ← App settings ← Basic.</small>
                <div className="dm-actions"><button type="button" className="dm-btn dm-btn--ghost" onClick={() => setShowApp(false)}>ביטול</button><button type="submit" className="dm-btn dm-btn--pri" disabled={busy === 'app'}>שמירה</button></div>
              </form>
            )}
          </li>
          <li className={hookOk ? 'dm-step--done' : ''}>
            <b>Webhooks</b> {hookOk ? <span className="dm-ok">התקבל אירוע ב-{new Date(st.lastHook).toLocaleString('he-IL')}</span> : <span className="dm-warn">עוד לא התקבלו אירועים</span>}
            <p className="dm-muted">באפליקציה של מטא: Webhooks ← בוחרים Page ואז Instagram, ובכל אחד מדביקים את שני הערכים האלה:</p>
            <div className="dm-copy"><span>Callback URL</span><code dir="ltr">{st.webhook}</code><button type="button" className="dm-btn dm-btn--ghost" onClick={() => copy(st.webhook, 'הקישור')}>העתקה</button></div>
            <div className="dm-copy"><span>Verify token</span><code dir="ltr">{st.verifyToken}</code><button type="button" className="dm-btn dm-btn--ghost" onClick={() => copy(st.verifyToken, 'הקוד')}>העתקה</button></div>
            <p className="dm-muted">אחר כך מסמנים: ב-Page את <code dir="ltr">messages</code> ו-<code dir="ltr">feed</code>, וב-Instagram את <code dir="ltr">messages</code> ו-<code dir="ltr">comments</code>.</p>
          </li>
          <li>
            <b>כתובת החזרה של ההתחברות</b>
            <p className="dm-muted">ב-Facebook Login ← Settings ← Valid OAuth Redirect URIs מוסיפים:</p>
            <div className="dm-copy"><code dir="ltr">{st.redirect}</code><button type="button" className="dm-btn dm-btn--ghost" onClick={() => copy(st.redirect, 'הקישור')}>העתקה</button></div>
          </li>
        </ol>
        {st.lastError && <p className="dm-warn" role="status">השגיאה האחרונה ממטא: {st.lastError}</p>}
      </section>
    </div>
  )
}
