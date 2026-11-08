import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { AGENTS, FIELD_LABEL, ago, claimableVat, counts, date, docDate, money, monthLabel, nameOf, period, shiftMonth, signedTotal, thisMonth } from './format.js'
import { Bars, Card, Empty, Icon, Kpi, Pill, StatusPill, UploadZone, useAsync } from './ui.jsx'

/* every number here is computed from stored records; nothing is invented or hardcoded */
const AGENT_TONE = { ok: 'ok', partial: 'warn', error: 'bad', running: 'info' }

const ACTION = {
  created: 'נוסף מסמך', updated: 'עודכן', approved: 'אושר', rejected: 'נדחה', exported: 'יוצא', marked_duplicate: 'סומן כפול', ai_processed: 'נקרא ע״י AI',
  deleted: 'נמחק', connected: 'חוברה תיבה', disconnected: 'נותקה תיבה', invited: 'הוזמן משתמש', claimed_admin: 'הוגדר מנהל מערכת', cron_run: 'ריצה יומית',
}

export function ActivityFeed({ items, documents, go, compact }) {
  if (!items.length) return <p className="fin-muted">אין עדיין פעילות.</p>
  return (
    <ul className="fin-feed">
      {items.map((a) => {
        const doc = a.entity === 'document' ? documents.find((d) => d.id === a.entity_id) : null
        const fields = a.changes && a.action === 'updated' ? Object.keys(a.changes).map((k) => FIELD_LABEL[k] || k).slice(0, 3).join(', ') : ''
        return (
          <li key={a.id}>
            <span className={`fin-feed__dot fin-feed__dot--${a.action}`} aria-hidden="true" />
            <div>
              <p>
                <strong>{ACTION[a.action] || a.action}</strong>
                {doc ? <> · <button type="button" className="fin-link" onClick={() => go(`/documents/${doc.id}`)}>{doc.supplier_name || doc.file_name}</button></> : a.changes?.email ? ` · ${a.changes.email}` : a.changes?.count ? ` · ${a.changes.count} מסמכים` : ''}
                {fields && <span className="fin-muted"> ({fields})</span>}
              </p>
              {!compact && <small className="fin-muted">{a.user_email === 'agent' || !a.user_email ? 'סוכן AI' : a.user_email} · {ago(a.at)}</small>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function Dashboard() {
  const { documents, categories, businesses, mailboxes, role, can, reload, go } = useFinance()
  const [month, setMonth] = useState(thisMonth())
  const [biz, setBiz] = useState('')
  const ops = can('operate')
  const feed = useAsync(() => api.loadAudit({ limit: 14 }), [documents.length])
  const runs = useAsync(() => (ops ? api.loadAgentRuns(120) : []), [documents.length, ops])

  const scoped = useMemo(() => documents.filter((d) => !biz || d.business_id === biz), [documents, biz])
  const s = useMemo(() => {
    const inMonth = scoped.filter((d) => period(d) === month)
    const collectedMonth = scoped.filter((d) => String(d.created_at).slice(0, 7) === month)
    const today = new Date().toISOString().slice(0, 10)
    const booked = inMonth.filter(counts)
    const byCat = {}; const byBiz = {}
    for (const d of booked) {
      byCat[d.category || 'ללא קטגוריה'] = (byCat[d.category || 'ללא קטגוריה'] || 0) + signedTotal(d)
      const b = nameOf(businesses, d.business_id) || 'לא משויך'
      byBiz[b] = (byBiz[b] || 0) + signedTotal(d)
    }
    const sort = (o) => Object.entries(o).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    return {
      collected: collectedMonth.length,
      today: scoped.filter((d) => String(d.created_at).slice(0, 10) === today).length,
      pending: scoped.filter((d) => d.status === 'review').length,
      processed: collectedMonth.filter((d) => d.processed_at && d.status !== 'failed').length,
      errors: scoped.filter((d) => d.status === 'failed').length,
      total: booked.reduce((a, d) => a + signedTotal(d), 0),
      vat: booked.reduce((a, d) => a + claimableVat(d, categories), 0),
      cats: sort(byCat).slice(0, 7),
      bizs: sort(byBiz),
      bookedCount: booked.length,
    }
  }, [scoped, month, categories, businesses])

  const liveBoxes = mailboxes.filter((m) => m.status !== 'revoked')
  const lastScan = liveBoxes.map((m) => m.last_success_at).filter(Boolean).sort().pop()
  const agentState = useMemo(() => {
    const list = runs.data || []
    return Object.keys(AGENTS).map((k) => {
      const mine = list.filter((r) => r.agent === k)
      const last = mine[0]
      const day = mine.filter((r) => Date.now() - new Date(r.started_at).getTime() < 86400_000)
      return { k, last, processed: day.reduce((a, r) => a + (r.processed || 0), 0), errors: day.reduce((a, r) => a + (r.errors || 0), 0) }
    })
  }, [runs.data])
  const review = scoped.filter((d) => d.status === 'review').slice(0, 6)

  return (
    <div className="fin-stack">
      <div className="fin-toolbar">
        <div className="fin-month" role="group" aria-label="חודש">
          <button type="button" className="fin-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="החודש הקודם"><Icon name="back" /></button>
          <strong>{monthLabel(month)}</strong>
          <button type="button" className="fin-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="החודש הבא" disabled={month >= thisMonth()}><Icon name="next" /></button>
        </div>
        {businesses.length > 1 && (
          <select className="fin-select" value={biz} onChange={(e) => setBiz(e.target.value)} aria-label="חברה">
            <option value="">כל החברות</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      <div className="fin-kpis">
        <Kpi label="סה״כ הוצאות החודש" value={money(s.total)} hint={`${s.bookedCount} מסמכים בספרים`} tone="brand" />
        <Kpi label="מע״מ תשומות" value={money(s.vat)} hint="לפי אחוז הקיזוז של כל קטגוריה" />
        {role !== 'accountant' && <Kpi label="ממתינים לאישור" value={s.pending} hint={s.pending ? 'לחצו לבדיקה' : 'הכול נבדק'} tone={s.pending ? 'warn' : 'ok'} onClick={can('approve') ? () => go('/pending') : undefined} />}
        {role !== 'accountant' && <Kpi label="מסמכים עם שגיאה" value={s.errors} hint={s.errors ? 'הקריאה נכשלה, ממתין לניסיון חוזר' : 'אין שגיאות'} tone={s.errors ? 'bad' : undefined} onClick={s.errors ? () => go('/documents?status=problems') : undefined} />}
      </div>
      {role !== 'accountant' && (
        <div className="fin-stats" role="list" aria-label="נתוני איסוף">
          <div role="listitem"><span>נאספו החודש</span><strong>{s.collected}</strong></div>
          <div role="listitem"><span>חדשים היום</span><strong>{s.today}</strong></div>
          <div role="listitem"><span>עובדו בהצלחה</span><strong>{s.processed}</strong></div>
          <div role="listitem"><span>תיבות מחוברות</span><strong>{liveBoxes.filter((m) => m.status === 'active').length}{liveBoxes.some((m) => m.status === 'error') && <Pill tone="bad">{liveBoxes.filter((m) => m.status === 'error').length} בתקלה</Pill>}</strong></div>
          <div role="listitem"><span>סריקה מוצלחת אחרונה</span><strong>{lastScan ? ago(lastScan) : 'עוד לא'}</strong></div>
        </div>
      )}

      {can('upload') && <UploadZone onDone={reload} compact />}

      <div className="fin-grid fin-grid--dash">
        {ops && (
          <Card title="סוכני ה-AI" actions={<button type="button" className="fin-link" onClick={() => go('/agents')}>פירוט</button>} className="fin-agents-card">
            <ul className="fin-agents">
              {agentState.map(({ k, last, processed, errors }) => (
                <li key={k}>
                  <span className={`fin-agent-dot fin-agent-dot--${last ? AGENT_TONE[last.status] || 'muted' : 'idle'}`} aria-hidden="true" />
                  <span className="fin-agents__name">{AGENTS[k].name}</span>
                  <span className="fin-agents__meta">{last ? `${ago(last.finished_at || last.started_at)} · ${processed} ב-24 שע׳${errors ? ` · ${errors} שגיאות` : ''}` : 'עוד לא רץ'}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card title="פעילות אחרונה">
          {feed.loading ? <p className="fin-muted">טוען…</p> : <ActivityFeed items={feed.data || []} documents={documents} go={go} />}
        </Card>
        <Card title="לפי קטגוריה"><Bars rows={s.cats} /></Card>
        {businesses.length > 1 ? <Card title="לפי חברה"><Bars rows={s.bizs} /></Card> : null}
        {role !== 'accountant' && (
          <Card title="ממתינים לאישור" actions={review.length > 0 && can('approve') && <button type="button" className="fin-link" onClick={() => go('/pending')}>לכולם</button>}>
            {review.length ? (
              <ul className="fin-list">
                {review.map((d) => (
                  <li key={d.id}>
                    <button type="button" className="fin-list__row" onClick={() => go(`/documents/${d.id}`)}>
                      <span><strong>{d.supplier_name || d.file_name}</strong><small>{date(docDate(d))} · {d.category || 'ללא קטגוריה'}</small></span>
                      <span className="fin-list__end">{money(d.total_amount, d.currency)}<StatusPill status={d.status} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <Empty title="אין מסמכים שמחכים" icon="check">כל מה שנכנס נבדק.</Empty>}
          </Card>
        )}
      </div>
    </div>
  )
}
