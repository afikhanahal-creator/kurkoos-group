import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './AccessibilityButton.css'

const KEY = 'kurkoos-a11y'

const defaults = { font: 0, contrast: false, links: false }

function apply(s) {
  const html = document.documentElement
  html.classList.toggle('a11y-font-1', s.font === 1)
  html.classList.toggle('a11y-font-2', s.font === 2)
  html.classList.toggle('a11y-contrast', s.contrast)
  html.classList.toggle('a11y-links', s.links)
}

export default function AccessibilityButton() {
  const { lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [s, setS] = useState(defaults)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY))
      if (saved) { setS(saved); apply(saved) }
    } catch { /* ignore */ }
  }, [])

  const update = (next) => {
    setS(next)
    apply(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }

  const txt = lang === 'he'
    ? { title: 'נגישות', font: 'גודל טקסט', contrast: 'ניגודיות גבוהה', links: 'הדגשת קישורים', reset: 'איפוס', open: 'תפריט נגישות' }
    : { title: 'Accessibility', font: 'Text size', contrast: 'High contrast', links: 'Highlight links', reset: 'Reset', open: 'Accessibility menu' }

  return (
    <div className="a11y">
      <button type="button" className="a11y__btn" onClick={() => setOpen((v) => !v)} aria-label={txt.open} aria-expanded={open}>
        <Icon name="accessibility" size={26} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="a11y__panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="a11y__title">{txt.title}</h3>

            <div className="a11y__row">
              <span><Icon name="textSize" size={18} /> {txt.font}</span>
              <div className="a11y__stepper">
                <button type="button" onClick={() => update({ ...s, font: Math.max(0, s.font - 1) })} aria-label="-"><Icon name="minus" size={16} /></button>
                <span>{s.font}</span>
                <button type="button" onClick={() => update({ ...s, font: Math.min(2, s.font + 1) })} aria-label="+"><Icon name="plus" size={16} /></button>
              </div>
            </div>

            <button type="button" className={`a11y__toggle ${s.contrast ? 'is-on' : ''}`} onClick={() => update({ ...s, contrast: !s.contrast })}>
              <span><Icon name="contrast" size={18} /> {txt.contrast}</span>
              <span className="a11y__switch" />
            </button>

            <button type="button" className={`a11y__toggle ${s.links ? 'is-on' : ''}`} onClick={() => update({ ...s, links: !s.links })}>
              <span><Icon name="external" size={18} /> {txt.links}</span>
              <span className="a11y__switch" />
            </button>

            <button type="button" className="a11y__reset" onClick={() => update(defaults)}>{txt.reset}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
