# 📦 חבילת סוכן התוכן לאתר נדל"ן — קבוצת קורקוס

כל הקבצים לבניית סוכן שכותב כתבות מקצועיות לאתר, מעלה אותן בקו עיצובי אחיד, ומתפרסם אוטומטית כל שבוע. הכל בעברית, RTL, ומוכן להעברה ל-Claude Code או למפתחים.

## התחל כאן
1. **הסוכן הסופי** נמצא ב-`agents/kurkoos-realestate-agent.md`. זה הלב. מדביקים אותו כ-system prompt וכותבים "כתוב את כתבת השבוע".
2. **3 כתבות לדוגמה** מוכנות בתיקיית `articles/` עם תמונות תואמות ב-`images/`.
3. **להפעלה אוטומטית** ראה `AUTOMATION.md` והקבצים ב-`scripts/` וב-`.github/`.
4. **לניהול התוכן** פתח את `cms-preview.html`.

## מבנה החבילה
```
kurkoos-content/
├── agents/
│   ├── kurkoos-realestate-agent.md       ← הסוכן הסופי לאתר (מומחה פיקוח וניהול, סדרת "המדריך לתהליך הבנייה")
│   ├── kurkoos-realestate-prompt.md       ← אותו פרומפט, גרסה נקייה שהסקריפט קורא
│   ├── construction-execution-expert.md   ← סוכן טור ביצוע ובנייה (גרסה מתועדת)
│   ├── construction-prompt.md             ← פרומפט נקי לטור ביצוע
│   ├── real-estate-development-columnist.md ← סוכן טור יזמות נדל"ן (הראשון)
│   └── columnist-prompt.md                ← פרומפט נקי לטור יזמות
├── articles/                              ← כתבות מוכנות (MDX + frontmatter + SEO)
│   ├── c-2026-06-21-betihut-atar-bniya.mdx
│   ├── c-2026-06-28-likuyei-bniya.mdx
│   ├── c-2026-07-05-tofes-4.mdx
│   ├── 2026-06-21-tama38-pokaat-pinui-binui.mdx
│   ├── 2026-06-28-bank-israel-10-90.mdx
│   └── 2026-07-05-maslul-mahir-arbuyot.mdx
├── images/                               ← תמונות כותרת SVG, כל אחת ספציפית לכתבה
│   ├── c01-site-safety.svg   c02-construction-defects.svg   c03-form-4.svg
│   └── 01-tama38-pinui-binui.svg   02-bank-israel-10-90.svg   03-fast-track-guarantees.svg
├── scripts/
│   └── generate-article.mjs              ← מחולל הכתבה השבועית (API + תמונת SVG אוטומטית)
├── .github/workflows/
│   └── weekly-article.yml                ← תזמון cron לכל ראשון 08:00 בישראל
├── cms-preview.html                      ← מערכת תוכן: טאבים, עריכה, החלפת תמונות, הערות לסוכן
├── content-calendar.md                   ← לוח נושאים קדימה
├── AUTOMATION.md                         ← מדריך הפעלה אוטומטית (CMS / GitHub Action)
└── README.md                             ← הקובץ הזה
```

## שני מסלולי תמונות
- **אוטומטי (ברירת מחדל):** הסקריפט מייצר תמונת SVG ממותגת לכל כתבה. אפס מגע, נטען בכל מקום.
- **פרימיום:** הסוכן הסופי מייצר גם `imagePrompt` באנגלית בסגנון מגזין אדריכלות. מריצים אותו ב-Midjourney או DALL-E ושומרים את התמונה כ-`coverImage`. כך מקבלים תמונה פוטוגרפית במקום וקטור.

## חיווט לאתר (Next.js)
1. תמונות ל-`public/images/blog/`. כתבות ל-`content/blog/`.
2. ודא ששמות שדות ה-frontmatter (title, slug, date, coverImage, metaTitle, metaDescription...) תואמים ל-loader. אם לא, שנה אותם בכתבות וגם בפלט של הסוכן.
3. כדי שכתבה תופיע רק בזמנה, סנן בסקשן `published === true && date <= now`.

## הפעלה שבועית אוטומטית
פתח את `AUTOMATION.md`. בקצרה: שמים `ANTHROPIC_API_KEY` ב-GitHub Secrets בלבד, מכוונים את `PROMPT_PATH` בסקריפט אל הפרומפט הרצוי (`agents/kurkoos-realestate-prompt.md`), וה-workflow מייצר ומפרסם כל ראשון 08:00. הכל בלי force-push.

## בטיחות
מפתח ה-API מודבק רק במסך Secrets של GitHub, אף פעם לא בקוד, ב-commit, או בצ'אט.
