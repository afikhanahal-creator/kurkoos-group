/* The finance system's own entry. It is a separate page of the site (finance-app.html, served for /admin/finance by a
   rewrite), so a phone that opens it downloads React, the Supabase client and the finance code, and nothing of the
   public website (its animation library, its data, its styles). The public site's entry is untouched. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary, { reloadOnce } from './components/ErrorBoundary.jsx'
import './pages/finance/base.css'
import FinanceApp from './pages/finance/FinanceApp.jsx'

// iOS applies :active (the press feedback) only when the page listens to touchstart
document.addEventListener('touchstart', () => {}, { passive: true })
// the connection to the data source opens while the code is still arriving
if (import.meta.env.VITE_SUPABASE_URL) { const l = document.createElement('link'); l.rel = 'preconnect'; l.href = import.meta.env.VITE_SUPABASE_URL; l.crossOrigin = 'anonymous'; document.head.appendChild(l) }
// a code file that is gone (an old page after a new deploy): one reload
window.addEventListener('vite:preloadError', () => { reloadOnce('preload') })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <FinanceApp />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
