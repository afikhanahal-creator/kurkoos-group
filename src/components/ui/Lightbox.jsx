import { useEffect, useCallback } from 'react'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'

/* ============================================================
   Lightbox — תצוגת תמונה במסך מלא עם prev/next, מונה,
   ESC לסגירה, לחיצה מחוץ לתמונה לסגירה. נגיש למקלדת.
   props: images[], index, onClose, onNavigate(nextIndex)
   ============================================================ */
export default function Lightbox({ images, index, onClose, onNavigate }) {
  const { t } = useI18n()
  const L = useLocalized()
  const total = images?.length || 0
  const isRtl = document.documentElement.dir === 'rtl'

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
  const src = images[index]

  return (
    <div className="pd-lightbox" role="dialog" aria-modal="true" aria-label={L({ he: 'גלריית תמונות', en: 'Image gallery' })}>
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

      <figure className="pd-lightbox__fig">
        <img src={src} alt={L({ he: 'תמונת גלריה', en: 'Gallery image' })} />
        {total > 1 && (
          <figcaption className="pd-lightbox__counter">
            <span dir="ltr">{index + 1} / {total}</span>
          </figcaption>
        )}
      </figure>
    </div>
  )
}
