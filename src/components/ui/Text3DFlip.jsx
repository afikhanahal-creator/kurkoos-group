import { motion } from 'framer-motion'
import './Text3DFlip.css'

/* ============================================================
   Text3DFlip — אפקט "היפוך תלת-מימד" לכותרת, אות-אחר-אות, עם stagger.
   מימוש נטיבי (framer-motion) של רעיון magicui — מותאם RTL: האותיות
   זורמות מימין לשמאל, וההיפוך מתפשט מהאות הראשונה (הימנית) שמאלה.
   מופעל כשנכנס לתצוגה. מכבד prefers-reduced-motion.
   ============================================================ */
export default function Text3DFlip({ text = '', className = '', stagger = 0.045 }) {
  // טוקניזציה: רצף ספרות נשאר טוקן אחד (כדי שלא יתהפך ב-RTL, למשל "70"→"07"),
  // רווח כטוקן, וכל תו אחר (אות) כטוקן נפרד — לשמירת אנימציית אות-אחר-אות.
  const chars = String(text).match(/\d+|\s|[^\d\s]/g) || []

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  }
  const char = {
    hidden: { rotateX: -90, opacity: 0, y: '0.1em' },
    visible: {
      rotateX: 0,
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 160 },
    },
  }

  return (
    <motion.span
      className={`t3df ${className}`}
      dir="rtl"
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      aria-label={text}
    >
      {chars.map((c, i) => (
        <motion.span key={i} className="t3df__char" variants={char} aria-hidden="true" dir={/^\d/.test(c) ? 'ltr' : undefined}>
          {c === ' ' ? ' ' : c}
        </motion.span>
      ))}
    </motion.span>
  )
}
