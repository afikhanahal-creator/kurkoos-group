import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.jsx'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import KineticText from '../ui/KineticText.jsx'
import './Story.css'

export default function Story() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <section className="section story">
      <div className="container story__inner">
        <Reveal variant="up">
          <span className="eyebrow story__eyebrow">{t('story.eyebrow')}</span>
          <KineticText as="h2" className="story__title" text={t('story.title')} />
        </Reveal>

        <Reveal variant="up" delay={0.1}>
          <p className="story__short">{t('story.short')}</p>
        </Reveal>

        <AnimatePresence initial={false}>
          {open && (
            <motion.p
              className="story__full"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('story.full')}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="button"
          className={`story__toggle ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="story__toggle-line" />
          <span className="story__toggle-text">{open ? t('story.less') : t('story.more')}</span>
          <span className="story__toggle-line" />
          <Icon name="chevron" size={20} className="story__toggle-chevron" />
        </button>
      </div>
    </section>
  )
}
