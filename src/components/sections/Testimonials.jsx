import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import testimonials from '../../data/testimonials.js'
import SmartImage from '../ui/SmartImage.jsx'
import Icon from '../ui/Icon.jsx'
import KineticText from '../ui/KineticText.jsx'
import './Testimonials.css'

const AUTO_MS = 3500 // החלפה אוטומטית כל ~3.5 שניות

function Stars() {
  return (
    <div className="tc__stars" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, n) => (
        <svg key={n} viewBox="0 0 24 24" width="18" height="18">
          <path d="M12 2l2.9 6.26 6.6 1.01-4.75 4.43 1.18 6.8L12 17.27 6.07 20.5l1.18-6.8L2.5 9.27l6.6-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function Testimonials() {
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = testimonials.length

  const next = useCallback(() => setI((p) => (p + 1) % count), [count])
  const prev = useCallback(() => setI((p) => (p - 1 + count) % count), [count])

  // החלפה אוטומטית — נעצרת בריחוף ומכבדת prefers-reduced-motion
  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(next, AUTO_MS)
    return () => clearInterval(id)
  }, [next, paused, i])

  const item = testimonials[i]

  return (
    <section className="section section--soft testimonials">
      <div className="container">
        <div className="testimonials__head">
          <span className="eyebrow">{t('testimonials.eyebrow')}</span>
          <KineticText as="h2" className="section-title" text={t('testimonials.title')} />
          <p className="section-lead">{t('testimonials.lead')}</p>
        </div>

        <div
          className="tc"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="tc__card-effect">
            <div className="tc__card">
              <span className="tc__liquid" aria-hidden="true" />
              <span className="tc__shine" aria-hidden="true" />
              <span className="tc__glow" aria-hidden="true" />

              <div className="tc__grid">
                {/* תמונת הלקוח */}
                <div className="tc__avatar">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={item.id}
                      className="tc__avatar-inner"
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <SmartImage src={item.image} alt={L(item.name)} label={L(item.name)} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* התוכן */}
                <div className="tc__content">
                  <span className="tc__quote-mark"><Icon name="quote" size={46} /></span>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="tc__text">{L(item.quote)}</p>
                      <Stars />
                      <div className="tc__author">
                        <strong>{L(item.name)}</strong>
                        <span>{L(item.project)}</span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* ניווט */}
          <div className="testimonials__nav">
            <button type="button" className="carousel__arrow" onClick={prev} aria-label="Previous">
              <Icon name={isRTL ? 'arrow' : 'arrowLeft'} size={20} />
            </button>
            <button type="button" className="carousel__arrow" onClick={next} aria-label="Next">
              <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
