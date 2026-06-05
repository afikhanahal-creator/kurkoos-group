import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import './InfoPage.css'

export default function Innovation() {
  const { t, lang } = useI18n()

  const items = lang === 'he'
    ? [
        { icon: 'bulb', title: 'שיטות בנייה מתקדמות', text: 'בנייה מתועשת ומודולרית לקיצור לוחות זמנים ושיפור איכות.' },
        { icon: 'building', title: 'בית חכם', text: 'מערכות אוטומציה, בקרה ואנרגיה חכמה בכל דירה.' },
        { icon: 'shield', title: 'בקרת איכות דיגיטלית', text: 'כלים דיגיטליים למעקב, תיעוד ובקרה בזמן אמת בשטח.' },
      ]
    : [
        { icon: 'bulb', title: 'Advanced construction', text: 'Industrialized and modular building to shorten schedules and improve quality.' },
        { icon: 'building', title: 'Smart home', text: 'Automation, control and smart-energy systems in every apartment.' },
        { icon: 'shield', title: 'Digital quality control', text: 'Digital tools for real-time tracking, documentation and on-site control.' },
      ]

  return (
    <>
      <PageHeader
        eyebrow={t('pages.innovation.eyebrow')}
        title={t('pages.innovation.title')}
        lead={t('pages.innovation.lead')}
        crumbs={[{ label: t('nav.about'), to: '/about' }, { label: t('pages.innovation.title') }]}
      />
      <section className="section">
        <div className="container">
          <div className="info-grid">
            {items.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <FeatureCard icon={p.icon} title={p.title} desc={p.text} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
