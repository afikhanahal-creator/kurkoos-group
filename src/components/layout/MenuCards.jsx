import { Link } from 'react-router-dom'
import { useLocalized } from '../../i18n/index.jsx'
import Icon from '../ui/Icon.jsx'
import '../sections/Activities.css'   // אפקט הכרטיס המשותף (card-effect: נוזל/ברק/זוהר/תילט 3D)
import './MenuCards.css'

/* רצועת כרטיסי תחומים — עם אותו אפקט hover של כל כרטיסי האתר.
   סדר RTL (ימין→שמאל): יזמות, ביצוע, פיקוח פרויקטים, תיווך. */
const items = [
  { id: 'development', icon: 'development', to: '/divisions/development', title: { he: 'יזמות', en: 'Development' } },
  { id: 'execution', icon: 'execution', to: '/divisions/execution', title: { he: 'ביצוע', en: 'Execution' } },
  { id: 'supervision', icon: 'supervision', to: '/divisions/supervision', title: { he: 'פיקוח פרויקטים', en: 'Project supervision' } },
  { id: 'brokerage', icon: 'brokerage', to: '/divisions/brokerage', title: { he: 'תיווך', en: 'Brokerage' } },
]

export default function MenuCards({ onNavigate }) {
  const L = useLocalized()
  return (
    <div className="menu-cards">
      {items.map((item) => (
        <Link key={item.id} to={item.to} className="menu-card card-effect" onClick={onNavigate}>
          <div className="card-inner menu-card__inner">
            <span className="card__liquid" aria-hidden="true" />
            <span className="card__shine" aria-hidden="true" />
            <span className="card__glow" aria-hidden="true" />
            <div className="card__content menu-card__content">
              <span className="card__image menu-card__icon"><Icon name={item.icon} size={28} stroke={1.5} /></span>
              <h3 className="card__title menu-card__title">{L(item.title)}</h3>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
