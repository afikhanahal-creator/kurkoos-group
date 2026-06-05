import { useI18n } from '../../i18n/index.jsx'
import partners from '../../data/partners.js'
import './Partners.css'

export default function Partners() {
  const { t } = useI18n()
  // משכפלים את הרשימה כדי שהאנימציה (marquee) תהיה רציפה
  const loop = [...partners, ...partners]

  return (
    <section className="partners">
      <div className="container">
        <p className="partners__title">{t('partners.title')}</p>
      </div>
      <div className="partners__marquee" aria-hidden="false">
        <div className="partners__track">
          {loop.map((p, i) => (
            <span className="partners__item" key={`${p.id}-${i}`}>
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
