import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import projects from '../../data/projects.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import Reveal from '../ui/Reveal.jsx'
import SmartImage from '../ui/SmartImage.jsx'
import Icon from '../ui/Icon.jsx'
import BorderGlow from '../ui/BorderGlow.jsx'
import SpotlightCard from '../ui/SpotlightCard.jsx'
import KineticText from '../ui/KineticText.jsx'
import './ProjectsGallery.css'

const FEATURED = 4    // מציגים בדיוק 4 פרויקטים כברירת מחדל

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } },
}

/* Lightbox */
function Lightbox({ item, onClose, L, t }) {
  return (
    <motion.div className="pg-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="pg-lightbox__panel"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={item.cover} alt={L(item.name)} className="pg-lightbox__img" />
        <div className="pg-lightbox__bar">
          <div>
            <strong>{L(item.name)}</strong>
            <span>{L(item.city)} · {L(item.type)} · {item.year}</span>
          </div>
          <Link to={`/projects/${item.slug}`} className="btn btn--primary">
            {t('projects.viewProject')}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </motion.div>
      <button className="pg-lightbox__close" onClick={onClose} aria-label={t('common.close')}>
        <Icon name="close" size={26} />
      </button>
    </motion.div>
  )
}

/* כרטיס פרויקט בודד.
   במובייל מוותרים על BorderGlow/SpotlightCard (אפקטים של מצביע/ריחוף
   בלבד) — הם גורמים ל-layout-thrash בכל touchmove ומקפיאים את הגלילה.
   כך הגלילה האופקית במובייל היא native חלקה לגמרי. */
function ProjectCard({ p, L, t, onSelect, isMobile }) {
  const media = (
    <div className="pg-card__media">
      {isMobile ? (
        <div className="pg-card__spot">
          <SmartImage src={p.cover} alt={L(p.name)} label={L(p.name)} className="pg-card__img" />
          <span className={`pg-card__badge pg-card__badge--${p.status}`}>{t(`projects.status.${p.status}`)}</span>
        </div>
      ) : (
        <SpotlightCard className="pg-card__spot" spotlightColor="rgba(255, 255, 255, 0.35)">
          <SmartImage src={p.cover} alt={L(p.name)} label={L(p.name)} className="pg-card__img" />
          <span className={`pg-card__badge pg-card__badge--${p.status}`}>{t(`projects.status.${p.status}`)}</span>
        </SpotlightCard>
      )}
      <div className="pg-card__panel">
        <h3 className="pg-card__title">{L(p.name)}</h3>
        <div className="pg-card__reveal">
          <p className="pg-card__desc">{L(p.short)}</p>
          <span className="pg-card__meta">
            <Icon name="location" size={14} /> {L(p.city)} · {p.year}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <motion.article
      className="pg-card"
      variants={itemVariants}
      onClick={() => onSelect(p)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(p)}
      aria-label={L(p.name)}
    >
      {isMobile ? media : (
        <BorderGlow
          className="pg-card__glow"
          backgroundColor="transparent"
          borderRadius={16}
          glowColor="197 78 48"
          glowRadius={30}
          glowIntensity={1.15}
          edgeSensitivity={28}
          coneSpread={24}
          colors={['#16688c', '#105572', '#8fb6c8']}
        >
          {media}
        </BorderGlow>
      )}
    </motion.article>
  )
}

/* ============================================================
   ProjectsGallery — קרוסלת פרויקטים.
   במובייל: לולאה אינסופית רציפה (marquee) — הפריטים משוכפלים והגלילה
   חוזרת על עצמה בצורה חלקה בלי קפיצה להתחלה.
   props: items, sectionId, showFooter.
   ============================================================ */
export default function ProjectsGallery({ items: itemsProp, sectionId = 'projects', showFooter = true }) {
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const isMobile = useIsMobile()
  const [selected, setSelected] = useState(null)
  const viewportRef = useRef(null)
  const pausedRef = useRef(false)
  const resumeRef = useRef(null)

  const items = itemsProp && itemsProp.length ? itemsProp : projects.slice(0, FEATURED)
  // במובייל משכפלים את הפריטים → לולאה אינסופית חלקה (בלי חזרה להתחלה)
  const renderItems = isMobile ? [...items, ...items] : items

  /* קרוסלה חכמה (מובייל): קופצת כרטיס ימינה כל 2 שניות, נגלשת native
     (חלק), נעצרת בנגיעה, ומתאפסת בצורה בלתי-נראית בגבול הסט → ריצה
     אינסופית רציפה בלי "קפיצה" להתחלה. */
  useEffect(() => {
    if (!isMobile) return
    const el = viewportRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const track = el.querySelector('.projects-gallery__track')
    const card = el.querySelector('.pg-card')
    if (!track || !card) return

    const cs = getComputedStyle(track)
    const gap = parseFloat(cs.columnGap || cs.gap) || 20
    const step = card.getBoundingClientRect().width + gap
    const setWidth = items.length * step               // רוחב סט יחיד (לפני השכפול)
    const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1

    // איפוס בלתי-נראה בגבול: קופצים סט שלם אחורה/קדימה (תוכן זהה → חלק)
    const onScroll = () => {
      const x = el.scrollLeft
      if (x >= setWidth) el.scrollLeft = x - setWidth
      else if (x <= -setWidth) el.scrollLeft = x + setWidth
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    // עצירה בעת אינטראקציה, חידוש אחרי 2.5 שניות
    const pause = () => {
      pausedRef.current = true
      clearTimeout(resumeRef.current)
      resumeRef.current = setTimeout(() => { pausedRef.current = false }, 2500)
    }
    el.addEventListener('pointerdown', pause)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('wheel', pause, { passive: true })

    const timer = setInterval(() => {
      if (pausedRef.current) return
      el.scrollBy({ left: sign * step, behavior: 'smooth' })   // קפיצה חלקה של כרטיס
    }, 2000)

    return () => {
      clearInterval(timer)
      clearTimeout(resumeRef.current)
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('wheel', pause)
    }
  }, [isMobile, items.length])

  return (
    <section className="section section--soft projects-gallery" id={sectionId || undefined}>
      <div className="container">
        <Reveal className="projects-gallery__head">
          <KineticText as="h2" className="section-title" text={t('projects.title')} />
          <p className="section-lead">{t('projects.lead')}</p>
        </Reveal>
      </div>

      <div className="projects-gallery__viewport" ref={viewportRef}>
        <motion.div
          className="projects-gallery__track"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 'some' }}
        >
          {renderItems.map((p, i) => (
            <ProjectCard key={`${p.slug}-${i}`} p={p} L={L} t={t} onSelect={setSelected} isMobile={isMobile} />
          ))}
        </motion.div>
      </div>

      {showFooter && (
        <div className="container">
          <Reveal className="projects-gallery__footer">
            <Link to="/projects" className="btn btn--dark btn--lg">
              {t('projects.all')}
              <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={20} />
            </Link>
          </Reveal>
        </div>
      )}

      <AnimatePresence>
        {selected && <Lightbox item={selected} onClose={() => setSelected(null)} L={L} t={t} />}
      </AnimatePresence>
    </section>
  )
}
