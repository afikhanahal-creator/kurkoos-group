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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
)
