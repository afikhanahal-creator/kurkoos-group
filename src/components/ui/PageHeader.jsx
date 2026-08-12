import Reveal from './Reveal.jsx'
import Breadcrumbs from './Breadcrumbs.jsx'
import InfiniteGrid from './InfiniteGrid.jsx'
import Seo from './Seo.jsx'
import './PageHeader.css'

/* כותרת עמוד אחידה לדפים פנימיים. crumbs = [{label, to}] (אופציונלי).
   מגדיר אוטומטית גם את ה-SEO של העמוד (title + description) לפי הכותרת והליד.
   ניתן לעקוף עם seoTitle / seoDescription, או לבטל עם noSeo.
   image (אופציונלי) = תמונת קאבר: מוצגת כרקע עם שכבת כהות לקריאות הטקסט.
   imagePos = object-position; imageFlip = שיקוף אופקי (כשנושא התמונה מוסתר ע"י הטקסט). */
export default function PageHeader({
  eyebrow, title, lead, crumbs, seoTitle, seoDescription, noindex, noSeo,
  image, imageAlt = '', imagePos = 'center', imageFlip = false,
}) {
  return (
    <header className={`page-header ${image ? 'page-header--photo' : ''}`}>
      {!noSeo && <Seo title={seoTitle || title} description={seoDescription || lead} noindex={noindex} />}
      {image && (
        <div className="page-header__media">
          <img
            src={image}
            alt={imageAlt}
            style={{ objectPosition: imagePos }}
            className={imageFlip ? 'is-flipped' : undefined}
            loading="eager"
            fetchPriority="high"
          />
          <span className="page-header__media-overlay" aria-hidden="true" />
        </div>
      )}
      {!image && <InfiniteGrid color="rgba(255,255,255,0.55)" baseOpacity={0.07} revealOpacity={0.3} />}
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
