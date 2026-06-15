/* ============================================================
   גלריית עמוד "ביצוע" — תמונות לגלריה הנפתחת (ExpandableGallery).
   התמונות נמצאות ב-public/execution-gallery/ בשמות ASCII: 1.jpg, 2.jpg …
   (שמות באנגלית ללא רווחים — נטענים בצורה אמינה מ-Vercel).
   מוגדרות 10 משבצות; הגלריה חכמה ומדלגת אוטומטית על תמונות שלא הועלו —
   כך שתעלה עוד תמונות (6.jpg … 10.jpg) והן יופיעו לבד.
   ============================================================ */
export const executionGallery = Array.from(
  { length: 10 },
  (_, i) => `/execution-gallery/${i + 1}.jpg`
)

export default executionGallery
