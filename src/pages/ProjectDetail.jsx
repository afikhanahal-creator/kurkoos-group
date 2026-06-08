import { useParams, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import { getProject } from '../data/projects.js'
import { getProjectBySlug } from '../lib/cms.js'
import { supabase } from '../lib/supabase.js'
import SmartImage from '../components/ui/SmartImage.jsx'
import Parallax from '../components/ui/Parallax.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import VideoModal from '../components/ui/VideoModal.jsx'
import PlanAccordion from '../components/ui/PlanAccordion.jsx'
import Lightbox from '../components/ui/Lightbox.jsx'
import PropertyMap from '../components/ui/PropertyMap.jsx'
import Icon from '../components/ui/Icon.jsx'
import './ProjectDetail.css'

const CAL_IMG = 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1000&q=80'

/* דקורציה — רשת נקודות עדינה עם כמה "+" צבעוניים, ברקע אזורי banner/contact */
function DottedGrid({ className = '' }) {
  return (
    <svg className={`pd-dots ${className}`} viewBox="0 0 240 160" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="pd-dot" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="240" height="160" fill="url(#pd-dot)" />
      <g strokeWidth="2.4" strokeLinecap="round">
        <path d="M44 28h12M50 22v12" stroke="#e0a106" />
        <path d="M186 116h12M192 110v12" stroke="#a90b0c" />
        <path d="M150 36h12M156 30v12" stroke="#3a7bd5" />
      </g>
    </svg>
  )
}

// עוטף ערך טקסט ל-{he,en} (Supabase מחזיר מחרוזות, האתר מצפה לאובייקט דו-לשוני)
const wrap = (v) => (v == null ? undefined : typeof v === 'object' ? v : { he: String(v), en: String(v) })

// מאחד נתון מקומי מועשר (planGroups/environment/...) עם שכבת-על מה-CMS (שדות בסיסיים)
function buildProject(local, cms) {
  if (!local && !cms) return null
  const base = local ? { ...local } : {}
  if (cms) {
    const over = {
      name: wrap(cms.name),
      city: wrap(cms.location ?? cms.city),
      description: wrap(cms.description),
      status: cms.status,
      cover: cms.hero_image_url || (cms.gallery && cms.gallery[0]),
      gallery: cms.gallery && cms.gallery.length ? cms.gallery : undefined,
      units: cms.units,
      year: cms.year,
      // הכתובת מה-CMS מזינה את המפה בעמוד הפרויקט
      mapQuery: cms.address || cms.map_query || undefined,
    }
    for (const k in over) if (over[k] !== undefined) base[k] = over[k]
  }
  return base.name ? base : null
}

export default function ProjectDetail() {
  const { slug } = useParams()
  const { t } = useI18n()
  const L = useLocalized()
  const local = getProject(slug)
  const [cms, setCms] = useState(null)

  const [videoOpen, setVideoOpen] = useState(false)
  const [galleryTab, setGalleryTab] = useState(0)
  const [activeSection, setActiveSection] = useState('project')
  const [lightbox, setLightbox] = useState(null) // { images, index }
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', consent: false })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  // scroll-spy — מסמן את העוגן הפעיל לפי הסקשן הנראה
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.pd-anchor'))
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id) }),
      { rootMargin: '-160px 0px -60% 0px', threshold: 0 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [slug])

  // שכבת-על מה-CMS (אם מחובר) — מעדכן שדות בסיסיים מעל הנתון המקומי
  useEffect(() => {
    setCms(null)
    if (!supabase) return
    let alive = true
    getProjectBySlug(slug).then((row) => { if (alive && row) setCms(row) }).catch(() => {})
    return () => { alive = false }
  }, [slug])

  const project = buildProject(local, cms)
  if (!project) return <Navigate to="/projects" replace />

  const hasVideo =
    (project.video?.id && project.video.type === 'youtube') ||
    (project.video?.src && project.video.type === 'file')
  const flatGallery = project.gallery?.length ? project.gallery : [project.cover]
  const galleryGroups = project.galleryGroups?.length
    ? project.galleryGroups
    : [{ label: { he: 'הפרויקט', en: 'Project' }, images: flatGallery }]
  const currentImages = galleryGroups[galleryTab]?.images || flatGallery
  // מפה: Maps Embed API (מפה מלוטשת עם סמן) כשמוגדר מפתח; אחרת fallback בסיסי
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
  const mapQuery = project.mapQuery || L(project.city) || L(project.name)
  const mapSrc = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(mapQuery)}&zoom=16&language=he&region=IL`
    : `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`

  // קבוצות תוכניות — נתון מובנה אם קיים, אחרת נגזרות מ-plans השטוח
  const planGroups = project.planGroups?.length
    ? project.planGroups
    : project.plans?.length
      ? [{
          rooms: 0,
          label: { he: 'תוכניות הפרויקט', en: 'Project plans' },
          plans: project.plans.map((img, i) => ({ label: { he: `דגם ${i + 1}`, en: `Type ${i + 1}` }, img })),
        }]
      : []

  // עוגנים דינמיים — רק סקשנים עם תוכן
  const anchors = [
    { id: 'project', label: { he: 'הפרויקט', en: 'Project' } },
    project.environment && { id: 'environment', label: { he: 'הסביבה', en: 'Environment' } },
    { id: 'map', label: { he: 'מפה', en: 'Map' } },
    planGroups.length && { id: 'plans', label: { he: 'תוכניות', en: 'Plans' } },
    { id: 'gallery', label: { he: 'גלריה', en: 'Gallery' } },
    { id: 'contact', label: { he: 'לתיאום פגישה', en: 'Schedule' } },
  ].filter(Boolean)

  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const openLightbox = (images, index) => setLightbox({ images, index })

  const setField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = true
    if (!/^[\d\s\-+()]{9,}$/.test(form.phone.trim())) next.phone = true
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = true
    if (Object.keys(next).length) { setErrors(next); return }
    setSent(true) // client-side only — no backend
  }

  return (
    <article className="project-detail">
      {/* ===== Banner ===== */}
      <header className="pd-banner">
        <div className="container">
          <Breadcrumbs
            items={[{ label: t('projects.title'), to: '/projects' }, { label: L(project.name) }]}
          />
          <div className="pd-banner__grid">
            {/* תוכן */}
            <div className="pd-banner__content">
              <span className="pd-banner__location">
                <Icon name="location" size={16} /> {L(project.city)}
              </span>
              <h1 className="pd-banner__name">{L(project.name)}</h1>
              <p className="pd-banner__desc">{L(project.short || project.description)}</p>

              <div className="pd-banner__stats-wrap">
                <div className="pd-banner__stats">
                  {project.towers > 0 && (
                    <div className="pd-stat">
                      <span className="pd-stat__value" dir="ltr">{project.towers}</span>
                      <span className="pd-stat__label">{L({ he: 'בניינים', en: 'Buildings' })}</span>
                    </div>
                  )}
                  {project.floors && (
                    <div className="pd-stat">
                      <span className="pd-stat__value" dir="ltr">{project.floors}</span>
                      <span className="pd-stat__label">{L({ he: 'קומות', en: 'Floors' })}</span>
                    </div>
                  )}
                  {project.units > 0 && (
                    <div className="pd-stat">
                      <span className="pd-stat__value" dir="ltr">{project.units}</span>
                      <span className="pd-stat__label">{L({ he: 'יחידות דיור', en: 'Units' })}</span>
                    </div>
                  )}
                  {project.architects && (
                    <div className="pd-stat">
                      <span className="pd-stat__value pd-stat__value--sm">{L(project.architects)}</span>
                      <span className="pd-stat__label">{L({ he: 'אדריכלים', en: 'Architects' })}</span>
                    </div>
                  )}
                  <div className={`pd-stat pd-stat--status pd-stat--status-${project.status}`}>
                    <span className="pd-stat__value pd-stat__value--sm">{t(`projects.status.${project.status}`)}</span>
                    <span className="pd-stat__label">{L({ he: 'סטטוס', en: 'Status' })}</span>
                  </div>
                </div>
                <DottedGrid className="pd-dots--banner" />
              </div>
            </div>

            {/* מדיה */}
            <div className="pd-banner__media">
              <Parallax className="pd-banner__media-img">
                <SmartImage src={project.cover} alt={L(project.name)} label={L(project.name)} />
              </Parallax>
              {hasVideo && (
                <button
                  type="button"
                  className="pd-banner__play"
                  onClick={() => setVideoOpen(true)}
                  aria-label={t('hero.ctaSecondary')}
                >
                  <Icon name="play" size={30} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== Sticky anchors ===== */}
      <nav className="pd-anchors" aria-label="Project sections">
        <div className="container pd-anchors__inner">
          {anchors.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`pd-anchors__item ${activeSection === a.id ? 'is-active' : ''}`}
              aria-current={activeSection === a.id ? 'true' : undefined}
              onClick={() => goTo(a.id)}
            >
              {L(a.label)}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== הפרויקט ===== */}
      <section id="project" className="section pd-anchor pd-split">
        <div className="container pd-split__grid">
          <Reveal className="pd-split__media" variant="right">
            <SmartImage src={flatGallery[0]} alt={L(project.name)} label={L(project.name)} />
          </Reveal>
          <Reveal className="pd-split__body" variant="left" delay={0.1}>
            <span className="eyebrow">{L({ he: 'על הפרויקט', en: 'About the project' })}</span>
            <h2 className="section-title">{L(project.name)}</h2>
            <p className="pd-prose">{L(project.description)}</p>
            {project.features?.length > 0 && (
              <ul className="pd-features">
                {project.features.map((f, i) => (
                  <li key={i}><Icon name="check" size={18} /> {L(f)}</li>
                ))}
              </ul>
            )}
            <button type="button" className="btn btn--primary btn--lg" onClick={() => goTo('contact')}>
              {L({ he: 'לתיאום פגישה', en: 'Schedule a meeting' })}
              <Icon name="arrowLeft" size={20} />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ===== הסביבה ===== */}
      {project.environment && (
        <section id="environment" className="section section--soft pd-anchor pd-split pd-split--reverse">
          <div className="container pd-split__grid">
            <Reveal className="pd-split__body" variant="right">
              <span className="eyebrow">{L({ he: 'על הסביבה', en: 'The environment' })}</span>
              <h2 className="section-title">{L(project.environment.title)}</h2>
              <p className="pd-prose">{L(project.environment.text)}</p>
            </Reveal>
            <Reveal className="pd-split__media" variant="left" delay={0.1}>
              <SmartImage src={project.environment.image} alt={L(project.environment.title)} label={L(project.name)} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ===== מפה ===== */}
      <section id="map" className="section pd-anchor">
        <div className="container">
          <Reveal className="pd-head">
            <span className="eyebrow">{L({ he: 'מיקום', en: 'Location' })}</span>
            <h2 className="section-title">{L({ he: 'המיקום על המפה', en: 'On the map' })}</h2>
          </Reveal>
          <Reveal className="pd-map" delay={0.05}>
            {mapsKey && project.coords ? (
              <PropertyMap
                lat={project.coords.lat}
                lng={project.coords.lng}
                label={L(project.name)}
                zoom={15}
              />
            ) : (
              <iframe
                title={L(project.name)}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            )}
            <span className="pd-map__pin">
              <Icon name="location" size={18} /> {L(project.name)} · {L(project.city)}
            </span>
          </Reveal>
        </div>
      </section>

      {/* ===== תוכניות — אקורדיון ===== */}
      {planGroups.length > 0 && (
        <section id="plans" className="section section--soft pd-anchor">
          <div className="container">
            <Reveal className="pd-head">
              <span className="eyebrow">{L({ he: 'תכנון', en: 'Planning' })}</span>
              <h2 className="section-title">{L({ he: 'תוכניות הדירות', en: 'Apartment plans' })}</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <PlanAccordion groups={planGroups} onEnlarge={(img) => openLightbox([img], 0)} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ===== גלריה ===== */}
      <section id="gallery" className="section pd-anchor">
        <div className="container">
          <Reveal className="pd-head">
            <span className="eyebrow">{L({ he: 'תמונות', en: 'Images' })}</span>
            <h2 className="section-title">{L({ he: 'גלריה', en: 'Gallery' })}</h2>
          </Reveal>

          {galleryGroups.length > 1 && (
            <div className="pd-gtabs" role="tablist">
              {galleryGroups.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={galleryTab === i}
                  className={`pd-gtab ${galleryTab === i ? 'is-active' : ''}`}
                  onClick={() => setGalleryTab(i)}
                >
                  {L(g.label)}
                </button>
              ))}
            </div>
          )}

          <div className="pd-gallery">
            {currentImages.map((src, i) => (
              <button
                key={`${galleryTab}-${i}`}
                type="button"
                className="pd-gallery__item"
                onClick={() => openLightbox(currentImages, i)}
                aria-label={`${L(project.name)} ${i + 1}`}
              >
                <SmartImage src={src} alt={`${L(project.name)} ${i + 1}`} label={L(project.name)} />
                <span className="pd-gallery__zoom"><Icon name="search" size={20} /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== לתיאום פגישה — פאנל דו-טורי עם טופס ===== */}
      <section id="contact" className="section pd-anchor pd-cta-sec">
        <div className="container">
          <div className="pd-contact">
            <DottedGrid className="pd-dots--contact" />
            <div className="pd-contact__panel">
              <span className="eyebrow pd-contact__eyebrow">{L({ he: 'דברו איתנו', en: 'Get in touch' })}</span>
              <h2 className="pd-contact__title">{L({ he: 'לתיאום פגישה', en: 'Schedule a meeting' })}</h2>
              <p className="pd-contact__text">
                {L({
                  he: `השאירו פרטים ונציג מכירות של ${L(project.name)} יחזור אליכם בהקדם.`,
                  en: `Leave your details and a ${L(project.name)} sales representative will get back to you shortly.`,
                })}
              </p>

              {sent ? (
                <div className="pd-contact__success" role="status">
                  <span className="pd-contact__success-icon"><Icon name="check" size={36} /></span>
                  <p>{L({ he: 'תודה! הפנייה התקבלה ונחזור אליכם בקרוב.', en: 'Thanks! Your request was received — we’ll be in touch soon.' })}</p>
                </div>
              ) : (
                <form className="pd-contact__form" onSubmit={handleSubmit} noValidate>
                  <p className="pd-contact__required">{L({ he: '* שדות חובה', en: '* Required fields' })}</p>
                  <div className="pd-field">
                    <input
                      id="pd-name" name="name" type="text" autoComplete="name"
                      value={form.name} onChange={setField('name')}
                      placeholder={`${L({ he: 'שם מלא', en: 'Full name' })}*`}
                      aria-invalid={!!errors.name} aria-label={L({ he: 'שם מלא', en: 'Full name' })}
                      className={errors.name ? 'has-error' : ''}
                    />
                  </div>
                  <div className="pd-field">
                    <input
                      id="pd-phone" name="phone" type="tel" autoComplete="tel"
                      value={form.phone} onChange={setField('phone')}
                      placeholder={`${L({ he: 'טלפון', en: 'Phone' })}*`}
                      aria-invalid={!!errors.phone} aria-label={L({ he: 'טלפון', en: 'Phone' })}
                      className={errors.phone ? 'has-error' : ''}
                    />
                  </div>
                  <div className="pd-field">
                    <input
                      id="pd-email" name="email" type="email" autoComplete="email"
                      value={form.email} onChange={setField('email')}
                      placeholder={`${L({ he: 'אימייל', en: 'Email' })}*`}
                      aria-invalid={!!errors.email} aria-label={L({ he: 'אימייל', en: 'Email' })}
                      className={errors.email ? 'has-error' : ''}
                    />
                  </div>
                  <div className="pd-field">
                    <textarea
                      id="pd-message" name="message" rows={3}
                      value={form.message} onChange={setField('message')}
                      placeholder={L({ he: 'הודעה (אופציונלי)', en: 'Message (optional)' })}
                      aria-label={L({ he: 'הודעה', en: 'Message' })}
                    />
                  </div>
                  <label className="pd-consent">
                    <input type="checkbox" checked={form.consent} onChange={setField('consent')} />
                    <span>{L({ he: 'אני מאשר/ת קבלת דיוור שיווקי', en: 'I agree to receive marketing communications' })}</span>
                  </label>
                  <button type="submit" className="pd-contact__submit">
                    {L({ he: 'שליחה', en: 'Send' })}
                  </button>
                </form>
              )}
            </div>
            <div className="pd-contact__media">
              <img src={CAL_IMG} alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} video={project.video} title={L(project.name)} />

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((lb) => ({ ...lb, index: i }))}
        />
      )}
    </article>
  )
}
