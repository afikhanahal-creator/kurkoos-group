import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'

/* The product film: what the system does for you, in one minute. Shown after a sign-in and after a sign-out
   (owner's request), always with a way out: "דילוג", Escape, or a click outside. The file is made by the video engine
   (video/studio/finance-explainer, docs/finance/EXPLAINER-VIDEO.md). It has sound (a quiet bed, and the narrator when
   his lines are in). A browser may refuse to start a video with sound by itself: then it starts silent and a button
   turns the sound on.

   Automated browsers (the test suite signs in dozens of times) do not get it unless a test asks for it with
   window.__finExplainer = true. */
export const explainerOn = () => typeof window !== 'undefined' && (!navigator.webdriver || window.__finExplainer === true)
export const EXPLAINER_SRC = '/finance/explainer.mp4'
const POSTER = '/finance/explainer-poster.jpg'

export default function Explainer({ when, onClose }) {
  const video = useRef(null)
  const skip = useRef(null)
  const [ended, setEnded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [silent, setSilent] = useState(false)   // the browser refused sound: playing muted, with a button to turn it on
  const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const back = document.activeElement
    skip.current?.focus()
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('keydown', key, true); if (back && back.focus) back.focus() }
  }, [onClose])
  useEffect(() => {
    const v = video.current
    if (!v || calm) return
    v.muted = false
    v.play().catch(() => { v.muted = true; setSilent(true); v.play().catch(() => {}) })
  }, [calm])
  const soundOn = () => { const v = video.current; if (v) { v.muted = false; v.play().catch(() => {}) } setSilent(false) }

  const out = when === 'out'
  return (
    <div className="fin-tour" role="dialog" aria-modal="true" aria-labelledby="fin-tour-title" dir="rtl">
      <button type="button" className="fin-tour__scrim" aria-label="סגירת הסרטון" tabIndex={-1} onClick={onClose} />
      <div className="fin-tour__box">
        <header className="fin-tour__head">
          <div>
            <h2 id="fin-tour-title">{out ? 'יצאתם מהמערכת' : 'היכרות עם המערכת'}</h2>
            <p>{out ? 'תזכורת קצרה למה שהמערכת עושה בשבילכם, עד הפעם הבאה.' : 'דקה אחת על מה שהמערכת עושה בשבילכם.'}</p>
          </div>
          <button type="button" ref={skip} className="fin-btn fin-tour__skip" onClick={onClose}>
            <Icon name="close" /><span>{ended ? 'סגירה' : 'דילוג'}</span>
          </button>
        </header>
        <div className="fin-tour__frame">
          {failed
            ? <p className="fin-tour__failed" role="alert">הסרטון לא נטען. אפשר להמשיך ולנסות שוב בכניסה הבאה.</p>
            : (
              <video ref={video} src={EXPLAINER_SRC} poster={POSTER} controls playsInline preload="auto"
                aria-label="סרטון על מערכת הכספים"
                onEnded={() => setEnded(true)} onError={() => setFailed(true)} onVolumeChange={(e) => { if (!e.currentTarget.muted) setSilent(false) }} />
            )}
        </div>
        <footer className="fin-tour__foot">
          <span>המספרים שמופיעים בסרטון להדגמה בלבד.</span>
          <div className="fin-tour__acts">
            {silent && !failed && <button type="button" className="fin-btn fin-tour__sound" onClick={soundOn}><Icon name="play" /><span>הפעלת קול</span></button>}
            <button type="button" className="fin-btn fin-btn--primary" onClick={onClose}>{out ? 'חזרה למסך הכניסה' : 'כניסה למערכת'}</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
