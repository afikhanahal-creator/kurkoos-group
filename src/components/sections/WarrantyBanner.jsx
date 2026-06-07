import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/index.jsx'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import KineticText from '../ui/KineticText.jsx'
import './WarrantyBanner.css'

export default function WarrantyBanner() {
  const { t } = useI18n()
  const points = [
    { icon: 'shield', key: 'quality' },
    { icon: 'handshake', key: 'service' },
    { icon: 'check', key: 'transparency' },
  ]

  return (
    <section className="section warranty">
      <div className="container warranty__inner">
        <Reveal className="warranty__badge" variant="scale">
          <span className="warranty__badge-num">10</span>
          <span className="warranty__badge-text">
            {t('warranty.eyebrow')}
          </span>
        </Reveal>

        <Reveal className="warranty__content" variant="left" delay={0.1}>
          <span className="eyebrow">{t('warranty.eyebrow')}</span>
          <KineticText as="h2" className="section-title" text={t('warranty.title')} />
          <p className="section-lead">{t('warranty.lead')}</p>

          <ul className="warranty__points">
            {points.map((p) => (
              <li key={p.key}>
                <span className="warranty__point-icon"><Icon name={p.icon} size={20} /></span>
                {t(`warranty.points.${p.key}`)}
              </li>
            ))}
          </ul>

          <Link to="/about" className="btn btn--dark btn--lg">
            {t('warranty.cta')}
            <Icon name="arrow" size={20} className="warranty__cta-arrow" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
