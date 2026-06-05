import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { heroSlides, companyFilm } from '../../data/hero.js'
import VideoModal from '../ui/VideoModal.jsx'
import GeometricBlurMesh from '../ui/GeometricBlurMesh.jsx'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import Icon from '../ui/Icon.jsx'
import './Hero.css'

const COUNT = heroSlides.length

/* מספר שמתגלגל מ-0 לערך בכל פעם שהשקופית מתחלפת */
function RollingNumber({ value, trigger }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(value); return }
    let raf
    const start = performance.now()
    const dur = 1400
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, trigger])
  return <>{n.toLocaleString('en-US')}</>
}

export default function Hero() {
  const { t } = useI18n()
  const L = useLocalized()
  const [turn, setTurn] = useState(0)
  const [filmOpen, setFilmOpen] = useState(false)

  const active = ((turn % COUNT) + COUNT) % COUNT
  const slide = heroSlides[active]

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(() => setTurn((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  // וריאנטים לחשיפת הכותרת שורה-אחר-שורה
  const lineWrap = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
  const lineInner = {
    hidden: { y: '110%' },
    show: { y: '0%', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true">
        <InfiniteGrid color="rgba(16,85,114,1)" baseOpacity={0.06} revealOpacity={0.16} />
        <div className="hero__bg-overlay" />
        <motion.span className="hero__shape hero__shape--2"
          animate={{ y: [0, 20, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      <div className="container hero__grid">
        {/* צד תוכן */}
        <div className="hero__content">
          {/* מספר מתגלגל + תווית */}
          <div className="hero__stat">
            <div className="hero__stat-number">
              <RollingNumber value={slide.stat.value} trigger={turn} />
              <span className="hero__stat-suffix">{slide.stat.suffix}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="hero__stat-labels"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <span className="hero__stat-label">{L(slide.stat.label)}</span>
                <span className="hero__stat-sub">{L(slide.stat.sub)}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* כותרת שנחשפת שורה-שורה */}
          <h1 className="hero__title">
            <AnimatePresence mode="wait">
              <motion.span
                key={active}
                variants={lineWrap}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                className="hero__title-inner"
              >
                {L(slide.lines).map((line, i) => (
                  <span className="hero__line-mask" key={i}>
                    <motion.span className="hero__line" variants={lineInner}>{line}</motion.span>
                  </span>
                ))}
              </motion.span>
            </AnimatePresence>
          </h1>

          <p className="hero__subtitle">{t('hero.subtitle')}</p>

          <div className="hero__actions">
            <Link to="/projects" className="btn btn--primary btn--lg">
              {t('hero.ctaPrimary')}
              <Icon name="arrow" size={20} className="hero__cta-arrow" />
            </Link>
            <button type="button" className="btn btn--ghost btn--lg hero__ghost" onClick={() => setFilmOpen(true)}>
              {t('hero.ctaSecondary')}
              <Icon name="arrow" size={20} className="hero__cta-arrow" />
            </button>
          </div>
        </div>

        {/* אפקט WebGL — קובייה תיל מסתובבת עם הלוגו בתוכה */}
        <div className="hero__media">
          <motion.div
            className="hero__effect"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <GeometricBlurMesh />
            <div className="hero__effect-logo">
              <img src="/kurkoos-logo.svg" alt="Kurkoos Group" />
            </div>
          </motion.div>
        </div>
      </div>

      <VideoModal open={filmOpen} onClose={() => setFilmOpen(false)} video={companyFilm} title={t('hero.ctaSecondary')} />
    </section>
  )
}
