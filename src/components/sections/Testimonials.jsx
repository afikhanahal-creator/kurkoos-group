import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { useSettings } from '../../lib/cms.js'
import { optimizeSrc, srcOfResponsive } from '../../lib/responsiveImage.js'
import defaultTestimonials from '../../data/testimonials.js'
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
  const settings = useSettings()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [shot, setShot] = useState(null) // אינדקס התמונה הפתוחה ב-lightbox (או null)

  // המלצות מנוהלות מה-CMS (key: testimonials) גוברות על ברירת המחדל
  const testimonials = useMemo(() => {
    let list = settings.testimonials
    if (typeof list === 'string') { try { list = JSON.parse(list) } catch { list = null } }
    return Array.isArray(list) && list.length ? list : defaultTestimonials
  }, [settings.testimonials])

  const count = testimonials.length

  const next = useCallback(() => setI((p) => (p + 1) % count), [count])
  const prev = useCallback(() => setI((p) => (p - 1 + count) % count), [count])

  // אם מספר ההמלצות הצטמצם (עריכה ב-CMS) — מוודאים שהאינדקס בתחום
  useEffect(() => { setI((p) => (p >= count ? 0 : p)) }, [count])

  // החלפה אוטומטית — נעצרת בריחוף, כשה-lightbox פתוח, ומכבדת prefers-reduced-motion
  useEffect(() => {
    if (paused || shot !== null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(next, AUTO_MS)
    return () => clearInterval(id)
  }, [next, paused, i, shot])

  const item = testimonials[i] || testimonials[0]

  // תמונות הבית המצורפות להמלצה הנוכחית (מנורמלות לכתובות URL)
  const shots = useMemo(() => {
    const arr = Array.isArray(item?.photos) ? item.photos : []
    return arr.map((p) => srcOfResponsive(p) || (typeof p === 'string' ? p : '')).filter(Boolean)
  }, [item])

  const shotNext = useCallback(() => setShot((p) => (p === null ? p : (p + 1) % shots.length)), [shots.length])
  const shotPrev = useCallback(() => setShot((p) => (p === null ? p : (p - 1 + shots.length) % shots.length)), [shots.length])

  // סוגרים את ה-lightbox כשמחליפים המלצה
  useEffect(() => { setShot(null) }, [i])

  // מקלדת: Esc לסגירה, חצים למעבר בין תמונות
  useEffect(() => {
    if (shot === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setShot(null)
      else if (e.key === 'ArrowRight') setShot((p) => (p + 1) % shots.length)
      else if (e.key === 'ArrowLeft') setShot((p) => (p - 1 + shots.length) % shots.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shot, shots.length])

  if (!item) return null

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

          {/* כותרת תחתונה: תמונות הבית (בצד שמאל) + חיצי ניווט (במרכז) */}
          <div className="testimonials__footer">
            {shots.length > 0 && (
              <div className="tc-shots" aria-label={t('testimonials.photosLabel')}>
                <span className="tc-shots__label">{t('testimonials.photosCta')}</span>
                <div className="tc-shots__row">
                  {shots.slice(0, 4).map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      className="tc-shots__tile"
                      style={{ zIndex: 10 - idx }}
                      onClick={() => setShot(idx)}
                      aria-label={`${t('testimonials.photosLabel')} ${idx + 1}`}
                    >
                      <img src={optimizeSrc(url, 160)} alt="" loading="lazy" decoding="async" />
                      {idx === 3 && shots.length > 4 && (
                        <span className="tc-shots__more">+{shots.length - 4}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
      </div>

      {/* Lightbox לתמונות הבית — מסך מלא, X גלוי, מעבר בין תמונות */}
      <AnimatePresence>
        {shot !== null && shots[shot] && (
          <motion.div
            className="tc-lb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShot(null)}
          >
            <button className="tc-lb__close" onClick={() => setShot(null)} aria-label={t('common.close')}>
              <Icon name="close" size={26} />
            </button>

            {shots.length > 1 && (
              <button
                className="tc-lb__nav tc-lb__nav--prev"
                onClick={(e) => { e.stopPropagation(); shotPrev() }}
                aria-label="Previous"
              >
                <Icon name={isRTL ? 'arrow' : 'arrowLeft'} size={26} />
              </button>
            )}

            <motion.img
              key={shot}
              className="tc-lb__img"
              src={optimizeSrc(shots[shot], 1600)}
              alt={L(item.project)}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />

            {shots.length > 1 && (
              <button
                className="tc-lb__nav tc-lb__nav--next"
                onClick={(e) => { e.stopPropagation(); shotNext() }}
                aria-label="Next"
              >
                <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={26} />
              </button>
            )}

            {shots.length > 1 && (
              <div className="tc-lb__count">{shot + 1} / {shots.length}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
