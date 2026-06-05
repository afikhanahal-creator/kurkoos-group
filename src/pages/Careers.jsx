import { useI18n, useLocalized } from '../i18n/index.jsx'
import jobs from '../data/jobs.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import './Careers.css'

export default function Careers() {
  const { t } = useI18n()
  const L = useLocalized()

  return (
    <>
      <PageHeader
        eyebrow={t('pages.careers.eyebrow')}
        title={t('pages.careers.title')}
        lead={t('pages.careers.lead')}
        crumbs={[{ label: t('nav.about'), to: '/about' }, { label: t('pages.careers.title') }]}
      />
      <section className="section careers-page">
        <div className="container">
          <h2 className="section-title careers-page__heading">{t('pages.careers.openings')}</h2>
          <ul className="careers-list">
            {jobs.map((j, i) => (
              <Reveal as="li" key={j.id} className="job-card" delay={i * 0.06}>
                <div className="job-card__info">
                  <h3 className="job-card__title">{L(j.title)}</h3>
                  <div className="job-card__meta">
                    <span><Icon name="location" size={16} /> {L(j.location)}</span>
                    <span><Icon name="briefcase" size={16} /> {L(j.type)}</span>
                  </div>
                </div>
                <a href="mailto:jobs@kurkoos-group.co.il" className="btn btn--dark job-card__apply">
                  {t('pages.careers.apply')}
                  <Icon name="arrow" size={18} />
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
