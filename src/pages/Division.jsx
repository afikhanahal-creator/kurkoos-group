import { useParams, Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import { getDivision } from '../data/divisions.js'
import projects from '../data/projects.js'
import ProjectCard from '../components/ui/ProjectCard.jsx'
import CardStack from '../components/ui/CardStack.jsx'
import Testimonials from '../components/sections/Testimonials.jsx'
import Contact from '../components/sections/Contact.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Parallax from '../components/ui/Parallax.jsx'
import InfiniteGrid from '../components/ui/InfiniteGrid.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Seo from '../components/ui/Seo.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import Icon from '../components/ui/Icon.jsx'
import './Division.css'

export default function Division() {
  const { slug } = useParams()
  const { t } = useI18n()
  const L = useLocalized()
  const division = getDivision(slug)

  if (!division) return <Navigate to="/" replace />

  // מציג את כל הפרויקטים (עד 4), בדומה לעמוד "כל הפרויקטים".
  const list = projects.slice(0, 4)

  return (
    <article className="division">
      <Seo title={L(division.menuTitle)} description={L(division.intro)} image={division.hero?.image} />
      {/* באנר */}
      <header className="division-hero">
        <Parallax className="division-hero__bg">
          <SmartImage src={division.hero.image} alt={L(division.hero.title)} label={L(division.name)} />
        </Parallax>
        <div className="division-hero__overlay" />
        <InfiniteGrid color="rgba(255,255,255,0.5)" baseOpacity={0.08} revealOpacity={0.28} />
        <div className="container division-hero__content">
          <Breadcrumbs
            items={[
              { label: L({ he: 'תחומי פעילות', en: 'What we do' }), to: '/#activities' },
              { label: L(division.menuTitle) },
            ]}
          />
          <motion.span className="division-hero__icon"
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <Icon name={division.icon} size={40} stroke={1.5} />
          </motion.span>
          <motion.h1 className="division-hero__title"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            {L(division.hero.title)}
          </motion.h1>
          <motion.p className="division-hero__subtitle"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
            {L(division.hero.subtitle)}
          </motion.p>
        </div>
      </header>

      {/* אינטרו */}
      <section className="section division-intro">
        <div className="container">
          <Reveal className="division-intro__text">
            <p>{L(division.intro)}</p>
          </Reveal>
        </div>
      </section>

      {/* למה אנחנו */}
      <section className="section section--soft division-why" id="why">
        <div className="container">
          <Reveal className="division-why__head">
            <span className="eyebrow">{t('activities.eyebrow')}</span>
            <h2 className="section-title">{L(division.name)}</h2>
          </Reveal>
          <div className="division-why__grid">
            {division.why.map((w, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <FeatureCard icon={w.icon} title={L(w.title)} desc={L(w.desc)} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* פרויקטים */}
      <section className="section division-projects" id="projects">
        <div className="container">
          <Reveal className="division-projects__head">
            <h2 className="section-title">{t('projects.title')}</h2>
          </Reveal>
          {/* דסקטופ — רשת כרטיסים */}
          <div className="division-projects__grid">
            {list.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.08}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
          {/* מובייל — ערימת כרטיסים אינטראקטיבית (חוסכת מקום) */}
          <div className="division-projects__stack">
            <CardStack
              items={list.map((p) => ({
                image: p.cover,
                title: L(p.name),
                tagline: `${L(p.city)} · ${L(p.type)}`,
                to: `/projects/${p.slug}`,
              }))}
              cta={t('projects.viewProject')}
            />
          </div>
        </div>
      </section>

      {/* מדריך */}
      <section className="section division-guide">
        <div className="container">
          <Reveal className="division-guide__band" variant="scale">
            <div>
              <span className="eyebrow">{t('common.readMore')}</span>
              <h2 className="division-guide__title">{L(division.guide.title)}</h2>
              <p className="division-guide__desc">{L(division.guide.desc)}</p>
            </div>
            <Link to="/blog" className="btn btn--primary btn--lg">
              {t('common.readMore')}
              <Icon name="arrow" size={20} className="division-guide__arrow" />
            </Link>
          </Reveal>
        </div>
      </section>

      <Testimonials />
      <Contact />
    </article>
  )
}
