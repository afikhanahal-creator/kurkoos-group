import { useI18n, useLocalized } from '../../i18n/index.jsx'
import activities from '../../data/activities.js'
import Reveal from '../ui/Reveal.jsx'
import FeatureCard from '../ui/FeatureCard.jsx'
import KineticText from '../ui/KineticText.jsx'
import './Activities.css'

export default function Activities() {
  const { t } = useI18n()
  const L = useLocalized()

  return (
    <section className="section activities" id="activities">
      <div className="container">
        <Reveal className="activities__head">
          <span className="eyebrow">{t('activities.eyebrow')}</span>
          <KineticText as="h2" className="section-title" text={t('activities.title')} />
          <p className="section-lead">{t('activities.lead')}</p>
        </Reveal>

        <div className="activities__grid">
          {activities.map((a, i) => (
            <Reveal key={a.id} delay={(i % 4) * 0.08}>
              <FeatureCard
                icon={a.icon}
                title={L(a.title)}
                desc={L(a.desc)}
                to={a.to || '/#contact'}
                cta={t('common.readMore')}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
