import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'

/* The explainer video: what the system does, in one minute. Shown after a sign-in and after a sign-out
   (owner's request), always with a way out: "דילוג", Escape, or a click outside. The file is made by the video engine
   (video/studio/finance-explainer, docs/finance/EXPLAINER-VIDEO.md); it has no sound, the text is on the screen.

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
  const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const back = document.activeElement
    skip.current?.focus()
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('keydown', key, true); if (back && back.focus) back.focus() }
  }, [onClose])
  // a browser may refuse to start a video by itself: the controls are there, so nothing else is needed
  useEffect(() => { if (!calm) video.current?.play().catch(() => {}) }, [calm])

  const out = when === 'out'
  return (
    <div className="fin-tour" role="dialog" aria-modal="true" aria-labelledby="fin-tour-title" dir="rtl">
      <button type="button" className="fin-tour__scrim" aria-label="סגירת הסרטון" tabIndex={-1} onClick={onClose} />
      <div className="fin-tour__box">
        <header className="fin-tour__head">
          <div>
            <h2 id="fin-tour-title">{out ? 'יצאתם מהמערכת' : 'היכרות עם המערכת'}</h2>
            <p>{out ? 'תזכורת קצרה למה שהמערכת עושה בשבילכם, עד הפעם הבאה.' : 'דקה אחת: מה המערכת עושה, ואיך רואים את כל ההוצאות במקום אחד.'}</p>
          </div>
          <button type="button" ref={skip} className="fin-btn fin-tour__skip" onClick={onClose}>
            <Icon name="close" /><span>{ended ? 'סגירה' : 'דילוג'}</span>
          </button>
        </header>
        <div className="fin-tour__frame">
          {failed
            ? <p className="fin-tour__failed" role="alert">הסרטון לא נטען. אפשר להמשיך ולנסות שוב בכניסה הבאה.</p>
            : (
              <video ref={video} src={EXPLAINER_SRC} poster={POSTER} controls playsInline muted preload="auto"
                aria-label="סרטון הסבר על מערכת הכספים, בלי קול, עם כתוביות"
                onEnded={() => setEnded(true)} onError={() => setFailed(true)} />
            )}
        </div>
        <footer className="fin-tour__foot">
          <span>הסרטון עם כתוביות, בלי קול. המספרים שמופיעים בו להדגמה בלבד.</span>
          <button type="button" className="fin-btn fin-btn--primary" onClick={onClose}>{out ? 'חזרה למסך הכניסה' : 'כניסה למערכת'}</button>
        </footer>
      </div>
    </div>
  )
}
