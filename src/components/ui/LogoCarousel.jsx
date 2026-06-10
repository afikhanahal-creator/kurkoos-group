import { useState, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './LogoCarousel.css'

// ערבוב Fisher-Yates — מחזיר עותק מעורבב
const shuffleArr = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/* ============================================================
   LogoCarousel — לוגואים מתחלפים בעמודות עם אפקט היפוך חלק.
   מבוסס על התבנית של cult-ui, מותאם לסטאק שלנו (framer-motion / JS).
   logos: [{ id, name }]  ·  columnCount: מספר עמודות.
   ============================================================ */

// חלוקת הלוגואים לעמודות + ריפוד כך שלכל עמודה אותו אורך מחזור
function distribute(logos, columnCount) {
  const cols = Array.from({ length: columnCount }, () => [])
  logos.forEach((logo, i) => cols[i % columnCount].push(logo))
  const max = Math.max(1, ...cols.map((c) => c.length))
  cols.forEach((c) => {
    let i = 0
    while (c.length < max) { c.push(c[i % Math.max(1, c.length)]); i++ }
  })
  return cols
}

function LogoColumn({ logos, index, interval, shuffle = false }) {
  const [seq, setSeq] = useState(() => (shuffle ? shuffleArr(logos) : logos))
  const [current, setCurrent] = useState(0)
  const seqRef = useRef(seq)
  const curRef = useRef(0)
  seqRef.current = seq

  // רשימת לוגואים השתנתה (או מצב הערבוב) — אתחול מחדש
  useEffect(() => { setSeq(shuffle ? shuffleArr(logos) : logos); setCurrent(0); curRef.current = 0 }, [logos, shuffle])

  useEffect(() => {
    if (seq.length <= 1) return
    const stagger = index * 700 // התחלה מדורגת בין העמודות
    let id
    const advance = () => {
      const len = seqRef.current.length
      const next = (curRef.current + 1) % len
      curRef.current = next
      setCurrent(next)
      // השלמת סבב מלא → ערבוב מחדש (כשהמצב מופעל) כדי שהתצוגה "חיה" ומשתנה כל הזמן
      if (shuffle && next === 0) setSeq((s) => shuffleArr(s))
    }
    const to = setTimeout(() => { advance(); id = setInterval(advance, interval) }, stagger + interval)
    return () => { clearTimeout(to); if (id) clearInterval(id) }
  }, [seq.length, index, interval, shuffle])

  const logo = seq[current]

  return (
    <div className="logo-carousel__col">
      <AnimatePresence>
        <motion.div
          key={`${index}-${current}`}
          className="logo-carousel__logo"
          initial={{ y: '120%', opacity: 0, rotateX: -45 }}
          animate={{ y: '0%', opacity: 1, rotateX: 0 }}
          exit={{ y: '-120%', opacity: 0, rotateX: 45 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {logo?.image_url
            ? <img className="logo-carousel__img" src={logo.image_url} alt={logo.name || ''} />
            : logo?.name}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function LogoCarousel({ logos = [], columnCount, interval = 2600, shuffle = false }) {
  // עמודות רספונסיביות: 3 בדסקטופ, 2 במובייל (אלא אם נכפה דרך prop)
  const [cols, setCols] = useState(columnCount || 3)
  useEffect(() => {
    if (columnCount) return
    const update = () => setCols(window.innerWidth < 640 ? 2 : 3)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [columnCount])

  const columns = useMemo(() => distribute(logos, cols), [logos, cols])

  return (
    <div className="logo-carousel" role="list" aria-label="שותפים ולקוחות">
      {columns.map((colLogos, i) => (
        <LogoColumn key={i} logos={colLogos} index={i} interval={interval} shuffle={shuffle} />
      ))}
    </div>
  )
}
