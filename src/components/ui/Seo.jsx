import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/index.jsx'
import site from '../../data/site.js'

/* ============================================================
   ניהול תגיות <head> per-page (SEO) ל-SPA ללא SSR:
   title, meta description, canonical, Open Graph ו-robots.
   הקומפוננטה לא מרנדרת DOM גלוי — רק מעדכנת את ה-head.
   ============================================================ */
function upsertMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export default function Seo({ title, description, image, noindex = false }) {
  const { lang } = useI18n()
  const { pathname } = useLocation()

  useEffect(() => {
    const brand = lang === 'he' ? 'קורקוס גרופ' : 'Kurkoos Group'
    const fullTitle = title ? `${title} | ${brand}` : `${brand} | Kurkoos Group`
    const fallbackDesc = lang === 'he'
      ? 'קורקוס גרופ — יזמות, בנייה, פיקוח ותיווך נדל"ן ברמה הגבוהה ביותר. מקרקע ועד מסירת מפתח.'
      : 'Kurkoos Group — premium real-estate development, construction, supervision and brokerage. From land to key.'
    const desc = description || fallbackDesc
    const origin = (site.url || '').replace(/\/$/, '')
    const url = origin + pathname

    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow')
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', 'website')
    if (image) upsertMeta('property', 'og:image', image.startsWith('http') ? image : origin + image)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
  }, [title, description, image, noindex, lang, pathname])

  return null
}
