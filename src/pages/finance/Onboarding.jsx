import { useState } from 'react'
import * as api from './api.js'
import { supabase } from '../../lib/supabase.js'
import { ProviderLogo } from './logos.jsx'
import { Icon } from './ui.jsx'
import { normalizePhone, validMobile } from './phone.js'

/* The first visit of a new member, two short steps:
   1. name and the phone that will send receipts on WhatsApp (registered as a scanner right away);
   2. connect the inbox they signed in with (the existing Gmail / Microsoft connection), another inbox, or later.
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
  const connect = async (prov) => {
    setErr(''); setBusy(true)
    try {
      await api.finishOnboarding(name.trim())
      const { url } = await api.callServer('auth-url', { provider: prov })
      window.location.assign(url)
    } catch (er) { setErr(er.message); setBusy(false) }
  }
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
            {err && <p className="fin-error" role="alert">{err}</p>}
            <button type="button" className="fin-btn fin-btn--primary" onClick={() => connect(provider)} disabled={busy}>{busy ? 'מעביר…' : 'לחבר את התיבה הזו'}</button>
            <button type="button" className="fin-btn" onClick={() => connect(provider === 'gmail' ? 'outlook' : 'gmail')} disabled={busy}>תיבה אחרת ({provider === 'gmail' ? 'Outlook' : 'Gmail'})</button>
            <button type="button" className="fin-link" onClick={finish} disabled={busy}>לא עכשיו</button>
            <p className="fin-onb__trust"><Icon name="shield" size={16} /> הרשאת קריאה בלבד: לא שולחים, לא מוחקים, ואפשר לנתק בכל רגע.</p>
          </div>
        )}
        <div className="fin-onb__foot"><button type="button" className="fin-link" onClick={signOut}>יציאה</button></div>
      </div>
    </div>
  )
}
