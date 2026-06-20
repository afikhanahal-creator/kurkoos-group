import { useLocalized } from '../../i18n/index.jsx'

/* ============================================================
   שרטוט אדריכלי של וילה — חזית רחבה ונמוכה: וילה בת 3 קומות עם גג
   משופע, מרפסות, כניסת פורטיקו, חצר פרטית (דשא, שביל, גדר-חיה),
   עצים משני הצדדים ובריכה. איור SVG וקטורי ממותג. viewBox 620×340.
   ============================================================ */
export default function VillaBlueprint({ className = '' }) {
  const L = useLocalized()
  const label = L({
    he: 'שרטוט אדריכלי של וילה בת שלוש קומות עם חצר, גינה ובריכה',
    en: 'Architectural blueprint of a three-story villa with a yard, garden and pool',
  })

  // חלון מזוגג עם חלוקה + אדן
  const Win = ({ x, y, w, h }) => (
    <g>
      <rect className="vb-glass" x={x} y={y} width={w} height={h} />
      <line className="vb-glass-mullion" x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
      <line className="vb-glass-mullion" x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} />
      <line className="vb-thin" x1={x - 3} y1={y + h} x2={x + w + 3} y2={y + h} />
    </g>
  )

  // עץ — גזע + צמרת מרובדת
  const Tree = ({ x, cy, r }) => (
    <g>
      <line className="vb-thin" x1={x} y1="272" x2={x} y2={cy + r * 0.5} />
      <circle className="vb-face vb-line" cx={x} cy={cy} r={r} />
      <circle className="vb-face vb-line" cx={x - r * 0.62} cy={cy + r * 0.45} r={r * 0.6} />
      <circle className="vb-face vb-line" cx={x + r * 0.62} cy={cy + r * 0.45} r={r * 0.6} />
    </g>
  )

  // גדר-חיה משוננת
  const hedge = (x0, x1, y, w = 16) => {
    let d = `M${x0} ${y}`
    for (let x = x0; x < x1; x += w) d += ` q${w / 2} -11 ${w} 0`
    return d
  }

  return (
    <svg
      className={`villa-blueprint ${className}`}
      viewBox="0 0 620 340"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="vbGrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" className="vb-grid-dot" />
        </pattern>
      </defs>

      {/* רקע שרטוט */}
      <rect x="0" y="0" width="620" height="340" rx="18" className="vb-bg" />
      <rect x="0" y="0" width="620" height="340" rx="18" fill="url(#vbGrid)" />

      {/* ===== חצר ===== */}
      {/* קו קרקע */}
      <line x1="30" y1="272" x2="592" y2="272" className="vb-line" />
      {/* גדר-חיה משני צדי החצר */}
      <path d={hedge(34, 146, 272)} className="vb-thin" />
      <path d={hedge(566, 590, 272)} className="vb-thin" />
      {/* פקעי דשא */}
      {[60, 132, 360, 560].map((x) => (
        <path key={x} d={`M${x} 272 l-3 -7 M${x} 272 l3 -7 M${x + 5} 272 l3 -7`} className="vb-thin" />
      ))}

      {/* עצים — שני הצדדים */}
      <Tree x={70} cy={224} r={23} />
      <Tree x={116} cy={236} r={15} />
      <Tree x={576} cy={228} r={21} />
      <Tree x={604} cy={240} r={13} />

      {/* ===== הוילה — 3 קומות עם גג משופע ===== */}
      {/* גג היפ (טרפז) */}
      <polygon points="138,96 206,64 304,64 372,96" className="vb-face vb-line" />
      <line x1="138" y1="96" x2="372" y2="96" className="vb-line" />

      {/* מעטפת + הפרדת קומות */}
      <rect x="152" y="96" width="206" height="176" className="vb-line" />
      <line x1="152" y1="155" x2="358" y2="155" className="vb-line" />
      <line x1="152" y1="214" x2="358" y2="214" className="vb-line" />

      {/* קומה 3 — שלושה חלונות */}
      <Win x={177} y={112} w={40} h={30} />
      <Win x={235} y={112} w={40} h={30} />
      <Win x={293} y={112} w={40} h={30} />

      {/* קומה 2 — דלת-מרפסת מרכזית + שני חלונות + מעקה */}
      <Win x={177} y={167} w={38} h={38} />
      <Win x={228} y={161} w={54} h={44} />
      <Win x={295} y={167} w={38} h={38} />
      <g>
        <line x1="216" y1="214" x2="294" y2="214" className="vb-thin" />
        <line x1="216" y1="205" x2="294" y2="205" className="vb-thin" />
        {[224, 237, 250, 263, 276, 289].map((x) => (
          <line key={x} x1={x} y1="205" x2={x} y2="214" className="vb-thin" />
        ))}
      </g>

      {/* קומת קרקע — חלונות + כניסת פורטיקו */}
      <Win x={177} y={234} w={38} h={30} />
      <Win x={295} y={234} w={38} h={30} />
      {/* גג הפורטיקו + עמודים + מדרגות */}
      <rect x="222" y="224" width="66" height="7" className="vb-line vb-face" />
      <line x1="227" y1="231" x2="227" y2="272" className="vb-thin" />
      <line x1="283" y1="231" x2="283" y2="272" className="vb-thin" />
      <line x1="232" y1="268" x2="278" y2="268" className="vb-thin" />
      {/* דלת כניסה (אדום מותג) */}
      <rect x="238" y="234" width="34" height="38" className="vb-accent" />
      <line x1="265" y1="253" x2="261" y2="253" className="vb-accent-line" />

      {/* שביל מהכניסה אל החצר */}
      <path d="M240 272 L272 272 L286 300 L226 300 Z" className="vb-thin" />
      <line x1="234" y1="286" x2="278" y2="286" className="vb-thin" />

      {/* צמתי שרטוט */}
      <circle cx="152" cy="96" r="3" className="vb-dot" />
      <circle cx="358" cy="96" r="3" className="vb-dot" />

      {/* ===== בריכה פרטית ===== */}
      <g>
        <ellipse cx="455" cy="256" rx="96" ry="17" className="vb-water" />
        <ellipse cx="455" cy="256" rx="66" ry="11" className="vb-thin" />
        <ellipse cx="455" cy="256" rx="36" ry="6" className="vb-thin" />
        {/* קרש קפיצה */}
        <line x1="361" y1="248" x2="384" y2="248" className="vb-thin" />
        <line x1="382" y1="248" x2="382" y2="258" className="vb-thin" />
        {/* סולם */}
        <line x1="536" y1="242" x2="536" y2="262" className="vb-thin" />
        <line x1="544" y1="242" x2="544" y2="262" className="vb-thin" />
        <line x1="536" y1="248" x2="544" y2="248" className="vb-thin" />
        <line x1="536" y1="255" x2="544" y2="255" className="vb-thin" />
      </g>

      {/* קו מידה — רוחב הבניין + תווית */}
      <line x1="152" y1="272" x2="152" y2="300" className="vb-dash" />
      <line x1="358" y1="272" x2="358" y2="300" className="vb-dash" />
      <line x1="152" y1="296" x2="358" y2="296" className="vb-thin" />
      <line x1="148" y1="292" x2="156" y2="300" className="vb-thin" />
      <line x1="354" y1="292" x2="362" y2="300" className="vb-thin" />
      <text x="255" y="314" textAnchor="middle" className="vb-label">VILLA · 1:100</text>
    </svg>
  )
}
