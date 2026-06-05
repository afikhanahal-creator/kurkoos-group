import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import testimonials from '../../data/testimonials.js'
import Icon from '../ui/Icon.jsx'
import './Testimonials.css'

export default function Testimonials() {
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)

  const go = useCallback((n) => {
    setDir(n > i ? 1 : -1)
    setI((n + testimonials.length) % testimonials.length)
  }, [i])

  const next = useCallback(() => { setDir(1); setI((p) => (p + 1) % testimonials.length) }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [next])

  const item = testimonials[i]
  const variants = {
    enter: (d) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: -d * 40 }),
  }

  return (
    <section className="section section--soft testimonials">
      <div className="container">
        <div className="testimonials__head">
          <span className="eyebrow">{t('testimonials.eyebrow')}</span>
          <h2 className="section-title">{t('testimonials.title')}</h2>
          <p className="section-lead">{t('testimonials.lead')}</p>
        </div>

        <div className="testimonials__stage">
          <span className="testimonials__quote-mark"><Icon name="quote" size={56} /></span>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.blockquote
              key={item.id}
              className="testimonials__card"
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="testimonials__text">{L(item.quote)}</p>
              <footer className="testimonials__author">
                <strong>{L(item.name)}</strong>
                <span>{L(item.project)}</span>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        <div className="testimonials__nav">
          <button type="button" className="carousel__arrow" onClick={() => go(i - 1)} aria-label="Previous">
            <Icon name={isRTL ? 'arrow' : 'arrowLeft'} size={20} />
          </button>
          <div className="testimonials__dots">
            {testimonials.map((tt, n) => (
              <button
                key={tt.id}
                type="button"
                className={`testimonials__dot ${n === i ? 'testimonials__dot--active' : ''}`}
                onClick={() => go(n)}
                aria-label={`Testimonial ${n + 1}`}
              />
            ))}
          </div>
          <button type="button" className="carousel__arrow" onClick={() => go(i + 1)} aria-label="Next">
            <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={20} />
          </button>
        </div>
      </div>
    </section>
  )
}
