import { useEffect } from 'react'
import { useSettings } from '../../lib/cms.js'
import { applyFonts } from '../../lib/fonts.js'

/* ============================================================
   FontLoader — קורא את בחירת הפונטים מה-CMS (site_settings) ומחיל
   אותה על האתר בזמן ריצה. ללא בחירה — האתר נשאר עם פונטי ברירת
   המחדל שב-tokens.css. רכיב חסר-תצוגה (מורכב פעם אחת ב-App).
   ============================================================ */
export default function FontLoader() {
  const settings = useSettings()
  useEffect(() => { applyFonts(settings) }, [settings])
  return null
}
