import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Stats from '../components/sections/Stats.jsx'
import ValueChain from '../components/sections/ValueChain.jsx'
import Partners from '../components/sections/Partners.jsx'
import Contact from '../components/sections/Contact.jsx'
import { ABOUT_VISION } from '../data/aboutVision.js'
import './About.css'

export default function About() {
  const { t, lang } = useI18n()

  const vision = lang === 'he' ? ABOUT_VISION.he : ABOUT_VISION.en

  return (
    <>
      <PageHeader
        eyebrow={t('pages.about.eyebrow')}
        title={t('pages.about.title')}
        lead={t('pages.about.lead')}
        crumbs={[{ label: t('nav.about') }]}
        seoTitle="אודות הקבוצה"
        seoDescription='קורקוס גרופ היא קבוצת נדל"ן הפועלת ביזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים: מקרקע ועד מסירת מפתח, עם פעילות באזור השרון והמרכז.'
      />

      <section className="section about-vision">
        <div className="container">
          <Reveal className="about-vision__inner">
            <span className="eyebrow">{vision.eyebrow}</span>
            <h2 className="section-title about-vision__heading">{vision.heading}</h2>
            {vision.paragraphs.map((p, i) => (
              <p className="about-vision__p" key={i}>{p}</p>
            ))}
            <span className="about-vision__divider" aria-hidden="true" />
            <div className="about-vision__closing">
              <p className="about-vision__tagline">{vision.tagline}</p>
              <img
                src="/aminot-badge.webp"
                alt={lang === 'he' ? 'חותם אמינות Dun & Bradstreet' : 'Dun & Bradstreet reliability seal'}
                className="about-vision__badge"
                width="160"
                height="160"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <Stats />
      <ValueChain />
      <Partners />
      <Contact />
    </>
  )
}
