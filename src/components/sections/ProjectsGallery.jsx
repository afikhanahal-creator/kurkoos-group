import { useRef, useState, useEffect } from 'react'
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
const GAP = 20        // מרווח בין כרטיסים (1.25rem)
const SPEED = 0.05    // מהירות הלולאה הרציפה (px/ms) — מובייל בלבד

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

/* כרטיס פרויקט בודד */
function ProjectCard({ p, L, t, onSelect }) {
  return (
    <motion.article
      className="pg-card"
      variants={itemVariants}
      onClick={() => onSelect(p)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(p)}
      aria-label={L(p.name)}
    >
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
        <div className="pg-card__media">
          <SpotlightCard className="pg-card__spot" spotlightColor="rgba(255, 255, 255, 0.35)">
            <SmartImage src={p.cover} alt={L(p.name)} label={L(p.name)} className="pg-card__img" />
            <span className={`pg-card__badge pg-card__badge--${p.status}`}>{t(`projects.status.${p.status}`)}</span>
          </SpotlightCard>
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
      </BorderGlow>
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
  const posRef = useRef(0)

  const dir = isRTL ? -1 : 1
  const items = itemsProp && itemsProp.length ? itemsProp : projects.slice(0, FEATURED)
  // במובייל משכפלים את הפריטים כדי ליצור לולאה אינסופית חלקה
  const renderItems = isMobile ? [...items, ...items] : items

  // לולאה רציפה (marquee) — מובייל בלבד, כשהתוכן רחב מהמסך
  useEffect(() => {
    if (!isMobile) return
    let raf
    let last = 0
    const el = viewportRef.current
    if (el) posRef.current = el.scrollLeft
    const tick = (ts) => {
      const dt = last ? ts - last : 0
      last = ts
      const node = viewportRef.current
      if (node && !pausedRef.current) {
        const half = node.scrollWidth / 2 // רוחב סט יחיד (לפני השכפול)
        if (half > node.clientWidth - 4) {
          posRef.current += dir * SPEED * dt
          if (dir > 0 && posRef.current >= half) posRef.current -= half
          if (dir < 0 && posRef.current <= -half) posRef.current += half
          node.scrollLeft = posRef.current
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isMobile, dir, renderItems.length])

  const pause = () => { pausedRef.current = true }
  const resume = () => {
    pausedRef.current = false
    const el = viewportRef.current
    if (el) posRef.current = el.scrollLeft
  }

  return (
    <section className="section section--soft projects-gallery" id={sectionId || undefined}>
      <div className="container">
        <Reveal className="projects-gallery__head">
          <KineticText as="h2" className="section-title" text={t('projects.title')} />
          <p className="section-lead">{t('projects.lead')}</p>
        </Reveal>
      </div>

      <div
        className="projects-gallery__viewport"
        ref={viewportRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
      >
        <motion.div
          className="projects-gallery__track"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 'some' }}
        >
          {renderItems.map((p, i) => (
            <ProjectCard key={`${p.slug}-${i}`} p={p} L={L} t={t} onSelect={setSelected} />
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
