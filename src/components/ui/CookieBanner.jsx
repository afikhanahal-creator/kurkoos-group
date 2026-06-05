import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.jsx'
import './CookieBanner.css'

const KEY = 'kurkoos-cookie-consent'

export default function CookieBanner() {
  const { t } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const id = setTimeout(() => setShow(true), 1200)
      return () => clearTimeout(id)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(KEY, '1')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="cookie-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-live="polite"
        >
          <p className="cookie-banner__text">
            {t('cookie.text')}{' '}
            <Link to="/privacy" className="cookie-banner__link">{t('cookie.more')}</Link>
          </p>
          <button type="button" className="btn btn--primary cookie-banner__btn" onClick={accept}>
            {t('cookie.accept')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
