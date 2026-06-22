import { Fragment } from 'react'
import './KineticText.css'

/* ============================================================
   KineticText — טיפוגרפיה קינטית שמגיבה לעכבר (מבוסס MagicUI).
   כל אות מפוצלת ל-span; האות שמתחת לסמן מתעבה ומקבלת קו מתאר,
   והשכנות מתעדנות בהדרגה — נוצר "גל" שעוקב אחרי העכבר.
   טהור-CSS (\u200E:has + שכנים), בלי JS.
   ============================================================ */
export default function KineticText({ text, as: Tag = 'h2', className = '', ...rest }) {
  // קיבוץ האותיות למילים — כל מילה ב-span עם white-space:nowrap → לא נשברת
  // באמצע (התיקון לכותרות חתוכות במובייל). הרווחים בין המילים נשארים ניתנים לגלישה.
  const words = String(text ?? '').split(' ')
  return (
    <Tag className={`kinetic ${className}`.trim()} {...rest}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="kinetic__word" aria-hidden="true">
            {Array.from(word).map((ch, i) => (
              <span key={i} className="kinetic__char">{ch}</span>
            ))}
          </span>
          {wi < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
