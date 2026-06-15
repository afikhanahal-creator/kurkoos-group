import { useMemo, useState } from 'react'
import './LogoCarousel.css'

// ערבוב Fisher-Yates — מחזיר עותק מעורבב
const shuffleArr = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/* ============================================================
   LogoCarousel — סרט לוגואים רץ בלולאה אינסופית (marquee).
   מציג את *כל* הלוגואים, כולם בדיוק באותו גודל (תיבה אחידה +
   object-fit: contain), וזורם ברצף חלק. עוצר בריחוף.
   logos: [{ id, name, image_url }]
   ============================================================ */
const srcOf = (l) => l.image_url || l.logo || l.image || l.url
export default function LogoCarousel({ logos = [], shuffle = false }) {
  // תמונות שנכשלו בטעינה (404) — מדלגים עליהן כך שאין "חורים" ולא תיבות חתוכות
  const [failed, setFailed] = useState(() => new Set())
  const onErr = (src) => setFailed((f) => { if (f.has(src)) return f; const n = new Set(f); n.add(src); return n })

  // מסננים לוגואים ריקים לגמרי (בלי תמונה ובלי שם) או כאלה שתמונתם נכשלה
  const clean = useMemo(
    () => (logos || []).filter((l) => { const s = srcOf(l); return (s && !failed.has(s)) || (!s && l.name) }),
    [logos, failed]
  )
  const list = useMemo(() => (shuffle ? shuffleArr(clean) : clean), [clean, shuffle])
  if (!list.length) return null

  // "יחידה" שחוזרת מספיק פעמים כדי למלא גם מסך רחב (לא ריק / לא חתוך),
  // ואז משכפלים אותה פעמיים → לולאה אינסופית חלקה (translateX -50%).
  const MIN_ITEMS = 18
  const repeat = Math.max(2, Math.ceil(MIN_ITEMS / list.length))
  const unit = Array.from({ length: repeat }, () => list).flat()
  const track = [...unit, ...unit]
  // משך מחזור פרופורציונלי לאורך היחידה → מהירות אחידה ונעימה בכל כמות
  const duration = Math.max(24, unit.length * 2.6)

  return (
    <div className="logo-marquee" role="list" aria-label="שותפים ולקוחות">
      <div className="logo-marquee__track" style={{ '--marquee-duration': `${duration}s` }}>
        {track.map((logo, i) => {
          const src = srcOf(logo)
          return (
            <div
              className="logo-marquee__item"
              key={`${logo.id ?? logo.name ?? 'logo'}-${i}`}
              role="listitem"
              aria-hidden={i >= list.length ? 'true' : undefined}
            >
              {src
                ? <img className="logo-marquee__img" src={src} alt={logo.name || ''} loading="lazy" onError={() => onErr(src)} />
                : <span className="logo-marquee__name">{logo.name}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
