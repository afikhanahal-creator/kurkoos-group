import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './Breadcrumbs.css'

/* items: [{ label, to }] — הפריט האחרון מוצג כעמוד הנוכחי (ללא קישור).
   קישור הבית מקבל חץ "חזרה" ברור (מצביע לכיוון ההתחלה לפי כיוון השפה). */
export default function Breadcrumbs({ items = [] }) {
  const { t, isRTL } = useI18n()
  const all = [{ label: t('common.home'), to: '/' }, ...items]
  const backIcon = isRTL ? 'arrow' : 'arrowLeft' // מצביע "אחורה" אל הבית

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {all.map((item, i) => {
          const last = i === all.length - 1
          const isHome = i === 0
          return (
            <li key={i} className="breadcrumbs__item">
              {last || !item.to ? (
                <span className="breadcrumbs__current" aria-current="page">{item.label}</span>
              ) : (
                <Link
                  to={item.to}
                  className={`breadcrumbs__link${isHome ? ' breadcrumbs__link--back' : ''}`}
                >
                  {isHome && <Icon name={backIcon} size={16} className="breadcrumbs__back-ic" />}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
