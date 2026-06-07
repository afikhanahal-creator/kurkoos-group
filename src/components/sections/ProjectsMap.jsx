import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import projects from '../../data/projects.js'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import KineticText from '../ui/KineticText.jsx'
import './ProjectsMap.css'

/* מיקומי סיכות על המפה (אחוזים). ערוך כאן כדי למקם פרויקט. */
const PINS = {
  'green-heights': { x: 41, y: 30 },
  'marina-towers': { x: 33, y: 36 },
  'park-residence': { x: 36, y: 43 },
  'city-center-renewal': { x: 34, y: 49 },
}

const LEGEND = [
  { key: 'all', color: 'var(--color-primary)' },
  { key: 'residential', color: 'var(--color-secondary)' },
  { key: 'renewal', color: '#5a8a1a' },
  { key: 'commercial', color: 'var(--color-accent)' },
]

export default function ProjectsMap() {
  const { t } = useI18n()
  const L = useLocalized()
  const [active, setActive] = useState(projects[0]?.slug)
  const [filter, setFilter] = useState('all')

  const activeProject = projects.find((p) => p.slug === active)
  const visible = (p) => filter === 'all' || p.category === filter

  return (
    <section className="section section--soft projects-map">
      <div className="container">
        {/* כפתורי CTA */}
        <Reveal className="projects-map__cta-row" variant="up">
          <Link to="/projects" className="btn btn--dark">{t('projects.all')} · {t('category.residential')}</Link>
          <Link to="/projects" className="btn btn--dark">{t('projects.all')} · {t('category.commercial')}</Link>
        </Reveal>

        <div className="projects-map__inner">
          {/* מפה */}
          <Reveal className="projects-map__map-wrap" variant="right">
            <div className="projects-map__map">
              <svg viewBox="0 0 100 160" className="projects-map__svg" aria-hidden="true">
                <defs>
                  <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(16,85,114,0.14)" />
                    <stop offset="100%" stopColor="rgba(16,85,114,0.04)" />
                  </linearGradient>
                </defs>
                <path
                  d="M55 4 L48 30 L40 52 L34 72 L30 92 L26 112 L22 132 L26 156 L34 150 L40 120 L46 96 L52 72 L58 50 L62 30 L60 14 Z"
                  fill="url(#mapGrad)"
                  stroke="rgba(16,85,114,0.4)"
                  strokeWidth="0.8"
                />
              </svg>

              {projects.map((p) => {
                const pos = PINS[p.slug]
                if (!pos) return null
                const isActive = active === p.slug
                const show = visible(p)
                return (
                  <motion.button
                    key={p.slug}
                    type="button"
                    className={`map-cube map-cube--${p.category} ${isActive ? 'is-active' : ''}`}
                    style={{ insetInlineStart: `${pos.x}%`, insetBlockStart: `${pos.y}%` }}
                    onMouseEnter={() => setActive(p.slug)}
                    onClick={() => setActive(p.slug)}
                    aria-label={L(p.name)}
                    animate={{
                      opacity: show ? 1 : 0.15,
                      scale: isActive ? 1.25 : 1,
                      y: isActive ? [-2, -8, -2] : 0,
                    }}
                    transition={{ y: { duration: 1.4, repeat: isActive ? Infinity : 0, ease: 'easeInOut' } }}
                  >
                    <Icon name="box3d" size={26} stroke={1.6} />
                    <span className="map-cube__label">{L(p.city)}</span>
                  </motion.button>
                )
              })}
            </div>
          </Reveal>

          {/* תוכן + מקרא */}
          <Reveal className="projects-map__intro" variant="left" delay={0.1}>
            <span className="eyebrow">{t('map.eyebrow')}</span>
            <KineticText as="h2" className="section-title projects-map__title" text={t('map.title')} />

            <div className="projects-map__legend">
              {LEGEND.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  className={`legend-pill ${filter === l.key ? 'is-active' : ''}`}
                  onClick={() => setFilter(l.key)}
                  style={{ '--dot': l.color }}
                >
                  {l.key === 'all' ? t('projects.eyebrow') : t(`category.${l.key}`)}
                  <span className="legend-pill__dot" />
                </button>
              ))}
            </div>

            {activeProject && (
              <Link to={`/projects/${activeProject.slug}`} className="projects-map__card">
                <span className="projects-map__card-city">
                  <Icon name="location" size={15} /> {L(activeProject.city)}
                </span>
                <strong>{L(activeProject.name)}</strong>
                <span className="projects-map__card-cta">
                  {t('projects.viewProject')} <Icon name="arrow" size={16} />
                </span>
              </Link>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
