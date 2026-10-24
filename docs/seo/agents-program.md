# תוכנית סוכני ה-SEO של kurkoos-group.co.il

עודכן: 24.10.2026. הבעלים ביקש: לקדם את האתר בגוגל עם סוכנים חכמים שמשפרים את הדירוג כל הזמן, ולהביא חשיפה ולידים ממי שמחפש לבנות בית, לקנות נכס, לחפש מגרשים וקרקעות, פיקוח בנייה או חברה קבלנית, בכל רחבי ישראל.

## מה הותקן

**התוסף claude-seo גרסה 2.5.0** (מאת Daniel Agrici, רישיון MIT, קומיט ב-`.claude/seo/VENDORED.txt`). 18 קובצי הסוכנים שהבעלים העלה זהים לקובצי התוסף, ולכן הותקן התוסף המלא ולא רק ההגדרות:

| איפה | מה |
|---|---|
| `.claude/agents/seo-*.md` | 18 סוכנים: agentic, backlinks, cluster, content, dataforseo, drift, flow, geo, google, image-gen, local, maps, performance, schema, sitemap, sxo, technical, visual |
| `.claude/skills/seo/` | הפקודה `/seo <command> <url>` (audit, page, technical, content, schema, geo, agentic, local, sitemap, cluster, sxo, drift, google, backlinks ועוד) |
| `.claude/seo/scripts/` | 60 סקריפטי Python (render_page, parse_html, metadata_template, schema_generate, sitemap_discovery, drift_*, pagespeed_check, gsc_query, moz_api, commoncrawl_graph...) עם הגנת SSRF |
| `.claude/seo/skills/` | 26 תתי המיומנויות שהסוכנים קוראים (references, templates) |
| `.claude/skills/kurkoos-seo/SKILL.md` | הכללים של האתר הזה לכל סוכן: עובדות רק מהאתר, עברית בלי מקפים, עורך העמודים, איך בודקים את האתר מהסנדבוקס |
| `scripts/seo-audit-dist.mjs` | ביקורת של כל 129 העמודים המרונדרים (אותו HTML שגוגל מקבל) |
| `docs/seo/audit-data/<תאריך>.json` | תוצאות הביקורת, לצורך השוואה חודשית (drift) |

הנתיבים `${CLAUDE_PLUGIN_ROOT}` בקובצי הסוכנים הוחלפו ל-`.claude/seo`, ולכן הפקודות רצות משורש המאגר. סביבת ה-Python המבודדת של התוסף נוצרת עם `bash .claude/seo/scripts/claude-seo setup` (הורצה בענן; במחשב אחר מריצים פעם אחת).

## מה הסוכנים יכולים לעשות היום, ומה דורש מפתח

| סוכן | עובד היום | חסום עד שיהיה |
|---|---|---|
| seo-technical, seo-content, seo-schema, seo-sitemap, seo-image-gen | כן, על ה-build המקומי ועל האתר החי דרך Supabase | במחשב הבעלים גם ישירות על ה-URL |
| seo-geo, seo-agentic | כן (robots, llms.txt, סכמה, ציטוטיות) | PageSpeed/Lighthouse Agentic: `GOOGLE_API_KEY` |
| seo-performance, seo-google | חלקית (ניתוח מקור) | `GOOGLE_API_KEY` (PageSpeed, CrUX), חשבון שירות עם גישה ל-Search Console (`GOOGLE_APPLICATION_CREDENTIALS`), מזהה GA4 |
| seo-local, seo-maps | ניתוח on-page ו-NAP | DataForSEO או Geoapify למיקומים ולביקורות |
| seo-backlinks | Common Crawl בלבד (ביטחון 0.5) | `MOZ_API_KEY`, `BING_WEBMASTER_API_KEY`, DataForSEO |
| seo-dataforseo | לא | חשבון DataForSEO ו-MCP שלו (`.claude/seo/extensions/dataforseo`) |
| seo-cluster, seo-sxo, seo-flow | כן, עם WebSearch של Claude | |
| seo-drift | על ה-JSON של הביקורת (השוואה בין תאריכים) | במחשב הבעלים: `drift_baseline.py` מול האתר החי |
| seo-visual | כן (Playwright מותקן) | |

**מה שהבעלים צריך לספק כדי לפתוח את הדרגות הבאות** (אין לשים מפתחות בקוד; רק כמשתני סביבה ב-Vercel או במחשב):
1. מפתח Google API עם PageSpeed Insights ו-CrUX מופעלים (חינם).
2. חשבון שירות בגוגל עם הרשאת קריאה ל-Search Console של הדומיין (חינם) ומזהה GA4. זה הפריט הכי חשוב: בלי Search Console הסוכנים לא רואים מה עלה ומה ירד, והייצוא הידני מ-11.10.2026 הוא הבסיס היחיד.
3. אופציונלי, בתשלום: DataForSEO (מיקומים חיים, קישורים נכנסים, נראות ב-ChatGPT), Moz, Bing Webmaster.

## מה נעשה היום (24.10.2026)

ממצאי הביקורת המלאים: `docs/seo/audit-2026-10-24.md`.

1. שני עמודי נחיתה חדשים לכוונות שלא היה להן עמוד: `/bniyat-bayit-prati` (בניית בית פרטי בכל הארץ, עמוד העוגן של אשכול הבית הפרטי) ו-`/migrashim-vekarkaot` (מגרשים וקרקעות: לקנות, לבדוק, לבנות או למכור). שניהם בעורך העמודים, ב-sitemap, ב-IndexNow, בפוטר, ב-llms.txt, עם Service, FAQPage ו-BreadcrumbList.
2. כותרות ותיאורים לכוונה ארצית בעמודי החטיבות: ביצוע ("חברת בנייה לבתים פרטיים ווילות בכל הארץ"), פיקוח ("פיקוח בנייה וניהול פרויקטים, בשרון ובכל הארץ", לפי quick-wins 18א), תיווך ("תיווך נכסים, מגרשים וקרקעות בשרון ובמרכז").
3. שתי שאלות חדשות בעמוד הפיקוח: ממה נקבע מחיר פיקוח (בלי סכומים, מהכתבה הקיימת) ופיקוח מחוץ לשרון.
4. `areaServed` של הארגון כולל עכשיו גם את ישראל כמדינה, לצד הערים.
5. קישורים פנימיים לעמודים החדשים: פוטר, רשימת המדריכים בכל עמודי הבית הפרטי, "עוד בנושא" בעמודי הפיקוח והתיווך.

## לוח הזמנים של הסוכנים

| מתי | מה | תוצר |
|---|---|---|
| כל יום ראשון 06:41 | ספרינט SEO שבועי: build, ביקורת, השוואה לביקורת הקודמת, 2 עד 3 שיפורים מהבקלוג, PR ל-main, רישום ב-`sprint-log.md` | PR בעברית לאישור הבעלים |
| 1 בכל חודש 06:13 | ביקורת חודשית מלאה עם כל הסוכנים + drift | `docs/seo/audit-<תאריך>.md` ובקלוג מעודכן |
| כל שבוע (קיים) | ארבע כתבות אוטומטיות (GitHub Actions: יזמות, בנייה, פיקוח, תיווך, יזמים צעירים) | כתבה חדשה בכל טור |
| כל יום (קיים) | IndexNow ל-Bing ולמנועים שמשתמשים בו | |

הספרינט השבועי פותח PR ולא ממזג בעצמו. אם הבעלים רוצה שהסוכן ימזג לבד, הוא כותב זאת ב-`sprint-log.md` תחת "הרשאות".

## מה הבעלים צריך לעשות ב-Search Console (לא ניתן לעשות מכאן)

1. URL Inspection ו-Request Indexing לשני העמודים החדשים ולעמודי החטיבות שכותרתם השתנתה.
2. לוודא שה-sitemap `https://www.kurkoos-group.co.il/sitemap.xml` תקין ללא שגיאות.
3. ייצוא חדש של 3 חודשים (Queries, Pages) ב-11.11.2026 ל-`scratchpad/seo/gsc/` או לשיתוף עם הסוכן, לפי `docs/seo/measurement.md`.
