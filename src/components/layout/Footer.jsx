import { Link } from 'react-router-dom'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import Logo from './Logo.jsx'
import Icon from '../ui/Icon.jsx'
import Newsletter from '../ui/Newsletter.jsx'
import InfiniteGrid from '../ui/InfiniteGrid.jsx'
import './Footer.css'

export default function Footer() {
  const { t } = useI18n()
  const L = useLocalized()
  const year = 2026

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
              href={`mailto:${site.contact.email}`}
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
          <Link to="/blog">{t('pages.blog.title')}</Link>
          <Link to="/careers">{t('nav.careers')}</Link>
        </nav>

        <div className="footer__col">
          <h4 className="footer__heading">{t('footer.contact')}</h4>
          <a href={`tel:${site.contact.phone}`} className="footer__contact">
            <Icon name="phone" size={17} /> {site.contact.phoneDisplay}
          </a>
          <a href={`mailto:${site.contact.email}`} className="footer__contact">
            <Icon name="mail" size={17} /> {site.contact.email}
          </a>
          <span className="footer__contact">
            <Icon name="location" size={17} /> {L(site.contact.address)}
          </span>
          <span className="footer__contact footer__contact--muted">{L(site.contact.hours)}</span>
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
