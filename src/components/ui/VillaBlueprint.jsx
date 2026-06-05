import { useLocalized } from '../../i18n/index.jsx'

/* ============================================================
   הדמיית תלת-מימד / שרטוט אדריכלי של וילה — איור SVG וקטורי,
   ממותג לפי הפאלטה (secondary + accent). קליל, נטען מיידית,
   ומדגיש את הרעיון "מהחלום ועד המפתח".
   ============================================================ */
export default function VillaBlueprint({ className = '' }) {
  const L = useLocalized()
  const label = L({ he: 'שרטוט אדריכלי תלת-מימדי של וילה', en: 'Architectural 3D blueprint of a villa' })

  return (
    <svg
      className={`villa-blueprint ${className}`}
      viewBox="0 0 520 380"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="vbGrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" className="vb-grid-dot" />
        </pattern>
      </defs>

      {/* רקע כחול-שרטוט עם נקודות */}
      <rect x="0" y="0" width="520" height="380" rx="18" className="vb-bg" />
      <rect x="0" y="0" width="520" height="380" rx="18" fill="url(#vbGrid)" />

      {/* קו קרקע */}
      <line x1="64" y1="320" x2="456" y2="320" className="vb-thin" />

      {/* גג — לוח דק עם זיז */}
      <polygon points="138,152 342,152 396,122 192,122" className="vb-face vb-line" />
      <polygon points="138,152 342,152 342,160 138,160" className="vb-face vb-line" />
      <polygon points="342,152 396,122 396,130 342,160" className="vb-face vb-line" />

      {/* מסה ראשית — שלוש פאות אקסונומטריות */}
      <polygon points="150,160 330,160 330,320 150,320" className="vb-face vb-line" />
      <polygon points="150,160 330,160 384,130 204,130" className="vb-face vb-line" />
      <polygon points="330,160 384,130 384,290 330,320" className="vb-face vb-line" />

      {/* זיגוג חזית — שתי קומות */}
      <rect x="168" y="178" width="144" height="124" className="vb-glass" />
      <line x1="168" y1="240" x2="312" y2="240" className="vb-glass-mullion" />
      <line x1="216" y1="178" x2="216" y2="302" className="vb-glass-mullion" />
      <line x1="264" y1="178" x2="264" y2="302" className="vb-glass-mullion" />

      {/* זיגוג בפאת הצד */}
      <polygon points="340,162 376,142 376,278 340,300" className="vb-glass" />
      <line x1="358" y1="152" x2="358" y2="289" className="vb-glass-mullion" />
      <line x1="340" y1="231" x2="376" y2="210" className="vb-glass-mullion" />

      {/* כניסה — מודגשת באדום הפאלטה */}
      <rect x="226" y="262" width="34" height="58" className="vb-accent" />
      <line x1="252" y1="288" x2="256" y2="288" className="vb-accent-line" />

      {/* עץ / נוף */}
      <line x1="432" y1="320" x2="432" y2="298" className="vb-thin" />
      <circle cx="432" cy="287" r="15" className="vb-face vb-line" />

      {/* קווי מידה (Blueprint) */}
      <line x1="138" y1="152" x2="138" y2="350" className="vb-dash" />
      <line x1="396" y1="122" x2="396" y2="350" className="vb-dash" />
      <line x1="138" y1="348" x2="396" y2="348" className="vb-thin" />
      <line x1="134" y1="344" x2="142" y2="352" className="vb-thin" />
      <line x1="392" y1="344" x2="400" y2="352" className="vb-thin" />

      {/* צמתי שרטוט */}
      <circle cx="150" cy="160" r="3" className="vb-dot" />
      <circle cx="330" cy="160" r="3" className="vb-dot" />
      <circle cx="396" cy="122" r="3" className="vb-dot" />

      {/* תווית */}
      <text x="267" y="340" textAnchor="middle" className="vb-label">VILLA · 1:100</text>
    </svg>
  )
}
