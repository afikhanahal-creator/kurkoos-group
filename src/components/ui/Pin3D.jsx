import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Pin3D.css'

/* ============================================================
   3D Pin — בהשראת Aceternity UI (PinContainer).
   מימוש עצמאי בסטאק שלנו (React + framer-motion, ללא Tailwind),
   בצבעי המותג. בריחוף: הכרטיס מוטה אחורה + תווית צפה + טבעות זוהר.
   ============================================================ */
export default function Pin3D({ title, to = '/projects', children }) {
  const [transform, setTransform] = useState('translate(-50%,-50%) rotateX(0deg) scale(1)')

  return (
    <Link
      to={to}
      className="pin3d"
      onMouseEnter={() => setTransform('translate(-50%,-50%) rotateX(40deg) scale(0.82)')}
      onMouseLeave={() => setTransform('translate(-50%,-50%) rotateX(0deg) scale(1)')}
    >
      <div className="pin3d__persp">
        <div className="pin3d__card" style={{ transform }}>
          <div className="pin3d__content">{children}</div>
        </div>
      </div>

      {/* הילה: תווית + טבעות + קרן */}
      <div className="pin3d__halo">
        <div className="pin3d__title-row">
          <span className="pin3d__title">
            {title}
            <span className="pin3d__title-line" />
          </span>
        </div>

        <div className="pin3d__rings">
          {[0, 2, 4].map((delay) => (
            <motion.span
              key={delay}
              className="pin3d__ring"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0.5, 0], scale: 1 }}
              transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <span className="pin3d__beam" />
        <span className="pin3d__dot" />
      </div>
    </Link>
  )
}
