/* ============================================================
   האם לעצור תנועה אוטומטית (קרוסלות, החלפת שקופיות, מרקיז, רקעים נעים):
   - המשתמש ביקש פחות תנועה במערכת ההפעלה (prefers-reduced-motion), או
   - הפעיל "עצירת אנימציות" בתפריט הנגישות (html.a11y-no-motion).
   נבדק בכל "תקתוק" של טיימר או פריים, כך שהעצירה חלה מיד גם על תנועה שכבר רצה.
   ה-MediaQueryList נשמר פעם אחת, כי הבדיקה רצה גם בכל פריים.
   ============================================================ */
let mql = null

export function motionStopped() {
  if (typeof window === 'undefined') return false
  if (document.documentElement.classList.contains('a11y-no-motion')) return true
  if (!mql && window.matchMedia) mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  return !!mql?.matches
}
