import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.jsx'
import { introVideo } from '../../data/hero.js'
import './IntroVideo.css'

const KEY = 'kurkoos-intro-seen'

export default function IntroVideo() {
  const { t } = useI18n()
  const videoRef = useRef(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (introVideo.enabled && !sessionStorage.getItem(KEY)) {
      setShow(true)
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [])

  const close = () => {
    sessionStorage.setItem(KEY, '1')
    document.body.style.overflow = ''
    setShow(false)
  }

  // fallback: אם הסרטון לא נטען, סגור אחרי 6 שניות
  useEffect(() => {
    if (!show) return
    const id = setTimeout(close, 6000)
    return () => clearTimeout(id)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro-video"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <video
            ref={videoRef}
            className="intro-video__media"
            autoPlay
            muted
            playsInline
            onEnded={close}
            src={introVideo.src}
          />
          <button type="button" className="intro-video__skip" onClick={close}>
            {t('common.close')} ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
