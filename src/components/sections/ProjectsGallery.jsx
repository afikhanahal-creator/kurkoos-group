import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import projects from '../../data/projects.js'
import Reveal from '../ui/Reveal.jsx'
import SmartImage from '../ui/SmartImage.jsx'
import Icon from '../ui/Icon.jsx'
import BorderGlow from '../ui/BorderGlow.jsx'
import SpotlightCard from '../ui/SpotlightCard.jsx'
import KineticText from '../ui/KineticText.jsx'
import './ProjectsGallery.css'

const AUTOPLAY = 3000 // משך הצגה לכל כרטיס (מ"ש)
const COPIES = 3      // משכפלים את הרשימה ליצירת לולאה אינסופית חלקה
const GAP = 20        // מרווח בין כרטיסים (1.25rem)

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } },
}

/* Lightbox */
function Lightbox({ item, onClose, L, t }) {
  return (
    <motion.div
      className="pg-lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
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

export default function ProjectsGallery() {
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const [selected, setSelected] = useState(null)
  const viewportRef = useRef(null)
  const pausedRef = useRef(false)
  const elapsedRef = useRef(0)
  const lastTsRef = useRef(0)
  const metricsRef = useRef({ step: 0, setWidth: 0 })

  // כיוון ההתקדמות: ב-RTL מתקדמים שמאלה => scrollLeft קטֵן (שלילי)
  const dir = isRTL ? -1 : 1

  // רשימה משוכפלת ×3 — מאפשרת לולאה בלי קצוות
  const loop = []
  for (let c = 0; c < COPIES; c++) {
    for (const p of projects) loop.push({ p, key: `${p.slug}-${c}` })
  }

  const measure = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const card = el.querySelector('.pg-card')
    const step = card ? card.offsetWidth + GAP : 300
    metricsRef.current = { step, setWidth: step * projects.length }
  }, [])

  // "גלישה" בלתי-נראית: שומר את המיקום בתוך עותק האמצע. כיוון שהתוכן
  // חוזר על עצמו כל setWidth — קפיצה בגודל setWidth אינה נראית לעין.
  const normalize = useCallback(() => {
    const el = viewportRef.current
    const { setWidth } = metricsRef.current
    if (!el || !setWidth) return
    const abs = Math.abs(el.scrollLeft)
    if (abs >= 2 * setWidth) el.scrollLeft -= dir * setWidth
    else if (abs < setWidth) el.scrollLeft += dir * setWidth
  }, [dir])

  // מיקום התחלתי בעותק האמצעי (יש "מרווח ריצה" לשני הכיוונים)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    measure()
    el.scrollLeft = dir * metricsRef.current.setWidth
    const onResize = () => { measure(); normalize() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure, normalize, dir])

  // לאחר שהגלילה נעצרת (אוטומטית או ידנית) — מנרמלים את המיקום ללולאה
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    let tid
    const onScroll = () => {
      clearTimeout(tid)
      tid = setTimeout(normalize, 140)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(tid) }
  }, [normalize])

  // ניגון אוטומטי — מתקדם כרטיס אחד שמאלה, נעצר במגע/ריחוף
  useEffect(() => {
    let raf
    lastTsRef.current = 0
    const tick = (ts) => {
      const last = lastTsRef.current || ts
      const dt = ts - last
      lastTsRef.current = ts
      if (!pausedRef.current) {
        elapsedRef.current += dt
        if (elapsedRef.current >= AUTOPLAY) {
          elapsedRef.current = 0
          const el = viewportRef.current
          const { step } = metricsRef.current
          if (el && step) el.scrollBy({ left: dir * step, behavior: 'smooth' })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dir])

  const pause = () => { pausedRef.current = true }
  const resume = () => { pausedRef.current = false; lastTsRef.current = 0 }

  return (
    <section className="section section--soft projects-gallery" id="projects">
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
          {loop.map(({ p, key }) => (
            <motion.article
              key={key}
              className="pg-card"
              variants={itemVariants}
              onClick={() => setSelected(p)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(p)}
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
                  {/* ספוטלייט — רק מעל התמונה (הבאנר הלבן נשאר מעליו) */}
                  <SpotlightCard className="pg-card__spot" spotlightColor="rgba(255, 255, 255, 0.35)">
                    <SmartImage
                      src={p.cover}
                      alt={L(p.name)}
                      label={L(p.name)}
                      className="pg-card__img"
                    />
                    <span className={`pg-card__badge pg-card__badge--${p.status}`}>
                      {t(`projects.status.${p.status}`)}
                    </span>
                  </SpotlightCard>
                  {/* התריס — עולה בריחוף ויורד חלק */}
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
          ))}
        </motion.div>
      </div>

      <div className="container">
        <Reveal className="projects-gallery__footer">
          <Link to="/projects" className="btn btn--dark btn--lg">
            {t('projects.all')}
            <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={20} />
          </Link>
        </Reveal>
      </div>

      <AnimatePresence>
        {selected && <Lightbox item={selected} onClose={() => setSelected(null)} L={L} t={t} />}
      </AnimatePresence>
    </section>
  )
}
