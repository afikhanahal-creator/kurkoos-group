import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import githubLogos from '../../data/logos.js'
import LogoCarousel from '../ui/LogoCarousel.jsx'
import KineticText from '../ui/KineticText.jsx'
import { supabase } from '../../lib/supabase.js'
import { fetchSettings, listLogos } from '../../lib/cms.js'
import './Partners.css'

export default function Partners() {
  const { t } = useI18n()
  const [shuffleOn, setShuffleOn] = useState(false)
  const [hidden, setHidden] = useState(false)   // מתג ראשי מה-CMS — הסתרת כל הרצועה
  // ברירת מחדל = הלוגואים הסטטיים; אם יש לוגואים פעילים ב-CMS — מציגים אותם
  // בדיוק עם הגודל/המיקום שהוגדרו במערכת (אחידות בין ה-CMS לאתר).
  const [logos, setLogos] = useState(githubLogos)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    Promise.all([
      fetchSettings().catch(() => ({})),
      listLogos({ activeOnly: true }).catch(() => []),
    ])
      .then(([settings, rows]) => {
        if (!alive) return
        const en = settings?.logos_enabled
        if (en === false || en === 'false' || en === 0 || en === '0') { setHidden(true); return }
        const v = settings?.logo_shuffle
        setShuffleOn(v === true || v === 'true' || v === 1 || v === '1')
        const cms = (rows || []).filter((r) => r.image_url)
        if (cms.length) {
          setLogos(cms.map((r) => ({
            id: r.id,
            name: r.name || '',
            image_url: r.image_url,
            scale: Number(r.scale) || 1,
            pos_x: Number(r.pos_x) || 0,
            pos_y: Number(r.pos_y) || 0,
            cms: true,
          })))
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (hidden) return null

  return (
    <section className="partners">
      <div className="container">
        <KineticText as="p" className="partners__title" text={t('partners.title')} />
        <LogoCarousel logos={logos} shuffle={shuffleOn} />
      </div>
    </section>
  )
}
