import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import githubLogos from '../../data/logos.js'
import LogoCarousel from '../ui/LogoCarousel.jsx'
import KineticText from '../ui/KineticText.jsx'
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
  // ברירת מחדל: הלוגואים מ-GitHub (public/logos) → הרצועה תמיד מלאה, גם בלי Supabase.
  const [logos, setLogos] = useState(githubLogos)
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
        const v = settings?.logo_shuffle
        const on = v === true || v === 'true' || v === 1 || v === '1'
        setShuffleOn(on)
        // הלוגואים מ-GitHub (public/logos) הם הבסיס המובטח — תמיד מוצגים, אף פעם לא מתרוקן.
        // שורות מ-Supabase עם תמונה *מתווספות* (ללא כפילויות), אבל לעולם לא דורסות/מרוקנות.
        const ghBase = githubLogos
        const ghUrls = new Set(ghBase.map((g) => g.image_url))
        const extra = (rows || []).filter((r) => r.image_url && !ghUrls.has(r.image_url))
        const base = [...ghBase, ...extra]
        setLogos(on ? shuffleArr(base) : base)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (hidden) return null

  return (
    <section className="partners">
      <div className="container">
        <KineticText as="p" className="partners__title" text={t('partners.title')} />
        <LogoCarousel logos={logos} interval={3100} shuffle={shuffleOn} />
      </div>
    </section>
  )
}
