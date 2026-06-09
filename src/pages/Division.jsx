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
import Icon from '../components/ui/Icon.jsx'
import BgMediaDemo from '../components/sections/BgMediaDemo.jsx'
import './Division.css'

export default function Division() {
  const { slug } = useParams()
  const { t } = useI18n()
  const L = useLocalized()
  const division = getDivision(slug)
  const isMobile = useIsMobile()

  // הפרויקטים שיוצגו: ברירת מחדל = מקומיים; אם הוגדרו ב-CMS לעמוד הזה — מהם.
  const [list, setList] = useState(() => projects.slice(0, 4))

  // מיפוי slug של דיוויזיה → עמוד תיוג ב-CMS (התיווך מוצג בעמוד /divisions/residential)
  const SLUG_TO_PAGE = { development: 'development', execution: 'execution', residential: 'brokerage' }

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
        <InfiniteGrid color="rgba(255,255,255,0.5)" baseOpacity={0.08} revealOpacity={0.28} />
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

      {/* פרויקטים — קרוסלה זהה לדף הבית (לולאה אינסופית רציפה במובייל) */}
      <ProjectsGallery items={list} showFooter={false} />

      <Testimonials />

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
