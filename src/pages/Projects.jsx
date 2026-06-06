import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import localProjects from '../data/projects.js'
import localStats from '../data/stats.js'
import HeroCollage from '../components/ui/HeroCollage.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { supabase } from '../lib/supabase.js'
import { listProjects, listCounters } from '../lib/cms.js'
import './Projects.css'

export default function Projects() {
  const { t, lang } = useI18n()
  const L = useLocalized()

  const [projects, setProjects] = useState(() =>
    localProjects.map((p) => ({ name: L(p.name), slug: p.slug, cover: p.cover, gallery: p.gallery || [] }))
  )
  const [statItems, setStatItems] = useState(() =>
    localStats.slice(0, 3).map((s) => ({ value: `${s.value.toLocaleString('en-US')}${s.suffix}`, label: L(s.label) }))
  )

  useEffect(() => {
    if (!supabase) return
    listProjects()
      .then((rows) => {
        if (rows && rows.length) setProjects(rows.map((p) => ({ name: p.name, slug: p.slug, cover: p.hero_image_url || (p.gallery && p.gallery[0]), gallery: p.gallery || [] })))
      })
      .catch(() => {})
    listCounters({ activeOnly: true })
      .then((rows) => {
        if (rows && rows.length) setStatItems(rows.slice(0, 3).map((c) => ({ value: `${c.value ?? ''}${c.suffix ?? ''}`, label: c.label_he })))
      })
      .catch(() => {})
  }, [])

  const seen = new Set()
  const collageItems = []
  projects.forEach((p) => {
    ;[p.cover, ...(p.gallery || [])].forEach((url) => {
      if (url && !seen.has(url)) {
        seen.add(url)
        collageItems.push({ url, name: p.name, to: `/projects/${p.slug}` })
      }
    })
  })

  const allTitle = lang === 'he' ? 'כל הפרויקטים' : 'All projects'

  return (
    <>
      <PageHeader eyebrow={t('projects.eyebrow')} title={allTitle} lead={t('projects.lead')} crumbs={[{ label: allTitle }]} />
      <HeroCollage title={allTitle} subtitle={t('projects.lead')} stats={statItems} items={collageItems} />
    </>
  )
}