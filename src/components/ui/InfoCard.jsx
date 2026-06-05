import { useRef, useState } from 'react'

/* ============================================================
   InfoCard — מסגרת קונית מסתובבת (עוקבת אחרי העכבר) +
   אפקט "מחיקה" על הכותרת בריחוף. מבוסס Uiverse.
   הומר ל-JS עם ברירות מחדל בצבעי המותג של קורקוס.
   ============================================================ */

function isRTL(text = '') {
  return /[֐-׿؀-ۿ܀-ݏ]/.test(text)
}

export default function InfoCard({
  image,
  media,            // אלמנט להצגה במקום התמונה (למשל קנבס Generative Art)
  title,
  description,
  width = 360,
  height = 384,
  borderColor = '#a90b0c',          // הקשת המסתובבת — אדום המותג
  borderBgColor = '#e2e6ec',        // בסיס המסגרת
  borderWidth = 3,
  borderPadding = 12,
  cardBgColor = '#ffffff',
  patternColor1 = 'rgba(16,85,114,0.05)',
  patternColor2 = 'rgba(16,85,114,0.08)',
  textColor = '#1a1f2b',
  hoverTextColor = '#ffffff',
  fontFamily = "var(--font-heading)",
  rtlFontFamily = "var(--font-heading)",
  effectBgColor = '#a90b0c',        // צבע ה"מחיקה" מאחורי הכותרת
  contentPadding = '14px 18px',
}) {
  const [hovered, setHovered] = useState(false)
  const borderRef = useRef(null)

  const handleMouseMove = (e) => {
    const border = borderRef.current
    if (!border) return
    const rect = border.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    border.style.setProperty('--rotation', `${Math.atan2(y, x)}rad`)
  }

  const rtl = isRTL(title) || isRTL(description)
  const effectiveFont = rtl ? rtlFontFamily : fontFamily
  const titleDirection = isRTL(title) ? 'rtl' : 'ltr'
  const descDirection = isRTL(description) ? 'rtl' : 'ltr'

  const innerWidth = width - 2 * borderPadding - 2 * borderWidth
  const innerHeight = height - 2 * borderPadding - 2 * borderWidth
  const imageHeight = Math.round(innerHeight * 0.6)

  const borderGradient = `conic-gradient(from var(--rotation,0deg), ${borderColor} 0deg, ${borderColor} 90deg, ${borderBgColor} 90deg, ${borderBgColor} 360deg)`

  return (
    <div
      ref={borderRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        if (borderRef.current) borderRef.current.style.setProperty('--rotation', '0deg')
      }}
      style={{
        width,
        height,
        maxWidth: '100%',
        border: `${borderWidth}px solid transparent`,
        borderRadius: '1em',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        backgroundImage: `linear-gradient(${cardBgColor}, ${cardBgColor}), ${borderGradient}`,
        padding: borderPadding,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        fontFamily: effectiveFont,
      }}
    >
      <div
        style={{
          width: innerWidth,
          height: innerHeight,
          borderRadius: '0.7em',
          background: cardBgColor,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '0 0 8px 0',
        }}
      >
        <div
          style={{
            width: '100%',
            height: imageHeight,
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
            background: media ? 'linear-gradient(160deg, #0a2230, #07222e)' : 'transparent',
            borderRadius: '0.5em',
          }}
        >
          {media ? media : (
            <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
        </div>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: contentPadding, minHeight: 0 }}>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-.01em',
              lineHeight: 'normal',
              marginBottom: 6,
              color: hovered ? hoverTextColor : textColor,
              transition: 'color 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              direction: titleDirection,
              width: 'auto',
            }}
          >
            <span style={{ position: 'relative', zIndex: 10, padding: '2px 4px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%', height: '100%' }}>
              {title}
            </span>
            <span
              style={{
                clipPath: hovered ? 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' : 'polygon(0 50%, 100% 50%, 100% 50%, 0 50%)',
                transformOrigin: 'center',
                transition: 'all cubic-bezier(.1,.5,.5,1) 0.4s',
                position: 'absolute',
                left: -4, right: -4, top: -4, bottom: -4,
                zIndex: 0,
                backgroundColor: effectBgColor,
              }}
            />
          </h3>
          <p
            style={{
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: textColor,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              direction: descDirection,
              margin: 0,
              minHeight: 0,
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
