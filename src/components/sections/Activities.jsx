import { useMemo } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { useSettings } from '../../lib/cms.js'
import activities from '../../data/activities.js'
import Reveal from '../ui/Reveal.jsx'
import FeatureCard from '../ui/FeatureCard.jsx'
import KineticText from '../ui/KineticText.jsx'
import ActivityMenu from '../ui/ActivityMenu.jsx'
import useIsMobile from '../../hooks/useIsMobile.js'
import { pickResponsive } from '../../lib/responsiveImage.js'
import './Activities.css'

export default function Activities() {
  const { t } = useI18n()
  const L = useLocalized()
  const isMobile = useIsMobile()
  const settings = useSettings()

  // תמונות מותאמות מה-CMS (key: activity_images = מיפוי id→ערך תמונה) גוברות על
  // ברירת המחדל. הערך יכול להיות מפוצל ({ desktop, mobile }) — כך אפשר לבחור
  // תמונת *מקור* שונה לחלוטין לכל מכשיר. ללא בידול — אותה תמונה משמשת לשניהם.
  const { desktopItems, mobileItems } = useMemo(() => {
    let map = settings.activity_images
    if (typeof map === 'string') { try { map = JSON.parse(map) } catch { map = null } }
    const valid = map && typeof map === 'object'
    const desk = activities.map((a) => {
      const v = valid ? pickResponsive(map[a.id], 'desktop') : null
      return v ? { ...a, image: v } : a
    })
    const mob = activities.map((a) => {
      const v = valid ? pickResponsive(map[a.id], 'mobile') : null
      return v ? { ...a, image: v } : a
    })
    return { desktopItems: desk, mobileItems: mob }
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
          <ActivityMenu items={mobileItems} />
        ) : (
          <div className="activities__grid">
            {desktopItems.map((a, i) => (
              <Reveal key={a.id} delay={(i % 4) * 0.08}>
                <FeatureCard
                  icon={a.icon}
                  title={L(a.title)}
                  desc={L(a.desc)}
                  to={a.to || '/#contact'}
                  cta={t('common.readMore')}
                  image={a.image}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
