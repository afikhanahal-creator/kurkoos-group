import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import githubLogos from '../../data/logos.js'
import LogoCarousel from '../ui/LogoCarousel.jsx'
import KineticText from '../ui/KineticText.jsx'
import { supabase } from '../../lib/supabase.js'
import { fetchSettings } from '../../lib/cms.js'
import './Partners.css'

export default function Partners() {
  const { t } = useI18n()
  // הלוגואים תמיד מ-GitHub (public/logos/1..15.png) — 15 לוגואים קבועים.
  const [shuffleOn, setShuffleOn] = useState(false)
  const [hidden, setHidden] = useState(false)   // מתג ראשי מה-CMS — הסתרת כל הרצועה

  useEffect(() => {
    if (!supabase) return
    let alive = true
    fetchSettings()
      .then((settings) => {
        if (!alive) return
        const en = settings?.logos_enabled
        if (en === false || en === 'false' || en === 0 || en === '0') { setHidden(true); return }
        const v = settings?.logo_shuffle
        setShuffleOn(v === true || v === 'true' || v === 1 || v === '1')
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (hidden) return null

  return (
    <section className="partners">
      <div className="container">
        <KineticText as="p" className="partners__title" text={t('partners.title')} />
        <LogoCarousel logos={githubLogos} shuffle={shuffleOn} />
      </div>
    </section>
  )
}
