/* ============================================================
   SaveIndicator — אינדיקטור מצב שמירה: שומר… / נשמר ✓ / שגיאה.
   מתלבש על useAutosave (status).
   ============================================================ */
const MAP = {
  idle: null,
  saving: { text: 'שומר…', cls: 'svi--saving', spin: true, icon: <path d="M21 12a9 9 0 1 1-6.2-8.5" /> },
  saved: { text: 'נשמר', cls: 'svi--saved', icon: <path d="M20 6L9 17l-5-5" /> },
  error: { text: 'השמירה נכשלה — נסו שוב', cls: 'svi--error', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v0" /></> },
}

export default function SaveIndicator({ status }) {
  const cfg = MAP[status]
  if (!cfg) return null
  return (
    <span className={`svi ${cfg.cls}`}>
      <svg className={`svi__ic ${cfg.spin ? 'svi__ic--spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{cfg.icon}</svg>
      {cfg.text}
    </span>
  )
}
