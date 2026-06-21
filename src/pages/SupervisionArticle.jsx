import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import { useSupervisionArticle, useSupervision } from '../lib/supervision.js'
import { srcOfResponsive } from '../lib/responsiveImage.js'
import Seo from '../components/ui/Seo.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import ArticleCover from '../components/ui/ArticleCover.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import MiniMarkdown from '../lib/miniMarkdown.jsx'
import './Yazamut.css'

const SITE = 'https://kurkoos-group.co.il'

export default function SupervisionArticle() {
  const { slug } = useParams()
  const { lang } = useI18n()
  const article = useSupervisionArticle(slug)
  const allArticles = useSupervision()
  const related = useMemo(
    () => allArticles.filter((a) => a.slug !== slug).slice(0, 3),
    [allArticles, slug]
  )

  if (!article) return <Navigate to="/construction-supervision" replace />

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'he-IL', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  const coverUrl = srcOfResponsive(article.cover)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    image: coverUrl ? [coverUrl] : undefined,
    datePublished: article.date,
    dateModified: article.date,
    author: { '@type': 'Organization', name: 'קבוצת קורקוס' },
    publisher: {
      '@type': 'Organization',
      name: 'קבוצת קורקוס',
      logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/construction-supervision/${article.slug}` },
    articleSection: article.category,
    keywords: [article.focusKeyword, ...(Array.isArray(article.tags) ? article.tags : [])].filter(Boolean).join(', '),
  }

  return (
    <article className="yz-article">
      <Seo
        title={article.metaTitle || `${article.title} · המדריך לפיקוח בנייה`}
        description={article.metaDescription || article.excerpt}
        image={coverUrl}
        jsonLd={jsonLd}
      />

      <header className="yz-hero">
        <div className="yz-hero__bg">
          {coverUrl
            ? <SmartImage src={article.cover} alt={article.coverAlt || article.title} label={article.title} w={1800} sizes="100vw" priority />
            : <ArticleCover article={article} variant="hero" />}
        </div>
        <div className="yz-hero__overlay" />
        <div className="container yz-hero__content">
          <Breadcrumbs
            items={[
              { label: 'פיקוח פרויקטים', to: '/divisions/supervision' },
              { label: 'הטור', to: '/construction-supervision' },
              { label: article.category || 'כתבה' },
            ]}
          />
          {article.category && <span className="yz-hero__cat">{article.category}</span>}
          <h1 className="yz-hero__title">{article.title}</h1>
          <div className="yz-hero__meta">
            <span>{article.author || 'מערכת קבוצת קורקוס'}</span>
            <span className="yz-dot">·</span>
            <time>{fmtDate(article.date)}</time>
            {article.readingTime && <><span className="yz-dot">·</span><span>{article.readingTime}</span></>}
          </div>
        </div>
      </header>

      <section className="section">
        <Reveal className="container yz-body">
          <p className="yz-lead">{article.excerpt}</p>
          <MiniMarkdown source={article.body} />

          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <div className="yz-tags">
              {article.tags.map((tg) => <span key={tg} className="yz-tag">#{tg}</span>)}
            </div>
          )}

          <div className="yz-author-card">
            <div className="yz-author-card__txt">
              <strong>לפני בנייה או במהלך פרויקט?</strong>
              <span>שכינתא, חברת ניהול ויזום הפרויקטים של קבוצת קורקוס, מלווה אתכם לאורך כל שלבי הביצוע.</span>
            </div>
            <Link to="/divisions/supervision" className="btn btn--dark">
              לשירותי הפיקוח <Icon name="arrowLeft" size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

      {related.length > 0 && (
        <section className="section section--soft">
          <div className="container">
            <h2 className="yz-related__title">עוד מהמדריך</h2>
            <div className="yz-grid">
              {related.map((a) => (
                <Reveal as="article" key={a.slug} className="yz-card">
                  <Link to={`/construction-supervision/${a.slug}`} className="yz-card__link">
                    <div className="yz-card__media">
                      {srcOfResponsive(a.cover) ? (
                        <>
                          <SmartImage src={a.cover} alt={a.coverAlt || a.title} label={a.title} w={700} sizes="(max-width: 700px) 100vw, 380px" />
                          {a.category && <span className="yz-card__cat">{a.category}</span>}
                        </>
                      ) : (
                        <ArticleCover article={a} variant="card" />
                      )}
                    </div>
                    <div className="yz-card__body">
                      <div className="yz-card__meta"><time>{fmtDate(a.date)}</time></div>
                      <h3 className="yz-card__title">{a.title}</h3>
                      <span className="yz-card__read">קראו את הכתבה <Icon name="arrow" size={16} /></span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
