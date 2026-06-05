import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import FeatureCard from '../components/ui/FeatureCard.jsx'
import './InfoPage.css'

export default function Sustainability() {
  const { t, lang } = useI18n()

  const pillars = lang === 'he'
    ? [
        { icon: 'leaf', title: 'סביבה (E)', text: 'בנייה ירוקה, חיסכון באנרגיה ומים, חומרים בני-קיימא והפחתת טביעת רגל פחמנית בכל פרויקט.' },
        { icon: 'handshake', title: 'חברה (S)', text: 'אחריות לקהילה, תנאי עבודה הוגנים, בטיחות בעבודה ותרומה לסביבה שבה אנו בונים.' },
        { icon: 'shield', title: 'ממשל תאגידי (G)', text: 'שקיפות, אתיקה עסקית וניהול סיכונים אחראי לאורך כל שרשרת הערך.' },
      ]
    : [
        { icon: 'leaf', title: 'Environmental (E)', text: 'Green building, energy and water savings, sustainable materials and a reduced carbon footprint in every project.' },
        { icon: 'handshake', title: 'Social (S)', text: 'Community responsibility, fair labor conditions, workplace safety and contribution to the environments we build in.' },
        { icon: 'shield', title: 'Governance (G)', text: 'Transparency, business ethics and responsible risk management across the value chain.' },
      ]

  return (
    <>
      <PageHeader
        eyebrow={t('pages.sustainability.eyebrow')}
        title={t('pages.sustainability.title')}
        lead={t('pages.sustainability.lead')}
        crumbs={[{ label: t('nav.about'), to: '/about' }, { label: t('pages.sustainability.title') }]}
      />
      <section className="section">
        <div className="container">
          <div className="info-grid">
            {pillars.map((p, i) => (
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
