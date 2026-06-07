import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import './CardStack.css'

/* ============================================================
   CardStack — ערימת כרטיסים אינטראקטיבית (מובייל, חוסך מקום).
   החלקה/הקשה על הכרטיס העליון שולחת אותו לסוף הערימה.
   items: [{ image, title, tagline, to }]
   מותאם ל-Vite + framer-motion (לא Tailwind/shadcn).
   ============================================================ */
export default function CardStack({ items = [], cta = '' }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i))
  if (!items.length) return null

  const advance = () => setOrder((o) => (o.length > 1 ? [...o.slice(1), o[0]] : o))
  const visible = order.slice(0, 3)

  return (
    <div className="card-stack" role="group" aria-roledescription="ערימת כרטיסים">
      <div className="card-stack__deck">
        {visible.map((idx, pos) => {
          const item = items[idx]
          const isTop = pos === 0
          return (
            <motion.article
              key={idx}
              className="card-stack__card"
              initial={false}
              animate={{ y: pos * 16, scale: 1 - pos * 0.06, opacity: pos > 1 ? 0.85 : 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              style={{ zIndex: visible.length - pos }}
              drag={isTop ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_e, info) => { if (Math.abs(info.offset.x) > 80) advance() }}
              onClick={isTop ? advance : undefined}
            >
              <div className="card-stack__img">
                <img src={item.image} alt={item.title} draggable={false} loading="lazy" />
                <span className="card-stack__title">{item.title}</span>
              </div>
              <div className="card-stack__body">
                {item.tagline && <span className="card-stack__tagline">{item.tagline}</span>}
                {item.to && (
                  <Link to={item.to} className="card-stack__cta" onClick={(e) => e.stopPropagation()}>
                    {cta}
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
              </div>
            </motion.article>
          )
        })}
      </div>

      {items.length > 1 && (
        <div className="card-stack__nav">
          <button type="button" className="card-stack__next" onClick={advance}>
            <Icon name="arrowLeft" size={18} /> הבא
          </button>
          <div className="card-stack__dots" aria-hidden="true">
            {items.map((_, i) => (
              <span key={i} className={`card-stack__dot ${i === order[0] ? 'is-active' : ''}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
