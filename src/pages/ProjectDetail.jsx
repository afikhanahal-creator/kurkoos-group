import { useParams, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import { getProject as getLocalProject } from '../data/projects.js'
import SmartImage from '../components/ui/SmartImage.jsx'
import Parallax from '../components/ui/Parallax.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Seo from '../components/ui/Seo.jsx'
import Icon from '../components/ui/Icon.jsx'
import { supabase } from '../lib/supabase.js'
import { listPropertiesBySlug } from '../lib/cms.js'
import { PROJECT_STATUS, PROPERTY_TYPE, PROPERTY_STATUS } from './admin/schema.js'
import './ProjectDetail.css'

const label = (opts, v) => opts.find((o) => o.value === v)?.label || v || ''

export default function ProjectDetail() {
  const { slug } = useParams()
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const [activeImg, setActiveImg] = useState(0)
  const [state, setState] = useState({ loading: true, project: null, properties: [] })

  useEffect(() => {
    let alive = true
    setActiveImg(0)
    setState((s) => ({ ...s, loading: true }))
    const run = async () => {
      if (supabase) {
        try {
          const { project, properties } = await listPropertiesBySlug(slug)
          if (project) {
            const unified = {
              name: project.name,
              description: project.description,
              status: project.status,
              location: project.location,
              cover: project.hero_image_url || (project.gallery && project.gallery[0]),
              gallery: project.gallery || [],
            }
            if (alive) setState({ loading: false, project: unified, properties: properties || [] })
            return
          }
        } catch (e) { console.error(e) }
      }
      const local = getLocalProject(slug)
      if (alive) {
        setState({
          loading: false,
          project: local ? {
            name: L(local.name), description: L(local.description), status: local.status,
            location: L(local.city), cover: local.cover, gallery: local.gallery || [local.cover],
          } : null,
          properties: [],
        })
      }
    }
    run()
    return () => { alive = false }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <div className="pd-loading">טוען…</div>
  if (!state.project) return <Navigate to="/projects" replace />

  const p = state.project
  const gallery = (p.gallery && p.gallery.length) ? p.gallery : (p.cover ? [p.cover] : [])
  const props = state.properties

  return (
    <article className="project-detail">
      <Seo title={p.name} description={p.description} image={p.cover} />

      <header className="pd-hero">
        <Parallax className="pd-hero__bg">
          <SmartImage src={p.cover} alt={p.name} label={p.name} />
        </Parallax>
        <div className="pd-hero__overlay" />
        <div className="container pd-hero__content">
          <Link to="/projects" className="pd-hero__back">
            <Icon name={isRTL ? 'arrow' : 'arrowLeft'} size={18} /> {t('common.back')}
          </Link>
          <span className="pd-hero__status">{label(PROJECT_STATUS, p.status)}</span>
          <h1 className="pd-hero__title">{p.name}</h1>
          {p.location && <p className="pd-hero__meta"><Icon name="location" size={18} /> {p.location}</p>}
        </div>
      </header>

      <div className="container">
        <Breadcrumbs items={[{ label: t('projects.title'), to: '/projects' }, { label: p.name }]} />
      </div>

      <div className="container pd-body">
        <div className="pd-main">
          {p.description && (
            <Reveal>
              <h2 className="pd-section-title">{p.name}</h2>
              <p className="pd-description">{p.description}</p>
            </Reveal>
          )}

          {gallery.length > 0 && (
            <Reveal className="pd-gallery" delay={0.05}>
              <div className="pd-gallery__main">
                <SmartImage src={gallery[activeImg]} alt={`${p.name} ${activeImg + 1}`} label={p.name} />
              </div>
              {gallery.length > 1 && (
                <div className="pd-gallery__thumbs">
                  {gallery.map((img, i) => (
                    <button key={i} type="button" className={`pd-thumb ${i === activeImg ? 'pd-thumb--active' : ''}`} onClick={() => setActiveImg(i)} aria-label={`תמונה ${i + 1}`}>
                      <SmartImage src={img} alt="" label="" />
                    </button>
                  ))}
                </div>
              )}
            </Reveal>
          )}

          {/* נכסים / יחידות */}
          {props.length > 0 && (
            <Reveal className="pd-units" delay={0.05}>
              <h2 className="pd-section-title">נכסים בפרויקט</h2>
              <div className="pd-units__grid">
                {props.map((u) => (
                  <div className="pd-unit" key={u.id}>
                    {(u.gallery && u.gallery[0]) && (
                      <div className="pd-unit__img"><SmartImage src={u.gallery[0]} alt="" label="" /></div>
                    )}
                    <div className="pd-unit__body">
                      <div className="pd-unit__top">
                        <span className="pd-unit__title">יחידה {u.unit_number || '—'}</span>
                        <span className={`pd-unit__status pd-unit__status--${u.status}`}>{label(PROPERTY_STATUS, u.status)}</span>
                      </div>
                      <div className="pd-unit__specs">
                        {u.type && <span>{label(PROPERTY_TYPE, u.type)}</span>}
                        {u.rooms != null && <span>{u.rooms} חד׳</span>}
                        {u.floor && <span>קומה {u.floor}</span>}
                        {u.size_sqm != null && <span>{u.size_sqm} מ״ר</span>}
                      </div>
                      {u.description && <p className="pd-unit__desc">{u.description}</p>}
                      {u.price_visible && u.price != null && (
                        <div className="pd-unit__price">₪ {Number(u.price).toLocaleString('he-IL')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        <aside className="pd-aside">
          <Reveal variant="left">
            <div className="pd-facts">
              <div className="pd-fact">
                <span className="pd-fact__label">סטטוס</span>
                <span className="pd-fact__value">{label(PROJECT_STATUS, p.status)}</span>
              </div>
              {p.location && (
                <div className="pd-fact">
                  <span className="pd-fact__label">מיקום</span>
                  <span className="pd-fact__value">{p.location}</span>
                </div>
              )}
              <div className="pd-fact">
                <span className="pd-fact__label">יחידות</span>
                <span className="pd-fact__value">{props.length || '—'}</span>
              </div>
            </div>
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
