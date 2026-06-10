import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from './i18n/index.jsx'
import Header from './components/layout/Header.jsx'
import Footer from './components/layout/Footer.jsx'
import CookieBanner from './components/ui/CookieBanner.jsx'
import FloatingActions from './components/ui/FloatingActions.jsx'
import AccessibilityButton from './components/ui/AccessibilityButton.jsx'
import IntroVideo from './components/sections/IntroVideo.jsx'
import FontLoader from './components/ui/FontLoader.jsx'
import Home from './pages/Home.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import Division from './pages/Division.jsx'
import Team from './pages/Team.jsx'
import About from './pages/About.jsx'
import Blog from './pages/Blog.jsx'
import Careers from './pages/Careers.jsx'
import Legal from './pages/Legal.jsx'
import NotFound from './pages/NotFound.jsx'
// קוד-ספליטינג: עורך האדמין (כולל עורך התמונות הכבד) ומדריך הסגנון
// נטענים רק לפי דרישה — כך החבילה של האתר הציבורי קלה ומהירה יותר במובייל.
const StyleGuide = lazy(() => import('./pages/StyleGuide.jsx'))
const Admin = lazy(() => import('./pages/admin/Admin.jsx'))

// גלילה לראש העמוד במעבר בין דפים; גלילה לעוגן (#) אם קיים.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // מעבר העמוד (AnimatePresence mode="wait") לוקח ~400ms עד שהדף החדש
      // נטען ל-DOM, ולכן עוגן בעמוד אחר לא קיים עדיין בזמן ניסיון גלילה קבוע.
      // נמתין (polling) עד שהאלמנט מופיע בפועל, ואז נגלול אליו עם פיצוי על
      // גובה ה-header הקבוע.
      let raf
      const start = performance.now()
      const tryScroll = () => {
        const el = document.querySelector(hash)
        if (el) {
          const headerH = document.querySelector('.header')?.offsetHeight ?? 0
          const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12
          window.scrollTo({ top, behavior: 'smooth' })
        } else if (performance.now() - start < 1500) {
          raf = requestAnimationFrame(tryScroll)
        }
      }
      raf = requestAnimationFrame(tryScroll)
      return () => cancelAnimationFrame(raf)
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname, hash])
  return null
}

// עוטף כל עמוד באנימציית כניסה/יציאה אחידה.
// חשוב: מעבר ב-opacity בלבד (בלי y/transform) — כך framer-motion לא משאיר
// transform על עוטף-העמוד. transform על אב של אלמנט sticky גורם לבר העוגנים
// "לרעוד" (jitter) בגלילת אינרציה במובייל. fade נקי = בר דביק יציב לחלוטין.
const pageMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
}

export default function App() {
  const location = useLocation()
  const { t } = useI18n()

  // אזור האדמין — עמוד מלא נפרד, ללא ה-Header/Footer של האתר הציבורי
  if (location.pathname.startsWith('/admin')) {
    return (
      <>
        <FontLoader />
        <ScrollManager />
        <Suspense fallback={null}>
          <Admin />
        </Suspense>
      </>
    )
  }

  return (
    <>
      <FontLoader />
      <a href="#top" className="skip-link">{t('common.skipToContent')}</a>
      <IntroVideo />
      <ScrollManager />
      <Header />
      <main id="top" tabIndex={-1}>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...pageMotion}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              <Route path="/divisions/:slug" element={<Division />} />
              <Route path="/team" element={<Team />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/accessibility" element={<Legal kind="accessibility" />} />
              <Route path="/privacy" element={<Legal kind="privacy" />} />
              <Route path="/terms" element={<Legal kind="terms" />} />
              <Route path="/style-guide" element={<Suspense fallback={null}><StyleGuide /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <FloatingActions />
      <AccessibilityButton />
      <CookieBanner />
    </>
  )
}
