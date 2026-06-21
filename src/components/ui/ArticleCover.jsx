import './ArticleCover.css'

/* ============================================================
   ArticleCover — כריכת-מערכת מעוצבת לכתבה (במקום צילום סטוק).
   רקע אדריכלי כהה + רשת "תוכנית" + מוטיב גרפי לפי הקטגוריה, בצבעי
   המותג. variant: 'card' (עם תג + מילת-מפתח) | 'hero' (רקע בלבד).
   ============================================================ */

const PAPER = 'rgba(245,242,236,0.9)'
const PAPER_SOFT = 'rgba(245,242,236,0.5)'
const BRASS = '#C9A24B'

const Motif = ({ k }) => {
  const common = { fill: 'none', stroke: PAPER, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (k) {
    case 'urban': // התחדשות עירונית — בניין ישן נמוך → מגדל חדש
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <rect x="26" y="86" width="46" height="50" />
            <path d="M34 96h8M50 96h8M34 110h8M50 110h8M34 124h8M50 124h8" stroke={PAPER_SOFT} />
            <rect x="96" y="30" width="54" height="106" />
            <path d="M106 44h10M128 44h10M106 62h10M128 62h10M106 80h10M128 80h10M106 98h10M128 98h10M106 116h10M128 116h10" stroke={PAPER_SOFT} />
          </g>
          <path d="M84 60l8-8 8 8" fill="none" stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M92 52v40" stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'finance': // מימון ויזמות — עמודות עולות + אחוז
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <rect x="34" y="100" width="22" height="36" />
            <rect x="66" y="78" width="22" height="58" />
            <rect x="98" y="54" width="22" height="82" />
          </g>
          <circle cx="150" cy="52" r="22" fill="none" stroke={BRASS} strokeWidth="3" />
          <path d="M141 61l18-18" stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
          <circle cx="145" cy="47" r="2.6" fill={BRASS} />
          <circle cx="155" cy="57" r="2.6" fill={BRASS} />
        </svg>
      )
    case 'reg': // רגולציה ותכנון — מסמך + חותמת + האצה
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M48 26h54l18 18v80H48z" />
            <path d="M102 26v18h18" />
            <path d="M60 64h48M60 80h48M60 96h30" stroke={PAPER_SOFT} />
          </g>
          <circle cx="138" cy="104" r="18" fill="none" stroke={BRASS} strokeWidth="3" />
          <path d="M130 104l6 6 10-12" fill="none" stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'land': // קרקע ומכרזים — מגרשים + פטיש מכרז
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M30 118l54-22 54 22-54 22z" />
            <path d="M48 111l54 22M66 104l54 22M84 96v44" stroke={PAPER_SOFT} />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <rect x="128" y="36" width="34" height="14" transform="rotate(38 145 43)" />
            <path d="M150 52l18 24" />
          </g>
        </svg>
      )
    case 'crane': // שלבי ביצוע — עגורן צריח
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M44 138V44" />
            <path d="M44 44h92" />
            <path d="M44 58h24" />
            <path d="M44 44l18 14M44 58l18-14" />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M116 44v18" />
            <rect x="109" y="62" width="14" height="9" />
          </g>
        </svg>
      )
    case 'safety': // בטיחות באתר — קסדת מגן
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M52 100a48 44 0 0 1 96 0" />
            <path d="M40 100h120" />
            <path d="M100 56v20" />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M150 40l16 28h-32z" />
            <path d="M150 50v9M150 63v.5" />
          </g>
        </svg>
      )
    case 'defects': // איכות וליקויים — סדק בקיר + זכוכית מגדלת
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <rect x="32" y="30" width="96" height="96" />
            <path d="M74 30l8 22-12 18 14 20-8 36" stroke={BRASS} strokeWidth="3" />
          </g>
          <circle cx="146" cy="106" r="17" fill="none" stroke={BRASS} strokeWidth="3" />
          <path d="M158 118l12 12" stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'materials': // חומרים ושיטות — שורות לבנים
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <rect x="38" y="96" width="42" height="22" />
            <rect x="86" y="96" width="42" height="22" />
            <rect x="38" y="70" width="20" height="22" />
            <rect x="64" y="70" width="42" height="22" />
            <rect x="112" y="70" width="20" height="22" />
          </g>
          <rect x="120" y="42" width="42" height="22" fill="none" stroke={BRASS} strokeWidth="3" />
        </svg>
      )
    case 'schedule': // ניהול אתר — תרשים גאנט
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <path d="M40 34v104M40 138h128" {...common} />
          <g stroke={BRASS} strokeWidth="7" strokeLinecap="round">
            <path d="M56 60h56" />
            <path d="M82 86h70" />
            <path d="M66 112h44" />
          </g>
        </svg>
      )
    case 'checklist': // בקרת איכות — לוח בקרה עם וי
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <rect x="48" y="26" width="80" height="104" rx="4" />
            <rect x="74" y="18" width="28" height="14" rx="3" />
            <path d="M64 56h36M64 78h36M64 100h24" stroke={PAPER_SOFT} />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M58 54l4 4 6 -8" />
            <path d="M58 76l4 4 6 -8" />
            <path d="M58 98l4 4 6 -8" />
          </g>
        </svg>
      )
    case 'oversight': // פיקוח ביצוע — עין מעל מבנה
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <rect x="40" y="92" width="36" height="44" />
            <rect x="84" y="74" width="40" height="62" />
            <path d="M48 104h8M60 104h8M92 88h10M110 88h6M92 108h10M110 108h6" stroke={PAPER_SOFT} />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M118 48c14 0 26 10 32 18 -6 8 -18 18 -32 18 -14 0 -26 -10 -32 -18 6 -8 18 -18 32 -18z" />
            <circle cx="118" cy="66" r="6" />
          </g>
        </svg>
      )
    case 'tag': // מכירה — תווית מחיר
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M40 70l40 -40h40v40l-40 40z" />
            <circle cx="104" cy="46" r="6" />
          </g>
          <path d="M70 96l34 34" stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
          <path d="M150 70h18M150 84h18M150 98h12" stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'key': // רכישה — מפתח ובית
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M40 120V72l30 -24 30 24v48z" />
            <path d="M62 120v-22h16v22" />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="140" cy="58" r="12" />
            <path d="M150 66l22 22M164 80l8 -8M158 74l8 -8" />
          </g>
        </svg>
      )
    case 'rent': // השכרה — בית עם חץ מחזורי
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M52 124V80l34 -26 34 26v44z" />
            <rect x="74" y="98" width="24" height="26" />
          </g>
          <g stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M138 64a22 22 0 1 1 -6 -15" />
            <path d="M132 38v12h-12" />
          </g>
        </svg>
      )
    case 'deal': // משא ומתן — מאזניים
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M100 36v92M70 128h60M58 56h84" />
            <path d="M58 56l-16 30h32zM142 56l-16 30h32z" />
          </g>
          <circle cx="100" cy="40" r="5" fill={BRASS} stroke="none" />
        </svg>
      )
    case 'trends': // מגמות שוק — גרף עולה
    default:
      return (
        <svg viewBox="0 0 200 150" className="acover__svg" aria-hidden="true">
          <g {...common}>
            <path d="M30 132V30M30 132h140" stroke={PAPER_SOFT} />
          </g>
          <polyline points="40,118 74,92 100,104 132,60 168,40" fill="none" stroke={BRASS} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          {[[40, 118], [74, 92], [100, 104], [132, 60], [168, 40]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.4" fill={BRASS} />
          ))}
          <path d="M150 40h18v18" fill="none" stroke={BRASS} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

const CAT = {
  // יזמות נדל"ן
  'התחדשות עירונית': { k: 'urban', kw: 'התחדשות' },
  'מימון ויזמות': { k: 'finance', kw: 'מימון' },
  'רגולציה ותכנון': { k: 'reg', kw: 'רגולציה' },
  'קרקע ומכרזים': { k: 'land', kw: 'קרקע' },
  'מגמות שוק': { k: 'trends', kw: 'מגמות' },
  // ביצוע ובנייה
  'שלבי ביצוע': { k: 'crane', kw: 'ביצוע' },
  'בטיחות באתר': { k: 'safety', kw: 'בטיחות' },
  'איכות וליקויים': { k: 'defects', kw: 'איכות' },
  'בירוקרטיה ורישוי': { k: 'reg', kw: 'רישוי' },
  'ניהול אתר': { k: 'schedule', kw: 'ניהול' },
  'חומרים ושיטות': { k: 'materials', kw: 'חומרים' },
  // פיקוח פרויקטים
  'פיקוח ביצוע': { k: 'oversight', kw: 'פיקוח' },
  'בקרת איכות': { k: 'checklist', kw: 'בקרה' },
  'ליקויים ובדק': { k: 'defects', kw: 'בדק' },
  'ניהול תקציב וסיכונים': { k: 'finance', kw: 'תקציב' },
  'לוחות זמנים': { k: 'schedule', kw: 'זמנים' },
  'מסירה וטופס 4': { k: 'reg', kw: 'מסירה' },
  // תיווך ועסקאות
  'מכירה': { k: 'tag', kw: 'מכירה' },
  'רכישה': { k: 'key', kw: 'רכישה' },
  'השכרה': { k: 'rent', kw: 'השכרה' },
  'השקעות': { k: 'finance', kw: 'השקעה' },
  'משא ומתן': { k: 'deal', kw: 'מו״מ' },
  'רגולציה ומיסוי': { k: 'reg', kw: 'רגולציה' },
}

export default function ArticleCover({ article, variant = 'card' }) {
  const meta = CAT[article?.category] || { k: 'trends', kw: 'נדל״ן' }
  return (
    <div className={`acover acover--${variant} acover--${meta.k}`} role="img" aria-label={article?.coverAlt || article?.title || 'כתבה'}>
      <span className="acover__grid" aria-hidden="true" />
      <span className="acover__motif" aria-hidden="true"><Motif k={meta.k} /></span>
      {variant === 'card' && (
        <div className="acover__fg">
          {article?.category && <span className="acover__cat">{article.category}</span>}
          <span className="acover__kw" aria-hidden="true">{meta.kw}</span>
          <span className="acover__brand">טור יזמות נדל״ן · קורקוס</span>
        </div>
      )}
    </div>
  )
}
