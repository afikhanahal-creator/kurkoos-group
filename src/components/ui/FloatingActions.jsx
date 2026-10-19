import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { waHref } from '../../lib/contact.js'
import Icon from './Icon.jsx'
import { track } from '../../lib/track.js'
import './FloatingActions.css'

export default function FloatingActions() {
  const { t } = useI18n()
  const L = useLocalized()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <aside className="floating-actions" aria-label={L({ he: 'פעולות מהירות', en: 'Quick actions' })}>
      <a
        href={waHref(t('contact.waOpener'))}
        target="_blank"
        rel="noopener noreferrer"
        className="fab fab--wa"
        aria-label={L({ he: 'שיחה בוואטסאפ (נפתח בחלון חדש)', en: 'Chat on WhatsApp (opens in a new window)' })}
        onClick={() => track('whatsapp_click', { placement: 'floating' })}
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
    </aside>
  )
}
