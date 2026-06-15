/* ============================================================
   גלריית עמוד "ביצוע" — תמונות לגלריה הנפתחת (ExpandableGallery).
   התמונות נמצאות ב-public/execution-gallery/ בשם "ביצוע N.jpg".
   מוגדרות 10 משבצות (ביצוע 1..10); הגלריה חכמה ומדלגת אוטומטית על
   תמונות שעדיין לא הועלו — כך שתעלה עוד תמונות (6–10) והן יופיעו לבד.
   ============================================================ */
export const executionGallery = Array.from(
  { length: 10 },
  (_, i) => `/execution-gallery/${encodeURIComponent(`ביצוע ${i + 1}.jpg`)}`
)

export default executionGallery
