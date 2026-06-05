import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import Seo from '../components/ui/Seo.jsx'

export default function NotFound() {
  const { t, lang } = useI18n()
  return (
    <section className="section" style={{ textAlign: 'center', minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <Seo title={lang === 'he' ? 'העמוד לא נמצא' : 'Page not found'} noindex />
      <div className="container">
        <motion.h1
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: 'clamp(4rem, 14vw, 9rem)', color: 'var(--color-secondary)' }}
        >
          404
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ fontSize: '1.3rem', color: 'var(--color-text-soft)', marginBottom: '2rem' }}
        >
          {lang === 'he' ? 'העמוד לא נמצא' : 'Page not found'}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/" className="btn btn--primary btn--lg">{t('nav.home')}</Link>
        </motion.div>
      </div>
    </section>
  )
}
