import './ArticleVideo.css'

/* סרטון אנכי בתוך כתבה. לא נטען עד שלוחצים על הפעלה (preload="none"),
   כדי שלא יאט את טעינת הכתבה. */
export default function ArticleVideo({ video, fallbackTitle = '' }) {
  if (!video || !video.src) return null
  const title = video.title || fallbackTitle
  return (
    <figure className="article-video">
      <video
        className="article-video__player"
        src={video.src}
        poster={video.poster || undefined}
        controls
        preload="none"
        playsInline
        width="360"
        height="640"
        aria-label={title}
      />
      {title && <figcaption className="article-video__caption">{title}</figcaption>}
    </figure>
  )
}
