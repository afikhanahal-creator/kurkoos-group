import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './i18n/index.jsx'
import App from './App.jsx'
import { initRipples } from './lib/ripple.js'
import './styles/global.css'

initRipples()

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
  rootEl.querySelectorAll('style').forEach((st) => document.head.appendChild(st))
  ssr.remove()
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
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
  const done = () => { node.remove(); mo.disconnect(); clearTimeout(timer) }
  const mo = new MutationObserver(() => {
    if (location.pathname !== startPath) return done()
    if (!main) { main = document.getElementById('top'); if (main) main.prepend(node) }
    else if (!main.contains(node)) main.prepend(node)
    if (realContent()) done()
  })
  mo.observe(document.body, { childList: true, subtree: true })
  const timer = setTimeout(done, 25000)
}
