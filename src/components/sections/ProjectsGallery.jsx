import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import { supabase } from '../../lib/supabase.js'
import { listProjectCards, cmsRowToCard, projectPages, cachedSnapshot, useSettings } from '../../lib/cms.js'
import { optimizeSrc, srcOfResponsive, buildSrcSet } from '../../lib/responsiveImage.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import Reveal from '../ui/Reveal.jsx'
import SmartImage from '../ui/SmartImage.jsx'
import Icon from '../ui/Icon.jsx'
import BorderGlow from '../ui/BorderGlow.jsx'
import SpotlightCard from '../ui/SpotlightCard.jsx'
import KineticText from '../ui/KineticText.jsx'
import './ProjectsGallery.css'

// כניסה מהירה וקצבית — סטגר קטן ותנועה קצרה כדי שהכרטיסים "יעלו" מיד כשמגיעים אליהם
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 18 } },
}

/* Lightbox */
function Lightbox({ item, onClose, L, t }) {
  return (
    <motion.div className="pg-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="pg-lightbox__panel"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={optimizeSrc(item.cover, 1200)} alt={L(item.name)} className="pg-lightbox__img" loading="lazy" decoding="async" />
        <div className="pg-lightbox__bar">
          <div>
            <strong>{L(item.name)}</strong>
            <span>{L(item.city)} · {L(item.type)} · {item.year}</span>
          </div>
          <Link to={`/projects/${item.slug}`} className="btn btn--primary">
            {t('projects.viewProject')}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </motion.div>
      <button className="pg-lightbox__close" onClick={onClose} aria-label={t('common.close')}>
        <Icon name="close" size={26} />
      </button>
    </motion.div>
  )
}

/* כרטיס פרויקט בודד.
   במובייל מוותרים על BorderGlow/SpotlightCard (אפקטים של מצביע/ריחוף
   בלבד) — הם גורמים ל-layout-thrash בכל touchmove ומקפיאים את הגלילה.
   כך הגלילה האופקית במובייל היא native חלקה לגמרי. */
function ProjectCard({ p, L, t, isMobile, eager, masonry }) {
  const media = (
    <div className="pg-card__media">
      {isMobile ? (
        <div className="pg-card__spot">
          <SmartImage src={p.cover} alt={L(p.name)} label={L(p.name)} className="pg-card__img" w={560} sizes="(max-width: 768px) 60vw, 250px" quality="auto:eco" priority={eager} />
          <span className={`pg-card__badge pg-card__badge--${p.status}`}>{t(`projects.status.${p.status}`)}</span>
        </div>
      ) : (
        <SpotlightCard className="pg-card__spot" spotlightColor="rgba(255, 255, 255, 0.35)">
          <SmartImage src={p.cover} alt={L(p.name)} label={L(p.name)} className="pg-card__img" w={560} sizes="(max-width: 768px) 60vw, 250px" quality="auto:eco" priority={eager} />
          <span className={`pg-card__badge pg-card__badge--${p.status}`}>{t(`projects.status.${p.status}`)}</span>
        </SpotlightCard>
      )}
      <div className="pg-card__panel">
        <h3 className="pg-card__title">{L(p.name)}</h3>
        <div className="pg-card__reveal">
          {/* כברירת מחדל מוצג רק השם; בפתיחת הפאנל הלבן נחשפים עיר · שנה */}
          <span className="pg-card__meta">
            {[L(p.city), p.year].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <motion.article className={`pg-card${masonry ? ` pg-card--masonry pg-card--${p.layout || 'normal'}` : ''}`} variants={itemVariants}>
      {/* קישור native אמיתי לעמוד הפרויקט (אמין יותר מ-onClick) */}
      <Link to={`/projects/${p.slug}`} className="pg-card__link" aria-label={L(p.name)}>
        {isMobile ? media : (
          <BorderGlow
            className="pg-card__glow"
            backgroundColor="transparent"
            borderRadius={16}
            glowColor="197 78 48"
            glowRadius={30}
            glowIntensity={1.15}
            edgeSensitivity={28}
            coneSpread={24}
            colors={['#16688c', '#105572', '#8fb6c8']}
          >
            {media}
          </BorderGlow>
        )}
      </Link>
    </motion.article>
  )
}

/* ============================================================
   ProjectsGallery — קרוסלת פרויקטים.
   במובייל: לולאה אינסופית רציפה (marquee) — הפריטים משוכפלים והגלילה
   חוזרת על עצמה בצורה חלקה בלי קפיצה להתחלה.
   props: items, sectionId, showFooter.
   ============================================================ */
export default function ProjectsGallery({ items: itemsProp, sectionId = 'projects', showFooter = true, title, lead, collage = false, masonry = false }) {
  const { t, isRTL } = useI18n()
  const L = useLocalized()
  const isMobile = useIsMobile()
  const settings = useSettings()
  const usingProp = !!(itemsProp && itemsProp.length)
  // שורות CMS גולמיות (כולל pages) — זריעה מיידית מתמונת-מצב שמורה לטעינה חוזרת מהירה
  const [rows, setRows] = useState(() => usingProp ? null : (cachedSnapshot('projects:cards') || null))
  const viewportRef = useRef(null)
  const pausedRef = useRef(false)
  const resumeRef = useRef(null)

  useEffect(() => {
    if (!supabase || usingProp) return
    let alive = true
    listProjectCards().then((r) => { if (alive && r) setRows(r) }).catch(() => {})
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // "פרויקטים נבחרים" = מפורסמים מתויגי featured, אחרת הכול
  const featuredItems = useMemo(() => {
    if (!rows || !rows.length) return []
    const f = rows.filter((p) => projectPages(p).includes('featured'))
    return (f.length ? f : rows).map(cmsRowToCard)
  }, [rows])
  // כל הפרויקטים לפי slug — לבחירה הידנית של דף הבית
  const allItems = useMemo(() => (rows || []).map(cmsRowToCard), [rows])

  // בחירה ידנית מהניהול (home_featured) — מערך slugs מסודר, עד 4
  const homeFeatured = useMemo(() => {
    let v = settings.home_featured
    if (typeof v === 'string') { try { v = JSON.parse(v) } catch { v = null } }
    return Array.isArray(v) ? v.filter(Boolean) : []
  }, [settings.home_featured])
  // מצב "כל הפרויקטים" — דורס את ההגבלה ל-4 ומציג את כולם
  const homeFeaturedAll = useMemo(() => {
    const v = settings.home_featured_all
    return v === true || v === 'true'
  }, [settings.home_featured_all])

  // מקור הפריטים: prop → CMS. במצב "כל הפרויקטים" מציגים את כולם; אחרת את הנבחרים.
  const source = usingProp ? itemsProp : (homeFeaturedAll ? allItems : featuredItems)
  const seen = new Set()
  const items = source.filter((p) => {
    const k = p.slug || p.name
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  // הבחירה הידנית מהניהול (home_featured). השוואת slug חסינת-טיפוס
  // (String) — כדי שהתאמה לא תיכשל אם id נשמר כמספר במקום מחרוזת.
  const curated = (!usingProp && !homeFeaturedAll && homeFeatured.length)
    ? homeFeatured.map((slug) => allItems.find((c) => String(c.slug) === String(slug))).filter(Boolean)
    : null
  // מקור התצוגה:
  //  • prop מפורש (עמודי חטיבות) → כפי שהוא.
  //  • "הצג את כל הפרויקטים" פעיל → כל הפרויקטים.
  //  • אחרת (מצב בחירה ידנית) → הנבחרים בלבד. גם אם מסיבה כלשהי לא נמצאה
  //    התאמה, *לא* מציגים את כולם — מגבילים ל-4 כדי לכבד את "פרויקטים נבחרים".
  const MAX_FEATURED = 4
  let baseItems
  if (usingProp || homeFeaturedAll) baseItems = items
  else if (curated && curated.length) baseItems = curated.slice(0, MAX_FEATURED)
  else baseItems = items.slice(0, MAX_FEATURED)
  // קולאז' שתי-שורות (עמודי החטיבות) כשיש הרבה פרויקטים (6+) — במקום שורה אחת צפופה
  const twoRows = collage && baseItems.length > 5
  // משכפלים ל-3 עותקים (לולאה אינסופית חלקה) רק כשיש מספיק פרויקטים (5+).
  // בחירה של עד 4 "פרויקטים נבחרים" מוצגת בדיוק כמו שהיא — בלי חזרות שנראות
  // כאילו יש יותר מ-4 (אותם 4 חזרו שוב ושוב בגלל הלולאה).
  const renderItems = (!twoRows && isMobile && baseItems.length >= 5)
    ? [...baseItems, ...baseItems, ...baseItems]
    : baseItems

  // טעינה-מוקדמת (prefetch) של תמונות הכריכה בזמן idle — כך "פרויקטים נבחרים"
  // מופיעים מיד כשגוללים אליהם, במקום להתחיל להיטען רק כשמגיעים לאזור.
  const coverKey = baseItems.map((p) => srcOfResponsive(p.cover)).filter(Boolean).join('|')
  useEffect(() => {
    if (!coverKey) return
    // טעינה-מוקדמת רק של הכריכות הראשונות (לא כולן בבת אחת) — כדי לא להציף את
    // החיבור ולהאיץ את ההופעה של הכרטיסים הראשונים. השאר נטענים בעצלתיים בגלילה.
    // מצרפים srcset+sizes זהים לכרטיס → הדפדפן מחמם בדיוק את הגרסה שתיטען בפועל
    // (במובייל גרסה קלה), בלי בזבוז רוחב-פס על רוחב דסקטופ מלא.
    const covers = coverKey.split('|').slice(0, 6)
    const id = setTimeout(() => {
      covers.forEach((src) => {
        const im = new Image()
        im.decoding = 'async'
        im.fetchPriority = 'low'
        im.sizes = '(max-width: 768px) 60vw, 250px'
        const ss = buildSrcSet(src, 560, 'auto:eco')
        if (ss) im.srcset = ss
        im.src = optimizeSrc(src, 560, 'auto:eco')
      })
    }, 150)
    return () => clearTimeout(id)
  }, [coverKey])

  /* קרוסלה רציפה וחלקה (מובייל): תנועה קבועה ועדינה (requestAnimationFrame),
     לולאה אינסופית חלקה לשני הכיוונים (3 עותקים, גלילה מהאמצע), נעצרת בנגיעה
     ומתחדשת — וניתן להחליק/לגרור חופשי ימינה ושמאלה בלי להיתקע. */
  useEffect(() => {
    if (!isMobile || twoRows) return
    const el = viewportRef.current
    if (!el) return

    const track = el.querySelector('.projects-gallery__track')
    const cards = track ? track.querySelectorAll('.pg-card') : []
    if (!track || cards.length < items.length * 2) return

    // רוחב סט יחיד (נמדד מהמיקום בפועל) + כיוון RTL
    let setWidth = Math.abs(cards[items.length].offsetLeft - cards[0].offsetLeft)
    const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1
    if (!setWidth) return

    // מתחילים מהעותק האמצעי → יש "אוויר" של עותק שלם לכל כיוון לגלילה ידנית
    el.scrollLeft = sign > 0 ? setWidth : -setWidth

    // שומרים את המיקום בעותק האמצעי (קפיצה של עותק שלם = חלק כי התוכן זהה)
    const normalize = () => {
      const x = el.scrollLeft
      if (sign > 0) {
        if (x < setWidth) el.scrollLeft = x + setWidth
        else if (x > 2 * setWidth) el.scrollLeft = x - setWidth
      } else {
        if (x > -setWidth) el.scrollLeft = x - setWidth
        else if (x < -2 * setWidth) el.scrollLeft = x + setWidth
      }
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const SPEED = 26 // פיקסלים לשנייה — איטי ועדין
    let last = performance.now()
    let raf
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!reduce && !pausedRef.current) el.scrollLeft += sign * SPEED * dt
      normalize()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // עצירת התנועה האוטומטית בזמן אינטראקציה, חידוש אחרי השהייה קצרה
    const pause = () => {
      pausedRef.current = true
      clearTimeout(resumeRef.current)
      resumeRef.current = setTimeout(() => { pausedRef.current = false }, 1800)
    }
    el.addEventListener('pointerdown', pause)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('touchmove', pause, { passive: true })
    el.addEventListener('wheel', pause, { passive: true })

    const onResize = () => { setWidth = Math.abs(cards[items.length].offsetLeft - cards[0].offsetLeft) || setWidth }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resumeRef.current)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('touchmove', pause)
      el.removeEventListener('wheel', pause)
      window.removeEventListener('resize', onResize)
    }
  }, [isMobile, items.length, twoRows])

  /* גלילה בדסקטופ: גרירה עם העכבר (grab) + גלגל אנכי→אופקי. שניהם מכבדים RTL
     (התוכן יושב ב-scrollLeft שלילי), כך שאפשר לגלול ימינה ושמאלה בחופשיות.
     גרירה שזזה לא מפעילה ניווט לעמוד הפרויקט. */
  useEffect(() => {
    const el = viewportRef.current
    if (!el || isMobile) return
    const rtlSign = isRTL ? -1 : 1

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return  // כבר אופקי (טאצ'פד)
      const before = el.scrollLeft
      el.scrollLeft += e.deltaY * rtlSign
      if (el.scrollLeft !== before) e.preventDefault()
    }

    let down = false, startX = 0, startLeft = 0, moved = false
    const onDown = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      if (e.button !== 0) return
      down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft
      el.classList.add('is-grabbing')
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4) moved = true
      el.scrollLeft = startLeft - dx
    }
    const onUp = () => { down = false; el.classList.remove('is-grabbing') }
    const onClick = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('click', onClick, true)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('click', onClick, true)
    }
  }, [isMobile, isRTL])

  // אין פרויקטים להצגה (לא דרך prop ולא מה-CMS) → לא מציגים את הסקשן כלל,
  // במקום fallback לפרויקטי דמו ישנים.
  if (!items.length) return null

  return (
    <section className="section section--soft projects-gallery" id={sectionId || undefined}>
      <div className="container">
        <Reveal className="projects-gallery__head">
          <KineticText as="h2" className="section-title" text={title || t('projects.title')} />
          <p className="section-lead">{lead || t('projects.lead')}</p>
        </Reveal>
      </div>

      {masonry && !isMobile ? (
        /* פריסת "שתי וערב" (masonry) — דסקטופ בלבד. אותו כרטיס בדיוק (שם/עיר/שנה/
           תריס) בעמודות, עם יחס-גובה לפי card_layout (wide=לרוחב, normal=מרובע,
           tall=לאורך) → תצוגה מגוונת ונעימה לעין. במובייל נשארת הקרוסלה. */
        <div className="container">
          <motion.div
            className="pg-masonry"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {baseItems.map((p, i) => (
              <ProjectCard key={`${p.slug}-${i}`} p={p} L={L} t={t} isMobile={false} eager={i < 6} masonry />
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="projects-gallery__viewport" ref={viewportRef}>
          <motion.div
            className={`projects-gallery__track${twoRows ? ' projects-gallery__track--rows2' : ''}`}
            variants={containerVariants}
            initial="hidden"
            /* הצגה מיד עם טעינת הרכיב — ללא תלות בגלילה / IntersectionObserver.
               קודם השתמשנו ב-whileInView, אך במובייל הרצועה משולשת ברוחב (לולאה
               אינסופית) ורחבה בהרבה מהמסך, כך שטריגר הגלילה לא נדלק והכרטיסים
               נשארו שקופים (opacity:0). animate="visible" חסין לחלוטין. */
            animate="visible"
          >
            {renderItems.map((p, i) => (
              <ProjectCard key={`${p.slug}-${i}`} p={p} L={L} t={t} isMobile={isMobile} eager={i < 3} />
            ))}
          </motion.div>
        </div>
      )}

      {showFooter && (
        <div className="container">
          <Reveal className="projects-gallery__footer">
            <Link to="/projects" className="btn btn--dark btn--lg">
              {t('projects.all')}
              <Icon name={isRTL ? 'arrowLeft' : 'arrow'} size={20} />
            </Link>
          </Reveal>
        </div>
      )}

    </section>
  )
}
