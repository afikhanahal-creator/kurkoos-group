/* ============================================================
   מקור אחד לשכבת ה-SEO: כותרות, תיאורים, נתונים מובנים ופירורי לחם.
   הקובץ נטען גם ע"י Seo.jsx בזמן ריצה וגם ע"י scripts/prerender-static.mjs
   בזמן build, ולכן הוא JavaScript נקי בלי JSX ובלי תלות בדפדפן.
   כך הכותרת והתיאור שהסורק רואה ב-HTML הסטטי זהים למה שגוגל רואה אחרי
   שהוא מריץ את ה-JavaScript, ואין שתי גרסאות שמתפצלות עם הזמן.
   ============================================================ */

export const SITE_URL = 'https://www.kurkoos-group.co.il'
export const BRAND = 'קבוצת קורקוס'
/* גוגל חותך כותרות בסביבות 60 תווים. שם המותג נוסף רק כשהוא נכנס בתקרה,
   כדי שהמילה שמחפשים תישאר גלויה ולא תיחתך לטובת שם החברה. */
export const TITLE_MAX = 60
export const DESC_MIN = 120
export const DESC_MAX = 160

const BRAND_SUFFIX_RE = /\s*\|\s*(קבוצת קורקוס|קורקוס גרופ|Kurkoos Group)\s*$/

/* הכותרת המלאה של עמוד: "נושא | קבוצת קורקוס" כשזה נכנס, אחרת הנושא לבדו */
export function composeTitle(title, brand = BRAND) {
  const t = String(title || '').trim()
  if (!t) return brand
  if (BRAND_SUFFIX_RE.test(t)) return t
  const full = `${t} | ${brand}`
  return full.length <= TITLE_MAX ? full : t
}

/* תיאור מטא לא ארוך מהתקרה: חותכים בגבול מילה ולא באמצע מילה */
export function clampDescription(text, max = DESC_MAX) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')
  return cut.slice(0, at > 80 ? at : cut.length).replace(/[\s,.:;·\-–]+$/, '') + '…'
}

/* ---------- הטורים: נתיב, שם, והיררכיית פירורי הלחם ----------
   סדר הפירורים תואם לפירורי הלחם הגלויים בעמודי הכתבות. */
export const COLUMNS = {
  yazamut: {
    route: '/yazamut-nadlan', label: 'טור יזמות נדל״ן', index: 'המדריך ליזמות נדל"ן',
    parent: { name: 'יזמות נדל"ן', path: '/divisions/development' },
  },
  constructions: {
    route: '/constructions', label: 'המדריך לתהליך הבנייה', index: 'המדריך לתהליך הבנייה',
    parent: { name: 'ביצוע ובנייה', path: '/divisions/execution' },
  },
  supervision: {
    route: '/construction-supervision', label: 'המדריך לפיקוח בנייה', index: 'המדריך לפיקוח בנייה',
    parent: { name: 'ניהול ופיקוח בנייה', path: '/divisions/supervision' },
  },
  brokerage: {
    route: '/real-estate-guide', label: 'המדריך לרוכש ולמוכר', index: 'המדריך לרוכש ולמוכר',
    parent: { name: 'תיווך ושיווק נכסים', path: '/divisions/brokerage' },
  },
  mentorguide: {
    route: '/madrich-yazamim', label: 'המדריך ליזמי נדל"ן צעירים', index: 'המדריך ליזמי נדל"ן צעירים',
    parent: { name: 'ליווי יזמי נדל"ן', path: '/livy-yazamim' },
  },
}

/* כותרת SEO של כתבה. metaTitle שנכתב ידנית קודם לכול. בלעדיו: "כותרת · טור"
   רק אם יחד עם המותג זה נכנס בתקרה, אחרת כותרת הכתבה לבדה. */
export function articleSeoTitle(article, columnLabel) {
  if (article?.metaTitle) return article.metaTitle
  const withCol = `${article.title} · ${columnLabel}`
  return `${withCol} | ${BRAND}`.length <= TITLE_MAX ? withCol : article.title
}

export function articleSeoDescription(article) {
  return clampDescription(article?.metaDescription || article?.excerpt || article?.title)
}

/* ---------- נתונים מובנים ---------- */
export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: SITE_URL + (it.path === '/' ? '/' : it.path),
    })),
  }
}

export const HOME_CRUMB = { name: BRAND, path: '/' }

/* פירורי לחם של כתבה: בית › תחום › הטור › הכתבה */
export function articleCrumbs(col, article) {
  return [
    HOME_CRUMB,
    col.parent,
    { name: col.index, path: col.route },
    { name: article.title, path: `${col.route}/${article.slug}` },
  ]
}

/* Article. הכותב בכל הכתבות הוא "המערכת" ולא אדם בשם, ולכן author הוא
   הארגון. תאריך העדכון נלקח משדה updated אם קיים בקובץ, אחרת תאריך הפרסום. */
export function articleLd(article, path, image) {
  // כתבה בלי תמונת שער מקבלת את תמונת השיתוף של האתר: image מומלץ ל-Article
  const img = image ? (String(image).startsWith('http') ? image : SITE_URL + image) : `${SITE_URL}/og-image.jpg`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription || article.excerpt || undefined,
    image: img ? [img] : undefined,
    datePublished: article.date || undefined,
    dateModified: article.updated || article.date || undefined,
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': SITE_URL + path },
    articleSection: article.category || undefined,
    keywords: [article.focusKeyword, ...(Array.isArray(article.tags) ? article.tags : [])].filter(Boolean).join(', ') || undefined,
    inLanguage: 'he',
  }
}

/* סרטון שמוטמע בכתבה (שדה video בקובץ הכתבה) */
export function videoLd(article) {
  const v = article && article.video
  if (!v || !v.src) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.title || article.title,
    description: v.description || article.excerpt || article.title,
    thumbnailUrl: v.poster ? [v.poster] : undefined,
    uploadDate: v.uploadDate || article.date,
    duration: v.duration || undefined,
    contentUrl: v.src,
    inLanguage: 'he',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

/* ---------- שאלות ותשובות מתוך גוף הכתבה ----------
   כמעט כל כתבה מסתיימת בסעיף "## שאלות ותשובות" שבו כל שאלה היא שורה
   מודגשת (**שאלה?**) והתשובה בשורות שאחריה. השאלות האלה גלויות בעמוד,
   ולכן מותר לסמן אותן כ-FAQPage. הפונקציה קוראת אותן מהטקסט עצמו, כך
   שהנתונים המובנים תמיד זהים למה שהקורא רואה, בלי שדה נפרד לתחזוקה. */
const FAQ_HEADING_RE = /^##\s+(שאלות ותשובות|שאלות נפוצות)\s*$/
const plainMd = (s) => String(s || '')
  .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\s+/g, ' ')
  .trim()

export function articleFaqs(article) {
  const lines = String(article?.body || '').replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((l) => FAQ_HEADING_RE.test(l.trim()))
  if (start < 0) return []
  const section = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i].trim())) break
    section.push(lines[i])
  }
  const paras = section.join('\n').split(/\n\s*\n/).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean)).filter((p) => p.length)
  const out = []
  let pending = null
  for (const p of paras) {
    const m = p[0].match(/^\*\*(.+?)\*\*$/)
    if (m) {
      pending = null
      const q = plainMd(m[1])
      const a = plainMd(p.slice(1).join(' '))
      if (a) out.push({ q, a })
      else pending = q
    } else if (pending) {
      out.push({ q: pending, a: plainMd(p.join(' ')) })
      pending = null
    }
  }
  return out.filter((f) => f.q && f.a)
}

export function articleFaqLd(article) {
  const faqs = articleFaqs(article)
  if (faqs.length < 2) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

/* ---------- כותרות ותיאורים של העמודים הקבועים ----------
   Seo.jsx מעדיף את הערכים כאן על פני מה שהעמוד מעביר, וה-prerender כותב
   בדיוק אותם ערכים ל-HTML הסטטי. תיאור: 120 עד 160 תווים. */
export const PAGE_META = {
  '/': {
    title: 'בניית וילות ובתים פרטיים, פיקוח ויזמות בשרון ובמרכז',
    description: 'קבוצת קורקוס בונה וילות ובתים פרטיים בהוד השרון, רעננה, כפר סבא, הרצליה ובכל השרון, גם על המגרש שלכם, עם פיקוח צמוד מהקרקע ועד מסירת מפתח. דברו איתנו.',
  },
  '/about': {
    title: 'אודות הקבוצה',
    description: 'קבוצת קורקוס היא קבוצת נדל"ן הפועלת ביזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים: מקרקע ועד מסירת מפתח, באזור השרון והמרכז.',
  },
  '/team': {
    title: 'הצוות שמאחורי קורקוס',
    description: 'הצוות של קבוצת קורקוס: שלומי קורקוס, מנכ"ל ומייסד, בני קורקוס, יעקב קורקוס ומוטי בן עמי. מלווים כל פרויקט בהוד השרון ובאזור המרכז, מהתכנון ועד המפתח.',
  },
  '/projects': {
    title: 'פרויקטים בהוד השרון ובאזור המרכז',
    description: 'הפרויקטים של קבוצת קורקוס בהוד השרון ובאזור המרכז: בנייה למגורים, וילות ובתים פרטיים, ופרויקטים בליווי ובפיקוח הקבוצה, מקרקע ועד מסירת מפתח.',
  },
  '/blog': {
    title: 'בלוג קורקוס',
    description: 'תובנות, עדכונים וסיפורים מאחורי הקלעים של קבוצת קורקוס: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים.',
  },
  '/careers': {
    title: 'דרושים',
    description: 'קבוצת קורקוס מחפשת אנשים מצוינים לתחומי היזמות, הביצוע והבנייה, הפיקוח והתיווך. כאן מתפרסמות המשרות בקבוצה, שמשרדיה ברחוב הנגר 24 בהוד השרון.',
  },
  '/contact': {
    title: 'השארת פרטים ויצירת קשר',
    description: 'השאירו פרטים ונחזור אליכם: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים. המשרד ברחוב הנגר 24 בהוד השרון, טלפון 055-981-1814.',
  },
  '/real-estate-sharon': {
    title: 'נדל"ן בהוד השרון: יזמות, ביצוע, פיקוח ותיווך',
    description: 'מחפשים חברת נדל"ן באזור השרון? קבוצת קורקוס, שמשרדה בהוד השרון, מלווה פרויקטים ועסקאות: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים, תיווך ושיווק נכסים.',
  },
  '/hod-hasharon/bniya-vepikuach': {
    title: 'חברת בנייה ופיקוח בהוד השרון',
    description: 'קבוצת קורקוס, רחוב הנגר 24 בהוד השרון: בנייה דרך ראיתה ופיקוח מטעם בעל הבית דרך שכינתא, בשתי זרועות נפרדות. בתים פרטיים, וילות ובנייני מגורים.',
  },
  '/villas-sharon': {
    title: 'בניית וילות ובתים פרטיים בהוד השרון ובאזור המרכז',
    description: 'קבוצת קורקוס בונה וילות ובתים פרטיים בהוד השרון: שתי וילות עם בריכה ביורדי הים 3 בגרינברג, וארבע יחידות דו משפחתיות בהנרייטה סאלד 22-24 במערב העיר.',
  },
  '/real-estate-calculators': {
    title: 'מחשבון משכנתא ומחשבון תשואה לנדל"ן',
    description: 'מחשבון החזר חודשי למשכנתא לפי לוח שפיצר ומחשבון תשואת שכירות לנכס להשקעה, כלים חינמיים עם הסברים ברורים, מבית קבוצת קורקוס.',
  },
  '/real-estate-glossary': {
    title: 'מילון מונחי נדל"ן',
    description: 'מה זה תב"ע? מה ההבדל בין מס רכישה למס שבח? מילון מונחי הנדל"ן של קבוצת קורקוס: הגדרות ברורות לכל מונחי המפתח בתכנון, עסקאות, מימון ובנייה.',
  },
  '/livy-yazamim': {
    title: 'ליווי יזמי נדל"ן',
    description: 'תוכנית מנטורינג ליזמי נדל"ן צעירים עם שלומי קורקוס וצוות קבוצת קורקוס: ידע, כלים ופרקטיקה מהיום יום של התעשייה, על בסיס שלושים שנות ניסיון בשטח.',
  },
  '/yazamut-nadlan': {
    title: 'המדריך ליזמות נדל"ן',
    description: 'פרשנות שבועית ועניינית על יזמות נדל"ן בישראל מבית קבוצת קורקוס: התחדשות עירונית, מימון, רגולציה, קרקע ומגמות שוק, מנקודת המבט של יזם.',
  },
  '/constructions': {
    title: 'המדריך לתהליך הבנייה',
    description: 'המדריך לתהליך הבנייה של קבוצת קורקוס: שלבי ביצוע, בטיחות, איכות וליקויים, רישוי וניהול אתר. מה חשוב לדעת בכל שלב בבניית בית או פרויקט מגורים.',
  },
  '/construction-supervision': {
    title: 'המדריך לפיקוח בנייה',
    description: 'המדריך לפיקוח בנייה של שכינתא, זרוע הפיקוח של קבוצת קורקוס: בקרת איכות, פיקוח ביצוע, ליקויים ובדק, ניהול תקציב וסיכונים בפרויקט בנייה.',
  },
  '/real-estate-guide': {
    title: 'המדריך לרוכש ולמוכר',
    description: 'המדריך לרוכש ולמוכר דירה: מכירה, רכישה, השכרה, השקעות ומשא ומתן. מה חשוב לדעת לפני שחותמים, מנקודת המבט של מי שמלווה עסקאות נדל"ן בפועל.',
  },
  '/madrich-yazamim': {
    title: 'המדריך ליזמי נדל"ן צעירים',
    description: 'המדריך ליזמי נדל"ן צעירים: כתבות מניסיון ישיר בשטח לפי עשרת שלבי תוכנית הליווי, מאיתור העסקה הראשונה ועד מסירת המפתח ובניית מוניטין.',
  },
  '/shelot-ve-tshuvot': {
    title: 'שאלות ותשובות על בנייה, פיקוח ויזמות נדל"ן',
    description: 'תשובות קצרות על בניית בית פרטי, פיקוח בנייה, בדיקת בטון, תקופת בדק, יזמות נדל"ן ועסקאות, עם קישור לתשובה המלאה בכל שאלה. מבית קבוצת קורקוס, הוד השרון.',
  },
  '/accessibility': {
    title: 'הצהרת נגישות',
    description: 'הצהרת הנגישות של אתר קבוצת קורקוס: התאמות הנגישות באתר לפי תקן ישראלי 5568 ברמה AA, תפריט נגישות, ודרכים לפנות אלינו בנושא נגישות.',
  },
  '/privacy': {
    title: 'מדיניות פרטיות',
    description: 'מדיניות הפרטיות של אתר קבוצת קורקוס: איזה מידע נאסף באתר, לאיזו מטרה, איך הוא נשמר ומי נחשף אליו, והזכויות שלכם לפי חוק הגנת הפרטיות.',
  },
  '/terms': {
    title: 'תקנון ותנאי שימוש',
    description: 'תנאי השימוש באתר קבוצת קורקוס: אופי המידע המוצג באתר ומגבלותיו, קניין רוחני בתכנים ובתמונות, אחריות, והגבלות השימוש באתר ובשירותיו.',
  },
}

/* פירורי לחם לעמודים הקבועים. עמוד שלא מופיע כאן מקבל בית › כותרת העמוד. */
export const PAGE_CRUMBS = {
  '/': [HOME_CRUMB],
  '/team': [HOME_CRUMB, { name: 'אודות הקבוצה', path: '/about' }, { name: 'הצוות שמאחורי קורקוס', path: '/team' }],
  '/careers': [HOME_CRUMB, { name: 'אודות הקבוצה', path: '/about' }, { name: 'דרושים', path: '/careers' }],
  '/livy-yazamim': [HOME_CRUMB, { name: 'ליווי יזמי נדל"ן', path: '/livy-yazamim' }],
}

/* מרכז שאלות ותשובות: FAQPage רק מהשאלות שמוצגות בעמוד, ופירורי לחם.
   משמש גם את העמוד החי (FaqHub.jsx) וגם את ה-prerender. */
export function faqHubLd(groups, path = '/shelot-ve-tshuvot') {
  const items = groups.flatMap((g) => g.items)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    breadcrumbLd([HOME_CRUMB, { name: 'שאלות ותשובות', path }]),
  ]
}

export const metaForPath =(path) => PAGE_META[String(path || '').replace(/(.)\/$/, '$1')] || null
