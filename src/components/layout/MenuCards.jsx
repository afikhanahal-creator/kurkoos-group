import { Link } from 'react-router-dom'
import { useLocalized } from '../../i18n/index.jsx'
import Icon from '../ui/Icon.jsx'
import './MenuCards.css'

/* רצועת כרטיסי תחומים (כמו c-menu-cards של תדהר).
   סדר RTL (ימין→שמאל, למעלה→למטה): יזמות, ביצוע, פיקוח פרויקטים, תיווך. */
const items = [
  { id: 'development', icon: 'building', to: '/divisions/development', title: { he: 'יזמות', en: 'Development' } },
  { id: 'execution', icon: 'crane', to: '/divisions/execution', title: { he: 'ביצוע', en: 'Execution' } },
  { id: 'supervision', icon: 'shield', to: '/divisions/supervision', title: { he: 'פיקוח פרויקטים', en: 'Project supervision' } },
  { id: 'brokerage', icon: 'handshake', to: '/divisions/residential', title: { he: 'תיווך', en: 'Brokerage' } },
]

export default function MenuCards({ onNavigate }) {
  const L = useLocalized()
  return (
    <div className="menu-cards">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className="menu-card"
          onClick={onNavigate}
        >
          <span className="menu-card__icon"><Icon name={item.icon} size={30} stroke={1.5} /></span>
          <span className="menu-card__title">{L(item.title)}</span>
        </Link>
      ))}
    </div>
  )
}
