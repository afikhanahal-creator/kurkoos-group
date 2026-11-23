import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './i18n/index.jsx'
import App from './App.jsx'
import ErrorBoundary, { reloadOnce } from './components/ErrorBoundary.jsx'

import './styles/global.css'
import './styles/polish.css'
import './styles/a11y.css'
import './styles/glow.css'
import { initGlowCards } from './lib/glowCards.js'
import { capture as captureAttribution } from './lib/attribution.js'

// where this visitor came from (UTM, ad click, referring site), saved with any lead they send
captureAttribution()

// iOS Safari applies :active (the press feedback) only when the page listens to touchstart
if (typeof document !== 'undefined') document.addEventListener('touchstart', () => {}, { passive: true })
// Material ripple retired: press feedback is a small scale on :active (Apple design pass, polish.css)
// initRipples()

// חיבור-מוקדם (preconnect) למקורות הנתונים — DNS+TLS נפתחים במקביל לטעינת
// הקוד, כך שהבקשה הראשונה ל-Supabase/Cloudinary יוצאת בלי המתנה.
for (const href of [import.meta.env.VITE_SUPABASE_URL, 'https://res.cloudinary.com'].filter(Boolean)) {
  const l = document.createElement('link')
  l.rel = 'preconnect'
  l.href = href
  l.crossOrigin = 'anonymous'
  document.head.appendChild(l)
}

/* הטקסט הסטטי שנבנה מראש לכל עמוד (scripts/prerender-static.mjs) נשאר על המסך
   עד שהעמוד האמיתי מוכן. בלי זה, גולש שנכנס מפוסט בפייסבוק או באינסטגרם על
   רשת איטית רואה מסך לבן עד שכל הקוד של העמוד ירד. */
const rootEl = document.getElementById('root')
const ssr = rootEl.querySelector('.ssr')
if (ssr) {
  window.__kgPrerendered = ssr.innerHTML
  rootEl.querySelectorAll('style').forEach((st) => document.head.appendChild(st))
  ssr.remove()
}

/* קובץ קוד שלא נטען (בדרך כלל: עמוד ישן אחרי פריסה חדשה) → טעינה מחדש אחת */
window.addEventListener('vite:preloadError', () => { reloadOnce('preload') })

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)

if (ssr) holdPrerendered(ssr)

function holdPrerendered(node) {
  const startPath = location.pathname
  node.classList.add('ssr-hold')
  let main = null
  const realContent = () => {
    if (!main) return false
    for (const el of main.querySelectorAll('h1')) if (!node.contains(el)) return true
    let len = 0
    for (const ch of main.children) if (ch !== node) len += (ch.innerText || '').length
    return len > 600
  }
  /* hidden by default (prerender-static.mjs): on a normal load the real page arrives first and nothing flashes.
     Only when the page is still not there after 1.2 s does the text copy show, so a slow phone is not left on a blank screen. */
  const show = setTimeout(() => node.classList.add('ssr-show'), 1200)
  const done = () => { node.remove(); mo.disconnect(); clearTimeout(timer); clearTimeout(show) }
  const mo = new MutationObserver(() => {
    if (location.pathname !== startPath) return done()
    if (!main) { main = document.getElementById('top'); if (main) main.prepend(node) }
    else if (!main.contains(node)) main.prepend(node)
    if (realContent()) done()
  })
  mo.observe(document.body, { childList: true, subtree: true })
  const timer = setTimeout(done, 25000)
}

initGlowCards()
