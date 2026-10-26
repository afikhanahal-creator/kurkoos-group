import './ArticleVideo.css'
import { videoSources } from '../../lib/cms.js'

/* סרטון אנכי בתוך כתבה. לא נטען עד שלוחצים על הפעלה (preload="none"),
   כדי שלא יאט את טעינת הכתבה. */
export default function ArticleVideo({ video, fallbackTitle = '' }) {
  if (!video || !video.src) return null
  const title = video.title || fallbackTitle
  return (
    <figure className="article-video">
      <video
        key={video.src}
        className="article-video__player"
        poster={video.poster || undefined}
        controls
        preload="none"
        playsInline
        width="360"
        height="640"
        aria-label={title}
      >
        {videoSources(video.src).map((x) => <source key={x.src} src={x.src} type={x.type} />)}
      </video>
      {title && <figcaption className="article-video__caption">{title}</figcaption>}
    </figure>
  )
}
