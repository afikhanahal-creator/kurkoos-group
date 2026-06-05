import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import valueChain from '../../data/valueChain.js'
import Reveal from '../ui/Reveal.jsx'
import Icon from '../ui/Icon.jsx'
import VillaBlueprint from '../ui/VillaBlueprint.jsx'
import './ValueChain.css'

export default function ValueChain() {
  const { t } = useI18n()
  const L = useLocalized()
  const [open, setOpen] = useState(0)

  return (
    <section className="section value-chain" id="value-chain">
      <div className="container value-chain__inner">
        <Reveal className="value-chain__intro" variant="right">
          <span className="eyebrow">{t('valueChain.eyebrow')}</span>
          <h2 className="section-title">{t('valueChain.title')}</h2>
          <p className="section-lead">{t('valueChain.lead')}</p>
          <div className="value-chain__progress" aria-hidden="true">
            <span style={{ '--p': `${((open + 1) / valueChain.length) * 100}%` }} />
          </div>
          <VillaBlueprint className="value-chain__art" />
        </Reveal>

        <Reveal className="value-chain__list" variant="left" delay={0.1}>
          {valueChain.map((step, i) => {
            const isOpen = open === i
            return (
              <div className={`vc-item ${isOpen ? 'vc-item--open' : ''}`} key={step.id}>
                <button
                  type="button"
                  className="vc-item__head"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span className="vc-item__num">{String(step.id).padStart(2, '0')}</span>
                  <span className="vc-item__titles">
                    <span className="vc-item__tag">{L(step.tag)}</span>
                    <span className="vc-item__title">{L(step.title)}</span>
                  </span>
                  <span className="vc-item__chevron">
                    <Icon name="chevron" size={22} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="vc-item__panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p>{L(step.desc)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
