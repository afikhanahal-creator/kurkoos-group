import { motion } from 'framer-motion'

/* עוטף תוכן באנימציית כניסה בגלילה. */
const variants = {
  up: { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0 } },
  down: { hidden: { opacity: 0, y: -40 }, show: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: 40 }, show: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: -40 }, show: { opacity: 1, x: 0 } },
  fade: { hidden: { opacity: 0 }, show: { opacity: 1 } },
  scale: { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } },
}

export default function Reveal({
  children,
  variant = 'up',
  delay = 0,
  duration = 0.6,
  as = 'div',
  className = '',
  amount = 0.2,
  ...rest
}) {
  const MotionTag = motion[as] || motion.div
  /* amount הוא החלק מהאלמנט שצריך להיות על המסך כדי שיופיע. בבלוק ארוך
     (גוף כתבה בטלפון גבוה פי כמה מהמסך) אחוז קבוע לעולם לא מתמלא, והטקסט
     נשאר שקוף לתמיד. לכן מספיק שקצה האלמנט ייכנס למסך. */
  const inView = typeof amount === 'number' ? Math.min(amount, 0.05) : amount
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: inView }}
      variants={variants[variant]}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
