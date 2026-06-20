import './HeroVilla.css'

/* ============================================================
   HeroVilla — שרטוט וקטורי (SVG) של וילה בת 3 קומות עם גינה ובריכה
   פרטית, בסגנון תוכנית אדריכלית (blueprint) בצבעי המותג. מחליף את
   אפקט ה-WebGL (קוביית-התיל) שהיה ב-Hero. קל-משקל, ללא תלות בספריות,
   וחד בכל רזולוציה (vector-effect=non-scaling-stroke דרך ה-CSS).
   ============================================================ */
export default function HeroVilla() {
  return (
    <svg
      className="hero-villa"
      viewBox="0 0 440 440"
      role="img"
      aria-label="שרטוט אדריכלי של וילה בת שלוש קומות עם גינה ובריכה פרטית"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* רשת עזר עדינה (נייר שרטוט) */}
      <g className="hv-grid">
        {[60, 110, 160, 210, 260, 310, 360].map((x) => (
          <line key={`v${x}`} x1={x} y1="28" x2={x} y2="372" />
        ))}
        {[70, 120, 170, 220, 270, 320].map((y) => (
          <line key={`h${y}`} x1="40" y1={y} x2="400" y2={y} />
        ))}
      </g>

      {/* שמש בלופרינט */}
      <g className="hv-sun">
        <circle cx="368" cy="74" r="20" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180
          return (
            <line
              key={a}
              x1={368 + Math.cos(r) * 26}
              y1={74 + Math.sin(r) * 26}
              x2={368 + Math.cos(r) * 33}
              y2={74 + Math.sin(r) * 33}
            />
          )
        })}
      </g>

      {/* קו קרקע */}
      <line className="hv-ground" x1="28" y1="318" x2="412" y2="318" />

      {/* גינה — עצים ושיחים */}
      <g className="hv-garden">
        <line x1="74" y1="318" x2="74" y2="286" />
        <circle cx="74" cy="266" r="24" />
        <circle cx="60" cy="276" r="15" />
        <circle cx="90" cy="276" r="15" />

        <line x1="372" y1="318" x2="372" y2="290" />
        <circle cx="372" cy="270" r="21" />
        <circle cx="360" cy="280" r="13" />
        <circle cx="386" cy="280" r="13" />

        <path d="M112 318 q8 -14 16 0 q8 -14 16 0" />
        <path d="M300 318 q8 -14 16 0 q8 -14 16 0" />
      </g>

      {/* ===== הוילה — 3 קומות ===== */}
      <g className="hv-house">
        {/* מעקה גג (טרסה) */}
        <line x1="126" y1="58" x2="314" y2="58" />
        {[134, 152, 170, 188, 206, 224, 242, 260, 278, 296].map((x) => (
          <line key={`r${x}`} x1={x} y1="58" x2={x} y2="72" />
        ))}

        {/* מעטפת הבניין + הפרדת קומות */}
        <rect x="128" y="72" width="184" height="246" />
        <line x1="128" y1="154" x2="312" y2="154" />
        <line x1="128" y1="236" x2="312" y2="236" />

        {/* קומה 3 — שלושה חלונות */}
        <g className="hv-win">
          <rect x="146" y="92" width="38" height="44" />
          <rect x="201" y="92" width="38" height="44" />
          <rect x="256" y="92" width="38" height="44" />
        </g>

        {/* קומה 2 — דלת-מרפסת מרכזית + חלונות */}
        <g className="hv-win">
          <rect x="150" y="176" width="34" height="44" />
          <rect x="256" y="176" width="34" height="44" />
          <rect x="196" y="170" width="48" height="50" />
        </g>
        {/* מעקה מרפסת בקדמת קומה 2 */}
        <g className="hv-rail">
          <line x1="186" y1="236" x2="254" y2="236" />
          <line x1="186" y1="222" x2="254" y2="222" />
          {[194, 206, 218, 230, 242].map((x) => (
            <line key={`b${x}`} x1={x} y1="222" x2={x} y2="236" />
          ))}
        </g>

        {/* קומת קרקע — כניסה מרכזית + חלונות */}
        <g className="hv-win">
          <rect x="146" y="258" width="38" height="48" />
          <rect x="256" y="258" width="38" height="48" />
        </g>
        <path className="hv-door" d="M196 318 v-44 a24 24 0 0 1 48 0 v44" />
        <line x1="220" y1="250" x2="220" y2="318" />
      </g>

      {/* ===== בריכה פרטית ===== */}
      <g className="hv-pool">
        <ellipse cx="210" cy="350" rx="150" ry="26" />
        <ellipse className="hv-ripple" cx="210" cy="350" rx="112" ry="18" />
        <ellipse className="hv-ripple" cx="210" cy="350" rx="72" ry="11" />
        {/* סולם */}
        <line x1="330" y1="332" x2="330" y2="362" />
        <line x1="340" y1="332" x2="340" y2="362" />
        <line x1="330" y1="342" x2="340" y2="342" />
        <line x1="330" y1="352" x2="340" y2="352" />
      </g>

      {/* קו מידה אנכי (3 קומות) */}
      <g className="hv-dim">
        <line x1="104" y1="72" x2="104" y2="318" />
        {[72, 154, 236, 318].map((y) => (
          <line key={`t${y}`} x1="99" y1={y} x2="109" y2={y} />
        ))}
        <path d="M100 78 l4 -6 l4 6" />
        <path d="M100 312 l4 6 l4 -6" />
      </g>

      {/* בלוק-כותרת בסגנון שרטוט (מותג) */}
      <g className="hv-title">
        <rect x="262" y="392" width="150" height="34" />
        <line x1="262" y1="409" x2="412" y2="409" />
        <text x="270" y="404" className="hv-brand">KURKOOS GROUP</text>
        <text x="270" y="421" className="hv-scale">VILLA · M 1:100</text>
      </g>
    </svg>
  )
}
