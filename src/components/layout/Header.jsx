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
import { CONTACT_POPUP_EVENT } from '../../lib/contact.js'
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
  const [hidden, setHidden] = useState(false)   // הבר העליון מוסתר בגלילה למטה (בעמוד פרויקט)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactTopic, setContactTopic] = useState(null)   // נושא שמסומן מראש בחלון צור קשר
  const [openSub, setOpenSub] = useState(null) // mobile submenu toggle
  const location = useLocation()

  /* הבר התחתון במובייל היה כאן (חיפוש · תפריט · צור קשר) ורק בעמודי הפרויקטים.
     הוא אוחד לבר הפנייה שבכל העמודים (MobileContactBar): חיוג, וואטסאפ,
     השארת פרטים. החיפוש עבר לראש תפריט המובייל. */

  // פתיחת חלון צור קשר מכל מקום באתר (הבר התחתון, ה-Hero), עם נושא מסומן מראש
  useEffect(() => {
    const onOpen = (e) => {
      setContactTopic(e?.detail?.topic || null)
      setMenuOpen(false)
      setContactOpen(true)
    }
    window.addEventListener(CONTACT_POPUP_EVENT, onOpen)
    return () => window.removeEventListener(CONTACT_POPUP_EVENT, onOpen)
  }, [])

  // גלילה: מסמן "נגלל" (>24px), ובעמוד פרויקט בודד מסתיר את הבר העליון בגלילה
  // למטה ומחזיר אותו בגלילה למעלה — כך נשאר רק סרגל העוגנים הדק בראש המסך.
  const isProjectDetail = location.pathname.startsWith('/projects/')
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const update = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      if (isProjectDetail) {
        // מסתירים את ההדר *רק* אחרי שסרגל העוגנים כבר נעוץ בראש המסך — אחרת
        // נוצר "אזור מת" בראש העמוד (ההדר נעלם אך הסרגל עדיין לא הגיע לראש, כי
        // הבאנר גבוה), והסרגל נראה נעלם. כך הסרגל תמיד קבוע בראש בגלילה למטה.
        const bar = document.querySelector('.pd-anchors')
        const barPinned = !!bar && bar.getBoundingClientRect().top <= 80
        // תנועה זעירה (פחות מ-10px) לא משנה מצב — כך שינויי כיוון/ריבאונד לא מקפיצים.
        if (!barPinned || y < 140) { setHidden(false); lastY = y }   // עוד לא נעוץ/קרוב לראש — מציגים
        else if (y > lastY + 10) { setHidden(true); lastY = y }      // נעוץ + גלילה למטה — מסתירים
        else if (y < lastY - 10) { setHidden(false); lastY = y }     // גלילה למעלה — מציגים
      } else {
        setHidden(false)
        lastY = y
      }
      ticking = false
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isProjectDetail])

  // דגל גלובלי כדי שסרגל העוגנים (ProjectDetail) יידע לעלות ל-top:0 כשהבר העליון מוסתר
  useEffect(() => {
    document.documentElement.classList.toggle('header-top-hidden', hidden)
    return () => document.documentElement.classList.remove('header-top-hidden')
  }, [hidden])

  // כשהתפריט נפתח — תמיד מציגים את הבר העליון (החלק העליון של ה-overlay)
  useEffect(() => { if (menuOpen) setHidden(false) }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
    setOpenSub(null)
  }, [location.pathname, location.hash])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    // דגל גלובלי: בר הפנייה התחתון מתחבא כשתפריט המובייל פתוח
    document.documentElement.classList.toggle('menu-open', menuOpen)
    return () => {
      document.body.style.overflow = ''
      document.documentElement.classList.remove('menu-open')
    }
  }, [menuOpen])

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''} ${hidden ? 'header--hidden' : ''}`}>
      {/* ניווט ראשי */}
      <div className="header__main">
        <div className="container header__main-inner">
          <button
            type="button"
            className={`header__burger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? t('common.close') : t('common.menu')}
            aria-expanded={menuOpen}
          >
            <span className="header__burger-bar header__burger-bar--1" />
            <span className="header__burger-bar header__burger-bar--2" />
            <span className="header__burger-bar header__burger-bar--3" />
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
            <button type="button" className="btn btn--primary header__cta-btn" onClick={() => { setContactTopic(null); setContactOpen(true) }}>
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
              {/* החלפת שפה — קטן, בראש התפריט (לא נחתך בתחתית) */}
              <motion.div className="header__mobile-top" variants={mItem}>
                <LanguageSwitcher className="header__mobile-lang" />
                <button
                  type="button"
                  className="header__mobile-search"
                  onClick={() => { setMenuOpen(false); setSearchOpen(true) }}
                  aria-label={t('search.label')}
                >
                  <Icon name="search" size={20} />
                  <span>{t('search.label')}</span>
                </button>
              </motion.div>

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
                      {item.children ? (
                        <button
                          type="button"
                          className="header__mobile-link header__mobile-link--toggle"
                          onClick={() => setOpenSub(openSub === i ? null : i)}
                          aria-expanded={openSub === i}
                        >
                          {navLabel(item, t, L)}
                        </button>
                      ) : (
                        <Link to={item.to} className="header__mobile-link">{navLabel(item, t, L)}</Link>
                      )}
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
                          {/* קישור לעמוד האב עצמו */}
                          <Link to={item.to} className="header__mobile-sublink header__mobile-sublink--parent">
                            <Icon name="arrow" size={14} className="header__mobile-sublink-ic" />
                            {L({ he: 'לעמוד ', en: 'Visit ' })}{navLabel(item, t, L)}
                          </Link>
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
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ContactPopup open={contactOpen} onClose={() => setContactOpen(false)} initialTopic={contactTopic} />
    </header>
  )
}
