import { Link } from 'react-router-dom'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import { useSettings } from '../../lib/cms.js'
import Logo from './Logo.jsx'
import Icon from '../ui/Icon.jsx'
import Newsletter from '../ui/Newsletter.jsx'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import './Footer.css'

export default function Footer() {
  const { t } = useI18n()
  const L = useLocalized()
  const year = 2026
  // פרטי התקשרות — ניתנים לעריכה מהאדמין (הגדרות ← פרטי התקשרות);
  // ללא ערך בענן נופלים לערכי ברירת המחדל שבקובץ site.js
  const s = useSettings()
  const contact = {
    phone: s.contact_phone || site.contact.phone,
    phoneDisplay: s.contact_phone || site.contact.phoneDisplay,
    email: s.contact_email || site.contact.email,
    address: s.contact_address ? { he: s.contact_address, en: s.contact_address } : site.contact.address,
    hours: s.contact_hours ? { he: s.contact_hours, en: s.contact_hours } : site.contact.hours,
  }

  return (
    <footer className="footer">
      <InfiniteGrid color="rgba(255,255,255,0.5)" baseOpacity={0.06} revealOpacity={0.26} />
      <div className="container">
        <Newsletter />
      </div>
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo variant="light" />
          <div className="footer__social">
            {site.social.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="footer__social-link"
              >
                <Icon name={s.icon} size={20} />
              </a>
            ))}
            <a
              href={`mailto:${contact.email}`}
              aria-label={L({ he: 'שלחו לנו מייל', en: 'Email us' })}
              className="footer__social-link"
            >
              <Icon name="mail" size={20} />
            </a>
          </div>
        </div>

        <nav className="footer__col" aria-label="Footer navigation">
          <h4 className="footer__heading">{t('footer.quickLinks')}</h4>
          <Link to="/about">{t('nav.about')}</Link>
          <Link to="/projects">{t('nav.projects')}</Link>
          <Link to="/team">{t('nav.team')}</Link>
          <Link to="/divisions/execution">{t('footer.linkExec')}</Link>
          <Link to="/divisions/brokerage">{t('footer.linkBrokerage')}</Link>
        </nav>

        <div className="footer__col">
          <h4 className="footer__heading">{t('footer.contact')}</h4>
          <a href={`tel:${String(contact.phone).replace(/[^+\d]/g, "")}`} className="footer__contact">
            <Icon name="phone" size={17} /> {contact.phoneDisplay}
          </a>
          <a href={`mailto:${contact.email}`} className="footer__contact">
            <Icon name="mail" size={17} /> {contact.email}
          </a>
          <span className="footer__contact">
            <Icon name="location" size={17} /> {L(contact.address)}
          </span>
          <span className="footer__contact footer__contact--muted">{L(contact.hours)}</span>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <span>© {year} {L(site.name)}. {t('footer.rights')}.</span>
          <div className="footer__legal">
            <Link to="/accessibility">{t('footer.accessibility')}</Link>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
          </div>
          <img
            src="/aminot-badge.png"
            alt={L({ he: 'חותם אמינות Dun & Bradstreet', en: 'Dun & Bradstreet reliability seal' })}
            className="footer__badge"
            width="108"
            height="108"
            loading="lazy"
          />
        </div>
      </div>
    </footer>
  )
}
