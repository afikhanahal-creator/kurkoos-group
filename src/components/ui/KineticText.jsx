import './KineticText.css'

/* ============================================================
   KineticText — טיפוגרפיה קינטית שמגיבה לעכבר (מבוסס MagicUI).
   כל אות מפוצלת ל-span; האות שמתחת לסמן מתעבה ומקבלת קו מתאר,
   והשכנות מתעדנות בהדרגה — נוצר "גל" שעוקב אחרי העכבר.
   טהור-CSS (\u200E:has + שכנים), בלי JS.
   ============================================================ */
export default function KineticText({ text, as: Tag = 'h2', className = '', ...rest }) {
  return (
    <Tag className={`kinetic ${className}`.trim()} {...rest}>
      {Array.from(text).map((ch, i) =>
        ch === ' ' ? (
          ' '
        ) : (
          <span key={i} className="kinetic__char" aria-hidden="true">
            {ch}
          </span>
        )
      )}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
