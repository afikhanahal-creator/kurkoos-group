import { useMemo, useRef } from 'react'
import { useFinance } from './FinanceApp.jsx'
import { useSession } from './session.js'
import * as api from './api.js'
import { ago, date, docDate, hasError, money } from './format.js'
import { ProviderLogo } from './logos.jsx'
import Thumbnail from './Thumbnail.jsx'
import { Icon, Pill, StatusPill, UploadZone, useAsync } from './ui.jsx'

// The daily cron runs at 03:23 UTC (vercel.json); the next scan is shown in the viewer's local time
function nextScan() {
  const n = new Date(); const t = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 3, 23))
  if (t <= n) t.setUTCDate(t.getUTCDate() + 1)
  const today = t.toDateString() === n.toDateString()
  return `${today ? 'היום' : 'מחר'} ב-${t.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
}
const pretty = (p) => (p && p.startsWith('972') ? `0${p.slice(3, 5)}-${p.slice(5)}` : p ? `+${p}` : '')

/* The home screen answers four questions: what arrived, what needs me, what is ready for the accountant, and is
   collection working. Everything else (spend, trends, AI accuracy) lives in דוחות › תמונת מצב. */
export default function Dashboard() {
  const { documents, mailboxes, members, role, can, reload, go } = useFinance()
  const me = useSession()
  const ops = can('operate')
  const status = useAsync(() => api.callServer('status').catch(() => null), [])
  const phones = useAsync(() => (can('upload') ? api.loadWhatsappSenders() : []), [])
  const upload = useRef(null)

  const m = useMemo(() => {
    const week = Date.now() - 7 * 86400_000
    const today = new Date().toDateString()
    const live = documents.filter((d) => !['archived'].includes(d.status))
    return {
      fresh: live.filter((d) => new Date(d.created_at).getTime() > week && ['review', 'processing', 'failed'].includes(d.status)).length,
      review: live.filter((d) => d.status === 'review').length,
      ready: live.filter((d) => d.status === 'approved' && !d.exported_at),
      sent: live.filter((d) => d.status === 'sent' && d.exported_at && new Date(d.exported_at).getMonth() === new Date().getMonth()).length,
      attention: live.filter((d) => d.status === 'failed' || d.status === 'duplicate' || (d.status === 'review' && hasError(d))).length,
      todayCount: documents.filter((d) => new Date(d.created_at).toDateString() === today).length,
      recent: [...live].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6),
    }
  }, [documents])

  const boxes = mailboxes.filter((x) => x.status !== 'revoked')
  const lastScan = boxes.map((x) => x.last_success_at).filter(Boolean).sort().pop()
  const boxErrors = boxes.filter((x) => x.status === 'error').length
  const wa = status.data?.whatsapp
  const myPhone = (phones.data || []).find((p) => p.user_id === me?.id && p.active)
  const waLink = wa?.number ? `https://wa.me/${wa.number}` : null
  const name = members.find((x) => x.user_id === me?.id)?.full_name?.split(' ')[0]
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'

  const tiles = [
    { k: 'fresh', label: 'חדשים השבוע', value: m.fresh, to: '/new', show: role !== 'accountant' },
    { k: 'review', label: 'ממתינים לבדיקה', value: m.review, to: '/pending', show: ops, attn: m.review > 0 },
    { k: 'ready', label: 'מוכנים לרו״ח', value: m.ready.length, to: ops ? '/send' : '/documents?status=approved', show: true, sub: m.ready.length ? money(m.ready.reduce((s, d) => s + Number(d.total_amount || 0), 0)) : '' },
    { k: 'sent', label: 'נשלחו החודש', value: m.sent, to: '/exports', show: role !== 'employee' },
  ].filter((t) => t.show)

  return (
    <div className="fin-stack fin-home">
      <header className="fin-home__hello">
        <h2 className="fin-pagehead__title">{hello}{name ? `, ${name}` : ''}</h2>
        <p className="fin-muted">{m.attention ? `${m.attention === 1 ? 'מסמך אחד דורש' : `${m.attention} מסמכים דורשים`} את תשומת לבך.` : m.review && ops ? 'יש מסמכים שמחכים לבדיקה שלך.' : 'הכול מסודר. מסמכים חדשים ייאספו אוטומטית.'}</p>
      </header>

      {can('upload') && (
        <section className="fin-home__actions" aria-label="הוספת מסמך">
          <button type="button" className="fin-action" onClick={() => upload.current?.querySelector('[data-testid="upload-input"]')?.click()}>
            <span className="fin-action__icon"><Icon name="upload" size={22} /></span>
            <span className="fin-action__text"><strong>העלאת מסמך</strong><small>PDF או צילום. הסוכנים יקראו אותו תוך שניות</small></span>
          </button>
          <a className={`fin-action ${waLink ? '' : 'is-off'}`} href={waLink || undefined} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!waLink) { e.preventDefault(); go('/scanners') } }}>
            <span className="fin-action__icon fin-action__icon--wa"><ProviderLogo name="whatsapp" size={24} /></span>
            <span className="fin-action__text"><strong>שליחה בוואטסאפ</strong><small>{waLink ? <>צלמו ושלחו ל-<bdi dir="ltr">{pretty(wa.number)}</bdi>{myPhone ? '' : ' (רשמו קודם את הטלפון שלכם)'}</> : 'הגדרת הקליטה מ-WhatsApp'}</small></span>
          </a>
          <div ref={upload} className="fin-sr" aria-hidden="true"><UploadZone onDone={reload} compact /></div>
        </section>
      )}

      <section className="fin-tiles" aria-label="מצב המסמכים">
        {tiles.map((t) => (
          <button key={t.k} type="button" className={`fin-tile ${t.attn ? 'is-attn' : ''}`} onClick={() => go(t.to)} data-k={t.k}>
            <span className="fin-tile__label">{t.label}</span>
            <strong className="fin-tile__value">{t.value}</strong>
            {t.sub ? <span className="fin-tile__sub">{t.sub}</span> : <span className="fin-tile__sub fin-tile__go">פתיחה <Icon name="next" size={13} /></span>}
          </button>
        ))}
      </section>

      {m.attention > 0 && ops && (
        <button type="button" className="fin-alertrow" onClick={() => go('/documents?status=problems')}>
          <Icon name="alert" size={18} /><span>{m.attention === 1 ? 'מסמך אחד לא נקרא או חשוד ככפול' : `${m.attention} מסמכים לא נקראו, חשודים ככפולים או עם שגיאה`}</span><Icon name="next" size={16} />
        </button>
      )}

      <div className="fin-home__grid">
        <section className="fin-panelcard" aria-label="מסמכים אחרונים">
          <header><h3>מסמכים אחרונים</h3><button type="button" className="fin-link" onClick={() => go('/documents')}>לכל המסמכים</button></header>
          {!m.recent.length ? <p className="fin-muted fin-home__empty">עוד אין מסמכים. העלו מסמך ראשון, שלחו צילום בוואטסאפ או חברו תיבת מייל.</p> : (
            <ul className="fin-recent">
              {m.recent.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => go(`/documents/${d.id}`)}>
                    <Thumbnail doc={d} />
                    <span className="fin-recent__main"><strong>{d.supplier_name || d.file_name || 'מסמך'}</strong><small>{date(docDate(d))}{d.source === 'whatsapp' ? ' · WhatsApp' : d.source === 'upload' ? ' · הועלה' : d.mailbox_id ? ' · מייל' : ''}</small></span>
                    <span className="fin-recent__side"><strong>{d.total_amount != null ? money(d.total_amount, d.currency) : '—'}</strong><StatusPill status={d.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {role !== 'accountant' && (
          <section className="fin-panelcard" aria-label="איסוף אוטומטי">
            <header><h3>איסוף אוטומטי</h3>{can('connect') && <button type="button" className="fin-link" onClick={() => go('/connections')}>חיבורים</button>}</header>
            <ul className="fin-sources">
              {boxes.map((b) => (
                <li key={b.id}>
                  <ProviderLogo name={b.provider} size={18} />
                  <span className="fin-sources__main"><strong dir="ltr">{b.email}</strong><small>{b.last_success_at ? `נסרק ${ago(b.last_success_at)}` : 'עוד לא נסרק'}</small></span>
                  <Pill tone={b.status === 'error' ? 'attn' : b.status === 'paused' ? 'muted' : 'ok'}>{b.status === 'error' ? 'צריך חיבור מחדש' : b.status === 'paused' ? 'מושהה' : 'מחובר'}</Pill>
                </li>
              ))}
              {!boxes.length && <li><ProviderLogo name="gmail" size={18} /><span className="fin-sources__main"><strong>אין תיבת מייל מחוברת</strong><small>חשבוניות שמגיעות במייל ייאספו אוטומטית</small></span>{can('connect') && <button type="button" className="fin-btn fin-btn--sm" onClick={() => go('/mailboxes')}>חיבור</button>}</li>}
              <li>
                <ProviderLogo name="whatsapp" size={18} />
                <span className="fin-sources__main"><strong>WhatsApp</strong><small>{wa?.configured ? `${(phones.data || []).filter((p) => p.active).length} טלפונים רשומים` : 'עוד לא הופעל'}</small></span>
                <Pill tone={wa?.configured ? 'ok' : 'muted'}>{wa?.configured ? 'פעיל' : 'לא פעיל'}</Pill>
              </li>
            </ul>
            <dl className="fin-facts">
              <div><dt>סריקה אחרונה</dt><dd>{lastScan ? ago(lastScan) : '—'}</dd></div>
              <div><dt>סריקה הבאה</dt><dd>{nextScan()}</dd></div>
              <div><dt>נאספו היום</dt><dd>{m.todayCount}</dd></div>
              {boxErrors > 0 && <div className="is-attn"><dt>תקלות</dt><dd>{boxErrors}</dd></div>}
            </dl>
          </section>
        )}
      </div>
    </div>
  )
}
