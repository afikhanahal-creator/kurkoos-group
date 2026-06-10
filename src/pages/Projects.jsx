import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import localProjects from '../data/projects.js'
import localStats from '../data/stats.js'
import HeroCollage from '../components/ui/HeroCollage.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Seo from '../components/ui/Seo.jsx'
import { supabase } from '../lib/supabase.js'
import { listProjects, listCounters } from '../lib/cms.js'
import './Projects.css'

export default function Projects() {
  const { t, lang } = useI18n()
  const L = useLocalized()

  const [projects, setProjects] = useState(() =>
    localProjects.map((p) => ({ name: L(p.name), slug: p.slug, cover: p.cover, gallery: p.gallery || [], card_layout: p.card_layout }))
  )
  const [statItems, setStatItems] = useState(() =>
    localStats.slice(0, 3).map((s) => ({ value: `${s.value.toLocaleString('en-US')}${s.suffix}`, label: L(s.label) }))
  )

  useEffect(() => {
    if (!supabase) return
    listProjects()
      .then((rows) => {
        if (rows && rows.length) {
          // אם יש פרויקטים שתויגו "פרויקטים נבחרים" — מציגים אותם; אחרת את כולם
          const featured = rows.filter((p) => Array.isArray(p.pages) && p.pages.includes('featured'))
          const use = featured.length ? featured : rows
          setProjects(use.map((p) => ({ name: p.name, slug: p.slug || p.id, cover: p.hero_image_url || (p.gallery && p.gallery[0]), gallery: p.gallery || [], card_layout: p.card_layout })))
        }
      })
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

  const allTitle = lang === 'he' ? 'כל הפרויקטים' : 'All projects'

  return (
    <>
      <Seo title={allTitle} description={t('projects.lead')} />
      <PageHeader eyebrow={t('projects.eyebrow')} title={allTitle} lead={t('projects.lead')} crumbs={[{ label: allTitle }]} />
      <HeroCollage title={allTitle} subtitle={t('projects.lead')} stats={statItems} items={collageItems} />
    </>
  )
}