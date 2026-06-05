import { useParams, Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import { getProject } from '../data/projects.js'
import SmartImage from '../components/ui/SmartImage.jsx'
import Parallax from '../components/ui/Parallax.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import './ProjectDetail.css'

export default function ProjectDetail() {
  const { slug } = useParams()
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const project = getProject(slug)
  const [activeImg, setActiveImg] = useState(0)

  if (!project) return <Navigate to="/projects" replace />

  const hasVideo = project.video && project.video.id && project.video.type === 'youtube'
  const hasFileVideo = project.video && project.video.src && project.video.type === 'file'
  const gallery = project.gallery?.length ? project.gallery : [project.cover]

  return (
    <article className="project-detail">
      <Seo
        title={L(project.name)}
        description={L(project.short) || L(project.description)}
        image={project.cover}
      />
      {/* Hero */}
      <header className="pd-hero">
        <Parallax className="pd-hero__bg">
          <SmartImage src={project.cover} alt={L(project.name)} label={L(project.name)} />
        </Parallax>
        <div className="pd-hero__overlay" />
        <div className="container pd-hero__content">
          <Link to="/projects" className="pd-hero__back">
            <Icon name={isRTL ? 'arrow' : 'arrowLeft'} size={18} /> {t('common.back')}
          </Link>
          <span className={`pd-hero__status pd-hero__status--${project.status}`}>
            {t(`projects.status.${project.status}`)}
          </span>
          <h1 className="pd-hero__title">{L(project.name)}</h1>
          <p className="pd-hero__meta">
            <Icon name="location" size={18} /> {L(project.city)} · {L(project.type)} · {project.year}
          </p>
        </div>
      </header>

      <div className="container">
        <Breadcrumbs
          items={[
            { label: t('projects.title'), to: '/projects' },
            { label: L(project.name) },
          ]}
        />
      </div>

      <div className="container pd-body">
        <div className="pd-main">
          <Reveal>
            <h2 className="pd-section-title">{L(project.name)}</h2>
            <p className="pd-description">{L(project.description)}</p>
          </Reveal>

          {/* גלריית תמונות */}
          <Reveal className="pd-gallery" delay={0.05}>
            <div className="pd-gallery__main">
              <SmartImage
                src={gallery[activeImg]}
                alt={`${L(project.name)} ${activeImg + 1}`}
                label={L(project.name)}
              />
            </div>
            {gallery.length > 1 && (
              <div className="pd-gallery__thumbs">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`pd-thumb ${i === activeImg ? 'pd-thumb--active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={`Image ${i + 1}`}
                  >
                    <SmartImage src={img} alt="" label="" />
                  </button>
                ))}
              </div>
            )}
          </Reveal>

          {/* סרטון */}
          {(hasVideo || hasFileVideo) && (
            <Reveal className="pd-video" delay={0.05}>
              {hasVideo ? (
                <div className="pd-video__frame">
                  <iframe
                    src={`https://www.youtube.com/embed/${project.video.id}`}
                    title={L(project.name)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video className="pd-video__file" controls src={project.video.src} />
              )}
            </Reveal>
          )}
        </div>

        {/* Sidebar */}
        <aside className="pd-aside">
          <Reveal variant="left">
            <div className="pd-facts">
              <div className="pd-fact">
                <span className="pd-fact__label">{t('projects.status.' + project.status)}</span>
                <span className="pd-fact__value">{project.year}</span>
              </div>
              <div className="pd-fact">
                <span className="pd-fact__label">יחידות / Units</span>
                <span className="pd-fact__value">{project.units}</span>
              </div>
              <div className="pd-fact">
                <span className="pd-fact__label">סוג / Type</span>
                <span className="pd-fact__value">{L(project.type)}</span>
              </div>
            </div>

            {project.features?.length > 0 && (
              <ul className="pd-features">
                {project.features.map((f, i) => (
                  <li key={i}>
                    <Icon name="check" size={18} /> {L(f)}
                  </li>
                ))}
              </ul>
            )}

            <Link to="/#contact" className="btn btn--primary btn--lg pd-cta">
              {t('nav.contact')}
              <Icon name="arrow" size={20} />
            </Link>
          </Reveal>
        </aside>
      </div>
    </article>
  )
}
