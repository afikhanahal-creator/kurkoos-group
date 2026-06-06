import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import partnersData from '../../data/partners.js'
import LogoCarousel from '../ui/LogoCarousel.jsx'
import { supabase } from '../../lib/supabase.js'
import { listLogos } from '../../lib/cms.js'
import './Partners.css'

export default function Partners() {
  const { t } = useI18n()
  const [logos, setLogos] = useState(partnersData)

  useEffect(() => {
    if (!supabase) return
    listLogos({ activeOnly: true })
      .then((rows) => { if (rows && rows.length) setLogos(rows) })
      .catch(() => {})
  }, [])

  return (
    <section className="partners">
      <div className="container">
        <p className="partners__title">{t('partners.title')}</p>
        <LogoCarousel logos={logos} interval={2600} />
      </div>
    </section>
  )
}
