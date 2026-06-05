import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import Icon from './Icon.jsx'
import './FloatingActions.css'

export default function FloatingActions() {
  const { t } = useI18n()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="floating-actions">
      <a
        href={`https://wa.me/${site.contact.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fab fab--wa"
        aria-label="WhatsApp"
      >
        <Icon name="whatsapp" size={26} />
      </a>
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            className="fab fab--top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={t('common.backToTop')}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
          >
            <Icon name="arrowUp" size={22} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
