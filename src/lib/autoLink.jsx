import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { glossaryGroups } from '../data/glossary.js'

/* ============================================================
   קישור אוטומטי בגוף הכתבה למילון המונחים ולמחשבונים.

   הכתבות הן רוב התנועה האורגנית, והן קישרו החוצה רק בסוף העמוד. מונח
   מקצועי שמוזכר באמצע פסקה הוא בדיוק הרגע שבו הקורא רוצה הסבר, וזה גם
   מה שמעביר כוח דירוג לעמודי המילון והמחשבונים.

   הכללים נועדו למנוע הצפה, שהיא גם מעצבנת וגם נראית למנוע חיפוש כמו
   ספאם קישורים:
     • רק המופע הראשון של כל יעד בכתבה
     • לכל היותר ארבעה קישורים אוטומטיים בכתבה
     • לא בכותרות, רק בפסקאות וברשימות
     • התאמה רק כשהמונח עומד בפני עצמו, לא כחלק ממילה אחרת
   ============================================================ */

const CALC = '/real-estate-calculators'

// מונחים נוספים שאין להם ערך במילון אבל יש להם עמוד ייעודי
const EXTRA = [
  { text: 'לוח שפיצר', to: CALC },
  { text: 'תשואה משכירות', to: CALC },
  { text: 'מחשבון משכנתא', to: CALC },
]

/* מהמילון: הצורה הקצרה של המונח, כלומר מה שלפני הסוגריים.
   "תב\"ע (תוכנית בניין עיר)" הופך ל-"תב\"ע". */
const fromGlossary = glossaryGroups.flatMap((g) =>
  g.terms.map((t) => ({
    text: String(t.term).split(' (')[0].trim(),
    to: `/real-estate-glossary#${t.id}`,
  })),
)

/* מקשרים רק מונחים חד משמעיים: צירוף של יותר ממילה אחת, או מונח שיש בו
   גרשיים או ספרה. מילה עברית בודדת ורגילה כמו "הקלה" היא גם מונח תכנוני
   וגם מילה יומיומית, ובכתבה על מס רכישה קישור אליה פשוט שגוי. */
const isUnambiguous = (s) => /\s/.test(s) || /["״׳'0-9]/.test(s)

// הארוכים קודם, כדי ש"הערת אזהרה" ינצח על פני "הערה" אם שניהם קיימים
const TERMS = [...EXTRA, ...fromGlossary]
  .filter((t) => t.text.length >= 4 && isUnambiguous(t.text))
  .sort((a, b) => b.text.length - a.text.length)

const HEB = /[א-ת]/
const isBoundary = (ch) => ch === undefined || !HEB.test(ch)

/* לינקר אחד לכל כתבה: זוכר מה כבר קושר וכמה קישורים נוצרו. */
export function createLinker({ max = 4 } = {}) {
  const used = new Set()
  let count = 0

  return function linkify(text, keyBase) {
    if (count >= max || !text) return null

    // המונח הראשון שמופיע בטקסט ועוד לא קושר בכתבה הזו
    let best = null
    for (const t of TERMS) {
      if (used.has(t.to)) continue
      const i = text.indexOf(t.text)
      if (i === -1) continue
      if (!isBoundary(text[i - 1]) || !isBoundary(text[i + t.text.length])) continue
      if (!best || i < best.i) best = { ...t, i }
    }
    if (!best) return null

    used.add(best.to)
    count++
    const before = text.slice(0, best.i)
    const after = text.slice(best.i + best.text.length)
    return (
      <Fragment key={`${keyBase}-al`}>
        {before}
        <Link className="mdx__auto-link" to={best.to}>{best.text}</Link>
        {after}
      </Fragment>
    )
  }
}
