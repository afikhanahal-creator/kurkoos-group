import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import projects from '../../data/projects.js'
import Icon from '../ui/Icon.jsx'
import './SearchOverlay.css'

export default function SearchOverlay({ open, onClose }) {
  const { t } = useI18n()
  const L = useLocalized()
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const term = q.trim().toLowerCase()
  const results = term
    ? projects.filter((p) =>
        [L(p.name), L(p.city), L(p.type)].join(' ').toLowerCase().includes(term)
      )
    : []

  const go = (slug) => {
    onClose()
    navigate(`/projects/${slug}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="search-overlay__panel"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-overlay__bar">
              <Icon name="search" size={22} className="search-overlay__icon" />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('search.placeholder')}
                aria-label={t('search.label')}
              />
              <button type="button" onClick={onClose} aria-label={t('common.close')}>
                <Icon name="close" size={24} />
              </button>
            </div>

            {term && (
              <ul className="search-overlay__results">
                {results.length === 0 ? (
                  <li className="search-overlay__empty">{t('search.noResults')}</li>
                ) : (
                  results.map((p) => (
                    <li key={p.slug}>
                      <button type="button" onClick={() => go(p.slug)}>
                        <span className="search-overlay__name">{L(p.name)}</span>
                        <span className="search-overlay__meta">{L(p.city)} · {L(p.type)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
