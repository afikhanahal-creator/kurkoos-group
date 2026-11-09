import { useEffect, useState } from 'react'
import * as api from './api.js'
import { supabase } from '../../lib/supabase.js'
import { ProviderLogo } from './logos.jsx'
import { Icon } from './ui.jsx'
import { normalizePhone, validMobile } from './phone.js'

/* The first visit of a new member, two short steps:
   1. name and the phone that will send receipts on WhatsApp (registered as a scanner right away);
   2. connect the inbox they signed in with, another Gmail (Google's account picker, optionally a given address), Outlook /
      Microsoft 365, or later. Connections the server has not switched on show as unavailable before anyone clicks.
   Every step can be skipped; the welcome never shows again once finished (fin_finish_onboarding). */
const providerOf = (user) => {
  const p = user?.app_metadata?.provider
  if (p === 'google') return 'gmail'
  if (p === 'azure') return 'outlook'
  const domain = String(user?.email || '').split('@')[1] || ''
  return /gmail\.com|googlemail\.com/.test(domain) ? 'gmail' : /outlook\.|hotmail\.|live\.com/.test(domain) ? 'outlook' : 'gmail'
}

export default function Onboarding({ session, sec, onDone }) {
  const user = session?.user
  const first = String(sec?.full_name || user?.user_metadata?.full_name || '').trim()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(first)
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const provider = providerOf(user)
  const label = provider === 'outlook' ? 'Outlook' : 'Gmail'
  const initial = (name || user?.email || '?').trim().slice(0, 1).toUpperCase()

  const next = async (e) => {
    e.preventDefault(); setErr('')
    const p = normalizePhone(phone)
    if (phone.trim() && !validMobile(p)) { setErr('מספר נייד לא תקין. למשל 054-3049491'); return }
    setBusy(true)
    try {
      if (phone.trim()) {
        await api.saveRow('fin_whatsapp_senders', { phone: p, label: name.trim() || null, user_id: user.id, created_by: user.id }).catch((er) => { if (!/unique|duplicate/i.test(er.message)) throw er })
      }
      setStep(2)
    } catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  const finish = async () => { await api.finishOnboarding(name.trim()).catch(() => {}); onDone() }
  // which mail connections the server has switched on (null while asking)
  const [ready, setReady] = useState(null)
  useEffect(() => { if (step === 2 && ready === null) api.callServer('status').then((r) => setReady(r?.providers || {})).catch(() => setReady({})) }, [step, ready])
  const [other, setOther] = useState('')          // '' | 'gmail' (the "another Gmail" form is open)
  const [otherEmail, setOtherEmail] = useState('')
  const connect = async (prov, opts = {}) => {
    setErr(''); setBusy(`${prov}${opts.choose ? '-other' : ''}`)
    try {
      await api.finishOnboarding(name.trim())
      const { url } = await api.callServer('auth-url', { provider: prov, ...opts })
      window.location.assign(url)
    } catch (er) { setErr(er.message); setBusy(false) }
  }
  const off = (prov) => ready !== null && ready[prov] === false
  const OffNote = ({ prov }) => (off(prov) ? <small className="fin-onb__off">{prov === 'gmail' ? 'Gmail' : 'Outlook'} עוד לא הופעל במערכת. מנהל המערכת יכול להפעיל אותו; בינתיים אפשר להמשיך בלי.</small> : null)
  const signOut = () => supabase.auth.signOut()

  return (
    <div className="fin-login fin-onb" dir="rtl">
      <div className="fin-onb__card">
        <div className="fin-onb__progress" aria-label={`שלב ${step} מתוך 2`}>
          <span className="fin-onb__steps">שלב {step} מתוך 2</span>
          <i className="is-on" /><i className={step === 2 ? 'is-on' : ''} />
        </div>
        {step === 1 ? (
          <form className="fin-onb__body" onSubmit={next} noValidate>
            <h1>{first ? `נעים להכיר, ${first.split(' ')[0]}` : 'נעים להכיר'}</h1>
            <p className="fin-auth__sub">כמה פרטים, ואנחנו מוכנים.</p>
            <div className="fin-onb__who">
              <span className="fin-onb__avatar" aria-hidden="true">{initial}</span>
              <span className="fin-onb__who-text"><strong>{name || user?.email}</strong><small dir="ltr">{user?.email}</small></span>
            </div>
            <label>השם שלך<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="כפי שיופיע ביומן ובמיילים" /></label>
            <label>הטלפון שלך ל-WhatsApp (לא חובה)
              <input type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" autoComplete="tel" />
              <small>מהמספר הזה תוכלו לשלוח לנו צילום של קבלה או PDF, והוא ייכנס למערכת לבד.</small>
            </label>
            {err && <p className="fin-error" role="alert">{err}</p>}
            <button type="submit" className="fin-btn fin-btn--primary" disabled={busy}>{busy ? 'רגע…' : 'המשך'}</button>
          </form>
        ) : (
          <div className="fin-onb__body">
            <h1>לאסוף חשבוניות מהמייל?</h1>
            <p className="fin-auth__sub">המערכת תעבור על המיילים של 3 החודשים האחרונים, תמצא חשבוניות וקבלות ותסדר אותן לבד. הסריקה הראשונה רצה בלילה; מכאן והלאה כל חשבונית חדשה במייל תיאסף בלי שתעשו כלום.</p>
            <div className="fin-onb__who is-mail">
              <span className="fin-onb__avatar" aria-hidden="true">{initial}</span>
              <span className="fin-onb__who-text"><strong>{name || user?.email}</strong><small dir="ltr">{user?.email}</small></span>
              <span className="fin-onb__prov"><ProviderLogo name={provider} size={18} /> {label}</span>
            </div>
            <button type="button" className="fin-btn fin-btn--primary" onClick={() => connect(provider, { hint: user?.email })} disabled={!!busy || off(provider)}>{busy === provider ? 'מעביר…' : 'לחבר את התיבה הזו'}</button>
            <OffNote prov={provider} />

            <div className="fin-onb__or"><span>או תיבה אחרת</span></div>
            <ul className="fin-onb__opts">
              <li className={other === 'gmail' ? 'is-open' : ''}>
                <button type="button" className="fin-onb__opt" onClick={() => setOther((v) => (v === 'gmail' ? '' : 'gmail'))} aria-expanded={other === 'gmail'} disabled={off('gmail')}>
                  <ProviderLogo name="gmail" size={20} /><span><strong>תיבת Gmail אחרת</strong><small>למשל תיבת החשבוניות של המשרד</small></span><Icon name="chev" size={16} />
                </button>
                {other === 'gmail' && (
                  <form className="fin-onb__other" onSubmit={(e) => { e.preventDefault(); connect('gmail', { choose: true, hint: otherEmail.trim() }) }}>
                    <label>הכתובת (לא חובה)<input type="email" dir="ltr" inputMode="email" value={otherEmail} onChange={(e) => setOtherEmail(e.target.value)} placeholder="invoices@company.co.il" autoComplete="off" /></label>
                    <small>ב-Google תופיע רשימת החשבונות: בוחרים את התיבה, או "שימוש בחשבון אחר" ומתחברים אליה.</small>
                    <button type="submit" className="fin-btn" disabled={!!busy}>{busy === 'gmail-other' ? 'מעביר…' : 'המשך ל-Google'}</button>
                  </form>
                )}
                <OffNote prov={provider === 'gmail' ? '' : 'gmail'} />
              </li>
              <li>
                <button type="button" className="fin-onb__opt" onClick={() => connect('outlook', { choose: true })} disabled={!!busy || off('outlook')}>
                  <ProviderLogo name="outlook" size={20} /><span><strong>Outlook / Microsoft 365</strong><small>{off('outlook') ? 'עוד לא הופעל במערכת' : 'תיבה של החברה או תיבה אישית'}</small></span><Icon name="chev" size={16} />
                </button>
              </li>
            </ul>
            {err && <p className="fin-error" role="alert">{err}</p>}
            <p className="fin-onb__later">אפשר לחבר עוד תיבות בכל זמן, מ"חשבונות אימייל".</p>
            <button type="button" className="fin-link" onClick={finish} disabled={!!busy}>לא עכשיו</button>
            <p className="fin-onb__trust"><Icon name="shield" size={16} /> הרשאת קריאה בלבד: לא שולחים, לא מוחקים, ואפשר לנתק בכל רגע.</p>
          </div>
        )}
        <div className="fin-onb__foot"><button type="button" className="fin-link" onClick={signOut}>יציאה</button></div>
      </div>
    </div>
  )
}
