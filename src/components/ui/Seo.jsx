import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/index.jsx'
import site from '../../data/site.js'
import { BRAND, composeTitle, clampDescription, metaForPath } from '../../lib/seo.js'

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

// הכתובת שממנה נטען הדף בפועל, כלומר זו שה-prerender כתב לה את ה-head
const FIRST_PATH = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') || '/' : '/'

/* האם אחד הבלוקים שהעמוד מזריק הוא כבר BreadcrumbList */
const hasType = (ld, type) =>
  [].concat(ld || []).some((x) => x && [].concat(x['@type'] || []).includes(type))

export default function Seo({ title, description, image, noindex = false, jsonLd = null, ogType = 'website' }) {
  const { lang } = useI18n()
  const { pathname } = useLocation()

  useEffect(() => {
    const brand = lang === 'he' ? BRAND : 'Kurkoos Group'
    /* לעמודים הקבועים יש כותרת ותיאור מוגדרים ב-lib/seo.js, אותו מקור שה-
       prerender כותב ל-HTML הסטטי. כך גוגל רואה אותה כותרת לפני ואחרי
       הרצת ה-JavaScript. */
    const path = pathname.replace(/(.)\/$/, '$1')
    const fixed = lang === 'he' ? metaForPath(path) : null
    /* כל עמוד חייב כותרת משלו. ברירת המחדל הקודמת הייתה "קורקוס גרופ |
       Kurkoos Group", וכל עמוד בלי כותרת קיבל בדיוק אותה מחרוזת. גוגל ראה
       כמה עמודים שונים עם אותה כותרת, בחר אחד מהם לקישור אתר, וסימן אותו
       בשם המותג. הנפילה לאחור היא עכשיו תיאורית, ובדיקת הבנייה מוודאת
       שאף עמוד לא מגיע לכאן מלכתחילה. */
    const fallbackTitle = lang === 'he'
      ? 'יזמות, בנייה ופיקוח נדל"ן בהוד השרון ובאזור המרכז'
      : 'Real-estate development, construction and supervision in Hod HaSharon'
    const fullTitle = composeTitle(fixed?.title || title || fallbackTitle, brand)
    const fallbackDesc = lang === 'he'
      ? 'קבוצת קורקוס: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך נכסים בהוד השרון ובאזור המרכז, מקרקע ועד מסירת מפתח.'
      : 'Kurkoos Group: real-estate development, construction, project supervision and brokerage in Hod HaSharon. From land to key.'
    const desc = clampDescription(fixed?.description || description || fallbackDesc)
    const origin = (site.url || '').replace(/\/$/, '')
    const url = origin + path

    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow')
    /* עמוד noindex (בעיקר 404) לא מצהיר על כתובת קנונית: canonical לכתובת
       שלא קיימת, או לעמוד הבית, הוא אות סותר ל-noindex. בניווט חזרה לעמוד
       רגיל upsertLink יוצר את התג מחדש. */
    if (noindex) document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove())
    else upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', ogType)
    // תמונת ברירת מחדל לשיתוף (וואטסאפ/רשתות) — לוגו על רקע לבן
    const ogImg = image || '/og-image.jpg'
    upsertMeta('property', 'og:image', ogImg.startsWith('http') ? ogImg : origin + ogImg)

    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', ogImg.startsWith('http') ? ogImg : origin + ogImg)

    /* נתונים מובנים שנכתבו ב-prerender (data-prerender) שייכים לכתובת שממנה
       נטען הדף. כשהעמוד מזריק בלוק משלו, או אחרי ניווט לכתובת אחרת, מוחקים
       אותם: אחרת גוגל רואה את אותו Article / FAQPage פעמיים, או בלוק של עמוד
       קודם. בלוק הארגון הקבוע שב-index.html לא מסומן ולכן לא נוגעים בו. */
    /* חריג אחד: פירורי הלחם (BreadcrumbList) מה-prerender נשארים כשהעמוד
       נטען ישירות מהכתובת הזו והעמוד עצמו לא מזריק פירורים משלו. בלי
       החריג, כל עמוד שמזריק Article או FAQPage מחק גם את הפירורים, וגוגל,
       שמריץ JavaScript, לא ראה BreadcrumbList באף כתבה. */
    const samePath = (pathname.replace(/\/$/, '') || '/') === FIRST_PATH
    if (jsonLd || !samePath) {
      const keepCrumbs = samePath && !hasType(jsonLd, 'BreadcrumbList')
      document.head.querySelectorAll('script[type="application/ld+json"][data-prerender]').forEach((el) => {
        if (keepCrumbs && el.textContent.includes('"BreadcrumbList"')) return
        el.remove()
      })
    }

    // נתונים מובנים per-page (schema.org) — נוסף ומוסר בעת ניווט
    let ld = null
    if (jsonLd) {
      ld = document.createElement('script')
      ld.type = 'application/ld+json'
      ld.setAttribute('data-seo', 'page')
      ld.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(ld)
    }
    return () => { if (ld) ld.remove() }
  }, [title, description, image, noindex, lang, pathname, jsonLd, ogType])

  return null
}
