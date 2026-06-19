import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import localStats from '../data/stats.js'
import HeroCollage from '../components/ui/HeroCollage.jsx'
import Seo from '../components/ui/Seo.jsx'
import { supabase } from '../lib/supabase.js'
import { listProjectCards, listCounters, projectPages, cachedSnapshot } from '../lib/cms.js'
import { srcOfResponsive } from '../lib/responsiveImage.js'
import './Projects.css'

// ממיר שורות CMS לפריטי הקולאז' — "פרויקטים נבחרים" אם תויגו, אחרת כל הפרויקטים
function mapRows(rows) {
  if (!rows || !rows.length) return []
  // מסוננים לפי תיוג "כל הפרויקטים"; אם אין מתויגים — נופלים ל"פרויקטים נבחרים", ואז להכול
  const all = rows.filter((p) => projectPages(p).includes('all'))
  const featured = rows.filter((p) => projectPages(p).includes('featured'))
  const use = all.length ? all : (featured.length ? featured : rows)
  return use.map((p) => ({
    name: p.name,
    slug: p.slug || p.id,
    cover: srcOfResponsive(p.hero_image_url) || srcOfResponsive(p.gallery && p.gallery[0]),
    gallery: p.gallery || [],
    card_layout: p.card_layout,
  }))
}

export default function Projects() {
  const { t } = useI18n()
  const L = useLocalized()

  // זריעה מיידית מתמונת-מצב שמורה → הפרויקטים מופיעים מיד ברענון/חזרה לעמוד (בלי דמו)
  const [projects, setProjects] = useState(() => mapRows(cachedSnapshot('projects:cards')))
  const [statItems, setStatItems] = useState(() =>
    localStats.slice(0, 3).map((s) => ({ value: `${s.value.toLocaleString('en-US')}${s.suffix}`, label: L(s.label) }))
  )

  useEffect(() => {
    if (!supabase) return
    listProjectCards()
      .then((rows) => { if (rows) setProjects(mapRows(rows)) })
      .catch(() => {})
    listCounters({ activeOnly: true })
      .then((rows) => {
        if (rows && rows.length) setStatItems(rows.slice(0, 3).map((c) => ({ value: `${c.value ?? ''}${c.suffix ?? ''}`, label: c.label_he })))
      })
      .catch(() => {})
  }, [])

  // כרטיס אחד לכל פרויקט (לא להתפוצץ לכל תמונות הגלריה). מציגים כל פרויקט גם אם
  // אין לו תמונת כיסוי (placeholder), ונמנעים מכפילויות לפי slug.
  // (deploy: force production refresh)
  const seen = new Set()
  const collageItems = []
  projects.forEach((p, idx) => {
    const key = p.slug || `p-${idx}`
    if (seen.has(key)) return
    seen.add(key)
    const url = p.cover || (Array.isArray(p.gallery) && p.gallery[0]) || ''
    collageItems.push({
      url,
      name: p.name || 'פרויקט',
      to: p.slug ? `/projects/${p.slug}` : '/projects',
      layout: p.card_layout || 'normal',
    })
  })

  const allTitle = t('pages.projects.title')
  const lead = t('pages.projects.lead')

  return (
    <>
      <Seo title={allTitle} description={lead} />
      <HeroCollage title={allTitle} subtitle={lead} stats={statItems} items={collageItems} />
    </>
  )
}