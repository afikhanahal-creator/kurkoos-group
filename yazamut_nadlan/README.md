# 📦 טור יזמות נדל"ן — קבוצת קורקוס

סוכן + תשתית לכתבה שבועית על **יזמות נדל"ן**, שמתפרסמת בעמוד `/yazamut-nadlan`
(עמוד היזמות מפנה לשם במקום לבלוג).

## מה יש כאן
```
yazamut_nadlan/
├── prompt.md             ← פרומפט הסוכן (system prompt). הלב.
├── content-calendar.md   ← 24 נושאים, כ-6 חודשים קדימה.
├── AUTOMATION.md         ← איך מפרסמים כל ראשון (ידני / GitHub Action).
├── scripts/
│   └── generate-article.mjs   ← מחולל: Claude → קובץ כתבה ב-src/content/yazamut/
└── README.md
```

## איפה התוכן באתר
- **כתבות:** `src/content/yazamut/*.js` — כל קובץ = כתבה. נטענות אוטומטית.
- **טעינה:** `src/lib/yazamut.js`
- **עמודים:** `src/pages/Yazamut.jsx` (רשימה) · `src/pages/YazamutArticle.jsx` (כתבה)
- **נתיבים:** `/yazamut-nadlan` ו-`/yazamut-nadlan/:slug`

## להוספת כתבה ידנית
צרו קובץ `src/content/yazamut/2026-07-12-<slug>.js` במבנה של הכתבות הקיימות
(slug, title, date, author, authorTitle, category, tags, cover, coverAlt, excerpt,
readingTime, published, body). תאריך עתידי = יעלה לבד באותו יום.

## להפעלה אוטומטית
ראו `AUTOMATION.md` — צריך רק להגדיר `ANTHROPIC_API_KEY` ב-Secrets של GitHub.
