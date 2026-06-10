import { useParams, Link, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import projects, { getProject } from '../data/projects.js'
import divisions from '../data/divisions.js'
import { getProjectBySlug, createLead } from '../lib/cms.js'
import { supabase } from '../lib/supabase.js'
import SmartImage from '../components/ui/SmartImage.jsx'
import Parallax from '../components/ui/Parallax.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import VideoModal from '../components/ui/VideoModal.jsx'
import PlanAccordion from '../components/ui/PlanAccordion.jsx'
import Lightbox from '../components/ui/Lightbox.jsx'
import PropertyMap from '../components/ui/PropertyMap.jsx'
import BookingCalendar from '../components/ui/BookingCalendar.jsx'
import StatCube from '../components/ui/StatCube.jsx'
import useIsMobile from '../hooks/useIsMobile.js'
import Icon from '../components/ui/Icon.jsx'
import './ProjectDetail.css'

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
const wrap = (v) => (v == null || v === '' ? undefined : typeof v === 'object' ? v : { he: String(v), en: String(v) })
const has = (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)

/* מחלץ קואורדינטות מקישור Google Maps (תבניות @lat,lng / !3d!4d / q=lat,lng / זוג כללי) */
function extractLatLng(url) {
  if (!url || typeof url !== 'string') return null
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|ll|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  }
  return null
}

// מאחד נתון מקומי מועשר (planGroups/environment/...) עם שכבת-על מה-CMS (שדות בסיסיים)
function buildProject(local, cms) {
  if (!local && !cms) return null
  const base = local ? { ...local } : {}
  if (cms) {
    // סביבה — מאחד את שלושת השדות, עוטף כותרת/טקסט; שומר על ערך מקומי כשה-CMS ריק
    const env = cms.environment && typeof cms.environment === 'object' ? cms.environment : {}
    const environment = (has(env.title) || has(env.text) || has(env.image))
      ? { ...(base.environment || {}), title: wrap(env.title) ?? base.environment?.title, text: wrap(env.text) ?? base.environment?.text, image: env.image || base.environment?.image }
      : undefined
    // קבוצות תוכניות — עוטף את כותרת הקבוצה וכותרת כל תשריט
    const planGroups = Array.isArray(cms.plan_groups) && cms.plan_groups.length
      ? cms.plan_groups.map((g) => ({ rooms: g.rooms, label: wrap(g.label), plans: (Array.isArray(g.plans) ? g.plans : []).map((p) => ({ label: wrap(p.label), img: p.img })) }))
      : undefined
    // קטגוריות גלריה — עוטף את כותרת הקטגוריה
    const galleryGroups = Array.isArray(cms.gallery_groups) && cms.gallery_groups.length
      ? cms.gallery_groups.map((g) => ({ label: wrap(g.label), images: Array.isArray(g.images) ? g.images : [] })).filter((g) => g.images.length)
      : undefined
    // מאפיינים — נשמרים ב-amenities, כל מאפיין נעטף לדו-לשוני
    const features = Array.isArray(cms.amenities) && cms.amenities.length
      ? cms.amenities.map((x) => wrap(x)).filter(Boolean)
      : undefined
    const coords = cms.coords && cms.coords.lat != null && cms.coords.lng != null ? cms.coords : undefined
    const video = cms.video && cms.video.id ? cms.video : undefined
    // סרטונים מרובים — מנרמל כל פריט ומסנן ריקים
    const videos = Array.isArray(cms.videos) && cms.videos.length
      ? cms.videos
          .map((x) => ({ type: x.type || 'youtube', id: x.id, src: x.src, title: x.title }))
          .filter((x) => x.id || x.src)
      : undefined

    const over = {
      name: wrap(cms.name),
      city: wrap(cms.location ?? cms.city),
      description: wrap(cms.description),
      short: wrap(cms.subtitle),
      status: cms.status,
      cover: cms.hero_image_url || (cms.gallery && cms.gallery[0]),
      gallery: cms.gallery && cms.gallery.length ? cms.gallery : undefined,
      towers: has(cms.towers) ? cms.towers : undefined,
      units: has(cms.units) ? cms.units : undefined,
      floors: has(cms.floors) ? cms.floors : undefined,
      architects: wrap(cms.architects),
      year: has(cms.year) ? cms.year : undefined,
      // הכתובת מה-CMS מזינה את המפה בעמוד הפרויקט
      mapQuery: cms.address || cms.map_query || undefined,
      coords,
      video,
      videos,
      environment,
      planGroups,
      galleryGroups,
      features,
      // אילו מקטעים להציג + יזמי הפרויקט (נשמרים בענן)
      sections: Array.isArray(cms.sections) ? cms.sections : undefined,
      developers: Array.isArray(cms.developers) && cms.developers.length ? cms.developers : undefined,
      stats_scale: cms.stats_scale || undefined,
      // קוביות נתונים מותאמות מה-CMS (גרירה/עריכה) — עוקפות את ברירת המחדל
      statCubes: Array.isArray(cms.stat_cubes) && cms.stat_cubes.length
        ? cms.stat_cubes.map((c) => ({ value: c.value, label: wrap(c.label), size: c.size || 'md' })).filter((c) => has(c.value) || has(c.label))
        : undefined,
      mapLink: cms.map_link || undefined,
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
  const isMobile = useIsMobile()
  const [cms, setCms] = useState(null)

  const [videoOpen, setVideoOpen] = useState(false)
  const [bannerSlide, setBannerSlide] = useState(0)   // תמונת הבאנר הנוכחית (חצים מתחת לתמונה)
  const [galleryTab, setGalleryTab] = useState(0)
  const [gallerySlide, setGallerySlide] = useState(0)
  const galTouchX = useRef(null)   // נקודת התחלה להחלקה (swipe) בגלריה
  const galSwiped = useRef(false)  // האם בוצעה החלקה — כדי לא לפתוח לייטבוקס בטעות
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
      { rootMargin: '-48% 0px -48% 0px', threshold: 0 }   // כמעט-קו במרכז → מקטע פעיל יחיד ויציב, בלי ריצוד
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [slug])

  // בר העוגנים — ממרכז את שם המקטע הפעיל בתוך הסרגל (בלי לגלול את העמוד)
  useEffect(() => {
    if (!activeSection) return
    const bar = document.querySelector('.pd-anchors__inner')
    const item = bar?.querySelector('.pd-anchors__item.is-active')
    if (!bar || !item) return
    const b = bar.getBoundingClientRect()
    const i = item.getBoundingClientRect()
    const delta = (i.left + i.width / 2) - (b.left + b.width / 2)
    if (Math.abs(delta) > 2) bar.scrollBy({ left: delta, behavior: 'smooth' })
  }, [activeSection])

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

  // פירורי לחם: בית / חטיבה (לפי קטגוריית הפרויקט) / שם הפרויקט
  const projDivision = divisions.find((d) => d.category && d.category === project.category)
  // אייקון הבאנר — נלקח מהתפריט (אייקון החטיבה הרלוונטית), עם נפילה לאייקון בניין
  const bannerIcon = projDivision?.icon || 'building'
  const crumbItems = projDivision
    ? [{ label: L(projDivision.menuTitle), to: `/divisions/${projDivision.slug}` }, { label: L(project.name) }]
    : [{ label: t('projects.title'), to: '/projects' }, { label: L(project.name) }]

  const hasVideo =
    (project.video?.id && project.video.type === 'youtube') ||
    (project.video?.src && project.video.type === 'file')
  const flatGallery = project.gallery?.length ? project.gallery : [project.cover]
  const galleryGroups = project.galleryGroups?.length
    ? project.galleryGroups
    : [{ label: { he: 'הפרויקט', en: 'Project' }, images: flatGallery }]
  const currentImages = galleryGroups[galleryTab]?.images || flatGallery
  // סרטונים + מדיה מאוחדת ללייטבוקס (תמונות ואז סרטונים → swipe עובר על הכל)
  const videos = (project.videos || []).filter((v) => v?.id || v?.src)
  const mediaItems = [...currentImages, ...videos]
  // מפה: Maps Embed API (מפה מלוטשת עם סמן) כשמוגדר מפתח; אחרת fallback בסיסי
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
  // קואורדינטות: שדה coords, אחרת חילוץ מקישור Google Maps שהוזן ב-CMS
  const mapCoords = (project.coords && project.coords.lat != null) ? project.coords : extractLatLng(project.mapLink)
  const mapQuery = project.mapQuery || (mapCoords ? `${mapCoords.lat},${mapCoords.lng}` : (L(project.city) || L(project.name)))
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

  // בקרת מקטעים (נשמרת בענן). ללא בחירה → כל המקטעים מוצגים (תאימות לאחור).
  const enabled = Array.isArray(project.sections) && project.sections.length ? project.sections : null
  const show = (id) => !enabled || enabled.includes(id)

  // יזמי הפרויקט + פרויקטים נוספים
  const developers = project.developers || []
  const moreProjects = projects.filter((p) => p.slug !== project.slug).slice(0, 3)

  // עוגנים דינמיים — רק מקטעים מוצגים עם תוכן
  const anchors = [
    show('project') && { id: 'project', label: { he: 'הפרויקט', en: 'Project' } },
    show('environment') && project.environment && { id: 'environment', label: { he: 'הסביבה', en: 'Environment' } },
    show('map') && { id: 'map', label: { he: 'מפה', en: 'Map' } },
    show('plans') && planGroups.length && { id: 'plans', label: { he: 'תוכניות', en: 'Plans' } },
    show('gallery') && { id: 'gallery', label: { he: 'גלריה', en: 'Gallery' } },
    show('developers') && developers.length && { id: 'developers', label: { he: 'יזמים', en: 'Developers' } },
    show('contact') && { id: 'contact', label: { he: 'לתיאום פגישה', en: 'Schedule' } },
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
    setSent(true)
    // שמירת הפנייה כליד במערכת הניהול (לא חוסם את חוויית המשתמש)
    createLead({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
      project: project?.name || '',
      source: 'project',
      status: 'new',
    }).catch(() => {})
  }

  return (
    <article className="project-detail">
      {/* ===== סרגל פירורי לחם (רקע תכלת בהיר) ===== */}
      <div className="pd-crumbbar">
        <div className="container">
          <Breadcrumbs items={crumbItems} />
        </div>
      </div>

      {/* ===== Banner ===== */}
      <header className="pd-banner">
        <div className="container">
          <div className="pd-banner__grid">
            {/* תוכן — מיושר לימין, אייקון למעלה, כפתור למטה (בסגנון תדהר) */}
            <div className="pd-banner__content">
              <span className="pd-banner__icon" aria-hidden="true">
                <Icon name={bannerIcon} size={42} stroke={1.6} />
              </span>
              {L(project.city) && <span className="pd-banner__location">{L(project.city)}</span>}
              <span className="pd-banner__rule" aria-hidden="true" />
              <h1 className="pd-banner__name">{L(project.name)}</h1>
              {L(project.short) && <p className="pd-banner__subtitle">{L(project.short)}</p>}

              <div className="pd-banner__stats-wrap">
                <div className={`pd-banner__stats pd-banner__stats--${project.stats_scale || 'normal'}`}>
                  {project.statCubes?.length ? (
                    /* קוביות מותאמות מה-CMS (גרירה/עריכה/גודל פר-קוביה) */
                    project.statCubes.map((cube, i) => (
                      <StatCube key={i} className={`pd-stat--sz-${cube.size || 'md'}${cube.size === 'wide' ? ' pd-stat--wide' : ''}`}>
                        <span
                          className={`pd-stat__value${cube.size === 'wide' ? ' pd-stat__value--sm' : ''}`}
                          dir={cube.size === 'wide' ? 'auto' : 'ltr'}
                        >
                          {cube.value}
                        </span>
                        <span className="pd-stat__label">{L(cube.label)}</span>
                      </StatCube>
                    ))
                  ) : (
                    <>
                      {project.towers > 0 && (
                        <StatCube>
                          <span className="pd-stat__value" dir="ltr">{project.towers}</span>
                          <span className="pd-stat__label">{L({ he: 'בניינים', en: 'Buildings' })}</span>
                        </StatCube>
                      )}
                      {project.units > 0 && (
                        <StatCube>
                          <span className="pd-stat__value" dir="ltr">{project.units}</span>
                          <span className="pd-stat__label">{L({ he: 'יחידות דיור', en: 'Units' })}</span>
                        </StatCube>
                      )}
                      {project.floors && (
                        <StatCube>
                          <span className="pd-stat__value" dir="ltr">{project.floors}</span>
                          <span className="pd-stat__label">{L({ he: 'קומות', en: 'Floors' })}</span>
                        </StatCube>
                      )}
                      {project.architects && (
                        <StatCube className="pd-stat--wide">
                          <span className="pd-stat__value pd-stat__value--sm">{L(project.architects)}</span>
                          <span className="pd-stat__label">{L({ he: 'אדריכלים', en: 'Architects' })}</span>
                        </StatCube>
                      )}
                      <StatCube className={`pd-stat--wide pd-stat--status pd-stat--status-${project.status}`}>
                        <span className="pd-stat__value pd-stat__value--sm">{t(`projects.status.${project.status}`)}</span>
                        <span className="pd-stat__label">{L({ he: 'סטטוס', en: 'Status' })}</span>
                      </StatCube>
                    </>
                  )}
                </div>
                <DottedGrid className="pd-dots--banner" />
              </div>

              <button type="button" className="btn btn--primary pd-banner__cta" onClick={() => goTo('contact')}>
                {L({ he: 'לתיאום פגישה', en: 'Schedule a meeting' })}
              </button>
            </div>

            {/* מדיה — תמונה למעלה, חצי ניווט מתחתיה בצד שמאל (בסגנון תדהר) */}
            <div className="pd-banner__media-col">
              <div className="pd-banner__media">
                <Parallax className="pd-banner__media-img">
                  <SmartImage
                    key={bannerSlide}
                    src={flatGallery[Math.min(bannerSlide, flatGallery.length - 1)]}
                    alt={L(project.name)}
                    label={L(project.name)}
                  />
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
              {flatGallery.length > 1 && (
                <div className="pd-banner__arrows">
                  <button
                    type="button"
                    className="pd-banner__arrow"
                    onClick={() => setBannerSlide((s) => (s - 1 + flatGallery.length) % flatGallery.length)}
                    aria-label={L({ he: 'תמונה קודמת', en: 'Previous image' })}
                  >
                    <Icon name="arrow" size={22} />
                  </button>
                  <button
                    type="button"
                    className="pd-banner__arrow"
                    onClick={() => setBannerSlide((s) => (s + 1) % flatGallery.length)}
                    aria-label={L({ he: 'תמונה הבאה', en: 'Next image' })}
                  >
                    <Icon name="arrowLeft" size={22} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== Sticky anchors ===== */}
      <nav className="pd-anchors" aria-label="Project sections">
        <div className="container pd-anchors__inner">
          {/* כל המקטעים הקיימים — נגללים אופקית; הפעיל מודגש (bold) */}
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
      {show('project') && (
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

      )}

      {/* ===== הסביבה ===== */}
      {show('environment') && project.environment && (
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
      {show('map') && (
      <section id="map" className="section section--soft pd-anchor">
        <div className="container">
          <div className="pd-card">
            <Reveal className="pd-head">
              <span className="eyebrow">{L({ he: 'מיקום', en: 'Location' })}</span>
              <h2 className="section-title">{L({ he: 'המיקום על המפה', en: 'On the map' })}</h2>
            </Reveal>
            <Reveal className="pd-map" delay={0.05}>
              {mapsKey && mapCoords ? (
                <PropertyMap
                  lat={mapCoords.lat}
                  lng={mapCoords.lng}
                  label={L(project.name)}
                  zoom={16}
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
        </div>
      </section>

      )}

      {/* ===== תוכניות — אקורדיון ===== */}
      {show('plans') && planGroups.length > 0 && (
        <section id="plans" className="section section--soft pd-anchor">
          <div className="container">
            <div className="pd-card">
              <Reveal className="pd-head">
                <span className="eyebrow">{L({ he: 'תכנון', en: 'Planning' })}</span>
                <h2 className="section-title">{L({ he: 'תוכניות הדירות', en: 'Apartment plans' })}</h2>
              </Reveal>
              <Reveal delay={0.05}>
                <PlanAccordion groups={planGroups} onEnlarge={(img) => openLightbox([img], 0)} />
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ===== גלריה ===== */}
      {show('gallery') && (
      <section id="gallery" className="section pd-anchor">
        <div className="container">
          <Reveal className="pd-head">
            <h2 className="section-title">{L({ he: 'מבט מקרוב', en: 'A closer look' })}</h2>
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
                  onClick={() => { setGalleryTab(i); setGallerySlide(0) }}
                >
                  {L(g.label)}
                </button>
              ))}
            </div>
          )}

          {(() => {
            const n = currentImages.length
            const slide = Math.min(gallerySlide, Math.max(0, n - 1))
            const go = (d) => setGallerySlide((s) => (Math.min(s, n - 1) + d + n) % n)
            const isRtl = document.documentElement.dir === 'rtl'
            const onTouchStart = (e) => { galTouchX.current = e.touches[0]?.clientX ?? null; galSwiped.current = false }
            const onTouchEnd = (e) => {
              if (galTouchX.current == null || n < 2) return
              const dx = (e.changedTouches[0]?.clientX ?? galTouchX.current) - galTouchX.current
              galTouchX.current = null
              if (Math.abs(dx) < 45) return
              galSwiped.current = true
              // החלקה שמאלה = הבא, ימינה = הקודם (מותאם RTL)
              go(dx < 0 ? (isRtl ? -1 : 1) : (isRtl ? 1 : -1))
            }
            return (
              <div className="pd-carousel">
                <div className="pd-carousel__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                  <button
                    type="button"
                    className="pd-carousel__main"
                    onClick={() => { if (galSwiped.current) { galSwiped.current = false; return } openLightbox(mediaItems, slide) }}
                    aria-label={`${L(project.name)} — ${L({ he: 'הגדלה', en: 'Enlarge' })}`}
                  >
                    <SmartImage key={`${galleryTab}-${slide}`} src={currentImages[slide]} alt={`${L(project.name)} ${slide + 1}`} label={L(project.name)} />
                    <span className="pd-gallery__zoom"><Icon name="search" size={20} /></span>
                  </button>
                </div>
                {n > 1 && (
                  <div className="pd-carousel__controls">
                    <div className="pd-carousel__dots" role="tablist" aria-label={L({ he: 'תמונות', en: 'Images' })}>
                      {currentImages.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`pd-carousel__dot ${i === slide ? 'is-active' : ''}`}
                          aria-label={`${L({ he: 'תמונה', en: 'Image' })} ${i + 1}`}
                          aria-current={i === slide}
                          onClick={() => setGallerySlide(i)}
                        />
                      ))}
                    </div>
                    <div className="pd-carousel__nav">
                      <button type="button" className="pd-carousel__arrow pd-carousel__arrow--prev" onClick={() => go(-1)} aria-label={L({ he: 'הקודם', en: 'Previous' })}>
                        <Icon name="chevron" size={22} />
                      </button>
                      <button type="button" className="pd-carousel__arrow pd-carousel__arrow--next" onClick={() => go(1)} aria-label={L({ he: 'הבא', en: 'Next' })}>
                        <Icon name="chevron" size={22} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {videos.length > 0 && (
            <div className="pd-videos">
              {videos.map((vid, vi) => {
                const thumb = vid.type === 'youtube' && vid.id ? `https://img.youtube.com/vi/${vid.id}/hqdefault.jpg` : null
                return (
                  <button
                    key={vi}
                    type="button"
                    className="pd-video-tile"
                    onClick={() => openLightbox(mediaItems, currentImages.length + vi)}
                    aria-label={vid.title || L({ he: 'נגן סרטון', en: 'Play video' })}
                  >
                    {thumb
                      ? <img src={thumb} alt={vid.title || ''} loading="lazy" />
                      : <span className="pd-video-tile__file" aria-hidden="true" />}
                    <span className="pd-video-tile__play"><Icon name="play" size={24} /></span>
                    {vid.title && <span className="pd-video-tile__title">{vid.title}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ===== יזמי הפרויקט ===== */}
      {show('developers') && developers.length > 0 && (
        <section id="developers" className="section section--soft pd-anchor pd-developers">
          <div className="container">
            <Reveal className="pd-head">
              <span className="eyebrow">{L({ he: 'שותפים', en: 'Partners' })}</span>
              <h2 className="section-title">{L({ he: 'יזמי הפרויקט', en: 'Project developers' })}</h2>
              <p className="pd-developers__lead">{L({ he: 'הגופים שמקימים יחד את הפרויקט', en: 'The partners building this project together' })}</p>
            </Reveal>
            <div className="pd-dev-grid">
              {developers.map((d, i) => (
                <Reveal key={i} className="pd-dev" delay={i * 0.08}>
                  <div className="pd-dev__logo">
                    {d.logo
                      ? <img src={d.logo} alt={L(d.name) || ''} loading="lazy" />
                      : <span className="pd-dev__name">{L(d.name)}</span>}
                  </div>
                  <p className="pd-dev__bio">{L(d.bio)}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== פרויקטים נוספים ===== */}
      {show('more') && moreProjects.length > 0 && (
        <section id="more" className="section pd-anchor pd-more">
          <div className="container">
            <Reveal className="pd-head">
              <h2 className="section-title">{L({ he: 'פרויקטים נוספים', en: 'More projects' })}</h2>
            </Reveal>
            <div className="pd-more__grid">
              {moreProjects.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <Link to={`/projects/${p.slug}`} className="pd-more__card">
                    <span className="pd-more__img">
                      <SmartImage src={p.cover} alt={L(p.name)} label={L(p.name)} />
                    </span>
                    <span className="pd-more__title">{L(p.name)}</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== לתיאום פגישה — פאנל דו-טורי עם טופס ===== */}
      {show('contact') && (
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
                  <button type="submit" className="pd-contact__submit">
                    {L({ he: 'שליחה', en: 'Send' })}
                  </button>
                </form>
              )}
            </div>
            {/* היומן מוצג רק בדסקטופ — במובייל הטופס לבדו, נקי וממוקד */}
            {!isMobile && (
              <div className="pd-contact__media">
                <BookingCalendar
                  title={L({ he: 'קבעו פגישה', en: 'Book a meeting' })}
                  onPickDate={(label) =>
                    setForm((f) => ({
                      ...f,
                      message: f.message || L({ he: `אשמח לתאם פגישה ל-${label}`, en: `I'd like to book a meeting on ${label}` }),
                    }))
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>
      )}

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
