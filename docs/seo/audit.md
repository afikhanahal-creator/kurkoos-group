# Audit SEO: kurkoos-group.co.il

תאריך: 11.10.2026 · שלב 1 בתוכנית ה-SEO (Audit לפני שינוי). המסמך לא משנה דבר באתר.

## על מה ה-Audit מבוסס, ומה חסר

| מקור | מה נבדק | מגבלה |
|---|---|---|
| `audit.json` | 101 עמודים שרונדרו מראש ב-`dist/`: Title, Description, Canonical, H1, ספירת H2/H3, מילים, קישורים | הגרסה הסטטית בלבד. הגרסה החיה של React יכולה להכיל יותר טקסט ותמונות. שדה ה-schema ב-audit.json מפספס בלוקים עם `data-prerender` (ראו בהמשך). |
| קוד המקור | `src/App.jsx`, `src/content/*`, `src/data/*`, `scripts/prerender-static.mjs`, `server/sitemap.js`, `vercel.json`, `public/robots.txt` | - |
| בדיקה ידנית ב-`dist/` | JSON-LD אמיתי בעמודי כתבה ושירות, `app-shell.html` | - |
| Search Console | **לא מחובר** | אין נתוני impressions, clicks, CTR, position, אינדוקס. השאילתות המדורגות נלקחו מסעיף 2 בבריף. השיוך שאילתה לעמוד הוא הסקה מהתוכן, וצריך לאמת אותו ב-GSC. |
| האתר החי | **לא נגיש מסביבת העבודה** (חסימת רשת) | לא נבדקו: sitemap בפועל, הפניות www ו-http, Core Web Vitals, עמודי פרויקט מה-CMS. |
| עמודי פרויקט `/projects/<slug>` | **לא נכללו ב-audit** | הם מרונדרים רק ב-build של Vercel, כשיש משתני Supabase. ה-slug שלהם לא ידוע מהמאגר. |

**תיקון לנתוני ה-audit:** לפי `audit.json`, בכל העמודים יש רק Organization/LocalBusiness/WebSite. בפועל ה-regex מפספס את הבלוקים שה-prerender מסמן ב-`data-prerender`. בדיקה ב-`dist/` מראה שיש Article ו-BreadcrumbList בכתבות, Service, FAQPage ו-BreadcrumbList בעמודי השירות, ו-DefinedTermSet במילון. ה-schema באתר טוב יותר ממה שה-audit מציג.

---

## 1. מה עובד

1. **Prerender סטטי לכל עמוד** עם Title, Description, Canonical ו-OG ייחודיים. סורק שלא מריץ JS מקבל תוכן מלא.
2. **בסיס on-page נקי:** בכל 101 העמודים יש H1 אחד, canonical שמצביע על העמוד עצמו בדומיין www, ואין noindex. אין Description כפול. כל העמודים כוללים OG.
3. **Structured Data נכון:** Organization/LocalBusiness עם כתובת אמיתית ו-geo. Article ו-BreadcrumbList בכל כתבה. Service ו-FAQ בעמודי השירות. Person בעמוד הצוות. DefinedTermSet במילון. אין דירוגים או ביקורות מומצאים.
4. **ניהול URL אחראי:** 18 הפניות 301 מ-slug ישנים (vercel.json). ה-build נכשל אם יש slug כפול. `trailingSlash: false` ו-`cleanUrls`.
5. **Sitemap דינמי ומפוצל:** עמודים, כתבות ותמונות בקבצים נפרדים. כתבות עם `published:false` או תאריך עתידי לא נכנסות.
6. **robots.txt תקין:** לא חוסם CSS, JS או תמונות. חוסם רק admin, engine ו-style-guide. סורקי AI מורשים, ויש `llms.txt` מפורט.
7. **שאילתות שכבר מדורגות נוחתות על עמודים מתאימים:** "קבלן לבניית בית פרטי" על `/kablan-bniya-bayit-prati`, "כמה עולה לבנות בית פרטי" על `/constructions/kama-ole-livnot-bayit-prati`, "פיקוח בנייה לבתים פרטיים" על `/construction-supervision/mefakeach-bniya-bayit-prati`, "תקופת בדק" על `/constructions/likuei-bniya-tkufat-bedek`, "איך מחשבים תשואה" על `/real-estate-guide/real-return-real-estate-investment`.
8. **מדידה קיימת:** אירועי `phone_click`, `whatsapp_click`, `email_click`, `cta_click`, `form_start`, `generate_lead`, `calculator_use` ו-`article_cta` נשלחים ל-GA.
9. **תוכן מקצועי עם קול אמיתי:** הכתבות כתובות מהשטח, בלי פתיחים גנריים, ובכוונה בלי מחירים מומצאים.
10. **עמודי הנחיתה נבדקים ב-build:** Title עד 60 תווים ו-Description באורך 150 עד 160 (prerender-static.mjs).

## 2. מה לא עובד (בקצרה)

1. כמעט אין קישורים פנימיים בתוך הכתבות: ל-50 מתוך 66 כתבות חיות אין אף קישור בגוף הטקסט.
2. כמה עמודים מתחרים על אותה כוונה: בית פרטי ווילות, פרויקטים בהוד השרון, פיקוח, יזמות.
3. שלוש שאילתות מדורגות על משפט בודד: "בדיקת פטיש שמידט", "זיהוי קונה רציני לדירה" ו"בדיקת בטון מחיר".
4. עמודי פרויקט (הכוונה הכי גבוהה באתר) תלויים ב-CMS בזמן build. כשה-CMS לא זמין, הם מקבלים את ה-Title וה-canonical של עמוד הבית.
5. Titles ארוכים: 40 עמודים מעל 60 תווים, 32 מעל 70.
6. עמודי האמון והעמודים המסחריים דקים: אודות, צוות, פרויקטים, השרון, מחשבונים.
7. אין עמודים ל-8 יעדים מתוך 38. ראו mapping.md.

---

## 3. בעיות טכניות לפי חומרה

### Critical

| # | בעיה | ראיה | השפעה | תיקון | שכבה |
|---|---|---|---|---|---|
| C1 | **מעטפת ה-SPA מצהירה שהיא עמוד הבית.** כל כתובת בלי קובץ סטטי מקבלת את `app-shell.html`, שבו `<title>` של עמוד הבית ו-`canonical=https://www.kurkoos-group.co.il/`. | `dist/app-shell.html`. ה-rewrite `"/((?!api/).*)" → /app-shell` ב-vercel.json. ב-prerender, אם שליפת הפרויקטים מ-Supabase נכשלת, יש רק `console.warn` והבנייה ממשיכה. | עמודי פרויקט (למשל השאילתה "בן גוריון 17") עלולים להופיע לגוגל ב-HTML הראשוני עם canonical לעמוד הבית. זה קורה אם ה-build רץ בלי גישה ל-CMS, ולכל פרויקט שנוסף בניהול אחרי הדפלוי האחרון. גוגל מריץ JS ו-Seo.jsx מתקן את ה-canonical, אבל סתירה בין HTML ראשוני לגרסה המרונדרת היא סיכון מוכר. | 1. ב-`app-shell.html` להסיר את ה-canonical, או להשאיר אותו ריק ולתת ל-Seo.jsx להוסיף. 2. להכשיל את ה-build, או לשלוח התראה, כשיש משתני סביבה אבל 0 פרויקטים חזרו. 3. לאמת מיד ב-GSC (URL Inspection) עמוד פרויקט אחד: מה ה-canonical שגוגל בחר. | SAFE לבדיקה. שינוי ה-shell: REVIEW |
| C2 | **Soft 404.** כתובת שלא קיימת מחזירה סטטוס 200 עם תוכן עמוד הבית. ה-noindex מתווסף רק ב-JS (NotFound.jsx). | אותו rewrite | URL שגויים, וכתבות שהוסרו בלי 301, נשארים "חיים" בעיני סורקים שלא מריצים JS. זה מבזבז סריקה. | לטווח הקצר: לוודא 301 לכל slug שהוסר (קיים ברובם). לטווח הארוך: פונקציית edge שמחזירה 404 לנתיב שלא ברשימת ה-routes, ה-slugs והפרויקטים. | REVIEW |

### High

| # | בעיה | ראיה | תיקון | שכבה |
|---|---|---|---|---|
| H1 | **קישוריות פנימית חלשה.** 50 מתוך 66 כתבות חיות בלי קישור בגוף הטקסט. "עוד מהמדריך" מציג את 3 הכתבות האחרונות ולא כתבות קשורות. | ספירת `](/` בקבצי התוכן. `ConstructionsArticle.jsx` שורה 25 | internal-linking.md (159 זוגות). "עוד מהמדריך" לפי אשכול. | SAFE (קישורים). REVIEW (לוגיקת related) |
| H2 | **קניבליזציה בעמודים המסחריים** | סעיף 5 למטה | הבחנה ב-Title וב-H1 ובקישורים, בלי מחיקה ובלי שינוי URL | SAFE/REVIEW |
| H3 | **עמודי ערים מתבנית אחת.** רעננה והרצליה זהים לעמוד הוד השרון חוץ משם העיר (כ-700 מילים כל אחד, אותם שלבים, פרויקטים ושאלות). כל הפרויקטים האמיתיים בהוד השרון. | `src/data/houseLanding.js` (פונקציית עיר) | לשאול את הבעלים אם יש פעילות אמיתית בערים האלה. אם יש: תוכן ייחודי לכל עיר. אם אין: noindex או 301 לעמוד האב. אסור לבצע בלי אישור. | APPROVAL |
| H4 | **עמודי פרויקט נעלמים מה-sitemap כש-Supabase איטי.** ה-sitemap מחכה ל-CMS עד 4 שניות, ואחר כך מחזיר רשימה תקינה בלי פרויקטים. | `server/sitemap.js`, `CMS_TIMEOUT_MS` | לשמור את הרשימה האחרונה שהצליחה (KV או קובץ שנוצר ב-build) כ-fallback | SAFE |
| H5 | **Titles ארוכים ונחתכים.** 40 עמודים מעל 60 תווים. בכתבות בלי `metaTitle` נוסף אוטומטית "· המדריך ליזמי נדל\"ן צעירים \| קורקוס גרופ" (עד 104 תווים). | audit.json. `prerender-static.mjs`: `a.metaTitle \|\| \`${a.title} · ${col.label}\`` | `metaTitle` קצר לכל כתבה, עד כ-60 תווים, ומילת המפתח בהתחלה. בלי להוסיף את שם הטור. | SAFE |
| H6 | **שאילתות מדורגות שנשענות על משפט אחד:** "בדיקת פטיש שמידט" (משפט אחד בכתבת הקובייה), "זיהוי קונה רציני לדירה" (משפט אחד בכתבת עסקאות נופלות), "בדיקת בטון מחיר" (אין בעמוד אזכור מחיר) | grep בקבצי התוכן | quick-wins.md, content-briefs.md | REVIEW |
| H7 | **"בן גוריון 17" מופיע רק בבאנר שפג ב-15.10.2026.** השאילתה מדורגת, אבל מחוץ ל-CMS השם מופיע רק ב-`PromoBanner.jsx`. | grep | לוודא שעמוד הפרויקט ב-CMS מרונדר ושה-Title שלו כולל "בן גוריון 17, יהוד-מונוסון". אם הפרויקט נמכר, לא מוחקים את העמוד: מעדכנים סטטוס. | SAFE לבדיקה |
| H8 | **עמודים מסחריים ועמודי אמון דקים (בגרסה הסטטית):** `/projects` 203 מילים, `/about` 98, `/team` 139, `/real-estate-sharon` 181, `/real-estate-calculators` 173, `/livy-yazamim` 276 | audit.json | הרחבה עם נתונים אמיתיים בלבד. קודם צריך לבדוק כמה טקסט יש בגרסה המרונדרת. | REVIEW |

### Medium

| # | בעיה | ראיה | תיקון | שכבה |
|---|---|---|---|---|
| M1 | **E-E-A-T בכתבות:** ה-author ב-Article הוא Organization, ו-`dateModified` שווה ל-`datePublished`. בכתבות יש ציטוטים של שלומי קורקוס, אבל הוא לא מוגדר ככותב. | `prerender-static.mjs` | שדה `author` בקבצי התוכן, Person עם קישור ל-/team, ושדה `updated` נפרד. רק כותב אמיתי. | SAFE |
| M2 | **Descriptions:** 16 ארוכים מ-160 תווים (כולל עמוד הבית, השירותים והאינדקסים), 17 קצרים מ-110 | audit.json | לקצר או להרחיב | SAFE |
| M3 | **H1 של עמודי השירות קצר ובלי מילת מפתח או מיקום:** "ביצוע ובנייה", "ייזום נדל\"ן", "תיווך ושיווק", "ניהול ופיקוח בנייה" | audit.json | H1 תיאורי, למשל "פיקוח בנייה וניהול פרויקטים בשרון". זה שינוי H1 משמעותי. | REVIEW |
| M4 | **areaServed ב-Organization כולל תל אביב, רמת גן, כפר סבא ורמת השרון.** הבריף דורש אזורים שבהם יש פעילות אמיתית בלבד. | `index.html` | אימות מול הבעלים | APPROVAL (מידע עסקי) |
| M5 | **FAQPage:** מאז 2023 גוגל מציג FAQ rich results רק לאתרי ממשל ובריאות. ה-schema לא מזיק, אבל לא יביא תוצאה מורחבת. ב-/villas-sharon ה-FAQ כולל גם את BUYER_FAQS, וצריך לוודא שכל השאלות גלויות בעמוד. | prerender | לא להוסיף FAQPage חדש בציפייה ל-rich result. לוודא שכל שאלה ב-schema מוצגת בעמוד. | SAFE |
| M6 | **תמונות לא נבדקו:** בגרסה הסטטית אין תגיות `<img>`. alt, width/height ו-lazy נקבעים ב-React ובתמונות מה-CMS. | audit.json: imgs=0 בכל העמודים | crawl מרונדר (Screaming Frog עם JS, או Lighthouse) על 10 עמודים מובילים ו-3 עמודי פרויקט | SAFE |
| M7 | **Cache של תמונות:** `max-age=0, must-revalidate` לכל jpg, png, webp ו-svg. כל צפייה חוזרת מאמתת מחדש את כל התמונות. | vercel.json | לשקול `max-age` של יום עד שבוע לתמונות ב-public עם שם קבוע. נראה שההחלטה נועדה לאפשר החלפת תמונות באדמין, ולכן REVIEW. | REVIEW |
| M8 | **"משה קורקוס" מדורג באתר, אבל אין באתר משה קורקוס.** בצוות יש שלומי, בני ויעקב. | `src/data/team.js` | לבדוק ב-GSC איזה עמוד מופיע. אם זה איש צוות או קשר משפחתי אמיתי, הבעלים מחליט. לא מוסיפים שם בלי אישור. | APPROVAL |
| M9 | **אינדקסי הטורים מתחרים בעמודי השירות:** ה-Title של `/yazamut-nadlan` הוא "המדריך ליזמות נדל\"ן", ושל `/construction-supervision` הוא "המדריך לפיקוח בנייה" | audit.json | Titles מבדילים (mapping.md) | SAFE |

### Low

| # | בעיה | תיקון |
|---|---|---|
| L1 | ב-75 עמודים אין H3. רוב הכתבות במבנה של H2 בלבד. זה לא פגם, אבל בכתבות שמורחבות עדיף להוסיף H3 לנושאי משנה. | בהרחבות |
| L2 | ה-slug `avoda-begova-pigum-t-` מסתיים במקף. ה-slug-ים מעורבים: חלקם באנגלית וחלקם בתעתיק. | **לא לשנות** (סעיף 18 בבריף). רק בכתבות חדשות. |
| L3 | המותג: ב-Titles מופיע "קורקוס גרופ", הבריף וחלק מהחיפושים משתמשים ב"קבוצת קורקוס". alternateName ב-schema כבר מכסה את שני השמות. | החלטה של הבעלים. לא משנים כרגע. |
| L4 | לא אומתו: הפניה מ-non-www ל-www ומ-http ל-https. HSTS קיים. | לבדוק עם curl מחוץ לסביבה |
| L5 | `/blog` (79 מילים) הוא דף קישורים לטורים | KEEP |
| L6 | ב-Organization `sameAs` יש רק share.google ואפיק הנחל | להוסיף פרופילים רשמיים קיימים (פייסבוק ואינסטגרם של הקבוצה, אם יש) |

---

## 4. עמודים דקים (פחות מ-300 מילים בגרסה הסטטית, כולל כ-40 מילות ניווט)

| עמוד | מילים | חשוב ל-SEO? | המלצה |
|---|---|---|---|
| `/projects` | 203 | כן, Pillar D | EXPAND (יעד 27) |
| `/real-estate-sharon` | 181 | כן, יעד 31 | EXPAND |
| `/real-estate-calculators` | 173 | כן, יעד 37 | EXPAND |
| `/team` | 139 | כן, שאילתות שמות | EXPAND בביוגרפיות אמיתיות |
| `/about` | 98 | כן, אמון | EXPAND |
| `/livy-yazamim` | 276 | בינוני | OPTIMIZE |
| `/contact`, `/careers`, `/blog`, `/privacy`, `/terms`, `/accessibility` | 73-94 | לא | KEEP |

כתבות קצרות יחסית (400 עד 450 מילים) עם פוטנציאל: `mefakeach-mul-kablan` (יעד 12), `tazrim-timing-lo-kesef` (יעד 26), `itur-hizdamnut-lifnei-hashuk` (יעד 24), `likuei-chashmal-instalatzia-lifnei-sgira`, `avodot-pituach-chatzer`, `mifrat-techni-mah-kovea`.

## 5. סיכוני קניבליזציה

| # | כוונת חיפוש | העמודים המתחרים | מי צריך להוביל | איך מפרידים |
|---|---|---|---|---|
| K1 | בניית וילות ובתים פרטיים | `/` (Title: "בניית וילות ובתים פרטיים, יזמות ופיקוח בנייה בהוד השרון"), `/villas-sharon` ("בניית וילות ובתים פרטיים בהוד השרון ובאזור המרכז"), `/bniyat-vila-sharon`, `/divisions/execution` ("חברת בנייה לבתים פרטיים ווילות בהוד השרון") | בניית בית פרטי: `/bniyat-vila-sharon`. וילות בהוד השרון: `/villas-sharon`. חברת בנייה: `/divisions/execution`. עמוד הבית: מותג. | Titles נפרדים לפי כוונה. עמוד הבית מקבל Title מותג שלא מתחיל ב"בניית וילות". זה REVIEW כי ייתכן שעמוד הבית מדורג היום על "חברה לבניית וילות", ולכן קודם בודקים ב-GSC. |
| K2 | קבלן לבית פרטי | `/kablan-bniya-bayit-prati`, `/constructions/livchor-chevrat-bniya-bayit-prati`, `/divisions/execution` | `/kablan-bniya-bayit-prati` | הכתבה נשארת "איך בוחרים" (כוונת מידע) ומקשרת לעמוד הנחיתה בעוגן "קבלן לבניית בית פרטי" |
| K3 | פרויקטים בהוד השרון | `/projects` ("פרויקטים בהוד השרון ובאזור המרכז"), `/divisions/residential` ("פרויקטים למגורים בהוד השרון ובאזור המרכז"), `/real-estate-sharon` | `/projects` | residential עובר לכוונת "דירות חדשות בהוד השרון" (יעד 28). sharon עובר ל"נדל\"ן ופרויקטים בשרון" (יעד 31). |
| K4 | פיקוח בנייה | `/divisions/supervision`, `/construction-supervision` ("המדריך לפיקוח בנייה"), `/construction-supervision/mefakeach-bniya-bayit-prati`, `/madrich-yazamim/mefakeach-shave-revach` | `/divisions/supervision`. בית פרטי: mefakeach-bniya-bayit-prati | אינדקס הטור מקבל Title "מדריכים לפיקוח בנייה". mefakeach-shave-revach נשאר בזווית של יזם. |
| K5 | יזמות נדל"ן | `/divisions/development`, `/yazamut-nadlan` ("המדריך ליזמות נדל\"ן"), `/madrich-yazamim`, `/livy-yazamim` | `/divisions/development` | Title מבדיל לאינדקס הטור. madrich ו-livy נשארים בכוונת "יזם צעיר" ו"ליווי". |
| K6 | בדיקת בטון | `/constructions/concrete-cube-test-failure-beyetzika`, `/construction-supervision/pikuach-yetzikat-beton`, `/constructions/site-manager-stop-concrete-pour` | concrete-cube… | pikuach-yetzikat-beton: לפני היציקה. site-manager: בטיחות. מקשרים לעמוד המוביל בעוגן "בדיקת בטון". |
| K7 | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek`, `/constructions/sherut-achrei-mesira`, ויש לשים לב ל-`bdek-dira-lifney-mesira` | likuei-bniya-tkufat-bedek | sherut-achrei-mesira: תהליך השירות. bdek-dira: בדיקה הנדסית לפני מסירה. |
| K8 | איטום | `/construction-supervision/likuei-itum`, `/constructions/itum-retivut-chozeret-oto-makom` | itum-retivut (920 מילים) על "רטיבות", likuei-itum על "ליקויי איטום" | קישור הדדי, Titles שכבר שונים |
| K9 | בנייה מתועשת | `/constructions/industrialized-construction-schedule`, `/yazamut-nadlan/modular-construction-speed-promise-reality` | constructions (בעל בית) | yazamut: זווית כלכלית ליזם. קישור הדדי. |
| K10 | תשואה | `/real-estate-guide/real-return-real-estate-investment`, `/yazamut-nadlan/rental-yield-vs-interest-rate-investor`, `/real-estate-calculators` | real-return ("איך מחשבים") | yazamut: פרשנות שוק. המחשבון: כלי. קישורים בין שלושתם. |
| K11 | היתכנות ודוח אפס | `/madrich-yazamim/bdikat-hetkenut-karka`, `/madrich-yazamim/doch-efes-kli-haavoda` | bdikat-hetkenut על "בדיקת כדאיות" | doch-efes על "דוח אפס" |
| K12 | עמודי ערים | `/bniyat-bayit-prati/{hod-hasharon,raanana,herzliya}` | הוד השרון | ראו H3 |

## 6. שיוך השאילתות המדורגות (מהבריף) לעמודים

השיוך הוא הסקה מהתוכן. לאמת ב-GSC.

| שאילתה | העמוד הסביר | הערה |
|---|---|---|
| בדיקת בטון, בדיקת בטון מחיר | `/constructions/concrete-cube-test-failure-beyetzika` | אין בעמוד תוכן על מחיר |
| בדיקת פטיש שמידט | אותו עמוד | משפט אחד |
| שלומי קורקוס, יעקב קורקוס | `/team` | 139 מילים |
| משה קורקוס | לא ידוע | M8 |
| תקופת בדק בית, תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | 496 מילים |
| איך מחשבים תשואה | `/real-estate-guide/real-return-real-estate-investment` | אין קישור למחשבון |
| זיהוי קונה רציני לדירה | `/real-estate-guide/iskaot-noflot` | משפט אחד |
| פיקוח בנייה לבתים פרטיים | `/construction-supervision/mefakeach-bniya-bayit-prati` | |
| בן גוריון 17 | עמוד הפרויקט ב-CMS | H7, C1 |
| כמה עולה לבנות בית פרטי, בניית בית פרטי מחיר | `/constructions/kama-ole-livnot-bayit-prati` | |
| קבלן מפתח בית פרטי | `/constructions/kablan-mafteach-o-nihul-atzmi` או `/kablan-bniya-bayit-prati` | |
| חברה לבניית וילות | `/` או `/villas-sharon` או `/divisions/execution` | K1 |
| קבלן לבניית בית פרטי, קבלן בית פרטי | `/kablan-bniya-bayit-prati` | |
| פיקוח פרויקטים, פיקוח הנדסי בשרון, מפקח בנייה מומלץ באזור השרון, פיקוח בנייה מקצועי בשרון, חברת פיקוח בנייה, פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | |
| פרויקטים בהוד השרון, פרויקטים חדשים בהוד השרון, דירות חדשות בהוד השרון | `/projects` או `/divisions/residential` | K3 |

## 7. אסטרטגיית URL

- **כל ה-URL הקיימים נשארים.** אין המלצה לשנות URL, גם לא slug-ים לא אחידים (L2).
- **8 URL חדשים** (CREATE ב-mapping.md). 7 מהם קובצי תוכן בטורים הקיימים, באותו דפוס (`/constructions/…`, `/construction-supervision/…`, `/madrich-yazamim/…`), בלי Route חדש. רק מרכז השאלות (38) דורש Route.
- **REDIRECT:** רק אם הבעלים יחליט שאין פעילות ברעננה ובהרצליה (H3). אז `/bniyat-bayit-prati/raanana` ו-`/bniyat-bayit-prati/herzliya` יקבלו 301 ל-`/bniyat-vila-sharon`, יעודכנו הקישורים הפנימיים (רשימת siblings ב-houseLanding) וה-sitemap, ונבדוק שאין שרשרת. APPROVAL.
- **הפניות קיימות:** 18 ההפניות ב-vercel.json תקינות, וכל יעד שלהן קיים ב-audit.

## 8. נספח: טבלת עמודים

הטבלה המלאה של 101 העמודים (Title, H1, מילים, אשכול, המלצה) נמצאת בסוף הקובץ.


## נספח: טבלת עמודים (101)

עמודות GSC (impressions, clicks, CTR, position, indexed) יתמלאו אחרי חיבור Search Console. "קישורים פנימיים בגוף" = ראו internal-linking.md.

| URL | Title (תווים) | H1 | מילים | אשכול | מילת מפתח ראשית | המלצה |
|---|---|---|---|---|---|---|
| `/` | 69 | קבוצת קורקוס: בניית וילות ובתים פרטיים, יזמות ופיקוח בנייה בהוד השרון | 302 | מותג/מערכת | - | OPTIMIZE Title (K1, REVIEW) |
| `/about` | 26 | אודות קורקוס גרופ | 98 | מותג/מערכת | - | EXPAND (REVIEW) |
| `/accessibility` | 26 | הצהרת נגישות | 80 | מותג/מערכת | - | KEEP + קישורים |
| `/blog` | 25 | בלוג קורקוס | 79 | מותג/מערכת | - | KEEP + קישורים |
| `/bniyat-bayit-prati/herzliya` | 48 | בניית בית פרטי בהרצליה | 699 | A בנייה פרטית | - | APPROVAL (H3) |
| `/bniyat-bayit-prati/hod-hasharon` | 51 | בניית בית פרטי בהוד השרון | 721 | A בנייה פרטית | - | KEEP + קישורים |
| `/bniyat-bayit-prati/raanana` | 47 | בניית בית פרטי ברעננה | 706 | A בנייה פרטית | - | APPROVAL (H3) |
| `/bniyat-vila-sharon` | 48 | בניית וילה בשרון, בידיים של קבוצה אחת | 793 | A בנייה פרטית | בניית בית פרטי | EXPAND (יעד 01) |
| `/careers` | 20 | דרושים בקורקוס גרופ | 80 | מותג/מערכת | - | KEEP + קישורים |
| `/construction-supervision` | 33 | המדריך לפיקוח בנייה | 458 | B פיקוח | - | OPTIMIZE Title (K4) |
| `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | 60 | בדק דירה לפני מסירה: הבדיקות שקובעות אם קיבלת נכס או בעיה | 907 | B פיקוח | ליקויי בנייה | EXPAND (יעד 19) |
| `/construction-supervision/construction-supervision-harigot-taktziv` | 55 | חריגות תקציב בפרויקטים פרטיים: איפה בורח הכסף ולמה | 894 | B פיקוח | תקציב בניית בית | EXPAND (יעד 09) |
| `/construction-supervision/construction-supervision-likuei-sheled` | 53 | ליקויי שלד: הטעויות הקריטיות שקובעות את גורל הבניין | 967 | B פיקוח | - | KEEP + קישורים |
| `/construction-supervision/divuach-pikuach-bniya-lebait-prati` | 56 | דיווח פיקוח בנייה: מה בעל בית צריך לקבל בכל שלב | 837 | B פיקוח | - | KEEP + קישורים |
| `/construction-supervision/likuei-aluminium-trisim-bayit-hadash` | 58 | ליקויי אלומיניום ותריסים בבית חדש: מה בודקים ומה דורשים | 849 | B פיקוח | - | KEEP + קישורים |
| `/construction-supervision/likuei-chashmal-instalatzia-lifnei-sgira` | 85 | חשמל ואינסטלציה: מה בודקים לפני שסוגרים את הקירות | 398 | B פיקוח | - | OPTIMIZE metaTitle |
| `/construction-supervision/likuei-itum` | 51 | הרטיבות שמתגלה אחרי שנתיים: איך עוצרים ליקויי איטום בזמן | 473 | B פיקוח | - | KEEP + קישורים |
| `/construction-supervision/mefakeach-bniya-bayit-prati` | 57 | מפקח בנייה לבית פרטי: מתי הוא נחוץ, מה הוא בודק, ומה הוא לא | 524 | B פיקוח | פיקוח בנייה לבית פרטי | OPTIMIZE (יעד 11) |
| `/construction-supervision/mefakeach-mul-kablan` | 48 | מי באמת שומר על האיכות: תפקיד המפקח מול הקבלן המבצע | 445 | B פיקוח | מה עושה מפקח בנייה | EXPAND (יעד 12) |
| `/construction-supervision/pikuach-yetzikat-beton` | 56 | היציקה שאי אפשר לתקן: מה מפקח בודק לפני שהבטון נשפך | 505 | B פיקוח | - | KEEP + קישורים |
| `/construction-supervision/protokol-mesira-bayit-prati` | 59 | פרוטוקול מסירה לבית פרטי: מה בודקים לפני שמקבלים מפתח | 958 | B פיקוח | - | KEEP + קישורים |
| `/construction-supervision/yoman-avoda-atar` | 83 | יומן העבודה באתר: המסמך שמכריע מחלוקות שנה אחרי | 427 | B פיקוח | - | OPTIMIZE metaTitle |
| `/constructions` | 34 | המדריך לתהליך הבנייה | 624 | A בנייה פרטית | - | OPTIMIZE מבוא |
| `/constructions/avoda-begova-pigum-t-` | 52 | עבודה בגובה: התקנה שהפכה את הפיגום מלכודת | 837 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/avodot-pituach-chatzer` | 82 | עבודות פיתוח: השלב שמתוקצב אחרון ומתגלה ראשון | 399 | A בנייה פרטית | - | OPTIMIZE metaTitle |
| `/constructions/betihut-atar-bniya` | 52 | הקסדה שאף אחד לא בדק: מה באמת קובע בטיחות באתר בנייה | 486 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/concrete-cube-test-failure-beyetzika` | 56 | בדיקת בטון: מה קורה כשהקובייה נכשלת ביציקה | 855 | A בנייה פרטית | בדיקת בטון; בדיקת בטון מחיר | EXPAND (יעד 16); EXPAND (יעד 17) |
| `/constructions/hibur-hashmal-mayim-lifney-ikhlus` | 53 | חיבור חשמל ומים: למה דירה גמורה מחכה חודשים לאכלוס | 780 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/home-construction-contract` | 56 | חוזה בנייה לבית פרטי: הסעיפים שבלעדיהם אתה חשוף | 905 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/industrialized-construction-schedule` | 49 | בנייה מתועשת: האם היא באמת מקצרת את לוח הזמנים | 813 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/itum-retivut-chozeret-oto-makom` | 49 | איטום: למה הרטיבות תמיד חוזרת לאותו קיר | 920 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/kablan-mafteach-o-nihul-atzmi` | 56 | קבלן מפתח או ניהול עצמי: שתי דרכים לבנות בית פרטי, ומה כל אחת באמת דורשת | 581 | A בנייה פרטית | קבלן מפתח בית פרטי | EXPAND (יעד 03) |
| `/constructions/kama-ole-livnot-bayit-prati` | 59 | כמה עולה לבנות בית פרטי בשרון: ממה בנוי המחיר, ולמה מחיר למטר לא מספיק | 711 | A בנייה פרטית | כמה עולה לבנות בית פרטי | EXPAND (יעד 04) |
| `/constructions/likuei-bniya-tkufat-bedek` | 57 | הסדק שמופיע בחורף הראשון: מה באמת אומרת תקופת הבדק | 496 | A בנייה פרטית | תקופת בדק בית | EXPAND (יעד 20) |
| `/constructions/livchor-chevrat-bniya-bayit-prati` | 55 | איך בוחרים חברת בנייה לבית פרטי בשרון: שמונה בדיקות לפני שחותמים | 545 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/loach-zmanim-bniyat-bayit` | 62 | לוח זמנים בניית בית: למה זה מתאחר ואיך בונים לו״ז שמחזיק | 821 | A בנייה פרטית | כמה זמן לוקח לבנות בית | OPTIMIZE (יעד 08) |
| `/constructions/mifrat-techni-mah-kovea` | 86 | המפרט הטכני: הסעיפים שקובעים איך הדירה תיראה באמת | 408 | A בנייה פרטית | - | OPTIMIZE metaTitle |
| `/constructions/sherut-achrei-mesira` | 50 | שירות אחרי מסירה: מה הקבלן חייב לתקן ואיך גורמים לזה לקרות | 945 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/site-manager-stop-concrete-pour` | 48 | מנהל עבודה: מי באמת עוצר יציקה לא בטוחה באתר | 875 | A בנייה פרטית | - | KEEP + קישורים |
| `/constructions/tofes-4-ichlus` | 57 | טופס 4 תקוע: למה דירות מוכנות עומדות ריקות חודשים | 528 | A בנייה פרטית | - | KEEP + קישורים |
| `/contact` | 36 | השאירו פרטים ונחזור אליכם | 94 | מותג/מערכת | - | KEEP + קישורים |
| `/divisions/brokerage` | 56 | תיווך ושיווק | 387 | D מקומי | בתים למכירה בהוד השרון | OPTIMIZE (יעד 29) |
| `/divisions/development` | 49 | ייזום נדל"ן | 380 | C יזמות | יזמות נדל"ן | EXPAND (יעד 22) |
| `/divisions/execution` | 68 | ביצוע ובנייה | 538 | A בנייה פרטית | - | OPTIMIZE metaTitle |
| `/divisions/residential` | 54 | פרויקטים למגורים בהוד השרון ובאזור המרכז | 328 | D מקומי | דירות חדשות בהוד השרון | OPTIMIZE (יעד 28) |
| `/divisions/supervision` | 56 | ניהול ופיקוח בנייה | 509 | B פיקוח | פיקוח בנייה וניהול פרויקטים; פיקוח בנייה בשרון; ניהול פרויקט בנייה | EXPAND (יעד 10); OPTIMIZE (יעד 14); OPTIMIZE (יעד 21) |
| `/kablan-bniya-bayit-prati` | 58 | קבלן בנייה לבית פרטי, מהמגרש ועד המפתח | 851 | A בנייה פרטית | קבלן לבניית בית פרטי | OPTIMIZE (יעד 02) |
| `/livy-yazamim` | 30 | ליווי יזמי נדל"ן צעירים | 276 | C יזמות | - | KEEP + קישורים |
| `/madrich-yazamim` | 39 | המדריך ליזמי נדל"ן צעירים | 494 | C יזמות | - | KEEP + קישורים |
| `/madrich-yazamim/bdikat-hetkenut-karka` | 88 | בדיקת היתכנות: מה בודקים לפני שמשלמים על הקרקע | 516 | C יזמות | בדיקת כדאיות נדל"ן | EXPAND (יעד 23) |
| `/madrich-yazamim/birokratia-lo-negdechem` | 83 | הבירוקרטיה לא נגדכם. היא פשוט לא בצד שלכם | 415 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/doch-efes-kli-haavoda` | 96 | דוח 0: הכלי שמבדיל בין יזם שמתקדם ליזם שמשלם שכר לימוד | 414 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/habank-mashkia-benyarot` | 82 | הבנק לא משקיע בחלומות. הוא משקיע בניירות | 446 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/iskat-kombinatsia` | 56 | עסקת קומבינציה מול רכישה מלאה: מה באמת עדיף ליזם צעיר | 944 | C יזמות | - | KEEP + קישורים |
| `/madrich-yazamim/itur-hizdamnut-lifnei-hashuk` | 80 | איך מזהים הזדמנות לפני שהשוק מגלה אותה | 434 | C יזמות | קרקע ליזמות | EXPAND (יעד 24) |
| `/madrich-yazamim/masa-umatan-lo-mathil-bapgisha` | 67 | המשא ומתן לא מתחיל בפגישה | 422 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/mefakeach-shave-revach` | 90 | מפקח בנייה טוב שווה כמה אחוזי רווח בסיום הפרויקט | 402 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/mesira-dna-haproyekt-haba` | 78 | המסירה היא ה DNA של הפרויקט הבא שלכם | 421 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/nesach-tabu-mi-baal-hakarka` | 91 | נסח טאבו: איך קוראים אותו ומה מסתתר בשורות הקטנות | 551 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/orech-din-nadlan-neches` | 95 | עורך דין נדל"ן: נכס שמשלמים עליו פחות מהנזק שהוא מונע | 432 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/proyekt-shelo-nimkar` | 80 | הפרויקט הטוב ביותר שלא נמכר הוא כישלון | 424 | C יזמות | - | OPTIMIZE metaTitle |
| `/madrich-yazamim/tazrim-timing-lo-kesef` | 104 | פרויקטים לא נכשלים בגלל חוסר כסף. הם נכשלים בגלל תזמון לא נכון | 423 | C יזמות | ניהול תקציב פרויקט | EXPAND (יעד 26) |
| `/madrich-yazamim/zchuyot-bniya-ma-baamt-kniten` | 54 | זכויות בנייה: מה באמת קניתם כשחתמתם על הקרקע | 859 | C יזמות | - | KEEP + קישורים |
| `/privacy` | 28 | מדיניות פרטיות | 78 | מותג/מערכת | - | KEEP + קישורים |
| `/projects` | 46 | הפרויקטים של קורקוס גרופ | 203 | D מקומי | פרויקטים חדשים בהוד השרון | EXPAND (יעד 27) |
| `/real-estate-calculators` | 48 | מחשבון משכנתא ומחשבון תשואה לנדל"ן | 173 | E ידע | מחשבון תשואה | EXPAND (יעד 37) |
| `/real-estate-glossary` | 31 | מילון מונחי נדל"ן | 1338 | E ידע | מילון מונחי נדל"ן | EXPAND (יעד 36) |
| `/real-estate-guide` | 33 | המדריך לרוכש ולמוכר | 465 | E ידע | מדריך לרוכש דירה; מדריך למוכר דירה | EXPAND (יעד 32); EXPAND (יעד 33) |
| `/real-estate-guide/bdikot-lifney-rechishat-dira` | 61 | רכישת דירה יד שנייה: הבדיקות שמפרידות בין עסקה טובה לפח יקר | 1026 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/choze-schirut-baal-bayit` | 57 | חוזה שכירות שמגן על בעל הבית: מה חייב להיות בפנים | 1045 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/dmei-tivuch-zchuyot` | 55 | דמי תיווך וזכויות: מה מתווך חייב לכם לפי החוק | 606 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/evicting-tenant-israel` | 57 | פינוי שוכר שלא משלם: מה החוק מאפשר ומה לוקח חודשים | 981 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/heskem-bladiyut` | 56 | בלעדיות במכירת דירה: מתי היא עובדת לטובתכם ומתי נגדכם | 639 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/hon-atzmi-mashkanta-rechisha` | 49 | הון עצמי לרכישת דירה: כמה באמת צריך לפני שיוצאים לדרך | 1106 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/iskaot-noflot` | 59 | למה עסקאות נדל"ן נופלות ברגע האחרון, ואיך מונעים את זה | 599 | E ידע | זיהוי קונה רציני לדירה | EXPAND (יעד 34) |
| `/real-estate-guide/kniya-mekablan-mul-yad-shniya` | 81 | קנייה מקבלן מול יד שנייה: מה באמת שונה בתהליך | 434 | E ידע | - | OPTIMIZE metaTitle |
| `/real-estate-guide/mas-rechisha-madregot` | 59 | מס רכישה 2026: המדרגות, הפטורים והמלכודות שמפילות קונים | 1159 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/mas-shevach-mecirat-dira` | 78 | מס שבח במכירת דירה: מה קובע אם תשלמו, ומתי | 453 | E ידע | - | OPTIMIZE metaTitle |
| `/real-estate-guide/real-return-real-estate-investment` | 50 | תשואה אמיתית בהשקעת נדל"ן: המספר שכולם מרמים בו את עצמם | 1133 | E ידע | איך מחשבים תשואה | OPTIMIZE (יעד 35) |
| `/real-estate-guide/timchur-dira-lemchira-hamechir-harishon` | 52 | תמחור דירה למכירה: למה המחיר הראשון קובע את כל העסקה | 1109 | E ידע | - | KEEP + קישורים |
| `/real-estate-guide/zichron-dvarim-real-estate` | 63 | זכרון דברים בעסקת נדל"ן: מסמך תמים או מלכודת משפטית | 1074 | E ידע | - | KEEP + קישורים |
| `/real-estate-sharon` | 71 | נדל"ן בהוד השרון ובאזור המרכז | 181 | D מקומי | פרויקטים חדשים בשרון | EXPAND (יעד 31) |
| `/team` | 34 | הצוות שמאחורי קורקוס | 139 | מותג/מערכת | - | EXPAND ביוגרפיות (REVIEW) |
| `/terms` | 31 | תקנון ותנאי שימוש | 73 | מותג/מערכת | - | KEEP + קישורים |
| `/villas-sharon` | 62 | בניית וילות ובתים פרטיים בהוד השרון ובאזור המרכז | 1079 | D מקומי | וילות בהוד השרון | OPTIMIZE (יעד 30) |
| `/yazamut-nadlan` | 33 | המדריך ליזמות נדל"ן | 590 | C יזמות | - | OPTIMIZE Title (K5) |
| `/yazamut-nadlan/bank-israel-10-90` | 89 | כשבנק ישראל בולם את 10/90: מי באמת מכר דירה, ומי מכר מבצע | 558 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/betterment-levy-silent-brake` | 74 | היטל ההשבחה: המס השקט שמכריע אם המנוף עולה | 710 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/deferred-demand-subsidized-lottery` | 93 | מאה עשרים וחמישה אלף משפחות ממתינות: הביקוש שלא נעלם, רק נדחה | 679 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/highrise-towers-vs-low-city` | 72 | מגדל בן 40 קומות או שכונה שאפשר לחיות בה | 690 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/holdout-tenants-after-67-percent-law` | 73 | אחרי חוק ה-67 אחוז: מה קורה כשהמיעוט מסרב | 710 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/karka-meusheret-lo-dirot` | 76 | קרקע מאושרת אינה דירות: הפער שאף אחד לא סופר | 406 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/mamad-15-meter-yazamut` | 77 | הממ"ד שתפח לחמישה עשר מטר: מי משלם על הביטחון | 734 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/maslul-mahir-arvuyot` | 87 | הצוואר היה זמן, לא ביקוש: מה באמת עושה מסלול תכנון מהיר | 570 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/mimun-chutz-bankai-nadlan` | 82 | מימון חוץ בנקאי: מתי הוא פתרון ומתי הוא סימן אזהרה | 420 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/modular-construction-speed-promise-reality` | 90 | בנייה מתועשת מוכרת מהירות, השאלה מי משלם על ההקמה של המפעל | 670 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/no-mamad-price-gap-developer` | 87 | הדירה בלי ממ"ד הפכה לנכס סוג ב'. וזה שינה את חשבון היזם | 737 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/rami-tender-land-floor-price` | 63 | מכרז רמ"י הוא משאל עם של היזמים | 706 | C יזמות | - | KEEP + קישורים |
| `/yazamut-nadlan/rental-yield-vs-interest-rate-investor` | 82 | המשקיע שיושב על הגדר: כשהתזרים שלילי וההשבחה נעלמה | 756 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/tama38-pkiaa-hok-67` | 85 | סוף "הגרסה הקלה" של ההתחדשות: מה קורה כשתמ"א 38 נסגרת | 601 | C יזמות | - | OPTIMIZE metaTitle |
| `/yazamut-nadlan/third-apartment-tax-developer-angle` | 86 | מס שלישית חוזר, והיזם כבר יודע מי ייכנס לנעליים הריקות | 723 | C יזמות | - | OPTIMIZE metaTitle |
