# 📦 חבילת סוכני התוכן לאתר נדל"ן — קבוצת קורקוס

כל הקבצים לבניית סוכנים שכותבים תוכן מקצועי לאתר, מעלים אותו בקו עיצובי אחיד, ומתפרסם אוטומטית כל שבוע. שלושה טורים, עברית, RTL, מוכן ל-Claude Code או למפתחים.

## שלושת הטורים (הסוכנים)
1. **המדריך לרוכש ולמוכר** — מומחה תיווך ועסקאות. `agents/brokerage-expert.md`
2. **המדריך לתהליך הבנייה** (יזמות נדל"ן) — מומחה פיקוח וניהול. `agents/kurkoos-realestate-agent.md`
3. **ביצוע ובנייה** — מהנדס ביצוע ותיק. `agents/construction-execution-expert.md`

לכל סוכן יש גם גרסת פרומפט נקייה (`*-prompt.md`) שהסקריפט קורא. כל הסוכנים אוכפים: כתיבה אנושית בלי מקפים, בלי קלישאות שיווק, בלי תבניות AI, ועם SEO.

## התחל כאן
1. בחר סוכן, הדבק את ה-system prompt שלו, וכתוב "כתוב את כתבת השבוע".
2. כתבות לדוגמה מוכנות ב-`articles/`, תמונות תואמות ב-`images/`.
3. להפעלה אוטומטית: `AUTOMATION.md` + `scripts/` + `.github/`.
4. לניהול התוכן: פתח את `cms-preview.html`.

## מבנה החבילה
```
kurkoos-content/
├── agents/
│   ├── brokerage-expert.md / brokerage-prompt.md              ← סוכן תיווך ועסקאות
│   ├── kurkoos-realestate-agent.md / kurkoos-realestate-prompt.md  ← סוכן פיקוח וניהול (יזמות)
│   ├── construction-execution-expert.md / construction-prompt.md   ← סוכן ביצוע ובנייה
│   └── real-estate-development-columnist.md / columnist-prompt.md  ← סוכן יזמות (גרסה ראשונה)
├── articles/                          ← 9 כתבות מוכנות (MDX + frontmatter + SEO + FAQ)
│   ├── t-2026-06-21-baladiyut.mdx  t-2026-06-28-takanot-metavchim.mdx  t-2026-07-05-iskaot-noflot.mdx   (תיווך)
│   ├── c-2026-06-21-betihut-atar-bniya.mdx  c-2026-06-28-likuyei-bniya.mdx  c-2026-07-05-tofes-4.mdx     (ביצוע)
│   └── 2026-06-21-tama38-pokaat-pinui-binui.mdx  2026-06-28-bank-israel-10-90.mdx  2026-07-05-maslul-mahir-arbuyot.mdx  (יזמות)
├── images/                            ← 9 תמונות כותרת SVG, כל אחת ספציפית לכתבה
├── scripts/generate-article.mjs       ← מחולל הכתבה השבועית
├── .github/workflows/weekly-article.yml ← תזמון cron לכל ראשון 08:00 בישראל
├── cms-preview.html                   ← מערכת תוכן: טאבים לפי טור וסטטוס, עריכה, החלפת תמונות, שכפול, הערות לסוכן
├── content-calendar.md                ← לוח נושאים
├── AUTOMATION.md                      ← מדריך הפעלה אוטומטית
└── README.md
```

## שני מסלולי תמונות
- **אוטומטי:** הסקריפט מייצר תמונת SVG ממותגת לכל כתבה. אפס מגע.
- **פרימיום:** כל סוכן מייצר גם `imagePrompt`. סוכן התיווך מפיק פרומפט בסגנון מגזין נדל"ן יוקרתי (Mansion Global, Sotheby's), סוכן הפיקוח בסגנון מגזין אדריכלות. מריצים ב-Midjourney או DALL-E ושומרים כ-`coverImage`.

## בחירת הסוכן להרצה האוטומטית
ב-`scripts/generate-article.mjs`, הגדר את `PROMPT_PATH` לפרומפט הרצוי:
- תיווך: `agents/brokerage-prompt.md`
- יזמות/פיקוח: `agents/kurkoos-realestate-prompt.md`
- ביצוע: `agents/construction-prompt.md`
לשלושה טורים במקביל, צור שלושה workflows, כל אחד עם PROMPT_PATH אחר.

## חיווט לאתר (Next.js)
תמונות ל-`public/images/blog/`, כתבות ל-`content/blog/`. ודא שמות שדות ה-frontmatter תואמים ל-loader (כולל `faq`, `keywords`, `metaTitle`, `metaDescription` לצורך Structured Data). סנן בסקשן `published === true && date <= now`.

## בטיחות
מפתח ה-API מודבק רק במסך Secrets של GitHub, אף פעם לא בקוד, ב-commit, או בצ'אט.
