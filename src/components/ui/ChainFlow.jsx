import { useI18n } from '../../i18n/index.jsx'
import './ChainFlow.css'

/* ============================================================
   ChainFlow — באנר אנימציה לסקשן "שרשרת הערך".
   מציג את תמונת השרשרת (public/value-chain.png) ומוסיף עליה
   אנימציית-וב פרימיום: גל-אור מבריק שעובר לאורך השרשרת מימין
   לשמאל בלולאה חלקה ("shine transfer"), פלוס נדנוד עדין.
   הרקע נשאר סטטי. מכבד prefers-reduced-motion.
   ניתן להעביר src אחר כ-prop.
   ============================================================ */
export default function ChainFlow({ src = '/value-chain.png', alt }) {
  const { t } = useI18n()
  return (
    <figure className="chainflow" aria-label={alt || t('valueChain.title')}>
      <img className="chainflow__img" src={src} alt={alt || t('valueChain.title')} loading="lazy" decoding="async" />
      {/* גל-אור לבן שנע לאורך השרשרת (shine transfer) */}
      <span className="chainflow__shine" aria-hidden="true" />
      {/* הדגשת אלמנטים אדומים — סוויפ אדום עדין מסונכרן */}
      <span className="chainflow__glow" aria-hidden="true" />
    </figure>
  )
}
