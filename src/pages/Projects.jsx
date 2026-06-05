import { useI18n, useLocalized } from '../i18n/index.jsx'
import projects from '../data/projects.js'
import stats from '../data/stats.js'
import HeroCollage from '../components/ui/HeroCollage.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import './Projects.css'

export default function Projects() {
  const { t, lang } = useI18n()
  const L = useLocalized()

  // גלריה אחת — תמונות ייחודיות (כיסוי + גלריה) מכל הפרויקטים, ללא כפילויות.
  // כל תמונה מקושרת לעמוד הפרויקט ומסומנת בשמו.
  const seen = new Set()
  const collageItems = []
  projects.forEach((p) => {
    ;[p.cover, ...(p.gallery || [])].forEach((url) => {
      if (url && !seen.has(url)) {
        seen.add(url)
        collageItems.push({ url, name: L(p.name), to: `/projects/${p.slug}` })
      }
    })
  })

  const collageStats = stats.slice(0, 3).map((s) => ({
    value: `${s.value.toLocaleString('en-US')}${s.suffix}`,
    label: L(s.label),
  }))

  const allTitle = lang === 'he' ? 'כל הפרויקטים' : 'All projects'

  return (
    <>
      <PageHeader
        eyebrow={t('projects.eyebrow')}
        title={allTitle}
        lead={t('projects.lead')}
        crumbs={[{ label: allTitle }]}
      />

      <HeroCollage
        title={allTitle}
        subtitle={t('projects.lead')}
        stats={collageStats}
        items={collageItems}
      />
    </>
  )
}
