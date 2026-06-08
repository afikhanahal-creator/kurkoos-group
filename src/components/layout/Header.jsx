import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import Logo from './Logo.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import SearchOverlay from './SearchOverlay.jsx'
import MenuCards from './MenuCards.jsx'
import ContactPopup from '../ui/ContactPopup.jsx'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import Icon from '../ui/Icon.jsx'
import './Header.css'

// תווית פריט ניווט: label דו-לשוני גובר על מפתח תרגום
const navLabel = (item, t, L) => (item.label ? L(item.label) : t(`nav.${item.key}`))

// כניסה מדורגת לפריטי תפריט המובייל
const mNavContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }
const mItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

export default function Header() {
  const { t } = useI18n()
  const L = useLocalized()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null) // mobile submenu toggle
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setOpenSub(null)
  }, [location.pathname, location.hash])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      {/* ניווט ראשי */}
      <div className="header__main">
        <div className="container header__main-inner">
          <button
            type="button"
            className="header__burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? t('common.close') : t('common.menu')}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={26} />
          </button>

          <Logo />

          <nav className="header__nav" aria-label="Primary">
            {site.nav.map((item) => (
              <div key={item.key || item.to} className="header__nav-item">
                <Link to={item.to} className="header__nav-link">
                  {navLabel(item, t, L)}
                  {item.children && <Icon name="chevron" size={16} className="header__nav-caret" />}
                </Link>
                {item.children && (
                  <div className="header__dropdown" role="menu">
                    <div className="header__dropdown-inner">
                      {item.children.map((c) => (
                        <Link key={c.to + L(c.label)} to={c.to} className="header__dropdown-link" role="menuitem">
                          {L(c.label)}
                          <Icon name="arrow" size={15} className="header__dropdown-arrow" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="header__actions">
            <LanguageSwitcher className="header__lang" />
            <button
              type="button"
              className="header__icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label={t('search.label')}
            >
              <Icon name="search" size={22} />
            </button>
            <button type="button" className="btn btn--primary header__cta-btn" onClick={() => setContactOpen(true)}>
              {t('nav.contact')}
            </button>
          </div>
        </div>
      </div>

      {/* תפריט מובייל */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="scrim"
            className="header__scrim"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-hidden="true"
          />
        )}
        {menuOpen && (
          <motion.div
            key="menu"
            className="header__mobile"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* רקע הרשת — האפקט שלנו, גלוי לאורך כל הגלילה ונחשף חזק יותר סביב התנועה */}
            <InfiniteGrid color="rgba(255,255,255,0.85)" baseOpacity={0.16} revealOpacity={0.45} />

            <motion.div
              className="header__mobile-inner"
              variants={mNavContainer}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={mItem}>
                <MenuCards onNavigate={() => setMenuOpen(false)} />
              </motion.div>

              <nav className="header__mobile-nav" aria-label="Mobile">
                <motion.div variants={mItem}>
                  <Link to="/" className="header__mobile-link">{t('nav.home')}</Link>
                </motion.div>
                {site.nav.map((item, i) => (
                  <motion.div key={item.key || item.to} className="header__mobile-group" variants={mItem}>
                    <div className="header__mobile-row">
                      <Link to={item.to} className="header__mobile-link">{navLabel(item, t, L)}</Link>
                      {item.children && (
                        <button
                          type="button"
                          className="header__mobile-toggle"
                          onClick={() => setOpenSub(openSub === i ? null : i)}
                          aria-label="Toggle submenu"
                          aria-expanded={openSub === i}
                        >
                          <Icon name="chevron" size={22} style={{ transform: openSub === i ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {item.children && openSub === i && (
                        <motion.div
                          className="header__mobile-sub"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {item.children.map((c) => (
                            <Link key={c.to + L(c.label)} to={c.to} className="header__mobile-sublink">
                              <Icon name="arrow" size={14} className="header__mobile-sublink-ic" />
                              {L(c.label)}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </nav>

              <motion.div className="header__mobile-footer" variants={mItem}>
                <button
                  type="button"
                  className="btn btn--primary btn--lg header__mobile-cta"
                  onClick={() => { setMenuOpen(false); setContactOpen(true) }}
                >
                  {t('nav.contact')}
                </button>
                <LanguageSwitcher className="lang-switch--block header__mobile-lang" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ContactPopup open={contactOpen} onClose={() => setContactOpen(false)} />
    </header>
  )
}
