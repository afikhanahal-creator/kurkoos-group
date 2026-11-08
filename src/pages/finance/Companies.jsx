import { useMemo, useState } from 'react'
import { useFinance } from './FinanceApp.jsx'
import * as api from './api.js'
import { ROLE, counts, money, period, signedTotal, thisMonth } from './format.js'
import { Empty, Field, Icon, Modal, PageHead } from './ui.jsx'

const BLANK = { name: '', vat_id: '', reg_number: '', accountant_email: '', export_settings: { format: 'zip', destination: 'download' } }

export default function Companies() {
  const { businesses, documents, mailboxes, members, projects, can, reload, go } = useFinance()
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const month = thisMonth()
  const rows = useMemo(() => businesses.map((b) => {
    const docs = documents.filter((d) => d.business_id === b.id)
    return {
      ...b,
      docs: docs.length,
      month: docs.filter((d) => counts(d) && period(d) === month).reduce((a, d) => a + signedTotal(d), 0),
      pending: docs.filter((d) => d.status === 'review').length,
      boxes: mailboxes.filter((m) => m.business_id === b.id && m.status !== 'revoked'),
      people: members.filter((m) => m.active && (!m.business_ids || m.business_ids.includes(b.id))),
      projects: projects.filter((p) => p.business_id === b.id).length,
    }
  }), [businesses, documents, mailboxes, members, projects, month])
  const unassigned = documents.filter((d) => !d.business_id && !['rejected', 'duplicate'].includes(d.status)).length

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { docs, month: m, pending, boxes, people, projects: pr, ...row } = edit
      await api.saveRow('fin_businesses', { ...row, vat_id: row.vat_id?.replace(/\D/g, '') || null, reg_number: row.reg_number?.replace(/\D/g, '') || null, accountant_email: row.accountant_email || null })
      setEdit(null); reload()
    } catch (e2) { setErr(e2.message) }
  }

  return (
    <div className="fin-stack">
      <PageHead title="החברות בקבוצה" sub="כל מסמך משויך לחברה. הסוכנים מזהים אותה לפי הח.פ של הלקוח בחשבונית, לפי התיבה או לפי כללים.">
        {can('manage') && <button type="button" className="fin-btn fin-btn--primary" onClick={() => setEdit({ ...BLANK, sort: businesses.length })}><Icon name="plus" size={18} /> חברה חדשה</button>}
      </PageHead>
      {unassigned > 0 && <p className="fin-note fin-note--warn"><Icon name="alert" size={16} /> {unassigned} מסמכים עוד לא שויכו לחברה. <button type="button" className="fin-link" onClick={() => go('/documents')}>לשיוך</button></p>}
      {!rows.length ? <Empty title="עוד אין חברות" icon="company" /> : (
        <div className="fin-cards">
          {rows.map((b) => (
            <article key={b.id} className="fin-entity">
              <header>
                <span className="fin-entity__mark" style={{ background: b.color || '#105572' }} aria-hidden="true">{b.name.slice(0, 1)}</span>
                <div><h3>{b.name}</h3><small className="fin-muted">ח.פ {b.vat_id || '—'}{b.reg_number && b.reg_number !== b.vat_id ? ` · רישום ${b.reg_number}` : ''}</small></div>
                {can('manage') && <button type="button" className="fin-icon-btn" onClick={() => setEdit(b)} aria-label={`עריכת ${b.name}`}><Icon name="edit" size={18} /></button>}
              </header>
              <dl className="fin-entity__stats">
                <div><dt>הוצאות החודש</dt><dd>{money(b.month)}</dd></div>
                <div><dt>מסמכים</dt><dd>{b.docs}</dd></div>
                <div><dt>ממתינים</dt><dd>{b.pending}</dd></div>
                <div><dt>פרויקטים</dt><dd>{b.projects}</dd></div>
              </dl>
              <p className="fin-entity__line"><Icon name="mail" size={15} /> {b.boxes.length ? b.boxes.map((m) => m.email).join(', ') : 'אין תיבה משויכת'}</p>
              <p className="fin-entity__line"><Icon name="users" size={15} /> {b.people.length ? b.people.map((m) => `${m.full_name || m.email} (${ROLE[m.role]})`).join(', ') : 'אין משתמשים'}</p>
              <p className="fin-entity__line"><Icon name="plug" size={15} /> ייצוא: {b.export_settings?.format === 'excel' ? 'Excel' : b.export_settings?.format === 'csv' ? 'CSV' : 'ZIP'} · {b.accountant_email ? <span dir="ltr">{b.accountant_email}</span> : 'אין מייל רו״ח'}</p>
              <footer><button type="button" className="fin-link" onClick={() => go(`/documents?company=${b.id}`)}>למסמכים</button><button type="button" className="fin-link" onClick={() => go(`/reports?company=${b.id}`)}>לדוחות</button></footer>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? `עריכת ${edit.name}` : 'חברה חדשה'} onClose={() => setEdit(null)} footer={<><button type="submit" form="fin-company" className="fin-btn fin-btn--primary">שמירה</button><button type="button" className="fin-btn" onClick={() => setEdit(null)}>ביטול</button></>}>
          <form id="fin-company" className="fin-form__grid" onSubmit={save}>
            <Field label="שם החברה" wide><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="מספר עוסק / ח.פ למע״מ"><input value={edit.vat_id || ''} onChange={(e) => setEdit({ ...edit, vat_id: e.target.value })} inputMode="numeric" dir="ltr" /></Field>
            <Field label="מספר רישום (אם שונה)"><input value={edit.reg_number || ''} onChange={(e) => setEdit({ ...edit, reg_number: e.target.value })} inputMode="numeric" dir="ltr" /></Field>
            <Field label="מייל רואה החשבון" wide><input type="email" value={edit.accountant_email || ''} onChange={(e) => setEdit({ ...edit, accountant_email: e.target.value })} dir="ltr" /></Field>
            <Field label="פורמט ייצוא קבוע"><select value={edit.export_settings?.format || 'zip'} onChange={(e) => setEdit({ ...edit, export_settings: { ...edit.export_settings, format: e.target.value } })}><option value="zip">ZIP (קבצים + Excel)</option><option value="excel">Excel</option><option value="csv">CSV</option><option value="pdf">PDF</option></select></Field>
            <Field label="צבע"><input type="color" value={edit.color || '#105572'} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
            {err && <p className="fin-error fin-field--wide" role="alert">{err}</p>}
          </form>
          <p className="fin-muted">הרשאות המשתמשים לכל חברה נקבעות במסך משתמשים והרשאות. תיבות המייל משויכות במסך חשבונות המייל.</p>
        </Modal>
      )}
    </div>
  )
}
