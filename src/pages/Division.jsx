import { useParams, Navigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useI18n, useLocalized } from '../i18n/index.jsx'
import { getDivision } from '../data/divisions.js'
import projects from '../data/projects.js'
import { supabase } from '../lib/supabase.js'
import { listProjectsByPage, cmsRowToCard } from '../lib/cms.js'
import ProjectsGallery from '../components/sections/ProjectsGallery.jsx'
import ProjectCard from '../components/ui/ProjectCard.jsx'
import CardStack from '../components/ui/CardStack.jsx'
import CardDeck from '../components/ui/CardDeck.jsx'
import useIsMobile from '../hooks/useIsMobile.js'
import Testimonials from '../components/sections/Testimonials.jsx'
import Contact from '../components/sections/Contact.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Parallax from '../components/ui/Parallax.jsx'
import InfiniteGrid from '../components/ui/InfiniteGrid.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Seo from '../components/ui/Seo.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import CircularGallery from '../components/ui/CircularGallery.jsx'
import executionGallery from '../data/executionGallery.js'
import Icon from '../components/ui/Icon.jsx'
import BgMediaDemo from '../components/sections/BgMediaDemo.jsx'
import './Division.css'

// כתובת האתר של אפיק הנחל
const AFIK_SITE_URL = 'https://www.afikhanahal.co.il/'

export default function Division() {
  const { slug } = useParams()
  const { t } = useI18n()
  const L = useLocalized()
  const division = getDivision(slug)
  const isMobile = useIsMobile()

  // הפרויקטים שיוצגו: ברירת מחדל = מקומיים; אם הוגדרו ב-CMS לעמוד הזה — מהם.
  const [list, setList] = useState(() => projects.slice(0, 4))

  // מיפוי slug של דיוויזיה → עמוד תיוג ב-CMS
  const SLUG_TO_PAGE = { development: 'development', execution: 'execution', brokerage: 'brokerage' }

  useEffect(() => {
    const pageKey = SLUG_TO_PAGE[slug] || null
    if (!supabase || !pageKey) { setList(projects.slice(0, 4)); return }
    let alive = true
    listProjectsByPage(pageKey)
      .then((rows) => { if (alive && rows && rows.length) setList(rows.map(cmsRowToCard)) })
      .catch(() => {})
    return () => { alive = false }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!division) return <Navigate to="/" replace />

  return (
    <article className={`division division--${slug}`}>
      <Seo title={L(division.menuTitle)} description={L(division.intro)} image={division.hero?.image} />
      {/* באנר */}
      <header className="division-hero">
        <Parallax className="division-hero__bg">
          <SmartImage src={division.hero.image} alt={L(division.hero.title)} label={L(division.name)} />
        </Parallax>
        <div className="division-hero__overlay" />
        <InfiniteGrid
          color="rgba(255,255,255,0.5)"
          baseOpacity={slug === 'brokerage' ? 0.16 : 0.08}
          revealOpacity={slug === 'brokerage' ? 0.4 : 0.28}
        />
        <div className="container division-hero__content">
          <Breadcrumbs
            items={[
              { label: L({ he: 'תחומי פעילות', en: 'What we do' }), to: '/#activities' },
              { label: L(division.menuTitle) },
            ]}
          />
          {slug === 'execution' ? (
            <motion.img className="division-hero__logo"
              src="/divisions/raita-logo.png"
              alt={'ראיתה חברה לבניין בע"מ'}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} />
          ) : slug === 'brokerage' ? (
            <motion.img className="division-hero__ah-logo"
              src="/afik-hanahal-logo.png"
              alt={'אפיק הנחל נדל"ן'}
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} />
          ) : slug === 'development' ? (
            <motion.img className="division-hero__nadlan-logo"
              src="/kurkoos-logo-nadlan.png"
              alt={'קורקוס גרופ'}
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} />
          ) : (
            <motion.span className="division-hero__icon"
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
              <Icon name={division.icon} size={40} stroke={1.5} />
            </motion.span>
          )}
          <motion.h1 className="division-hero__title"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            {L(division.hero.title)}
          </motion.h1>
          <motion.p className="division-hero__subtitle"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
            {L(division.hero.subtitle)}
          </motion.p>
        </div>
      </header>

      {/* סרטון התקדמות הבנייה — רק בעמוד הביצוע (מעל הפסקה) */}
      {slug === 'execution' && (
        <section className="section section--soft division-showcase">
          <div className="container">
            <Reveal variant="scale">
              <BgMediaDemo />
            </Reveal>
          </div>
        </section>
      )}

      {/* אינטרו (מתחת לסרטון) */}
      <section className="section division-intro">
        <div className="container">
          <Reveal className="division-intro__text">
            <p>{L(division.intro)}</p>
          </Reveal>
        </div>
      </section>

      {/* למה אנחנו */}
      <section className="section section--soft division-why" id="why">
        <div className="container">
          <Reveal className="division-why__head">
            <span className="eyebrow">{t('activities.eyebrow')}</span>
            <h2 className="section-title">{L(division.name)}</h2>
          </Reveal>
          {isMobile ? (
            <CardDeck
              className="division-why__deck"
              items={division.why.map((w, i) => ({ id: String(i), ...w }))}
              renderCard={(w) => <FeatureCard icon={w.icon} title={L(w.title)} desc={L(w.desc)} />}
            />
          ) : (
            <div className="division-why__grid">
              {division.why.map((w, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <FeatureCard icon={w.icon} title={L(w.title)} desc={L(w.desc)} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* תצוגת אתר אפיק הנחל — חלון מרכזי גדול עם הילה סגולה, רק בעמוד התיווך */}
      {slug === 'brokerage' && (
        <section className="section ah-site">
          <div className="container">
            <Reveal className="ah-site__head">
              <span className="eyebrow">{L({ he: 'האתר שלנו', en: 'Our website' })}</span>
            </Reveal>
            <Reveal className="ah-site__wrap" variant="scale">
              <a
                href={AFIK_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ah-site__frame"
                aria-label="כניסה לאתר אפיק הנחל"
              >
                <span className="ah-site__sheen" aria-hidden="true" />
                <span className="ah-site__bar" aria-hidden="true">
                  <span className="ah-site__dot" />
                  <span className="ah-site__dot" />
                  <span className="ah-site__dot" />
                  <span className="ah-site__addr">www.afikhanahal.co.il</span>
                </span>
                <span className="ah-site__screen">
                  {/* צילום מסך אמיתי של האתר; אם חסר (404) — נופל ללוגו על רקע המותג */}
                  <img
                    className="ah-site__shot"
                    src="/afik-website.png"
                    alt={'אתר אפיק הנחל'}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <img className="ah-site__logo" src="/afik-hanahal-logo.png" alt={'אפיק הנחל נדל"ן'} loading="lazy" />
                  <span className="ah-site__enter">כניסה לאתר ↗</span>
                </span>
              </a>
              <a href={AFIK_SITE_URL} target="_blank" rel="noopener noreferrer" className="ah-site__btn">
                {L({ he: 'כניסה לאתר', en: 'Visit the site' })}
                <Icon name="arrow" size={18} />
              </a>
            </Reveal>
          </div>
        </section>
      )}

      {/* גלריית ביצוע — מורפינג עיגול→ריבוע (GSAP), רק בעמוד הביצוע */}
      {slug === 'execution' && executionGallery.length > 0 && (
        <section className="section section--soft">
          <div className="container">
            <Reveal className="division-why__head">
              <span className="eyebrow">{L({ he: 'תיעוד מהשטח', en: 'Field documentation' })}</span>
              <h2 className="section-title">{L({ he: 'הופכים תוכניות לביצוע', en: 'Turning plans into reality' })}</h2>
            </Reveal>
            <CircularGallery images={executionGallery} />
          </div>
        </section>
      )}

      {/* פרויקטים — קרוסלה זהה לדף הבית (לולאה אינסופית רציפה במובייל) */}
      <ProjectsGallery
        items={list}
        showFooter={false}
        title={slug === 'brokerage' ? L({ he: 'פרויקטים בשיווק', en: 'Projects in marketing' }) : undefined}
        lead={slug === 'brokerage'
          ? L({ he: 'מבחר פרויקטים בשיווק, בתהליך מסירה וליווי ברחבי הארץ', en: 'A selection of projects in marketing, handover and guidance across the country.' })
          : undefined}
      />

      {/* בעמוד התיווך (אפיק הנחל) — בלי סקשן ההמלצות */}
      {slug !== 'brokerage' && <Testimonials />}

      {/* מדריך */}
      <section className="section division-guide">
        <div className="container">
          <Reveal className="division-guide__band" variant="scale">
            <div>
              <span className="eyebrow">{t('common.readMore')}</span>
              <h2 className="division-guide__title">{L(division.guide.title)}</h2>
              <p className="division-guide__desc">{L(division.guide.desc)}</p>
            </div>
            <Link to="/blog" className="btn btn--primary btn--lg">
              {t('common.readMore')}
              <Icon name="arrow" size={20} className="division-guide__arrow" />
            </Link>
          </Reveal>
        </div>
      </section>

      <Contact />
    </article>
  )
}
