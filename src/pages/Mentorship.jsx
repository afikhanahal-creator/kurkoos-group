import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import { mentorshipMeta, pillars, stages, faqs } from '../data/mentorship.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import Icon from '../components/ui/Icon.jsx'
import Contact from '../components/sections/Contact.jsx'
import CardDeck from '../components/ui/CardDeck.jsx'
import useIsMobile from '../hooks/useIsMobile.js'
import './Mentorship.css'

export default function Mentorship() {
  const { lang } = useI18n()
  const L = useLocalized()
  const isMobile = useIsMobile()

  const [openStage, setOpenStage] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <article className="mentorship">
      <PageHeader
        eyebrow={L({ he: 'ליווי מקצועי', en: 'Professional mentorship' })}
        title={L(mentorshipMeta.title)}
        lead={L(mentorshipMeta.subtitle)}
        crumbs={[
          { label: L({ he: 'יזמות', en: 'Development' }), to: '/divisions/development' },
          { label: L(mentorshipMeta.title) },
        ]}
      />

      {/* אינטרו */}
      <section className="section mentorship-intro">
        <div className="container">
          <Reveal className="mentorship-intro__text">
            <p>{L(mentorshipMeta.lead)}</p>
          </Reveal>
        </div>
      </section>

      {/* סטטיסטיקות */}
      <section className="section section--soft mentorship-kpis">
        <div className="container mentorship-kpis__grid">
          {[
            { val: '30+', label: { he: 'שנות ניסיון', en: 'Years of experience' } },
            { val: '4',   label: { he: 'כובעים מקצועיים', en: 'Professional divisions' } },
            { val: '10',  label: { he: 'שלבי ליווי', en: 'Mentorship stages' } },
            { val: '∞',   label: { he: 'קשרים בתעשייה', en: 'Industry connections' } },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="mentorship-kpi">
              <span className="mentorship-kpi__val" dir="ltr">{s.val}</span>
              <span className="mentorship-kpi__label">{L(s.label)}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 4 עמודים — למה קורקוס */}
      <section className="section mentorship-pillars" id="why">
        <div className="container">
          <Reveal className="mentorship-pillars__head">
            <span className="eyebrow">{L({ he: 'למה קורקוס?', en: 'Why Kurkoos?' })}</span>
            <h2 className="section-title">{L({ he: 'היתרון של שלושה עשורים', en: 'The three-decade advantage' })}</h2>
          </Reveal>
          {isMobile ? (
            <CardDeck
              className="mentorship-pillars__deck"
              items={pillars.map((p, i) => ({ id: String(i), ...p }))}
              renderCard={(p) => <FeatureCard icon={p.icon} title={L(p.title)} desc={L(p.desc)} />}
            />
          ) : (
            <div className="mentorship-pillars__grid">
              {pillars.map((p, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <FeatureCard icon={p.icon} title={L(p.title)} desc={L(p.desc)} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 10 שלבי ליווי — אקורדיון */}
      <section className="section section--soft mentorship-stages" id="stages">
        <div className="container mentorship-stages__inner">
          <Reveal className="mentorship-stages__intro" variant="right">
            <span className="eyebrow">{L({ he: 'שלבי הליווי', en: 'Mentorship stages' })}</span>
            <h2 className="section-title">{L({ he: 'מהקרקע ועד המפתח', en: 'From land to key' })}</h2>
            <p className="section-lead">{L({ he: 'ליווי צמוד בכל שלב של הדרך — עם הכלים, הקשרים והניסיון לעשות אותו נכון.', en: 'Close support at every stage of the journey — with the tools, connections and experience to do it right.' })}</p>
            <div className="mentorship-stages__progress" aria-hidden="true">
              <span style={{ '--p': `${((openStage + 1) / stages.length) * 100}%` }} />
            </div>
          </Reveal>

          <Reveal className="mentorship-stages__list" variant="left" delay={0.1}>
            {stages.map((stage, i) => {
              const isOpen = openStage === i
              return (
                <div
                  key={stage.id}
                  className={`ms-item ${isOpen ? 'ms-item--open' : ''}`}
                  style={{ '--stage-color': stage.color }}
                >
                  <button
                    type="button"
                    className="ms-item__head"
                    onClick={() => setOpenStage(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="ms-item__num">{stage.num}</span>
                    <span className="ms-item__title">{L(stage.title)}</span>
                    <span className="ms-item__chevron">
                      <Icon name="chevron" size={22} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        className="ms-item__panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="ms-item__desc">{L(stage.desc)}</p>
                        <ul className="ms-item__tools">
                          {stage.tools.map((tool, j) => (
                            <li key={j}>
                              <Icon name="check" size={14} />
                              <span>{L(tool)}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </Reveal>
        </div>
      </section>

      {/* שאלות נפוצות */}
      <section className="section mentorship-faq">
        <div className="container">
          <Reveal className="mentorship-faq__head">
            <span className="eyebrow">{L({ he: 'שאלות נפוצות', en: 'FAQ' })}</span>
            <h2 className="section-title">{L({ he: 'שאלות שכולם שואלים', en: 'Common questions' })}</h2>
          </Reveal>
          <div className="mentorship-faq__list">
            {faqs.map((faq, i) => (
              <Reveal key={i}>
                <div className={`mfaq-item ${openFaq === i ? 'mfaq-item--open' : ''}`}>
                  <button
                    type="button"
                    className="mfaq-item__q"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span>{L(faq.q)}</span>
                    <Icon name="chevron" size={20} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        className="mfaq-item__a"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p>{L(faq.a)}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section mentorship-cta">
        <div className="container">
          <Reveal className="mentorship-cta__band" variant="scale">
            <div>
              <span className="eyebrow">{L({ he: 'מוכנים להתחיל?', en: 'Ready to start?' })}</span>
              <h2 className="mentorship-cta__title">{L({ he: 'שיחת היכרות — ללא עלות', en: 'Free introductory call' })}</h2>
              <p className="mentorship-cta__desc">{L({ he: 'ספרו לנו על הפרויקט שלכם ועל המטרות שלכם — ונראה ביחד אם הליווי הזה מתאים לכם.', en: "Tell us about your project and your goals — and together we'll see if this mentorship is the right fit." })}</p>
            </div>
            <a href="/#contact" className="btn btn--primary btn--lg">
              {L({ he: 'בואו נדבר', en: "Let's talk" })}
              <Icon name="arrow" size={20} className="mentorship-cta__arrow" />
            </a>
          </Reveal>
        </div>
      </section>

      <Contact />
    </article>
  )
}
