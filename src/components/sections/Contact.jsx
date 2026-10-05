import { useState } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import heDict from '../../i18n/he.js'
import enDict from '../../i18n/en.js'
import { LEAD_TOPICS as TOPICS } from '../../lib/contact.js'
import { useLeadForm } from '../../lib/leadForm.js'
import { getLastProject, trailSummary } from '../../lib/visitTrail.js'
import Reveal from '../ui/Reveal.jsx'
import OfficeMap from '../ui/OfficeMap.jsx'
import BookingCalendar from '../ui/BookingCalendar.jsx'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import { LeadFields, LeadSubmit, LeadSuccess, LeadFailure } from '../ui/LeadForm.jsx'
import './Contact.css'

/* topic: הנושא שמסומן בכניסה. עמודי החטיבות מעבירים את הנושא שלהם,
   כדי שמי שמגיע לטופס מעמוד הביצוע לא יפתח על "יזמות". */
export default function Contact({ topic: initialTopic = 'development' }) {
  const { t } = useI18n()
  const L = useLocalized()
  const [topic, setTopic] = useState(TOPICS.includes(initialTopic) ? initialTopic : 'development')
  const lf = useLeadForm({ form: 'contact_section', idPrefix: 'cf' })

  const handleSubmit = (e) => {
    e.preventDefault()
    lf.submit((v) => ({
      ...v,
      // עמודת project היא jsonb → שולחים אובייקט {he,en} (נושא הפנייה) ולא מחרוזת.
      // הערכים נלקחים ישירות משני המילונים כדי שב-CRM יישמר תמיד תיוג מדויק בשתי השפות.
      // אם הגולש צפה בפרויקט בביקור הזה — מצרפים אותו לתיוג, כדי שבמערכת
      // הלידים יהיה ברור באיזה פרויקט הוא התעניין בלי לנחש.
      project: (() => {
        const interest = getLastProject()
        const he = heDict.contactExtra.topics[topic] + (interest ? ` · התעניין ב: ${interest.name}` : '')
        const en = enDict.contactExtra.topics[topic] + (interest ? ` · Interested in: ${interest.name}` : '')
        return interest ? { he, en, slug: interest.slug || '' } : { he, en }
      })(),
      // מסלול הגלישה המלא — נשמר בהערות הפנימיות של הליד
      notes: trailSummary() ? `מסע באתר: ${trailSummary()}` : undefined,
      source: 'contact',                             // לא 'manual' → מפעיל התראת מייל
      status: 'new',
    }), { topic })
  }

  return (
    <section className="section contact" id="contact">
      <span className="contact__plus-grid" aria-hidden="true" />
      <div className="container contact__inner">
        {/* יומן קביעת פגישה — דסקטופ בלבד (.contact__visual מוסתר ב-≤900px) */}
        <Reveal className="contact__visual contact__visual--cal" variant="right">
          <BookingCalendar
            title={L({ he: 'קבעו פגישה', en: 'Book a meeting' })}
            ctaTargetId="cf-name"
            onPickDate={(label, time) => {
              // בחירת שעה ממלאת את שדה ההודעה בטופס שמימין — לקיצור תהליך השליחה
              const when = time ? `${label} ${L({ he: 'בשעה', en: 'at' })} ${time}` : label
              lf.setValues((v) => ({ ...v, message: L({ he: `אשמח לתאם פגישה ל${when}`, en: `I'd like to book a meeting for ${when}` }) }))
            }}
          />
          {/* בחירת שעה ביומן ממלאת את שדה ההודעה בטופס; "מלאו פרטים" מדלג לשדה השם */}
        </Reveal>

        {/* פאנל טופס כהה */}
        <Reveal className="contact__panel" variant="left" delay={0.1}>
          <InfiniteGrid color="rgba(255,255,255,0.5)" baseOpacity={0.06} revealOpacity={0.22} />
          <span className="eyebrow contact__eyebrow">{t('contact.eyebrow')}</span>
          <h2 className="contact__title">{t('contact.title')}</h2>
          <p className="contact__choose">{t('contactExtra.choose')}</p>

          {lf.sent ? (
            <LeadSuccess form="contact_section" tone="dark" />
          ) : (
            <>
              <div className="contact__topics">
                {TOPICS.map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    className={`contact__topic ${topic === tp ? 'is-active' : ''}`}
                    onClick={() => setTopic(tp)}
                    aria-pressed={topic === tp}
                  >
                    {t(`contactExtra.topics.${tp}`)}
                  </button>
                ))}
              </div>

              <form className="contact__form lf-dark" onSubmit={handleSubmit} onInput={lf.onStart} noValidate>
                <p className="contact__required">{t('contactExtra.required')}</p>
                <LeadFields lf={lf} />
                <LeadFailure lf={lf} topicLabel={heDict.contactExtra.topics[topic]} tone="dark" />
                <LeadSubmit lf={lf} className="btn btn--primary contact__submit" />
              </form>
            </>
          )}
        </Reveal>
      </div>

      {/* מי שמגיע עד לכאן כבר מתעניין, וחלק מהפונים רוצים פשוט להגיע
          למשרד. הכרטיס יושב מתחת לטופס ולא לידו, כדי לא לגעת בפריסה
          של שתי העמודות שמעליו. */}
      <div className="container contact__office">
        <Reveal variant="up" delay={0.1}>
          <OfficeMap />
        </Reveal>
      </div>
    </section>
  )
}
