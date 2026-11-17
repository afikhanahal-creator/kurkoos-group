import { Link } from 'react-router-dom'
import Seo from '../components/ui/Seo.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import ArticleCover from '../components/ui/ArticleCover.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import { SITE_MAP_PATH, SITE_MAP_TITLE, SITE_MAP_INTRO, SITE_MAP_GROUPS } from '../data/siteMapPages.js'
import { COLUMNS, PAGE_META, HOME_CRUMB, breadcrumbLd } from '../lib/seo.js'
import { useYazamutArticles } from '../lib/yazamut.js'
import { useConstructions } from '../lib/constructions.js'
import { useSupervision } from '../lib/supervision.js'
import { useBrokerage } from '../lib/brokerage.js'
import { useMentorGuideArticles } from '../lib/mentorguide.js'
import './Yazamut.css'

/* ============================================================
   מפת אתר למשתמשים ולסורקים: כל העמודים הקבועים (data/siteMapPages.js)
   וכל הכתבות שפורסמו בחמשת הטורים, כקישורים רגילים. אותה תבנית עיצוב
   של מרכז השאלות והתשובות (yz-article), בלי רכיב עיצוב חדש.
   עמוד שנבנה אוטומטית, ולכן לא נערך בעורך העמודים (EXCLUDED ב-defs).
   ============================================================ */

const COVER = { title: SITE_MAP_TITLE, category: 'בקרת איכות', coverAlt: 'מפת האתר של קבוצת קורקוס' }

export default function SiteMap() {
  const byColumn = {
    yazamut: useYazamutArticles(),
    constructions: useConstructions(),
    supervision: useSupervision(),
    brokerage: useBrokerage(),
    mentorguide: useMentorGuideArticles(),
  }
  return (
    <article className="yz-article">
      <Seo
        title={PAGE_META[SITE_MAP_PATH].title}
        description={PAGE_META[SITE_MAP_PATH].description}
        jsonLd={breadcrumbLd([HOME_CRUMB, { name: SITE_MAP_TITLE, path: SITE_MAP_PATH }])}
      />
      <header className="yz-hero">
        <div className="yz-hero__bg">
          <ArticleCover article={COVER} variant="hero" />
        </div>
        <div className="yz-hero__overlay" />
        <div className="container yz-hero__content">
          <Breadcrumbs items={[{ label: SITE_MAP_TITLE, to: SITE_MAP_PATH }]} />
          <h1 className="yz-hero__title">{SITE_MAP_TITLE}</h1>
        </div>
      </header>
      <section className="section">
        <Reveal className="container yz-body">
          <p className="yz-lead">{SITE_MAP_INTRO}</p>
          <div className="mdx">
            {SITE_MAP_GROUPS.map((g) => (
              <section key={g.id} aria-labelledby={`sm-${g.id}`}>
                <h2 id={`sm-${g.id}`}>{g.title}</h2>
                <ul>
                  {g.links.map(([to, label]) => (
                    <li key={to}><Link className="mdx__auto-link" to={to}>{label}</Link></li>
                  ))}
                </ul>
              </section>
            ))}
            {Object.entries(COLUMNS).map(([key, col]) => (
              <section key={key} aria-labelledby={`sm-${key}`}>
                <h2 id={`sm-${key}`}><Link to={col.route}>{col.index}</Link></h2>
                <ul>
                  {(byColumn[key] || []).map((a) => (
                    <li key={a.slug}><Link className="mdx__auto-link" to={`${col.route}/${a.slug}`}>{a.title}</Link></li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Reveal>
      </section>
    </article>
  )
}
