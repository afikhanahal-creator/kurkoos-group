import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MagicBento from '../ui/MagicBento.jsx'
import './AnimatedBackgroundShowcase.css'

/* ============================================================
   AnimatedBackgroundShowcase: כרטיס כהה עם שתי שורות של מסכי וידאו
   שזזות לאט לכיוונים מנוגדים, בזווית תלת ממדית עדינה, ונמוגות לתוך
   הילה בצבעי המותג. מעל הרקע: תגית, כותרת, פסקה, שורת הדגשה וכפתור.

   props:
     items      [{ src, poster, label, type? }]  וידאו (mp4/webm) או תמונה
     badge      תגית צבעונית ("מהשטח")       badgeWord  מילה לבנה ליד התגית
     title      כותרת      text  פסקה      bold  סוף הפסקה בהדגשה
     note       שורת הדגשה עם אייקון
     cta        { label, to }  כפתור ראשי (to פנימי = Link, חיצוני = a)
     intensity  'subtle' | 'balanced' | 'expressive'  מהירות, זווית ועומק
     height     גובה הכרטיס במחשב (px). בלי ערך: לפי רוחב המסך (540 עד 700)
     wide       במחשב הכרטיס יוצא מעמודת התוכן ונפרש כמעט על כל רוחב המסך
   מעבר עכבר (מחשב בלבד): כל מסך מקבל זוהר אדום שעוקב אחרי הסמן ומסגרת
   אדומה, שנמוגים לאט כשהסמן ממשיך הלאה, כך שתנועה מימין לשמאל משאירה
   שובל של מסכים מוארים.
     layout     'marquee' שתי שורות מסכים נעים | 'bento' רשת MagicBento עם אור שעוקב אחרי העכבר
   הרקע לא תופס לחיצות: pointer-events כבוי ו-aria-hidden, כך שרק
   התוכן שמעליו נגיש למקלדת ולקורא מסך.
   ============================================================ */

const INTENSITY = {
  subtle: { sec: 14, tilt: 9 },
  balanced: { sec: 11, tilt: 14 },
  expressive: { sec: 8, tilt: 20 },
}
/* יחס רוחב לגובה של המסכים, מתחלף כדי שהשורה לא תיראה כמו רשת אחידה */
const ASPECTS = [1.62, 1.28, 1.5, 1.12]

/* הזוהר האדום עוקב אחרי הסמן בתוך המסך: המיקום נכתב ישר ל-style, בלי רינדור של React */
function glowAt(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}
const isVideo = (it) => it.type === 'video' || (!it.type && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(it.src || ''))

/* רשת הבאנטו: מחשב 4 עמודות על 2 שורות (גדול, שניים קטנים, רחב), במסך צר 2 על 2 */
const BENTO_WIDE = [{ colSpan: 2, rowSpan: 2 }, {}, {}, { colSpan: 2 }]
const BENTO_SLOTS = 4
function useNarrow(query = '(max-width: 960px)') {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [query])
  return narrow
}

/* כל שורה צריכה מספיק מסכים כדי למלא את הרוחב; אחר כך משכפלים פעם אחת
   ומזיזים בחצי מהאורך, כך שהלולאה חוזרת בדיוק לנקודת ההתחלה בלי קפיצה */
function fillRow(list, min) {
  if (!list.length) return []
  const out = []
  while (out.length < min) out.push(...list)
  return out
}

function Tile({ it, i, active, seen, reduce, hidden }) {
  const ref = useRef(null)
  const video = isVideo(it)
  useEffect(() => {
    const v = ref.current
    if (!v || !video) return
    if (active && !reduce) { const p = v.play(); if (p && p.catch) p.catch(() => {}) } else v.pause()
  }, [active, seen, reduce, video])
  return (
    <figure className="abs__tile" style={{ '--ar': ASPECTS[i % ASPECTS.length] }} aria-hidden={hidden || undefined} onPointerMove={glowAt}>
      {video ? (
        <video
          ref={ref}
          src={seen ? it.src : undefined}
          poster={it.poster || undefined}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          tabIndex={-1}
        />
      ) : (
        <img src={it.src} alt="" loading="lazy" decoding="async" />
      )}
      {it.label ? <figcaption className="abs__tag">{it.label}</figcaption> : null}
    </figure>
  )
}

function Row({ items, dir, sec, active, seen, reduce }) {
  const base = useMemo(() => fillRow(items, 4), [items])
  if (!base.length) return null
  return (
    <div className={`abs__row abs__row--${dir}`} style={{ '--dur': `${base.length * sec}s` }}>
      <div className="abs__track">
        {base.map((it, i) => <Tile key={`a${i}`} it={it} i={i} active={active} seen={seen} reduce={reduce} />)}
        {base.map((it, i) => <Tile key={`b${i}`} it={it} i={i} active={active} seen={seen} reduce={reduce} hidden />)}
      </div>
    </div>
  )
}

export default function AnimatedBackgroundShowcase({
  items = [],
  badge,
  badgeWord,
  title,
  text,
  bold,
  note,
  cta,
  intensity = 'balanced',
  height,
  wide = false,
  layout = 'marquee',
  className = '',
  onCta,
}) {
  const root = useRef(null)
  const [active, setActive] = useState(false)
  const [seen, setSeen] = useState(false)
  const [reduce, setReduce] = useState(false)
  const cfg = INTENSITY[intensity] || INTENSITY.balanced
  const narrow = useNarrow()
  const bento = layout === 'bento'
  /* בלי height הגובה בא מה-CSS (לפי רוחב המסך), והרשת מודדת אותו כדי לחלק את השורות */
  const [boxH, setBoxH] = useState(0)
  useEffect(() => {
    const el = root.current
    if (!bento || !el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setBoxH(Math.round(el.getBoundingClientRect().height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [bento])

  /* הווידאו נטען ומתנגן רק כשהכרטיס על המסך, ונעצר כשיוצאים ממנו */
  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') { setActive(true); return undefined }
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  /* אחרי הפעם הראשונה הקבצים נשארים טעונים, כדי שגלילה חזרה לא תטען אותם שוב */
  useEffect(() => { if (active) setSeen(true) }, [active])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduce(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  const clean = items.filter((x) => x && x.src)
  const top = clean.filter((_, i) => i % 2 === 0)
  const bottom = clean.filter((_, i) => i % 2 === 1)
  const rowB = bottom.length ? bottom : top
  /* בבאנטו מוצגים ארבעת הסרטונים הראשונים לפי הסדר בעורך */
  const bentoItems = bento ? clean.slice(0, BENTO_SLOTS).map((it, i) => ({
    id: `${it.src}-${i}`,
    ...(isVideo(it) ? { video: it.src, poster: it.poster } : { image: it.src }),
    label: it.label || undefined,
    ...(narrow ? {} : BENTO_WIDE[i]),
  })) : []
  const pad = narrow ? 0 : 28
  const bentoGap = narrow ? 10 : 12
  const rowHeight = narrow ? 128 : Math.max(120, Math.round(((height || boxH || 560) - pad * 2 - bentoGap) / 2))

  const ctaEl = cta?.label && cta?.to ? (
    /^https?:/i.test(cta.to)
      ? <a className="abs__cta" href={cta.to} target="_blank" rel="noopener noreferrer" onClick={onCta}><span>{cta.label}</span><i aria-hidden="true"><Arrow /></i></a>
      : <Link className="abs__cta" to={cta.to} onClick={onCta}><span>{cta.label}</span><i aria-hidden="true"><Arrow /></i></Link>
  ) : null

  return (
    <section
      ref={root}
      className={`abs abs--${intensity}${wide ? ' abs--wide' : ''}${bento ? ' abs--bento' : ''}${active ? ' is-active' : ''}${reduce ? ' is-still' : ''} ${className}`}
      style={{ ...(height ? { '--abs-h': `${height}px` } : null), '--tilt': `${cfg.tilt}deg` }}
      aria-label={title || undefined}
    >
      <div className="abs__bg" aria-hidden="true">
        {!bento && (
          <div className="abs__stage">
            <Row items={top} dir="a" sec={cfg.sec} active={active} seen={seen} reduce={reduce} />
            <Row items={rowB} dir="b" sec={cfg.sec * 1.15} active={active} seen={seen} reduce={reduce} />
          </div>
        )}
        <span className="abs__glow" />
        <span className="abs__veil" />
      </div>

      {/* הבאנטו מגיב לעכבר, ולכן הוא מחוץ לרקע שלא תופס לחיצות. הכרטיסים
          לא לחיצים ולא נכנסים לסדר המקלדת, והתוכן שלהם דקורטיבי */}
      {bento && bentoItems.length > 0 && (
        <div className="abs__bento" aria-hidden="true">
          <MagicBento
            items={bentoItems}
            columns={narrow ? 2 : 4}
            rowHeight={rowHeight}
            gap={bentoGap}
            radius={18}
            glowColor="#8fb6c8"
            spotlightRadius={narrow ? 220 : 300}
            enableStars={intensity !== 'subtle'}
            enableTilt={intensity === 'expressive'}
            enableMagnetism={intensity === 'expressive'}
            playMedia={!reduce}
            minCell={narrow ? 110 : 150}
            minPair={narrow ? 110 : 200}
          />
        </div>
      )}

      <div className="abs__content">
        {(badge || badgeWord) && (
          <p className="abs__badge">
            {badge ? <span className="abs__chip">{badge}</span> : null}
            {badgeWord ? <span className="abs__word">{badgeWord}</span> : null}
          </p>
        )}
        {title ? <h2 className="abs__title">{title}</h2> : null}
        {(text || bold) && (
          <p className="abs__text">
            {text}{text && bold ? ' ' : ''}{bold ? <strong>{bold}</strong> : null}
          </p>
        )}
        {note ? (
          <p className="abs__note">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 21 12 16.5 3 21Z" /></svg>
            {note}
          </p>
        ) : null}
        {ctaEl}
      </div>
    </section>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}
