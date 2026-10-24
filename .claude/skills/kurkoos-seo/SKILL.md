---
name: kurkoos-seo
description: תוכנית ה-SEO של אתר קבוצת קורקוס (kurkoos-group.co.il), כולל הכללים לסוכני ה-SEO שרצים כל שבוע וכל חודש. להפעיל בכל בקשה לקידום האתר בגוגל, דירוג, לידים אורגניים, ספרינט SEO, ביקורת SEO, או כשסוכן SEO מתוזמן מתחיל לעבוד.
---

# SEO של קבוצת קורקוס

מטרה: חשיפה ולידים מגוגל וממנועי תשובות AI, לכוונות החיפוש האלה בכל רחבי ישראל:
בניית בית פרטי, קניית נכס, מגרשים וקרקעות, פיקוח בנייה, חברה קבלנית שבונה על המגרש של הלקוח.

## קרא קודם

1. `CLAUDE.md`: כל עמוד חדש חייב להיכנס לעורך העמודים (`src/lib/pageBuilder/defs`), אחרת ה-build נכשל.
2. `docs/seo/agents-program.md`: הסוכנים, הכלים, מה חסר (מפתחות API), ולוח הזמנים.
3. `docs/seo/sprint-log.md`: מה נעשה בספרינטים הקודמים, ומה נשאר בבקלוג.
4. `docs/seo/quick-wins.md`, `docs/seo/roadmap-90.md`, `docs/seo/internal-linking.md`, `docs/seo/content-briefs.md`: הבקלוג המקורי עם נתוני Search Console.
5. `docs/seo/audit.md`: הביקורת המלאה, כולל סיכוני קניבליזציה.

## כללי ברזל (אין לעבור עליהם)

- עברית בכל טקסט שמוצג באתר ובדוחות. אין מקפים כסימן פיסוק בעברית (לא "-" ולא "–" בין מילים; נקודה, פסיק או נקודתיים).
- אין להמציא עובדות: מחירים, מספרים, תאריכים, פרסים, שמות עובדים, פרויקטים, ערים שבהן "יש פרויקט". כל עובדה מגיעה מקובץ שכבר באתר (`src/data/*`, `src/content/*`, `public/llms.txt`). אזור הפעילות הארצי ("בכל רחבי ישראל") אושר על ידי הבעלים באוקטובר 2026.
- לא משנים URL קיים, לא מוחקים עמוד, לא משנים עיצוב, Header, Footer או ניווט (חוץ מהוספת קישור).
- כתבות: `src/content/<טור>/YYYY-MM-DD-slug.js`, באותו מבנה של הכתבות הקיימות. עמוד נחיתה חדש: ב-`src/data/houseLanding.js` (מבנה HOUSE_PAGES) כדי שה-prerender, ה-sitemap ועורך העמודים יקבלו אותו אוטומטית.
- כותרת (`<title>` כולל " | קבוצת קורקוס"): עד 60 תווים. תיאור: 120 עד 160 תווים (עמודי נחיתה: 150 עד 160, נבדק ב-build).
- לא מוסיפים FAQPage חדש בציפייה לתוצאה מורחבת (גוגל הפסיק להציג FAQ rich results). קיים: משאירים.
- שינוי שנוגע למידע עסקי (כתובת, שעות, צוות, אזורי שירות, מחירים) דורש אישור מפורש של הבעלים.

## איך בודקים את האתר

האתר החי חסום מהסנדבוקס של Claude Code בענן. שתי דרכים שעובדות:

1. **ה-build המקומי הוא מה שגוגל מקבל.** `VITE_SUPABASE_URL=https://filnzlnvujnlazwcxbuq.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key npm run build`, ואז `node scripts/seo-audit-dist.mjs dist /tmp/audit.json` (כותרות, תיאורים, H1, canonical, סכמה, מילים, קישורים לכל 129 העמודים). עמודי הפרויקטים מה-CMS לא נבנים בלי מפתח אמיתי.
2. **האתר החי דרך Supabase MCP** (`mcp__Supabase__execute_sql`, פרויקט `filnzlnvujnlazwcxbuq`): `select (http_get('https://www.kurkoos-group.co.il/...')).status` וכו'. ככה בודקים סטטוסים, הפניות, sitemap.xml ושהגרסה החדשה עלתה.

כלי התוסף claude-seo (18 סוכנים ב-`.claude/agents/seo-*.md`, סקריפטים ב-`.claude/seo/scripts`): `bash .claude/seo/scripts/claude-seo run <script.py> ...`. על קבצים מקומיים: `parse_html.py --url <url> <file>` ו-`metadata_template.py --pairs-file <audit.json> --json`. סקריפטים שמושכים URL חי (render_page, fetch_page, sitemap_discovery, drift_*) לא עובדים מהסנדבוקס; במחשב של הבעלים הם עובדים.

## ספרינט שבועי (הסוכן המתוזמן)

1. build + audit (למעלה). השוואה מול `docs/seo/audit-data/<תאריך קודם>.json`: עמוד שאיבד כותרת, תיאור, canonical, H1 או סכמה הוא CRITICAL ומתקנים אותו קודם.
2. בחירה של 2 עד 3 פריטים מהבקלוג (`sprint-log.md`, `quick-wins.md`, `content-briefs.md`) לפי ההשפעה על חמש כוונות היעד. סדר עדיפות: תיקון טכני > כותרת/תיאור/H1 > קישורים פנימיים > הרחבת עמוד קיים > כתבה חדשה אחת.
3. ביצוע, build שעובר, screenshot אם נגעו בעמוד (Playwright מותקן).
4. commit בענף `claude/seo-sprint-<תאריך>`, push, PR ל-main עם סיכום בעברית. לא למזג בלי אישור הבעלים, אלא אם הבעלים כתב במפורש בלוג שמותר.
5. רישום ב-`docs/seo/sprint-log.md`: מה נעשה, מה למדוד ב-Search Console בעוד 2 עד 4 שבועות, מה הבא בתור.

## ביקורת חודשית

הרצה מלאה של הסוכנים seo-technical, seo-content, seo-schema, seo-geo, seo-agentic, seo-sitemap ו-seo-local על עמוד הבית, ארבעת עמודי החטיבות, עמודי הנחיתה (`/kablan-bniya-bayit-prati`, `/bniyat-bayit-prati`, `/migrashim-vekarkaot`, `/villas-sharon`) ו-5 הכתבות עם הכי הרבה חשיפות. דוח ב-`docs/seo/audit-<תאריך>.md`, נתונים ב-`docs/seo/audit-data/<תאריך>.json`, ועדכון הבקלוג ב-`sprint-log.md`. בלי שינוי קוד.
