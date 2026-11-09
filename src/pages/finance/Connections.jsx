import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ago } from './format.js'
import { ProviderLogo } from './logos.jsx'
import { Icon, InfoTip, Pill, Skeleton, useAsync } from './ui.jsx'

function Row({ logo, icon, title, detail, tone, state, onOpen, cta = 'ניהול' }) {
  return (
    <li className="fin-conn">
      {logo ? <ProviderLogo name={logo} size={22} /> : <span className="fin-logo-tile fin-conn__icon"><Icon name={icon} size={20} /></span>}
      <span className="fin-conn__main"><strong>{title}</strong><small>{detail}</small></span>
      <Pill tone={tone}>{state}</Pill>
      {onOpen && <button type="button" className="fin-btn fin-btn--sm" onClick={onOpen}>{cta}</button>}
    </li>
  )
}

/* Every source and destination in one list: is it connected, when did it last work, what is wrong. Daily work never
   needs this screen; it is where you look when something stopped arriving. */
export default function Connections() {
  const { mailboxes, can, go } = useFinance()
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const phones = useAsync(() => api.loadWhatsappSenders(), [])
  const inbox = useAsync(() => (can('operate') ? api.loadWhatsappInbox(1) : []), [])
  const cloud = useAsync(() => (can('operate') ? api.loadCloudTargets() : []), [])
  const ints = useAsync(() => (can('operate') ? api.loadIntegrations() : []), [])
  const s = status.data
  const boxes = mailboxes.filter((m) => m.status !== 'revoked')
  const byProv = (p) => boxes.filter((m) => m.provider === p)
  const mailRow = (p, title) => {
    const list = byProv(p)
    const bad = list.filter((m) => m.status === 'error').length
    const last = list.map((m) => m.last_success_at).filter(Boolean).sort().pop()
    return <Row key={p} logo={p} title={title} detail={list.length ? `${list.map((m) => m.email).join(', ')} · נסרק ${ago(last)}` : s && !s.providers?.[p] ? 'עוד לא הופעל בשרת' : 'אין תיבה מחוברת'}
      tone={bad ? 'attn' : list.length ? 'ok' : 'muted'} state={bad ? 'צריך חיבור מחדש' : list.length ? (list.length === 1 ? 'מחובר' : `${list.length} תיבות`) : 'לא מחובר'} onOpen={() => go('/mailboxes')} cta={list.length ? 'ניהול' : 'חיבור'} />
  }
  const activePhones = (phones.data || []).filter((p) => p.active).length
  const lastWa = (inbox.data || [])[0]?.at
  const liveCloud = (cloud.data || []).filter((c) => c.status !== 'revoked')
  const liveInts = (ints.data || []).filter((i) => i.enabled)

  return (
    <div className="fin-stack fin-narrow">
      <div className="fin-titlerow">
        <h2 className="fin-pagehead__title">חיבורים</h2>
        <InfoTip label="על החיבורים">מכאן נכנסים המסמכים למערכת ולכאן הם יוצאים. כל שורה מראה אם החיבור פעיל ומתי עבד לאחרונה.</InfoTip>
      </div>
      {status.loading ? <Skeleton lines={5} /> : (
        <>
          {!s && <p className="fin-note fin-note--warn">לא הצלחנו לבדוק עכשיו את מצב החיבורים בשרת. המצב שמוצג כאן חלקי. רעננו בעוד דקה.</p>}
          <section className="fin-connsec">
            <h3>איסוף מסמכים</h3>
            <ul className="fin-connlist">
              {mailRow('gmail', 'Gmail ו-Google Workspace')}
              {mailRow('outlook', 'Microsoft 365 ו-Outlook')}
              <Row logo="whatsapp" title="WhatsApp" detail={!s ? 'המצב לא ידוע כרגע' : s.whatsapp?.configured ? `${activePhones === 1 ? 'טלפון אחד רשום' : `${activePhones} טלפונים רשומים`}${lastWa ? ` · הודעה אחרונה ${ago(lastWa)}` : ''}` : 'עוד לא הופעל בשרת'} tone={s?.whatsapp?.configured ? 'ok' : 'muted'} state={!s ? 'לא ידוע' : s.whatsapp?.configured ? 'פעיל' : 'לא פעיל'} onOpen={() => go('/scanners')} />
              <Row icon="sparkle" title="קריאת מסמכים (OCR ו-AI)" detail="Claude קורא כל מסמך: ספק, מספר, תאריך, מע״מ וסכום, עם ודאות לכל שדה" tone={!s ? 'muted' : s.claude ? 'ok' : 'attn'} state={!s ? 'לא ידוע' : s.claude ? 'פעיל' : 'לא מוגדר'} onOpen={can('operate') ? () => go('/agents') : null} cta="פעולות" />
              <Row icon="clock" title="סריקה אוטומטית" detail="פעם אחת בלילה: כל התיבות נסרקות, ומסמך שלא נקרא מנוסה שוב (עד 3 פעמים)" tone={!s ? 'muted' : s.cron ? 'ok' : 'attn'} state={!s ? 'לא ידוע' : s.cron ? 'פעם ביום' : 'לא מוגדר'} onOpen={can('operate') ? () => go('/automations') : null} cta="הגדרות" />
            </ul>
          </section>
          {can('operate') && (
            <section className="fin-connsec">
              <h3>יעדים</h3>
              <ul className="fin-connlist">
                <Row icon="mail" title="מייל לרואה החשבון" detail="שליחת מסמכים נבחרים עם הקבצים וקובץ סיכום" tone={!s ? 'muted' : s.email ? 'ok' : 'attn'} state={!s ? 'לא ידוע' : s.email ? 'פעיל' : 'לא מוגדר'} onOpen={() => go('/send')} cta="שליחה" />
                <Row icon="plug" title="תוכנת הנהלת חשבונות" detail={liveInts.length ? liveInts.map((i) => i.name).join(', ') : 'ייצוא בקבצים זמין תמיד'} tone={liveInts.length ? 'ok' : 'muted'} state={liveInts.length ? 'מחובר' : 'קבצים'} onOpen={() => go('/integrations')} />
                <Row logo="gdrive" title="סנכרון לענן" detail={liveCloud.length ? liveCloud.map((c) => `${c.provider === 'gdrive' ? 'Drive' : 'Dropbox'}: ${c.account_email}`).join(', ') : 'Google Drive או Dropbox'} tone={liveCloud.some((c) => c.status === 'error') ? 'attn' : liveCloud.length ? 'ok' : 'muted'} state={liveCloud.length ? 'מחובר' : 'לא מחובר'} onOpen={() => go('/cloud')} />
                {can('manage') && <Row icon="webhook" title="שליחה אוטומטית" detail="webhook או מייל לכל מסמך חדש" tone="muted" state="אופציונלי" onOpen={() => go('/delivery')} />}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
