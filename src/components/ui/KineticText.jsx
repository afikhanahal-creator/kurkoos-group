/* ============================================================
   KineticText — פורט של רכיב magicui/kinetic-text (קרדיט @abdmjd1)
   ל-stack של הפרויקט (JSX + CSS, ללא Tailwind/cn).
   אפקט: כל אות מתעבה (font-weight) ומקבלת קו-מתאר ומרווח בריחוף,
   והאותיות השכנות מגיבות ב"גל". דורש גופן variable (Rubik 300..900).
   props: text (חובה), as (תג, ברירת מחדל h2), className.
   ============================================================ */
import './KineticText.css'

export default function KineticText({ text = '', as: Tag = 'h2', className = '', ...rest }) {
  return (
    <Tag {...rest} className={`kinetic-text ${className}`.trim()}>
      {text.split('').map((ch, i) => (
        <span key={i} aria-hidden="true" className="kinetic-text__letter">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
