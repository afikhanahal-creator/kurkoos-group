import { useI18n, useLocalized } from '../i18n/index.jsx'
import team from '../data/team.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import TeamGrid from '../components/ui/TeamGrid.jsx'
import DEF from '../lib/pageBuilder/defs/team.js'
import { PageSections } from '../lib/pageBuilder/PageRenderer.jsx'
import './Team.css'

/* הסקשנים של העמוד, הסדר הקבוע ב-defs/team.js */
const LOCAL = {
  /* תיאור החיפוש מונה את האנשים בשמם, זהה לעמוד המרונדר מראש.
     הכותרת והליד שעל המסך לא משתנים. */
  header: ({ ctx: { t, members } }) => (
    <PageHeader
      eyebrow={t('pages.team.eyebrow')}
      title={t('pages.team.title')}
      lead={t('pages.team.lead')}
      seoDescription={`הצוות של קורקוס גרופ: ${[...members].reverse().map((m) => `${m.name}, ${m.role}`).join('. ')}. מלווים כל פרויקט בהוד השרון ובאזור המרכז מהתכנון ועד מסירת המפתח.`.slice(0, 300)}
      crumbs={[{ label: t('nav.about'), to: '/about' }, { label: t('pages.team.title') }]}
    />
  ),
  members: ({ ctx: { members } }) => (
    <section className="section team-page">
      <div className="container">
        <Reveal>
          <TeamGrid members={members} />
        </Reveal>
      </div>
    </section>
  ),
}

export default function Team() {
  const { t } = useI18n()
  const L = useLocalized()

  const members = team.map((m) => ({
    id: m.id,
    name: L(m.name),
    role: L(m.role),
    bio: L(m.bio),
    image: m.photo,
    imgPos: m.imgPos,
    imgZoom: m.imgZoom,
    imgBright: m.imgBright,
    link: m.linkedin,
  }))

  return <PageSections def={DEF} local={LOCAL} ctx={{ t, members }} />
}
