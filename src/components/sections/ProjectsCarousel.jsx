import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/index.jsx'
import projects from '../../data/projects.js'
import ProjectCard from '../ui/ProjectCard.jsx'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import './ProjectsCarousel.css'

export default function ProjectsCarousel() {
  const { t, isRTL } = useI18n()
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    // ב-RTL scrollLeft הוא שלילי/הפוך — מנרמלים
    const max = el.scrollWidth - el.clientWidth
    const pos = Math.abs(el.scrollLeft)
    setCanPrev(pos > 4)
    setCanNext(pos < max - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

  const scrollByCards = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('.carousel__item')
    const amount = card ? card.offsetWidth + 24 : 360
    const sign = isRTL ? -1 : 1
    el.scrollBy({ left: dir * amount * sign, behavior: 'smooth' })
  }

  return (
    <section className="section section--soft projects-carousel" id="projects">
      <div className="container">
        <div className="projects-carousel__head">
          <Reveal>
            <span className="eyebrow">{t('projects.eyebrow')}</span>
            <h2 className="section-title">{t('projects.title')}</h2>
            <p className="section-lead">{t('projects.lead')}</p>
          </Reveal>

          <div className="projects-carousel__controls">
            <button
              type="button"
              className="carousel__arrow"
              onClick={() => scrollByCards(-1)}
              disabled={!canPrev}
              aria-label="Previous"
            >
              <Icon name={isRTL ? 'arrow' : 'arrowLeft'} size={22} />
            </button>
            <button
              type="button"
              className="carousel__arrow"
              onClick={() => scrollByCards(1)}
              disabled={!canNext}
              aria-label="Next"
            >
              <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={22} />
            </button>
          </div>
        </div>

        <div className="carousel__track" ref={trackRef}>
          {projects.map((p) => (
            <div className="carousel__item" key={p.slug}>
              <ProjectCard project={p} />
            </div>
          ))}
        </div>

        <Reveal className="projects-carousel__footer" delay={0.1}>
          <Link to="/projects" className="btn btn--dark btn--lg">
            {t('projects.all')}
            <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={20} />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
