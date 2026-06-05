import { useI18n, useLocalized } from '../i18n/index.jsx'
import posts from '../data/posts.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import './Blog.css'

export default function Blog() {
  const { t, lang } = useI18n()
  const L = useLocalized()

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  return (
    <>
      <PageHeader
        eyebrow={t('pages.blog.eyebrow')}
        title={t('pages.blog.title')}
        lead={t('pages.blog.lead')}
        crumbs={[{ label: t('pages.blog.title') }]}
      />
      <section className="section blog-page">
        <div className="container">
          <div className="blog-grid">
            {posts.map((p, i) => (
              <Reveal as="article" key={p.slug} className="blog-card" delay={(i % 3) * 0.08}>
                <div className="blog-card__media">
                  <SmartImage src={p.cover} alt={L(p.title)} label={L(p.title)} />
                </div>
                <div className="blog-card__body">
                  <time className="blog-card__date">{fmtDate(p.date)}</time>
                  <h3 className="blog-card__title">{L(p.title)}</h3>
                  <p className="blog-card__excerpt">{L(p.excerpt)}</p>
                  <span className="blog-card__read">
                    {t('pages.blog.read')} <Icon name="arrow" size={16} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
