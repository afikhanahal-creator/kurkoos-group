import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import partnersData from '../../data/partners.js'
import LogoCarousel from '../ui/LogoCarousel.jsx'
import { supabase } from '../../lib/supabase.js'
import { listLogos, fetchSettings } from '../../lib/cms.js'
import './Partners.css'

// ערבוב Fisher-Yates — מחזיר עותק מעורבב
const shuffleArr = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function Partners() {
  const { t } = useI18n()
  const [logos, setLogos] = useState(partnersData)
  const [shuffleOn, setShuffleOn] = useState(false)
  const [hidden, setHidden] = useState(false)   // מתג ראשי מה-CMS — הסתרת כל הרצועה

  useEffect(() => {
    if (!supabase) return
    let alive = true
    Promise.all([listLogos({ activeOnly: true }), fetchSettings().catch(() => ({}))])
      .then(([rows, settings]) => {
        if (!alive) return
        // מתג ראשי: כבוי במפורש (false/0) → מסתירים את כל הרצועה
        const en = settings?.logos_enabled
        if (en === false || en === 'false' || en === 0 || en === '0') { setHidden(true); return }
        if (!rows || !rows.length) return
        const v = settings?.logo_shuffle
        const on = v === true || v === 'true' || v === 1 || v === '1'
        setShuffleOn(on)
        setLogos(on ? shuffleArr(rows) : rows)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (hidden) return null

  return (
    <section className="partners">
      <div className="container">
        <p className="partners__title">{t('partners.title')}</p>
        <LogoCarousel logos={logos} interval={3100} shuffle={shuffleOn} />
      </div>
    </section>
  )
}
