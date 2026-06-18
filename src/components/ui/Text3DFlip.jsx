import { motion } from 'framer-motion'
import './Text3DFlip.css'

/* ============================================================
   Text3DFlip — אפקט "היפוך תלת-מימד" לכותרת, אות-אחר-אות, עם stagger.
   מימוש נטיבי (framer-motion) של רעיון magicui — מותאם RTL: האותיות
   זורמות מימין לשמאל, וההיפוך מתפשט מהאות הראשונה (הימנית) שמאלה.
   מופעל כשנכנס לתצוגה. מכבד prefers-reduced-motion.

   מילים נשמרות כיחידה אחת (t3df__word עם white-space:nowrap) כך ששם
   הפרויקט לעולם לא נשבר באמצע מילה — שבירת שורה רק בין מילים.
   ============================================================ */
export default function Text3DFlip({ text = '', className = '', stagger = 0.045 }) {
  // מפצלים למילים תוך שמירת הרווחים כטוקנים (כדי לאפשר שבירת שורה רק ביניהן)
  const words = String(text).split(/(\s+)/).filter((w) => w !== '')

  const container = { hidden: {}, visible: {} }
  // עיכוב מפורש לכל אות (במקום staggerChildren) — נשמר גם כשהאותיות מקוננות בתוך מילים
  const char = {
    hidden: { rotateX: -90, opacity: 0, y: '0.1em' },
    visible: (i) => ({
      rotateX: 0,
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 160, delay: i * stagger },
    }),
  }

  let idx = 0
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
      {words.map((word, wi) => {
        // טוקן רווח — שבירת שורה מותרת כאן (רווח רגיל)
        if (/^\s+$/.test(word)) return <span key={wi} className="t3df__space"> </span>
        // רצף ספרות נשאר טוקן אחד (כדי שלא יתהפך ב-RTL, למשל "70"→"07"); שאר התווים — אות-אות
        const tokens = word.match(/\d+|[^\d]/g) || []
        return (
          <span key={wi} className="t3df__word">
            {tokens.map((c, ci) => {
              const i = idx++
              return (
                <motion.span
                  key={ci}
                  className="t3df__char"
                  custom={i}
                  variants={char}
                  aria-hidden="true"
                  dir={/^\d/.test(c) ? 'ltr' : undefined}
                >
                  {c}
                </motion.span>
              )
            })}
          </span>
        )
      })}
    </motion.span>
  )
}
