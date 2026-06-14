import { useI18n } from '../../i18n/index.jsx'
import './ChainFlow.css'

/* ============================================================
   ChainFlow — באנר אנימציה לסקשן "שרשרת הערך".
   מנגן את סרטון השרשרת המונפש (public/value-chain.mp4) בלולאה
   רציפה, ללא קול, autoplay — עם תמונת ה-poster כ-fallback בזמן
   טעינה / אם הווידאו לא נתמך. מכבד prefers-reduced-motion:
   במצב זה מוצגת התמונה הסטטית בלבד.
   ============================================================ */
export default function ChainFlow({
  src = '/value-chain.mp4',
  poster = '/value-chain.png',
  alt,
}) {
  const { t } = useI18n()
  const label = alt || t('valueChain.title')
  return (
    <figure className="chainflow" aria-label={label}>
      <video
        className="chainflow__video"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
      {/* fallback סטטי כשהווידאו מושבת (reduced-motion) */}
      <img className="chainflow__fallback" src={poster} alt={label} loading="lazy" decoding="async" />
    </figure>
  )
}
