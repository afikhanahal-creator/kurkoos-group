import { Component } from 'react'

/* שגיאה בזמן רינדור בלי גבול שגיאה מוחקת את כל העץ של React, והגולש נשאר
   מול מסך לבן שלא נגמר. הנפוץ ביותר: אחרי פריסה חדשה הקבצים הישנים נמחקים,
   ודפדפן שעדיין מחזיק את העמוד הקודם (למשל הדפדפן של פייסבוק) מנסה לטעון
   קובץ שכבר לא קיים. במקרה כזה טוענים את העמוד מחדש פעם אחת, ובכל מקרה
   אחר מציגים מסך גיבוי עם כפתור טעינה ודרכי קשר. */

const CHUNK_RX = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (CSS )?chunk|Failed to fetch|Unable to preload CSS/i

export function reloadOnce(reason) {
  try {
    const last = +sessionStorage.getItem('kg_reload_at') || 0
    if (Date.now() - last < 30000) return false
    sessionStorage.setItem('kg_reload_at', String(Date.now()))
  } catch {
    // בלי sessionStorage (מצב פרטי בחלק מהדפדפנים) עדיף לא להסתכן בלולאת טעינות
    return false
  }
  if (typeof console !== 'undefined') console.warn('reload after', reason)
  window.location.reload()
  return true
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    const msg = String((error && error.message) || error || '')
    if (CHUNK_RX.test(msg)) reloadOnce(msg)
  }

  render() {
    if (!this.state.error) return this.props.children
    const ssr = typeof window !== 'undefined' ? window.__kgPrerendered : ''
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: '#f7f8fa', color: '#07293a', fontFamily: 'inherit' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
          <img src="/kurkoos-logo-h.svg" alt="קבוצת קורקוס" style={{ height: 44, marginBottom: 18 }} />
          <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px' }}>העמוד לא נטען עד הסוף.</p>
          <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>לרוב זה חיבור איטי. אפשר לטעון שוב, או לדבר איתנו ישירות.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <button type="button" onClick={() => window.location.reload()} style={btn('#07293a')}>טעינה מחדש</button>
            <a href="tel:0559811814" style={btn('#105572')}>חייגו 055-981-1814</a>
            <a href="https://wa.me/972559811814" style={btn('#1f9d55')}>וואטסאפ</a>
          </div>
          {ssr ? <div className="ssr ssr-hold" dangerouslySetInnerHTML={{ __html: ssr }} /> : null}
        </div>
      </div>
    )
  }
}

function btn(bg) {
  return { background: bg, color: '#fff', border: 0, borderRadius: 999, padding: '12px 20px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit' }
}
