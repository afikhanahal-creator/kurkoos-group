import { useState, useId } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Icon from './Icon.jsx'
import Lightbox from './Lightbox.jsx'
import './StackGallery.css'

/* ============================================================
   StackGallery — גלריית "ערימה נפתחת" למובייל בלבד (עמוד ביצוע).
   במצב סגור: שלוש התמונות הראשונות פרושות כמניפה. לחיצה פותחת
   את כל התמונות לרשת. לחיצה על תמונה ברשת פותחת אותה במסך מלא
   (Lightbox) — שם אפשר ללחוץ על התמונה כדי לעבור לתמונה הבאה.
   הותאם מ-TSX (shadcn/Tailwind/motion) ל-JSX + framer-motion + CSS רגיל.
   ============================================================ */

// פריסת המניפה לשלוש התמונות הראשונות (מותאם למובייל — px קטנים)
const FAN = [
  { rotate: -14, x: -64, y: 12, zIndex: 10 },
  { rotate: -2, x: 0, y: -10, zIndex: 20 },
  { rotate: 12, x: 64, y: 6, zIndex: 30 },
]

const transition = { type: 'spring', stiffness: 160, damping: 18, mass: 1 }

export default function StackGallery({ images = [] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [failed, setFailed] = useState(() => new Set())
  const groupId = useId()

  // מסננים תמונות שלא נטענו (404) כך שאפשר להגדיר משבצות מראש
  const list = (images || []).filter((s) => s && !failed.has(s))
  if (!list.length) return null
  const onErr = (src) =>
    setFailed((f) => {
      const n = new Set(f)
      n.add(src)
      return n
    })

  return (
    <div className="sgal">
      <LayoutGroup id={groupId}>
        <motion.div
          layout
          className={`sgal__area ${isExpanded ? 'is-expanded' : 'is-stacked'}`}
          transition={transition}
        >
          {list.map((src, i) => {
            const isPrimary = i < 3
            if (!isPrimary && !isExpanded) return null
            const fan = FAN[i] || { rotate: 0, x: 0, y: 0, zIndex: i }

            return (
              <motion.button
                type="button"
                key={src}
                layoutId={`sgal-${src}`}
                layout
                className={`sgal__card ${isExpanded ? 'is-grid' : 'is-fan'}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: isExpanded ? 0 : fan.rotate,
                  x: isExpanded ? 0 : fan.x,
                  y: isExpanded ? 0 : fan.y,
                  zIndex: isExpanded ? 10 : fan.zIndex,
                }}
                transition={transition}
                onClick={() => (isExpanded ? setLightbox(i) : setIsExpanded(true))}
                aria-label={isExpanded ? `הגדלת תמונה ${i + 1}` : 'הצגת כל התמונות'}
              >
                <motion.span layout="position" className="sgal__imgwrap">
                  <img
                    className="sgal__img"
                    src={src}
                    alt={`גלריית ביצוע ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    onError={() => onErr(src)}
                  />
                </motion.span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* פס פעולה: סגור → "כל התמונות"; פתוח → "חזרה" */}
        <div className="sgal__bar">
          <AnimatePresence mode="wait" initial={false}>
            {isExpanded ? (
              <motion.button
                key="back"
                type="button"
                className="sgal__btn"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onClick={() => setIsExpanded(false)}
              >
                <Icon name="chevron" size={18} />
                <span>חזרה</span>
              </motion.button>
            ) : (
              <motion.button
                key="all"
                type="button"
                className="sgal__btn"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onClick={() => setIsExpanded(true)}
              >
                <span>כל התמונות מהשטח</span>
                <Icon name="search" size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {/* מסך מלא — לחיצה על התמונה עוברת לבאה (Lightbox קיים) */}
      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox
            images={list}
            index={lightbox}
            onClose={() => setLightbox(null)}
            onNavigate={(n) => setLightbox(n)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
