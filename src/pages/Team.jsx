import { useI18n, useLocalized } from '../i18n/index.jsx'
import team from '../data/team.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import TeamGrid from '../components/ui/TeamGrid.jsx'
import './Team.css'

export default function Team() {
  const { t } = useI18n()
  const L = useLocalized()

  const members = team.map((m) => ({
    id: m.id,
    name: L(m.name),
    role: L(m.role),
    bio: L(m.bio),
    image: m.photo,
    link: m.linkedin,
  }))

  return (
    <>
      <PageHeader eyebrow={t('team.eyebrow')} title={t('team.title')} lead={t('team.lead')} crumbs={[{ label: t('nav.about'), to: '/about' }, { label: t('team.title') }]} />

      <section className="section team-page">
        <div className="container">
          <Reveal>
            <TeamGrid members={members} />
          </Reveal>
        </div>
      </section>
    </>
  )
}
