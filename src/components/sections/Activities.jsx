import { useMemo } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { useSettings } from '../../lib/cms.js'
import activities from '../../data/activities.js'
import Reveal from '../ui/Reveal.jsx'
import FeatureCard from '../ui/FeatureCard.jsx'
import KineticText from '../ui/KineticText.jsx'
import ActivityMenu from '../ui/ActivityMenu.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import './Activities.css'

export default function Activities() {
  const { t } = useI18n()
  const L = useLocalized()
  const isMobile = useIsMobile()
  const settings = useSettings()

  // תמונות מותאמות מה-CMS (key: activity_images = מיפוי id→url) גוברות על ברירת המחדל
  const items = useMemo(() => {
    let map = settings.activity_images
    if (typeof map === 'string') { try { map = JSON.parse(map) } catch { map = null } }
    if (!map || typeof map !== 'object') return activities
    return activities.map((a) => (map[a.id] ? { ...a, image: map[a.id] } : a))
  }, [settings.activity_images])

  return (
    <section className="section activities" id="activities">
      <div className="container">
        <Reveal className="activities__head">
          <span className="eyebrow">{t('activities.eyebrow')}</span>
          <KineticText as="h2" className="section-title" text={t('activities.title')} />
          <p className="section-lead">{t('activities.lead')}</p>
        </Reveal>

        {isMobile ? (
          <ActivityMenu items={items} />
        ) : (
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
        )}
      </div>
    </section>
  )
}
