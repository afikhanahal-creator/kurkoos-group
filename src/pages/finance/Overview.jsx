import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { AGENTS, FIELD_LABEL, ago, claimableVat, counts, money, monthLabel, period, shiftMonth, signedTotal, thisMonth } from './format.js'
import { docsFor, summarize } from './stats.js'
import { Empty, Icon, Pill, UploadZone, useAsync, Skeleton } from './ui.jsx'

/* Every figure on this screen is computed from stored records. Nothing is sampled, estimated or invented. */
const ACTION = {
  created: 'נוסף מסמך', updated: 'עודכן', approved: 'אושר', rejected: 'נדחה', exported: 'יוצא', marked_duplicate: 'סומן כפול', ai_processed: 'נקרא ע״י AI',
  deleted: 'נמחק', connected: 'חוברה תיבה', disconnected: 'נותקה תיבה', invited: 'הוזמן משתמש', claimed_admin: 'הוגדר מנהל מערכת', cron_run: 'ריצה יומית',
  split: 'פוצל בין פרויקטים', attachment_added: 'נוסף נספח', attachment_removed: 'הוסר נספח', first_approval: 'חתימה ראשונה', merged: 'אוחד ספק', archived: 'הועבר לארכיון',
}
const ENTITY = { supplier: 'ספק', project: 'פרויקט', company: 'חברה', category: 'קטגוריה', rule: 'כלל', export: 'ייצוא', mailbox: 'תיבה', member: 'משתמש' }

export function ActivityFeed({ items, documents, go }) {
  if (!items.length) return <p className="fin-muted">אין עדיין פעילות.</p>
  return (
    <ul className="fin-feed">
      {items.map((a) => {
        const doc = a.entity === 'document' ? documents.find((d) => d.id === a.entity_id) : null
        const fields = a.changes && a.action === 'updated' && a.entity === 'document' ? Object.keys(a.changes).map((k) => FIELD_LABEL[k]).filter(Boolean).slice(0, 3).join(', ') : ''
        return (
          <li key={a.id}>
            <span className={`fin-feed__dot fin-feed__dot--${a.action}`} aria-hidden="true" />
            <p>
              <strong>{ACTION[a.action] || a.action}</strong>{' '}
              {doc ? <button type="button" className="fin-link" onClick={() => go(`/documents/${doc.id}`)}>{doc.supplier_name || doc.file_name}</button> : a.entity !== 'document' && a.changes?.name ? <span>{ENTITY[a.entity] || ''} {a.changes.name}</span> : a.changes?.email ? a.changes.email : a.changes?.count ? `${a.changes.count} מסמכים` : ''}
              {fields && <span className="fin-muted"> ({fields})</span>}
            </p>
            <small>{a.user_email === 'agent' || !a.user_email ? 'סוכן AI' : a.user_email.split('@')[0]}, {ago(a.at)}</small>
          </li>
        )
      })}
    </ul>
  )
}

function Section({ title, action, children, className = '' }) {
  return <section className={`fin-panel-block ${className}`}><div className="fin-panel-block__head"><h3>{title}</h3>{action}</div>{children}</section>
}
function Rank({ rows, onPick, fmt = money, empty = 'אין נתונים' }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  if (!rows.length) return <p className="fin-muted">{empty}</p>
  return (
    <ul className="fin-split-list">
      {rows.map((r) => (
        <li key={r.key}>
          <button type="button" onClick={onPick && r.id ? () => onPick(r.id) : undefined} disabled={!onPick || !r.id}>
            <span className="fin-split-list__name">{r.name}{r.note && <small> {r.note}</small>}</span>
            <span className="fin-split-list__val">{fmt(r.value)}</span>
            <span className="fin-split-list__bar"><span style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} className={r.over ? 'is-over' : ''} /></span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Overview() {
  const { documents, categories, businesses, projects, suppliers, mailboxes, allocations, role, can, reload, go } = useFinance()
  const [month, setMonth] = useState(thisMonth())
  const ops = can('operate')
  const feed = useAsync(() => api.loadAudit({ limit: 12 }), [documents.length])
  const runs = useAsync(() => (ops ? api.loadAgentRuns(300) : []), [documents.length, ops])

  const m = useMemo(() => {
    const inMonth = documents.filter((d) => period(d) === month)
    const booked = inMonth.filter(counts)
    const total = booked.reduce((s, d) => s + signedTotal(d), 0)
    const prevBooked = documents.filter((d) => counts(d) && period(d) === shiftMonth(month, -1))
    const prev = prevBooked.reduce((s, d) => s + signedTotal(d), 0)
    const vat = booked.reduce((s, d) => s + claimableVat(d, categories), 0)
    const week = Date.now() - 7 * 86400_000
    const status = (st) => documents.filter((d) => d.status === st).length

    const monthItems = (kind, id) => docsFor(kind, id, documents, allocations, categories).filter(({ doc }) => period(doc) === month)
    const companies = businesses.filter((b) => b.active !== false && !b.archived_at).map((b) => {
      const sm = summarize(monthItems('businesses', b.id), categories)
      return { key: b.id, id: b.id, name: b.name, value: sm.total, note: sm.pendingDocs ? `${sm.pendingDocs} ממתינים` : '', vat: sm.vat }
    }).sort((a, b) => b.value - a.value)
    const projRows = projects.filter((p) => !p.archived_at).map((p) => {
      const all = summarize(docsFor('projects', p.id, documents, allocations, categories), categories)
      return { key: p.id, id: p.id, name: p.name, value: all.total, budget: p.budget ? Number(p.budget) : null, over: p.budget && all.total > Number(p.budget), note: p.budget ? `${Math.round((all.total / Number(p.budget)) * 100)}% מהתקציב` : '' }
    }).sort((a, b) => b.value - a.value)
    const supRows = suppliers.filter((s) => s.status !== 'archived').map((s) => ({ key: s.id, id: s.id, name: s.name, value: summarize(docsFor('suppliers', s.id, documents, allocations, categories), categories).total })).filter((r) => r.value).sort((a, b) => b.value - a.value)

    // AI operations, measured against what people approved
    const reviewed = documents.filter((d) => ['approved', 'sent'].includes(d.status) && d.ai_snapshot)
    const untouched = reviewed.filter((d) => ['supplier_id', 'business_id', 'category', 'project_id'].every((k) => !d.ai_snapshot[k] || d.ai_snapshot[k] === d[k]) && d.ai_snapshot.category === d.category && d.ai_snapshot.business_id === d.business_id)
    const catChecked = reviewed.filter((d) => d.ai_snapshot.category)
    const supChecked = reviewed.filter((d) => d.ai_snapshot.supplier_id)
    return {
      total, prev, vat, booked: booked.length, collected: documents.filter((d) => String(d.created_at).slice(0, 7) === month).length,
      control: { new: documents.filter((d) => new Date(d.created_at).getTime() > week).length, approved: status('approved') + status('sent'), pending: status('review'), rejected: status('rejected'), duplicates: status('duplicate'), failed: status('failed') },
      companies, projRows, supRows,
      newSuppliers: suppliers.filter((s) => Date.now() - new Date(s.created_at).getTime() < 30 * 86400_000),
      missingId: suppliers.filter((s) => s.status !== 'archived' && !s.vat_id),
      pendingSuppliers: suppliers.filter((s) => s.status === 'pending'),
      ai: {
        processed: documents.filter((d) => d.processed_at).length,
        automatic: untouched.length, reviewed: reviewed.length,
        manual: reviewed.length - untouched.length + documents.filter((d) => d.status === 'failed').length,
        catAcc: catChecked.length ? catChecked.filter((d) => d.ai_snapshot.category === d.category).length / catChecked.length : null,
        supAcc: supChecked.length ? supChecked.filter((d) => d.ai_snapshot.supplier_id === d.supplier_id).length / supChecked.length : null,
        catN: catChecked.length, supN: supChecked.length,
      },
    }
  }, [documents, month, categories, businesses, projects, suppliers, allocations])

  const liveBoxes = mailboxes.filter((x) => x.status !== 'revoked')
  const lastScan = liveBoxes.map((x) => x.last_success_at).filter(Boolean).sort().pop()
  const failedRuns = (runs.data || []).filter((r) => Date.now() - new Date(r.started_at).getTime() < 7 * 86400_000 && r.errors > 0)
  const delta = m.prev ? (m.total - m.prev) / Math.abs(m.prev) : null
  const pct = (v) => (v === null ? '—' : `${Math.round(v * 100)}%`)

  return (
    <div className="fin-stack fin-cc">
      <div className="fin-cc__head">
        <div className="fin-month" role="group" aria-label="חודש">
          <button type="button" className="fin-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="החודש הקודם"><Icon name="back" /></button>
          <strong>{monthLabel(month)}</strong>
          <button type="button" className="fin-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="החודש הבא" disabled={month >= thisMonth()}><Icon name="next" /></button>
        </div>

      </div>

      <section className="fin-ledger fin-ledger--hero" aria-label="סיכום החודש">
        <div className="fin-ledger__main">
          <span>הוצאות {monthLabel(month)}</span>
          <strong>{money(m.total)}</strong>
          <small>{m.booked} מסמכים בספרים{delta !== null ? `, ${delta >= 0 ? 'עלייה' : 'ירידה'} של ${Math.abs(Math.round(delta * 100))}% מהחודש הקודם` : ''}</small>
        </div>
        <div><span>מע״מ תשומות לקיזוז</span><strong>{money(m.vat)}</strong></div>
        {role !== 'accountant' && <div className={m.control.pending ? 'is-attn' : ''}><span>ממתינים לאישור</span><strong>{m.control.pending}</strong>{can('approve') && m.control.pending > 0 && <button type="button" className="fin-link" onClick={() => go('/pending')}>לבדיקה</button>}</div>}
        <div><span>חברות פעילות</span><strong>{m.companies.length}</strong></div>
      </section>

      {role !== 'accountant' && (
        <section className="fin-control" aria-label="בקרת מסמכים">
          {[['new', 'חדשים (7 ימים)', '/new'], ['approved', 'מאושרים', '/documents?status=approved'], ['rejected', 'נדחו', '/documents?status=rejected'], ['duplicates', 'אזהרות כפילות', '/documents?status=problems'], ['failed', 'כשלי עיבוד', '/documents?status=problems']].map(([k, label, to]) => (
            <button key={k} type="button" className={`fin-control__item ${['failed', 'duplicates'].includes(k) && m.control[k] ? 'is-attn' : ''}`} onClick={() => go(to)}>
              <strong>{m.control[k]}</strong><span>{label}</span>
            </button>
          ))}
        </section>
      )}

      <div className="fin-cc__grid">
        <Section title="הוצאות לפי חברה" action={ops && <button type="button" className="fin-link" onClick={() => go('/companies')}>כל החברות</button>}>
          <Rank rows={m.companies} onPick={ops ? (id) => go(`/companies/${id}`) : null} empty="עוד אין חברות" />
        </Section>
        <Section title="פרויקטים: הוצאה מצטברת" action={ops && <button type="button" className="fin-link" onClick={() => go('/projects')}>כל הפרויקטים</button>}>
          <Rank rows={m.projRows.slice(0, 6)} onPick={ops ? (id) => go(`/projects/${id}`) : null} empty="עוד אין פרויקטים" />
        </Section>
        <Section title="ספקים לפי היקף" action={ops && <button type="button" className="fin-link" onClick={() => go('/suppliers')}>כל הספקים</button>}>
          <Rank rows={m.supRows.slice(0, 6)} onPick={ops ? (id) => go(`/suppliers/${id}`) : null} empty="עוד אין הוצאות" />
          {ops && (
            <ul className="fin-facts-inline">
              <li><span>חדשים (30 יום)</span><strong>{m.newSuppliers.length}</strong></li>
              <li className={m.pendingSuppliers.length ? 'is-attn' : ''}><span>ממתינים לאישור</span><button type="button" className="fin-link" onClick={() => go('/suppliers')}>{m.pendingSuppliers.length}</button></li>
              <li className={m.missingId.length ? 'is-attn' : ''}><span>בלי ח.פ</span><strong>{m.missingId.length}</strong></li>
            </ul>
          )}
        </Section>
        {ops && (
          <Section title="פעולות ה-AI" action={<button type="button" className="fin-link" onClick={() => go('/agents')}>פירוט</button>}>
            <dl className="fin-aiops">
              <div><dt>עובדו אוטומטית</dt><dd>{m.ai.processed}</dd></div>
              <div><dt>אושרו בלי שינוי</dt><dd>{m.ai.automatic}<small> מתוך {m.ai.reviewed}</small></dd></div>
              <div><dt>דרשו התערבות</dt><dd>{m.ai.manual}</dd></div>
              <div><dt>דיוק קטגוריה</dt><dd>{pct(m.ai.catAcc)}<small> ({m.ai.catN} נבדקו)</small></dd></div>
              <div><dt>דיוק זיהוי ספק</dt><dd>{pct(m.ai.supAcc)}<small> ({m.ai.supN} נבדקו)</small></dd></div>
              <div className={failedRuns.length ? 'is-attn' : ''}><dt>ריצות עם שגיאה (7 ימים)</dt><dd>{failedRuns.length}</dd></div>
              <div><dt>סריקה מוצלחת אחרונה</dt><dd>{lastScan ? ago(lastScan) : 'עוד לא'}</dd></div>
              <div><dt>סוכנים</dt><dd className="fin-agent-dots">{Object.keys(AGENTS).map((k) => { const last = (runs.data || []).find((r) => r.agent === k); return <span key={k} title={`${AGENTS[k].name}: ${last ? last.status : 'לא רץ'}`} className={`fin-agent-dot fin-agent-dot--${last ? ({ ok: 'ok', partial: 'warn', error: 'bad' })[last.status] || 'info' : 'idle'}`} /> })}</dd></div>
            </dl>
            <p className="fin-muted fin-small">הדיוק נמדד מול מה שאנשים אישרו בפועל: ההצעה של הסוכן מול הערך הסופי.</p>
          </Section>
        )}
        <Section title="פעילות אחרונה" className="fin-cc__feed">
          {feed.loading ? <Skeleton /> : <ActivityFeed items={feed.data || []} documents={documents} go={go} />}
        </Section>
      </div>
      {!documents.length && can('connect') && <Empty title="המערכת מוכנה" icon="inbox" action={<button type="button" className="fin-btn fin-btn--primary" onClick={() => go('/mailboxes')}>חיבור תיבת מייל</button>}>חברו תיבת מייל או העלו חשבונית ראשונה, והסוכנים יתחילו לעבוד.</Empty>}
    </div>
  )
}
