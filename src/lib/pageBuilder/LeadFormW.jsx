import { useLeadForm } from '../leadForm.js'
import { trailSummary } from '../visitTrail.js'
import { LeadFields, LeadSubmit, LeadSuccess, LeadFailure } from '../../components/ui/LeadForm.jsx'

/* טופס ליד קצר. אותם שדות, אותה בדיקה ואותה שמירה כמו בטופס יצירת הקשר */
export default function LeadFormW({ id, props: p }) {
  const lf = useLeadForm({ form: 'page_block', idPrefix: `lf-${id}` })
  const onSubmit = (e) => {
    e.preventDefault()
    lf.submit((v) => ({
      ...v,
      project: { he: p.title || 'טופס בעמוד', en: 'Page form' },
      notes: trailSummary() ? `מסע באתר: ${trailSummary()}` : undefined,
      source: 'contact',
      status: 'new',
    }))
  }
  return (
    <section className={`section pb-w pb-w--lead pb-bg--${p.bg || 'soft'}`}>
      <div className="container pb-in pb-in--narrow">
        <div className="pb-lead">
          {p.title ? <h2 className="section-title pb-h" data-pbf="title">{p.title}</h2> : null}
          {p.text ? <p className="section-lead pb-p" data-pbf="text">{p.text}</p> : null}
          {lf.sent ? <LeadSuccess form="page_block" /> : (
            <form className="pb-lead__form" onSubmit={onSubmit} onInput={lf.onStart} noValidate>
              <LeadFields lf={lf} />
              <LeadFailure lf={lf} topicLabel={p.title || 'טופס בעמוד'} />
              <LeadSubmit lf={lf} className="btn btn--primary" />
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
