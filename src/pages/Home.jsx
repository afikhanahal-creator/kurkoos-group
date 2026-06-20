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

export default function Home() {
  const { t } = useI18n()
  return (
    <>
      <Seo description={t('hero.subtitle')} />
      <div className="home">
        <Hero />
        <Activities />
        <Story />
        <ProjectsGallery />
        <ValueChain />
        <Stats />
        <Testimonials />
        <Partners />
        <Contact />
      </div>
    </>
  )
}
