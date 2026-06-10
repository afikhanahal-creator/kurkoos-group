import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'

/* ============================================================
   Lightbox — תצוגת מדיה במסך מלא: תמונות וסרטונים מעורבבים.
   prev/next (חיצים + מקלדת RTL-aware + swipe מגע), מונה,
   ESC / לחיצה מחוץ למדיה לסגירה. נגיש למקלדת.
   props: images[]  — כל פריט הוא מחרוזת (תמונה) או אובייקט
          { type:'youtube'|'file', id, src, title } (סרטון).
   index, onClose, onNavigate(nextIndex)
   ============================================================ */
export default function Lightbox({ images, index, onClose, onNavigate }) {
  const { t } = useI18n()
  const L = useLocalized()
  const total = images?.length || 0
  const isRtl = document.documentElement.dir === 'rtl'
  const touchX = useRef(null)
  const swiped = useRef(false)   // החלקה התרחשה → לא לקדם גם בלחיצה

  const go = useCallback(
    (dir) => {
      if (total < 2) return
      onNavigate((index + dir + total) % total)
    },
    [index, total, onNavigate]
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(isRtl ? -1 : 1)
      else if (e.key === 'ArrowLeft') go(isRtl ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, go, isRtl])

  if (index == null || !total) return null
  const item = images[index]
  const isVideo = item && typeof item === 'object'

  const onTouchStart = (e) => { touchX.current = e.touches[0]?.clientX ?? null; swiped.current = false }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 45) return
    swiped.current = true
    // החלקה שמאלה = קדימה (המונה עולה 1→2→3), ימינה = אחורה
    go(dx < 0 ? 1 : -1)
  }
  // לחיצה על התמונה = קדימה לתמונה הבאה — המונה תמיד עולה (1/7 → 2/7)
  const onImageClick = (e) => {
    e.stopPropagation()
    if (swiped.current) { swiped.current = false; return }
    go(1)
  }

  return createPortal(
    <div
      className="pd-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={L({ he: 'גלריית מדיה', en: 'Media gallery' })}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button type="button" className="pd-lightbox__bg" aria-label={t('common.close')} onClick={onClose} tabIndex={-1} />

      <button type="button" className="pd-lightbox__close" aria-label={t('common.close')} onClick={onClose}>
        <Icon name="close" size={28} />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            className="pd-lightbox__nav pd-lightbox__nav--prev"
            aria-label={L({ he: 'הקודם', en: 'Previous' })}
            onClick={() => go(isRtl ? 1 : -1)}
          >
            <Icon name="arrowLeft" size={26} />
          </button>
          <button
            type="button"
            className="pd-lightbox__nav pd-lightbox__nav--next"
            aria-label={L({ he: 'הבא', en: 'Next' })}
            onClick={() => go(isRtl ? -1 : 1)}
          >
            <Icon name="arrow" size={26} />
          </button>
        </>
      )}

      <figure className="pd-lightbox__fig" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          item.type === 'file' ? (
            <video className="pd-lightbox__video" src={item.src} controls autoPlay playsInline />
          ) : (
            <div className="pd-lightbox__video-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${item.id}?autoplay=1&rel=0`}
                title={item.title || L({ he: 'סרטון', en: 'Video' })}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        ) : (
          <img
            src={item}
            alt={L({ he: 'תמונת גלריה', en: 'Gallery image' })}
            onClick={onImageClick}
            style={{ cursor: total > 1 ? 'pointer' : 'default' }}
          />
        )}
        {total > 1 && (
          <figcaption className="pd-lightbox__counter">
            <span dir="ltr">{index + 1} / {total}</span>
          </figcaption>
        )}
      </figure>
    </div>,
    document.body
  )
}
