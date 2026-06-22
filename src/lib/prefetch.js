/* ============================================================
   טעינה-מוקדמת (prefetch) של chunks לפי כוונה — כדי שמעבר לעמודי
   הרשימה והכתבות יהיה מיידי, בלי המתנה להורדת ה-chunk תוך כדי הניווט
   (שגרמה ל"הבהוב" / מסך ריק בזמן מעבר העמוד).

   החשוב: מפרט המודול ('../pages/Foo.jsx') חייב להיות זהה לזה שב-App.jsx,
   כך ש-Vite מזהה אותו כאותו chunk ולא יוצר כפילות. הקריאה ל-import()
   רק *מורידה* את ה-chunk למטמון הדפדפן; הרינדור בפועל עדיין דרך lazy().
   ============================================================ */

// עמודי הרשימה (נקודות נחיתה של כל תחום)
export const importYazamut = () => import('../pages/Yazamut.jsx')
export const importConstructions = () => import('../pages/Constructions.jsx')
export const importSupervision = () => import('../pages/Supervision.jsx')
export const importRealEstateGuide = () => import('../pages/RealEstateGuide.jsx')

// עמודי הכתבה (detail)
export const importYazamutArticle = () => import('../pages/YazamutArticle.jsx')
export const importConstructionsArticle = () => import('../pages/ConstructionsArticle.jsx')
export const importSupervisionArticle = () => import('../pages/SupervisionArticle.jsx')
export const importRealEstateGuideArticle = () => import('../pages/RealEstateGuideArticle.jsx')

// מריץ פעולה בזמן idle (עם נפילה-לאחור ל-setTimeout), ומחזיר פונקציית ניקוי.
export function whenIdle(fn, timeout = 2000) {
  if (typeof window === 'undefined') return () => {}
  const ric = window.requestIdleCallback
  const id = ric ? ric(fn, { timeout }) : setTimeout(fn, 600)
  return () => { if (ric && window.cancelIdleCallback) window.cancelIdleCallback(id); else clearTimeout(id) }
}

// טעינה-מוקדמת של כל עמודי הרשימה של ארבעת התחומים (chunks קטנים)
export function prefetchGuides() {
  importYazamut(); importConstructions(); importSupervision(); importRealEstateGuide()
}
