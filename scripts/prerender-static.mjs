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
      `<div class="ssr" dir="rtl">${bodyHtml}</div>`
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
    ['איזו חברה בונה וילות ובתים פרטיים באזור השרון?', 'קורקוס גרופ, שמשרדה ברחוב הנגר 24 בהוד השרון, בונה בתים פרטיים ווילות באזור השרון. הקבוצה מקימה מתחמי מגורים בהוד השרון, ביניהם חנקין 41 בשכונת מגדיאל, הנרייטה סאלד ויורדי הים. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא.'],
    ['מה מאפיין את הבתים הפרטיים שאתם בונים?', 'הבתים מתוכננים בשניים ובשלושה מפלסים, חלקם עם בריכת שחייה פרטית, ונבנים כחלק ממתחם מגורים מתוכנן ולא כבית בודד. בפרויקט חנקין 41 כל אחת משש היחידות נבנית בשני מפלסים עם בריכה פרטית.'],
    ['באילו יישובים אתם בונים?', 'מרכז הפעילות הוא הוד השרון ואזור השרון. הקבוצה פועלת גם בגוש דן ובמרכז, ומלווה פרויקטים נבחרים ביישובים נוספים.'],
    ['מי מבצע את הבנייה בפועל ומי מפקח עליה?', 'הביצוע נעשה על ידי ראיתה, זרוע הביצוע של קורקוס גרופ. הניהול והפיקוח נעשים על ידי שכינתא, זרוע הניהול והפיקוח של הקבוצה. שתי הזרועות הן חלק מאותה קבוצה, כך שהאחריות נשארת בכתובת אחת.'],
  ]
  done.push(renderPage({
    path: '/villas-sharon',
    title: 'בניית וילות ובתים פרטיים בהוד השרון ובשרון',
    description: 'מחפשים חברה שבונה וילות ובתים פרטיים באזור השרון? קורקוס גרופ מהוד השרון מקימה מתחמי מגורים של בתים רב מפלסיים עם בריכה פרטית, בביצוע ראיתה ובפיקוח שכינתא.',
    jsonLd: [faqLd(villaFaqs, (f) => f), breadcrumbLd([{ name: BRAND, path: '/' }, { name: 'בניית וילות ובתים פרטיים בשרון', path: '/villas-sharon' }])],
    bodyHtml:
      `<h1>בניית וילות ובתים פרטיים בהוד השרון ובשרון</h1>` +
      `<p>קורקוס גרופ היא קבוצת נדל"ן מהוד השרון שבונה בתים פרטיים ווילות באזור השרון. הקבוצה מקימה מתחמי מגורים של בתים רב מפלסיים, חלקם עם בריכת שחייה פרטית, וביניהם הפרויקטים בחנקין 41 בשכונת מגדיאל, בהנרייטה סאלד וביורדי הים בהוד השרון. הביצוע נעשה על ידי ראיתה, זרוע הביצוע של הקבוצה, והפיקוח על ידי שכינתא, זרוע הניהול והפיקוח.</p>` +
      `<h2>מתחמי הבתים הפרטיים שאנחנו מקימים</h2>` +
      `<ul><li><b>חנקין 41, שכונת מגדיאל:</b> שש יחידות דיור, כל יחידה בשני מפלסים ועם בריכת שחייה פרטית.</li>` +
      `<li><b>הנרייטה סאלד, הוד השרון:</b> פרויקט מגורים בשכונת הדר, בתכנון מוקפד ובסטנדרט הגימור של הקבוצה.</li>` +
      `<li><b>יורדי הים, הוד השרון:</b> פרויקט מגורים נוסף שהקבוצה מקימה בהוד השרון.</li></ul>` +
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
