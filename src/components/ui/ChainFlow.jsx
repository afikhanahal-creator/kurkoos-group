import { useI18n, useLocalized } from '../../i18n/index.jsx'
import './ChainFlow.css'

/* ============================================================
   ChainFlow — איור שרשרת-הערך כ-SVG וקטורי מונפש.
   • וקטורי → חד אינסופית בכל גודל (ללא תלות ברזולוציה).
   • אנימציה: גל-אור עובר לאורך החוליות מימין לשמאל (shine
     transfer, loop-by-loop), והאלמנטים האדומים + הפלטפורמות
     "נושמים" ברצף — כל שלב מעביר את התנועה לבא אחריו.
   • שליטה מלאה בטקסט (כאן, לא צרוב בתמונה). לופ מושלם.
   • מכבד prefers-reduced-motion (האנימציה נעצרת, האיור נשאר).
   ============================================================ */

const NAVY = '#163a4e'
const RED = '#a90b0c'

// 6 שלבים מימין (התחלה) לשמאל (סיום) — סדר RTL כמו באיור המקורי
const STEPS = [
  { x: 1050, icon: 'search',    he: 'איתור והערכת\nקרקע',  en: 'Land sourcing' },
  { x: 866,  icon: 'plan',      he: 'תכנון\nואדריכלות',    en: 'Planning' },
  { x: 682,  icon: 'permit',    he: 'רישוי\nוהיתרים',      en: 'Permits' },
  { x: 498,  icon: 'build',     he: 'ביצוע\nובנייה',       en: 'Construction' },
  { x: 314,  icon: 'sell',      he: 'שיווק\nומכירות',      en: 'Marketing' },
  { x: 130,  icon: 'handover',  he: 'מסירה\nושירות',       en: 'Handover' },
]
const CY = 330               // מרכז הפלטפורמה (גובה)
const TOP_W = 56, TOP_H = 31, DEPTH = 16

// פלטפורמה איזומטרית (מעוין עליון + שתי פאות עומק)
function Platform({ x }) {
  const top = `M${x} ${CY - TOP_H} L${x + TOP_W} ${CY} L${x} ${CY + TOP_H} L${x - TOP_W} ${CY} Z`
  const left = `M${x - TOP_W} ${CY} L${x} ${CY + TOP_H} L${x} ${CY + TOP_H + DEPTH} L${x - TOP_W} ${CY + DEPTH} Z`
  const right = `M${x} ${CY + TOP_H} L${x + TOP_W} ${CY} L${x + TOP_W} ${CY + DEPTH} L${x} ${CY + TOP_H + DEPTH} Z`
  return (
    <g className="cf-plat">
      <path d={left} fill="#dfe6ea" stroke={NAVY} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={right} fill="#cdd8de" stroke={NAVY} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={top} fill="#f4f7f8" stroke={NAVY} strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  )
}

// אייקונים וקטוריים פשוטים (ממורכזים ב-0,0), עם הדגשות אדומות
function Icon({ name }) {
  const s = { fill: 'none', stroke: NAVY, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'search':
      return (<g {...s}><circle cx="-5" cy="-5" r="13" /><line x1="5" y1="5" x2="15" y2="15" /><circle cx="-5" cy="-5" r="5" stroke={RED} className="cf-red" /></g>)
    case 'plan':
      return (<g {...s}><rect x="-17" y="-13" width="30" height="26" rx="2" /><path d="M-17 -3 H13 M-7 -13 V13" /><path d="M6 14 L18 2 L22 6 L10 18 Z" stroke={RED} className="cf-red" /></g>)
    case 'permit':
      return (<g {...s}><rect x="-13" y="-15" width="26" height="32" rx="2" /><rect x="-6" y="-19" width="12" height="7" rx="2" stroke={RED} className="cf-red" /><path d="M-7 -3 l3 3 l6 -7 M-7 7 l3 3 l6 -7" /></g>)
    case 'build':
      return (<g {...s}><path d="M-12 18 V-16 L16 -16" /><path d="M-12 -10 L6 2" /><line x1="6" y1="-16" x2="6" y2="-6" /><path d="M2 -6 h8 v5 h-8 z" stroke={RED} className="cf-red" /></g>)
    case 'sell':
      return (<g {...s}><circle cx="0" cy="-6" r="11" /><path d="M-4 4 L-8 18 L0 13 L8 18 L4 4" stroke={RED} className="cf-red" /><path d="M-4 -6 l3 3 l6 -7" /></g>)
    case 'handover':
      return (<g {...s}><path d="M-14 2 L-2 -10 L10 2 V16 H-14 Z" /><rect x="-6" y="4" width="8" height="12" stroke={RED} className="cf-red" /><circle cx="13" cy="-7" r="4" stroke={RED} className="cf-red" /><path d="M10 -4 L2 4" stroke={RED} className="cf-red" /></g>)
    default: return null
  }
}

// חוליית שרשרת בודדת (אובל) — עם עותק "ברק" שמהבהב ברצף
function ChainLink({ cx, i }) {
  return (
    <g className="cf-link" style={{ '--i': i }}>
      <ellipse cx={cx} cy={CY + 8} rx="13" ry="8" fill="none" stroke={NAVY} strokeWidth="3.2" />
      <ellipse cx={cx} cy={CY + 8} rx="13" ry="8" fill="none" stroke="#fff" strokeWidth="3.2" className="cf-link__glow" />
    </g>
  )
}

export default function ChainFlow() {
  const { t } = useI18n()
  const L = useLocalized()
  // חוליות בין כל שני שלבים סמוכים (2 חוליות לכל קטע)
  const links = []
  for (let i = 0; i < STEPS.length - 1; i++) {
    const mid = (STEPS[i].x + STEPS[i + 1].x) / 2
    links.push({ cx: mid - 14, i: i * 2 }, { cx: mid + 14, i: i * 2 + 1 })
  }

  return (
    <figure className="chainflow" aria-label={t('valueChain.title')}>
      <svg className="cf-svg" viewBox="0 0 1180 470" role="img" preserveAspectRatio="xMidYMid meet">
        <title>{t('valueChain.title')}</title>
        <defs>
          <pattern id="cf-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="#cfd8dd" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="1180" height="470" fill="url(#cf-dots)" opacity="0.5" />

        {/* קו חזרה מקווקו בתחתית (לולאה) */}
        <path d="M1050 392 H130" fill="none" stroke="#9fb0b8" strokeWidth="1.6" strokeDasharray="2 7" strokeLinecap="round" />
        <text x="590" y="430" textAnchor="middle" className="cf-caption">{t('valueChain.title')}</text>
        <rect x="556" y="438" width="68" height="3" rx="1.5" fill={RED} />

        {/* חוליות השרשרת */}
        {links.map((l, k) => <ChainLink key={k} cx={l.cx} i={l.i} />)}

        {/* שלבים: פלטפורמה + אייקון + תווית + קו אדום */}
        {STEPS.map((step, i) => (
          <g key={i} className="cf-node" style={{ '--i': i }}>
            <line x1={step.x} y1="150" x2={step.x} y2={CY - TOP_H} stroke="#9fb0b8" strokeWidth="1.4" strokeDasharray="2 6" />
            {L({ he: step.he, en: step.en }).split('\n').map((ln, j) => (
              <text key={j} x={step.x} y={108 + j * 22} textAnchor="middle" className="cf-label">{ln}</text>
            ))}
            <rect className="cf-rule" x={step.x - 17} y="124" width="34" height="3" rx="1.5" fill={RED} />
            <Platform x={step.x} />
            <g transform={`translate(${step.x}, ${CY - 8}) scale(0.92)`}><Icon name={step.icon} /></g>
          </g>
        ))}
      </svg>
    </figure>
  )
}
