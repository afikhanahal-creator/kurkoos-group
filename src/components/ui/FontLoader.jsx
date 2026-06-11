import { useEffect } from 'react'
import { useSettings } from '../../lib/cms.js'
import { applyFonts, applyTypeScale } from '../../lib/fonts.js'

/* ============================================================
   FontLoader — קורא את בחירת הפונטים + הסולם הטיפוגרפי (גדלים
   ומשקלים לכל רמת כותרת) מה-CMS ומחיל אותם על האתר בזמן ריצה.
   ללא בחירה — האתר נשאר עם ברירות המחדל שב-tokens.css.
   רכיב חסר-תצוגה (מורכב פעם אחת ב-App).
   ============================================================ */
export default function FontLoader() {
  const settings = useSettings()
  useEffect(() => { applyFonts(settings); applyTypeScale(settings) }, [settings])
  return null
}
