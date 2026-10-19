import { Link } from 'react-router-dom'
import './blocks.css'

/* ============================================================
   רכיבי הבסיס של עורך העמודים. כולם בנויים מהמחלקות הקיימות של האתר
   (container, section-title, section-lead, eyebrow, btn) ומהטוקנים בלבד.
   data-pbf מסמן שדה שאפשר לערוך בלחיצה כפולה על העמוד בעורך.
   ============================================================ */

const Shell = ({ type, bg = 'paper', children, narrow }) => (
  <section className={`section pb-w pb-w--${type} pb-bg--${bg}`}>
    <div className={`container pb-in${narrow ? ' pb-in--narrow' : ''}`}>{children}</div>
  </section>
)

const isInternal = (href) => href && href.startsWith('/') && !href.startsWith('//')
function SmartLink({ href, className, children, ...rest }) {
  if (!href) return <span className={className} {...rest}>{children}</span>
  if (isInternal(href)) return <Link to={href} className={className} {...rest}>{children}</Link>
  return <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
}

export function HeadingW({ props: p }) {
  const Tag = ['h1', 'h2', 'h3'].includes(p.tag) ? p.tag : 'h2'
  return (
    <Shell type="heading" bg={p.bg}>
      {p.eyebrow ? <span className="eyebrow pb-eyebrow" data-pbf="eyebrow">{p.eyebrow}</span> : null}
      <Tag className="section-title pb-h" data-pbf="text">{p.text}</Tag>
    </Shell>
  )
}

export function TextW({ props: p }) {
  return (
    <Shell type="text" bg={p.bg} narrow>
      <p className={p.lead ? 'section-lead pb-p pb-p--lead' : 'pb-p'} data-pbf="text">{p.text}</p>
    </Shell>
  )
}

export function ImageW({ props: p }) {
  return (
    <Shell type="image" bg={p.bg}>
      <figure className="pb-fig">
        {p.src
          ? <img className="pb-img" src={p.src} alt={p.alt || ''} loading="lazy" decoding="async" style={p.ratio && p.ratio !== 'auto' ? { aspectRatio: p.ratio, objectFit: 'cover' } : undefined} />
          : <div className="pb-empty">בחרו תמונה בהגדרות</div>}
        {p.caption ? <figcaption className="pb-cap" data-pbf="caption">{p.caption}</figcaption> : null}
      </figure>
    </Shell>
  )
}

export function ButtonW({ props: p }) {
  const cls = p.style === 'dark' ? 'btn btn--dark' : p.style === 'outline' ? 'btn btn--secondary' : 'btn btn--primary'
  return (
    <Shell type="button" bg={p.bg}>
      <div className="pb-row">
        <SmartLink href={p.href} className={cls}><span data-pbf="label">{p.label}</span></SmartLink>
      </div>
    </Shell>
  )
}

export function SpacerW({ props: p }) {
  return <section className={`pb-w pb-w--spacer pb-bg--${p.bg || 'paper'}`} style={{ height: Number(p.h) || 48 }} aria-hidden="true" />
}

export function DividerW({ props: p }) {
  return <Shell type="divider" bg={p.bg}><hr className="pb-hr" /></Shell>
}

function ytId(url = '') {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}
export function VideoW({ props: p }) {
  const yt = ytId(p.url)
  return (
    <Shell type="video" bg={p.bg}>
      <div className="pb-video">
        {yt
          ? <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={p.title || 'וידאו'} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          : p.url
            ? <video src={p.url} controls playsInline preload="metadata" title={p.title || undefined} />
            : <div className="pb-empty">הדביקו קישור לסרטון בהגדרות</div>}
      </div>
    </Shell>
  )
}

export function ChecklistW({ props: p }) {
  const items = Array.isArray(p.items) ? p.items : []
  return (
    <Shell type="checklist" bg={p.bg} narrow>
      <ul className="pb-check">
        {items.map((it, i) => (
          <li key={i}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span data-pbf={`items.${i}`}>{it}</span>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function ColumnsW({ props: p }) {
  const items = Array.isArray(p.items) ? p.items : []
  return (
    <Shell type={p.variant === 'cards' ? 'cards' : 'columns'} bg={p.bg}>
      <div className={`pb-cols pb-cols--${p.variant === 'cards' ? 'cards' : 'plain'}`}>
        {items.map((it, i) => (
          <article className="pb-col" key={i}>
            {it.image ? <img className="pb-col__img" src={it.image} alt="" loading="lazy" decoding="async" /> : null}
            {it.title ? <h3 className="pb-col__title" data-pbf={`items.${i}.title`}>{it.title}</h3> : null}
            {it.text ? <p className="pb-col__text" data-pbf={`items.${i}.text`}>{it.text}</p> : null}
            {it.link && it.linkLabel ? <SmartLink href={it.link} className="pb-col__link">{it.linkLabel}</SmartLink> : null}
          </article>
        ))}
      </div>
    </Shell>
  )
}

export function GalleryW({ props: p }) {
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : []
  return (
    <Shell type="gallery" bg={p.bg}>
      {images.length
        ? <div className="pb-cols pb-gal">{images.map((src, i) => <img key={i} src={src} alt="" loading="lazy" decoding="async" />)}</div>
        : <div className="pb-empty">הוסיפו תמונות בהגדרות</div>}
    </Shell>
  )
}
