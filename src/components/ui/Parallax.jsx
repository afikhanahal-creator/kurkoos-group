import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import './Parallax.css'

/* עוטף תמונה ומזיז אותה בעדינות בגלילה (אפקט עומק). */
export default function Parallax({ children, className = '', amount = '10%' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount}`, amount])

  return (
    <div ref={ref} className={`parallax ${className}`}>
      <motion.div className="parallax__inner" style={{ y }}>
        {children}
      </motion.div>
    </div>
  )
}
