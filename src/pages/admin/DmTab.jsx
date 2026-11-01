import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { dm } from '../../lib/dm.js'
import { toast } from '../../lib/toast.js'
import './DmTab.css'

/* ============================================================
   DmTab — Kurkoos DM: הודעות ואוטומציות לאינסטגרם ולפייסבוק (בסגנון ManyChat).
   • שיחות: תיבה אחת לכל העמודים, או לחשבון אחד שבוחרים למעלה
   • אוטומציות: תגובה על פוסט או ריל עם מילה ← הודעה פרטית (עם כפתור ותגובה פומבית),
     תגובה לסטורי, הודעה עם מילה, ברוכים הבאים. בחירת פוסט מתוך גלריית החשבון
   • פעילות: כל מה שנשלח, מה שבתור (עד 150 בשעה לחשבון) ומה שנכשל
   • חשבונות: התחברות עם אינסטגרם או עם פייסבוק (כמה חשבונות), התנתקות, הפעלה וכיבוי
   התשובות האוטומטיות עונות רק למי שפנה קודם, פעם אחת לאדם.
   ============================================================ */

const ACC_KEY = 'kurkoos-dm-account'
const VIEWS = [['inbox', 'שיחות'], ['rules', 'אוטומציות'], ['activity', 'פעילות'], ['accounts', 'חשבונות וחיבור']]
const TRIGGERS = {
  comment: { label: 'מישהו מגיב על פוסט', short: 'תגובה על פוסט', hint: 'שולחים לו הודעה פרטית, ואפשר גם תגובה ציבורית מתחת לתגובה שלו' },
  story: { label: 'מישהו מגיב לסטורי', short: 'תגובה לסטורי', hint: 'מי שעונה לסטורי עם המילה מקבל הודעה, פעם אחת לכל אדם' },
  dm: { label: 'מישהו שולח הודעה', short: 'הודעה נכנסת', hint: 'עונים בהודעה, פעם אחת לכל אדם' },
  first_dm: { label: 'פונה חדש שולח הודעה ראשונה', short: 'הודעה ראשונה', hint: 'הודעת ברוכים הבאים, נשלחת רק בהודעה הראשונה של כל אדם' },
}
const PRESETS = [
  { name: 'מחיר בתגובה', trigger: 'comment', keywords: 'מחיר, כמה עולה, פרטים', reply_text: 'היי {שם}, תודה על ההתעניינות! אשמח לשלוח פרטים. מה מספר הטלפון שלך?', public_reply: 'שלחנו לך הודעה פרטית 🙂' },
  { name: 'ברוכים הבאים', trigger: 'first_dm', keywords: '', reply_text: 'היי {שם}, תודה שפנית לקבוצת קורקוס. נחזור אליך בהקדם. במה נוכל לעזור?', public_reply: '' },
  { name: 'קישור בכפתור', trigger: 'comment', keywords: 'קישור, לינק, מדריך', reply_text: 'היי {שם}, הנה המדריך שביקשת 👇', public_reply: 'שלחנו לך בפרטי 🙂\nנשלח בהודעה פרטית ✉️', button_text: 'למדריך', button_url: 'https://www.kurkoos-group.co.il/real-estate-guide' },
  { name: 'פגישה', trigger: 'dm', keywords: 'פגישה, לתאם, שיחה', reply_text: 'בשמחה! אפשר לבחור מועד לשיחה קצרה כאן, או להשאיר מספר ונחזור אליך.', public_reply: '' },
]
const EMPTY_RULE = { name: '', trigger: 'comment', keywords: '', account_id: '', post_id: '', media_label: '', media_thumb: '', reply_text: '', public_reply: '', button_text: '', button_url: '', enabled: true }

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
  // ?view=rules|activity|accounts opens a tab directly (the content engine links straight to them)
  const [view, setView] = useState(() => { try { const v = new URLSearchParams(window.location.search).get('view'); return VIEWS.some(([k]) => k === v) ? v : 'inbox' } catch { return 'inbox' } })
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
        {view === 'activity' && <Activity accounts={accounts} />}
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
        <p>אוטומציות עונות רק למי שפנה אליכם קודם: הגיב על פוסט, ענה לסטורי או שלח הודעה. כל אוטומציה עונה לכל אדם פעם אחת, ולא עונה בשיחה שבה השהיתם אותה. אוטומציה של פוסט מסוים קודמת לאוטומציה של כל הפוסטים.</p>
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
                <small id="r-kw-h">מפרידים בפסיק. מילה שלמה, גם עם ו/ה/ל/ב/ש לפניה ("לפרטים" עונה על "פרטים"). ריק = עונים על כל {edit.trigger === 'comment' ? 'תגובה' : 'הודעה'}.</small>
              </div>
            )}
            <div className="dm-field">
              <label htmlFor="r-acc">באיזה חשבון</label>
              <select id="r-acc" className="dm-input" value={edit.account_id || ''} onChange={(e) => setEdit({ ...edit, account_id: e.target.value, post_id: '', media_label: '', media_thumb: '' })}>
                <option value="">כל החשבונות</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
              </select>
            </div>
          </div>
          {edit.trigger === 'comment' && <MediaPicker accounts={accounts} edit={edit} setEdit={setEdit} />}
          <div className="dm-field">
            <label htmlFor="r-reply">ההודעה הפרטית שנשלחת</label>
            <textarea id="r-reply" className="dm-input" rows={3} required value={edit.reply_text} onChange={set('reply_text')} aria-describedby="r-reply-h" />
            <small id="r-reply-h">אפשר לכתוב {'{שם}'} והמערכת תכניס את השם הפרטי של הפונה.</small>
          </div>
          <fieldset className="dm-fs dm-fs--box">
            <legend>כפתור בהודעה (לא חובה)</legend>
            <small className="dm-muted">במקום קישור ארוך, מופיע כפתור לחיץ מתחת להודעה. אם מטא לא מקבלת את הכפתור, הקישור נשלח בסוף ההודעה.</small>
            <div className="dm-grid2">
              <div className="dm-field"><label htmlFor="r-btxt">הטקסט על הכפתור</label><input id="r-btxt" className="dm-input" maxLength={20} value={edit.button_text || ''} onChange={set('button_text')} placeholder="למדריך" /></div>
              <div className="dm-field"><label htmlFor="r-burl">לאן הכפתור מוביל</label><input id="r-burl" className="dm-input" dir="ltr" type="url" inputMode="url" value={edit.button_url || ''} onChange={set('button_url')} placeholder="https://" /></div>
            </div>
          </fieldset>
          {edit.trigger === 'comment' && (
            <div className="dm-field">
              <label htmlFor="r-pub">תגובה פומבית מתחת לתגובה שלו (לא חובה)</label>
              <textarea id="r-pub" className="dm-input" rows={2} value={edit.public_reply || ''} onChange={set('public_reply')} aria-describedby="r-pub-h" placeholder="שלחנו לך הודעה פרטית 🙂" />
              <small id="r-pub-h">כמה נוסחים, אחד בכל שורה, ונבחר אחד באקראי. כך התגובות לא נראות זהות.</small>
            </div>
          )}
          <div className="dm-field">
            <label htmlFor="r-name">שם לאוטומציה</label>
            <input id="r-name" className="dm-input" value={edit.name} onChange={set('name')} placeholder="למשל: מחיר בתגובה" />
          </div>
          {edit.reply_text && (
            <div className="dm-preview" aria-label="תצוגה מקדימה">
              <span className="dm-muted">כך זה ייראה:</span>
              <div className="dm-msg dm-msg--out">
                <p>{edit.reply_text.replace(/\{שם\}|\{name\}/g, 'דנה').replace(/@?\{username\}/g, '@dana')}</p>
                {edit.button_url && <span className="dm-msg__btn">{edit.button_text || 'לפתיחה'}</span>}
              </div>
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
              {r.media_thumb && <img className="dm-rule__thumb" src={r.media_thumb} alt={r.media_label || 'הפוסט של האוטומציה'} loading="lazy" />}
              <div className="dm-rule__main">
                <h3>{r.name}</h3>
                <p className="dm-muted">{TRIGGERS[r.trigger]?.short} · {accName(r.account_id)}{r.post_id ? ` · ${r.media_label ? '"' + r.media_label.slice(0, 40) + '"' : 'פוסט אחד'}` : r.trigger === 'comment' ? ' · כל הפוסטים' : ''}{r.button_url ? ' · עם כפתור' : ''}</p>
                {r.keywords?.length > 0 && <p className="dm-kws">{r.keywords.map((k) => <span key={k} className="dm-kw">{k}</span>)}</p>}
                <p className="dm-rule__reply">{r.reply_text}</p>
              </div>
              <div className="dm-rule__side">
                <span className="dm-stat"><b>{r.hits}</b> נשלחו</span>
                <label className="dm-toggle"><input type="checkbox" role="switch" checked={r.enabled} onChange={() => toggle(r)} aria-label={`הפעלה של ${r.name}`} /><span>{r.enabled ? 'פעילה' : 'כבויה'}</span></label>
                <button type="button" className="dm-btn dm-btn--ghost" onClick={() => setEdit({ ...EMPTY_RULE, ...r, keywords: (r.keywords || []).join(', '), account_id: r.account_id || '', post_id: r.post_id || '', media_label: r.media_label || '', media_thumb: r.media_thumb || '', public_reply: r.public_reply || '', button_text: r.button_text || '', button_url: r.button_url || '' })} aria-label={`עריכה של ${r.name}`}>עריכה</button>
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

/* הגלריה: הפוסטים והרילס של החשבון, כדי לבחור על איזה מהם האוטומציה עובדת */
const MEDIA_TYPE = { REELS: 'ריל', VIDEO: 'סרטון', CAROUSEL_ALBUM: 'קרוסלה', FEED: 'פוסט', IMAGE: 'פוסט', STORY: 'סטורי' }
function MediaPicker({ accounts, edit, setEdit }) {
  const accId = edit.account_id || (accounts.length === 1 ? accounts[0].id : '')
  const [media, setMedia] = useState(null)
  const [err, setErr] = useState('')
  const [manual, setManual] = useState(false)
  useEffect(() => {
    if (!accId) { setMedia(null); return }
    let live = true
    setMedia(null); setErr('')
    dm('media', { account_id: accId }).then((d) => live && setMedia(d.media)).catch((e) => { if (live) { setErr(e.message); setMedia([]) } })
    return () => { live = false }
  }, [accId])
  const pick = (m) => setEdit({ ...edit, account_id: edit.account_id || accId, post_id: m ? m.id : '', media_label: m ? (m.caption || MEDIA_TYPE[m.type] || 'פוסט') : '', media_thumb: m ? m.thumb || '' : '' })
  return (
    <fieldset className="dm-fs dm-fs--box">
      <legend>על איזה פוסט או ריל?</legend>
      {!accId ? <p className="dm-muted">כדי לבחור פוסט מסוים, בוחרים קודם חשבון. בלי בחירה, האוטומציה עובדת על כל הפוסטים בכל החשבונות.</p> : (
        <>
          {err && <p className="dm-warn" role="status">{err}</p>}
          {media === null ? <p className="dm-muted">טוען את הפוסטים…</p> : (
            <div className="dm-gallery" role="radiogroup" aria-label="בחירת פוסט">
              <label className={`dm-gal${!edit.post_id ? ' dm-gal--on' : ''}`}>
                <input type="radio" name="media" checked={!edit.post_id} onChange={() => pick(null)} />
                <span className="dm-gal__all">כל הפוסטים והרילס</span>
              </label>
              {media.map((m) => (
                <label key={m.id} className={`dm-gal${edit.post_id === m.id ? ' dm-gal--on' : ''}`} title={m.caption || ''}>
                  <input type="radio" name="media" checked={edit.post_id === m.id} onChange={() => pick(m)} aria-label={`${MEDIA_TYPE[m.type] || 'פוסט'}: ${m.caption ? m.caption.slice(0, 60) : 'בלי כיתוב'}${m.at ? ', ' + new Date(m.at).toLocaleDateString('he-IL') : ''}`} />
                  {m.thumb ? <img src={m.thumb} alt="" loading="lazy" /> : <span className="dm-gal__none">אין תמונה</span>}
                  <span className="dm-gal__type">{MEDIA_TYPE[m.type] || 'פוסט'}</span>
                  {m.at && <span className="dm-gal__date">{new Date(m.at).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>}
                </label>
              ))}
            </div>
          )}
        </>
      )}
      {edit.post_id && edit.media_label && <p className="dm-muted">נבחר: {edit.media_label.slice(0, 90)}</p>}
      <button type="button" className="dm-link" aria-expanded={manual} onClick={() => setManual(!manual)}>{manual ? 'הסתרה' : 'יש לי קישור לפוסט'}</button>
      {manual && (
        <div className="dm-field">
          <label htmlFor="r-post">קישור או מזהה של הפוסט</label>
          <input id="r-post" className="dm-input" dir="ltr" value={edit.post_id || ''} onChange={(e) => setEdit({ ...edit, post_id: e.target.value, media_label: '', media_thumb: '' })} placeholder="https://www.instagram.com/p/…" />
        </div>
      )}
    </fieldset>
  )
}

/* ---------------- פעילות ---------------- */
const Q_STATUS = { sent: ['נשלח', 'ok'], pending: ['בתור', 'wait'], sending: ['נשלח עכשיו', 'wait'], failed: ['נכשל', 'bad'] }
function Activity({ accounts }) {
  const [d, setD] = useState(null)
  const load = useCallback(() => dm('activity').then(setD).catch((e) => { setD({ items: [] }); toast.error(e.message) }), [])
  useEffect(() => { load(); const i = setInterval(() => { if (document.visibilityState === 'visible') load() }, 20000); return () => clearInterval(i) }, [load])
  const retry = async (it) => { try { await dm('retry', { id: it.id }); toast.success('נשלח שוב לתור'); load() } catch (e) { toast.error(e.message) } }
  if (!d) return <p className="dm-muted">טוען…</p>
  const pending = d.items.filter((x) => x.status === 'pending').length
  const acc = (id) => accounts.find((a) => a.id === id)
  return (
    <div className="dm-activity">
      <div className="dm-kpis" role="group" aria-label="סיכום">
        <div className="dm-kpi"><b>{d.sentLastHour ?? 0}</b><span>נשלחו בשעה האחרונה (עד {d.maxPerHour || 150} לחשבון)</span></div>
        <div className="dm-kpi"><b>{pending}</b><span>מחכות בתור ויישלחו תוך כמה דקות</span></div>
        <div className="dm-kpi"><b>{d.items.filter((x) => x.status === 'failed').length}</b><span>נכשלו מתוך 80 האחרונות</span></div>
        <button type="button" className="dm-btn dm-btn--ghost" onClick={load}>רענון</button>
      </div>
      {!d.items.length ? <div className="dm-empty"><h2>עוד לא נשלח כלום</h2><p>כשמישהו יגיב או יכתוב עם אחת ממילות המפתח, ההודעה שנשלחה תופיע כאן.</p></div> : (
        <ul className="dm-act-list">
          {d.items.map((it) => {
            const [label, tone] = Q_STATUS[it.status] || [it.status, 'wait']
            const a = acc(it.account_id)
            return (
              <li key={it.id} className="dm-act">
                <span className={`dm-pill dm-pill--${tone}`}>{label}</span>
                <div className="dm-act__body">
                  <p><b>{it.person_name || 'פונה'}</b> {it.kind === 'comment' ? 'הגיב' : 'כתב'}: "{it.incoming}"</p>
                  <p className="dm-muted">{it.rule_name ? `אוטומציה: ${it.rule_name}` : 'אוטומציה שנמחקה'}{a ? ` · ${accLabel(a)}` : ''} · <time dateTime={it.created_at}>{new Date(it.created_at).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></p>
                  {it.error && <p className="dm-warn">{it.error}</p>}
                </div>
                {it.status === 'failed' && <button type="button" className="dm-btn dm-btn--ghost" onClick={() => retry(it)} aria-label={`לשלוח שוב ל${it.person_name || 'פונה'}`}>לשלוח שוב</button>}
              </li>
            )
          })}
        </ul>
      )}
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
function CopyRow({ label, value, what }) {
  return <div className="dm-copy">{label && <span>{label}</span>}<code dir="ltr">{value}</code><button type="button" className="dm-btn dm-btn--ghost" onClick={() => copy(value, what)} aria-label={`העתקה של ${label || what}`}>העתקה</button></div>
}
function AppForm({ action, idLabel, secretLabel, where, onDone, onCancel }) {
  const [f, setF] = useState({ app_id: '', app_secret: '' })
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await dm(action, f); setF({ app_id: '', app_secret: '' }); toast.success('נשמר'); onDone() } catch (er) { toast.error(er.message) } finally { setBusy(false) }
  }
  return (
    <form className="dm-appform" onSubmit={save}>
      <div className="dm-field"><label htmlFor={`${action}-id`}>{idLabel}</label><input id={`${action}-id`} className="dm-input" dir="ltr" inputMode="numeric" autoComplete="off" value={f.app_id} onChange={(e) => setF({ ...f, app_id: e.target.value })} required /></div>
      <div className="dm-field"><label htmlFor={`${action}-sec`}>{secretLabel}</label><input id={`${action}-sec`} className="dm-input" dir="ltr" type="password" autoComplete="off" value={f.app_secret} onChange={(e) => setF({ ...f, app_secret: e.target.value })} required /></div>
      <small className="dm-muted">{where} נשמר בשרת בלבד, לא מוצג שוב ולא נשלח לשום מקום אחר. לא מדביקים אותו בצ'אט.</small>
      <div className="dm-actions">{onCancel && <button type="button" className="dm-btn dm-btn--ghost" onClick={onCancel}>ביטול</button>}<button type="submit" className="dm-btn dm-btn--pri" disabled={busy}>שמירה</button></div>
    </form>
  )
}

function Accounts({ st, reload }) {
  const [busy, setBusy] = useState('')
  const [showFb, setShowFb] = useState(false)
  const [showIg, setShowIg] = useState(!st.igApp)

  // inside the content engine the screen is framed, and Facebook and Instagram refuse to open in a frame: log in in a new tab
  const login = async (kind) => {
    setBusy(kind)
    const framed = window.top !== window.self
    const tab = framed ? window.open('', '_blank') : null
    try {
      const back = framed ? `${window.location.origin}/admin?tab=dm` : window.location.href.split('#')[0]
      const d = await dm(kind === 'ig' ? 'ig_start' : 'start', { back })
      if (tab) { tab.location.href = d.url; toast.info('ההתחברות נפתחה בלשונית חדשה. בסיום חוזרים לכאן ולוחצים "רענון"'); setBusy('') }
      else window.location.href = d.url
    } catch (e) { if (tab) tab.close(); toast.error(e.message); setBusy('') }
  }
  const logout = async (c) => {
    if (!window.confirm(`להתנתק מ"${c.name}"? ${c.kind === 'instagram' ? 'החשבון' : 'העמודים שלו'} יפסיקו לקבל הודעות ואוטומציות כאן. ההיסטוריה נשמרת.`)) return
    setBusy('out:' + c.id)
    try { await dm('logout', { connection_id: c.id }); toast.success('ההתנתקות בוצעה'); await reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }
  const toggle = async (a) => {
    try { await dm('account', { id: a.id, enabled: !a.enabled }); await reload() } catch (e) { toast.error(e.message) }
  }
  const resub = async () => {
    setBusy('sub')
    try { const d = await dm('resubscribe'); const bad = Object.values(d.results).filter(Boolean); bad.length ? toast.error(bad[0]) : toast.success('כל החשבונות מחוברים לקבלת הודעות'); await reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }
  const hookOk = st.lastHook && Date.now() - new Date(st.lastHook).getTime() < 14 * 864e5

  return (
    <div className="dm-accounts">
      <section className="dm-card" aria-labelledby="dm-con-h">
        <div className="dm-card__head">
          <h2 id="dm-con-h">חשבונות מחוברים</h2>
          <button type="button" className="dm-btn dm-btn--ghost" onClick={reload}>רענון</button>
        </div>
        <div className="dm-connect">
          <div className="dm-connect__opt">
            <span className="dm-connect__ico dm-connect__ico--ig"><NetIcon net="instagram" size={20} /></span>
            <div><b>התחברות עם אינסטגרם</b><small>מומלץ לאינסטגרם. חשבון מקצועי (עסקי או יוצר), גם בלי עמוד פייסבוק</small></div>
            <button type="button" className="dm-btn dm-btn--pri" onClick={() => login('ig')} disabled={!st.igApp || busy === 'ig'}>{busy === 'ig' ? 'פותח…' : 'התחברות'}</button>
          </div>
          <div className="dm-connect__opt">
            <span className="dm-connect__ico dm-connect__ico--fb"><NetIcon net="facebook" size={20} /></span>
            <div><b>התחברות עם פייסבוק</b><small>עמודי פייסבוק (Messenger ותגובות), וחשבונות אינסטגרם שמקושרים אליהם</small></div>
            <button type="button" className="dm-btn" onClick={() => login('fb')} disabled={!st.app || busy === 'fb'}>{busy === 'fb' ? 'פותח…' : 'התחברות'}</button>
          </div>
        </div>
        <p className="dm-muted">כל התחברות נוספת מוסיפה חשבונות, ובראש המסך עוברים ביניהם. כדי לחבר משתמש אחר, מתנתקים קודם ממנו באינסטגרם או בפייסבוק בדפדפן.</p>
        {!st.connections.length ? <p className="dm-pad">עוד לא חובר חשבון.</p> : st.connections.map((c) => (
          <div key={c.id} className="dm-con">
            <div className="dm-con__head">
              <Avatar src={c.picture} name={c.name} net={c.kind} />
              <div><b>{c.name || 'חשבון'}</b><span className="dm-muted"> · {c.kind === 'instagram' ? 'התחברות אינסטגרם' : 'התחברות פייסבוק'} · {new Date(c.connected_at).toLocaleDateString('he-IL')}</span></div>
              <button type="button" className="dm-btn dm-btn--ghost dm-btn--danger" onClick={() => logout(c)} disabled={busy === 'out:' + c.id}>{busy === 'out:' + c.id ? 'מתנתק…' : 'התנתקות'}</button>
            </div>
            <ul className="dm-acc-list">
              {c.accounts.map((a) => (
                <li key={a.id} className="dm-acc">
                  <Avatar src={a.picture} name={a.name} net={a.network} />
                  <div className="dm-acc__name"><b>{a.username ? '@' + a.username : a.name}</b><span className="dm-muted">{netName(a.network)}{a.username && a.name ? ' · ' + a.name : ''}</span>
                    {a.subscribed ? <span className="dm-ok">מקבל הודעות</span> : <span className="dm-warn">{a.sub_error || 'לא מחובר לקבלת הודעות'}</span>}
                    {a.token_error && <span className="dm-warn">{a.token_error}</span>}
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
        <h2 id="dm-setup-h">הקמה חד־פעמית באפליקציה של מטא</h2>
        <p className="dm-muted">עושים פעם אחת, ב-developers.facebook.com. שמות הכפתורים כתובים כמו שהם מופיעים במסך, באנגלית.</p>
        <ol className="dm-steps">
          <li className={st.igApp ? 'dm-step--done' : ''}>
            <b>אפליקציה לאינסטגרם</b> {st.igApp ? <span className="dm-ok">מוגדרת</span> : <span className="dm-warn">חסרה</span>}
            <p className="dm-muted">My Apps ← Create App. ב-Use case בוחרים Manage messaging &amp; content on Instagram ומשייכים לתיק העסקי. אחר כך API setup with Instagram login ← Add all required permissions. באותו מסך מופיעים Instagram app ID ו-Instagram app secret. זה לא ה-App ID הרגיל של מטא.</p>
            {!showIg ? <button type="button" className="dm-link" onClick={() => setShowIg(true)}>החלפת הפרטים</button>
              : <AppForm action="ig_config" idLabel="Instagram app ID" secretLabel="Instagram app secret" where="ה-secret" onDone={() => { setShowIg(false); reload() }} onCancel={st.igApp ? () => setShowIg(false) : null} />}
          </li>
          <li className={hookOk ? 'dm-step--done' : ''}>
            <b>Webhooks</b> {hookOk ? <span className="dm-ok">התקבל אירוע ב-{new Date(st.lastHook).toLocaleString('he-IL')}</span> : <span className="dm-warn">עוד לא התקבלו אירועים</span>}
            <p className="dm-muted">ב-Configure webhooks מדביקים את שני הערכים, לוחצים Verify and save, ואז Subscribe ל-comments ול-messages. בעמוד פייסבוק (Webhooks ← Page): messages ו-feed.</p>
            <CopyRow label="Callback URL" value={st.webhook} what="הקישור" />
            <CopyRow label="Verify token" value={st.verifyToken} what="הקוד" />
          </li>
          <li>
            <b>כתובות החזרה של ההתחברות</b>
            <p className="dm-muted">ב-Set up Instagram business login ← Redirect URL:</p>
            <CopyRow value={st.igRedirect} what="הקישור" />
            <p className="dm-muted">ואם מתחברים גם עם פייסבוק: Facebook Login ← Settings ← Valid OAuth Redirect URIs:</p>
            <CopyRow value={st.redirect} what="הקישור" />
          </li>
          <li>
            <b>פרטיות ומחיקת מידע</b>
            <p className="dm-muted">App settings ← Basic: מדביקים את שתי הכתובות, מוסיפים אייקון וקטגוריה ולוחצים Save changes.</p>
            <CopyRow label="Privacy Policy URL" value={st.privacyUrl} what="הקישור" />
            <CopyRow label="User data deletion" value={st.deletionUrl} what="הקישור" />
          </li>
          <li>
            <b>בודק ופרסום</b>
            <p className="dm-muted">App roles ← Roles: מוסיפים את חשבון האינסטגרם כ-Instagram Tester, ומאשרים בדפדפן במחשב (לא באפליקציה) ב-instagram.com/accounts/manage_access, בלשונית Tester invites. אחר כך Publish בתפריט האפליקציה, ומתחברים כאן למעלה.</p>
          </li>
          <li>
            <b>בדיקה</b>
            <p className="dm-muted">יוצרים אוטומציה, ומגיבים את המילה מחשבון אחר שאינו הבודק. התוצאה מופיעה בלשונית "פעילות". לא להפעיל את אותה מילה גם במניצ'ט או בכלי אחר, אחרת יישלחו שתי הודעות.</p>
          </li>
          <li className={st.app ? 'dm-step--done' : ''}>
            <b>אפליקציה לפייסבוק (לא חובה)</b> {st.app ? <span className="dm-ok">מוגדרת{st.ownApp ? '' : ' (אפליקציית הפרסום)'}</span> : <span className="dm-muted">לא מוגדרת</span>}
            <p className="dm-muted">רק לעמודי פייסבוק וה-Messenger שלהם. App settings ← Basic ← App ID ו-App Secret.</p>
            {!showFb ? <button type="button" className="dm-link" onClick={() => setShowFb(true)}>{st.app ? 'החלפת הפרטים' : 'הגדרה'}</button>
              : <AppForm action="config" idLabel="App ID" secretLabel="App Secret" where="ה-App Secret" onDone={() => { setShowFb(false); reload() }} onCancel={() => setShowFb(false)} />}
          </li>
        </ol>
        {st.lastError && <p className="dm-warn" role="status">השגיאה האחרונה ממטא: {st.lastError}</p>}
        <p className="dm-muted dm-honest">אף אחד לא יכול להבטיח מה מטא תעשה: היא יכולה לשנות כללים, לבקש בדיקה של האפליקציה (App Review) או להגביל אותה. כשהאפליקציה בתיק העסקי ופועלת על החשבונות שלכם, זה עובד בדרך כלל גם בלי App Review.</p>
      </section>
    </div>
  )
}
