import { useState, useEffect, useRef, useCallback } from 'react'
import './CircularGallery.css'

/* ============================================================
   CircularGallery — גלריית "עיגול→ריבוע" עם מורפינג GSAP (clip-path).
   מבוסס על רכיב shadcn/Tailwind; הומר ל-JSX + CSS רגיל. ליבת האנימציה
   (GSAP + MotionPathPlugin) נטענת מ-CDN ונשארת זהה. מסנן תמונות שבורות,
   ולכן אפשר להזין משבצות מראש. props: images (מערך src).
   ============================================================ */
export default function CircularGallery({ images = [] }) {
  const [valid, setValid] = useState([])
  const [opened, setOpened] = useState(0)
  const [inPlace, setInPlace] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [gsapReady, setGsapReady] = useState(false)
  const autoplayTimer = useRef(null)

  // טעינה מוקדמת + סינון תמונות שלא נטענו (אין משבצות שבורות)
  useEffect(() => {
    let alive = true
    const srcs = (images || []).filter(Boolean)
    Promise.all(srcs.map((src) => new Promise((res) => {
      const im = new Image()
      im.onload = () => res(src)
      im.onerror = () => res(null)
      im.src = src
    }))).then((arr) => { if (alive) setValid(arr.filter(Boolean)) })
    return () => { alive = false }
  }, [images])

  // טעינת GSAP + MotionPathPlugin מ-CDN
  useEffect(() => {
    if (window.gsap && window.MotionPathPlugin) {
      window.gsap.registerPlugin(window.MotionPathPlugin); setGsapReady(true); return
    }
    const s1 = document.createElement('script')
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'
    s1.onload = () => {
      const s2 = document.createElement('script')
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/MotionPathPlugin.min.js'
      s2.onload = () => {
        if (window.gsap && window.MotionPathPlugin) { window.gsap.registerPlugin(window.MotionPathPlugin); setGsapReady(true) }
      }
      document.body.appendChild(s2)
    }
    document.body.appendChild(s1)
  }, [])

  const total = valid.length
  const onClick = (i) => { if (!disabled) setOpened(i) }
  const onInPlace = (i) => setInPlace(i)
  const next = useCallback(() => setOpened((c) => (c + 1) % (total || 1)), [total])
  const prev = useCallback(() => setOpened((c) => (c - 1 + (total || 1)) % (total || 1)), [total])

  useEffect(() => setDisabled(true), [opened])
  useEffect(() => setDisabled(false), [inPlace])

  useEffect(() => {
    if (!gsapReady || total < 2) return
    if (autoplayTimer.current) clearInterval(autoplayTimer.current)
    autoplayTimer.current = window.setInterval(next, 4500)
    return () => { if (autoplayTimer.current) clearInterval(autoplayTimer.current) }
  }, [opened, gsapReady, next, total])

  if (!total) return null

  return (
    <div className="cgal">
      <div className="cgal__stage">
        {gsapReady && valid.map((src, i) => (
          <div key={src} className="cgal__layer" style={{ zIndex: inPlace === i ? i : total + 1 }}>
            <GalleryImage total={total} id={i} url={src} open={opened === i} inPlace={inPlace === i} onInPlace={onInPlace} />
          </div>
        ))}
        <div className="cgal__tabs"><Tabs images={valid} onSelect={onClick} /></div>

        {total > 1 && (
          <>
            <button className="cgal__nav cgal__nav--prev" onClick={prev} disabled={disabled} aria-label="הקודם">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button className="cgal__nav cgal__nav--next" onClick={next} disabled={disabled} aria-label="הבא">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GalleryImage({ url, open, inPlace, id, onInPlace, total }) {
  const [firstLoad, setLoaded] = useState(true)
  const clip = useRef(null)

  const gap = 10
  const circleRadius = 7
  const defaults = { transformOrigin: 'center center' }
  const duration = 0.4
  const width = 400
  const height = 400
  const scale = 700
  const bigSize = circleRadius * scale
  const overlap = 0

  const getPosSmall = () => ({
    cx: width / 2 - (total * (circleRadius * 2 + gap) - gap) / 2 + id * (circleRadius * 2 + gap),
    cy: height - 30,
    r: circleRadius,
  })
  const getPosSmallAbove = () => ({
    cx: width / 2 - (total * (circleRadius * 2 + gap) - gap) / 2 + id * (circleRadius * 2 + gap),
    cy: height / 2,
    r: circleRadius * 2,
  })
  const getPosCenter = () => ({ cx: width / 2, cy: height / 2, r: circleRadius * 7 })
  const getPosEnd = () => ({ cx: width / 2 - bigSize + overlap, cy: height / 2, r: bigSize })
  const getPosStart = () => ({ cx: width / 2 + bigSize - overlap, cy: height / 2, r: bigSize })

  useEffect(() => {
    const gsap = window.gsap
    if (!gsap) return
    setLoaded(false)
    if (clip.current) {
      const flipDuration = firstLoad ? 0 : duration
      const upDuration = firstLoad ? 0 : 0.2
      const bounceDuration = firstLoad ? 0.01 : 1
      const delay = firstLoad ? 0 : flipDuration + upDuration

      if (open) {
        gsap.timeline()
          .set(clip.current, { ...defaults, ...getPosSmall() })
          .to(clip.current, { ...defaults, ...getPosCenter(), duration: upDuration, ease: 'power3.inOut' })
          .to(clip.current, { ...defaults, ...getPosEnd(), duration: flipDuration, ease: 'power4.in', onComplete: () => onInPlace(id) })
      } else {
        gsap.timeline({ overwrite: true })
          .set(clip.current, { ...defaults, ...getPosStart() })
          .to(clip.current, { ...defaults, ...getPosCenter(), delay, duration: flipDuration, ease: 'power4.out' })
          .to(clip.current, { ...defaults, motionPath: { path: [getPosSmallAbove(), getPosSmall()], curviness: 1 }, duration: bounceDuration, ease: 'bounce.out' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" className="cgal__svg">
      <defs>
        <clipPath id={`${id}_circleClip`}>
          <circle className="clip" cx="0" cy="0" r={circleRadius} ref={clip} />
        </clipPath>
        <clipPath id={`${id}_squareClip`}>
          <rect className="clip" width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}${inPlace ? '_squareClip' : '_circleClip'})`}>
        <image className="cgal__img" width={width} height={height} href={url} preserveAspectRatio="xMidYMid slice" />
      </g>
    </svg>
  )
}

function Tabs({ images, onSelect }) {
  const gap = 10
  const circleRadius = 7
  const width = 400
  const height = 400
  const getPosX = (i) => width / 2 - (images.length * (circleRadius * 2 + gap) - gap) / 2 + i * (circleRadius * 2 + gap)
  const getPosY = () => height - 30

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" className="cgal__svg">
      {images.map((src, i) => (
        <g key={src} className="cgal__tab">
          <defs>
            <clipPath id={`tab_${i}_clip`}>
              <circle cx={getPosX(i)} cy={getPosY()} r={circleRadius} />
            </clipPath>
          </defs>
          <image x={getPosX(i) - circleRadius} y={getPosY() - circleRadius} width={circleRadius * 2} height={circleRadius * 2} href={src} clipPath={`url(#tab_${i}_clip)`} preserveAspectRatio="xMidYMid slice" />
          <circle onClick={() => onSelect(i)} className="cgal__tab-hit" strokeWidth="2" cx={getPosX(i)} cy={getPosY()} r={circleRadius + 2} />
        </g>
      ))}
    </svg>
  )
}
