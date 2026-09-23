/* ============================================================
   Prerender סטטי, רץ אחרי vite build.
   האתר הוא SPA: סורקים שלא מריצים JavaScript (חלק מסורקי ה-AI
   ומנועי חיפוש משניים) רואים עמוד ריק. הסקריפט מייצר עבור כל עמוד
   תוכן קובץ dist/<route>/index.html עם:
   - title / description / canonical / Open Graph נכונים לעמוד
   - Structured Data (Article / FAQPage / DefinedTermSet / Breadcrumb)
   - תוכן העמוד עצמו כ-HTML קריא בתוך #root
   Vercel מגיש קבצים מהדיסק לפני ה-rewrite ל-index.html, כך שהסורק
   מקבל HTML מלא, בעוד React מחליף את התוכן בגרסה החיה בטעינה.
   כל הנתונים נמשכים מקבצי המקור בזמן build, אפס תחזוקה ידנית.
   ============================================================ */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const SITE = 'https://www.kurkoos-group.co.il'
const BRAND = 'קורקוס גרופ'

if (!existsSync(join(dist, 'index.html'))) {
  console.error('prerender: dist/index.html לא נמצא, הריצו vite build קודם')
  process.exit(1)
}
const baseHtml = readFileSync(join(dist, 'index.html'), 'utf8')

/* ---------- עזרים ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ldJson = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

/* המרת markdown מינימלית (##, ###, רשימות, מודגש) ל-HTML קריא */
function mdToHtml(md) {
  const out = []
  let list = null
  const flushList = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null } }
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  for (const rawBlock of String(md || '').split(/\n{2,}/)) {
    for (const line of rawBlock.split('\n')) {
      const l = line.trim()
      if (!l) continue
      if (l.startsWith('### ')) { flushList(); out.push(`<h3>${inline(l.slice(4))}</h3>`) }
      else if (l.startsWith('## ')) { flushList(); out.push(`<h2>${inline(l.slice(3))}</h2>`) }
      else if (l.startsWith('- ') || l.startsWith('* ')) { (list ||= []).push(`<li>${inline(l.slice(2))}</li>`) }
      else { flushList(); out.push(`<p>${inline(l)}</p>`) }
    }
    flushList()
  }
  return out.join('\n')
}

const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}${it.path}` })),
})
const faqLd = (faqs, pick = (f) => [f.q, f.a]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => { const [q, a] = pick(f); return { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } } }),
})

/* בניית עמוד: החלפת ה-head והזרקת תוכן סטטי ל-#root */
/* קישורי הניווט של האתר, בתוך ה-HTML הסטטי.
   הפוטר האמיתי מרונדר ע"י React, ולכן סורק שלא מריץ JavaScript לא רואה
   אף קישור פנימי בעמודים האלה. עמוד ללא קישורים נכנסים נסרק לעתים רחוקות.
   הסדר כאן הוא סדר החשיבות המסחרית, זהה ל-SiteNavigationElement שב-index.html:
   העמודים שאנחנו רוצים שיופיעו כקישורי אתר בתוצאות החיפוש הם הראשונים. */
const SITE_LINKS =
  `<nav aria-label="ניווט באתר"><h2>עמודים באתר</h2><ul>` +
  [
    ['/', 'דף הבית'],
    ['/projects', 'הפרויקטים'],
    ['/villas-sharon', 'בניית וילות ובתים פרטיים בשרון'],
    ['/real-estate-sharon', 'נדל"ן בהוד השרון והשרון'],
    ['/divisions/development', 'יזמות נדל"ן'],
    ['/divisions/execution', 'ביצוע ובנייה'],
    ['/divisions/supervision', 'ניהול ופיקוח פרויקטים'],
    ['/divisions/brokerage', 'תיווך ושיווק נכסים'],
    ['/team', 'הצוות שמאחורי קורקוס'],
    ['/about', 'אודות הקבוצה'],
    ['/livy-yazamim', 'ליווי יזמי נדל"ן'],
    ['/real-estate-glossary', 'מילון מונחי נדל"ן'],
    ['/real-estate-calculators', 'מחשבוני נדל"ן'],
  ].map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('') +
  `</ul></nav>`

function renderPage({ path, title, description, ogType = 'website', jsonLd = [], bodyHtml = '' }) {
  const fullTitle = `${title} | ${BRAND}`
  const url = SITE + path
  let html = baseHtml
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`)
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(fullTitle)}$2`)
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
  html = html.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${esc(ogType)}$2`)
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(fullTitle)}$2`)
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  if (jsonLd.length) html = html.replace('</head>', jsonLd.map(ldJson).join('\n') + '\n</head>')
  if (bodyHtml) {
    /* תוכן סטטי קריא במקום מסך הפתיחה, React מחליף אותו בגרסה החיה */
    const staticBlock =
      `<style>.ssr{max-width:760px;margin:0 auto;padding:24px 20px;font-family:system-ui,sans-serif;line-height:1.75;color:#16202e}.ssr h1{font-size:1.7rem;line-height:1.3}.ssr h2{font-size:1.25rem;margin-top:1.6em}.ssr h3{font-size:1.05rem}.ssr a{color:#16688c}</style>` +
      `<div class="ssr" dir="rtl">${bodyHtml}${SITE_LINKS}</div>`
    html = html.replace(/(<div id="root">)[\s\S]*?(<\/div>\s*<\/body>)/, `$1${staticBlock}$2`)
  }
  const dir = join(dist, ...path.split('/').filter(Boolean))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  return path
}

const done = []

/* ---------- 1. כתבות הטורים ---------- */
const COLUMNS = {
  yazamut: { route: '/yazamut-nadlan', label: 'טור יזמות נדל״ן', index: 'המדריך ליזמות נדל"ן' },
  constructions: { route: '/constructions', label: 'המדריך לתהליך הבנייה', index: 'המדריך לתהליך הבנייה' },
  supervision: { route: '/construction-supervision', label: 'המדריך לפיקוח בנייה', index: 'המדריך לפיקוח בנייה' },
  brokerage: { route: '/real-estate-guide', label: 'המדריך לרוכש ולמוכר', index: 'המדריך לרוכש ולמוכר' },
  mentorguide: { route: '/madrich-yazamim', label: 'המדריך ליזמי נדל"ן צעירים', index: 'המדריך ליזמי נדל"ן צעירים' },
}

for (const [dirName, col] of Object.entries(COLUMNS)) {
  const colDir = join(root, 'src', 'content', dirName)
  let files = []
  try { files = readdirSync(colDir).filter((f) => f.endsWith('.js')) } catch { continue }
  const articles = []
  for (const f of files) {
    try {
      const mod = await import(pathToFileURL(join(colDir, f)).href)
      const a = mod.default
      if (a?.slug && a.published !== false) articles.push(a)
    } catch { /* קובץ בעייתי, מדלגים */ }
  }
  articles.sort((a, b) => String(b.date).localeCompare(String(a.date)))

  for (const a of articles) {
    const path = `${col.route}/${a.slug}`
    const body =
      `<h1>${esc(a.title)}</h1>` +
      `<p><em>${esc(col.label)}${a.date ? ` · ${esc(a.date)}` : ''}${a.readingTime ? ` · ${esc(a.readingTime)}` : ''}</em></p>` +
      (a.excerpt ? `<p><strong>${esc(a.excerpt)}</strong></p>` : '') +
      mdToHtml(a.body) +
      `<p><a href="${col.route}">לכל הכתבות ב${esc(col.index)}</a> · <a href="/">${BRAND}</a></p>`
    done.push(renderPage({
      path,
      title: a.metaTitle || `${a.title} · ${col.label}`,
      description: a.metaDescription || a.excerpt || a.title,
      ogType: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org', '@type': 'Article',
          headline: a.title, description: a.excerpt || undefined,
          datePublished: a.date, dateModified: a.date,
          author: { '@type': 'Organization', name: BRAND },
          publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: `${SITE}/kurkoos-logo.svg` } },
          mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + path },
          inLanguage: 'he',
        },
        breadcrumbLd([{ name: BRAND, path: '/' }, { name: col.index, path: col.route }, { name: a.title, path }]),
      ],
      bodyHtml: body,
    }))
  }

  /* עמוד האינדקס של הטור, רשימת כל הכתבות כקישורים קריאים */
  const listHtml =
    `<h1>${esc(col.index)}</h1>` +
    `<p>כתבות ומדריכים מקצועיים מבית ${BRAND}.</p>` +
    articles.map((a) =>
      `<h2><a href="${col.route}/${a.slug}">${esc(a.title)}</a></h2><p>${esc(a.excerpt || '')}</p>`
    ).join('\n')
  done.push(renderPage({
    path: col.route,
    title: col.index,
    description: `${col.index} מבית ${BRAND}: ${articles.slice(0, 3).map((a) => a.title).join(' · ')}`,
    jsonLd: [breadcrumbLd([{ name: BRAND, path: '/' }, { name: col.index, path: col.route }])],
    bodyHtml: listHtml,
  }))
}

/* ---------- 2. מילון המונחים ---------- */
{
  const { glossaryGroups } = await import(pathToFileURL(join(root, 'src/data/glossary.js')).href)
  const terms = glossaryGroups.flatMap((g) => g.terms)
  const body =
    `<h1>מילון מונחי נדל"ן</h1>` +
    `<p>הגדרות ברורות למונחי המפתח בעולם הנדל"ן, התכנון והבנייה בישראל, מבית ${BRAND}.</p>` +
    glossaryGroups.map((g) =>
      `<h2>${esc(g.title)}</h2>` + g.terms.map((t) => `<h3 id="${t.id}">${esc(t.term)}</h3><p>${esc(t.def)}</p>`).join('\n')
    ).join('\n')
  done.push(renderPage({
    path: '/real-estate-glossary',
    title: 'מילון מונחי נדל"ן',
    description: 'מה זה תב"ע? מה ההבדל בין מס רכישה למס שבח? מילון מונחי הנדל"ן של קורקוס גרופ: הגדרות ברורות לכל מונחי המפתח בתכנון, עסקאות, מימון ובנייה.',
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'DefinedTermSet',
        name: 'מילון מונחי נדל"ן', url: `${SITE}/real-estate-glossary`,
        hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.term, description: t.def, url: `${SITE}/real-estate-glossary#${t.id}` })),
      },
      breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'מילון מונחי נדל"ן', path: '/real-estate-glossary' }]),
    ],
    bodyHtml: body,
  }))
}

/* ---------- 3. עמודי הדיוויזיות (שירותים) ---------- */
{
  const { divisions } = await import(pathToFileURL(join(root, 'src/data/divisions.js')).href)
  for (const d of divisions) {
    const path = `/divisions/${d.slug}`
    const faqs = d.faqs || []
    const body =
      `<h1>${esc(d.hero?.title?.he || d.menuTitle.he)}</h1>` +
      `<p>${esc(d.intro.he)}</p>` +
      (d.why?.length ? `<h2>למה ${esc(d.name.he)}</h2><ul>` + d.why.map((w) => `<li><strong>${esc(w.title.he)}</strong>: ${esc(w.desc.he)}</li>`).join('') + '</ul>' : '') +
      (faqs.length ? '<h2>שאלות נפוצות</h2>' + faqs.map((f) => `<h3>${esc(f.q.he)}</h3><p>${esc(f.a.he)}</p>`).join('\n') : '') +
      `<p><a href="/#contact">דברו איתנו</a> · <a href="/projects">הפרויקטים שלנו</a></p>`
    done.push(renderPage({
      path,
      title: d.menuTitle.he,
      description: d.intro.he,
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'Service', name: d.menuTitle.he, description: d.intro.he, provider: { '@id': `${SITE}/#organization` }, areaServed: { '@type': 'Place', name: 'אזור השרון והמרכז' }, url: SITE + path },
        ...(faqs.length ? [faqLd(faqs, (f) => [f.q.he, f.a.he])] : []),
        breadcrumbLd([{ name: BRAND, path: '/' }, { name: d.menuTitle.he, path }]),
      ],
      bodyHtml: body,
    }))
  }
}

/* ---------- 4. עמוד השרון, מחשבונים, מנטורינג ---------- */
{
  const sharonFaqs = [
    ['אילו שירותי נדל"ן קורקוס גרופ מציעה באזור השרון?', 'קורקוס גרופ מאגדת ארבע זרועות פעילות: יזמות נדל"ן (קורקוס יזמות), ביצוע ובנייה (ראיתה), ניהול ופיקוח פרויקטים (שכינתא) ותיווך ושיווק נכסים (אפיק הנחל).'],
    ['איפה נמצא המשרד שלכם?', 'המשרד שלנו נמצא ברחוב הנגר 24 בהוד השרון, מגדלי Amy קומה 2. שעות הפעילות: ימים א׳ עד ה׳ בין 9:00 ל-18:00.'],
    ['באילו אזורים אתם פועלים?', 'הבסיס שלנו בהוד השרון והפעילות מתרכזת באזור השרון והמרכז, לצד פרויקטים נבחרים בשיווק ובליווי ברחבי הארץ.'],
  ]
  done.push(renderPage({
    path: '/real-estate-sharon',
    title: 'נדל"ן בהוד השרון והשרון: יזמות, ביצוע, פיקוח ותיווך',
    description: 'קורקוס גרופ, שמשרדה בהוד השרון, מלווה פרויקטים ועסקאות בשרון והמרכז: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים, תיווך ושיווק נכסים.',
    jsonLd: [faqLd(sharonFaqs, (f) => f), breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'נדל"ן בהוד השרון והשרון', path: '/real-estate-sharon' }])],
    bodyHtml:
      `<h1>נדל"ן בהוד השרון והשרון</h1>` +
      `<p>קורקוס גרופ היא קבוצת נדל"ן שמשרדה ברחוב הנגר 24 בהוד השרון. הקבוצה פועלת בארבעה תחומים משלימים: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים, ותיווך ושיווק נכסים, עם פעילות באזור השרון והמרכז ופרויקטים נבחרים ברחבי הארץ.</p>` +
      `<ul><li><a href="/divisions/development">יזמות נדל"ן</a></li><li><a href="/divisions/execution">ביצוע ובנייה</a></li><li><a href="/divisions/supervision">ניהול ופיקוח פרויקטים</a></li><li><a href="/divisions/brokerage">תיווך ושיווק נכסים</a></li></ul>` +
      sharonFaqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n'),
  }))

  const villaFaqs = [
    ['איזו חברה בונה וילות ובתים פרטיים באזור השרון?', 'קורקוס גרופ, שמשרדה ברחוב הנגר 24 בהוד השרון, בונה וילות ובתים פרטיים בהוד השרון ובאזור השרון. כיום הקבוצה מקימה את יורדי הים 3 בשכונת גרינברג, שתי וילות פרטיות על מגרשים של למעלה מחצי דונם עם בריכת שחייה 4x9 מטר, ואת הנרייטה סאלד 22-24 במערב הוד השרון, ארבע יחידות דו משפחתיות לשמונה משפחות עם בריכה פרטית לכל יחידה. הביצוע נעשה על ידי ראיתה והפיקוח על ידי שכינתא.'],
    ['כמה גדולים הבתים ומה הם כוללים?', 'הווילות נבנות על כ-300 מ"ר בנוי בשלושה מפלסים. בהנרייטה סאלד כל בית כולל 7 חדרים, 4 חדרי רחצה ושתי מרפסות, עם כניסה נפרדת למפלס המרתף שמאפשרת יחידה עצמאית, וחצר פרטית עם בריכה 3x6 מטר. ביורדי הים 3 כל בית כולל קומת מרתף עם שתי סוויטות פרטיות, חדר גג, וגינה רחבה עם בריכה 4x9 מטר.'],
    ['האם המגרש נרשם על שמי בטאבו?', 'בפרויקט הנרייטה סאלד 22-24 כל יחידה מקבלת מגרש בשטח 380 מ"ר הרשום בטאבו כבעלות פרטית. ביורדי הים 3 מדובר במגרשים של למעלה מחצי דונם לכל יחידה.'],
    ['באילו שכונות בהוד השרון אתם בונים?', 'גרינברג, שם מוקם יורדי הים 3. מערב הוד השרון, שם מוקם הנרייטה סאלד 22-24. ומגדיאל, שם מוקם פרויקט הבוטיק חנקין 41.'],
    ['מי מתכנן ומי מבצע את הפרויקטים?', 'הנרייטה סאלד 22-24 וחנקין 41 מתוכננים על ידי האדריכל בני נדלסטיצ\'ר, ויורדי הים 3 על ידי האדריכל רמי שחר. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של קורקוס גרופ, והפיקוח על ידי שכינתא.'],
    ['מה הסטטוס של הפרויקטים היום?', 'הנרייטה סאלד 22-24 וחנקין 41 נמצאים בבנייה, והנרייטה סאלד מבוצע תחת היתרי בנייה מאושרים. יורדי הים 3 נמצא בשלב התכנון.'],
  ]
  done.push(renderPage({
    path: '/villas-sharon',
    title: 'בניית וילות ובתים פרטיים בהוד השרון ובשרון',
    description: 'קורקוס גרופ בונה וילות ובתים פרטיים בהוד השרון: יורדי הים 3 בגרינברג, שתי וילות על חצי דונם עם בריכה, והנרייטה סאלד 22-24 במערב העיר, ארבע יחידות דו משפחתיות עם בריכה ומגרש בטאבו.',
    jsonLd: [faqLd(villaFaqs, (f) => f), breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'בניית וילות ובתים פרטיים בשרון', path: '/villas-sharon' }])],
    bodyHtml:
      `<h1>בניית וילות ובתים פרטיים בהוד השרון ובשרון</h1>` +
      `<p>קורקוס גרופ היא קבוצת נדל"ן מהוד השרון הבונה וילות ובתים פרטיים באזור השרון. הקבוצה מקימה כיום את יורדי הים 3 בשכונת גרינברג, את הנרייטה סאלד 22-24 במערב הוד השרון ואת חנקין 41 במגדיאל. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא.</p>` +
      `<h2>יורדי הים 3, שכונת גרינברג</h2>` +
      `<p>שתי וילות פרטיות על מגרשים של למעלה מחצי דונם לכל יחידה. כל בית כ-300 מ"ר בנוי בשלושה מפלסים, עם קומת מרתף הכוללת שתי סוויטות פרטיות, חדר גג, וגינה פרטית רחבה עם בריכת שחייה מאושרת 4x9 מטר. אדריכל: רמי שחר. סטטוס: בתכנון.</p>` +
      `<h2>הנרייטה סאלד 22-24, מערב הוד השרון</h2>` +
      `<p>מתחם אינטימי של ארבע יחידות דו משפחתיות לשמונה משפחות, עם כניסה פרטית ומאובטחת לדיירי המתחם בלבד. לכל יחידה מגרש 380 מ"ר הרשום בטאבו כבעלות פרטית, כ-300 מ"ר בנוי בשלושה מפלסים הכוללים 7 חדרים, 4 חדרי רחצה ו-2 מרפסות, כניסה נפרדת למפלס המרתף וחצר פרטית עם בריכת שחייה 3x6 מטר. מבוצע תחת היתרי בנייה מאושרים. אדריכל: בני נדלסטיצ\'ר. סטטוס: בבנייה.</p>` +
      `<h2>חנקין 41, שכונת מגדיאל</h2>` +
      `<p>פרויקט בוטיק אקסקלוסיבי של שש דירות יוקרה בבניין אחד, עם תכנון אדריכלי מוקפד, מרפסות מרווחות, שתי חניות נפרדות בחניון תת קרקעי לכל דירה וגינה פרטית בשטח כ-150 מ"ר. אדריכל: בני נדלסטיצ\'ר. סטטוס: בבנייה.</p>` +
      `<ul><li><a href="/divisions/execution">ביצוע ובנייה</a></li><li><a href="/divisions/supervision">ניהול ופיקוח פרויקטים</a></li><li><a href="/projects">כל הפרויקטים</a></li></ul>` +
      villaFaqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n'),
  }))

  const calcFaqs = [
    ['מה זה לוח שפיצר?', 'לוח שפיצר הוא שיטת ההחזר הנפוצה ביותר למשכנתאות בישראל: ההחזר החודשי קבוע לאורך התקופה, כאשר בתחילת הדרך רובו ריבית ומעט קרן, והיחס מתהפך בהדרגה עם השנים.'],
    ['איך מחשבים תשואה משכירות?', 'תשואה שנתית ברוטו היא סך שכר הדירה השנתי חלקי מחיר הנכס, כפול 100. לתשואה נטו מפחיתים מההכנסה השנתית את ההוצאות השוטפות.'],
    ['כמה הון עצמי צריך כדי לקנות דירה?', 'לפי הוראות בנק ישראל, לרוכשי דירה יחידה נדרש הון עצמי של 25% לפחות, למשפרי דיור 30%, ולמשקיעים 50%.'],
  ]
  done.push(renderPage({
    path: '/real-estate-calculators',
    title: 'מחשבון משכנתא ומחשבון תשואה לנדל"ן',
    description: 'מחשבון החזר חודשי למשכנתא לפי לוח שפיצר ומחשבון תשואת שכירות לנכס להשקעה, כלים חינמיים עם הסברים ברורים, מבית קורקוס גרופ.',
    jsonLd: [faqLd(calcFaqs, (f) => f), breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'מחשבוני נדל"ן', path: '/real-estate-calculators' }])],
    bodyHtml:
      `<h1>מחשבוני נדל"ן</h1><p>מחשבון החזר חודשי למשכנתא לפי לוח שפיצר ומחשבון תשואת שכירות. החישוב מתבצע בדפדפן, להערכה ראשונית בלבד ואינו ייעוץ פיננסי.</p>` +
      calcFaqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n'),
  }))

  /* שלושת העמודים המסחריים המרכזיים לא היו מרונדרים מראש, ולכן סורק שלא
     מריץ JavaScript ראה בהם מעטפת ריקה בלי כותרת, בלי תיאור ובלי קישורים.
     עמוד כזה כמעט לא נבחר כקישור אתר בתוצאות החיפוש. */
  done.push(renderPage({
    path: '/projects',
    title: 'פרויקטים בהוד השרון ובשרון',
    description: 'הפרויקטים של קורקוס גרופ בהוד השרון ובאזור השרון: בנייה למגורים, וילות ובתים פרטיים, ופרויקטים בליווי ובפיקוח הקבוצה, מקרקע ועד מסירת מפתח.',
    jsonLd: [breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'הפרויקטים', path: '/projects' }])],
    bodyHtml:
      `<h1>הפרויקטים של קורקוס גרופ</h1>` +
      `<p>קורקוס גרופ מתכננת, בונה ומלווה פרויקטים בהוד השרון ובאזור השרון. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא.</p>` +
      `<h2>הפרויקטים שבבנייה ובתכנון</h2>` +
      `<ul>` +
      `<li><a href="/villas-sharon">הנרייטה סאלד 22-24, מערב הוד השרון</a>: ארבע יחידות דו משפחתיות לשמונה משפחות, מגרש 380 מ"ר בטאבו לכל יחידה ובריכה פרטית. בבנייה.</li>` +
      `<li><a href="/villas-sharon">חנקין 41, שכונת מגדיאל</a>: פרויקט בוטיק של שש דירות יוקרה בבניין אחד, שתי חניות תת קרקעיות לכל דירה. בבנייה.</li>` +
      `<li><a href="/villas-sharon">יורדי הים 3, שכונת גרינברג</a>: שתי וילות פרטיות על מגרשים של למעלה מחצי דונם, עם בריכת שחייה 4x9 מטר. בתכנון.</li>` +
      `</ul>` +
      `<h2>תחומי הפעילות</h2>` +
      `<ul><li><a href="/divisions/development">יזמות נדל"ן</a></li><li><a href="/divisions/execution">ביצוע ובנייה</a></li><li><a href="/divisions/supervision">ניהול ופיקוח פרויקטים</a></li><li><a href="/divisions/brokerage">תיווך ושיווק נכסים</a></li></ul>`,
  }))

  done.push(renderPage({
    path: '/about',
    title: 'אודות הקבוצה',
    description: 'קורקוס גרופ היא קבוצת נדל"ן הפועלת ביזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים: מקרקע ועד מסירת מפתח, עם פעילות באזור השרון והמרכז.',
    jsonLd: [breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'אודות הקבוצה', path: '/about' }])],
    bodyHtml:
      `<h1>אודות קורקוס גרופ</h1>` +
      `<p>קורקוס גרופ היא קבוצת נדל"ן שמשרדה ברחוב הנגר 24 בהוד השרון. הקבוצה מאגדת ארבע זרועות פעילות שמלוות פרויקט מקרקע ועד מסירת מפתח: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים, ותיווך ושיווק נכסים.</p>` +
      `<ul><li><a href="/divisions/development">יזמות נדל"ן</a></li><li><a href="/divisions/execution">ביצוע ובנייה</a></li><li><a href="/divisions/supervision">ניהול ופיקוח פרויקטים</a></li><li><a href="/divisions/brokerage">תיווך ושיווק נכסים</a></li><li><a href="/team">הצוות שמאחורי קורקוס</a></li><li><a href="/projects">הפרויקטים</a></li></ul>`,
  }))

  /* עמוד הצוות. אנשים בעלי שם ותפקיד הם סימן אמון מרכזי בעיני מנוע חיפוש,
     ובמקרה שלנו גם ראיה לזהות: שלושה מארבעת התפקידים הם ניהול עבודה וביצוע
     בשטח. עד עכשיו הסורק ראה כאן פסקה כללית בלי שם אחד. */
  const { team: teamMembers } = await import(pathToFileURL(join(root, 'src/data/team.js')).href)
  const he = (v) => (v && typeof v === 'object' ? (v.he || v.en || '') : String(v || '')).trim()
  // סדר התצוגה במערך הוא שמאל לימין על המסך, וכאן רוצים את הבכיר ראשון
  const teamOrdered = [...teamMembers].reverse()
  done.push(renderPage({
    path: '/team',
    title: 'הצוות שמאחורי קורקוס',
    description: `הצוות של קורקוס גרופ: ${teamOrdered.map((m) => `${he(m.name)}, ${he(m.role)}`).join('. ')}. מלווים כל פרויקט בהוד השרון ובשרון מהתכנון ועד מסירת המפתח.`.slice(0, 300),
    jsonLd: [
      breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'אודות הקבוצה', path: '/about' }, { name: 'הצוות שמאחורי קורקוס', path: '/team' }]),
      ...teamOrdered.map((m) => ({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: he(m.name),
        jobTitle: he(m.role),
        description: he(m.bio) || undefined,
        image: m.photo && m.photo.startsWith('/') ? `${SITE}${m.photo}` : (m.photo || undefined),
        worksFor: { '@type': 'Organization', name: BRAND, url: `${SITE}/` },
        url: `${SITE}/team`,
      })),
    ],
    bodyHtml:
      `<h1>הצוות שמאחורי קורקוס</h1>` +
      `<p>הצוות מלווה כל פרויקט של הקבוצה משלב התכנון, דרך הביצוע והפיקוח, ועד מסירת המפתח לדייר.</p>` +
      teamOrdered.map((m) =>
        `<h2>${esc(he(m.name))}, ${esc(he(m.role))}</h2>` +
        (he(m.bio) ? `<p>${esc(he(m.bio))}</p>` : '')
      ).join('\n') +
      `<ul><li><a href="/about">אודות הקבוצה</a></li><li><a href="/projects">הפרויקטים</a></li><li><a href="/divisions/execution">ביצוע ובנייה</a></li><li><a href="/livy-yazamim">ליווי יזמי נדל"ן</a></li></ul>`,
  }))

  /* עמודי הפרויקטים. התוכן שלהם מנוהל ב-CMS, ולכן הם נמשכים מ-Supabase
     בזמן ה-build (ב-Vercel יש רשת ומשתני סביבה). כך פרויקט חדש שנוצר
     בניהול מקבל עמוד מרונדר מראש בדפלוי הבא, בלי שום עדכון ידני כאן.
     בלי משתני סביבה, למשל בבנייה מקומית, פשוט מדלגים. אלה עמודי הכוונה
     הגבוהה ביותר באתר: מי שמחפש "הנרייטה סאלד הוד השרון" נוחת בדיוק כאן,
     ועד היום סורק בלי JavaScript ראה בהם מעטפת ריקה. */
  const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  let cmsProjects = []
  if (SB_URL && SB_KEY) {
    try {
      const r = await fetch(
        `${SB_URL.replace(/\/$/, '')}/rest/v1/projects?is_published=eq.true&is_archived=eq.false` +
        `&select=slug,name,location,subtitle,description,hero_image_url,status,address&order=sort_order.asc`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
      )
      if (r.ok) cmsProjects = await r.json()
      else console.warn(`prerender: שליפת הפרויקטים מה-CMS החזירה ${r.status}, מדלגים על עמודי הפרויקטים`)
    } catch (e) {
      console.warn('prerender: אין גישה ל-CMS, מדלגים על עמודי הפרויקטים:', e.message)
    }
  } else {
    console.warn('prerender: אין משתני סביבה של Supabase, מדלגים על עמודי הפרויקטים')
  }

  const txt = (v) => (v && typeof v === 'object' ? (v.he || v.en || '') : String(v || '')).trim()
  /* שמות הפרויקטים מגיעים מהניהול, ואין שום דבר שמונע שני פרויקטים באותו
     שם ובאותה עיר. בדיקת הכותרות שנוספה ל-check-routing מפילה את הבנייה על
     כותרת כפולה, ולכן מצב נתונים כזה בניהול היה מפיל את הדפלוי כולו. כאן
     מבדילים אוטומטית לפי ה-slug, כך שתוכן בניהול לא יכול לשבור פריסה. */
  const usedTitles = new Set()
  for (const p of cmsProjects) {
    const slug = String(p.slug || '').trim()
    const name = txt(p.name)
    // slug נכנס לנתיב קובץ. מקבלים רק צורה בטוחה, בלי לוכסנים או נקודות
    if (!slug || !name || !/^[A-Za-z0-9֐-׿_-]+$/.test(slug)) continue
    const city = txt(p.location)
    const sub = txt(p.subtitle)
    const desc = txt(p.description)
    let heading = city ? `${name}, ${city}` : name
    // מבדילים לפי הכתובת אם יש, ורק אם אין נופלים ל-slug
    if (usedTitles.has(heading)) heading = `${heading} (${txt(p.address) || slug})`
    if (usedTitles.has(heading)) continue   // גם זה תפוס: slug כפול, מדלגים
    usedTitles.add(heading)
    const lead = sub || desc || `פרויקט של קורקוס גרופ${city ? ` ב${city}` : ''}.`
    done.push(renderPage({
      path: `/projects/${slug}`,
      title: heading,
      description: `${lead.replace(/[.\s]+$/, '')}. ${name} הוא פרויקט של קורקוס גרופ: יזמות, ביצוע ופיקוח מקרקע ועד מסירת מפתח.`.slice(0, 300),
      jsonLd: [breadcrumbLd([
        { name: BRAND, path: '/' },
        { name: 'הפרויקטים', path: '/projects' },
        { name, path: `/projects/${slug}` },
      ])],
      bodyHtml:
        `<h1>${esc(heading)}</h1>` +
        (sub ? `<p>${esc(sub)}</p>` : '') +
        (desc && desc !== sub ? `<p>${esc(desc)}</p>` : '') +
        (txt(p.address) ? `<p>כתובת: ${esc(txt(p.address))}</p>` : '') +
        `<ul><li><a href="/projects">כל הפרויקטים</a></li><li><a href="/divisions/execution">ביצוע ובנייה</a></li><li><a href="/divisions/supervision">ניהול ופיקוח פרויקטים</a></li></ul>`,
    }))
  }

  /* שני עמודים שהיו ב-sitemap בלי HTML שסורק יכול לקרוא */
  done.push(renderPage({
    path: '/blog',
    title: 'בלוג קורקוס',
    description: 'תובנות, עדכונים וסיפורים מאחורי הקלעים של קורקוס גרופ: יזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים.',
    jsonLd: [breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'בלוג קורקוס', path: '/blog' }])],
    bodyHtml:
      `<h1>בלוג קורקוס</h1><p>תובנות, עדכונים וסיפורים מאחורי הקלעים של קבוצת קורקוס.</p>` +
      `<h2>הטורים והמדריכים של הקבוצה</h2>` +
      `<ul><li><a href="/yazamut-nadlan">המדריך ליזמות נדל"ן</a></li><li><a href="/constructions">המדריך לתהליך הבנייה</a></li><li><a href="/construction-supervision">המדריך לפיקוח בנייה</a></li><li><a href="/real-estate-guide">המדריך לרוכש ולמוכר</a></li><li><a href="/madrich-yazamim">המדריך ליזמי נדל"ן צעירים</a></li></ul>`,
  }))

  done.push(renderPage({
    path: '/careers',
    title: 'דרושים',
    description: 'קורקוס גרופ מחפשת אנשים מצוינים לתחומי היזמות, הביצוע, הפיקוח והתיווך. המשרדים בהנגר 24 בהוד השרון.',
    jsonLd: [breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'דרושים', path: '/careers' }])],
    bodyHtml:
      `<h1>דרושים בקורקוס גרופ</h1>` +
      `<p>אנחנו תמיד מחפשים אנשים מצוינים. הקבוצה פועלת ביזמות נדל"ן, ביצוע ובנייה, ניהול ופיקוח פרויקטים ותיווך ושיווק נכסים, מהמשרד ברחוב הנגר 24 בהוד השרון.</p>` +
      `<ul><li><a href="/about">אודות הקבוצה</a></li><li><a href="/team">הצוות שמאחורי קורקוס</a></li><li><a href="/projects">הפרויקטים</a></li></ul>`,
  }))

  const { faqs: mentorFaqs } = await import(pathToFileURL(join(root, 'src/data/mentorship.js')).href)
  done.push(renderPage({
    path: '/livy-yazamim',
    title: 'ליווי יזמי נדל"ן',
    description: 'תוכנית מנטורינג ליזמי נדל"ן צעירים עם שלומי קורקוס וצוות קורקוס גרופ: ידע, כלים ופרקטיקה מהיום יום של התעשייה, על בסיס שלושים שנות ניסיון בשטח.',
    jsonLd: [faqLd(mentorFaqs, (f) => [f.q.he, f.a.he]), breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'ליווי יזמי נדל"ן', path: '/livy-yazamim' }])],
    bodyHtml:
      `<h1>ליווי יזמי נדל"ן צעירים</h1>` +
      `<p>תוכנית מנטורינג שמעניקה ליזמים צעירים ידע, כלים ופרקטיקה מהיום יום של התעשייה, עם שלומי קורקוס וצוות קורקוס גרופ, שלושים שנה של ניסיון בשטח.</p>` +
      '<h2>שאלות נפוצות</h2>' + mentorFaqs.map((f) => `<h3>${esc(f.q.he)}</h3><p>${esc(f.a.he)}</p>`).join('\n'),
  }))
}

console.log(`prerender: נוצרו ${done.length} עמודים סטטיים`)
