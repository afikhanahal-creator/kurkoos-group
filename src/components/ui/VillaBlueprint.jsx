import { useLocalized } from '../../i18n/index.jsx'

/* ============================================================
   שרטוט אדריכלי של וילה — חזית (elevation) רחבה ונמוכה: וילה בת 3
   קומות עם גינה פרטית ובריכה. איור SVG וקטורי, ממותג לפי הפאלטה
   (secondary + accent). קליל, נטען מיידית. פרופורציות לרוחב (600×320).
   ============================================================ */
export default function VillaBlueprint({ className = '' }) {
  const L = useLocalized()
  const label = L({ he: 'שרטוט אדריכלי של וילה בת שלוש קומות עם גינה ובריכה', en: 'Architectural blueprint of a three-story villa with garden and pool' })

  // חלון מזוגג עם חלוקה (mullions)
  const Win = ({ x, y, w, h }) => (
    <g>
      <rect className="vb-glass" x={x} y={y} width={w} height={h} />
      <line className="vb-glass-mullion" x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
      <line className="vb-glass-mullion" x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} />
    </g>
  )

  return (
    <svg
      className={`villa-blueprint ${className}`}
      viewBox="0 0 600 320"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="vbGrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" className="vb-grid-dot" />
        </pattern>
      </defs>

      {/* רקע שרטוט עם נקודות */}
      <rect x="0" y="0" width="600" height="320" rx="18" className="vb-bg" />
      <rect x="0" y="0" width="600" height="320" rx="18" fill="url(#vbGrid)" />

      {/* קו קרקע */}
      <line x1="40" y1="262" x2="560" y2="262" className="vb-line" />

      {/* גינה — עצים ושיחים */}
      <g>
        <line x1="300" y1="262" x2="300" y2="242" className="vb-thin" />
        <circle cx="300" cy="224" r="20" className="vb-face vb-line" />
        <line x1="566" y1="262" x2="566" y2="244" className="vb-thin" />
        <circle cx="566" cy="228" r="17" className="vb-face vb-line" />
        <path d="M44 262 q7 -12 14 0 q7 -12 14 0" className="vb-thin" />
      </g>

      {/* ===== הוילה — חזית, 3 קומות ===== */}
      {/* מעקה גג / פרפט */}
      <rect x="62" y="84" width="226" height="12" className="vb-line vb-face" />
      {/* מעטפת */}
      <rect x="70" y="96" width="210" height="166" className="vb-line" />
      {/* קווי הפרדת קומות */}
      <line x1="70" y1="152" x2="280" y2="152" className="vb-line" />
      <line x1="70" y1="207" x2="280" y2="207" className="vb-line" />

      {/* קומה 3 — שלושה חלונות */}
      <Win x={96} y={110} w={42} h={30} />
      <Win x={154} y={110} w={42} h={30} />
      <Win x={212} y={110} w={42} h={30} />

      {/* קומה 2 — דלת-מרפסת מרכזית + שני חלונות */}
      <Win x={96} y={164} w={38} h={36} />
      <Win x={150} y={158} w={54} h={49} />
      <Win x={216} y={164} w={38} h={36} />
      {/* מעקה מרפסת בקדמת קומה 2 */}
      <g>
        <line x1="140" y1="207" x2="214" y2="207" className="vb-thin" />
        <line x1="140" y1="197" x2="214" y2="197" className="vb-thin" />
        {[148, 161, 174, 187, 200].map((x) => (
          <line key={x} x1={x} y1="197" x2={x} y2="207" className="vb-thin" />
        ))}
      </g>

      {/* קומת קרקע — כניסה (אדום מותג) + שני חלונות */}
      <Win x={96} y={224} w={38} h={30} />
      <Win x={216} y={224} w={38} h={30} />
      <rect x="160" y="220" width="34" height="42" className="vb-accent" />
      <line x1="187" y1="242" x2="183" y2="242" className="vb-accent-line" />

      {/* צמתי שרטוט */}
      <circle cx="70" cy="96" r="3" className="vb-dot" />
      <circle cx="280" cy="96" r="3" className="vb-dot" />

      {/* ===== בריכה פרטית (קדמת השטח, ימין) ===== */}
      <g>
        <ellipse cx="442" cy="250" rx="116" ry="19" className="vb-glass" />
        <ellipse cx="442" cy="250" rx="82" ry="13" className="vb-thin" />
        <ellipse cx="442" cy="250" rx="46" ry="8" className="vb-thin" />
        {/* סולם */}
        <line x1="520" y1="234" x2="520" y2="256" className="vb-thin" />
        <line x1="528" y1="234" x2="528" y2="256" className="vb-thin" />
        <line x1="520" y1="242" x2="528" y2="242" className="vb-thin" />
        <line x1="520" y1="250" x2="528" y2="250" className="vb-thin" />
      </g>

      {/* קו מידה — רוחב הבניין + תווית */}
      <line x1="70" y1="262" x2="70" y2="292" className="vb-dash" />
      <line x1="280" y1="262" x2="280" y2="292" className="vb-dash" />
      <line x1="70" y1="288" x2="280" y2="288" className="vb-thin" />
      <line x1="66" y1="284" x2="74" y2="292" className="vb-thin" />
      <line x1="276" y1="284" x2="284" y2="292" className="vb-thin" />
      <text x="175" y="306" textAnchor="middle" className="vb-label">VILLA · 1:100</text>
    </svg>
  )
}
