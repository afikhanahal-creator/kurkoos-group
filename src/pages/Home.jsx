import { useI18n } from '../i18n/index.jsx'
import Seo from '../components/ui/Seo.jsx'
import Hero from '../components/sections/Hero.jsx'
import Activities from '../components/sections/Activities.jsx'
import Story from '../components/sections/Story.jsx'
import Stats from '../components/sections/Stats.jsx'
import ProjectsGallery from '../components/sections/ProjectsGallery.jsx'
import ValueChain from '../components/sections/ValueChain.jsx'
import Testimonials from '../components/sections/Testimonials.jsx'
import Partners from '../components/sections/Partners.jsx'
import Contact from '../components/sections/Contact.jsx'
import HomeFaq from '../components/sections/HomeFaq.jsx'
import { HOME_FAQS } from '../data/homeFaq.js'

/* FAQPage מהשאלות שמוצגות בעמוד (HomeFaq), אותו מקור שה-prerender משתמש בו */
const HOME_FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

export default function Home() {
  const { t } = useI18n()
  return (
    <>
      <Seo title='בניית וילות ובתים פרטיים, יזמות ופיקוח בנייה בהוד השרון' description='קבוצת קורקוס (קורקוס גרופ) מהוד השרון בונה וילות ובתים פרטיים, גם ללקוחות פרטיים על המגרש שלהם, ומפקחת על בנייה מטעם המזמין. יזמות, ביצוע, פיקוח ותיווך נדל"ן בהוד השרון ובאזור המרכז, מהקרקע ועד המפתח.' jsonLd={HOME_FAQ_LD} />
      <div className="home">
        <Hero />
        <Activities />
        <Story />
        <ProjectsGallery />
        <ValueChain />
        <Stats />
        <Testimonials />
        <Partners />
        <HomeFaq />
        <Contact />
      </div>
    </>
  )
}
