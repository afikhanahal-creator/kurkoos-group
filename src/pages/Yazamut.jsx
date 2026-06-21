import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import { getArticles, getCategories } from '../lib/yazamut.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import './Yazamut.css'

/* ============================================================
   טור יזמות נדל"ן — עמוד רשימה (מגזין).
   כתבה ראשית גדולה למעלה + רשת כתבות, עם סינון לפי קטגוריה.
   ============================================================ */
export default function Yazamut() {
  const { lang } = useI18n()
  const all = useMemo(() => getArticles(), [])
  const cats = useMemo(() => getCategories(), [])
  const [cat, setCat] = useState('all')

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'he-IL', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  const filtered = cat === 'all' ? all : all.filter((a) => a.category === cat)
  const [featured, ...rest] = filtered

  const Card = ({ a, large = false }) => (
    <Reveal as="article" className={`yz-card${large ? ' yz-card--lg' : ''}`}>
      <Link to={`/yazamut-nadlan/${a.slug}`} className="yz-card__link">
        <div className="yz-card__media">
          <SmartImage src={a.cover} alt={a.coverAlt || a.title} label={a.title} w={large ? 1200 : 700} sizes={large ? '(max-width: 900px) 100vw, 760px' : '(max-width: 700px) 100vw, 380px'} />
          {a.category && <span className="yz-card__cat">{a.category}</span>}
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
        eyebrow="טור יזמות נדל״ן"
        title="המדריך ליזמות נדל״ן"
        lead="פרשנות שבועית, עניינית ועדכנית על יזמות נדל״ן בישראל — התחדשות עירונית, מימון, רגולציה, קרקע ומגמות שוק. מאת מערכת קבוצת קורקוס."
        crumbs={[{ label: 'יזמות נדל״ן', to: '/divisions/development' }, { label: 'הטור' }]}
      />

      <section className="section yz-page">
        <div className="container">
          {all.length === 0 ? (
            <p className="yz-empty">בקרוב — כתבות חדשות בטור יזמות הנדל״ן.</p>
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

              {featured && <Card a={featured} large />}

              {rest.length > 0 && (
                <div className="yz-grid">
                  {rest.map((a) => <Card key={a.slug} a={a} />)}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
