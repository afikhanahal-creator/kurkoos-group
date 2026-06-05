import Reveal from './Reveal.jsx'
import Breadcrumbs from './Breadcrumbs.jsx'
import InfiniteGrid from './InfiniteGrid.jsx'
import Seo from './Seo.jsx'
import './PageHeader.css'

/* כותרת עמוד אחידה לדפים פנימיים. crumbs = [{label, to}] (אופציונלי).
   מגדיר אוטומטית גם את ה-SEO של העמוד (title + description) לפי הכותרת והליד.
   ניתן לעקוף עם seoTitle / seoDescription, או לבטל עם noSeo. */
export default function PageHeader({ eyebrow, title, lead, crumbs, seoTitle, seoDescription, noindex, noSeo }) {
  return (
    <header className="page-header">
      {!noSeo && <Seo title={seoTitle || title} description={seoDescription || lead} noindex={noindex} />}
      <InfiniteGrid color="rgba(255,255,255,0.55)" baseOpacity={0.07} revealOpacity={0.3} />
      <div className="container">
        {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
        <Reveal>
          {eyebrow && <span className="eyebrow page-header__eyebrow">{eyebrow}</span>}
          <h1 className="page-header__title">{title}</h1>
          {lead && <p className="page-header__lead">{lead}</p>}
        </Reveal>
      </div>
    </header>
  )
}
