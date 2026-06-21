import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import { useSupervision, getCategoriesFrom } from '../lib/supervision.js'
import { srcOfResponsive } from '../lib/responsiveImage.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import ArticleCover from '../components/ui/ArticleCover.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import './Yazamut.css'

/* פיקוח פרויקטים — עמוד רשימה. אותו עיצוב כמו טור היזמות/ביצוע. */
export default function Supervision() {
  const { lang } = useI18n()
  const all = useSupervision()
  const cats = useMemo(() => getCategoriesFrom(all), [all])
  const [cat, setCat] = useState('all')

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'he-IL', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  const filtered = cat === 'all' ? all : all.filter((a) => a.category === cat)

  const Card = ({ a }) => (
    <Reveal as="article" className="yz-card">
      <Link to={`/construction-supervision/${a.slug}`} className="yz-card__link">
        <div className="yz-card__media">
          {srcOfResponsive(a.cover) ? (
            <>
              <SmartImage src={a.cover} alt={a.coverAlt || a.title} label={a.title} w={700} sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 380px" />
              {a.category && <span className="yz-card__cat">{a.category}</span>}
            </>
          ) : (
            <ArticleCover article={a} variant="card" />
          )}
        </div>
        <div className="yz-card__body">
          <div className="yz-card__meta">
            <time>{fmtDate(a.date)}</time>
            {a.readingTime && <><span className="yz-dot">·</span><span>{a.readingTime}</span></>}
          </div>
          <h3 className="yz-card__title">{a.title}</h3>
          <p className="yz-card__excerpt">{a.excerpt}</p>
          <span className="yz-card__read">קראו את הכתבה <Icon name="arrow" size={16} /></span>
        </div>
      </Link>
    </Reveal>
  )

  return (
    <>
      <PageHeader
        eyebrow="שכינתא · ניהול ויזום פרויקטים"
        title="המדריך לפיקוח בנייה"
        lead="מבית שכינתא, חברת ניהול ויזום הפרויקטים של קבוצת קורקוס. פרשנות מקצועית ועניינית מהשטח: בקרת איכות, פיקוח ביצוע, ליקויים ובדק וניהול תקציב וסיכונים. כל מה שחשוב לדעת כשמפקחים על פרויקט בנייה."
        crumbs={[{ label: 'פיקוח פרויקטים', to: '/divisions/supervision' }, { label: 'הטור' }]}
      />

      <section className="section yz-page">
        <div className="container">
          {all.length === 0 ? (
            <p className="yz-empty">בקרוב, כתבות חדשות במדריך לפיקוח בנייה.</p>
          ) : (
            <>
              {cats.length > 1 && (
                <div className="yz-filters" role="tablist" aria-label="סינון לפי נושא">
                  <button type="button" className={`yz-chip ${cat === 'all' ? 'is-on' : ''}`} onClick={() => setCat('all')}>הכול</button>
                  {cats.map((c) => (
                    <button type="button" key={c} className={`yz-chip ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>{c}</button>
                  ))}
                </div>
              )}
              <div className="yz-grid">
                {filtered.map((a) => <Card key={a.slug} a={a} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
