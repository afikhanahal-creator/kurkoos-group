import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import { useBrokerage, getCategoriesFrom } from '../lib/brokerage.js'
import { srcOfResponsive } from '../lib/responsiveImage.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import ArticleCover from '../components/ui/ArticleCover.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import './Yazamut.css'

/* המדריך לרוכש ולמוכר (תיווך ועסקאות) — עמוד רשימה. אותו עיצוב כמו שאר הטורים. */
export default function RealEstateGuide() {
  const { lang } = useI18n()
  const all = useBrokerage()
  const cats = useMemo(() => getCategoriesFrom(all), [all])
  const [cat, setCat] = useState('all')

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'he-IL', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  const filtered = cat === 'all' ? all : all.filter((a) => a.category === cat)

  const Card = ({ a }) => (
    <Reveal as="article" className="yz-card">
      <Link to={`/real-estate-guide/${a.slug}`} className="yz-card__link">
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
        eyebrow="תיווך ועסקאות"
        title="המדריך לרוכש ולמוכר"
        lead="מדריך מקצועי ועניני לעולם העסקאות: מכירה, רכישה, השכרה, השקעות ומשא ומתן. כל מה שחשוב לדעת לפני שחותמים, מנקודת מבט של מי שמלווה עסקאות בפועל."
        crumbs={[{ label: 'תיווך', to: '/divisions/brokerage' }, { label: 'המדריך' }]}
      />

      <section className="section yz-page">
        <div className="container">
          {all.length === 0 ? (
            <p className="yz-empty">בקרוב, כתבות חדשות במדריך לרוכש ולמוכר.</p>
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
