import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ImageEditor from '../src/pages/admin/ImageEditor.jsx'
function App() {
  const mode = new URLSearchParams(location.search).get('mode') || 'site'
  const [hero, setHero] = useState(0)
  const [gal, setGal] = useState(18)
  const props = mode === 'site'
    ? { allowRoundCorners: false, siteCorners: { isHero: true, hero, gallery: gal, onHero: setHero, onGallery: setGal } }
    : mode === 'display' ? { cornersMode: 'display', displayRadius: 16, aspect: '4 / 3' } : {}
  return <ImageEditor src="/on-every-project-page.webp" onApply={() => {}} onClose={() => {}} {...props} />
}
createRoot(document.getElementById('root')).render(<App />)
